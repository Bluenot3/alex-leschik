import { GLSL_HEADER, GLSL_MAIN, GLSL_VERTEX, LIBRARY, postFor } from "./library";
import { GLSL_BRIDGE, wgslToGlsl } from "./translate";
import { ATLAS_H, ATLAS_W } from "./atlas";
import { UNIFORM_BYTES, type FoilBackend, type FoilScene, type LayerSource, type ViewState } from "./types";

const COMPLETION_STATUS_KHR = 0x91b1;

interface ProgEntry {
  status: "pending" | "ready" | "failed";
  program: WebGLProgram | null;
  vs: WebGLShader | null;
  fs: WebGLShader | null;
}

interface GlViewRes {
  ctx: CanvasRenderingContext2D;
  ubo: WebGLBuffer;
  img: WebGLTexture | null;
}

/** GLSL source for a scene: the same portable WGSL, translated. */
export function glslFragment(scene: FoilScene) {
  return (
    "#version 300 es\nprecision highp float;\nprecision highp int;\n" +
    GLSL_BRIDGE +
    GLSL_HEADER +
    wgslToGlsl(LIBRARY + scene.code + postFor(scene)) +
    GLSL_MAIN
  );
}

/**
 * WebGL2 fallback: a single hidden context renders each card at its own
 * size and blits it into the card's 2D canvas — one context total, however
 * many cards, so the page never approaches the browser's context limit.
 */
export class GlBackend implements FoilBackend {
  readonly kind = "webgl2" as const;
  get eagerCompile() {
    return this.parallel;
  }
  private readonly canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;
  private parallel: boolean;
  private atlas: WebGLTexture | null = null;
  private atlasData: Uint8Array<ArrayBuffer> | null = null;
  private emptyLayers: WebGLTexture | null = null;
  private readonly progs = new Map<string, ProgEntry>();
  private readonly views = new Set<ViewState>();
  private lost = false;

  private constructor(
    canvas: HTMLCanvasElement,
    gl: WebGL2RenderingContext,
    private readonly report: (scene: string, message: string) => void,
  ) {
    this.canvas = canvas;
    this.gl = gl;
    this.parallel = !!gl.getExtension("KHR_parallel_shader_compile");
    canvas.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      this.lost = true;
      this.progs.clear();
      this.atlas = null;
      this.emptyLayers = null;
    });
    canvas.addEventListener("webglcontextrestored", () => {
      this.lost = false;
      this.parallel = !!this.gl.getExtension("KHR_parallel_shader_compile");
      if (this.atlasData) this.setAtlas(this.atlasData);
      this.views.forEach((v) => {
        const res = v.res as GlViewRes | null;
        if (res) {
          res.ubo = this.makeUbo();
          res.img = null;
          v.layerSrc.forEach((src, i) => src && this.writeLayer(v, i, src));
        }
        v.dirty = true;
      });
    });
  }

  static create(report: (scene: string, message: string) => void): GlBackend | null {
    const canvas = document.createElement("canvas");
    canvas.width = 2;
    canvas.height = 2;
    // Alpha so transparent scenes (the hero cube) blit with their coverage;
    // opaque scenes simply write a = 1.
    const gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: true,
      preserveDrawingBuffer: false,
      powerPreference: "default",
    });
    return gl ? new GlBackend(canvas, gl, report) : null;
  }

  private makeUbo() {
    const gl = this.gl;
    const ubo = gl.createBuffer()!;
    gl.bindBuffer(gl.UNIFORM_BUFFER, ubo);
    gl.bufferData(gl.UNIFORM_BUFFER, UNIFORM_BYTES, gl.DYNAMIC_DRAW);
    return ubo;
  }

  setAtlas(data: Uint8Array<ArrayBuffer>) {
    this.atlasData = data;
    if (this.lost) return;
    const gl = this.gl;
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, ATLAS_W, ATLAS_H, 0, gl.RED, gl.UNSIGNED_BYTE, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.atlas = tex;
  }

  private empty() {
    if (this.emptyLayers) return this.emptyLayers;
    const gl = this.gl;
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, tex);
    gl.texImage3D(gl.TEXTURE_2D_ARRAY, 0, gl.RGBA8, 1, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    this.emptyLayers = tex;
    return tex;
  }

  writeLayer(view: ViewState, index: number, source: LayerSource) {
    const res = view.res as GlViewRes | null;
    const spec = view.layers;
    if (!res || !spec || index < 0 || index >= spec.count || this.lost) return;
    const gl = this.gl;
    if (!res.img) {
      res.img = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D_ARRAY, res.img);
      const levels = Math.floor(Math.log2(Math.max(spec.width, spec.height))) + 1;
      gl.texStorage3D(gl.TEXTURE_2D_ARRAY, levels, gl.RGBA8, spec.width, spec.height, spec.count);
      gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, res.img);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, index, spec.width, spec.height, 1, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
    view.dirty = true;
  }

  prepare(scene: FoilScene) {
    if (this.progs.has(scene.id) || this.lost) return;
    const gl = this.gl;
    const entry: ProgEntry = { status: "pending", program: null, vs: null, fs: null };
    this.progs.set(scene.id, entry);
    let fsSource: string;
    try {
      fsSource = glslFragment(scene);
    } catch (err) {
      entry.status = "failed";
      this.report(scene.id, err instanceof Error ? err.message : String(err));
      return;
    }
    const vs = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vs, GLSL_VERTEX);
    gl.compileShader(vs);
    const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fs, fsSource);
    gl.compileShader(fs);
    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    entry.program = program;
    entry.vs = vs;
    entry.fs = fs;
    if (!this.parallel) this.finish(scene.id, entry);
  }

  private finish(id: string, entry: ProgEntry) {
    const gl = this.gl;
    const program = entry.program!;
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      entry.status = "failed";
      const log = gl.getShaderInfoLog(entry.fs!) || gl.getProgramInfoLog(program) || "link failed";
      this.report(id, log);
      return;
    }
    const block = gl.getUniformBlockIndex(program, "UBlock");
    gl.uniformBlockBinding(program, block, 0);
    gl.useProgram(program);
    gl.uniform1i(gl.getUniformLocation(program, "atlasTex"), 0);
    gl.uniform1i(gl.getUniformLocation(program, "imgTex"), 1);
    entry.status = "ready";
  }

  status(scene: FoilScene) {
    const entry = this.progs.get(scene.id);
    if (!entry) return "pending";
    if (entry.status === "pending" && this.parallel && entry.program) {
      if (this.gl.getProgramParameter(entry.program, COMPLETION_STATUS_KHR)) this.finish(scene.id, entry);
    }
    return entry.status;
  }

  attach(view: ViewState) {
    const ctx = view.canvas.getContext("2d", { alpha: view.scene.post === "alpha" });
    if (!ctx) throw new Error("2d context unavailable");
    view.res = { ctx, ubo: this.makeUbo(), img: null } satisfies GlViewRes;
    this.views.add(view);
  }

  detach(view: ViewState) {
    const res = view.res as GlViewRes | null;
    if (res && !this.lost) {
      this.gl.deleteBuffer(res.ubo);
      if (res.img) this.gl.deleteTexture(res.img);
    }
    this.views.delete(view);
    view.res = null;
  }

  render(views: ViewState[]) {
    const drawn: ViewState[] = [];
    if (this.lost || !this.atlas) return drawn;
    const gl = this.gl;
    let maxW = 0;
    let maxH = 0;
    for (const v of views) {
      maxW = Math.max(maxW, v.pxW);
      maxH = Math.max(maxH, v.pxH);
    }
    if (this.canvas.width < maxW || this.canvas.height < maxH) {
      this.canvas.width = Math.max(this.canvas.width, maxW);
      this.canvas.height = Math.max(this.canvas.height, maxH);
    }
    const H = this.canvas.height;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.atlas);
    for (const view of views) {
      const entry = this.progs.get(view.scene.id);
      const res = view.res as GlViewRes | null;
      if (!entry?.program || entry.status !== "ready" || !res || view.pxW < 2 || view.pxH < 2) continue;
      gl.viewport(0, 0, view.pxW, view.pxH);
      gl.useProgram(entry.program);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D_ARRAY, res.img ?? this.empty());
      gl.activeTexture(gl.TEXTURE0);
      gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, res.ubo);
      gl.bufferSubData(gl.UNIFORM_BUFFER, 0, view.uniforms);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (view.scene.post === "alpha") res.ctx.clearRect(0, 0, view.pxW, view.pxH);
      res.ctx.drawImage(this.canvas, 0, H - view.pxH, view.pxW, view.pxH, 0, 0, view.pxW, view.pxH);
      drawn.push(view);
    }
    return drawn;
  }

  onLost() {
    /* context restoration is handled in place */
  }

  destroy() {
    this.gl.getExtension("WEBGL_lose_context")?.loseContext();
  }
}
