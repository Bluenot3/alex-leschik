/**
 * Portable WGSL → GLSL ES 3.00.
 *
 * Every scene is authored once, in a deliberately small subset of WGSL, and
 * runs natively on WebGPU. Browsers without WebGPU get the same program
 * through this translator. The subset keeps the mapping mechanical:
 *
 *   fn name(a: T, b: U) -> R {      →  R name(T a, U b) {
 *   let|var x: T = e;               →  T x = e;
 *   var x: T;                       →  T x;
 *   const X: T = e;                 →  const T X = e;
 *
 * Types and builtins whose spelling differs (f32, vec3f, atan2, select, …)
 * are bridged by #defines in the GLSL prelude rather than rewritten here.
 * Authoring rules the translator relies on (reference/portable-wgsl.md):
 *   – every let/var/const carries an explicit type,
 *   – float math uses float literals (1.0, not 1),
 *   – fn signatures stay on one line; functions are declared before use,
 *   – no ternaries, no float %, no smoothstep (use sstep), and names avoid
 *     GLSL/WGSL reserved words.
 */

const LINE_COMMENT = /\/\/[^\n]*/g;
const BLOCK_COMMENT = /\/\*[\s\S]*?\*\//g;

/** Removes comments, keeping every newline so line numbers still match. */
export function stripComments(src: string): string {
  return src.replace(BLOCK_COMMENT, (m) => m.replace(/[^\n]/g, "")).replace(LINE_COMMENT, "");
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
#define vec3i ivec3
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

/* Identifiers either target reserves (WGSL keywords and reserved words,
   GLSL ES 3.00 keywords and reserved words), plus builtins a declaration
   must not shadow. */
const RESERVED = new Set(
  `
  active alias as asm async attribute auto await become binding_array break buffer case cast catch centroid class
  co_await co_return co_yield coherent column_major common compile compile_fragment concept const_cast consteval
  constexpr constinit continue continuing crate debugger decltype default delete demote demote_to_helper discard do
  dynamic_cast else enable enum explicit export extends extern external fallthrough false filter final finally flat
  for friend from fxgroup get goto groupshared highp if impl implements import in inline inout input instanceof
  interface invariant layout let loop lowp macro macro_rules match mediump meta mod module move mut mutable namespace
  new nil noexcept noinline nointerpolation noperspective null nullptr of operator out output override package
  packoffset partition pass patch pixelfragment precise precision premerge priv private protected pub public readonly
  ref regardless register reinterpret_cast require requires resource restrict return sample sampler self set shared
  sizeof smooth snorm static static_assert static_cast std struct subroutine super switch target template this
  thread_local throw trait true try type typedef typeid typename typeof uniform union unless unorm unsafe unsized use
  using var varying virtual void volatile wgsl where while with writeonly yield half fixed long short double
  superp texture storage function workgroup position location vertex fragment compute input output filter
  cross dot length distance normalize mix step clamp min max abs sign floor ceil fract sqrt pow exp log sin cos tan
  asin acos atan reflect refract radians degrees exp2 log2 round trunc smoothstep select saturate fwidth u
  `
    .split(/\s+/)
    .filter(Boolean),
);

function declaredNames(src: string) {
  const code = stripComments(src);
  const names: string[] = [];
  for (const m of code.matchAll(/\b(?:let|var|const)\s+(\w+)\s*:/g)) names.push(m[1]);
  for (const m of code.matchAll(/\bfn\s+(\w+)\s*\(([^)]*)\)/g)) {
    names.push(m[1]);
    for (const param of m[2].split(",")) {
      const name = param.split(":")[0]?.trim();
      if (name) names.push(name);
    }
  }
  return names;
}

/**
 * Static checks for portable WGSL: the mistakes that compile on one backend
 * and not the other, or that the translator can't map. Returns problems as
 * readable strings (empty when clean). Compile errors themselves surface at
 * runtime (console + foil-error event) and in scripts/preview.mjs.
 */
export function lintWgsl(code: string, label = "scene"): string[] {
  const problems: string[] = [];
  const body = stripComments(code);
  try {
    wgslToGlsl(code);
  } catch (err) {
    problems.push(`${label}: ${err instanceof Error ? err.message : String(err)}`);
  }
  const bad = declaredNames(code).filter((n) => RESERVED.has(n) || n.includes("__") || n.startsWith("gl_"));
  if (bad.length) problems.push(`${label}: reserved or builtin names declared: ${[...new Set(bad)].join(", ")}`);
  if (/\bsmoothstep\s*\(/.test(body)) problems.push(`${label}: smoothstep is undefined for reversed edges on some GPUs — use sstep(a, b, x)`);
  if (/\d\.\d*\s*%|%\s*\d+\.\d/.test(body)) problems.push(`${label}: float % differs between WGSL and GLSL — use modF(x, y)`);
  if (/\?\s*[^:;\n]+:/.test(body)) problems.push(`${label}: ternaries are not WGSL — use select(falseValue, trueValue, condition)`);
  if (/\bfn\s+\w+\s*\([^)]*$/m.test(body)) problems.push(`${label}: keep each fn signature on one line`);
  if (/\b(let|var)\s+\w+\s*:\s*f32\s*=\s*-?\d+\s*;/.test(body)) problems.push(`${label}: float declared from an integer literal — write 1.0, not 1`);
  if (/\bdiscard\b/.test(body)) problems.push(`${label}: discard breaks derivatives on some backends — return transparent/black instead`);
  if (!/\bfn\s+scene\s*\(/.test(body)) problems.push(`${label}: no fn scene(uv: vec2f, p: vec2f) defined`);
  return problems;
}
