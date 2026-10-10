import { layoutText } from "../atlas";
import type { FoilScene } from "../types";

/* Microprint that occasionally resolves out of the cipher noise — the
   mottos already engraved on the page's dividers, plus the Great Seal's. */
export const FIELD_PHRASES = [
  "ORDO AB CHAO",
  "AS ABOVE, SO BELOW",
  "SOLVE ET COAGULA",
  "ANNUIT COEPTIS",
  "NOVUS ORDO SECLORUM",
  "THE EYE KEEPS RECORDS",
  "LET THERE BE LIGHT",
  "ZEN AI CO · MMXXVI",
];
const SLOT = 24;
/** Region slots written per frame by TreasuryField (u.d[0..7]). */
export const FIELD_REGIONS = 8;
const TEXT = layoutText({ phrases: FIELD_PHRASES.map((p) => p.padEnd(SLOT, " ").slice(0, SLOT)).join("") }, 64);


/**
 * The Treasury field — one GPU pass behind the whole page.
 *
 * Paints the page's own background, banknote guilloche watermarks drifting in
 * parallax, and three depths of cipher glyph runs that float, shimmer, catch
 * a holographic sheen and the pointer's light, and now and then decode into
 * microprint. Sections set the density through region slots.
 *
 * Uniforms: p0 = (scrollY, viewport w, viewport h, dpr) in CSS px;
 * p1 = (pointer x, pointer y, pointer active, fade-in);
 * d[0..7] = regions (top, bottom, alpha, shimmer rate) in viewport CSS px.
 */
export const field: FoilScene = {
  id: "field",
  post: "raw",
  still: 4.0,
  data(d) {
    TEXT.write(d);
  },
  code: /* wgsl */ `
fn fieldBase(uv: vec2f, vp: vec2f) -> vec3f {
  let c0: vec3f = vec3f(0.9725, 0.9804, 0.9882);
  let c1: vec3f = vec3f(0.9529, 0.9647, 0.9843);
  let c2: vec3f = vec3f(0.9686, 0.9686, 0.9569);
  var col: vec3f = select(mix(c1, c2, (uv.y - 0.42) / 0.58), mix(c0, c1, uv.y / 0.42), uv.y < 0.42);
  let pa: vec2f = (uv - vec2f(0.2, 0.2)) * vp;
  let fa: f32 = length(vec2f(0.8, 0.8) * vp);
  col = mix(col, vec3f(0.2856, 0.6757, 0.9544), 0.08 * saturate(1.0 - length(pa) / (0.26 * fa)));
  let pb: vec2f = (uv - vec2f(0.78, 0.12)) * vp;
  let fb: f32 = length(vec2f(0.78, 0.88) * vp);
  col = mix(col, vec3f(0.5376, 0.4152, 0.9048), 0.08 * saturate(1.0 - length(pb) / (0.24 * fb)));
  return col;
}

/* Section density at viewport y: (alpha, shimmer rate). */
fn regionAt(y: f32) -> vec2f {
  var a: f32 = 0.06;
  var rate: f32 = 0.9;
  for (var i: i32 = 0; i < ${FIELD_REGIONS}; i++) {
    let r: vec4f = u.d[i];
    let w: f32 = sstep(r.x - 50.0, r.x + 70.0, y) * (1.0 - sstep(r.y - 70.0, r.y + 50.0, y)) * r.z;
    rate = select(rate, r.w, w > a);
    a = max(a, w);
  }
  return vec2f(a, rate);
}

fn fieldInk(k: f32) -> vec3f {
  let i: i32 = i32(k * 7.0);
  if (i == 0) { return vec3f(0.41, 0.57, 0.82); }
  if (i == 1) { return vec3f(0.55, 0.45, 0.76); }
  if (i == 2) { return vec3f(0.82, 0.55, 0.35); }
  if (i == 3) { return vec3f(0.35, 0.67, 0.82); }
  if (i == 4) { return vec3f(0.51, 0.55, 0.65); }
  if (i == 5) { return vec3f(0.71, 0.39, 0.71); }
  return vec3f(0.37, 0.73, 0.63);
}

fn pickGlyph(h: f32, h2: f32) -> i32 {
  let ascii: i32 = 1 + i32(h2 * 93.99);
  let sym: i32 = 101 + i32(h2 * 9.99);
  let kana: i32 = 122 + i32(h2 * 5.99);
  return select(select(kana, sym, h < 0.93), ascii, h < 0.84);
}

/* One floating depth of cipher runs. Returns (coverage, ink index, flash, decode). */
fn glyphLayer(cp: vec2f, layer: i32, t: f32, scroll: f32, rate: f32, dpr: f32) -> vec4f {
  let fl: f32 = f32(layer);
  let cellH: f32 = select(select(23.0, 19.0, layer == 1), 15.5, layer == 0);
  let cellW: f32 = cellH * 0.58;
  let drift: f32 = select(select(10.0, -6.5, layer == 1), 4.0, layer == 0);
  let par: f32 = select(select(0.52, 0.33, layer == 1), 0.16, layer == 0);
  let q: vec2f = cp + vec2f(t * drift + fl * 311.0, scroll * par + fl * 173.0 + sin(t * 0.21 + fl * 2.1) * 7.0);
  let ci: vec2f = floor(q / vec2f(cellW, cellH));
  let f: vec2f = fract(q / vec2f(cellW, cellH));
  let blk: f32 = floor(ci.x / 24.0);
  let bx: f32 = ci.x - blk * 24.0;

  let hb: u32 = hashu(i32(blk) + layer * 7919, i32(ci.y));
  let h1: f32 = f32(hb >> 8u) * (1.0 / 16777216.0);
  let h2: f32 = f32(pcg(hb) >> 8u) * (1.0 / 16777216.0);
  let h3: f32 = f32(pcg(hb + 17u) >> 8u) * (1.0 / 16777216.0);
  let density: f32 = select(select(0.3, 0.42, layer == 1), 0.58, layer == 0);

  // Decoding: a few runs at a time resolve into microprint, then dissolve.
  let win: f32 = (t + h1 * 9.0) / 9.0;
  let pd: f32 = f32(hashu(i32(blk) * 31 + layer, i32(ci.y) + i32(floor(win)) * 977) >> 8u) * (1.0 / 16777216.0);
  // ~one phrase per viewport at a time, mid-depth only: an easter egg, not copy.
  let decoding: bool = (pd < 0.0035) && (layer == 1);
  let phrase: i32 = i32(h2 * 7.99);
  let lt: f32 = fract(win);
  let pcode: i32 = charAt(${TEXT.at.phrases.start} + phrase * ${SLOT} + i32(bx));
  let shownP: bool = (bx < lt * 70.0) && (lt < 0.86);

  let start: f32 = floor(h1 * 7.0);
  let len: f32 = 3.0 + floor(h2 * 14.0);
  let inRun: bool = (bx >= start) && (bx < start + len) && (h3 < density);

  let hc: u32 = hashu(i32(ci.x) + layer * 131, i32(ci.y) * 7 + 3);
  let hr: f32 = f32(hc >> 8u) * (1.0 / 16777216.0);
  let phase: f32 = t * rate * (0.45 + hr) + hr * 13.0;
  let tick: f32 = floor(phase);
  let hg: u32 = pcg(hc + u32(i32(tick) & 65535));
  let ga: f32 = f32(hg >> 8u) * (1.0 / 16777216.0);
  let gb: f32 = f32(pcg(hg) >> 8u) * (1.0 / 16777216.0);
  let rnd: i32 = pickGlyph(ga, gb);

  // While a run decodes, its block shows only the phrase (scrambling in).
  let phraseCell: bool = decoding && (pcode > 0);
  let code: i32 = select(select(0, rnd, inRun && !decoding), select(rnd, pcode, shownP), phraseCell);
  let qg: vec2f = vec2f(0.5 + (f.x - 0.5) * 0.58, f.y);
  let dpx: f32 = glyphD(code, qg) * cellH * dpr;
  let aaw: f32 = select(select(1.0, 1.25, layer == 1), 1.7, layer == 0);
  let cov: f32 = saturate(0.5 - dpx / aaw) * select(0.0, 1.0, code > 0);
  let flash: f32 = exp(-fract(phase) * 9.0) * 0.55;
  return vec4f(cov, h1, flash, select(0.0, 1.0, phraseCell && shownP));
}

fn rosette(cp: vec2f, c: vec2f, r0: f32, dpr: f32, t: f32) -> f32 {
  let d: vec2f = cp - c;
  let r: f32 = length(d);
  let a: f32 = atan2(d.y, d.x);
  var acc: f32 = 0.0;
  for (var k: i32 = 0; k < 9; k++) {
    let fk: f32 = f32(k);
    let rr: f32 = r0 + 26.0 * sin(12.0 * a + fk * 0.698 + t * 0.02) + 10.0 * sin(7.0 * a - fk * 1.3) + fk * 5.5;
    acc += saturate(0.85 - abs(r - rr) * dpr);
  }
  let ring: f32 = saturate(0.8 - abs(r - r0 - 92.0) * dpr) + saturate(0.8 - abs(r - r0 + 30.0) * dpr);
  return (acc + ring) * sstep(r0 + 150.0, r0 + 90.0, r) * sstep(r0 - 70.0, r0 - 30.0, r);
}

fn scene(uv: vec2f, p: vec2f) -> vec3f {
  let t: f32 = tnow();
  let scroll: f32 = u.p0.x;
  let vp: vec2f = vec2f(u.p0.y, u.p0.z);
  let dpr: f32 = u.p0.w;
  let cp: vec2f = uv * vp;
  let fade: f32 = u.p1.w;
  var col: vec3f = fieldBase(uv, vp);

  // Watermarks: a guilloche seal every ~1500 px of page (from below the hero),
  // alternating sides; the rosette math only runs near a seal.
  let wy: f32 = cp.y + scroll * 0.42 - 1150.0;
  let k: f32 = floor(wy / 1500.0 + 0.5);
  let side: f32 = select(0.86, 0.13, fract(k * 0.5) > 0.25);
  let wc: vec2f = vec2f(vp.x * side, 1150.0 + k * 1500.0 - scroll * 0.42);
  let wr: f32 = length(cp - wc);
  var seal: f32 = 0.0;
  if ((wr > 70.0) && (wr < 310.0) && (k >= 0.0)) {
    seal = rosette(cp, wc, 150.0, dpr, t);
  }
  let sealInk: vec3f = mix(vec3f(0.36, 0.45, 0.62), holo(dot(uv, vec2f(1.2, 0.8)) + t * 0.01) * 0.7, 0.35);
  col = mix(col, sealInk, saturate(seal) * 0.09 * fade);

  // Holographic sheen band + the pointer's light.
  let band: f32 = dot(uv - 0.5, normalize(vec2f(0.8, -0.6))) - (fract(t / 16.0) * 2.6 - 1.3);
  let sheen: f32 = exp(-band * band * 26.0);
  let ptr: vec2f = vec2f(u.p1.x, u.p1.y);
  let glint: f32 = exp(-length(cp - ptr) / 190.0) * u.p1.z;

  let reg: vec2f = regionAt(cp.y) * vec2f(sstep(0.0, 0.14, uv.x) * sstep(1.0, 0.86, uv.x), 1.0);
  for (var l: i32 = 0; l < 3; l++) {
    let g: vec4f = glyphLayer(cp, l, t, scroll, reg.y, dpr);
    let depth: f32 = select(select(1.0, 0.82, l == 1), 0.55, l == 0);
    let ink: vec3f = fieldInk(g.y);
    let hol: vec3f = holo(g.y * 3.0 + uv.x * 1.4 + t * 0.02) * 0.62;
    let lit: f32 = saturate(sheen * 0.85 + glint * 1.1 + g.w);
    let gcol: vec3f = mix(ink, hol, lit);
    let a: f32 = g.x * reg.x * depth * (0.62 + 0.38 * g.y) * (1.0 + g.z + glint * 0.8 + g.w * 0.6) * fade;
    col = mix(col, gcol, saturate(a));
  }
  return col;
}
`,
};
