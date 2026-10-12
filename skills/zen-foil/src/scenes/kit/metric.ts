import { parseNumbers } from "../../scene";
import type { FoilScene } from "../../types";

const MAX_POINTS = 24;
/** d[8..13] = series (24 values, normalised 0–1); d[14].x = count. */
const SERIES_VEC4 = 8;
const COUNT_VEC4 = 14;

/**
 * metric — a headline figure over an engraved chart, like a stock
 * certificate crossed with a trading terminal.
 *
 * The figure decodes in from cipher glyphs; beside it the series is drawn
 * as a foil hairline over an intaglio-hatched area, on a fine grid with
 * microprint ticks. A read head rides the line with a live cipher readout.
 */
export const metric: FoilScene = {
  id: "metric",
  title: "Metric plate",
  description: "A decoding headline figure over an engraved, foil-lined chart of your series, with a live read head.",
  aspect: 1.6,
  accent: "#f5d06f",
  still: 6.0,
  params: {
    value: { type: "text", brand: true, slot: 0, default: "20,000+", description: "The headline figure." },
    label: { type: "text", brand: true, slot: 1, default: "SUBSCRIBERS", description: "What the figure counts." },
    delta: { type: "text", brand: true, slot: 2, default: "WEEKLY RESEARCH DISPATCH", description: "Change or context line (accent). Use real figures only." },
    headline: { type: "text", brand: true, slot: 3, default: "ZEN WEEKLY", description: "Plate title, top left." },
    micro: { type: "text", brand: true, slot: 4, default: "ZEN AI CO · RESEARCH + INTELLIGENCE · ", description: "Edge microprint." },
    series: { type: "list", brand: true, default: "12,14,13,17,19,18,23,26,25,31,34,33,39,44,43,51,56,60,66,71", description: `Values to chart (up to ${MAX_POINTS}). The default is sample data — pass the real series.` },
    mark: { type: "mark", brand: true, num: 0, default: "zen", description: "Issuer stamp, bottom right (none to omit)." },
    speed: { type: "number", num: 1, default: "1", min: 0, max: 4, description: "Read-head speed." },
  },
  data(d, params) {
    const v = parseNumbers(params.series).slice(0, MAX_POINTS);
    const vals = v.length >= 2 ? v : [0, 1];
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    const span = hi - lo || 1;
    vals.forEach((x, i) => (d[SERIES_VEC4 * 4 + i] = (x - lo) / span));
    d[COUNT_VEC4 * 4] = vals.length;
  },
  code: /* wgsl */ `
const MAXP: i32 = ${MAX_POINTS};

fn seriesAt(i: i32) -> f32 { return dF(${SERIES_VEC4 * 4} + clamp(i, 0, MAXP - 1)); }

/* Catmull-Rom through the series at parameter x (0..n-1). */
fn seriesY(x: f32, n: i32) -> f32 {
  let i: i32 = clamp(i32(floor(x)), 0, max(n - 2, 0));
  let f: f32 = saturate(x - f32(i));
  let p0: f32 = seriesAt(max(i - 1, 0));
  let p1: f32 = seriesAt(i);
  let p2: f32 = seriesAt(min(i + 1, n - 1));
  let p3: f32 = seriesAt(min(i + 2, n - 1));
  let f2: f32 = f * f;
  let f3: f32 = f2 * f;
  return 0.5 * (2.0 * p1 + (-p0 + p2) * f + (2.0 * p0 - 5.0 * p1 + 4.0 * p2 - p3) * f2 + (-p0 + 3.0 * p1 - 3.0 * p2 + p3) * f3);
}

fn scene(uv: vec2f, p: vec2f) -> vec3f {
  let A: f32 = aspect();
  let t: f32 = tnow();
  let px: f32 = pxs();
  let n: i32 = max(i32(u.d[${COUNT_VEC4}].x + 0.5), 2);
  let wide: bool = A >= 1.2;

  // Chart box: right 58% on wide plates, lower half on narrow ones.
  let bx0: f32 = select(-A * 0.5 + 0.08, -A * 0.5 + A * 0.4, wide);
  let bx1: f32 = A * 0.5 - 0.07;
  let by0: f32 = select(-0.4, -0.36, wide);
  let by1: f32 = select(0.02, 0.3, wide);
  let bw: f32 = bx1 - bx0;
  let bh: f32 = by1 - by0;
  let inBox: f32 = step(bx0, p.x) * step(p.x, bx1) * step(by0, p.y) * step(p.y, by1);

  // The curve, drawn on during the intro.
  let draw: f32 = intro();
  let xs: f32 = (p.x - bx0) / bw * f32(n - 1);
  let yv: f32 = seriesY(xs, n);
  let cy: f32 = by0 + bh * (0.08 + 0.84 * yv);
  let dx: f32 = 0.5 * f32(n - 1) / bw * px;
  let slope: f32 = (seriesY(xs + dx, n) - seriesY(xs - dx, n)) * bh * 0.84 / (2.0 * px);
  let dist: f32 = abs(p.y - cy) / sqrt(1.0 + slope * slope);
  let shown: f32 = step(p.x, bx0 + bw * draw) * step(bx0, p.x) * step(p.x, bx1);
  let curve: f32 = lineCov(dist / px, 0.9) * shown;
  let glowC: f32 = exp(-dist / 0.012) * shown;
  // Area under the curve: burin lines, heavier toward the curve.
  let under: f32 = step(p.y, cy) * step(by0, p.y) * shown;
  let depth: f32 = saturate((cy - p.y) / max(cy - by0, 1e-3));
  let area: f32 = engrave(p.y, 0.0062, 0.55 * (1.0 - depth) + 0.06) * under;

  // Grid and ticks.
  let gx: f32 = abs(fract((p.x - bx0) / bw * 6.0 + 0.5) - 0.5) * bw / 6.0;
  let gy: f32 = abs(fract((p.y - by0) / bh * 4.0 + 0.5) - 0.5) * bh / 4.0;
  let grid: f32 = (lineCov(gx / px, 0.25) + lineCov(gy / px, 0.25)) * inBox;
  let axis: f32 = lineCov(abs(p.y - by0) / px, 0.5) * step(bx0, p.x) * step(p.x, bx1) + lineCov(abs(p.x - bx0) / px, 0.5) * step(by0, p.y) * step(p.y, by1);
  let ticks: f32 = cipherRun(p, vec2f(bx0, by0 - 0.016), 0.011, i32(bw / (0.011 * 0.6)), 2.0, 0.0, true, 0.0) * 0.6;

  // Read head: rides the line, with a live readout.
  let hx: f32 = fract(t * 0.05 * numParam(1) + 0.15);
  let hX: f32 = bx0 + bw * hx;
  let hY: f32 = by0 + bh * (0.08 + 0.84 * seriesY(hx * f32(n - 1), n));
  let hd: f32 = length(p - vec2f(hX, hY));
  let head: f32 = fillAA(hd - 0.006) + exp(-hd * 90.0) * 0.8 + lineCov(abs(hd - 0.014) / px, 0.4);
  let vline: f32 = lineCov(abs(p.x - hX) / px, 0.3) * step(by0, p.y) * step(p.y, hY) * 0.6;
  let readout: f32 = cipherRun(p, vec2f(hX + 0.016, hY + 0.034), 0.016, 6, 9.0, 6.0, true, 0.0);

  // Figure block.
  let colW: f32 = select(A - 0.16, A * 0.4 - 0.14, wide);
  let x0: f32 = -A * 0.5 + 0.08;
  let reveal: f32 = saturate((intro() - 0.2) / 0.8);
  let hsz: f32 = textFitP(3, colW, 0.026);
  let vsz: f32 = min(select(0.12, 0.17, wide), colW / max(textLenP(0) * 0.44, 0.44));
  let lsz: f32 = textFitP(1, colW, 0.028);
  let dsz: f32 = textFitP(2, colW, 0.022);
  let yHd: f32 = 0.5 - 0.075;
  let yV: f32 = select(0.36, 0.2, wide);
  let title: f32 = textRunP(p, vec2f(x0, yHd), hsz, 3, 0.2);
  let fig: f32 = textDecodePT(p, vec2f(x0 - vsz * 0.05, yV), vsz, 0, 0.6, reveal, 0.44);
  // A banknote watermark of the mark fills the quiet corner.
  let wmC: vec2f = select(vec2f(A * 0.32, -0.08), vec2f(-A * 0.5 + A * 0.2, -0.24), wide);
  let wmD: f32 = logoDist(i32(numParam(0)), p, wmC, select(0.36, 0.3, wide));
  let wm: f32 = saturate(0.5 - wmD / px) * engrave(p.x * 0.6 + p.y, 0.006, 0.5) * select(0.0, 1.0, numParam(0) >= 0.0) * select(0.0, 1.0, wide);
  let lab: f32 = textRunP(p, vec2f(x0, yV - vsz - 0.03), lsz, 1, 0.1);
  let del: f32 = textRunP(p, vec2f(x0, yV - vsz - 0.03 - lsz - 0.035), dsz, 2, 0.05);
  let slot: i32 = i32(numParam(0));
  let ruleEnd: f32 = select(A * 0.5 - 0.07, A * 0.5 - 0.15, slot >= 0);
  let rule: f32 = lineCov(abs(p.y - (yHd - hsz - 0.02)) / px, 0.35) * step(x0, p.x) * step(p.x, ruleEnd);
  let micro: f32 = textLoopP(p, -0.462, 0.015, 4, t * 0.012, 0.0);
  let sv: vec2f = brandSeal(p, vec2f(A * 0.5 - 0.09, 0.5 - 0.085), 0.042, slot);

  let ink: vec3f = inkCol(p, 1.3);
  let foil: vec3f = holo(foilPhase(p, 2.0) + p.x * 0.3);
  var c: vec3f = vec3f(0.0);
  c += mix(u.accent.rgb, ink, 0.4) * area * 0.42 + ink * grid * 0.12 + mix(ink, silver(), 0.5) * axis * 0.5 + ink * ticks * 0.35;
  c += mix(u.accent.rgb, foil, 0.45) * (curve * 1.2 + glowC * 0.18);
  c += vec3f(1.0, 0.95, 0.85) * head + mix(ink, silver(), 0.5) * vline + mix(u.accent.rgb, silver(), 0.3) * readout * 0.9;
  c += silver() * title * 0.85 + mix(ink, silver(), 0.4) * rule * 0.5;
  c += mix(silver(), holo(foilPhase(p, 1.4) + 0.3), 0.35) * fig * 1.05;
  c += silver() * lab * 0.75 + u.accent.rgb * del * 0.95;
  c += ink * micro * 0.4 + mix(silver(), foil, 0.5) * sv.x * 0.85 + u.accent.rgb * sv.y;
  c += mix(ink, foil, 0.5) * wm * 0.16;
  return c;
}
`,
};
