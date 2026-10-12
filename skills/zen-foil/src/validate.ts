/// <reference types="@webgpu/types" />
import { glslFragment, readableGlslLog, describeLine, wgslModule } from "./program";
import { GLSL_VERTEX } from "./library";
import { listScenes, getScene } from "./scene";
import { lintWgsl } from "./lint";
import type { FoilScene, PostMode } from "./types";

export interface ValidationResult {
  scene: string;
  post: PostMode;
  /** Static portability problems (translator, reserved names, %, ternaries…). */
  lint: string[];
  /** WGSL compile/pipeline errors on WebGPU; null when WebGPU is unavailable. */
  webgpu: string[] | null;
  /** GLSL ES 3.00 compile/link errors on WebGL2; null when WebGL2 is unavailable. */
  webgl2: string[] | null;
}

let devicePromise: Promise<GPUDevice | null> | null = null;
function device() {
  devicePromise ??= (async () => {
    try {
      const adapter = await navigator.gpu?.requestAdapter();
      return adapter ? await adapter.requestDevice() : null;
    } catch {
      return null;
    }
  })();
  return devicePromise;
}

async function checkWebGpu(scene: FoilScene, post: PostMode): Promise<string[] | null> {
  const dev = await device();
  if (!dev) return null;
  const program = { key: `${scene.id}#${post}`, scene, post };
  const errors: string[] = [];
  dev.pushErrorScope("validation");
  const module = dev.createShaderModule({ code: wgslModule(program) });
  const info = await module.getCompilationInfo();
  for (const m of info.messages) {
    if (m.type === "error") errors.push(`${describeLine("wgsl", m.lineNum, program)}:${m.linePos} ${m.message}`);
  }
  if (!errors.length) {
    try {
      await dev.createRenderPipelineAsync({
        layout: "auto",
        vertex: { module, entryPoint: "vsMain" },
        fragment: { module, entryPoint: "fsMain", targets: [{ format: "bgra8unorm" }] },
      });
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }
  const scoped = await dev.popErrorScope();
  if (scoped && !errors.length) errors.push(scoped.message);
  return errors;
}

let glCtx: WebGL2RenderingContext | null | undefined;
function checkWebGl2(scene: FoilScene, post: PostMode): string[] | null {
  if (glCtx === undefined) glCtx = document.createElement("canvas").getContext("webgl2");
  const gl = glCtx;
  if (!gl) return null;
  const program = { key: `${scene.id}#${post}`, scene, post };
  let source: string;
  try {
    source = glslFragment(program);
  } catch (err) {
    return [`translate: ${err instanceof Error ? err.message : String(err)}`];
  }
  const vs = gl.createShader(gl.VERTEX_SHADER)!;
  gl.shaderSource(vs, GLSL_VERTEX);
  gl.compileShader(vs);
  const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
  gl.shaderSource(fs, source);
  gl.compileShader(fs);
  const errors: string[] = [];
  if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) errors.push(readableGlslLog(gl.getShaderInfoLog(fs) ?? "compile failed", program).trim());
  else {
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) errors.push(gl.getProgramInfoLog(prog) ?? "link failed");
    gl.deleteProgram(prog);
  }
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  return errors;
}

/**
 * Compiles scenes on both backends and lints them, without drawing. Use it
 * while writing a scene: every message points at "scene line N".
 *
 *   const results = await ZenFoil.validate(["my-scene"]);
 */
export async function validateScenes(ids?: string[], posts?: PostMode[]): Promise<ValidationResult[]> {
  const scenes = ids ? ids.map((id) => getScene(id)).filter((s): s is FoilScene => !!s) : listScenes();
  const out: ValidationResult[] = [];
  for (const scene of scenes) {
    const base = scene.post ?? "plate";
    const modes: PostMode[] = posts ?? (base === "plate" ? ["plate", "paper", "clear"] : [base]);
    const lint = lintWgsl(scene.code, scene.id);
    for (const post of modes) {
      out.push({ scene: scene.id, post, lint, webgpu: await checkWebGpu(scene, post), webgl2: checkWebGl2(scene, post) });
    }
  }
  return out;
}
