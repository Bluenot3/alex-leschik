import { layoutText } from "../atlas";
import type { FoilScene } from "../types";

/* Real ICD-10-CM codes, 8-char code column + 22-char descriptor. */
const ROWS = [
  ["I10", "ESSENTIAL HYPERTENSION"],
  ["E11.9", "TYPE 2 DIABETES"],
  ["J45.909", "ASTHMA, UNCOMPLICATED"],
  ["R07.9", "CHEST PAIN, UNSPEC."],
  ["Z00.00", "ADULT GENERAL EXAM"],
  ["K21.9", "GERD W/O ESOPHAGITIS"],
  ["F41.1", "GENERALIZED ANXIETY"],
  ["N39.0", "UTI, SITE NOT SPEC."],
]
  .map(([code, desc]) => code.padEnd(8, " ") + desc.padEnd(22, " ").slice(0, 22))
  .join("");

const TEXT = layoutText(
  {
    rows: ROWS,
    head: "ICD-10-CM LOOKUP",
    lock: "AES-256",
    bpm: "BPM",
    micro: "MEDCODE · INTELLIGENT CODE LOOKUP · ENCRYPTED WORKFLOWS · HIPAA-MINDED · ",
  },
  0,
);
const T = TEXT.at;

/**
 * MedCode — medical coding platform.
 * A phosphor ECG sweep on engraved ECG paper drives an ICD-10-CM lookup:
 * each pair of beats selects the next code, behind an encryption seal.
 */
export const medcode: FoilScene = {
  id: "medcode",
  still: 3.1,
  data(d) {
    TEXT.write(d);
  },
  code: /* wgsl */ `
fn ecg(tau: f32) -> f32 {
  let f: f32 = fract(tau / 0.8333);
  let pw: f32 = 0.09 * exp(-pow((f - 0.12) / 0.03, 2.0));
  let qw: f32 = -0.08 * exp(-pow((f - 0.232) / 0.012, 2.0));
  let rw: f32 = 0.66 * exp(-pow((f - 0.255) / 0.0145, 2.0));
  let sw: f32 = -0.18 * exp(-pow((f - 0.28) / 0.014, 2.0));
  let tw: f32 = 0.17 * exp(-pow((f - 0.47) / 0.05, 2.0));
  return pw + qw + rw + sw + tw;
}

/* Trace height at x: the head writes left→right, older ink is one sweep back. */
fn traceAt(x: f32, t: f32, hx: f32, left: f32, width: f32, sweepT: f32) -> vec2f {
  var behind: f32 = hx - x;
  behind = select(behind + width, behind, behind >= 0.0);
  let tau: f32 = t - behind / width * sweepT;
  return vec2f(x, -0.07 + ecg(tau) * 0.42);
}

fn sdHeart(q: vec2f) -> f32 {
  let r: vec2f = vec2f(abs(q.x), q.y);
  let a: f32 = length(r - vec2f(0.25, 0.75)) - 0.35355339;
  let m: f32 = 0.5 * max(r.x + r.y, 0.0);
  let b: f32 = sqrt(min(dot(r - vec2f(0.0, 1.0), r - vec2f(0.0, 1.0)), dot(r - vec2f(m), r - vec2f(m)))) * sign(r.x - r.y);
  return select(b, a, r.y + r.x > 1.0);
}

fn scene(uv: vec2f, p: vec2f) -> vec3f {
  let t: f32 = tnow();
  let left: f32 = -aspect() * 0.5 + 0.05;
  let right: f32 = 0.07;
  let width: f32 = right - left;
  let base: f32 = -0.07;
  let inPanel: f32 = step(left, p.x) * step(p.x, right) * step(-0.36, p.y) * step(p.y, 0.3);

  // ECG paper: 1 mm / 5 mm engraved grid.
  let gx: f32 = p.x - left;
  let gy: f32 = p.y + 0.36;
  let minor: f32 = max(engraveP(gx, 0.022, 0.05, pxs()), engraveP(gy, 0.022, 0.05, pxs()));
  let major: f32 = max(engraveP(gx, 0.11, 0.025, pxs()), engraveP(gy, 0.11, 0.025, pxs()));
  let paper: f32 = (minor * 0.35 + major * 0.8) * inPanel;

  // Sweep: the head writes left→right; older ink decays, a gap erases ahead.
  let sweepT: f32 = 3.6;
  let hx: f32 = left + fract(t / sweepT) * width;
  var behind: f32 = hx - p.x;
  behind = select(behind + width, behind, behind >= 0.0);
  // True distance to the sampled polyline: stays a hairline on the steep QRS.
  let hpx: f32 = pxs() * 1.25;
  var dist: f32 = 1e9;
  var prev: vec2f = traceAt(p.x - 2.0 * hpx, t, hx, left, width, sweepT);
  for (var k: i32 = -1; k <= 2; k++) {
    let cur: vec2f = traceAt(p.x + f32(k) * hpx, t, hx, left, width, sweepT);
    dist = min(dist, sdSeg(p, prev, cur));
    prev = cur;
  }
  let age: f32 = behind / width;
  let phosphor: f32 = exp(-age * 2.6) * sstep(0.0, 0.035, behind);
  let trace: f32 = (stroke(dist, 0.9) + halo(dist, 140.0) * 0.4) * phosphor * inPanel;
  let headY: f32 = base + ecg(t) * 0.42;
  let head: f32 = exp(-length(p - vec2f(hx, headY)) * 120.0) + fillAA(length(p - vec2f(hx, headY)) - 0.005);
  let frame: f32 = stroke(sdBox(p - vec2f((left + right) * 0.5, -0.03), vec2f(width * 0.5, 0.33)), 0.6);

  // Beat-synchronised heart + readout.
  let beat: f32 = exp(-fract(t / 0.8333 - 0.255) * 9.0);
  let hs: f32 = 0.034 * (1.0 + beat * 0.22);
  let heart: f32 = fillAA(sdHeart((p - vec2f(left + 0.045, 0.218)) / hs) * hs);
  let bpmD: f32 = digitCov(p, vec2f(left + 0.08, 0.265), 0.056, 7, 0.0) + digitCov(p, vec2f(left + 0.1136, 0.265), 0.056, 2, 0.0)
    + textRun(p, vec2f(left + 0.153, 0.236), 0.016, ${T.bpm.start}, ${T.bpm.count}, 0.0);

  // Lookup table: two beats per code.
  let cx: f32 = 0.13;
  let activeRow: f32 = floor(t / 1.6667 + 0.0001) - 8.0 * floor(t / 13.3336);
  var table: f32 = 0.0;
  var hot: f32 = 0.0;
  for (var i: i32 = 0; i < 8; i++) {
    let y: f32 = 0.22 - f32(i) * 0.072;
    let on: f32 = 1.0 - step(0.5, abs(f32(i) - activeRow));
    let row: f32 = textRun(p, vec2f(cx, y), 0.0185, ${T.rows.start} + i * 30, 30, select(0.0, 0.25, on > 0.5));
    table += row * (1.0 - on) * 0.55;
    hot += row * on;
  }
  let selY: f32 = 0.22 - activeRow * 0.072 - 0.0095;
  let sel: f32 = stroke(sdRoundBox(p - vec2f(cx + 0.17, selY), vec2f(0.19, 0.022), 0.008), 0.5);
  let selGlow: f32 = exp(-abs(p.y - selY) * 70.0) * step(cx - 0.02, p.x) * step(p.x, cx + 0.36) * 0.12;
  let rules: f32 = stroke(p.y - 0.268, 0.4) * step(cx, p.x) * step(p.x, aspect() * 0.5 - 0.05);
  let headLbl: f32 = textRun(p, vec2f(cx, 0.31), 0.017, ${T.head.start}, ${T.head.count}, 0.0);

  // Encryption seal: padlock + cipher label.
  let lp: vec2f = p - vec2f(aspect() * 0.5 - 0.17, 0.295);
  let lockBody: f32 = sdRoundBox(lp, vec2f(0.016, 0.012), 0.003);
  let shackle: f32 = abs(length((lp - vec2f(0.0, 0.012)) * vec2f(1.0, 0.9)) - 0.011) - 0.0025;
  let lock: f32 = fillAA(lockBody) + fillAA(max(shackle, -(lp.y - 0.012)));
  let lockLbl: f32 = textRun(p, vec2f(aspect() * 0.5 - 0.145, 0.305), 0.015, ${T.lock.start}, ${T.lock.count}, 0.0);
  let micro: f32 = textLoop(p, -0.465, 0.015, ${T.micro.start}, ${T.micro.count}, t * 0.01, 0.0);

  let ink: vec3f = inkCol(p, 1.4);
  let phos: vec3f = mix(u.accent.rgb, vec3f(0.85, 1.0, 0.95), 0.35);
  var c: vec3f = ink * (paper * 0.4 + frame * 0.6 + rules * 0.4);
  c += phos * trace * 1.15 + vec3f(1.0) * head;
  c += vec3f(1.0, 0.45, 0.48) * heart * (0.6 + beat * 0.6) + silver() * bpmD * 0.85;
  c += ink * table + mix(phos, vec3f(1.0), 0.4) * hot * (0.8 + beat * 0.3) + phos * (sel * 0.7 + selGlow);
  c += silver() * (headLbl * 0.7 + lock * 0.75 + lockLbl * 0.6) + ink * micro * 0.4;
  return c;
}
`,
};
