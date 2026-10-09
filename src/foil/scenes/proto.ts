import { layoutText } from "../atlas";
import type { FoilScene } from "../types";

const TEXT = layoutText(
  {
    concept: "CONCEPT 03 · HANDHELD",
    w: "152",
    h: "84",
    r: "R7",
    sketch: "SKETCH",
    render: "RENDER",
    screen: "ZEN",
    micro: "PROMPT A PROTOTYPE · ZEN AI PIONEERS · DESIGN CONCEPTS FROM DAY ONE · ",
  },
  0,
);
const T = TEXT.at;

/**
 * Prompt a Prototype — rapid design concepts for ZEN AI Pioneers.
 * A handheld console as a dimensioned blueprint; a render sweep turns the
 * sketch into a shaded, engraved product shot.
 */
export const proto: FoilScene = {
  id: "proto",
  still: 4.0,
  data(d) {
    TEXT.write(d);
  },
  code: /* wgsl */ `
const BC: vec2f = vec2f(0.0, 0.0);

fn bodyD(p: vec2f) -> f32 { return sdRoundBox(p - BC, vec2f(0.36, 0.2), 0.07); }
fn screenD(p: vec2f) -> f32 { return sdRoundBox(p - vec2f(0.0, 0.035), vec2f(0.15, 0.112), 0.014); }
fn padD(p: vec2f) -> f32 {
  let q: vec2f = p - vec2f(-0.255, -0.01);
  return min(sdRoundBox(q, vec2f(0.048, 0.015), 0.004), sdRoundBox(q, vec2f(0.015, 0.048), 0.004));
}
fn btnD(p: vec2f) -> f32 {
  return min(length(p - vec2f(0.265, 0.012)) - 0.024, length(p - vec2f(0.215, -0.045)) - 0.024);
}
fn pillD(p: vec2f) -> f32 {
  return min(sdRoundBox(p - vec2f(-0.035, -0.155), vec2f(0.022, 0.007), 0.007), sdRoundBox(p - vec2f(0.035, -0.155), vec2f(0.022, 0.007), 0.007));
}
fn arrowHead(p: vec2f, tip: vec2f, dir: vec2f) -> f32 {
  let q: vec2f = p - tip;
  let along: f32 = dot(q, -dir);
  let across: f32 = abs(dot(q, vec2f(-dir.y, dir.x)));
  return fillAA(max(across - along * 0.32, along - 0.018));
}

fn scene(uv: vec2f, p: vec2f) -> vec3f {
  let t: f32 = tnow();
  let k: f32 = fract(t / 9.0);
  let sx: f32 = mix(-aspect() * 0.5 - 0.05, aspect() * 0.5 + 0.05, ease((k - 0.08) / 0.62));
  let rendered: f32 = sstep(sx + 0.003, sx - 0.003, p.x) * (1.0 - ease((k - 0.9) / 0.1));
  let sketch: f32 = 1.0 - rendered;

  let bd: f32 = bodyD(p);
  let sd: f32 = screenD(p);
  let pd: f32 = padD(p);
  let bt: f32 = btnD(p);
  let pl: f32 = pillD(p);
  let outline: f32 = stroke(bd, 0.55) + stroke(sd, 0.45) + stroke(pd, 0.45) + stroke(bt, 0.45) + stroke(pl, 0.45);

  // Blueprint layer.
  let grid: f32 = max(engraveP(p.x, 0.025, 0.04, pxs()), engraveP(p.y, 0.025, 0.04, pxs())) * 0.5
    + max(engraveP(p.x, 0.125, 0.02, pxs()), engraveP(p.y, 0.125, 0.02, pxs()));
  let centre: f32 = (stroke(p.x, 0.35) * step(abs(p.y), 0.3) + stroke(p.y - 0.035, 0.35) * step(abs(p.x), 0.45)) * step(0.4, fract((p.x + p.y) * 22.0));
  let dimY: f32 = -0.27;
  let dimH: f32 = stroke(p.y - dimY, 0.4) * step(-0.36, p.x) * step(p.x, 0.36)
    + stroke(p.x + 0.36, 0.4) * step(dimY - 0.015, p.y) * step(p.y, -0.21)
    + stroke(p.x - 0.36, 0.4) * step(dimY - 0.015, p.y) * step(p.y, -0.21)
    + arrowHead(p, vec2f(-0.36, dimY), vec2f(-1.0, 0.0)) + arrowHead(p, vec2f(0.36, dimY), vec2f(1.0, 0.0));
  let dimX: f32 = 0.45;
  let dimV: f32 = stroke(p.x - dimX, 0.4) * step(-0.2, p.y) * step(p.y, 0.2)
    + stroke(p.y - 0.2, 0.4) * step(0.39, p.x) * step(p.x, dimX + 0.015)
    + stroke(p.y + 0.2, 0.4) * step(0.39, p.x) * step(p.x, dimX + 0.015)
    + arrowHead(p, vec2f(dimX, 0.2), vec2f(0.0, 1.0)) + arrowHead(p, vec2f(dimX, -0.2), vec2f(0.0, -1.0));
  let leader: f32 = stroke(sdSeg(p, vec2f(-0.31, 0.15), vec2f(-0.42, 0.27)), 0.4) + stroke(sdSeg(p, vec2f(-0.42, 0.27), vec2f(-0.5, 0.27)), 0.4);
  let dimText: f32 = textRun(p, vec2f(-0.03, dimY + 0.035), 0.022, ${T.w.start}, ${T.w.count}, 0.0)
    + textRun(p, vec2f(dimX + 0.02, 0.012), 0.022, ${T.h.start}, ${T.h.count}, 0.0)
    + textRun(p, vec2f(-0.5, 0.305), 0.022, ${T.r.start}, ${T.r.count}, 0.0);
  let blueprint: f32 = grid * 0.35 + centre * 0.5 + dimH + dimV + leader + dimText;

  // Render layer: bevelled body, glass screen with a tiny scene, lit controls.
  let e: f32 = 0.004;
  let bnx: f32 = bodyD(p + vec2f(e, 0.0)) - bd;
  let bny: f32 = bodyD(p + vec2f(0.0, e)) - bd;
  let bevel: f32 = sstep(-0.03, 0.0, bd);
  let facing: f32 = saturate(0.5 + 0.5 * dot(normalize(vec2f(bnx, bny) + vec2f(1e-5)), vec2f(-0.7, 0.7))) * bevel;
  let bodyIn: f32 = fillAA(bd) * (1.0 - fillAA(sd - 0.006));
  let shading: f32 = engrave(p.x * 0.55 + p.y, 0.0068, 0.2 + facing * 0.55 - fillAA(sd - 0.02) * 0.1) * bodyIn;
  let glassIn: f32 = fillAA(sd);
  let sq: vec2f = (p - vec2f(0.0, 0.035)) / vec2f(0.15, 0.112);
  let pix: vec2f = floor(sq * vec2f(24.0, 18.0));
  let sunP: f32 = step(length(pix - vec2f(5.0, 5.0 + sin(t) * 1.5)), 3.2);
  let hills: f32 = step(pix.y, -6.0 + 2.0 * sin(pix.x * 0.5 + t * 1.5));
  let screenPx: f32 = (sunP + hills * 0.6) * glassIn * step(0.2, fract(sq.y * 9.0 * 2.0)) * 0.9;
  let screenTxt: f32 = textRun(p, vec2f(-0.03, 0.135), 0.03, ${T.screen.start}, ${T.screen.count}, 0.2) * glassIn;
  let glare: f32 = glassIn * sstep(0.08, 0.0, abs(dot(p - vec2f(0.0, 0.035), vec2f(0.7, 0.7)) - 0.05 + u.tilt.x * 0.04)) * 0.18;
  let ctrls: f32 = fillAA(pd) * (0.5 + 0.5 * engrave(p.y, 0.005, 0.5)) + fillAA(bt) * (0.6 + 0.4 * sstep(0.0, -0.02, bt)) + fillAA(pl) * 0.6;
  let spec: f32 = exp(-length(p - vec2f(0.255, 0.024)) * 160.0) + exp(-length(p - vec2f(0.205, -0.033)) * 160.0);
  let shadow: f32 = (1.0 - fillAA(bd)) * exp(-max(bodyD(p + vec2f(-0.02, 0.035)), 0.0) * 40.0) * 0.25;

  let sweepGlow: f32 = exp(-abs(p.x - sx) * 90.0) * step(k, 0.72) * step(0.06, k);
  let tags: f32 = (textRun(p, vec2f(sx - 0.115, 0.44), 0.016, ${T.render.start}, ${T.render.count}, 0.0) + textRun(p, vec2f(sx + 0.02, 0.44), 0.016, ${T.sketch.start}, ${T.sketch.count}, 0.0)) * step(k, 0.72) * step(0.08, k);
  let conceptLbl: f32 = textRun(p, vec2f(-aspect() * 0.5 + 0.05, 0.45), 0.017, ${T.concept.start}, ${T.concept.count}, 0.0);
  let micro: f32 = textLoop(p, -0.468, 0.014, ${T.micro.start}, ${T.micro.count}, t * 0.01, 0.0);

  let ink: vec3f = inkCol(p, 1.3);
  let cyan: vec3f = vec3f(0.42, 0.82, 1.0);
  var c: vec3f = cyan * (blueprint * 0.55 + outline * 0.9) * sketch;
  c += (mix(ink, silver(), 0.4) * (shading * 0.8 + outline * 0.6) + silver() * ctrls * 0.55 + vec3f(1.0) * spec * 0.8) * rendered;
  c += (mix(u.accent.rgb, vec3f(0.6, 1.0, 0.85), 0.4) * screenPx * 0.7 + silver() * screenTxt + holo(foilPhase(p, 3.0)) * glare) * rendered;
  c += vec3f(0.0) * shadow + holo(foilPhase(p, 2.0) + 0.2) * sweepGlow * 0.8;
  c += silver() * (tags * 0.7 + conceptLbl * 0.7) + ink * micro * 0.4;
  return c;
}
`,
};
