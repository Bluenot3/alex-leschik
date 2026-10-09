import { layoutText, packPoints } from "../atlas";
import type { FoilScene } from "../types";

/* Club sites across the District, Maryland and Northern Virginia (p-space). */
const CLUBS: [number, number][] = [
  [0.06, 0.12], [-0.05, 0.05], [0.11, 0.0], [0.04, -0.09], [0.15, 0.08],
  [0.31, 0.26], [0.4, -0.04], [0.18, 0.33], [0.47, 0.15],
  [-0.3, -0.11], [-0.21, -0.27], [-0.44, 0.06],
];
const TEXT = layoutText(
  {
    dc: "D.C.",
    md: "MARYLAND",
    va: "VIRGINIA",
    micro: "BOYS & GIRLS CLUBS OF GREATER WASHINGTON × ZEN AI CO · AI PIONEER PROGRAM · ",
  },
  32,
);
const { dc: DC, md: MD, va: VA, micro: MICRO } = TEXT.at;

/**
 * Boys & Girls Clubs of Greater Washington × ZEN.
 * The District's diamond, the Potomac and Anacostia, the Beltway — and
 * clubhouses across D.C., Maryland and Virginia drawing members in.
 */
export const dmv: FoilScene = {
  id: "dmv",
  still: 5.5,
  data(d) {
    packPoints(CLUBS, d, 0);
    TEXT.write(d);
  },
  code: /* wgsl */ `
fn potomac(p: vec2f) -> f32 {
  var d: f32 = 1e9;
  d = min(d, sdSeg(p, vec2f(-0.86, 0.41), vec2f(-0.55, 0.30)));
  d = min(d, sdSeg(p, vec2f(-0.55, 0.30), vec2f(-0.36, 0.17)));
  d = min(d, sdSeg(p, vec2f(-0.36, 0.17), vec2f(-0.22, 0.05)));
  d = min(d, sdSeg(p, vec2f(-0.22, 0.05), vec2f(-0.12, -0.06)));
  d = min(d, sdSeg(p, vec2f(-0.12, -0.06), vec2f(-0.03, -0.15)));
  d = min(d, sdSeg(p, vec2f(-0.03, -0.15), vec2f(0.03, -0.28)));
  d = min(d, sdSeg(p, vec2f(0.03, -0.28), vec2f(0.0, -0.41)));
  d = min(d, sdSeg(p, vec2f(0.0, -0.41), vec2f(0.07, -0.56)));
  return d;
}
fn anacostia(p: vec2f) -> f32 {
  var d: f32 = 1e9;
  d = min(d, sdSeg(p, vec2f(0.44, 0.31), vec2f(0.27, 0.15)));
  d = min(d, sdSeg(p, vec2f(0.27, 0.15), vec2f(0.15, 0.0)));
  d = min(d, sdSeg(p, vec2f(0.15, 0.0), vec2f(0.07, -0.10)));
  d = min(d, sdSeg(p, vec2f(0.07, -0.10), vec2f(-0.01, -0.16)));
  return d;
}

fn scene(uv: vec2f, p: vec2f) -> vec3f {
  let t: f32 = tnow();
  let ctr: vec2f = vec2f(0.02, 0.02);
  let dq: vec2f = rot2(PI * 0.25) * (p - ctr);
  let dia: f32 = sdBox(dq, vec2f(0.1414));

  // The District: engraved hatching that runs with the diamond's grain.
  let inside: f32 = fillAA(dia);
  let relief: f32 = fbm(p * 9.0, 3);
  let hatch: f32 = engrave(dq.x + relief * 0.006, 0.0085, 0.2 + relief * 0.3) * inside;
  let border: f32 = stroke(dia, 0.9) + stroke(dia - 0.006, 0.35);

  // Reach: concentric diamonds travelling outward from the District.
  let ring: f32 = engraveP(dia - t * 0.012, 0.022, 0.09, pxs()) * sstep(0.0, 0.02, dia) * (1.0 - sstep(0.08, 0.5, dia));

  // Rivers: Potomac (the District's south-west shore) and the Anacostia.
  let pd: f32 = potomac(p);
  let ad: f32 = anacostia(p);
  let water: f32 = stroke(pd - 0.012, 0.5) + stroke(pd - 0.004, 0.25) * 0.6 + stroke(ad - 0.006, 0.45);
  let flow: f32 = (fillAA(pd - 0.011) + fillAA(ad - 0.005)) * engrave(p.y * 0.6 + p.x * 0.4 + t * 0.004, 0.006, 0.28);

  // The Capital Beltway, with traffic pulses.
  let bp: vec2f = (p - vec2f(0.0, -0.01)) * vec2f(1.0 / 0.53, 1.0 / 0.43);
  let ba: f32 = atan2(bp.y, bp.x);
  let br: f32 = (length(bp) - 1.0 - 0.025 * sin(ba * 3.0 + 1.3)) * 0.46;
  let beltway: f32 = stroke(br - 0.004, 0.45) + stroke(br + 0.004, 0.45);
  let traffic: f32 = (fillAA(abs(br) - 0.0035) * sstep(0.7, 1.0, sin(ba * 24.0 - t * 2.2))) * 0.9;

  // Clubs and members converging on them.
  var clubs: f32 = 0.0;
  var halos: f32 = 0.0;
  var members: f32 = 0.0;
  for (var i: i32 = 0; i < 12; i++) {
    let c: vec2f = dPt(0, i);
    let dc: f32 = length(p - c);
    let ph: f32 = f32(i) * 1.37;
    clubs += fillAA(dc - 0.0062) + stroke(dc - 0.011, 0.4) * 0.7;
    halos += exp(-dc * 38.0) * (0.55 + 0.45 * sin(t * 1.4 + ph));
    for (var k: i32 = 0; k < 5; k++) {
      let a: f32 = f32(k) * 1.2566 + ph + t * 0.18;
      let life: f32 = fract(t * 0.16 + f32(k) * 0.2 + ph * 0.1);
      let r: f32 = 0.11 * (1.0 - life);
      let mp: vec2f = c + vec2f(cos(a), sin(a)) * r;
      members += fillAA(length(p - mp) - 0.0022) * sin(life * PI);
    }
  }

  let dcLabel: f32 = textRun(p, ctr + vec2f(-0.036, 0.028), 0.026, ${DC.start}, ${DC.count}, 0.2);
  let mdLabel: f32 = textRun(p, vec2f(0.29, 0.43), 0.019, ${MD.start}, ${MD.count}, 0.0);
  let vaLabel: f32 = textRun(p, vec2f(-0.58, -0.27), 0.019, ${VA.start}, ${VA.count}, 0.0);
  let micro: f32 = textLoop(p, -0.462, 0.017, ${MICRO.start}, ${MICRO.count}, t * 0.012, 0.0);

  let ink: vec3f = inkCol(p, 1.5);
  let warm: vec3f = vec3f(1.0, 0.86, 0.62);
  var c: vec3f = ink * (hatch * 0.6 + border * 0.9 + ring * 0.5);
  c += mix(ink, vec3f(0.55, 0.8, 1.0), 0.5) * (water * 0.75 + flow * 0.35);
  c += holo(foilPhase(p, 2.0) + 0.4) * (beltway * 0.42 + traffic * 0.8);
  c += mix(u.accent.rgb, warm, 0.6) * (halos * 0.5 + members * 0.9) + vec3f(1.0, 0.97, 0.9) * clubs * 0.9;
  c += silver() * (dcLabel * 0.95 + (mdLabel + vaLabel) * 0.55) + ink * micro * 0.45;
  return c;
}
`,
};
