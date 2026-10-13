import { layoutText } from "../atlas";
import type { FoilScene } from "../types";

const TEXT = layoutText(
  {
    scale: "∞  10  5  3  2  1.5  1 M",
    f: "F/",
    mm: "50MM · 1:1.4",
    micro: "INSPIRELENS · CAPTURE · CURATE · SHARE THE VISUAL MOMENTS THAT MATTER · ",
  },
  0,
);
const T = TEXT.at;

/**
 * InspireLens — capture, curate and share visual moments.
 * An engraved prime lens: knurled barrel, distance scale, a seven-blade
 * iris stepping through f-stops, coated glass that shifts like foil, and
 * heptagonal bokeh drifting behind.
 */
export const lens: FoilScene = {
  id: "lens",
  still: 2.2,
  data(d) {
    TEXT.write(d);
  },
  code: /* wgsl */ `
const LC: vec2f = vec2f(0.16, -0.01);

fn fstop(i: f32) -> f32 {
  return select(select(select(select(select(8.0, 5.6, i < 4.5), 4.0, i < 3.5), 2.8, i < 2.5), 2.0, i < 1.5), 1.4, i < 0.5);
}
fn heptagon(q: vec2f, r: f32, rot: f32) -> f32 {
  var d: f32 = -1e9;
  for (var i: i32 = 0; i < 7; i++) {
    let a: f32 = rot + f32(i) * TAU / 7.0;
    d = max(d, dot(q, vec2f(cos(a), sin(a))) - r);
  }
  return d;
}

fn scene(uv: vec2f, p: vec2f) -> vec3f {
  let t: f32 = tnow();
  let d: vec2f = p - LC;
  let r: f32 = length(d);
  let a: f32 = atan2(d.y, d.x);

  // Iris: steps through the f-stops, easing between them.
  let stepT: f32 = t / 1.6;
  let idx: f32 = floor(stepT) - 6.0 * floor(stepT / 6.0);
  let nextIdx: f32 = select(idx + 1.0, 0.0, idx > 4.5);
  let blend: f32 = ease((fract(stepT) - 0.7) / 0.3);
  let fNow: f32 = mix(fstop(idx), fstop(nextIdx), blend);
  let apR: f32 = 0.2 * 1.4 / fNow;
  let bladeRot: f32 = 0.35 / fNow + t * 0.02;
  let opening: f32 = heptagon(d, apR, bladeRot);
  let inOpen: f32 = fillAA(opening);

  // Blades: hatch parallel to the nearest blade edge.
  var nearest: f32 = 1e9;
  var bladeAng: f32 = 0.0;
  for (var i: i32 = 0; i < 7; i++) {
    let ba: f32 = bladeRot + f32(i) * TAU / 7.0;
    let dd: f32 = dot(d, vec2f(cos(ba), sin(ba))) - apR;
    let better: bool = (dd > 0.0) && (dd < nearest);
    nearest = select(nearest, dd, better);
    bladeAng = select(bladeAng, ba, better);
  }
  let bladeZone: f32 = (1.0 - inOpen) * step(r, 0.25);
  let bladeHatch: f32 = engraveP(dot(d, vec2f(cos(bladeAng), sin(bladeAng))), 0.006, 0.22, pxs()) * bladeZone;
  let bladeEdges: f32 = stroke(opening, 0.8) * step(r, 0.25);
  var seams: f32 = 0.0;
  for (var i: i32 = 0; i < 7; i++) {
    let ba: f32 = bladeRot + f32(i) * TAU / 7.0;
    let corner: vec2f = vec2f(cos(ba + PI / 7.0), sin(ba + PI / 7.0)) * apR / cos(PI / 7.0);
    let dir: vec2f = normalize(vec2f(cos(ba + PI / 7.0 + 1.25), sin(ba + PI / 7.0 + 1.25)));
    seams += stroke(sdSeg(d, corner, corner + dir * 0.3), 0.4) * bladeZone;
  }

  // Coated glass: iridescent reflections that slide with tilt.
  let g1: f32 = exp(-abs(length(d - vec2f(-0.05, 0.06) - u.tilt.xy * 0.03) - 0.07) * 90.0);
  let g2: f32 = exp(-abs(length(d - vec2f(0.04, -0.03) + u.tilt.xy * 0.02) - 0.035) * 120.0);
  let glass: f32 = (g1 + g2 * 0.8) * inOpen;
  let deep: f32 = inOpen * 0.06;

  // Barrel: rings, knurled grip, distance scale.
  let rings: f32 = stroke(r - 0.25, 0.9) + stroke(r - 0.262, 0.4) + stroke(r - 0.3, 0.6) + stroke(r - 0.35, 0.5) + stroke(r - 0.43, 0.9) + stroke(r - 0.442, 0.4);
  let knurl: f32 = step(0.36, r) * step(r, 0.425) * (0.35 + 0.65 * step(0.5, fract(a / TAU * 160.0 + r * 3.0)));
  let focusRot: f32 = sin(t * 0.25) * 0.4 + u.tilt.x * 0.3;
  let scaleTxt: f32 = ringText(p, LC, 0.325, 0.022, ${T.scale.start}, ${T.scale.count}, focusRot - 1.05, true);
  let ticks: f32 = stroke(r - 0.2725, 1.4) * step(0.85, fract((a + focusRot) / TAU * 48.0)) * 0.8;
  let mmTxt: f32 = ringText(p, LC, 0.272, 0.016, ${T.mm.start}, ${T.mm.count}, PI * 0.78, true);
  let index: f32 = fillAA(sdBox(d - vec2f(0.0, 0.353), vec2f(0.004, 0.012)));

  // Bokeh: heptagons drifting behind the lens.
  var bokeh: f32 = 0.0;
  var bokehHue: f32 = 0.0;
  for (var i: i32 = 0; i < 9; i++) {
    let fi: f32 = f32(i);
    let c: vec2f = vec2f(-aspect() * 0.5 + 0.08 + h11(fi * 7.1) * 0.62, -0.42 + fract(h11(fi * 3.3) + t * 0.012 * (0.5 + h11(fi))) * 0.9);
    let rad: f32 = 0.025 + h11(fi * 1.9) * 0.05;
    let hd: f32 = heptagon(p - c, rad, 0.3);
    let disc: f32 = (fillAA(hd) * 0.18 + stroke(hd, 0.6) * 0.5) * step(0.47, r);
    bokeh += disc;
    bokehHue += disc * fi;
  }

  let fx: f32 = -aspect() * 0.5 + 0.06;
  let fLbl: f32 = textRun(p, vec2f(fx, 0.44), 0.05, ${T.f.start}, ${T.f.count}, 0.3);
  let f10: i32 = i32(floor(fNow * 10.0 + 0.5));
  let showTenth: bool = (f10 % 10) != 0;
  let whole: i32 = f10 / 10;
  let fd: f32 = digitCov(p, vec2f(fx + 0.06, 0.44), 0.05, whole, 0.3)
    + select(0.0, fillAA(length(p - vec2f(fx + 0.093, 0.398)) - 0.0035) + digitCov(p, vec2f(fx + 0.1, 0.44), 0.05, f10 % 10, 0.3), showTenth);
  let micro: f32 = textLoop(p, -0.468, 0.014, ${T.micro.start}, ${T.micro.count}, t * 0.01, 0.0);

  let ink: vec3f = inkCol(p, 1.3);
  var c: vec3f = ink * (rings * 0.8 + knurl * 0.32 + ticks * 0.6) + silver() * (scaleTxt * 0.9 + mmTxt * 0.6 + index);
  c += mix(ink, silver(), 0.35) * (bladeHatch * 0.5 + bladeEdges * 0.9 + seams * 0.35);
  c += holo(foilPhase(d, 3.0) + r * 4.0) * glass * 0.9 + mix(u.accent.rgb, vec3f(0.2, 0.25, 0.4), 0.5) * deep;
  c += holo(bokehHue * 0.13 + foilPhase(p, 0.5)) * bokeh * 0.75;
  c += silver() * (fLbl + fd) * 0.85 + ink * micro * 0.4;
  return c;
}
`,
};
