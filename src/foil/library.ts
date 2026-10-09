/**
 * Shared foil shader library, written in portable WGSL (see translate.ts).
 *
 * Coordinate contract for every scene:
 *   scene(uv, p) -> vec3f   additive light over the shared substrate
 *   uv  0..1, origin top-left (DOM orientation)
 *   p   aspect-correct, centred, y up; p.y ∈ [-0.5, 0.5]
 *
 * Derivative helpers (engrave, aaw) call fwidth and must stay in uniform
 * control flow: choose with select()/mix(), not per-pixel if/else.
 */

/** Uniform block layout — mirrored by UNIFORM_FLOATS in engine.ts. */
export const UNIFORM_VEC4S = 7 + 32;

export const WGSL_HEADER = /* wgsl */ `
struct Uniforms {
  res: vec4f,
  time: vec4f,
  mouse: vec4f,
  tilt: vec4f,
  accent: vec4f,
  p0: vec4f,
  p1: vec4f,
  d: array<vec4f, 32>,
};
@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var atlasTex: texture_2d<f32>;
@group(0) @binding(2) var atlasSmp: sampler;
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
  vec4 d[32];
} u;
uniform highp sampler2D atlasTex;
out vec4 fragColor;
`;

export const LIBRARY = /* wgsl */ `
const PI: f32 = 3.14159265;
const TAU: f32 = 6.28318531;
const ATLAS: f32 = 1024.0;
const GCELL: f32 = 64.0;
const GRAD: f32 = 10.0;
const MAPRAD: f32 = 48.0;

fn tnow() -> f32 { return u.time.x; }
fn pxs() -> f32 { return 1.0 / u.res.y; }
fn aspect() -> f32 { return u.res.x / u.res.y; }
fn hov() -> f32 { return u.mouse.z; }
fn pulse() -> f32 { return u.mouse.w; }
fn mouseP() -> vec2f { return vec2f((u.mouse.x - 0.5) * aspect(), 0.5 - u.mouse.y); }

fn rot2(a: f32) -> mat2x2f { let c: f32 = cos(a); let s: f32 = sin(a); return mat2x2f(c, s, -s, c); }
fn sat3(v: vec3f) -> vec3f { return clamp(v, vec3f(0.0), vec3f(1.0)); }
fn luma(c: vec3f) -> f32 { return dot(c, vec3f(0.299, 0.587, 0.114)); }
fn ease(x: f32) -> f32 { let t: f32 = saturate(x); return t * t * (3.0 - 2.0 * t); }
/* smoothstep that stays defined when a > b (GLSL/MSL leave that undefined). */
fn sstep(a: f32, b: f32, x: f32) -> f32 { return ease((x - a) / (b - a)); }

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

/* Static scene data: 2D points packed two per vec4 from vec4 index \`base\`. */
fn dPt(base: i32, i: i32) -> vec2f {
  let v: vec4f = u.d[base + i / 2];
  return select(v.zw, v.xy, (i % 2) == 0);
}

/* ── Signed-distance glyph atlas (DM Mono, 16 × 8 cells of 64 px) ── */
fn glyphD(code: i32, q: vec2f) -> f32 {
  let col: f32 = f32(code % 16);
  let row: f32 = f32(code / 16);
  let qc: vec2f = clamp(q, vec2f(0.0), vec2f(1.0));
  let a: vec2f = (vec2f(col, row) + qc) * (GCELL / ATLAS);
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
/* Monospace text run from u.d: start char index, count, top-left origin
   (p-space), cap size. Returns coverage. DM Mono advance ≈ 0.6 em. */
fn textRun(p: vec2f, origin: vec2f, size: f32, start: i32, count: i32, weight: f32) -> f32 {
  let adv: f32 = size * 0.6;
  let lx: f32 = (p.x - origin.x) / adv;
  let ly: f32 = (origin.y - p.y) / size;
  let idx: i32 = i32(floor(lx));
  let inside: bool = (lx >= 0.0) && (ly >= 0.0) && (ly <= 1.0) && (idx < count);
  let code: i32 = charAt(start + clamp(idx, 0, max(count - 1, 0)));
  let q: vec2f = vec2f((fract(lx) - 0.5) * 0.6 + 0.5, ly);
  return select(0.0, glyphCov(code, q, size, weight), inside && (code > 0));
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

/* ── Map silhouette region (contiguous U.S., Albers) ── */
fn mapD(q: vec2f) -> f32 {
  // q: map-local 0..1 (y down) → signed distance in map-width units, negative inside
  let qc: vec2f = clamp(q, vec2f(0.0), vec2f(1.0));
  let a: vec2f = vec2f(qc.x, 0.5 + qc.y * 0.5);
  let v: f32 = textureSampleLevel(atlasTex, atlasSmp, a, 0.0).r;
  return (0.5 - v) * 2.0 * MAPRAD / ATLAS + length((q - qc) * vec2f(1.0, 0.5));
}
`;

/**
 * Shared post pass: substrate, the "minting" intro sweep, view-dependent
 * sheen, vignette, filmic shoulder and dither.
 */
export const POST = /* wgsl */ `
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
