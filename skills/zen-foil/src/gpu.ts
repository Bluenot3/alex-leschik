/// <reference types="@webgpu/types" />
import { postIsTransparent } from "./library";
import { ATLAS_H, ATLAS_W } from "./atlas";
import { describeLine, wgslModule } from "./program";
import { UNIFORM_BYTES, type FoilBackend, type LayerSource, type Program, type ViewState } from "./types";

interface PipeEntry {
  status: "pending" | "ready" | "failed";
  pipeline: GPURenderPipeline | null;
}

interface GpuViewRes {
  /** The view's WebGPU canvas context (null in readback mode). */
  ctx: GPUCanvasContext | null;
  /** Readback mode: frames are copied into a 2D canvas instead. */
  ctx2d: CanvasRenderingContext2D | null;
  off: GPUTexture | null;
  pending: boolean;
  ubuf: GPUBuffer;
  bind: GPUBindGroup;
  img: GPUTexture | null;
  levels: number;
}

/**
 * Readback presentation (ZEN_FOIL_READBACK = true, or ?foil-readback): each
 * frame renders offscreen and is copied into a 2D canvas. Slow, but it shows
 * real WebGPU pixels where a canvas can't present — headless browsers and
 * screenshot tools. Never needed in production.
 */
function readbackMode() {
  if ((globalThis as { ZEN_FOIL_READBACK?: boolean }).ZEN_FOIL_READBACK === true) return true;
  return typeof location !== "undefined" && /[?&]foil-readback\b/.test(location.search);
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
  adapter: GPUAdapter | null = null;
  private destroyed = false;
  private lost = false;

  private constructor(
    private readonly device: GPUDevice,
    private readonly format: GPUTextureFormat,
    private readonly report: (scene: string, message: string) => void,
  ) {
    this.bindLayout = device.createBindGroupLayout({
      label: "zen-foil-bind",
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
      label: "zen-foil-atlas",
      size: [ATLAS_W, ATLAS_H],
      format: "r8unorm",
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });
    this.atlasView = this.atlas.createView();
    const empty = device.createTexture({
      label: "zen-foil-no-layers",
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
      const device = await adapter.requestDevice({ label: "zen-foil" });
      const backend = new GpuBackend(device, gpu.getPreferredCanvasFormat(), report);
      // Hold the adapter: once it is collected, Chromium can drop the GPU
      // instance and async work (mapAsync, async pipelines) stops resolving.
      backend.adapter = adapter;
      return backend;
    } catch {
      return null;
    }
  }

  setAtlas(data: Uint8Array) {
    this.device.queue.writeTexture({ texture: this.atlas }, data as Uint8Array<ArrayBuffer>, { bytesPerRow: ATLAS_W }, [ATLAS_W, ATLAS_H]);
  }

  prepare(program: Program) {
    if (this.pipes.has(program.key)) return;
    const entry: PipeEntry = { status: "pending", pipeline: null };
    this.pipes.set(program.key, entry);
    const module = this.device.createShaderModule({
      label: `zen-foil:${program.key}`,
      code: wgslModule(program),
    });
    this.device
      .createRenderPipelineAsync({
        label: `zen-foil:${program.key}`,
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
          if (msgs.length)
            detail = msgs.map((m) => `${describeLine("wgsl", m.lineNum, program)}:${m.linePos} ${m.message}`).join("\n");
        } catch {
          /* keep the pipeline error */
        }
        this.report(program.scene.id, `WebGPU: ${detail}`);
      });
  }

  status(program: Program) {
    return this.pipes.get(program.key)?.status ?? "pending";
  }

  private readonly readback = readbackMode();

  attach(view: ViewState) {
    const transparent = postIsTransparent(view.program.post);
    let ctx: GPUCanvasContext | null = null;
    let ctx2d: CanvasRenderingContext2D | null = null;
    if (this.readback) {
      ctx2d = view.canvas.getContext("2d", { alpha: transparent });
      if (!ctx2d) throw new Error("2d context unavailable");
    } else {
      ctx = view.canvas.getContext("webgpu");
      if (!ctx) throw new Error("webgpu context unavailable");
      // COPY_SRC lets capture() read back exactly what was drawn (previews, tests).
      ctx.configure({
        device: this.device,
        format: this.format,
        alphaMode: transparent ? "premultiplied" : "opaque",
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
      });
    }
    const ubuf = this.device.createBuffer({
      size: UNIFORM_BYTES,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    view.res = {
      ctx,
      ctx2d,
      off: null,
      pending: false,
      ubuf,
      bind: this.bindFor(ubuf, this.emptyLayers),
      img: null,
      levels: 1,
    } satisfies GpuViewRes;
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
        label: `zen-foil-layers:${view.program.key}`,
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
      const module = this.device.createShaderModule({ label: "zen-foil-mips", code: MIP_WGSL });
      const layout = this.device.createBindGroupLayout({
        entries: [
          { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
          { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
        ],
      });
      const pipe = this.device.createRenderPipeline({
        label: "zen-foil-mips",
        layout: this.device.createPipelineLayout({ bindGroupLayouts: [layout] }),
        vertex: { module, entryPoint: "vs" },
        fragment: { module, entryPoint: "fs", targets: [{ format: "rgba8unorm" }] },
        primitive: { topology: "triangle-list" },
      });
      this.mip = { pipe, layout };
    }
    const { pipe, layout } = this.mip;
    const encoder = this.device.createCommandEncoder({ label: "zen-foil-mips" });
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
      res.ctx?.unconfigure();
    } catch {
      /* context already gone */
    }
    res.ubuf.destroy();
    res.img?.destroy();
    res.off?.destroy();
    view.res = null;
  }

  private readonly captures = new Map<ViewState, (img: ImageData | null) => void>();

  /** Reads back the next frame drawn for `view` (RGBA, unpremultiplied by the 2D canvas on use). */
  capture(view: ViewState) {
    return new Promise<ImageData | null>((resolve) => this.captures.set(view, resolve));
  }

  render(views: ViewState[]) {
    const drawn: ViewState[] = [];
    const encoder = this.device.createCommandEncoder({ label: "zen-foil-frame" });
    const reads: { view: ViewState; buffer: GPUBuffer; stride: number; w: number; h: number }[] = [];
    for (const view of views) {
      const res = view.res as GpuViewRes | null;
      const pipe = this.pipes.get(view.program.key)?.pipeline;
      if (!res || !pipe || res.pending || view.pxW < 2 || view.pxH < 2) continue;
      this.device.queue.writeBuffer(res.ubuf, 0, view.uniforms as Float32Array<ArrayBuffer>);
      if (res.ctx2d && (!res.off || res.off.width !== view.pxW || res.off.height !== view.pxH)) {
        res.off?.destroy();
        res.off = this.device.createTexture({
          label: "zen-foil-readback",
          size: [view.pxW, view.pxH],
          format: this.format,
          usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
        });
      }
      const target = res.ctx2d ? res.off! : res.ctx!.getCurrentTexture();
      const pass = encoder.beginRenderPass({
        label: view.program.key,
        colorAttachments: [
          {
            view: target.createView(),
            loadOp: "clear",
            storeOp: "store",
            clearValue: { r: 0, g: 0, b: 0, a: postIsTransparent(view.program.post) ? 0 : 1 },
          },
        ],
      });
      pass.setPipeline(pipe);
      pass.setBindGroup(0, res.bind);
      pass.draw(3);
      pass.end();
      if (res.ctx2d || this.captures.has(view)) {
        if (res.ctx2d) res.pending = true;
        const w = target.width;
        const h = target.height;
        const stride = Math.ceil((w * 4) / 256) * 256;
        const buffer = this.device.createBuffer({ size: stride * h, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
        encoder.copyTextureToBuffer({ texture: target }, { buffer, bytesPerRow: stride }, [w, h]);
        reads.push({ view, buffer, stride, w, h });
      }
      drawn.push(view);
    }
    if (drawn.length) this.device.queue.submit([encoder.finish()]);
    for (const r of reads) {
      const done = this.captures.get(r.view);
      this.captures.delete(r.view);
      const res = r.view.res as GpuViewRes | null;
      const opaque = !postIsTransparent(r.view.program.post);
      const bgra = this.format === "bgra8unorm";
      r.buffer
        .mapAsync(GPUMapMode.READ)
        .then(() => {
          const src = new Uint8Array(r.buffer.getMappedRange());
          const img = new ImageData(r.w, r.h);
          for (let y = 0; y < r.h; y++) {
            for (let x = 0; x < r.w; x++) {
              const i = y * r.stride + x * 4;
              const o = (y * r.w + x) * 4;
              const a = opaque ? 255 : src[i + 3];
              // Canvas pixels are premultiplied; ImageData is not.
              const k = a > 0 ? 255 / a : 0;
              img.data[o] = Math.min(255, (bgra ? src[i + 2] : src[i]) * k);
              img.data[o + 1] = Math.min(255, src[i + 1] * k);
              img.data[o + 2] = Math.min(255, (bgra ? src[i] : src[i + 2]) * k);
              img.data[o + 3] = a;
            }
          }
          r.buffer.destroy();
          if (res?.ctx2d) {
            res.ctx2d.putImageData(img, 0, 0);
            res.pending = false;
          }
          done?.(img);
        })
        .catch((err: unknown) => {
          console.warn("[zen-foil] capture failed:", err);
          if (res) res.pending = false;
          done?.(null);
        });
    }
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
