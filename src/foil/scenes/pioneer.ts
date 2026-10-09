import { layoutText, projectUS } from "../atlas";
import type { FoilScene } from "../types";

/* Washington, D.C. first — the program started there — then the cities the
   network reaches, ordered by distance so the wave reads as propagation. */
const CITIES: [number, number][] = [
  [-77.04, 38.91], [-76.61, 39.29], [-77.44, 37.54], [-75.17, 39.95], [-74.0, 40.71], [-80.0, 40.44],
  [-80.84, 35.23], [-71.06, 42.36], [-83.05, 42.33], [-84.39, 33.75], [-86.78, 36.16], [-81.38, 28.54],
  [-87.63, 41.88], [-90.2, 38.63], [-80.19, 25.76], [-90.07, 29.95], [-94.58, 39.1], [-93.27, 44.98],
  [-95.94, 41.26], [-96.8, 32.78], [-95.37, 29.76], [-97.74, 30.27], [-104.99, 39.74], [-106.65, 35.08],
  [-111.89, 40.76], [-112.07, 33.45], [-115.14, 36.17], [-116.2, 43.62], [-118.24, 34.05], [-122.42, 37.77],
  [-122.68, 45.52], [-122.33, 47.61],
];

const TEXT = layoutText(
  { label: "WASHINGTON, D.C.", micro: "ZEN AI CO · AI PIONEER PROGRAM · FIRST IN U.S. HISTORY · " },
  64,
);
const { label: LABEL, micro: MICRO } = TEXT.at;

/**
 * ZEN AI — the first youth AI literacy program in U.S. history.
 * An intaglio-engraved map of the lower 48: the program ignites in
 * Washington, D.C., and arcs carry it city by city across the country.
 */
export const pioneer: FoilScene = {
  id: "pioneer",
  still: 6.4,
  data(d) {
    const dc = projectUS(CITIES[0][0], CITIES[0][1]);
    const pts = CITIES.map(([lon, lat]) => projectUS(lon, lat))
      .map((q, i) => ({ q, i, dist: i === 0 ? -1 : Math.hypot(q[0] - dc[0], (q[1] - dc[1]) * 0.5) }))
      .sort((a, b) => a.dist - b.dist);
    pts.forEach(({ q }, i) => {
      d[i * 2] = q[0];
      d[i * 2 + 1] = q[1];
    });
    TEXT.write(d);
  },
  code: /* wgsl */ `
fn usNode(i: i32) -> vec2f {
  let v: vec4f = u.d[i / 2];
  return select(v.zw, v.xy, (i % 2) == 0);
}

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
  let W: f32 = min(aspect() * 1.3, 2.35);
  let org: vec2f = vec2f(-W * 0.5, W * 0.25 - 0.015);
  let toQ: vec2f = vec2f(1.0 / W, -2.0 / W);
  let q: vec2f = (p - org) * toQ;
  let sd: f32 = mapD(q) * W;
  let dc: vec2f = org + usNode(0) / toQ;

  let t: f32 = tnow();
  let cyc: f32 = fract(t / 10.0);
  let fade: f32 = 1.0 - sstep(0.86, 0.995, cyc);

  // Interior: horizontal burin lines, deeper toward D.C. and over relief.
  let inside: f32 = fillAA(sd);
  let dDC: f32 = length(p - dc);
  let relief: f32 = fbm(p * 6.0 + vec2f(3.0, 1.0), 4);
  let tone: f32 = saturate(0.14 + exp(-dDC * 2.6) * 0.52 + relief * 0.42);
  let hatch: f32 = engrave(p.y + relief * 0.01, 0.0105, tone) * inside;

  // Coastline + offset contours: the seal-engraver's frame.
  let coast: f32 = stroke(sd, 0.7);
  let outside: f32 = sstep(-pxs(), pxs(), sd);
  let rings: f32 = engraveP(sd, 0.0105, 0.12, pxs()) * outside * (1.0 - sstep(0.0, 0.09, sd));

  var arcs: f32 = 0.0;
  var heads: f32 = 0.0;
  var nodes: f32 = 0.0;
  var blooms: f32 = 0.0;
  for (var i: i32 = 1; i < 32; i++) {
    let np: vec2f = org + usNode(i) / toQ;
    let delay: f32 = f32(i) / 31.0 * 0.6;
    let k: f32 = saturate((cyc - delay) / 0.14);
    let span: f32 = length(np - dc);
    let mid: f32 = length(p - 0.5 * (dc + np));
    if (mid < span * 0.62 + 0.03) {
      let ad: vec2f = arcDist(p, dc, np, 0.17);
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

  // D.C.: the origin seal — diamond, ring and a slow beacon.
  let dq: vec2f = rot2(PI * 0.25) * (p - dc);
  let diamond: f32 = stroke(sdBox(dq, vec2f(0.0105)), 0.6) + fillAA(sdBox(dq, vec2f(0.0045)));
  let beacon: f32 = stroke(dDC - fract(t * 0.35) * 0.09, 0.5) * (1.0 - fract(t * 0.35));

  let label: f32 = textRun(p, dc + vec2f(0.026, 0.04), 0.024, ${LABEL.start}, ${LABEL.count}, 0.0);
  let micro: f32 = textLoop(p, -0.462, 0.017, ${MICRO.start}, ${MICRO.count}, t * 0.012, 0.0);

  let ink: vec3f = inkCol(p, 1.3);
  var c: vec3f = ink * (hatch * 0.62 + coast * 0.95 + rings * 0.42);
  c += holo(foilPhase(p, 2.2) + 0.25) * arcs * 1.1 * fade;
  c += vec3f(1.0, 0.95, 0.86) * (heads * 1.3 + blooms * 0.8) * fade;
  c += mix(ink, vec3f(1.0), 0.6) * nodes * 0.9;
  c += vec3f(1.0, 0.93, 0.8) * (diamond * 1.2 + beacon * 0.7) + u.accent.rgb * exp(-dDC * 26.0) * 0.5;
  c += silver() * label * 0.85 + ink * micro * 0.45;
  return c;
}
`,
};
