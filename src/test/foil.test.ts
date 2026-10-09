import { describe, expect, it } from "vitest";
import { stripComments, wgslToGlsl, TranslateError } from "@/foil/translate";
import { LIBRARY, POST } from "@/foil/library";
import { allScenes, systemScenes } from "@/foil/scenes";
import { DATA_FLOATS } from "@/foil/types";
import { GLYPH_TABLE, missingGlyphs } from "@/foil/atlas";

/* Identifiers either target reserves (WGSL keywords/reserved words, GLSL ES
   3.00 keywords and reserved words, plus builtins we must not shadow). */
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
  superp texture storage function workgroup position location vertex fragment compute
  cross dot length distance normalize mix step clamp min max abs sign floor ceil fract sqrt pow exp log sin cos tan
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

describe("portable WGSL → GLSL translator", () => {
  it("rewrites signatures and typed declarations", () => {
    const out = wgslToGlsl(`
fn f(a: f32, b: vec2f) -> vec3f {
  let x: f32 = a * 2.0;
  var y: vec2f;
  for (var i: i32 = 0; i < 3; i++) { y = b; }
  return vec3f(x, y);
}
const K: f32 = 1.0;
fn g() { }`);
    expect(out).toContain("vec3f f(f32 a, vec2f b) {");
    expect(out).toContain("f32 x = a * 2.0;");
    expect(out).toContain("vec2f y;");
    expect(out).toContain("for (i32 i = 0; i < 3; i++)");
    expect(out).toContain("const f32 K = 1.0;");
    expect(out).toContain("void g() {");
  });

  it("rejects untyped declarations", () => {
    expect(() => wgslToGlsl("fn f() { let x = 1.0; }")).toThrow(TranslateError);
  });

  it("translates the shared library and every scene", () => {
    for (const scene of [...allScenes(), ...systemScenes()]) {
      expect(() => wgslToGlsl(LIBRARY + scene.code + POST), scene.id).not.toThrow();
    }
  });
});

describe("foil scenes", () => {
  const plates = allScenes();
  const scenes = [...plates, ...systemScenes()];

  it("covers every portfolio plate exactly once", () => {
    expect(plates).toHaveLength(20);
    expect(new Set(scenes.map((s) => s.id)).size).toBe(scenes.length);
  });

  it("never declares identifiers reserved by WGSL or GLSL", () => {
    for (const src of [LIBRARY, POST, ...scenes.map((s) => s.code)]) {
      const bad = declaredNames(src).filter((n) => RESERVED.has(n) || n.includes("__") || n.startsWith("gl_"));
      expect(bad, src.slice(0, 60)).toEqual([]);
    }
  });

  it("avoids WGSL/GLSL divergences the translator cannot bridge", () => {
    for (const s of scenes) {
      const code = stripComments(s.code);
      expect(code, `${s.id}: smoothstep is undefined for reversed edges — use sstep`).not.toMatch(/\bsmoothstep\(/);
      expect(code, `${s.id}: float % differs between WGSL and GLSL`).not.toMatch(/\d\.\d*\s*%|%\s*\d+\.\d/);
      expect(code, `${s.id}: ternaries are not WGSL`).not.toMatch(/\?\s*[^:]+:/);
    }
  });

  it("writes the text every scene draws", () => {
    for (const s of scenes) {
      const usesText = /\b(textRun|textLoop|ringText|charAt)\(/.test(s.code);
      if (!usesText) continue;
      expect(s.data, `${s.id} draws text but has no data()`).toBeTypeOf("function");
      const d = new Float32Array(DATA_FLOATS);
      s.data!(d);
      expect(d.some((v) => v !== 0), `${s.id} wrote no data`).toBe(true);
    }
  });

  it("only uses glyphs present in the atlas", () => {
    expect(new Set(Array.from(GLYPH_TABLE)).size).toBe(128);
    for (const s of scenes) s.data?.(new Float32Array(DATA_FLOATS));
    expect([...missingGlyphs]).toEqual([]);
  });
});
