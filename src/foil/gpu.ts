/// <reference types="@webgpu/types" />
import { LIBRARY, WGSL_ENTRY, WGSL_HEADER, postFor } from "./library";
import { ATLAS_H, ATLAS_W } from "./atlas";
import { UNIFORM_BYTES, type FoilBackend, type FoilScene, type LayerSource, type ViewState } from "./types";

/** Full WGSL module for a scene (shared header, library, scene, post, entry points). */
export function wgslModule(scene: FoilScene) {
  return WGSL_HEADER + LIBRARY + scene.code + postFor(scene) + WGSL_ENTRY;
}

interface PipeEntry {
  status: "pending" | "ready" | "failed";
  pipeline: GPURenderPipeline | null;
}

interface GpuViewRes {
  ctx: GPUCanvasContext;
  ubuf: GPUBuffer;
  bind: GPUBindGroup;
  img: GPUTexture | null;
  levels: number;
}

/** Box-filter downsample for image mip chains (one layer, one level per pass). */
const MIP_WGSL = /* wgsl */ `
@group(0) @binding(0) var src: texture_2d<f32>;
@group(0) @binding(1) var smp: sampler;
struct VOut { @builtin(position) pos: vec4f, @location(0) uv: vec2f };
@vertex fn vs(@builtin(vertex_index) i: u32) -> VOut {
  let x: f32 = f32((i << 1u) & 2u);
  let y: f32 = f32(i & 2u);
  var o: VOut;
  o.pos = vec4f(x * 2.0 - 1.0, 1.0 - y * 2.0, 0.0, 1.0);
  o.uv = vec2f(x, y);
  return o;
}
@fragment fn fs(v: VOut) -> @location(0) vec4f { return textureSampleLevel(src, smp, v.uv, 0.0); }
`;

const mipLevels = (w: number, h: number) => Math.floor(Math.log2(Math.max(w, h))) + 1;

/**
 * WebGPU path: one device drives every card. Each card owns a canvas
 * context configured against the shared device, so cards scroll with the
 * DOM (no overlay lag) while all draws go out in a single submission.
 */
export class GpuBackend implements FoilBackend {
  readonly kind = "webgpu" as const;
  readonly eagerCompile = true;
  private readonly bindLayout: GPUBindGroupLayout;
  private readonly pipeLayout: GPUPipelineLayout;
  private readonly sampler: GPUSampler;
  private readonly imgSampler: GPUSampler;
  private readonly atlas: GPUTexture;
  private readonly atlasView: GPUTextureView;
  private readonly emptyLayers: GPUTextureView;
  private mip: { pipe: GPURenderPipeline; layout: GPUBindGroupLayout } | null = null;
  private readonly pipes = new Map<string, PipeEntry>();
  private lostCb: (() => void) | null = null;
  private destroyed = false;
  private lost = false;

  private constructor(
    private readonly device: GPUDevice,
    private readonly format: GPUTextureFormat,
    private readonly report: (scene: string, message: string) => void,
  ) {
    this.bindLayout = device.createBindGroupLayout({
      label: "foil-bind",
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
        { binding: 2, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
        { binding: 3, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float", viewDimension: "2d-array" } },
        { binding: 4, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
      ],
    });
    this.pipeLayout = device.createPipelineLayout({ bindGroupLayouts: [this.bindLayout] });
    this.sampler = device.createSampler({
      magFilter: "linear",
      minFilter: "linear",
      addressModeU: "clamp-to-edge",
      addressModeV: "clamp-to-edge",
    });
    this.imgSampler = device.createSampler({
      magFilter: "linear",
      minFilter: "linear",
      mipmapFilter: "linear",
      addressModeU: "clamp-to-edge",
      addressModeV: "clamp-to-edge",
      maxAnisotropy: 8,
    });
    this.atlas = device.createTexture({
      label: "foil-atlas",
      size: [ATLAS_W, ATLAS_H],
      format: "r8unorm",
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });
    this.atlasView = this.atlas.createView();
    const empty = device.createTexture({
      label: "foil-no-layers",
      size: [1, 1, 1],
      format: "rgba8unorm",
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });
    device.queue.writeTexture({ texture: empty }, new Uint8Array(4), { bytesPerRow: 4 }, [1, 1, 1]);
    this.emptyLayers = empty.createView({ dimension: "2d-array" });
    device.lost.then((info) => {
      this.lost = true;
      if (!this.destroyed && info.reason !== "destroyed") this.lostCb?.();
    });
  }

  static async create(report: (scene: string, message: string) => void, allowSoftware = false): Promise<GpuBackend | null> {
    const gpu = typeof navigator !== "undefined" ? navigator.gpu : undefined;
    if (!gpu) return null;
    try {
      const adapter = await gpu.requestAdapter();
      if (!adapter) return null;
      // A CPU-emulated adapter would be slower than WebGL2 on the real GPU.
      const legacy = adapter as GPUAdapter & { isFallbackAdapter?: boolean };
      const info = adapter.info as (GPUAdapterInfo & { isFallbackAdapter?: boolean }) | undefined;
      if (!allowSoftware && (legacy.isFallbackAdapter || info?.isFallbackAdapter)) return null;
      const device = await adapter.requestDevice({ label: "foil-device" });
      return new GpuBackend(device, gpu.getPreferredCanvasFormat(), report);
    } catch {
      return null;
    }
  }

  setAtlas(data: Uint8Array<ArrayBuffer>) {
    this.device.queue.writeTexture({ texture: this.atlas }, data, { bytesPerRow: ATLAS_W }, [ATLAS_W, ATLAS_H]);
  }

  prepare(scene: FoilScene) {
    if (this.pipes.has(scene.id)) return;
    const entry: PipeEntry = { status: "pending", pipeline: null };
    this.pipes.set(scene.id, entry);
    const module = this.device.createShaderModule({
      label: `foil:${scene.id}`,
      code: wgslModule(scene),
    });
    this.device
      .createRenderPipelineAsync({
        label: `foil:${scene.id}`,
        layout: this.pipeLayout,
        vertex: { module, entryPoint: "vsMain" },
        fragment: { module, entryPoint: "fsMain", targets: [{ format: this.format }] },
        primitive: { topology: "triangle-list" },
      })
      .then((pipeline) => {
        entry.pipeline = pipeline;
        entry.status = "ready";
      })
      .catch(async (err: unknown) => {
        entry.status = "failed";
        if (this.lost || this.destroyed) return;
        let detail = err instanceof Error ? err.message : String(err);
        try {
          const info = await module.getCompilationInfo();
          const msgs = info.messages.filter((m) => m.type === "error");
          if (msgs.length) detail = msgs.map((m) => `${m.lineNum}:${m.linePos} ${m.message}`).join("\n");
        } catch {
          /* keep the pipeline error */
        }
        this.report(scene.id, detail);
      });
  }

  status(scene: FoilScene) {
    return this.pipes.get(scene.id)?.status ?? "pending";
  }

  attach(view: ViewState) {
    const ctx = view.canvas.getContext("webgpu");
    if (!ctx) throw new Error("webgpu context unavailable");
    const alphaMode = view.scene.post === "alpha" ? "premultiplied" : "opaque";
    ctx.configure({ device: this.device, format: this.format, alphaMode });
    const ubuf = this.device.createBuffer({
      size: UNIFORM_BYTES,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    view.res = { ctx, ubuf, bind: this.bindFor(ubuf, this.emptyLayers), img: null, levels: 1 } satisfies GpuViewRes;
  }

  private bindFor(ubuf: GPUBuffer, layers: GPUTextureView) {
    return this.device.createBindGroup({
      layout: this.bindLayout,
      entries: [
        { binding: 0, resource: { buffer: ubuf } },
        { binding: 1, resource: this.atlasView },
        { binding: 2, resource: this.sampler },
        { binding: 3, resource: layers },
        { binding: 4, resource: this.imgSampler },
      ],
    });
  }

  writeLayer(view: ViewState, index: number, source: LayerSource) {
    const res = view.res as GpuViewRes | null;
    const spec = view.layers;
    if (!res || !spec || index < 0 || index >= spec.count || this.lost) return;
    if (!res.img) {
      res.levels = mipLevels(spec.width, spec.height);
      res.img = this.device.createTexture({
        label: `foil-layers:${view.scene.id}`,
        size: [spec.width, spec.height, spec.count],
        format: "rgba8unorm",
        mipLevelCount: res.levels,
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
      });
      res.bind = this.bindFor(res.ubuf, res.img.createView({ dimension: "2d-array" }));
    }
    this.device.queue.copyExternalImageToTexture(
      { source, flipY: false },
      { texture: res.img, origin: [0, 0, index], premultipliedAlpha: true },
      [spec.width, spec.height],
    );
    this.buildMips(res.img, index, res.levels);
  }

  private buildMips(tex: GPUTexture, layer: number, levels: number) {
    if (levels < 2) return;
    if (!this.mip) {
      const module = this.device.createShaderModule({ label: "foil-mips", code: MIP_WGSL });
      const layout = this.device.createBindGroupLayout({
        entries: [
          { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
          { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
        ],
      });
      const pipe = this.device.createRenderPipeline({
        label: "foil-mips",
        layout: this.device.createPipelineLayout({ bindGroupLayouts: [layout] }),
        vertex: { module, entryPoint: "vs" },
        fragment: { module, entryPoint: "fs", targets: [{ format: "rgba8unorm" }] },
        primitive: { topology: "triangle-list" },
      });
      this.mip = { pipe, layout };
    }
    const { pipe, layout } = this.mip;
    const encoder = this.device.createCommandEncoder({ label: "foil-mips" });
    for (let level = 1; level < levels; level++) {
      const viewOf = (mip: number) =>
        tex.createView({ dimension: "2d", baseMipLevel: mip, mipLevelCount: 1, baseArrayLayer: layer, arrayLayerCount: 1 });
      const pass = encoder.beginRenderPass({
        colorAttachments: [{ view: viewOf(level), loadOp: "clear", storeOp: "store", clearValue: { r: 0, g: 0, b: 0, a: 0 } }],
      });
      pass.setPipeline(pipe);
      pass.setBindGroup(
        0,
        this.device.createBindGroup({
          layout,
          entries: [
            { binding: 0, resource: viewOf(level - 1) },
            { binding: 1, resource: this.sampler },
          ],
        }),
      );
      pass.draw(3);
      pass.end();
    }
    this.device.queue.submit([encoder.finish()]);
  }

  detach(view: ViewState) {
    const res = view.res as GpuViewRes | null;
    if (!res) return;
    try {
      res.ctx.unconfigure();
    } catch {
      /* context already gone */
    }
    res.ubuf.destroy();
    res.img?.destroy();
    view.res = null;
  }

  render(views: ViewState[]) {
    const drawn: ViewState[] = [];
    const encoder = this.device.createCommandEncoder({ label: "foil-frame" });
    for (const view of views) {
      const res = view.res as GpuViewRes | null;
      const pipe = this.pipes.get(view.scene.id)?.pipeline;
      if (!res || !pipe || view.pxW < 2 || view.pxH < 2) continue;
      this.device.queue.writeBuffer(res.ubuf, 0, view.uniforms);
      const pass = encoder.beginRenderPass({
        label: view.scene.id,
        colorAttachments: [
          {
            view: res.ctx.getCurrentTexture().createView(),
            loadOp: "clear",
            storeOp: "store",
            clearValue: { r: 0, g: 0, b: 0, a: view.scene.post === "alpha" ? 0 : 1 },
          },
        ],
      });
      pass.setPipeline(pipe);
      pass.setBindGroup(0, res.bind);
      pass.draw(3);
      pass.end();
      drawn.push(view);
    }
    if (drawn.length) this.device.queue.submit([encoder.finish()]);
    return drawn;
  }

  onLost(cb: () => void) {
    this.lostCb = cb;
  }

  destroy() {
    this.destroyed = true;
    this.device.destroy();
  }
}
