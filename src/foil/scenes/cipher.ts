import { layoutText } from "../atlas";
import type { FoilScene } from "../types";

const TEXT = layoutText(
  {
    plain: "PATIENT RECORD 0472",
    lp: "PLAINTEXT",
    lc: "CIPHERTEXT",
    lk: "KEY",
    micro: "CLINICALCIPHER · ENCRYPT · DECODE · CLINICAL WORKFLOWS WITH PRECISION · ",
  },
  0,
);
const T = TEXT.at;

/**
 * ClinicalCipher — encrypt, decode and manage clinical workflows.
 * An engraved Alberti cipher disk. The inner ring is the key: as it turns,
 * the record on the right is re-encrypted with exactly that shift.
 */
export const cipher: FoilScene = {
  id: "cipher",
  still: 4.4,
  data(d) {
    TEXT.write(d);
  },
  code: /* wgsl */ `
const DC: vec2f = vec2f(-0.3, -0.01);

fn keyShift(k: f32) -> f32 {
  let v: f32 = k * 7.0 + 3.0;
  return v - 26.0 * floor(v / 26.0);
}

/* One letter ring: slot coordinate s (letters at integer slots), radial band. */
fn ringGlyph(p: vec2f, rIn: f32, rOut: f32, rot: f32) -> f32 {
  let d: vec2f = p - DC;
  let r: f32 = length(d);
  let a: f32 = atan2(d.x, d.y);
  let s: f32 = fract(a / TAU + 1.0) * 26.0 + rot;
  let j: i32 = i32(floor(s)) % 26;
  let h: f32 = rOut - rIn;
  let arc: f32 = TAU * r / 26.0;
  let q: vec2f = vec2f(0.5 + (fract(s) - 0.5) * arc / h, (rOut - r) / h);
  let inside: bool = (r > rIn) && (r < rOut);
  return select(0.0, glyphCov(33 + j, q, h, 0.0), inside);
}

fn scene(uv: vec2f, p: vec2f) -> vec3f {
  let t: f32 = tnow();
  let key: f32 = floor(t / 3.2);
  let k: f32 = fract(t / 3.2);
  let s0: f32 = keyShift(key - 1.0);
  let s1: f32 = keyShift(key);
  let delta: f32 = s1 - s0 - 26.0 * floor((s1 - s0) / 26.0);
  let turning: f32 = ease(k / 0.28);
  let rot: f32 = s0 + delta * turning;
  let shift: i32 = i32(s1 + 0.5);

  let d: vec2f = p - DC;
  let r: f32 = length(d);
  let a: f32 = atan2(d.x, d.y);

  let outer: f32 = ringGlyph(p, 0.292, 0.352, 0.0);
  let inner: f32 = ringGlyph(p, 0.218, 0.278, rot);
  let rims: f32 = stroke(r - 0.36, 0.8) + stroke(r - 0.288, 0.5) + stroke(r - 0.282, 0.5) + stroke(r - 0.212, 0.8) + stroke(r - 0.368, 0.35);
  let sep: f32 = fract(a / TAU * 26.0 + 0.5);
  let ticks: f32 = stroke(min(sep, 1.0 - sep) * TAU * r / 26.0, 0.35) * step(0.288, r) * step(r, 0.36);
  let sepIn: f32 = fract(a / TAU * 26.0 + 0.5 + rot);
  let ticksIn: f32 = stroke(min(sepIn, 1.0 - sepIn) * TAU * r / 26.0, 0.35) * step(0.212, r) * step(r, 0.282);
  let knurl: f32 = stroke(r - 0.392, 1.6) * step(0.55, fract(a / TAU * 120.0)) * 0.7;

  // Guilloche rosette and the medical cross at the hub.
  var rosette: f32 = 0.0;
  for (var i: i32 = 0; i < 7; i++) {
    let fi: f32 = f32(i);
    let rr: f32 = 0.13 + 0.035 * sin(a * 9.0 + fi * 0.9 + rot * 0.24) + fi * 0.006;
    rosette += stroke(r - rr, 0.35);
  }
  rosette *= step(r, 0.205);
  let crossD: f32 = min(sdBox(d, vec2f(0.022, 0.065)), sdBox(d, vec2f(0.065, 0.022)));
  let crossInk: f32 = stroke(crossD, 0.7) + fillAA(crossD) * engrave(d.x + d.y, 0.0065, 0.35);
  let hub: f32 = fillAA(crossD) * 0.15;

  // Index pointer at twelve o'clock.
  let tri: vec2f = p - DC - vec2f(0.0, 0.405);
  let pointer: f32 = fillAA(max(abs(tri.x) * 1.4 + tri.y * 0.8, -tri.y - 0.02) - 0.0);

  // Record panel: plaintext, and ciphertext encrypted with the live key.
  let px0: f32 = 0.16;
  let size: f32 = 0.034;
  let adv: f32 = size * 0.6;
  let plain: f32 = textRun(p, vec2f(px0, 0.215), size, ${T.plain.start}, ${T.plain.count}, 0.0);
  let lx: f32 = (p.x - px0) / adv;
  let ly: f32 = (0.065 - p.y) / size;
  let ci: i32 = i32(floor(lx));
  let inRow: bool = (lx >= 0.0) && (ly >= 0.0) && (ly <= 1.0) && (ci < ${T.plain.count});
  let pc: i32 = charAt(${T.plain.start} + clamp(ci, 0, ${T.plain.count - 1}));
  let isLetter: bool = (pc >= 33) && (pc <= 58);
  let enc: i32 = select(pc, 33 + ((pc - 33 + shift) % 26), isLetter);
  let scr: bool = (turning < 0.999) && (h21(vec2f(f32(ci), floor(t * 18.0))) < (1.0 - turning)) && isLetter;
  let shown: i32 = select(enc, 33 + i32(h21(vec2f(f32(ci) + 7.0, floor(t * 22.0))) * 26.0), scr);
  let cq: vec2f = vec2f((fract(lx) - 0.5) * 0.6 + 0.5, ly);
  let cipherRow: f32 = select(0.0, glyphCov(shown, cq, size, 0.0), inRow && (pc > 0));

  let labels: f32 = textRun(p, vec2f(px0, 0.275), 0.016, ${T.lp.start}, ${T.lp.count}, 0.0)
    + textRun(p, vec2f(px0, 0.125), 0.016, ${T.lc.start}, ${T.lc.count}, 0.0)
    + textRun(p, vec2f(px0, -0.07), 0.016, ${T.lk.start}, ${T.lk.count}, 0.0);
  let keyD: f32 = digitCov(p, vec2f(px0, -0.095), 0.062, shift / 10, 0.0) + digitCov(p, vec2f(px0 + 0.038, -0.095), 0.062, shift % 10, 0.0);
  let link: f32 = stroke(p.y - 0.1, 0.35) * step(px0, p.x) * step(p.x, px0 + 0.4) * 0.5;
  let micro: f32 = textLoop(p, -0.465, 0.015, ${T.micro.start}, ${T.micro.count}, t * 0.01, 0.0);

  let ink: vec3f = inkCol(p, 1.4);
  let keyCol: vec3f = mix(u.accent.rgb, vec3f(1.0), 0.35);
  var c: vec3f = ink * (rims * 0.75 + ticks * 0.5 + ticksIn * 0.5 + knurl * 0.5 + rosette * 0.55 + link);
  c += silver() * outer * 0.85 + keyCol * inner * (0.85 + 0.4 * (1.0 - turning));
  c += mix(ink, vec3f(1.0, 0.5, 0.5), 0.5) * crossInk * 0.9 + vec3f(1.0, 0.45, 0.45) * hub;
  c += keyCol * pointer + silver() * (plain * 0.85 + labels * 0.55 + keyD * 0.8);
  c += holo(foilPhase(p, 2.0) + f32(shift) * 0.04) * cipherRow * 1.1;
  c += ink * micro * 0.4;
  return c;
}
`,
};
