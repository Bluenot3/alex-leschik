/**
 * The shared shader library, written in portable WGSL (see translate.ts).
 *
 * Coordinate contract for every scene:
 *   scene(uv, p) -> vec3f   additive light over the shared substrate
 *   uv  0..1, origin top-left (DOM orientation)
 *   p   aspect-correct, centred, y up; p.y ∈ [-0.5, 0.5],
 *       p.x ∈ [-aspect()/2, aspect()/2]
 *
 * Derivative helpers (engrave, fwidth) must stay in uniform control flow:
 * choose with select()/mix(), not per-pixel if/else around them.
 *
 * Full reference with every function: reference/shader-library.md.
 */

export const WGSL_HEADER = /* wgsl */ `
struct Uniforms {
  res: vec4f,
  time: vec4f,
  mouse: vec4f,
  tilt: vec4f,
  accent: vec4f,
  p0: vec4f,
  p1: vec4f,
  d: array<vec4f, 64>,
};
@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var atlasTex: texture_2d<f32>;
@group(0) @binding(2) var atlasSmp: sampler;
@group(0) @binding(3) var imgTex: texture_2d_array<f32>;
@group(0) @binding(4) var imgSmp: sampler;

/* Per-view image layers (premultiplied RGBA, mipmapped, uv y down). */
fn imgLod(uv: vec2f, layer: i32, lod: f32) -> vec4f { return textureSampleLevel(imgTex, imgSmp, uv, layer, lod); }
fn imgGrad(uv: vec2f, layer: i32, gx: vec2f, gy: vec2f) -> vec4f { return textureSampleGrad(imgTex, imgSmp, uv, layer, gx, gy); }
`;

export const GLSL_HEADER = /* glsl */ `
layout(std140) uniform UBlock {
  vec4 res;
  vec4 time;
  vec4 mouse;
  vec4 tilt;
  vec4 accent;
  vec4 p0;
  vec4 p1;
  vec4 d[64];
} u;
uniform highp sampler2D atlasTex;
uniform highp sampler2DArray imgTex;
out vec4 fragColor;

vec4 imgLod(vec2 uv, int layer, float lod) { return textureLod(imgTex, vec3(uv, float(layer)), lod); }
vec4 imgGrad(vec2 uv, int layer, vec2 gx, vec2 gy) { return textureGrad(imgTex, vec3(uv, float(layer)), gx, gy); }
`;

export const LIBRARY = /* wgsl */ `
const PI: f32 = 3.14159265;
const TAU: f32 = 6.28318531;
const ATLAS_W: f32 = 1024.0;
const ATLAS_H: f32 = 2048.0;
const GCELL: f32 = 64.0;
const GRAD: f32 = 10.0;
const MAPRAD: f32 = 48.0;
const WORLDRAD: f32 = 16.0;
const LCELL: f32 = 256.0;
const LOGORAD: f32 = 24.0;
const LOGO_ZEN: i32 = 0;
const LOGO_BGC: i32 = 1;
const LOGO_NEAR: i32 = 2;

fn tnow() -> f32 { return u.time.x; }
fn pxs() -> f32 { return 1.0 / u.res.y; }
fn aspect() -> f32 { return u.res.x / u.res.y; }
fn hov() -> f32 { return u.mouse.z; }
fn pulse() -> f32 { return u.mouse.w; }
fn mouseP() -> vec2f { return vec2f((u.mouse.x - 0.5) * aspect(), 0.5 - u.mouse.y); }
fn intro() -> f32 { return u.time.w; }

fn rot2(a: f32) -> mat2x2f { let c: f32 = cos(a); let s: f32 = sin(a); return mat2x2f(c, s, -s, c); }
fn sat3(v: vec3f) -> vec3f { return clamp(v, vec3f(0.0), vec3f(1.0)); }
fn luma(c: vec3f) -> f32 { return dot(c, vec3f(0.299, 0.587, 0.114)); }
fn ease(x: f32) -> f32 { let t: f32 = saturate(x); return t * t * (3.0 - 2.0 * t); }
/* smoothstep that stays defined when a > b (GLSL/MSL leave that undefined). */
fn sstep(a: f32, b: f32, x: f32) -> f32 { return ease((x - a) / (b - a)); }
/* Float modulo that agrees on every backend. */
fn modF(x: f32, y: f32) -> f32 { return x - y * floor(x / y); }

fn pcg(v: u32) -> u32 {
  let st: u32 = (v * 747796405u) + 2891336453u;
  let w: u32 = ((st >> ((st >> 28u) + 4u)) ^ st) * 277803737u;
  return (w >> 22u) ^ w;
}
fn hashu(x: i32, y: i32) -> u32 { return pcg(u32(x) ^ pcg(u32(y) + 1013904223u)); }
fn h21(p: vec2f) -> f32 {
  let q: vec2f = floor(p);
  return f32(hashu(i32(q.x), i32(q.y)) >> 8u) * (1.0 / 16777216.0);
}
fn h22(p: vec2f) -> vec2f {
  let q: vec2f = floor(p);
  let a: u32 = hashu(i32(q.x), i32(q.y));
  let b: u32 = pcg(a);
  return vec2f(f32(a >> 8u), f32(b >> 8u)) * (1.0 / 16777216.0);
}
fn h11(x: f32) -> f32 { return f32(pcg(u32(i32(floor(x)) + 65536)) >> 8u) * (1.0 / 16777216.0); }

fn vnoise(p: vec2f) -> f32 {
  let i: vec2f = floor(p);
  let f: vec2f = fract(p);
  let w: vec2f = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  let a: f32 = h21(i);
  let b: f32 = h21(i + vec2f(1.0, 0.0));
  let c: f32 = h21(i + vec2f(0.0, 1.0));
  let d: f32 = h21(i + vec2f(1.0, 1.0));
  return mix(mix(a, b, w.x), mix(c, d, w.x), w.y);
}

fn grad2(i: vec2f) -> vec2f { let a: f32 = h21(i) * TAU; return vec2f(cos(a), sin(a)); }
fn gnoise(p: vec2f) -> f32 {
  let i: vec2f = floor(p);
  let f: vec2f = fract(p);
  let w: vec2f = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  let ga: f32 = dot(grad2(i), f);
  let gb: f32 = dot(grad2(i + vec2f(1.0, 0.0)), f - vec2f(1.0, 0.0));
  let gc: f32 = dot(grad2(i + vec2f(0.0, 1.0)), f - vec2f(0.0, 1.0));
  let gd: f32 = dot(grad2(i + vec2f(1.0, 1.0)), f - vec2f(1.0, 1.0));
  return mix(mix(ga, gb, w.x), mix(gc, gd, w.x), w.y);
}
fn fbm(p: vec2f, oct: i32) -> f32 {
  var s: f32 = 0.0;
  var a: f32 = 0.5;
  var q: vec2f = p;
  for (var i: i32 = 0; i < oct; i++) {
    s += a * gnoise(q);
    q = rot2(0.62) * q * 2.02 + vec2f(3.1, 1.7);
    a *= 0.5;
  }
  return s;
}

fn sdCircle(p: vec2f, r: f32) -> f32 { return length(p) - r; }
fn sdBox(p: vec2f, b: vec2f) -> f32 {
  let d: vec2f = abs(p) - b;
  return length(max(d, vec2f(0.0))) + min(max(d.x, d.y), 0.0);
}
fn sdRoundBox(p: vec2f, b: vec2f, r: f32) -> f32 { return sdBox(p, b - vec2f(r)) - r; }
fn sdSeg(p: vec2f, a: vec2f, b: vec2f) -> f32 {
  let pa: vec2f = p - a;
  let ba: vec2f = b - a;
  let h: f32 = saturate(dot(pa, ba) / max(dot(ba, ba), 1e-8));
  return length(pa - ba * h);
}
fn segT(p: vec2f, a: vec2f, b: vec2f) -> f32 {
  let ba: vec2f = b - a;
  return saturate(dot(p - a, ba) / max(dot(ba, ba), 1e-8));
}
fn sdQuadBez(p: vec2f, a: vec2f, b: vec2f, c: vec2f) -> f32 {
  // polyline approximation: robust in both backends and plenty for hairlines
  var best: f32 = 1e9;
  var prev: vec2f = a;
  for (var i: i32 = 1; i <= 12; i++) {
    let t: f32 = f32(i) / 12.0;
    let q: vec2f = mix(mix(a, b, t), mix(b, c, t), t);
    best = min(best, sdSeg(p, prev, q));
    prev = q;
  }
  return best;
}

/* Line coverage for a stroke of half-width hw px at distance d px. Hairlines
   (hw < 0.5) keep a 1px footprint and fade by their true width so nothing
   shimmers. */
fn lineCov(d: f32, hw: f32) -> f32 {
  let w: f32 = max(hw, 0.5);
  return saturate(w + 0.5 - d) * saturate(hw * 2.0);
}
/* Stroke from a distance field measured in p-units. */
fn stroke(d: f32, hwPx: f32) -> f32 { return lineCov(abs(d) / pxs(), hwPx); }
/* Soft luminous halo around a distance field (p-units). */
fn halo(d: f32, k: f32) -> f32 { return exp(-abs(d) * k); }
fn fillAA(d: f32) -> f32 { return saturate(0.5 - d / pxs()); }

/* Intaglio engraving: parallel lines following the scalar c with period s.
   tone 0..1 sets line weight, like a burin cut deeper for darker ink. When
   the period approaches a pixel the pattern resolves to its mean tone
   instead of moiré. */
fn engraveP(c: f32, s: f32, tone: f32, ps: f32) -> f32 {
  let pw: f32 = max(ps, 1e-6);
  let hwu: f32 = 0.5 * s * saturate(tone);
  let dist: f32 = abs(fract(c / s + 0.5) - 0.5) * s;
  let lc: f32 = lineCov(dist / pw, hwu / pw);
  return mix(2.0 * hwu / s, lc, sstep(1.6, 3.6, s / pw));
}
fn engrave(c: f32, s: f32, tone: f32) -> f32 { return engraveP(c, s, tone, fwidth(c)); }

/* Halftone dot screen (rotated grid), radius grows with tone. */
fn halftone(p: vec2f, cell: f32, ang: f32, tone: f32) -> f32 {
  let q: vec2f = rot2(ang) * p / cell;
  let f: vec2f = fract(q) - 0.5;
  let r: f32 = sqrt(saturate(tone)) * 0.5;
  let dotc: f32 = saturate((r - length(f)) * cell / pxs() + 0.5);
  return mix(PI * r * r, dotc, sstep(2.5, 5.0, cell / pxs()));
}

/* Holographic foil: silvered cosine palette that sweeps cyan → violet →
   gold. Phase is driven by geometry, view tilt and time. */
fn holo(t: f32) -> vec3f {
  return vec3f(0.60, 0.64, 0.72) + vec3f(0.40, 0.36, 0.30) * cos(TAU * (vec3f(t) + vec3f(0.0, 0.16, 0.34)));
}
fn spectral(t: f32) -> vec3f { return 0.5 + 0.5 * cos(TAU * (vec3f(t) + vec3f(0.0, 0.33, 0.67))); }
/* View-dependent foil phase for a point: the tilt makes it shift like a hologram. */
fn foilPhase(p: vec2f, k: f32) -> f32 {
  return dot(p, vec2f(0.9, 0.55)) * k + u.tilt.x * 0.55 - u.tilt.y * 0.35 + tnow() * 0.025;
}
/* Ink colour for engraved line-work: accent blended with silver foil. */
fn inkCol(p: vec2f, k: f32) -> vec3f {
  let h: vec3f = holo(foilPhase(p, k));
  return mix(u.accent.rgb, h, 0.5 + 0.18 * u.mouse.z);
}
fn silver() -> vec3f { return vec3f(0.80, 0.85, 0.93); }
fn gold() -> vec3f { return vec3f(1.0, 0.86, 0.58); }

/* Static scene data: 2D points packed two per vec4 from vec4 index \`base\`. */
fn dPt(base: i32, i: i32) -> vec2f {
  let v: vec4f = u.d[base + i / 2];
  return select(v.zw, v.xy, (i % 2) == 0);
}
/* One float of the data block by float index. */
fn dF(i: i32) -> f32 {
  let v: vec4f = u.d[i / 4];
  let c: i32 = i % 4;
  return select(select(select(v.x, v.y, c == 1), v.z, c == 2), v.w, c == 3);
}

/* ── Signed-distance glyph atlas (DM Mono, 16 × 8 cells of 64 px) ── */
fn glyphD(code: i32, q: vec2f) -> f32 {
  let col: f32 = f32(code % 16);
  let row: f32 = f32(code / 16);
  let qc: vec2f = clamp(q, vec2f(0.0), vec2f(1.0));
  let a: vec2f = (vec2f(col, row) + qc) * vec2f(GCELL / ATLAS_W, GCELL / ATLAS_H);
  let v: f32 = textureSampleLevel(atlasTex, atlasSmp, a, 0.0).r;
  let outside: f32 = length(q - qc);
  return (0.5 - v) * 2.0 * GRAD / GCELL + outside;
}
/* Glyph coverage: q glyph-local (y down, 0..1 across the cell), size = cell height in p-units. */
fn glyphCov(code: i32, q: vec2f, size: f32, weight: f32) -> f32 {
  let d: f32 = glyphD(code, q) * size;
  return saturate((weight * pxs() - d) / pxs() + 0.5);
}
/* Character codes packed three per float into u.d. */
fn charAt(i: i32) -> i32 {
  let slot: i32 = i / 3;
  let v: vec4f = u.d[slot / 4];
  let comp: i32 = slot % 4;
  let f: f32 = select(select(select(v.x, v.y, comp == 1), v.z, comp == 2), v.w, comp == 3);
  let raw: i32 = i32(f + 0.5);
  return (raw >> (u32(i % 3) * 8u)) & 255;
}
/* Monospace text run from u.d with explicit tracking: start char index,
   count, top-left origin (p-space), cap size, advance = track × size.
   0.6 is the open microprint spacing; ~0.42 sets tight display figures. */
fn textRunT(p: vec2f, origin: vec2f, size: f32, start: i32, count: i32, weight: f32, track: f32) -> f32 {
  let adv: f32 = size * track;
  let lx: f32 = (p.x - origin.x) / adv;
  let ly: f32 = (origin.y - p.y) / size;
  let idx: i32 = i32(floor(lx));
  let inside: bool = (lx >= 0.0) && (ly >= 0.0) && (ly <= 1.0) && (idx < count);
  let code: i32 = charAt(start + clamp(idx, 0, max(count - 1, 0)));
  let q: vec2f = vec2f((fract(lx) - 0.5) * track + 0.5, ly);
  return select(0.0, glyphCov(code, q, size, weight), inside && (code > 0));
}
/* The default run (open microprint spacing). Returns coverage. */
fn textRun(p: vec2f, origin: vec2f, size: f32, start: i32, count: i32, weight: f32) -> f32 {
  return textRunT(p, origin, size, start, count, weight, 0.6);
}
/* Repeating microprint band: the string tiles horizontally, shifted by
   \`shift\` (p-units). Offset keeps indices positive for GLSL's %. */
fn textLoop(p: vec2f, top: f32, size: f32, start: i32, count: i32, shift: f32, weight: f32) -> f32 {
  let adv: f32 = size * 0.6;
  let lx: f32 = (p.x + shift + 64.0) / adv;
  let ly: f32 = (top - p.y) / size;
  let idx: i32 = i32(floor(lx)) % max(count, 1);
  let inside: bool = (ly >= 0.0) && (ly <= 1.0);
  let code: i32 = charAt(start + idx);
  let q: vec2f = vec2f((fract(lx) - 0.5) * 0.6 + 0.5, ly);
  return select(0.0, glyphCov(code, q, size, weight), inside && (code > 0));
}
/* Microprint set around a circle (clockwise from twelve o'clock, glyph tops
   facing outward). Tiles a whole number of times so the seam is invisible;
   once = true prints a single run starting at rot instead. */
fn ringText(p: vec2f, ctr: vec2f, radius: f32, size: f32, start: i32, count: i32, rot: f32, once: bool) -> f32 {
  let d: vec2f = p - ctr;
  let r: f32 = length(d);
  let a: f32 = atan2(d.x, d.y) - rot;
  let fit: f32 = TAU * radius / (size * 0.6);
  let n: f32 = f32(max(count, 1));
  let slots: f32 = select(max(floor(fit / n), 1.0) * n, floor(fit), once);
  let s: f32 = fract(a / TAU + 2.0) * slots;
  let raw: i32 = i32(floor(s));
  let idx: i32 = raw % max(count, 1);
  let ly: f32 = (radius + size * 0.5 - r) / size;
  let inside: bool = (ly >= 0.0) && (ly <= 1.0) && (!once || (raw < count));
  let code: i32 = charAt(start + idx);
  let arc: f32 = TAU * r / slots;
  let q: vec2f = vec2f(0.5 + (fract(s) - 0.5) * arc / size, ly);
  return select(0.0, glyphCov(code, q, size, 0.0), inside && (code > 0));
}
/* A glyph chosen by number (e.g. animated digits): code = 16 + digit. */
fn digitCov(p: vec2f, origin: vec2f, size: f32, digit: i32, weight: f32) -> f32 {
  let adv: f32 = size * 0.6;
  let lx: f32 = (p.x - origin.x) / adv;
  let ly: f32 = (origin.y - p.y) / size;
  let inside: bool = (lx >= 0.0) && (lx <= 1.0) && (ly >= 0.0) && (ly <= 1.0);
  let q: vec2f = vec2f((lx - 0.5) * 0.6 + 0.5, ly);
  return select(0.0, glyphCov(16 + clamp(digit, 0, 9), q, size, weight), inside);
}
/* One glyph by atlas code (see GLYPH_TABLE; e.g. 100 = ×, 95 = ·) at a top-left origin. */
fn glyphAt(p: vec2f, origin: vec2f, size: f32, code: i32, weight: f32) -> f32 {
  let lx: f32 = (p.x - origin.x) / (size * 0.6);
  let ly: f32 = (origin.y - p.y) / size;
  let inside: bool = (lx >= 0.0) && (lx <= 1.0) && (ly >= 0.0) && (ly <= 1.0);
  return select(0.0, glyphCov(code, vec2f((lx - 0.5) * 0.6 + 0.5, ly), size, weight), inside);
}
/* A zero-padded integer, \`digits\` wide, from its top-left origin. */
fn numberCov(p: vec2f, origin: vec2f, size: f32, value: i32, digits: i32, weight: f32) -> f32 {
  let adv: f32 = size * 0.6;
  let lx: f32 = (p.x - origin.x) / adv;
  let col: i32 = i32(floor(lx));
  let inside: bool = (lx >= 0.0) && (col < digits);
  var pw: i32 = 1;
  for (var k: i32 = 0; k < 9; k++) {
    if (k < digits - 1 - col) { pw = pw * 10; }
  }
  let dg: i32 = (max(value, 0) / max(pw, 1)) % 10;
  return select(0.0, digitCov(p, origin + vec2f(f32(max(col, 0)) * adv, 0.0), size, dg, weight), inside);
}
/* A random glyph from the cipher set (digits, punctuation, capitals). */
fn cipherCode(h: f32) -> i32 { return 16 + i32(h * 42.99); }
/* A streaming cipher/hash run: \`count\` characters that re-roll \`rate\`
   times a second. hex = true restricts to 0–9 A–F. */
fn cipherRun(p: vec2f, origin: vec2f, size: f32, count: i32, seed: f32, rate: f32, hex: bool, weight: f32) -> f32 {
  let adv: f32 = size * 0.6;
  let lx: f32 = (p.x - origin.x) / adv;
  let ly: f32 = (origin.y - p.y) / size;
  let idx: i32 = i32(floor(lx));
  let inside: bool = (lx >= 0.0) && (ly >= 0.0) && (ly <= 1.0) && (idx < count);
  let tick: f32 = floor(tnow() * rate + h11(f32(idx) + seed * 13.0) * 4.0);
  let h: f32 = h21(vec2f(f32(idx) + seed * 101.0, tick));
  let hx: i32 = i32(h * 15.99);
  let hexCode: i32 = select(33 + hx - 10, 16 + hx, hx < 10);
  let code: i32 = select(cipherCode(h), hexCode, hex);
  let q: vec2f = vec2f((fract(lx) - 0.5) * 0.6 + 0.5, ly);
  return select(0.0, glyphCov(code, q, size, weight), inside);
}

/* ── Parameters (written by the engine from attributes / props) ──
   d[0..3]: string table — slot k = (start, count); d[4..7]: numbers 0–15. */
fn numParam(i: i32) -> f32 {
  let v: vec4f = u.d[4 + i / 4];
  let c: i32 = i % 4;
  return select(select(select(v.x, v.y, c == 1), v.z, c == 2), v.w, c == 3);
}
fn strParam(k: i32) -> vec2i {
  let v: vec4f = u.d[k / 2];
  let even: bool = (k % 2) == 0;
  return vec2i(i32(select(v.z, v.x, even) + 0.5), i32(select(v.w, v.y, even) + 0.5));
}
/* Characters in text param k, and its width at cap size \`size\`. */
fn textLenP(k: i32) -> f32 { return f32(strParam(k).y); }
fn textWidthP(k: i32, size: f32) -> f32 { return textLenP(k) * size * 0.6; }
/* The largest cap size ≤ maxSize at which text param k fits in maxW. */
fn textFitP(k: i32, maxW: f32, maxSize: f32) -> f32 { return min(maxSize, maxW / max(textLenP(k) * 0.6, 0.6)); }
fn textRunP(p: vec2f, origin: vec2f, size: f32, k: i32, weight: f32) -> f32 {
  let s: vec2i = strParam(k);
  return textRun(p, origin, size, s.x, s.y, weight);
}
/* Text param k centred on c (both axes). */
fn textCenterP(p: vec2f, c: vec2f, size: f32, k: i32, weight: f32) -> f32 {
  let s: vec2i = strParam(k);
  let w: f32 = f32(s.y) * size * 0.6;
  return textRun(p, vec2f(c.x - w * 0.5, c.y + size * 0.5), size, s.x, s.y, weight);
}
fn textLoopP(p: vec2f, top: f32, size: f32, k: i32, shift: f32, weight: f32) -> f32 {
  let s: vec2i = strParam(k);
  return textLoop(p, top, size, s.x, s.y, shift, weight);
}
fn ringTextP(p: vec2f, ctr: vec2f, radius: f32, size: f32, k: i32, rot: f32, once: bool) -> f32 {
  let s: vec2i = strParam(k);
  return ringText(p, ctr, radius, size, s.x, s.y, rot, once);
}
/* Text param k with explicit tracking (see textRunT). */
fn textRunPT(p: vec2f, origin: vec2f, size: f32, k: i32, weight: f32, track: f32) -> f32 {
  let s: vec2i = strParam(k);
  return textRunT(p, origin, size, s.x, s.y, weight, track);
}
fn textWidthPT(k: i32, size: f32, track: f32) -> f32 { return textLenP(k) * size * track; }
/* Text param k decoding in, with tracking: characters past \`reveal\`
   (0..1 of the run) show re-rolling cipher glyphs; settled ones the text. */
fn textDecodePT(p: vec2f, origin: vec2f, size: f32, k: i32, weight: f32, reveal: f32, track: f32) -> f32 {
  let s: vec2i = strParam(k);
  let adv: f32 = size * track;
  let lx: f32 = (p.x - origin.x) / adv;
  let ly: f32 = (origin.y - p.y) / size;
  let idx: i32 = i32(floor(lx));
  let inside: bool = (lx >= 0.0) && (ly >= 0.0) && (ly <= 1.0) && (idx < s.y);
  let real: i32 = charAt(s.x + clamp(idx, 0, max(s.y - 1, 0)));
  let settled: bool = f32(idx) < reveal * f32(s.y);
  let h: f32 = h21(vec2f(f32(idx) * 7.0 + f32(k) * 31.0, floor(tnow() * 18.0)));
  let ghost: i32 = select(cipherCode(h), 0, real == 0);
  let code: i32 = select(ghost, real, settled);
  let q: vec2f = vec2f((fract(lx) - 0.5) * track + 0.5, ly);
  let front: bool = (f32(idx) < reveal * f32(s.y) + 4.0);
  return select(0.0, glyphCov(code, q, size, weight), inside && (code > 0) && front);
}
/* Text param k decoding in at the default spacing. */
fn textDecodeP(p: vec2f, origin: vec2f, size: f32, k: i32, weight: f32, reveal: f32) -> f32 {
  return textDecodePT(p, origin, size, k, weight, reveal, 0.6);
}

/* ── Map silhouette region (contiguous U.S., Albers) ── */
fn mapD(q: vec2f) -> f32 {
  // q: map-local 0..1 (y down) → signed distance in map-width units, negative inside
  let qc: vec2f = clamp(q, vec2f(0.0), vec2f(1.0));
  let a: vec2f = vec2f(qc.x, (512.0 + qc.y * 512.0) / ATLAS_H);
  let v: f32 = textureSampleLevel(atlasTex, atlasSmp, a, 0.0).r;
  return (0.5 - v) * 2.0 * MAPRAD / ATLAS_W + length((q - qc) * vec2f(1.0, 0.5));
}

/* ── World land (equirectangular) ──
   ll = (lon, lat) in degrees → signed distance in map-width units
   (1.0 = 360°), negative on land. */
fn worldD(ll: vec2f) -> f32 {
  let qx: f32 = fract(ll.x / 360.0 + 0.5);
  let qy: f32 = clamp(0.5 - ll.y / 180.0, 0.0, 1.0);
  let ay: f32 = clamp(1024.0 + qy * 512.0, 1024.5, 1535.5) / ATLAS_H;
  let v: f32 = textureSampleLevel(atlasTex, atlasSmp, vec2f(qx, ay), 0.0).r;
  return (0.5 - v) * 2.0 * WORLDRAD / ATLAS_W;
}
/* Unit-sphere direction (y up, z toward lon 0 / lat 0) → (lon, lat) degrees. */
fn lonLat(n: vec3f) -> vec2f {
  return vec2f(atan2(n.x, n.z), asin(clamp(n.y, -1.0, 1.0))) * (180.0 / PI);
}
fn sphereDir(ll: vec2f) -> vec3f {
  let r: vec2f = ll * (PI / 180.0);
  return vec3f(cos(r.y) * sin(r.x), sin(r.y), cos(r.y) * cos(r.x));
}

/* ── Brand marks (256 px cells; slot 0 ZEN, 1 BGC, 2 NEAR, 3–7 registered) ──
   q cell-local 0..1 (y down) → signed distance in cell units, negative inside. */
fn logoD(slot: i32, q: vec2f) -> f32 {
  let qc: vec2f = clamp(q, vec2f(0.0), vec2f(1.0));
  let sl: i32 = clamp(slot, 0, 7);
  let cx: f32 = f32(sl % 4);
  let cy: f32 = f32(sl / 4);
  let a: vec2f = vec2f((cx + qc.x) * LCELL / ATLAS_W, (1536.0 + (cy + qc.y) * LCELL) / ATLAS_H);
  let v: f32 = textureSampleLevel(atlasTex, atlasSmp, a, 0.0).r;
  return (0.5 - v) * 2.0 * LOGORAD / LCELL + length(q - qc);
}
/* Mark distance in p-units: centre c, cell size s (p-units). */
fn logoDist(slot: i32, p: vec2f, c: vec2f, s: f32) -> f32 {
  let q: vec2f = vec2f((p.x - c.x) / s + 0.5, (c.y - p.y) / s + 0.5);
  return logoD(slot, q) * s;
}
/* Mark coverage; 0 everywhere when slot < 0 (no mark). */
fn logoCov(slot: i32, p: vec2f, c: vec2f, s: f32) -> f32 {
  return saturate(0.5 - logoDist(slot, p, c, s) / pxs()) * select(0.0, 1.0, slot >= 0);
}

/* A security seal of radius r around a brand mark: twin rings around a
   counter-turning guilloche band. slot < 0 leaves the centre empty.
   Returns (ink coverage, glow). */
fn brandSeal(p: vec2f, c: vec2f, r: f32, slot: i32) -> vec2f {
  let d: vec2f = p - c;
  let rr: f32 = length(d);
  let a: f32 = atan2(d.y, d.x);
  let px: f32 = pxs();
  let rings: f32 = lineCov(abs(rr - r) / px, 0.6) + lineCov(abs(rr - r * 0.8) / px, 0.35);
  let w1: f32 = r * 0.9 + r * 0.045 * sin(a * 18.0 + tnow() * 0.25);
  let w2: f32 = r * 0.9 + r * 0.045 * sin(a * 18.0 + PI - tnow() * 0.25);
  let guil: f32 = (lineCov(abs(rr - w1) / px, 0.3) + lineCov(abs(rr - w2) / px, 0.3)) * step(rr, r);
  let mark: f32 = logoCov(slot, p, c, r * 1.12);
  let glow: f32 = exp(-max(rr - r, 0.0) / (r * 0.35)) * 0.22;
  return vec2f(saturate(rings + guil * 0.7 + mark), glow);
}
fn zenSeal(p: vec2f, c: vec2f, r: f32) -> vec2f { return brandSeal(p, c, r, LOGO_ZEN); }
/* An issuer stamp in the plate's lower-right corner. */
fn brandStamp(p: vec2f, slot: i32) -> vec3f {
  let s: vec2f = brandSeal(p, vec2f(aspect() * 0.5 - 0.085, -0.37), 0.046, slot);
  let foil: vec3f = mix(silver(), holo(foilPhase(p, 2.0) + 0.2), 0.5);
  return foil * s.x * 0.85 + u.accent.rgb * s.y;
}
fn zenStamp(p: vec2f) -> vec3f { return brandStamp(p, LOGO_ZEN); }

/* ── Security-print ornaments ── */

/* Guilloche rosette: n interlaced sinusoidal strands around radius r0
   (amplitude amp, \`lobes\` whole waves per turn), each a hairline of
   half-width hw px, phase-shifted by ph. Line width stays even on steep
   flanks (the radial distance is slope-corrected). */
fn rosette(p: vec2f, c: vec2f, r0: f32, amp: f32, lobes: f32, n: i32, hw: f32, ph: f32) -> f32 {
  let d: vec2f = p - c;
  let r: f32 = length(d);
  let a: f32 = atan2(d.y, d.x);
  var acc: f32 = 0.0;
  for (var k: i32 = 0; k < n; k++) {
    let s: f32 = lobes * a + f32(k) / f32(max(n, 1)) * TAU + ph;
    let rr: f32 = r0 + amp * sin(s);
    // Slope-corrected radial distance (bounded, so it stays sane far off the curve).
    let slope: f32 = amp * lobes * cos(s) / max(r, r0 * 0.5);
    acc += lineCov(abs(r - rr) / sqrt(1.0 + min(slope * slope, 64.0)) / pxs(), hw);
  }
  return saturate(acc);
}
/* A guilloche band: n strands weaving between radii r0 and r1. */
fn guillocheBand(p: vec2f, c: vec2f, r0: f32, r1: f32, lobes: f32, n: i32, hw: f32, ph: f32) -> f32 {
  return rosette(p, c, (r0 + r1) * 0.5, (r1 - r0) * 0.5, lobes, n, hw, ph);
}
/* Banknote sunburst: n engraved rays from c, tone 0..1. */
fn sunburst(p: vec2f, c: vec2f, n: f32, tone: f32, ph: f32) -> f32 {
  let d: vec2f = p - c;
  let r: f32 = max(length(d), 1e-4);
  let s: f32 = (atan2(d.y, d.x) / TAU + 0.5) * n + ph;
  return engraveP(s, 1.0, tone, pxs() * n / (TAU * r));
}
/* Distance from p to the plate's edge (positive inside). */
fn edgeDist(p: vec2f) -> f32 { return min(aspect() * 0.5 - abs(p.x), 0.5 - abs(p.y)); }
/* An engraved double keyline \`inset\` in from the plate edge. */
fn plateFrame(p: vec2f, inset: f32) -> f32 {
  let ed: f32 = edgeDist(p);
  return lineCov(abs(ed - inset) / pxs(), 0.45) + lineCov(abs(ed - inset - 0.009) / pxs(), 0.28) * 0.75;
}
/* Corner rosettes for a frame \`inset\` in from the edge: (coverage). */
fn frameCorners(p: vec2f, inset: f32, r: f32) -> f32 {
  let c: vec2f = vec2f(aspect() * 0.5 - inset, 0.5 - inset);
  let q: vec2f = abs(p);
  return rosette(q, c, r * 0.62, r * 0.3, 7.0, 3, 0.3, tnow() * 0.15) * step(length(q - c), r * 1.05);
}
`;

/** Dark plate: engraved navy substrate, minting intro, sheen, filmic. */
export const POST_PLATE = /* wgsl */ `
fn substrate(uv: vec2f, p: vec2f) -> vec3f {
  let base: vec3f = mix(vec3f(0.020, 0.026, 0.044), vec3f(0.040, 0.052, 0.086), ease(1.0 - uv.y * 0.9));
  let c: vec2f = p - vec2f(-0.35 * aspect(), 0.62);
  let r: f32 = length(c);
  let a: f32 = atan2(c.y, c.x);
  let g: f32 = sin(r * 180.0 + sin(a * 11.0 + r * 9.0) * 2.4);
  let guil: f32 = sstep(0.86, 1.0, g) * 0.016 * (1.0 - sstep(0.2, 1.4, r));
  return base + mix(u.accent.rgb, silver(), 0.5) * guil;
}

fn shade(px: vec2f) -> vec4f {
  let uv: vec2f = px / u.res.xy;
  let p: vec2f = vec2f((px.x - 0.5 * u.res.x) / u.res.y, (0.5 * u.res.y - px.y) / u.res.y);
  let light: vec3f = max(scene(uv, p), vec3f(0.0));

  let k: f32 = u.time.w;
  let front: f32 = k * 1.4 - 0.2;
  let diag: f32 = uv.x * 0.72 + (1.0 - uv.y) * 0.28;
  let reveal: f32 = sstep(front + 0.05, front - 0.05, diag);
  let edge: f32 = exp(-abs(diag - front) * 34.0) * (1.0 - k);

  var c: vec3f = substrate(uv, p) + light * reveal + holo(diag * 2.2 + k) * edge * 0.28;

  let dir: vec2f = normalize(vec2f(0.84, 0.54));
  let off: f32 = u.tilt.x * 0.42 + u.tilt.y * 0.22 + sin(tnow() * 0.17) * 0.12;
  let sd: f32 = dot(uv - 0.5, dir) - off;
  let band: f32 = exp(-sd * sd * 24.0);
  c += holo(sd * 1.6 + 0.3) * band * (0.022 + 0.05 * u.mouse.z);

  let v: vec2f = uv - 0.5;
  c *= 1.0 - dot(v, v) * 0.62;
  c = vec3f(1.0) - exp(-c * 1.32);
  c += vec3f((h21(px + vec2f(fract(tnow() * 13.7) * 211.0, 0.0)) - 0.5) / 255.0);
  return vec4f(sat3(c), 1.0);
}
`;

/**
 * Light security paper: the scene's light is printed as ink. Density comes
 * from its brightness, the ink takes a deep version of its hue, and the foil
 * shows as an iridescent sheen across the printed areas.
 */
export const POST_PAPER = /* wgsl */ `
fn paperBase(uv: vec2f, p: vec2f) -> vec3f {
  var base: vec3f = mix(vec3f(0.980, 0.975, 0.958), vec3f(0.950, 0.944, 0.924), ease(uv.y * 0.9 + 0.05));
  // Security fibres: sparse short threads in the paper.
  let fq: vec2f = rot2(0.7) * p * vec2f(26.0, 260.0);
  let fh: f32 = h21(floor(fq) + vec2f(17.0, 3.0));
  let fib: f32 = step(0.985, fh) * (1.0 - abs(fract(fq.y) - 0.5) * 2.0);
  base -= vec3f(0.02, 0.012, 0.0) * fib + mix(u.accent.rgb, vec3f(0.6, 0.2, 0.3), 0.5) * fib * 0.04 * step(0.993, fh);
  // Faint guilloche watermark.
  let c: vec2f = p - vec2f(-0.35 * aspect(), 0.62);
  let r: f32 = length(c);
  let a: f32 = atan2(c.y, c.x);
  let g: f32 = sin(r * 180.0 + sin(a * 11.0 + r * 9.0) * 2.4);
  let guil: f32 = sstep(0.86, 1.0, g) * 0.05 * (1.0 - sstep(0.2, 1.4, r));
  return base - (vec3f(1.0) - mix(u.accent.rgb, vec3f(0.45, 0.5, 0.6), 0.5)) * guil * 0.6;
}

fn shade(px: vec2f) -> vec4f {
  let uv: vec2f = px / u.res.xy;
  let p: vec2f = vec2f((px.x - 0.5 * u.res.x) / u.res.y, (0.5 * u.res.y - px.y) / u.res.y);
  let light: vec3f = max(scene(uv, p), vec3f(0.0));

  let k: f32 = u.time.w;
  let front: f32 = k * 1.4 - 0.2;
  let diag: f32 = uv.x * 0.72 + (1.0 - uv.y) * 0.28;
  let reveal: f32 = sstep(front + 0.05, front - 0.05, diag);
  let edge: f32 = exp(-abs(diag - front) * 34.0) * (1.0 - k);

  let L: vec3f = light * reveal;
  let m: f32 = max(max(L.r, L.g), L.b);
  let hue: vec3f = L / max(m, 1e-3);
  // Hairlines print crisp; glows become the faintest wash.
  let dens: f32 = saturate(1.0 - exp(-m * m * 3.2 - m * 0.9));
  let deep: vec3f = mix(vec3f(0.05, 0.07, 0.13), hue * vec3f(0.36, 0.34, 0.38), 0.66);
  let ink: vec3f = mix(deep, u.accent.rgb * 0.42, 0.18);
  var c: vec3f = mix(paperBase(uv, p), ink, dens * 0.93);

  // Foil: an iridescent sheen over the printed areas, shifting with tilt.
  let dir: vec2f = normalize(vec2f(0.84, 0.54));
  let off: f32 = u.tilt.x * 0.42 + u.tilt.y * 0.22 + sin(tnow() * 0.17) * 0.12;
  let sd: f32 = dot(uv - 0.5, dir) - off;
  let band: f32 = exp(-sd * sd * 18.0);
  let foil: vec3f = holo(sd * 1.6 + 0.3 + foilPhase(p, 1.2) * 0.3);
  c = mix(c, foil * 0.72, saturate(dens * band * (0.32 + 0.3 * u.mouse.z)));
  c = mix(c, holo(diag * 2.2 + k) * 0.8, edge * 0.35);

  let v: vec2f = uv - 0.5;
  c *= 1.0 - dot(v, v) * 0.16;
  c += vec3f((h21(px + vec2f(fract(tnow() * 13.7) * 211.0, 0.0)) - 0.5) / 255.0);
  return vec4f(sat3(c), 1.0);
}
`;

/**
 * Clear: the engraving alone, as light over whatever is behind the canvas
 * (premultiplied alpha). For dark sections, photos and video.
 */
export const POST_CLEAR = /* wgsl */ `
fn shade(px: vec2f) -> vec4f {
  let uv: vec2f = px / u.res.xy;
  let p: vec2f = vec2f((px.x - 0.5 * u.res.x) / u.res.y, (0.5 * u.res.y - px.y) / u.res.y);
  let light: vec3f = max(scene(uv, p), vec3f(0.0));

  let k: f32 = u.time.w;
  let front: f32 = k * 1.4 - 0.2;
  let diag: f32 = uv.x * 0.72 + (1.0 - uv.y) * 0.28;
  let reveal: f32 = sstep(front + 0.05, front - 0.05, diag);
  let edge: f32 = exp(-abs(diag - front) * 34.0) * (1.0 - k);

  var c: vec3f = light * reveal;
  let dir: vec2f = normalize(vec2f(0.84, 0.54));
  let off: f32 = u.tilt.x * 0.42 + u.tilt.y * 0.22 + sin(tnow() * 0.17) * 0.12;
  let sd: f32 = dot(uv - 0.5, dir) - off;
  let band: f32 = exp(-sd * sd * 24.0);
  c += holo(sd * 1.6 + 0.3) * band * saturate(luma(c) * 3.0) * (0.08 + 0.1 * u.mouse.z);
  c = vec3f(1.0) - exp(-c * 1.32);
  c += holo(diag * 2.2 + k) * edge * 0.28 * saturate(luma(c) * 4.0 + 0.15);
  let a: f32 = saturate(max(max(c.r, c.g), c.b) * 1.1);
  let n: f32 = (h21(px + vec2f(fract(tnow() * 7.3) * 97.0, 0.0)) - 0.5) / 255.0;
  return vec4f(clamp(c + vec3f(n * a), vec3f(0.0), vec3f(a)), a);
}
`;

/** Pass-through post for full-page fields and stages: scene() is the final colour. */
export const POST_RAW = /* wgsl */ `
fn shade(px: vec2f) -> vec4f {
  let uv: vec2f = px / u.res.xy;
  let p: vec2f = vec2f((px.x - 0.5 * u.res.x) / u.res.y, (0.5 * u.res.y - px.y) / u.res.y);
  var c: vec3f = scene(uv, p);
  c += vec3f((h21(px + vec2f(fract(tnow() * 7.3) * 97.0, 0.0)) - 0.5) / 255.0);
  return vec4f(sat3(c), 1.0);
}
`;

/**
 * Transparent post for floating artifacts: scene() returns premultiplied
 * RGBA and the canvas composites over the page.
 */
export const POST_ALPHA = /* wgsl */ `
fn shade(px: vec2f) -> vec4f {
  let uv: vec2f = px / u.res.xy;
  let p: vec2f = vec2f((px.x - 0.5 * u.res.x) / u.res.y, (0.5 * u.res.y - px.y) / u.res.y);
  let c: vec4f = scene(uv, p);
  let a: f32 = saturate(c.a);
  let n: f32 = (h21(px + vec2f(fract(tnow() * 7.3) * 97.0, 0.0)) - 0.5) / 255.0;
  return vec4f(clamp(c.rgb + vec3f(n * a), vec3f(0.0), vec3f(a)), a);
}
`;

export function postCode(post: string) {
  switch (post) {
    case "raw":
      return POST_RAW;
    case "alpha":
      return POST_ALPHA;
    case "paper":
      return POST_PAPER;
    case "clear":
      return POST_CLEAR;
    default:
      return POST_PLATE;
  }
}

/** Posts whose canvas carries transparency. */
export function postIsTransparent(post: string) {
  return post === "alpha" || post === "clear";
}

export const WGSL_ENTRY = /* wgsl */ `
@vertex fn vsMain(@builtin(vertex_index) vi: u32) -> @builtin(position) vec4f {
  let x: f32 = f32((vi << 1u) & 2u);
  let y: f32 = f32(vi & 2u);
  return vec4f(x * 2.0 - 1.0, y * 2.0 - 1.0, 0.0, 1.0);
}
@fragment fn fsMain(@builtin(position) fc: vec4f) -> @location(0) vec4f { return shade(fc.xy); }
`;

export const GLSL_VERTEX = /* glsl */ `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}
`;

export const GLSL_MAIN = /* glsl */ `
void main() { fragColor = shade(vec2(gl_FragCoord.x, u.res.y - gl_FragCoord.y)); }
`;
