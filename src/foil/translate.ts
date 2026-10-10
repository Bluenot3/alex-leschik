/**
 * Portable-WGSL → GLSL ES 3.00.
 *
 * Every foil scene is authored once, in a deliberately small subset of WGSL,
 * and runs natively on WebGPU. Browsers without WebGPU get the same program
 * through this translator. The subset keeps the mapping mechanical:
 *
 *   fn name(a: T, b: U) -> R {      →  R name(T a, U b) {
 *   let|var x: T = e;               →  T x = e;
 *   var x: T;                       →  T x;
 *   const X: T = e;                 →  const T X = e;
 *
 * Types and builtins whose spelling differs (f32, vec3f, atan2, select, …)
 * are bridged by #defines in the GLSL prelude rather than rewritten here.
 * Authoring rules the translator relies on (all enforced by WGSL's own
 * compiler on the primary path, and by the GLSL compiler on the fallback):
 *   – every let/var carries an explicit type,
 *   – float math uses float literals (1.0, not 1),
 *   – functions are declared before use, names avoid GLSL/WGSL reserved words.
 */

const LINE_COMMENT = /\/\/[^\n]*/g;
const BLOCK_COMMENT = /\/\*[\s\S]*?\*\//g;

export function stripComments(src: string): string {
  return src.replace(BLOCK_COMMENT, "").replace(LINE_COMMENT, "");
}

export class TranslateError extends Error {}

export function wgslToGlsl(src: string): string {
  let out = stripComments(src);

  out = out.replace(
    /\bfn\s+(\w+)\s*\(([^)]*)\)\s*(?:->\s*([\w<>]+)\s*)?\{/g,
    (_match, name: string, params: string, ret: string | undefined) => {
      const list = params
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => {
          const m = part.match(/^(\w+)\s*:\s*([\w<>]+)$/);
          if (!m) throw new TranslateError(`Unsupported parameter "${part}" in fn ${name}`);
          return `${m[2]} ${m[1]}`;
        });
      return `${ret ?? "void"} ${name}(${list.join(", ")}) {`;
    },
  );

  out = out.replace(/\bconst\s+(\w+)\s*:\s*([\w<>]+)\s*=/g, (_m, name: string, type: string) => `const ${type} ${name} =`);
  out = out.replace(/\b(?:let|var)\s+(\w+)\s*:\s*([\w<>]+)\s*(=|;)/g, (_m, name: string, type: string, tail: string) =>
    tail === "=" ? `${type} ${name} =` : `${type} ${name};`,
  );

  const untyped = out.match(/\b(let|var|const)\s+\w+\s*=/);
  if (untyped) throw new TranslateError(`Untyped declaration near "${untyped[0]}" — annotate the type`);
  if (/\bfn\b/.test(out)) throw new TranslateError("Unrecognised fn signature (keep signatures on one line)");
  return out;
}

/** Bridges WGSL spellings onto GLSL ES 3.00. */
export const GLSL_BRIDGE = /* glsl */ `
#define f32 float
#define i32 int
#define u32 uint
#define vec2f vec2
#define vec3f vec3
#define vec4f vec4
#define vec2i ivec2
#define vec2u uvec2
#define mat2x2f mat2
#define mat3x3f mat3
#define atan2(y, x) atan(y, x)
#define inverseSqrt inversesqrt
#define saturate(x) clamp(x, 0.0, 1.0)
#define select(f, t, c) ((c) ? (t) : (f))
#define textureSampleLevel(t, s, c, l) textureLod(t, c, l)
#define dpdx dFdx
#define dpdy dFdy
`;
