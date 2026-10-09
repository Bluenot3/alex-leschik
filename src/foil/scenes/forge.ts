import { layoutText } from "../atlas";
import type { FoilScene } from "../types";

const TEXT = layoutText(
  {
    code1: "function draw() {",
    code2: "  field.flow(noise(x, y, t));",
    code3: "}",
    micro: "CANVASFORGE · P5.JS CREATIVE ENGINE · GENERATIVE ART · INTERACTIVE VISUALIZATION · ",
  },
  0,
);
const T = TEXT.at;

/**
 * CanvasForge — a p5.js engine for generative art.
 * Streamlines of a divergence-free flow field are the level sets of its
 * stream function; a pen plotter inks them curve by curve.
 */
export const forge: FoilScene = {
  id: "forge",
  still: 7.0,
  data(d) {
    TEXT.write(d);
  },
  code: /* wgsl */ `
fn psi(p: vec2f, t: f32) -> f32 {
  let w: vec2f = p * 1.55 + vec2f(t * 0.035, -t * 0.02);
  let warp: vec2f = vec2f(fbm(w + vec2f(1.7, 9.2), 3), fbm(w + vec2f(8.3, 2.8), 3));
  return fbm(w + warp * 0.9, 5) + p.y * 0.18;
}

fn scene(uv: vec2f, p: vec2f) -> vec3f {
  let t: f32 = tnow();
  let mp: vec2f = mouseP();
  let lens: f32 = exp(-dot(p - mp, p - mp) * 30.0) * hov();
  let s: f32 = psi(p + (p - mp) * lens * 0.08, t);
  let spacing: f32 = 0.0145;
  let band: f32 = floor(s / spacing);
  let lines: f32 = engrave(s, spacing, 0.24);

  // Plotter order: curves are inked one after another, each left to right.
  let cyc: f32 = fract(t / 16.0);
  let order: f32 = fract(band * 0.618034) * 0.86 + (p.x / aspect() + 0.5) * 0.12;
  let drawn: f32 = sstep(cyc * 1.12 - 0.03, cyc * 1.12 - 0.06, order);
  let wet: f32 = exp(-max(cyc * 1.12 - 0.045 - order, 0.0) * 60.0) * drawn;
  let fadeOut: f32 = 1.0 - ease((cyc - 0.93) / 0.07);

  let carriageX: f32 = mix(-aspect() * 0.5, aspect() * 0.5, fract(cyc * 7.0));
  let carriage: f32 = stroke(p.x - carriageX, 0.4) * 0.35 + exp(-abs(p.x - carriageX) * 50.0) * 0.08;
  let rail: f32 = stroke(p.y - 0.455, 0.6) + stroke(p.y - 0.445, 0.3);
  let head: f32 = fillAA(sdRoundBox(p - vec2f(carriageX, 0.45), vec2f(0.018, 0.012), 0.004));

  let panel: f32 = sdRoundBox(p - vec2f(-aspect() * 0.5 + 0.2, -0.33), vec2f(0.17, 0.065), 0.01);
  let panelIn: f32 = fillAA(panel);
  let code: f32 = textRun(p, vec2f(-aspect() * 0.5 + 0.05, -0.28), 0.0165, ${T.code1.start}, ${T.code1.count}, 0.0)
    + textRun(p, vec2f(-aspect() * 0.5 + 0.05, -0.31), 0.0165, ${T.code2.start}, ${T.code2.count}, 0.0)
    + textRun(p, vec2f(-aspect() * 0.5 + 0.05, -0.34), 0.0165, ${T.code3.start}, ${T.code3.count}, 0.0);
  let micro: f32 = textLoop(p, -0.468, 0.014, ${T.micro.start}, ${T.micro.count}, t * 0.01, 0.0);

  let inkA: vec3f = holo(band * 0.071 + foilPhase(p, 0.6));
  let inkB: vec3f = mix(u.accent.rgb, vec3f(1.0, 0.8, 0.55), fract(band * 0.37));
  let inkC: vec3f = mix(inkA, inkB, 0.45);
  var c: vec3f = inkC * lines * (0.18 + 0.82 * drawn) * fadeOut * (1.0 - panelIn * 0.85);
  c += vec3f(1.0, 0.95, 0.85) * lines * wet * 0.6 * fadeOut;
  c += silver() * (carriage + rail * 0.5 + head * 0.8);
  c += inkCol(p, 1.0) * stroke(panel, 0.5) * 0.7 + silver() * code * 0.75 + vec3f(0.01, 0.015, 0.03) * panelIn;
  c += inkCol(p, 1.0) * micro * 0.4;
  return c;
}
`,
};
