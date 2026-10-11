import { layoutText } from "../atlas";
import type { FoilScene } from "../types";

const TEXT = layoutText(
  {
    capA: "NO. 07 · ETCHING",
    capB: "NO. 12 · OIL ON LINEN",
    capC: "NO. 21 · STUDY",
    micro: "CURATEPRO · CURATE · SHOWCASE · SELL · GALLERY-GRADE PRESENTATION FOR ARTISTS · ",
  },
  0,
);
const T = TEXT.at;

/**
 * CuratePro — portfolio platform for artists.
 * A one-point-perspective gallery: engraved works on the wall, a roving
 * spotlight (follows the pointer), floorboards converging to the vanishing
 * point, and red dots arriving as pieces sell.
 */
export const gallery: FoilScene = {
  id: "gallery",
  still: 4.0,
  data(d) {
    TEXT.write(d);
  },
  code: /* wgsl */ `
fn artA(q: vec2f) -> f32 {
  // mountains over a lake, etched
  let ridge: f32 = 0.1 + 0.18 * abs(sin(q.x * 3.1 + 0.4)) * (1.0 - abs(q.x) * 0.8) - 0.05 * sin(q.x * 9.0);
  let mtn: f32 = sstep(0.0, -0.01, q.y - ridge + 0.2);
  return mtn * engrave(q.x * 0.8 + q.y, 0.03, 0.35) + stroke(q.y - ridge + 0.2, 0.5) * 2.0;
}
fn artB(q: vec2f, t: f32) -> f32 {
  // sun over the sea
  let sun: f32 = fillAA((length(q - vec2f(0.0, 0.08)) - 0.12) * 0.3) * engrave(q.y, 0.022, 0.5);
  let sea: f32 = step(q.y, -0.02) * engrave(q.y + sin(q.x * 10.0 + t) * 0.006, 0.018, 0.22);
  return sun + sea + stroke((q.y + 0.02) * 0.3, 0.5);
}
fn artC(q: vec2f) -> f32 {
  // concentric study
  let r: f32 = length(q - vec2f(0.04, 0.02));
  return engraveP(r, 0.035, 0.2, pxs() * 3.4) * step(r, 0.24) + stroke((r - 0.2) * 0.3, 0.6) + stroke(sdSeg(q, vec2f(-0.25, -0.2), vec2f(0.2, 0.25)) * 0.3, 0.5);
}

fn frameArt(p: vec2f, c: vec2f, hs: vec2f, kind: i32, t: f32) -> vec2f {
  let q: vec2f = (p - c) / hs.y * 0.3;
  let box: f32 = sdBox(p - c, hs);
  let outer: f32 = stroke(box - 0.012, 0.9) + stroke(box - 0.004, 0.4);
  let inner: f32 = fillAA(box);
  let art: f32 = select(select(artC(q), artB(q, t), kind == 1), artA(q), kind == 0) * inner;
  return vec2f(outer, art);
}

fn scene(uv: vec2f, p: vec2f) -> vec3f {
  let t: f32 = tnow();
  let vp: vec2f = vec2f(0.0, 0.06);
  let wall: vec2f = vec2f(0.5, 0.29);
  let wc: vec2f = vec2f(0.0, 0.05);
  let onWall: f32 = fillAA(sdBox(p - wc, wall));

  // Floor: boards converge on the vanishing point, joints recede by 1/z.
  let below: f32 = sstep(wc.y - wall.y + 0.002, wc.y - wall.y - 0.002, p.y);
  let dy: f32 = max(vp.y - p.y, 1e-3);
  let z: f32 = 0.34 / dy;
  let fx: f32 = (p.x - vp.x) * z;
  let boards: f32 = engraveP(fx, 0.16, 0.035, max(fwidth(fx), 1e-5)) * below;
  let joints: f32 = engraveP(z + floor(fx / 0.16) * 0.37, 0.9, 0.018, max(fwidth(z), 1e-5)) * below;
  let fog: f32 = saturate(1.0 / (z * 0.55));

  // Ceiling + side walls as engraved planes.
  let above: f32 = sstep(wc.y + wall.y - 0.002, wc.y + wall.y + 0.002, p.y);
  let zc: f32 = 0.3 / max(p.y - vp.y, 1e-3);
  let track: f32 = engraveP(zc, 0.7, 0.04, max(fwidth(zc), 1e-5)) * above * stroke(p.x * zc * 0.04, 2.5);
  let side: f32 = (1.0 - onWall) * (1.0 - below) * (1.0 - above);
  let sideLines: f32 = engrave(atan2(p.y - vp.y, abs(p.x - vp.x)), 0.05, 0.08) * side * 0.6;
  let corner: f32 = stroke(sdSeg(p, wc + wall, vec2f(aspect(), wc.y + wall.y + (aspect() - wall.x) * 0.55)), 0.5)
    + stroke(sdSeg(p, wc + vec2f(-wall.x, wall.y), vec2f(-aspect(), wc.y + wall.y + (aspect() - wall.x) * 0.55)), 0.5)
    + stroke(sdSeg(p, wc + vec2f(wall.x, -wall.y), vec2f(aspect(), wc.y - wall.y - (aspect() - wall.x) * 0.9)), 0.5)
    + stroke(sdSeg(p, wc - wall, vec2f(-aspect(), wc.y - wall.y - (aspect() - wall.x) * 0.9)), 0.5);
  let wallEdge: f32 = stroke(sdBox(p - wc, wall), 0.6);

  // Works.
  let fa: vec2f = frameArt(p, vec2f(-0.3, 0.07), vec2f(0.1, 0.12), 0, t);
  let fb: vec2f = frameArt(p, vec2f(0.0, 0.09), vec2f(0.13, 0.15), 1, t);
  let fc: vec2f = frameArt(p, vec2f(0.29, 0.06), vec2f(0.09, 0.11), 2, t);
  let frames: f32 = fa.x + fb.x + fc.x;
  let art: f32 = fa.y + fb.y + fc.y;

  // Spotlight: drifts across the wall, follows the pointer when hovered.
  let idle: vec2f = vec2f(sin(t * 0.32) * 0.3, 0.08);
  let aim: vec2f = mix(idle, mouseP(), hov());
  let sd: vec2f = (p - aim) * vec2f(1.0, 0.75);
  let spot: f32 = exp(-dot(sd, sd) * 14.0);
  let cone: f32 = exp(-pow((p.x - aim.x) * 3.0 / max(p.y - aim.y + 0.35, 0.05), 2.0)) * sstep(aim.y, 0.5, p.y) * 0.18;

  // Sold dots arrive one by one.
  let sale: f32 = fract(t / 9.0);
  let dotA: f32 = fillAA(length(p - vec2f(-0.21, -0.075)) - 0.0075) * step(0.2, sale);
  let dotB: f32 = fillAA(length(p - vec2f(0.12, -0.085)) - 0.0075) * step(0.5, sale);
  let dotC: f32 = fillAA(length(p - vec2f(0.37, -0.07)) - 0.0075) * step(0.78, sale);
  let pop: f32 = stroke(length(p - vec2f(0.12, -0.085)) - (sale - 0.5) * 0.5, 0.6) * step(0.5, sale) * exp(-(sale - 0.5) * 30.0);

  let caps: f32 = textRun(p, vec2f(-0.4, -0.083), 0.0125, ${T.capA.start}, ${T.capA.count}, 0.0)
    + textRun(p, vec2f(-0.13, -0.093), 0.0125, ${T.capB.start}, ${T.capB.count}, 0.0)
    + textRun(p, vec2f(0.2, -0.083), 0.0125, ${T.capC.start}, ${T.capC.count}, 0.0);
  let micro: f32 = textLoop(p, -0.468, 0.015, ${T.micro.start}, ${T.micro.count}, t * 0.01, 0.0);

  let ink: vec3f = inkCol(p, 1.2);
  let warm: vec3f = vec3f(1.0, 0.9, 0.74);
  let lit: f32 = 0.35 + spot * 1.4;
  var c: vec3f = ink * (boards * 0.4 * fog + joints * 0.3 * fog + track * 0.35 + sideLines * 0.35 + corner * 0.5 + wallEdge * 0.55);
  c += mix(ink, silver(), 0.5) * frames * (0.55 + spot * 0.8);
  c += mix(ink, warm, 0.45) * art * lit * 0.75;
  c += warm * (spot * 0.06 * onWall + cone);
  c += vec3f(1.0, 0.33, 0.32) * (dotA + dotB + dotC + pop);
  c += silver() * caps * 0.55 + ink * micro * 0.4;
  return c;
}
`,
};
