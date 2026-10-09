/// <reference types="@webgpu/types" />
import { LIBRARY, WGSL_ENTRY, WGSL_HEADER, postFor } from "./library";
import { ATLAS_SIZE } from "./atlas";
import { UNIFORM_BYTES, type FoilBackend, type FoilScene, type ViewState } from "./types";

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
}

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
  private readonly atlas: GPUTexture;
  private readonly atlasView: GPUTextureView;
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
      ],
    });
    this.pipeLayout = device.createPipelineLayout({ bindGroupLayouts: [this.bindLayout] });
    this.sampler = device.createSampler({
      magFilter: "linear",
      minFilter: "linear",
      addressModeU: "clamp-to-edge",
      addressModeV: "clamp-to-edge",
    });
    this.atlas = device.createTexture({
      label: "foil-atlas",
      size: [ATLAS_SIZE, ATLAS_SIZE],
      format: "r8unorm",
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });
    this.atlasView = this.atlas.createView();
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
    this.device.queue.writeTexture({ texture: this.atlas }, data, { bytesPerRow: ATLAS_SIZE }, [ATLAS_SIZE, ATLAS_SIZE]);
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
    ctx.configure({ device: this.device, format: this.format, alphaMode: "opaque" });
    const ubuf = this.device.createBuffer({
      size: UNIFORM_BYTES,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    const bind = this.device.createBindGroup({
      layout: this.bindLayout,
      entries: [
        { binding: 0, resource: { buffer: ubuf } },
        { binding: 1, resource: this.atlasView },
        { binding: 2, resource: this.sampler },
      ],
    });
    view.res = { ctx, ubuf, bind } satisfies GpuViewRes;
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
            clearValue: { r: 0, g: 0, b: 0, a: 1 },
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
