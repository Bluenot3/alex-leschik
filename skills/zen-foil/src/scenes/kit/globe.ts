import { parsePoints } from "../../scene";
import type { FoilScene } from "../../types";

const MAX_ARCS = 14;
/** d[8] = origin direction (xyz, arc count); d[9..22] = arcs (great-circle basis C.xyz, angle Ω). */
const ORIGIN_VEC4 = 8;
const ARC_VEC4 = 9;
/** d[23] = view centre (lon, lat in radians) between the origin and its destinations. */
const VIEW_VEC4 = 23;

const DEFAULT_ORIGIN = "-77.04, 38.91";
const DEFAULT_POINTS =
  "-79.38,43.65; -0.13,51.51; 13.40,52.52; 55.27,25.20; 103.82,1.35; 139.69,35.69; -87.63,41.88; -84.39,33.75; -96.80,32.78; -104.99,39.74; -118.24,34.05; -122.33,47.61; -80.19,25.76; -93.27,44.98";

function dir([lon, lat]: [number, number]): [number, number, number] {
  const a = (lon * Math.PI) / 180;
  const b = (lat * Math.PI) / 180;
  return [Math.cos(b) * Math.sin(a), Math.sin(b), Math.cos(b) * Math.cos(a)];
}

/**
 * globe — an intaglio-engraved Earth with great-circle arcs.
 *
 * Natural Earth coastlines engraved along the parallels, a graticule, a
 * holographic atmosphere and a slow turn. From the origin, arcs lift off
 * the surface to every destination; the first `hubs` arcs carry the brand
 * mark across, the rest a spark, and each arrival stamps a ring. A lockup
 * (mark × partner mark) and the text sit beside the globe.
 */
export const globe: FoilScene = {
  id: "globe",
  title: "Engraved globe",
  description: "Engraved Earth turning under a holographic atmosphere; great-circle arcs carry your mark from an origin to every destination.",
  aspect: 1.6,
  accent: "#6ee7b7",
  still: 7.0,
  params: {
    origin: { type: "points", brand: true, default: DEFAULT_ORIGIN, description: "Where every arc starts: lon,lat." },
    points: { type: "points", brand: true, default: DEFAULT_POINTS, description: `Destinations "lon,lat; lon,lat; …" (up to ${MAX_ARCS}).` },
    mark: { type: "mark", brand: true, num: 0, default: "zen", description: "Mark carried along the arcs and shown in the lockup." },
    partner: { type: "mark", num: 1, default: "", description: "Optional partner mark: the lockup reads mark × partner." },
    layout: { type: "choice", num: 2, options: ["auto", "left", "center", "right"], default: "auto", description: "Globe position (auto: right on wide plates, top on narrow)." },
    spin: { type: "number", num: 3, default: "1", min: 0, max: 6, description: "Rotation speed." },
    hubs: { type: "number", num: 4, default: "6", min: 0, max: MAX_ARCS, description: "How many leading destinations carry the mark (the rest a spark)." },
    headline: { type: "text", slot: 0, default: "GLOBAL REACH", description: "Main line." },
    subline: { type: "text", brand: true, slot: 1, default: "ZEN AI CO · WORLDWIDE", description: "Second line." },
    label: { type: "text", brand: true, slot: 2, default: "D.C.", description: "Label at the origin." },
    micro: { type: "text", brand: true, slot: 3, default: "ZEN AI CO · GLOBAL NETWORK · AI LITERACY WORLDWIDE · ", description: "Edge microprint." },
    stat: { type: "text", brand: true, slot: 4, default: "42 STATES · 12 COUNTRIES", description: "Small figure line." },
  },
  data(d, params) {
    const origin = parsePoints(params.origin)[0] ?? [-77.04, 38.91];
    const points = parsePoints(params.points).slice(0, MAX_ARCS);
    const a = dir(origin);
    d.set([a[0], a[1], a[2], points.length], ORIGIN_VEC4 * 4);
    // Face the middle of the network: halfway between the origin and the
    // centroid of its destinations.
    const m = [a[0], a[1], a[2]];
    for (const ll of points) {
      const b = dir(ll);
      m[0] += b[0] / points.length;
      m[1] += b[1] / points.length;
      m[2] += b[2] / points.length;
    }
    const ml = Math.hypot(m[0], m[1], m[2]);
    const v = ml > 1e-3 ? [m[0] / ml, m[1] / ml, m[2] / ml] : a;
    d.set([Math.atan2(v[0], v[2]), Math.asin(Math.max(-1, Math.min(1, v[1])))], VIEW_VEC4 * 4);
    points.forEach((ll, i) => {
      const b = dir(ll);
      const cosO = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
      const om = Math.acos(Math.max(-1, Math.min(1, cosO)));
      const c = [b[0] - a[0] * cosO, b[1] - a[1] * cosO, b[2] - a[2] * cosO];
      const l = Math.hypot(c[0], c[1], c[2]) || 1;
      d.set([c[0] / l, c[1] / l, c[2] / l, om], (ARC_VEC4 + i) * 4);
    });
  },
  code: /* wgsl */ `
const MAX_ARCS: i32 = ${MAX_ARCS};

/* Globe centre, radius and mode (0 globe right + text, 1 stacked, 2 globe only, 3 globe left + text). */
fn globeGeo() -> vec4f {
  let A: f32 = aspect();
  let mode: f32 = numParam(2);
  let wide: bool = A >= 1.25;
  let rW: f32 = min(0.39, A * 0.25);
  let right: vec4f = vec4f(A * 0.5 - rW - 0.1, -0.03, rW, 0.0);
  let left: vec4f = vec4f(-A * 0.5 + rW + 0.1, -0.03, rW, 3.0);
  let rS: f32 = min(0.27, A * 0.33);
  let stacked: vec4f = vec4f(0.0, 0.5 - rS - 0.1, rS, 1.0);
  let centre: vec4f = vec4f(0.0, 0.0, min(0.4, A * 0.4), 2.0);
  var g: vec4f = select(stacked, right, wide);
  g = select(g, right, (mode > 0.5) && (mode < 1.5));
  g = select(g, centre, (mode > 1.5) && (mode < 2.5));
  g = select(g, left, mode > 2.5);
  return g;
}

/* World → view: turn the globe to longitude lon0, then tilt the pole toward the viewer. */
fn gView(w: vec3f, cy: f32, sy: f32, cx: f32, sx: f32) -> vec3f {
  let a: vec3f = vec3f(w.x * cy + w.z * sy, w.y, -w.x * sy + w.z * cy);
  return vec3f(a.x, a.y * cx - a.z * sx, a.y * sx + a.z * cx);
}
fn gWorld(v: vec3f, cy: f32, sy: f32, cx: f32, sx: f32) -> vec3f {
  let a: vec3f = vec3f(v.x, v.y * cx + v.z * sx, -v.y * sx + v.z * cx);
  return vec3f(a.x * cy - a.z * sy, a.y, a.x * sy + a.z * cy);
}
fn gVisible(v: vec3f) -> bool { return (v.z >= 0.0) || (dot(v.xy, v.xy) > 1.0); }

fn scene(uv: vec2f, p: vec2f) -> vec3f {
  let t: f32 = tnow();
  let g: vec4f = globeGeo();
  let GC: vec2f = g.xy;
  let GR: f32 = g.z;
  let mode: f32 = g.w;
  let px: f32 = pxs();
  let slot: i32 = i32(numParam(0));
  let partner: i32 = i32(numParam(1));
  let hubs: i32 = i32(numParam(4) + 0.5);
  let A3: vec4f = u.d[${ORIGIN_VEC4}];
  let nArcs: i32 = min(i32(A3.w + 0.5), MAX_ARCS);

  // Face the middle of the network, drifting gently either side of it.
  let o: vec3f = A3.xyz;
  let view: vec4f = u.d[${VIEW_VEC4}];
  let lon0: f32 = view.x + 0.42 * sin(t * 0.06 * numParam(3));
  let tilt: f32 = clamp(view.y * 0.8, -0.6, 0.6);
  let cy: f32 = cos(-lon0);
  let sy: f32 = sin(-lon0);
  let cx: f32 = cos(tilt);
  let sx: f32 = sin(tilt);
  let L: vec3f = normalize(vec3f(-0.55, 0.62, 0.58));

  // ── Globe surface ──
  let q: vec2f = (p - GC) / GR;
  let r2: f32 = dot(q, q);
  let rr: f32 = sqrt(r2);
  let disk: f32 = saturate((1.0 - rr) * GR / px + 0.5);
  let z: f32 = sqrt(max(1.0 - r2, 0.0));
  let n: vec3f = vec3f(q, z);
  let wd: vec3f = gWorld(n, cy, sy, cx, sx);
  let ll: vec2f = lonLat(wd);
  let ld: f32 = worldD(ll);
  let lw: f32 = max(fwidth(ld), 1e-5);
  let land: f32 = saturate(0.5 - ld / lw) * disk;
  let coast: f32 = saturate(1.0 - abs(ld) / lw) * disk;
  let lam: f32 = saturate(dot(n, L));
  let lines: f32 = engrave(ll.y, 1.25, 0.18 + 0.5 * (1.0 - lam));
  let glon: f32 = abs(fract(ll.x / 15.0 + 0.5) - 0.5) * 15.0;
  let glat: f32 = abs(fract(ll.y / 15.0 + 0.5) - 0.5) * 15.0;
  let grat: f32 = (saturate(1.0 - glon / max(fwidth(ll.x), 1e-4)) + saturate(1.0 - glat / max(fwidth(ll.y), 1e-4))) * disk;
  let rimIn: f32 = pow(1.0 - z, 3.0) * disk;
  let atmo: f32 = exp(-max(rr - 1.0, 0.0) * GR * 26.0) * (1.0 - disk);
  let spec: f32 = pow(saturate(dot(reflect(vec3f(0.0, 0.0, -1.0), n), L)), 40.0) * disk * (1.0 - land);
  let orbit: f32 = lineCov(abs(rr - 1.12) * GR / px, 0.35) * (0.4 + 0.6 * sstep(-0.2, 0.6, q.y + q.x * 0.3));

  // ── Arcs from the origin ──
  let va: vec3f = gView(o, cy, sy, cx, sx);
  let oP: vec2f = GC + va.xy * GR;
  let oOn: f32 = select(0.0, 1.0, va.z > 0.0);
  var arcs: f32 = 0.0;
  var trail: f32 = 0.0;
  var marks: f32 = 0.0;
  var glow: f32 = 0.0;
  var rings: f32 = 0.0;
  for (var i: i32 = 0; i < MAX_ARCS; i++) {
    if (i < nArcs) {
      let arc: vec4f = u.d[${ARC_VEC4} + i];
      let Cv: vec3f = arc.xyz;
      let om: f32 = arc.w;
      let hub: bool = (i < hubs) && (slot >= 0);
      let lift: f32 = select(0.03 + 0.05 * om, 0.05 + 0.13 * om / PI, hub);
      let ph: f32 = fract(t / select(7.0, 10.0, hub) + f32(i) * 0.173);
      let head: f32 = saturate(ph / 0.6);
      let live: f32 = 1.0 - sstep(0.78, 1.0, ph);
      let mid: vec3f = gView((o * cos(om * 0.5) + Cv * sin(om * 0.5)) * (1.0 + lift), cy, sy, cx, sx);
      let midP: vec2f = GC + mid.xy * GR;
      let reach: f32 = length(oP - midP) + 0.05;
      if (length(p - midP) < reach + 0.06) {
        let da: f32 = om / 12.0;
        let cd: f32 = cos(da);
        let sd: f32 = sin(da);
        var P: vec3f = o;
        var Q: vec3f = Cv;
        var prev: vec2f = oP;
        var prevOn: bool = va.z >= 0.0;
        var best: f32 = 1e9;
        var bestS: f32 = 0.0;
        for (var k: i32 = 1; k <= 12; k++) {
          let nP: vec3f = P * cd + Q * sd;
          Q = Q * cd - P * sd;
          P = nP;
          let s: f32 = f32(k) / 12.0;
          let v: vec3f = gView(P * (1.0 + lift * 4.0 * s * (1.0 - s)), cy, sy, cx, sx);
          let sp: vec2f = GC + v.xy * GR;
          let on: bool = gVisible(v);
          if (on && prevOn) {
            let dseg: f32 = sdSeg(p, prev, sp);
            if (dseg < best) {
              best = dseg;
              bestS = (f32(k) - 1.0 + segT(p, prev, sp)) / 12.0;
            }
          }
          prev = sp;
          prevOn = on;
        }
        let w: f32 = select(0.35, 0.55, hub);
        arcs += lineCov(best / px, w) * 0.5;
        trail += lineCov(best / px, w + 0.35) * sstep(head - 0.35, head, bestS) * step(bestS, head) * live;
      }
      // The traveller: the mark on hub arcs, a spark elsewhere.
      let hv: vec3f = gView((o * cos(om * head) + Cv * sin(om * head)) * (1.0 + lift * 4.0 * head * (1.0 - head)), cy, sy, cx, sx);
      let hp: vec2f = GC + hv.xy * GR;
      let travelling: f32 = select(0.0, 1.0, gVisible(hv)) * sstep(0.0, 0.04, ph) * (1.0 - sstep(0.56, 0.62, ph));
      if (hub) {
        let ms: f32 = GR * (0.2 + 0.05 * hv.z);
        let mdist: f32 = logoDist(slot, p, hp, ms);
        marks += saturate(0.5 - mdist / px) * travelling;
        glow += exp(-max(mdist, 0.0) / (ms * 0.08)) * travelling * 0.5;
      } else {
        glow += exp(-length(p - hp) * 160.0) * travelling;
      }
      let dv: vec3f = gView(o * cos(om) + Cv * sin(om), cy, sy, cx, sx);
      let ring: f32 = sstep(0.6, 0.64, ph) * (1.0 - sstep(0.64, 0.9, ph));
      let rad: f32 = 0.006 + (ph - 0.6) * 0.09;
      let dd: f32 = length(p - (GC + dv.xy * GR));
      rings += (lineCov(abs(dd - rad) / px, 0.6) * ring + fillAA(dd - 0.0045) * 0.6) * select(0.0, 1.0, dv.z > 0.0);
    }
  }

  // The origin beacon and its label.
  let db: f32 = length(p - oP);
  let beacon: f32 = (fillAA(db - 0.007) + exp(-db * 70.0) * (0.5 + 0.5 * sin(t * 2.2)) + lineCov(abs(db - 0.016 - fract(t * 0.6) * 0.03) / px, 0.5) * (1.0 - fract(t * 0.6))) * oOn;
  let lab: f32 = textRunP(p, oP + vec2f(-textWidthP(2, 0.021) - 0.016, 0.03), 0.021, 2, 0.0) * oOn;

  // ── Text block & lockup ──
  let A: f32 = aspect();
  let stackedM: bool = (mode > 0.5) && (mode < 1.5);
  let showText: f32 = select(1.0, 0.0, (mode > 1.5) && (mode < 2.5));
  let x0: f32 = select(GC.x + GR + 0.12, -A * 0.5 + 0.09, mode < 0.5);
  let x1: f32 = select(A * 0.5 - 0.09, GC.x - GR - 0.1, mode < 0.5);
  let W: f32 = select(x1 - x0, A - 0.18, stackedM);
  let kk: f32 = select(1.0, 0.8, stackedM);
  let hs: f32 = textFitP(0, W, 0.072 * kk);
  let ss: f32 = textFitP(1, W, 0.026 * kk);
  let ts: f32 = textFitP(4, W, 0.022 * kk);
  let lockS: f32 = 0.15 * kk;
  let hasPartner: f32 = select(0.0, 1.0, partner >= 0);
  let hasMark: f32 = select(0.0, 1.0, slot >= 0);
  let block: f32 = lockS * hasMark + 0.05 * kk + hs + 0.03 * kk + ss + 0.05 * kk + ts;
  let top: f32 = select(block * 0.5, GC.y - GR - 0.1 * kk, stackedM);
  let lockW: f32 = lockS * (1.0 + hasPartner * 1.55);
  let lx: f32 = select(x0, -lockW * 0.5, stackedM);
  let lockY: f32 = top - lockS * 0.5;
  let m1: f32 = logoDist(slot, p, vec2f(lx + lockS * 0.5, lockY), lockS);
  let lock1: f32 = saturate(0.5 - m1 / px) * hasMark;
  let times: f32 = glyphAt(p, vec2f(lx + lockS * 1.1, lockY + 0.021), 0.042, 100, 0.0) * hasPartner * hasMark;
  let m2: f32 = logoDist(partner, p, vec2f(lx + lockS * 2.05, lockY), lockS * 1.25);
  let lock2: f32 = saturate(0.5 - m2 / px) * hasPartner;
  let hatchA: f32 = engrave(p.x + p.y, 0.0055, 0.6);
  let hatchB: f32 = engrave(p.x * 0.7 - p.y, 0.0052, 0.62);
  let yH: f32 = top - lockS * hasMark - 0.05 * kk;
  let xa: f32 = select(x0, 0.0, stackedM);
  let ox: f32 = select(0.0, 1.0, stackedM);
  let reveal: f32 = saturate((intro() - 0.3) / 0.7);
  let head1: f32 = textDecodeP(p, vec2f(xa - ox * textWidthP(0, hs) * 0.5, yH), hs, 0, 0.3, reveal);
  let yS: f32 = yH - hs - 0.03 * kk;
  let sub: f32 = textRunP(p, vec2f(xa - ox * textWidthP(1, ss) * 0.5, yS), ss, 1, 0.0);
  let yT: f32 = yS - ss - 0.05 * kk;
  let stat: f32 = textRunP(p, vec2f(xa - ox * textWidthP(4, ts) * 0.5, yT), ts, 4, 0.15);
  let inRun: f32 = step(abs(p.x), A * 0.5 - 0.05);
  let micro: f32 = textLoopP(p, -0.462, 0.016, 3, t * 0.012, 0.0) * inRun;

  // ── Light ──
  let ink: vec3f = inkCol(p, 1.5);
  let foil: vec3f = holo(foilPhase(p, 2.2) + 0.15);
  let markCol: vec3f = mix(u.accent.rgb, foil, 0.35);
  let deep: vec3f = mix(u.accent.rgb, vec3f(0.18, 0.4, 0.9), 0.55);
  var c: vec3f = vec3f(0.0);
  c += vec3f(0.012, 0.03, 0.06) * disk * (0.4 + lam);
  c += mix(vec3f(0.55, 0.68, 0.86), foil, 0.3) * land * (0.12 + lines * (0.35 + 0.55 * lam));
  c += mix(silver(), foil, 0.5) * coast * 0.55;
  c += deep * grat * 0.07 * (1.0 - land);
  c += mix(deep, vec3f(0.7, 0.85, 1.0), 0.4) * (rimIn * 0.45 + atmo * 0.55);
  c += vec3f(0.9, 0.95, 1.0) * spec * 0.25 + ink * orbit * 0.35;
  c += mix(deep, silver(), 0.35) * arcs;
  c += mix(vec3f(0.75, 0.9, 1.0), foil, 0.3) * trail * 1.2;
  c += markCol * (marks * (0.75 + 0.25 * hatchB) + glow * 0.5);
  c += vec3f(1.0, 0.92, 0.75) * rings * 0.8;
  c += vec3f(1.0, 0.95, 0.85) * beacon + silver() * lab * 0.8;
  c += showText * (mix(silver(), foil, 0.4) * lock1 * (0.45 + 0.55 * hatchA) + silver() * times * 0.6 + markCol * lock2 * (0.55 + 0.45 * hatchB));
  c += showText * (mix(silver(), holo(foilPhase(p, 1.4) + 0.3), 0.3) * head1 + silver() * sub * 0.7 + mix(u.accent.rgb, silver(), 0.4) * stat * 0.9);
  c += ink * micro * 0.42;
  return c;
}
`,
};
