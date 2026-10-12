import type { FoilScene } from "../../types";

/**
 * certificate — a security-printed credential.
 *
 * A twisted guilloche rope runs round all four edges between corner
 * rosettes, inside double keylines with microprint. The recipient's name
 * decodes in under the title, the program line sits beneath, and a gold
 * seal (your mark in a sunburst, ringed by the issuer's name) stamps the
 * foot between the date and the serial. Best in theme="paper" for a
 * printable look, or the default plate for a holographic digital badge.
 */
export const certificate: FoilScene = {
  id: "certificate",
  title: "Certificate",
  description: "Guilloche-bordered credential: title, recipient, program, date, serial and a gold seal. Paper or holographic.",
  aspect: 1.414,
  accent: "#c9a45c",
  still: 3.0,
  params: {
    mark: { type: "mark", num: 0, default: "zen", description: "Mark in the seal." },
    speed: { type: "number", num: 1, default: "1", min: 0, max: 4, description: "Animation speed." },
    headline: { type: "text", slot: 0, default: "CERTIFICATE OF ACHIEVEMENT", description: "Title line." },
    recipient: { type: "text", slot: 1, default: "RECIPIENT NAME", description: "Recipient's name." },
    program: { type: "text", slot: 2, default: "HAS COMPLETED THE AI LITERACY PROGRAM", description: "What was achieved." },
    date: { type: "text", slot: 3, default: "MMXXVI", description: "Date (left foot)." },
    serial: { type: "text", slot: 4, default: "ZEN-AIL-2026-00000", description: "Credential serial (right foot). Use the real ID; the default is a placeholder." },
    issuer: { type: "text", slot: 5, default: "ZEN AI CO", description: "Issuer, above the title and around the seal." },
    micro: { type: "text", slot: 6, default: "ZEN AI CO · VERIFIED CREDENTIAL · AI LITERACY · ", description: "Border microprint." },
    presented: { type: "text", slot: 7, default: "THIS CERTIFIES THAT", description: "Line above the name." },
  },
  code: /* wgsl */ `
/* A twisted rope in edge coordinates: s along the edge, dd across it (p-units). */
fn rope(s: f32, dd: f32, amp: f32, freq: f32, n: i32, ph: f32, hw: f32) -> f32 {
  var acc: f32 = 0.0;
  for (var k: i32 = 0; k < 10; k++) {
    if (k < n) {
      let a: f32 = s * freq + f32(k) / f32(n) * TAU + ph;
      let y: f32 = amp * sin(a);
      let slope: f32 = amp * freq * cos(a);
      acc += lineCov(abs(dd - y) / sqrt(1.0 + slope * slope) / pxs(), hw);
    }
  }
  return saturate(acc);
}

fn scene(uv: vec2f, p: vec2f) -> vec3f {
  let A: f32 = aspect();
  let t: f32 = tnow() * numParam(1);
  let px: f32 = pxs();
  let slot: i32 = i32(numParam(0));
  let hx: f32 = A * 0.5;
  let k: f32 = min(1.0, A / 1.25);

  // ── Border: keylines, ropes on all four edges, corner rosettes ──
  let e1: f32 = 0.068;
  let amp: f32 = 0.017;
  let fr: f32 = 62.0;
  let ph: f32 = t * 0.25;
  let topR: f32 = rope(p.x, p.y - (0.5 - e1), amp, fr, 7, ph, 0.28) * step(abs(p.x), hx - e1 - 0.03);
  let botR: f32 = rope(p.x, p.y + (0.5 - e1), amp, fr, 7, -ph, 0.28) * step(abs(p.x), hx - e1 - 0.03);
  let lefR: f32 = rope(p.y, p.x + (hx - e1), amp, fr, 7, ph, 0.28) * step(abs(p.y), 0.5 - e1 - 0.03);
  let rigR: f32 = rope(p.y, p.x - (hx - e1), amp, fr, 7, -ph, 0.28) * step(abs(p.y), 0.5 - e1 - 0.03);
  let ropes: f32 = saturate(topR + botR + lefR + rigR);
  let ed: f32 = edgeDist(p);
  let keys: f32 = lineCov(abs(ed - 0.03) / px, 0.55) + lineCov(abs(ed - 0.038) / px, 0.28) + lineCov(abs(ed - 0.098) / px, 0.4) + lineCov(abs(ed - 0.106) / px, 0.25);
  let cq: vec2f = abs(p);
  let cc: vec2f = vec2f(hx - e1, 0.5 - e1);
  let corner: f32 = (rosette(cq, cc, 0.026, 0.011, 8.0, 4, 0.3, t * 0.2) + lineCov(abs(length(cq - cc) - 0.04) / px, 0.4)) * step(length(cq - cc), 0.05);
  let microT: f32 = textLoopP(p, 0.5 - 0.107, 0.0115, 6, t * 0.01, 0.0) * step(abs(p.x), hx - 0.14);
  let microB: f32 = textLoopP(p, -0.5 + 0.118, 0.0115, 6, -t * 0.01, 0.0) * step(abs(p.x), hx - 0.14);

  // ── Ground: rainbow-print waves and a central rosette watermark ──
  let innerM: f32 = sstep(0.11, 0.14, ed);
  let wv: f32 = p.y + 0.012 * sin(p.x * 9.0 + t * 0.04) + 0.006 * sin(p.x * 23.0 - p.y * 5.0);
  let waves: f32 = engrave(wv, 0.0095, 0.07) * innerM;
  let water: f32 = (rosette(p, vec2f(0.0, 0.04), 0.27 * k, 0.07 * k, 18.0, 6, 0.25, t * 0.05) + rosette(p, vec2f(0.0, 0.04), 0.2 * k, 0.05 * k, 11.0, 5, 0.22, -t * 0.04)) * innerM;

  // ── Text ──
  let W: f32 = A - 0.36;
  let reveal: f32 = saturate((intro() - 0.3) / 0.7);
  let is: f32 = textFitP(5, W, 0.019 * k);
  let ts: f32 = textFitP(0, W * 0.9, 0.046 * k);
  let ps: f32 = textFitP(7, W, 0.0175 * k);
  let rs: f32 = textFitP(1, W * 0.86, 0.09 * k);
  let gs: f32 = textFitP(2, W * 0.9, 0.024 * k);
  let yI: f32 = 0.5 - 0.15;
  let yT: f32 = yI - is - 0.04 * k;
  let yP: f32 = yT - ts - 0.055 * k;
  let yR: f32 = yP - ps - 0.03 * k;
  let yLine: f32 = yR - rs - 0.022 * k;
  let yG: f32 = yLine - 0.035 * k;
  let issuer: f32 = textCenterP(p, vec2f(0.0, yI - is * 0.5), is, 5, 0.1);
  let title: f32 = textCenterP(p, vec2f(0.0, yT - ts * 0.5), ts, 0, 0.25);
  let pres: f32 = textCenterP(p, vec2f(0.0, yP - ps * 0.5), ps, 7, 0.0);
  let name: f32 = textDecodeP(p, vec2f(-textWidthP(1, rs) * 0.5, yR), rs, 1, 0.3, reveal);
  let lw: f32 = max(textWidthP(1, rs), W * 0.5) * 0.55;
  let nameLine: f32 = lineCov(abs(p.y - yLine) / px, 0.45) * step(abs(p.x), lw) * (1.0 - sstep(lw * 0.7, lw, abs(p.x)) * 0.7);
  let prog: f32 = textCenterP(p, vec2f(0.0, yG - gs * 0.5), gs, 2, 0.05);

  // ── Foot: date · seal · serial ──
  let sr: f32 = 0.085 * k;
  let sc: vec2f = vec2f(0.0, -0.5 + 0.165 + sr * 1.52);
  let sd: f32 = length(p - sc);
  let sealV: vec2f = brandSeal(p, sc, sr, slot);
  let burst: f32 = sunburst(p, sc, 120.0, 0.45, t * 0.02) * sstep(sr * 1.02, sr * 1.06, sd) * (1.0 - sstep(sr * 1.36, sr * 1.42, sd));
  let ring: f32 = ringTextP(p, sc, sr * 1.52, sr * 0.16, 5, t * 0.03, false);
  let cyc: f32 = fract(tnow() * max(numParam(1), 0.2) / 7.0);
  let stamp: f32 = lineCov(abs(sd - sr * (1.0 + cyc * 1.6)) / px, 0.8) * exp(-cyc * 4.0) * select(1.0, 0.0, numParam(1) <= 0.0);
  let fx: f32 = min(hx - 0.2, sr * 1.7 + 0.32 * k);
  let fs: f32 = 0.022 * k;
  let footY: f32 = sc.y - 0.005;
  let lineL: f32 = lineCov(abs(p.y - footY) / px, 0.4) * step(abs(p.x + fx), 0.17 * k);
  let lineR: f32 = lineCov(abs(p.y - footY) / px, 0.4) * step(abs(p.x - fx), 0.17 * k);
  let date: f32 = textCenterP(p, vec2f(-fx, footY + fs * 0.5 + 0.018), fs, 3, 0.0);
  let serial: f32 = textCenterP(p, vec2f(fx, footY + fs * 0.5 + 0.018), textFitP(4, 0.34 * k, fs), 4, 0.0);
  let lblD: f32 = cipherRun(p, vec2f(-fx - 0.05 * k, footY - 0.012), 0.011 * k, 14, 3.0, 0.0, true, 0.0);
  let lblS: f32 = cipherRun(p, vec2f(fx - 0.05 * k, footY - 0.012), 0.011 * k, 14, 7.0, 0.0, true, 0.0);

  // ── Light ──
  let ink: vec3f = inkCol(p, 1.2);
  let foil: vec3f = holo(foilPhase(p, 2.0) + 0.2);
  let goldF: vec3f = mix(gold(), foil, 0.3);
  var c: vec3f = vec3f(0.0);
  c += mix(ink, foil, 0.5) * ropes * 0.75 + mix(ink, silver(), 0.4) * keys * 0.7 + goldF * corner * 0.8;
  c += ink * (microT + microB) * 0.45;
  c += mix(u.accent.rgb, holo(p.x * 0.5 + t * 0.01), 0.5) * waves * 0.14 + mix(ink, foil, 0.5) * water * 0.12;
  c += mix(u.accent.rgb, silver(), 0.4) * issuer * 0.85;
  c += silver() * title * 0.92 + silver() * pres * 0.55;
  c += mix(goldF, holo(foilPhase(p, 1.4) + 0.3), 0.25) * name * 1.05;
  c += mix(ink, gold(), 0.5) * nameLine * 0.7 + silver() * prog * 0.72;
  c += goldF * (sealV.x * 1.05 + burst * 0.45 + ring * 0.7) + u.accent.rgb * sealV.y + gold() * stamp * 0.7;
  c += silver() * (date + serial) * 0.8 + mix(ink, silver(), 0.5) * (lineL + lineR) * 0.7 + ink * (lblD + lblS) * 0.35;
  return c;
}
`,
};
