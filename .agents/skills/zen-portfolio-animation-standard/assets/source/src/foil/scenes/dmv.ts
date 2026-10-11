import { layoutText } from "../atlas";
import type { FoilScene } from "../types";

type LonLat = [number, number];

const DC: LonLat = [-77.04, 38.91];
/* Where the program reaches from Washington: the international hubs named in
   ZEN's own operations map first (they carry the hands), then U.S. cities. */
const HUBS: LonLat[] = [
  [-79.38, 43.65], // Toronto
  [-0.13, 51.51], // London
  [13.4, 52.52], // Berlin
  [55.27, 25.2], // Dubai
  [103.82, 1.35], // Singapore
  [139.69, 35.69], // Tokyo
];
const US: LonLat[] = [
  [-87.63, 41.88], [-84.39, 33.75], [-96.8, 32.78], [-104.99, 39.74],
  [-118.24, 34.05], [-122.33, 47.61], [-80.19, 25.76], [-93.27, 44.98],
];
export const DMV_ARCS = HUBS.length + US.length;

const TEXT = layoutText(
  {
    bgc: "BOYS & GIRLS CLUBS",
    of: "OF GREATER WASHINGTON",
    x: "×",
    program: "AI PIONEER PROGRAM",
    reach: "42 STATES · 12 COUNTRIES",
    dc: "D.C.",
    micro: "BOYS & GIRLS CLUBS OF GREATER WASHINGTON × ZEN AI CO · AI PIONEER PROGRAM · ",
  },
  60,
);
const T = TEXT.at;

function dir([lon, lat]: LonLat): [number, number, number] {
  const a = (lon * Math.PI) / 180;
  const b = (lat * Math.PI) / 180;
  return [Math.cos(b) * Math.sin(a), Math.sin(b), Math.cos(b) * Math.cos(a)];
}

/**
 * Boys & Girls Clubs of Greater Washington × ZEN — hands across the globe.
 *
 * An intaglio-engraved Earth (Natural Earth coastlines from the atlas) turns
 * under a holographic atmosphere. From Washington, D.C. the program arcs out
 * across the U.S. and to the hubs on ZEN's operations map, and the Clubs'
 * hands mark rides each international arc, stamping its arrival. The ZEN ×
 * Boys & Girls Clubs lockup is engraved alongside.
 *
 * Data: d[0] = D.C. direction; d[1..14] = arcs (great-circle basis C.xyz,
 * angle Ω) — hubs first; text from float 60.
 */
export const dmv: FoilScene = {
  id: "dmv",
  still: 7.0,
  data(d) {
    const a = dir(DC);
    d.set(a, 0);
    [...HUBS, ...US].forEach((ll, i) => {
      const b = dir(ll);
      const cosO = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
      const om = Math.acos(Math.max(-1, Math.min(1, cosO)));
      const c = [b[0] - a[0] * cosO, b[1] - a[1] * cosO, b[2] - a[2] * cosO];
      const l = Math.hypot(c[0], c[1], c[2]) || 1;
      d.set([c[0] / l, c[1] / l, c[2] / l, om], (1 + i) * 4);
    });
    TEXT.write(d);
  },
  code: /* wgsl */ `
const GLOBE_C: vec2f = vec2f(0.25, -0.045);
const GLOBE_R: f32 = 0.38;
const N_HUBS: i32 = ${HUBS.length};
const N_ARCS: i32 = ${DMV_ARCS};
const BGC_BLUE: vec3f = vec3f(0.18, 0.58, 0.92);

/* World → view: turn the globe to longitude lon0, then tilt the north pole
   toward the viewer. (cy, sy) = cos/sin(-lon0), (cx, sx) = cos/sin(tilt). */
fn gView(w: vec3f, cy: f32, sy: f32, cx: f32, sx: f32) -> vec3f {
  let a: vec3f = vec3f(w.x * cy + w.z * sy, w.y, -w.x * sy + w.z * cy);
  return vec3f(a.x, a.y * cx - a.z * sx, a.y * sx + a.z * cx);
}
fn gWorld(v: vec3f, cy: f32, sy: f32, cx: f32, sx: f32) -> vec3f {
  let a: vec3f = vec3f(v.x, v.y * cx + v.z * sx, -v.y * sx + v.z * cx);
  return vec3f(a.x * cy - a.z * sy, a.y, a.x * sy + a.z * cy);
}
/* View point (unit sphere radius) → plate position; visible unless hidden
   behind the globe. */
fn gScreen(v: vec3f) -> vec2f { return GLOBE_C + v.xy * GLOBE_R; }
fn gVisible(v: vec3f) -> bool { return (v.z >= 0.0) || (dot(v.xy, v.xy) > 1.0); }

/* The Clubs' hands, engraved in blue foil with a soft halo. */
fn handsMark(p: vec2f, c: vec2f, s: f32) -> vec2f {
  let d: f32 = logoDist(LOGO_BGC, p, c, s);
  let fill: f32 = saturate(0.5 - d / pxs());
  let glow: f32 = exp(-max(d, 0.0) / (s * 0.08));
  return vec2f(fill, glow);
}

fn scene(uv: vec2f, p: vec2f) -> vec3f {
  let t: f32 = tnow();
  let lon0: f32 = (-30.0 + 24.0 * sin(t * 0.06)) * (PI / 180.0);
  let tilt: f32 = 0.36;
  let cy: f32 = cos(-lon0);
  let sy: f32 = sin(-lon0);
  let cx: f32 = cos(tilt);
  let sx: f32 = sin(tilt);
  let L: vec3f = normalize(vec3f(-0.55, 0.62, 0.58));

  // ── Globe surface ──
  let q: vec2f = (p - GLOBE_C) / GLOBE_R;
  let r2: f32 = dot(q, q);
  let rr: f32 = sqrt(r2);
  let disk: f32 = saturate((1.0 - rr) * GLOBE_R / pxs() + 0.5);
  let z: f32 = sqrt(max(1.0 - r2, 0.0));
  let n: vec3f = vec3f(q, z);
  let wd: vec3f = gWorld(n, cy, sy, cx, sx);
  let ll: vec2f = lonLat(wd);
  let ld: f32 = worldD(ll);
  let lw: f32 = max(fwidth(ld), 1e-5);
  let land: f32 = saturate(0.5 - ld / lw) * disk;
  let coast: f32 = saturate(1.0 - abs(ld) / lw) * disk;
  let lam: f32 = saturate(dot(n, L));
  // Burin lines follow the parallels; deeper where the land is in shadow.
  let lines: f32 = engrave(ll.y, 1.25, 0.18 + 0.5 * (1.0 - lam));
  let glon: f32 = abs(fract(ll.x / 15.0 + 0.5) - 0.5) * 15.0;
  let glat: f32 = abs(fract(ll.y / 15.0 + 0.5) - 0.5) * 15.0;
  let grat: f32 = (saturate(1.0 - glon / max(fwidth(ll.x), 1e-4)) + saturate(1.0 - glat / max(fwidth(ll.y), 1e-4))) * disk;
  let rimIn: f32 = pow(1.0 - z, 3.0) * disk;
  let atmo: f32 = exp(-max(rr - 1.0, 0.0) * GLOBE_R * 26.0) * (1.0 - disk);
  let spec: f32 = pow(saturate(dot(reflect(vec3f(0.0, 0.0, -1.0), n), L)), 40.0) * disk * (1.0 - land);

  // ── Arcs from Washington ──
  let A: vec3f = u.d[0].xyz;
  let va: vec3f = gView(A, cy, sy, cx, sx);
  let dcP: vec2f = gScreen(va);
  let dcOn: f32 = select(0.0, 1.0, va.z > 0.0);
  var arcs: f32 = 0.0;
  var trail: f32 = 0.0;
  var marks: f32 = 0.0;
  var glow: f32 = 0.0;
  var rings: f32 = 0.0;
  for (var i: i32 = 0; i < N_ARCS; i++) {
    let arc: vec4f = u.d[1 + i];
    let C: vec3f = arc.xyz;
    let om: f32 = arc.w;
    let hub: bool = i < N_HUBS;
    let lift: f32 = select(0.03 + 0.05 * om, 0.05 + 0.13 * om / PI, hub);
    let ph: f32 = fract(t / select(7.0, 10.0, hub) + f32(i) * 0.173);
    let head: f32 = saturate(ph / 0.6);
    let live: f32 = 1.0 - sstep(0.78, 1.0, ph);
    // Cheap reject: bounding circle around the arc's projected midpoint.
    let mid: vec3f = gView((A * cos(om * 0.5) + C * sin(om * 0.5)) * (1.0 + lift), cy, sy, cx, sx);
    let midP: vec2f = gScreen(mid);
    let reach: f32 = length(gScreen(va) - midP) + 0.05;
    if (length(p - midP) < reach + 0.06) {
      let da: f32 = om / 12.0;
      let cd: f32 = cos(da);
      let sd: f32 = sin(da);
      var P: vec3f = A;
      var Q: vec3f = C;
      var prev: vec2f = dcP;
      var prevOn: bool = va.z >= 0.0;
      var best: f32 = 1e9;
      var bestS: f32 = 0.0;
      for (var k: i32 = 1; k <= 12; k++) {
        let nP: vec3f = P * cd + Q * sd;
        Q = Q * cd - P * sd;
        P = nP;
        let s: f32 = f32(k) / 12.0;
        let v: vec3f = gView(P * (1.0 + lift * 4.0 * s * (1.0 - s)), cy, sy, cx, sx);
        let sp: vec2f = gScreen(v);
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
      arcs += lineCov(best / pxs(), w) * 0.5;
      trail += lineCov(best / pxs(), w + 0.35) * sstep(head - 0.35, head, bestS) * step(bestS, head) * live;
    }
    // The traveller: the hands mark on international arcs, a spark at home.
    let hs: f32 = head;
    let hv: vec3f = gView((A * cos(om * hs) + C * sin(om * hs)) * (1.0 + lift * 4.0 * hs * (1.0 - hs)), cy, sy, cx, sx);
    let hp: vec2f = gScreen(hv);
    let travelling: f32 = select(0.0, 1.0, gVisible(hv)) * sstep(0.0, 0.04, ph) * (1.0 - sstep(0.56, 0.62, ph));
    if (hub) {
      let hm: vec2f = handsMark(p, hp, 0.075 + 0.018 * hv.z);
      marks += hm.x * travelling;
      glow += hm.y * travelling * 0.5;
    } else {
      glow += exp(-length(p - hp) * 160.0) * travelling;
    }
    // Arrival: a ring stamps the destination.
    let dv: vec3f = gView(A * cos(om) + C * sin(om), cy, sy, cx, sx);
    let ring: f32 = sstep(0.6, 0.64, ph) * (1.0 - sstep(0.64, 0.9, ph));
    let rad: f32 = 0.006 + (ph - 0.6) * 0.09;
    let dd: f32 = length(p - gScreen(dv));
    rings += (lineCov(abs(dd - rad) / pxs(), 0.6) * ring + fillAA(dd - 0.0045) * 0.6) * select(0.0, 1.0, dv.z > 0.0);
  }

  // Washington: the beacon every arc leaves from.
  let db: f32 = length(p - dcP);
  let beacon: f32 = (fillAA(db - 0.007) + exp(-db * 70.0) * (0.5 + 0.5 * sin(t * 2.2)) + lineCov(abs(db - 0.016 - fract(t * 0.6) * 0.03) / pxs(), 0.5) * (1.0 - fract(t * 0.6))) * dcOn;
  let dcLabel: f32 = textRun(p, dcP + vec2f(-0.062, 0.03), 0.021, ${T.dc.start}, ${T.dc.count}, 0.0) * dcOn;

  // ── Lockup: ZEN × Boys & Girls Clubs ──
  let zd: f32 = logoDist(LOGO_ZEN, p, vec2f(-0.63, 0.205), 0.15);
  let zen: f32 = saturate(0.5 - zd / pxs());
  let zenHatch: f32 = engrave(p.x + p.y, 0.0055, 0.6);
  let xg: f32 = textRun(p, vec2f(-0.558, 0.226), 0.042, ${T.x.start}, 1, 0.0);
  let bm: vec2f = handsMark(p, vec2f(-0.40, 0.20), 0.22);
  let bgcHatch: f32 = engrave(p.x * 0.7 - p.y, 0.0052, 0.62);
  let l1: f32 = textRun(p, vec2f(-0.735, 0.075), 0.034, ${T.bgc.start}, ${T.bgc.count}, 0.25);
  let l2: f32 = textRun(p, vec2f(-0.735, 0.032), 0.0235, ${T.of.start}, ${T.of.count}, 0.0);
  let l3: f32 = textRun(p, vec2f(-0.735, -0.05), 0.026, ${T.program.start}, ${T.program.count}, 0.15);
  let l4: f32 = textRun(p, vec2f(-0.735, -0.092), 0.021, ${T.reach.start}, ${T.reach.count}, 0.0);
  let micro: f32 = textLoop(p, -0.462, 0.017, ${T.micro.start}, ${T.micro.count}, t * 0.012, 0.0);

  // ── Light ──
  let ink: vec3f = inkCol(p, 1.5);
  let foil: vec3f = holo(foilPhase(p, 2.2) + 0.15);
  let blue: vec3f = mix(BGC_BLUE, foil, 0.35);
  var c: vec3f = vec3f(0.0);
  c += vec3f(0.012, 0.03, 0.06) * disk * (0.4 + lam);
  c += mix(vec3f(0.55, 0.68, 0.86), foil, 0.3) * land * (0.12 + lines * (0.35 + 0.55 * lam));
  c += mix(silver(), foil, 0.5) * coast * 0.55;
  c += BGC_BLUE * grat * 0.07 * (1.0 - land);
  c += mix(BGC_BLUE, vec3f(0.7, 0.85, 1.0), 0.4) * (rimIn * 0.45 + atmo * 0.55);
  c += vec3f(0.9, 0.95, 1.0) * spec * 0.25;
  c += mix(BGC_BLUE, silver(), 0.35) * arcs;
  c += mix(vec3f(0.75, 0.9, 1.0), foil, 0.3) * trail * 1.2;
  c += blue * (marks * (0.75 + 0.25 * bgcHatch) + glow * 0.5);
  c += vec3f(1.0, 0.92, 0.75) * rings * 0.8;
  c += vec3f(1.0, 0.95, 0.85) * beacon + silver() * dcLabel * 0.8;
  c += mix(silver(), foil, 0.4) * zen * (0.45 + 0.55 * zenHatch) + silver() * xg * 0.6;
  c += blue * (bm.x * (0.55 + 0.45 * bgcHatch) + bm.y * 0.12);
  c += silver() * (l1 * 0.95 + l2 * 0.6) + mix(BGC_BLUE, silver(), 0.4) * (l3 * 0.9 + l4 * 0.6) + ink * micro * 0.45;
  return c;
}
`,
};
