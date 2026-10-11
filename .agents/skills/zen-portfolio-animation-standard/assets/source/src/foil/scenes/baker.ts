import { layoutText, packPoints } from "../atlas";
import type { FoilScene } from "../types";

/* Pop-up sites at street corners around the medallion (p-space). */
const PINS: [number, number][] = [
  [0.36, 0.25], [0.5, -0.08], [0.31, -0.3], [-0.46, 0.27], [-0.6, -0.17], [-0.36, -0.34], [0.62, 0.2],
];
const TEXT = layoutText(
  {
    rim: "BAKERSPOT · POP-UP PASTRY · FRESH · LOCAL · ON DEMAND · ",
    micro: "BAKERSPOT · ARTISANAL BAKED GOODS ON DEMAND · POP-UP PASTRY MARKETPLACE · ",
  },
  8,
);
const T = TEXT.at;

/**
 * BakerSpot — a pop-up pastry marketplace.
 * A minted medallion with an engraved croissant (steam still rising) over
 * the neighbourhood map, where pop-up pins spring up at street corners.
 */
export const baker: FoilScene = {
  id: "baker",
  still: 5.2,
  data(d) {
    packPoints(PINS, d, 0);
    TEXT.write(d);
  },
  code: /* wgsl */ `
const MC: vec2f = vec2f(-0.04, 0.0);

fn lobe(p: vec2f, i: i32) -> vec3f {
  // (distance, across-lobe coordinate, lobe scale) for croissant segment i = 0..4:
  // a wide crescent of rolled layers, fullest at the centre, horns tapering.
  let fi: f32 = f32(i) - 2.0;
  let af: f32 = abs(fi);
  let ang: f32 = PI * 0.5 - fi * 0.5;
  let dir: vec2f = vec2f(cos(ang), sin(ang));
  let ctr: vec2f = MC + vec2f(0.0, -0.165) + dir * 0.17;
  let tang: vec2f = vec2f(-dir.y, dir.x);
  let q: vec2f = vec2f(dot(p - ctr, tang), dot(p - ctr, dir));
  let s: f32 = 1.0 - af * 0.2;
  let ab: vec2f = vec2f(0.058 * (1.0 - af * 0.12), 0.056 * (1.0 - af * 0.3));
  let k: f32 = length(q / ab);
  return vec3f((k - 1.0) * min(ab.x, ab.y), q.x / ab.x, s);
}

fn pinD(q: vec2f, r: f32) -> f32 {
  let head: f32 = length(q - vec2f(0.0, r * 1.25)) - r;
  let dq: vec2f = rot2(PI * 0.25) * (q - vec2f(0.0, r * 1.05));
  return min(head, sdBox(dq, vec2f(r * 0.78)));
}

fn scene(uv: vec2f, p: vec2f) -> vec3f {
  let t: f32 = tnow();
  let d: vec2f = p - MC;
  let r: f32 = length(d);
  let inMedal: f32 = fillAA(r - 0.272);

  // Neighbourhood: blocks, streets and one diagonal avenue.
  let bs: vec2f = vec2f(0.13, 0.095);
  let cellP: vec2f = (p + vec2f(0.02, 0.01)) / bs;
  let cid: vec2f = floor(cellP);
  let cq: vec2f = (fract(cellP) - 0.5) * bs;
  let block: f32 = sdRoundBox(cq, bs * 0.5 - vec2f(0.011), 0.008);
  let ave: f32 = abs(dot(p - vec2f(0.1, -0.05), normalize(vec2f(0.57, -0.82)))) - 0.016;
  let lot: f32 = max(block, -ave);
  let blockHatch: f32 = engrave(p.x * 0.7 + p.y * 0.7 + h21(cid) * 0.01, 0.0075, 0.16 + 0.12 * h21(cid + vec2f(5.0, 2.0))) * fillAA(lot);
  let curbs: f32 = stroke(lot, 0.45);
  let mapInk: f32 = (blockHatch * 0.55 + curbs * 0.6) * (1.0 - inMedal);

  // Medallion: rim microprint, beads, guilloche field.
  let rimText: f32 = ringText(p, MC, 0.252, 0.03, ${T.rim.start}, ${T.rim.count}, t * 0.05, false);
  let rims: f32 = stroke(r - 0.272, 0.9) + stroke(r - 0.232, 0.5) + stroke(r - 0.226, 0.3);
  let beadA: f32 = fract(atan2(d.x, d.y) / TAU * 72.0) - 0.5;
  let beads: f32 = fillAA(length(vec2f(beadA * TAU * 0.217 / 72.0, r - 0.217)) - 0.0026);
  let guil: f32 = engraveP(r + 0.006 * sin(atan2(d.y, d.x) * 14.0 + r * 50.0), 0.0085, 0.09, pxs()) * step(r, 0.21);
  let field: f32 = guil * 0.5;

  // Croissant: five lobes, tips first so the centre sits on top.
  var body: f32 = 0.0;
  var hatch: f32 = 0.0;
  var seams: f32 = 0.0;
  var cover: f32 = 0.0;
  for (var j: i32 = 0; j < 5; j++) {
    let i: i32 = select(select(select(select(2, 3, j == 3), 1, j == 2), 4, j == 1), 0, j == 0);
    let lb: vec3f = lobe(p, i);
    let inside: f32 = fillAA(lb.x);
    let light: f32 = saturate(0.55 + 0.45 * (p.y - MC.y + 0.02) * 6.0);
    let lines: f32 = engraveP(lb.y, 0.2, 0.35 + light * 0.3, pxs() / 0.055);
    hatch = mix(hatch, lines * (0.55 + light * 0.45), inside);
    seams = mix(seams, 0.0, inside) + stroke(lb.x, 0.7);
    body = max(body, inside);
    cover = max(cover, inside);
  }
  let crumbs: f32 = step(0.985, h21(floor(p / 0.006))) * body;

  // Steam.
  var steam: f32 = 0.0;
  for (var j: i32 = 0; j < 3; j++) {
    let fj: f32 = f32(j);
    let x: f32 = MC.x + (fj - 1.0) * 0.045 + 0.012 * sin(p.y * 32.0 - t * 2.2 + fj * 2.0);
    let rise: f32 = sstep(0.065, 0.09, p.y - MC.y) * (1.0 - sstep(0.15, 0.2, p.y - MC.y));
    steam += stroke(p.x - x, 0.7) * rise * (0.5 + 0.5 * sin(t * 1.3 + fj * 2.0));
  }

  // Pop-up pins spring in one after another.
  var pins: f32 = 0.0;
  var pulses: f32 = 0.0;
  for (var i: i32 = 0; i < 7; i++) {
    let c: vec2f = dPt(0, i);
    let tau: f32 = fract(t / 8.0) * 8.0 - f32(i) * 0.9;
    let shown: f32 = step(0.0, tau);
    let springK: f32 = select(0.0, 1.0 - exp(-tau * 7.0) * cos(tau * 18.0), tau > 0.0);
    let scl: f32 = max(springK, 0.02);
    let pd: f32 = pinD((p - c) / scl, 0.022) * scl;
    pins += (fillAA(pd) * 0.6 + stroke(pd, 0.6)) * shown;
    pulses += stroke(length((p - c) * vec2f(1.0, 2.2)) - fract(tau * 0.6) * 0.07, 0.5) * shown * (1.0 - fract(tau * 0.6));
  }
  let micro: f32 = textLoop(p, -0.468, 0.014, ${T.micro.start}, ${T.micro.count}, t * 0.01, 0.0);

  let ink: vec3f = inkCol(p, 1.2);
  let gold: vec3f = vec3f(1.0, 0.8, 0.5);
  let crust: vec3f = mix(vec3f(1.0, 0.72, 0.42), holo(foilPhase(p, 2.0) + 0.1), 0.25);
  var c: vec3f = ink * mapInk;
  c += mix(ink, gold, 0.35) * (rims * 0.85 + beads * 0.8 + field) * inMedal + mix(ink, gold, 0.35) * rims * (1.0 - inMedal);
  c += silver() * rimText * 0.85;
  c += crust * (hatch * body * 0.95 + seams * 0.6) + vec3f(1.0, 0.9, 0.75) * crumbs * 0.4;
  c += silver() * steam * 0.45;
  c += mix(u.accent.rgb, vec3f(1.0, 0.45, 0.5), 0.5) * (pins * 0.9 + pulses * 0.6);
  c += ink * micro * 0.4;
  return c;
}
`,
};
