import { layoutText } from "../atlas";
import type { FoilScene } from "../types";

const TEXT = layoutText(
  {
    summit: "SUMMIT",
    head: "TRAILHEAD",
    camp: "CAMP",
    north: "N",
    scale: "0    1    2 MI",
    micro: "PARKPULSE · LIVE TRAIL CONDITIONS · VISITOR INSIGHTS · RANGER NETWORK · ",
  },
  0,
);
const T = TEXT.at;

/**
 * ParkPulse — live explorer for national parks.
 * A USGS-style engraved topographic sheet: contours with index lines,
 * hachured shade, a lake, and a live trail with a hiker on it.
 */
export const parks: FoilScene = {
  id: "parks",
  still: 9.0,
  data(d) {
    TEXT.write(d);
  },
  code: /* wgsl */ `
fn terrain(p: vec2f) -> f32 {
  let m: vec2f = p - vec2f(0.14, 0.07);
  let massif: f32 = 0.62 * exp(-dot(m * vec2f(1.0, 1.35), m * vec2f(1.0, 1.35)) * 5.5);
  let ridge: f32 = 0.16 * exp(-pow(abs(p.y - 0.42 * p.x - 0.02) * 6.0, 2.0));
  let valley: f32 = -0.12 * exp(-dot(p - vec2f(-0.42, -0.2), p - vec2f(-0.42, -0.2)) * 9.0);
  return massif + ridge + valley + fbm(p * 2.6 + vec2f(5.2, 1.3), 5) * 0.22 + 0.13;
}

fn trailPt(i: i32) -> vec2f {
  if (i == 0) { return vec2f(-0.62, -0.36); }
  if (i == 1) { return vec2f(-0.45, -0.29); }
  if (i == 2) { return vec2f(-0.33, -0.16); }
  if (i == 3) { return vec2f(-0.21, -0.1); }
  if (i == 4) { return vec2f(-0.09, -0.03); }
  if (i == 5) { return vec2f(0.03, 0.015); }
  return vec2f(0.14, 0.07);
}

/* Distance to the trail polyline and normalised position along it. */
fn trailD(p: vec2f) -> vec2f {
  var best: f32 = 1e9;
  var along: f32 = 0.0;
  var acc: f32 = 0.0;
  for (var i: i32 = 0; i < 6; i++) {
    let a: vec2f = trailPt(i);
    let b: vec2f = trailPt(i + 1);
    let seg: f32 = sdSeg(p, a, b);
    let len: f32 = length(b - a);
    if (seg < best) {
      best = seg;
      along = acc + segT(p, a, b) * len;
    }
    acc += len;
  }
  return vec2f(best, along / max(acc, 1e-4));
}

fn scene(uv: vec2f, p: vec2f) -> vec3f {
  let t: f32 = tnow();
  let h: f32 = terrain(p);
  let e: f32 = 0.004;
  let gx: f32 = terrain(p + vec2f(e, 0.0)) - h;
  let gy: f32 = terrain(p + vec2f(0.0, e)) - h;
  let nrm: vec3f = normalize(vec3f(-gx / e, -gy / e, 1.6));
  let sun: vec3f = normalize(vec3f(-0.6, 0.55, 0.6));
  let shadeAmt: f32 = saturate(1.0 - dot(nrm, sun));

  let water: f32 = sstep(0.052, 0.044, h);
  let land: f32 = 1.0 - water;
  let contour: f32 = engrave(h, 0.028, 0.07) * land;
  let index: f32 = engrave(h, 0.14, 0.05) * land;
  let hach: f32 = engrave(dot(p, vec2f(0.7, 0.7)), 0.0075, shadeAmt * shadeAmt * 0.55) * land;
  let shore: f32 = stroke((h - 0.048) / max(length(vec2f(gx, gy)) / e, 0.05), 0.6);
  let lake: f32 = water * engrave(p.y + sin(p.x * 30.0 + t * 0.6) * 0.0015, 0.0085, 0.18);

  let tr: vec2f = trailD(p);
  let dash: f32 = step(0.45, fract(tr.y * 46.0 - t * 0.5));
  let trail: f32 = stroke(tr.x, 0.9) * dash;
  let hikerT: f32 = fract(t * 0.035);
  let hikerA: f32 = abs(tr.y - hikerT);
  let hiker: f32 = fillAA(tr.x - 0.006) * exp(-hikerA * 220.0) + exp(-tr.x * 160.0) * exp(-hikerA * 60.0) * 0.6;

  var pings: f32 = 0.0;
  for (var i: i32 = 0; i < 3; i++) {
    let c: vec2f = select(select(vec2f(0.42, -0.24), vec2f(-0.62, -0.36), i == 1), vec2f(0.14, 0.07), i == 0);
    let dd: f32 = length(p - c);
    let ring: f32 = fract(t * 0.45 + f32(i) * 0.33);
    pings += stroke(dd - ring * 0.07, 0.5) * (1.0 - ring) + fillAA(dd - 0.0055);
  }

  let rose: vec2f = p - vec2f(aspect() * 0.5 - 0.1, 0.36);
  let rr: f32 = length(rose);
  let ra: f32 = atan2(rose.x, rose.y);
  let star: f32 = fillAA(rr - 0.05 * (0.35 + 0.65 * pow(abs(cos(ra * 2.0)), 9.0))) * 0.8;
  let roseRing: f32 = stroke(rr - 0.06, 0.45) + stroke(rr - 0.066, 0.3);
  let ticks: f32 = stroke(rr - 0.063, 1.6) * step(0.93, fract(ra / TAU * 32.0 + 0.5));

  let scaleBar: f32 = stroke(p.y + 0.4, 0.5) * step(-aspect() * 0.5 + 0.06, p.x) * step(p.x, -aspect() * 0.5 + 0.26)
    + fillAA(sdBox(p - vec2f(-aspect() * 0.5 + 0.11, -0.4), vec2f(0.05, 0.004)));

  let labels: f32 = textRun(p, vec2f(0.165, 0.115), 0.019, ${T.summit.start}, ${T.summit.count}, 0.0)
    + textRun(p, vec2f(-0.6, -0.375), 0.017, ${T.head.start}, ${T.head.count}, 0.0)
    + textRun(p, vec2f(0.44, -0.205), 0.017, ${T.camp.start}, ${T.camp.count}, 0.0)
    + textRun(p, vec2f(aspect() * 0.5 - 0.1066, 0.465), 0.022, ${T.north.start}, 1, 0.3)
    + textRun(p, vec2f(-aspect() * 0.5 + 0.055, -0.41), 0.014, ${T.scale.start}, ${T.scale.count}, 0.0);
  let micro: f32 = textLoop(p, -0.465, 0.015, ${T.micro.start}, ${T.micro.count}, t * 0.01, 0.0);

  let ink: vec3f = inkCol(p, 1.2);
  let high: vec3f = holo(h * 2.2 + foilPhase(p, 0.6));
  var c: vec3f = mix(ink, high, 0.35) * (contour * 0.5 + index * 0.85) + ink * hach * 0.42;
  c += vec3f(0.5, 0.75, 1.0) * (lake * 0.45 + shore * 0.7);
  c += vec3f(1.0, 0.72, 0.42) * trail * 0.95 + vec3f(1.0, 0.95, 0.85) * hiker * 1.4;
  c += mix(u.accent.rgb, vec3f(1.0), 0.4) * pings * 0.8;
  c += silver() * (star + roseRing * 0.7 + ticks * 0.5 + scaleBar * 0.7 + labels * 0.75) + ink * micro * 0.4;
  return c;
}
`,
};
