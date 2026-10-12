import { projectUS } from "../../atlas";
import { parsePoints } from "../../scene";
import type { FoilScene } from "../../types";

const MAX_NODES = 32;
/** d[8..23] = map points (q, two per vec4; point 0 is the origin); d[24].x = count. */
const NODE_VEC4 = 8;
const COUNT_VEC4 = 24;

const CITIES =
  "-76.61,39.29; -77.44,37.54; -75.17,39.95; -74.00,40.71; -80.00,40.44; -80.84,35.23; -71.06,42.36; -83.05,42.33; -84.39,33.75; -86.78,36.16; -81.38,28.54; -87.63,41.88; -90.20,38.63; -80.19,25.76; -90.07,29.95; -94.58,39.10; -93.27,44.98; -95.94,41.26; -96.80,32.78; -95.37,29.76; -97.74,30.27; -104.99,39.74; -106.65,35.08; -111.89,40.76; -112.07,33.45; -115.14,36.17; -116.20,43.62; -118.24,34.05; -122.42,37.77; -122.68,45.52; -122.33,47.61";

/**
 * usmap — an intaglio map of the lower 48 with a program spreading city by
 * city.
 *
 * Burin lines fill the country, deeper near the origin and over the relief;
 * offset contours ring the coast. From the origin (under the brand seal)
 * arcs carry the wave outward in order of distance, each arrival blooms,
 * and a credential ticker issues the next serial with every arrival.
 */
export const usmap: FoilScene = {
  id: "usmap",
  title: "U.S. reach map",
  description: "Engraved U.S. map; arcs spread from an origin under your seal, and each arrival issues the next credential serial.",
  aspect: 1.6,
  accent: "#59c3ff",
  still: 6.4,
  params: {
    origin: { type: "points", default: "-77.04, 38.91", description: "Where the wave starts: lon,lat (contiguous U.S.)." },
    points: { type: "points", default: CITIES, description: `Cities "lon,lat; lon,lat; …" (up to ${MAX_NODES - 1}).` },
    mark: { type: "mark", num: 0, default: "zen", description: "Seal at the origin." },
    counter: { type: "boolean", num: 1, default: "true", description: "Live 5-digit counter after the serial." },
    cycle: { type: "number", num: 2, default: "10", min: 4, max: 60, description: "Seconds per wave." },
    label: { type: "text", slot: 0, default: "WASHINGTON, D.C.", description: "Origin label." },
    micro: { type: "text", slot: 1, default: "THE FIRST YOUTH AI LITERACY PROGRAM IN UNITED STATES HISTORY · ZEN AI CO · ", description: "Edge microprint." },
    title: { type: "text", slot: 2, default: "ZEN AI CERTIFIED", description: "Credential title (gold)." },
    serial: { type: "text", slot: 3, default: "ZEN-AIL-2026-", description: "Serial (prefix, when counter is on)." },
    caption: { type: "text", slot: 4, default: "VERIFIED · ZENAI.WORLD", description: "Line under the serial." },
  },
  data(d, params) {
    const origin = parsePoints(params.origin)[0] ?? [-77.04, 38.91];
    const o = projectUS(origin[0], origin[1]);
    const pts = parsePoints(params.points)
      .slice(0, MAX_NODES - 1)
      .map(([lon, lat]) => projectUS(lon, lat))
      .map((q) => ({ q, dist: Math.hypot(q[0] - o[0], (q[1] - o[1]) * 0.5) }))
      .sort((a, b) => a.dist - b.dist);
    const all = [o, ...pts.map((x) => x.q)];
    all.forEach((q, i) => {
      d[NODE_VEC4 * 4 + i * 2] = q[0];
      d[NODE_VEC4 * 4 + i * 2 + 1] = q[1];
    });
    d[COUNT_VEC4 * 4] = all.length;
  },
  code: /* wgsl */ `
const MAX_NODES: i32 = ${MAX_NODES};

fn usNode(i: i32) -> vec2f { return dPt(${NODE_VEC4}, i); }

/* Circle arc a→b bulging north: (distance, parameter along the arc). */
fn arcDist(p: vec2f, a: vec2f, b: vec2f, bulge: f32) -> vec2f {
  let c: vec2f = b - a;
  let len: f32 = max(length(c), 1e-4);
  let m: vec2f = 0.5 * (a + b);
  var n: vec2f = vec2f(-c.y, c.x) / len;
  n = select(n, -n, n.y < 0.0);
  let s: f32 = len * bulge;
  let r: f32 = (len * len * 0.25 + s * s) / (2.0 * s);
  let ctr: vec2f = m - n * (r - s);
  let pa: vec2f = a - ctr;
  let pb: vec2f = b - ctr;
  let pp: vec2f = p - ctr;
  let total: f32 = atan2(pa.x * pb.y - pa.y * pb.x, dot(pa, pb));
  let ang: f32 = atan2(pa.x * pp.y - pa.y * pp.x, dot(pa, pp));
  let t: f32 = ang / total;
  let onArc: bool = (t >= 0.0) && (t <= 1.0);
  let dArc: f32 = abs(length(pp) - r);
  let dEnd: f32 = min(length(p - a), length(p - b));
  return vec2f(select(dEnd, dArc, onArc), saturate(t));
}

fn scene(uv: vec2f, p: vec2f) -> vec3f {
  let A: f32 = aspect();
  let W: f32 = min(A * 1.06, 1.95);
  let org: vec2f = vec2f(-W * 0.5, W * 0.25 + select(0.03, 0.12, A < 1.2));
  let toQ: vec2f = vec2f(1.0 / W, -2.0 / W);
  let q: vec2f = (p - org) * toQ;
  let sd: f32 = mapD(q) * W;
  let oP: vec2f = org + usNode(0) / toQ;
  let n: i32 = min(i32(u.d[${COUNT_VEC4}].x + 0.5), MAX_NODES);
  let slot: i32 = i32(numParam(0));

  let t: f32 = tnow();
  let period: f32 = max(numParam(2), 4.0);
  let cyc: f32 = fract(t / period);
  let fade: f32 = 1.0 - sstep(0.86, 0.995, cyc);

  // Interior: horizontal burin lines, deeper toward the origin and over relief.
  let inside: f32 = fillAA(sd);
  let dO: f32 = length(p - oP);
  let relief: f32 = fbm(p * 6.0 + vec2f(3.0, 1.0), 4);
  let tone: f32 = saturate(0.14 + exp(-dO * 2.6) * 0.52 + relief * 0.42);
  let hatch: f32 = engrave(p.y + relief * 0.01, 0.0105, tone) * inside;
  let coast: f32 = stroke(sd, 0.7);
  let outside: f32 = sstep(-pxs(), pxs(), sd);
  let rings: f32 = engraveP(sd, 0.0105, 0.12, pxs()) * outside * (1.0 - sstep(0.0, 0.09, sd));

  var arcs: f32 = 0.0;
  var heads: f32 = 0.0;
  var nodes: f32 = 0.0;
  var blooms: f32 = 0.0;
  let spread: f32 = 0.6;
  for (var i: i32 = 1; i < MAX_NODES; i++) {
    if (i < n) {
      let np: vec2f = org + usNode(i) / toQ;
      let delay: f32 = f32(i) / f32(max(n - 1, 1)) * spread;
      let k: f32 = saturate((cyc - delay) / 0.14);
      let span: f32 = length(np - oP);
      let mid: f32 = length(p - 0.5 * (oP + np));
      if (mid < span * 0.62 + 0.03) {
        let ad: vec2f = arcDist(p, oP, np, 0.17);
        let drawn: f32 = 1.0 - sstep(k - 0.02, k, ad.y);
        arcs += stroke(ad.x, 0.32) * drawn * step(0.0001, k) * (0.3 + 0.7 * (1.0 - k));
        heads += exp(-ad.x / pxs() * 0.55) * exp(-abs(ad.y - k) * 60.0) * (1.0 - step(0.999, k)) * step(0.0001, k);
      }
      let arrive: f32 = step(0.999, k);
      let since: f32 = max(cyc - delay - 0.14, 0.0);
      let dn: f32 = length(p - np);
      nodes += fillAA(dn - 0.0036) * (0.3 + 0.7 * arrive);
      blooms += stroke(dn - since * 0.28, 0.55) * arrive * exp(-since * 10.0);
    }
  }

  // The origin: the brand seal with a slow beacon.
  let seal: vec2f = brandSeal(p, oP, 0.036, slot);
  let beacon: f32 = stroke(dO - 0.036 - fract(t * 0.35) * 0.08, 0.5) * (1.0 - fract(t * 0.35));

  // Credential ticker: each arrival issues the next serial.
  let arrivals: f32 = clamp(floor((cyc - 0.14) / spread * f32(max(n - 1, 1))) + 1.0, 0.0, f32(max(n - 1, 0)));
  let idn: i32 = 117 + i32(floor(t / period)) * max(n - 1, 1) + i32(arrivals);
  let cx0: f32 = -A * 0.5 + 0.05;
  let useCounter: bool = numParam(1) > 0.5;
  let cs: f32 = min(0.031, (A * 0.5 - 0.06) / ((textLenP(3) + 5.0) * 0.6));
  let certL: f32 = textRunP(p, vec2f(cx0, -0.268), cs * 0.8, 2, 0.15);
  let idL: f32 = textRunP(p, vec2f(cx0, -0.314), cs, 3, 0.0);
  let idD: f32 = numberCov(p, vec2f(cx0 + textWidthP(3, cs), -0.314), cs, idn, 5, 0.0) * select(0.0, 1.0, useCounter);
  let verL: f32 = textRunP(p, vec2f(cx0, -0.37), cs * 0.58, 4, 0.0);
  let tick: f32 = exp(-fract(cyc * f32(max(n - 1, 1)) / spread) * 6.0) * step(0.14, cyc) * step(cyc, 0.74);

  let lblS: f32 = 0.024;
  let lblX: f32 = select(oP.x + 0.05, oP.x - 0.05 - textWidthP(0, lblS), oP.x + 0.05 + textWidthP(0, lblS) > A * 0.5 - 0.03);
  let label: f32 = textRunP(p, vec2f(lblX, oP.y + 0.04), lblS, 0, 0.0);
  let micro: f32 = textLoopP(p, -0.462, 0.017, 1, t * 0.012, 0.0);

  let ink: vec3f = inkCol(p, 1.3);
  var c: vec3f = ink * (hatch * 0.62 + coast * 0.95 + rings * 0.42);
  c += holo(foilPhase(p, 2.2) + 0.25) * arcs * 1.1 * fade;
  c += vec3f(1.0, 0.95, 0.86) * (heads * 1.3 + blooms * 0.8) * fade;
  c += mix(ink, vec3f(1.0), 0.6) * nodes * 0.9;
  let foil: vec3f = mix(vec3f(1.0, 0.9, 0.7), holo(foilPhase(p, 2.0) + 0.1), 0.35);
  c += foil * seal.x * 1.1 + vec3f(1.0, 0.93, 0.8) * beacon * 0.7 + u.accent.rgb * (exp(-dO * 26.0) * 0.5 + seal.y);
  c += silver() * label * 0.85 + ink * micro * 0.45;
  c += vec3f(0.95, 0.82, 0.55) * certL * 0.95 + silver() * (idL * 0.8 + verL * 0.5);
  c += mix(silver(), vec3f(1.0, 0.95, 0.8), tick) * idD * (0.8 + 0.4 * tick);
  return c;
}
`,
};
