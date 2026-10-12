import type { FoilScene } from "../../types";

/**
 * seal — a banknote-grade security seal and credential.
 *
 * A struck medallion: twin guilloche rosettes counter-turning inside a ring
 * of microprint, a sunburst of engraved rays, a domed boss of concentric
 * cuts, and the brand mark in hatched, foil-lit relief. Every six seconds
 * the seal stamps — a ring of light runs out and the serial ticks to the
 * next credential. The headline decodes in beside it.
 *
 * Layout: medallion left with the text column (wide plates), stacked
 * medallion-over-text (narrow), or the medallion alone (layout="center").
 */
export const seal: FoilScene = {
  id: "seal",
  title: "Security seal",
  description: "Guilloche medallion around a brand mark, ring microprint, a stamping pulse and a live credential serial.",
  aspect: 1.6,
  accent: "#7cc4ff",
  still: 4.2,
  params: {
    mark: { type: "mark", brand: true, num: 0, default: "zen", description: "Brand mark: zen, bgc, near, a registered name, SVG path data or an image URL." },
    layout: { type: "choice", num: 1, options: ["auto", "left", "center", "right"], default: "auto", description: "Medallion position; auto stacks on narrow plates." },
    counter: { type: "boolean", num: 2, default: "true", description: "Append a live 6-digit counter to the serial." },
    speed: { type: "number", num: 3, default: "1", min: 0, max: 4, description: "Animation speed (0 holds still)." },
    headline: { type: "text", brand: true, slot: 0, default: "ZEN AI CO", description: "Main line (fits the column automatically)." },
    subline: { type: "text", slot: 1, default: "ISSUED UNDER SEAL", description: "Second line." },
    micro: { type: "text", brand: true, slot: 2, default: "ZEN AI CO · AUTHENTIC · ORDO AB CHAO · ", description: "Microprint around the ring and along the edges." },
    serial: { type: "text", brand: true, slot: 3, default: "ZEN-2026-", description: "Credential serial (prefix, when counter is on)." },
    caption: { type: "text", brand: true, slot: 4, default: "VERIFIED · ZENAI.WORLD", description: "Small line under the serial." },
    eyebrow: { type: "text", slot: 5, default: "CERTIFIED ISSUER", description: "Small label above the headline." },
  },
  code: /* wgsl */ `
/* Medallion centre, radius and mode (0 side-left, 1 stacked, 2 centre, 3 side-right). */
fn sealGeo() -> vec4f {
  let A: f32 = aspect();
  let mode: f32 = numParam(1);
  let wide: bool = A >= 1.25;
  let rS: f32 = min(0.2, A * 0.25);
  let stacked: vec4f = vec4f(0.0, 0.5 - 0.075 - rS * 1.16, rS, 1.0);
  let rW: f32 = min(0.32, A * 0.2);
  let left: vec4f = vec4f(-A * 0.5 + rW * 1.16 + 0.1, 0.0, rW, 0.0);
  let right: vec4f = vec4f(A * 0.5 - rW * 1.16 - 0.1, 0.0, rW, 3.0);
  let centre: vec4f = vec4f(0.0, 0.0, min(0.36, A * 0.36), 2.0);
  var g: vec4f = select(stacked, left, wide);
  g = select(g, left, (mode > 0.5) && (mode < 1.5));
  g = select(g, centre, (mode > 1.5) && (mode < 2.5));
  g = select(g, right, mode > 2.5);
  return g;
}

fn scene(uv: vec2f, p: vec2f) -> vec3f {
  let speed: f32 = numParam(3);
  let t: f32 = tnow() * speed;
  let g: vec4f = sealGeo();
  let C: vec2f = g.xy;
  let R: f32 = g.z;
  let mode: f32 = g.w;
  let px: f32 = pxs();
  let d: vec2f = p - C;
  let r: f32 = length(d);
  let a: f32 = atan2(d.y, d.x);
  let slot: i32 = i32(numParam(0));
  let hasMark: f32 = select(0.0, 1.0, slot >= 0);

  // ── Medallion ──
  let rim: f32 = lineCov(abs(r - R) / px, 0.6) + lineCov(abs(r - R * 0.972) / px, 0.3) + lineCov(abs(r - R * 1.16) / px, 0.4);
  let micro: f32 = ringTextP(p, C, R * 1.085, R * 0.068, 2, t * 0.02, false);
  let rays: f32 = sunburst(p, C, 216.0, 0.34 + 0.22 * sin(a * 6.0 + t * 0.12), 0.0);
  let rayBand: f32 = rays * sstep(R * 0.6, R * 0.63, r) * (1.0 - sstep(R * 0.93, R * 0.955, r));
  let ros1: f32 = rosette(p, C, R * 0.775, R * 0.115, 24.0, 6, 0.34, t * 0.06);
  let ros2: f32 = rosette(p, C, R * 0.775, R * 0.15, 15.0, 4, 0.28, 1.3 - t * 0.045);
  let band: f32 = saturate(ros1 + ros2 * 0.85) * (1.0 - sstep(R * 0.95, R * 0.97, r));
  let inner: f32 = lineCov(abs(r - R * 0.585) / px, 0.55) + lineCov(abs(r - R * 0.56) / px, 0.28);
  // Domed boss: concentric cuts, deeper toward its rim.
  let rb: f32 = saturate(r / (R * 0.55));
  let dome: f32 = sqrt(saturate(1.0 - rb * rb));
  let boss: f32 = engraveP(r, R * 0.021, 0.12 + 0.36 * (1.0 - dome), fwidth(r)) * (1.0 - sstep(R * 0.535, R * 0.55, r));
  // The mark, struck in hatched relief; a rosace when there is none.
  let md: f32 = logoDist(slot, p, C, R * 0.9);
  let markFill: f32 = saturate(0.5 - md / px) * hasMark;
  let markEdge: f32 = lineCov(abs(md) / px, 0.55) * hasMark;
  let hatch: f32 = engrave(p.x * 0.8 + p.y, R * 0.017, 0.58);
  let lift: f32 = saturate(dot(normalize(d + vec2f(1e-5)), vec2f(-0.6, 0.8)) * 0.5 + 0.5);
  let rosace: f32 = rosette(p, C, R * 0.26, R * 0.2, 9.0, 5, 0.3, t * 0.08) * (1.0 - hasMark) * (1.0 - sstep(R * 0.5, R * 0.52, r));
  let bossMask: f32 = (1.0 - markFill) * hasMark;

  // ── The stamp: a ring of light every six seconds ──
  let cyc: f32 = fract(tnow() * max(speed, 0.2) / 6.0);
  let pr: f32 = R * (0.62 + cyc * 0.75);
  let stamp: f32 = (lineCov(abs(r - pr) / px, 0.9) + exp(-abs(r - pr) / (R * 0.03)) * 0.35) * exp(-cyc * 3.2) * select(1.0, 0.0, speed <= 0.0);
  let flash: f32 = exp(-cyc * 8.0) * select(1.0, 0.0, speed <= 0.0);
  let lp: f32 = exp(-length(p - mouseP()) * 5.0) * hov();

  let ink: vec3f = inkCol(p, 1.4);
  let foil: vec3f = holo(foilPhase(p, 2.4) + r * 2.5);
  var c: vec3f = vec3f(0.0);
  c += ink * (rim * 0.85 + inner * 0.8 + rayBand * 0.34 + boss * bossMask * 0.42 + boss * (1.0 - hasMark) * 0.3);
  c += mix(ink, foil, 0.62) * band * 0.8;
  c += mix(ink, foil, 0.5) * rosace * 0.85;
  c += silver() * micro * 0.72;
  c += mix(silver(), foil, 0.6) * markFill * (0.28 + 0.72 * hatch) * (0.62 + 0.5 * lift + 0.6 * lp) + silver() * markEdge * 0.65;
  c += gold() * stamp * 0.85 + u.accent.rgb * (exp(-abs(r - R) / (R * 0.12)) * 0.05 + flash * exp(-r / R) * 0.06);
  c += foil * lp * 0.05 * saturate(1.0 - r / (R * 1.2));

  // ── Text column ──
  let A: f32 = aspect();
  let stackedM: bool = (mode > 0.5) && (mode < 1.5);
  let showText: f32 = select(1.0, 0.0, (mode > 1.5) && (mode < 2.5));
  let x0: f32 = select(-A * 0.5 + 0.1, C.x + R * 1.24 + 0.06, mode < 0.5);
  let x1: f32 = select(C.x - R * 1.24 - 0.06, A * 0.5 - 0.1, mode < 0.5);
  let W: f32 = select(x1 - x0, A - 0.2, stackedM);
  // Stacked plates are short on height: everything tightens by k.
  let k: f32 = select(1.0, 0.78, stackedM);
  let hs: f32 = textFitP(0, W, 0.092 * k);
  let ss: f32 = textFitP(1, W, 0.03 * k);
  let es: f32 = textFitP(5, W, 0.019 * k);
  let sz: f32 = 0.028 * k;
  let cs: f32 = textFitP(4, W, 0.0175 * k);
  // Vertical rhythm: eyebrow, headline, rule, subline, serial, caption.
  let block: f32 = (0.034 + 0.05 + 0.05 + 0.034) * k + hs + ss + sz + cs;
  let top: f32 = select(block * 0.5 + 0.01, C.y - R * 1.2 - 0.035, stackedM);
  let yE: f32 = top;
  let yH: f32 = yE - 0.034 * k;
  let yRule: f32 = yH - hs - 0.024 * k;
  let yS: f32 = yRule - 0.026 * k;
  let yN: f32 = yS - ss - 0.05 * k;
  let yC: f32 = yN - sz - 0.034 * k;
  let xa: f32 = select(x0, 0.0, stackedM);
  let ox: f32 = select(0.0, 1.0, stackedM);
  let reveal: f32 = saturate((intro() - 0.3) / 0.7);
  let eyebrow: f32 = textRunP(p, vec2f(xa - ox * textWidthP(5, es) * 0.5, yE), es, 5, 0.0);
  let head: f32 = textDecodeP(p, vec2f(xa - ox * textWidthP(0, hs) * 0.5, yH), hs, 0, 0.35, reveal);
  let ruleW: f32 = select(W, W * 0.5, stackedM);
  let rx0: f32 = xa - ox * ruleW * 0.5;
  let rule: f32 = lineCov(abs(p.y - yRule) / px, 0.4) * step(rx0, p.x) * step(p.x, rx0 + ruleW) * (0.35 + 0.65 * exp(-abs(p.x - rx0 - ruleW * fract(t * 0.08)) * 18.0));
  let sub: f32 = textRunP(p, vec2f(xa - ox * textWidthP(1, ss) * 0.5, yS), ss, 1, 0.1);
  // Serial: the prefix, then a counter that ticks with each stamp.
  let useCounter: bool = numParam(2) > 0.5;
  let serialW: f32 = textWidthP(3, sz) + select(0.0, 6.0 * sz * 0.6, useCounter);
  let sx: f32 = xa - ox * serialW * 0.5;
  let pre: f32 = textRunP(p, vec2f(sx, yN), sz, 3, 0.0);
  let idn: i32 = 100417 + i32(floor(tnow() * max(speed, 0.2) / 6.0));
  let digits: f32 = numberCov(p, vec2f(sx + textWidthP(3, sz), yN), sz, idn, 6, 0.0) * select(0.0, 1.0, useCounter);
  let cap: f32 = textRunP(p, vec2f(xa - ox * textWidthP(4, cs) * 0.5, yC), cs, 4, 0.0);
  let sweep: f32 = exp(-abs(p.x - (x0 - 0.2 + fract(t * 0.07) * (W + 0.6))) * 9.0);

  c += showText * (u.accent.rgb * 0.55 + silver() * 0.35) * eyebrow;
  c += showText * mix(silver(), holo(foilPhase(p, 1.6) + 0.35), 0.35 + 0.4 * sweep) * head * (0.95 + 0.25 * sweep);
  c += showText * mix(ink, silver(), 0.5) * rule * 0.8;
  c += showText * silver() * sub * 0.72;
  c += showText * (gold() * 0.9 * pre + mix(silver(), gold(), 0.6 + 0.4 * flash) * digits * (0.85 + 0.6 * flash));
  c += showText * ink * cap * 0.6;

  // ── Plate furniture: keylines, corner rosettes, edge microprint ──
  let frame: f32 = plateFrame(p, 0.024);
  let corners: f32 = frameCorners(p, 0.06, 0.032);
  let inRun: f32 = step(abs(p.x), A * 0.5 - 0.105);
  let edgeTop: f32 = textLoopP(p, 0.5 - 0.036, 0.0125, 2, t * 0.012, 0.0) * inRun;
  let edgeBot: f32 = textLoopP(p, -0.5 + 0.049, 0.0125, 2, -t * 0.012, 0.0) * inRun;
  // Rainbow-print ground: fine interference waves under the text column.
  let wv: f32 = p.y + 0.018 * sin(p.x * 7.0 + t * 0.05) + 0.008 * sin(p.x * 17.0 - p.y * 4.0);
  let waves: f32 = engrave(wv, 0.011, 0.09) * showText * sstep(R * 1.25, R * 1.6, r) * sstep(0.0, 0.08, edgeDist(p) - 0.03);
  c += mix(u.accent.rgb, holo(p.x * 0.6 + t * 0.01), 0.5) * waves * 0.16;
  c += mix(ink, silver(), 0.4) * (frame * 0.5 + corners * 0.42) + ink * (edgeTop + edgeBot) * 0.32;
  return c;
}
`,
};
