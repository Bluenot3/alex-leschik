import { layoutText } from "../atlas";
import type { FoilScene } from "../types";

const TEXT = layoutText(
  {
    prompt: "> a glass flask holding a tiny supernova",
    step: "STEP",
    of: "/30",
    seed: "SEED",
    micro: "SPARKLAB AI · PROMPT · SAMPLE · ITERATE · NO-CODE CREATIVE LAB · ",
  },
  0,
);
const T = TEXT.at;

/**
 * SparkLab AI — a creative lab for experimenting with prompts.
 * The prompt is typed, then a diffusion sampler resolves halftone noise
 * into an engraved flask holding a supernova; each cycle re-rolls the seed.
 */
export const spark: FoilScene = {
  id: "spark",
  still: 7.6,
  data(d) {
    TEXT.write(d);
  },
  code: /* wgsl */ `
fn flaskD(p: vec2f) -> f32 {
  let neck: f32 = sdBox(p - vec2f(0.0, 0.205), vec2f(0.028, 0.06));
  let y: f32 = clamp(p.y, -0.21, 0.15);
  let w: f32 = mix(0.19, 0.03, (y + 0.21) / 0.36);
  let body: f32 = max(abs(p.x) - w, abs(p.y + 0.03) - 0.18);
  let rim: f32 = sdRoundBox(p - vec2f(0.0, 0.268), vec2f(0.042, 0.009), 0.006);
  return min(min(neck, body) - 0.008, rim);
}

/* Target image tone for the sampler (0..1) given the variation seed. */
fn sparkTone(p: vec2f, seed: f32) -> f32 {
  let fd: f32 = flaskD(p);
  let inside: f32 = sstep(0.004, -0.004, fd);
  let level: f32 = -0.03 + 0.008 * sin(p.x * 40.0 + tnow() * 1.6);
  let liquid: f32 = inside * sstep(level + 0.004, level - 0.004, p.y);
  let c: vec2f = p - vec2f(0.0, -0.115);
  let r: f32 = length(c);
  let rays: f32 = pow(abs(cos(atan2(c.y, c.x) * (3.0 + floor(h11(seed) * 4.0)) + seed)), 18.0) * exp(-r * 9.0);
  let core: f32 = exp(-r * 30.0);
  let nebula: f32 = saturate(core + rays * 0.9 + fbm(c * 14.0 + vec2f(seed), 3) * 0.6 * exp(-r * 7.0));
  let glass: f32 = exp(-abs(fd) * 160.0) * 0.8;
  return saturate(glass + liquid * (0.28 + nebula * 0.9) + inside * (1.0 - liquid) * 0.05);
}

fn scene(uv: vec2f, p: vec2f) -> vec3f {
  let t: f32 = tnow();
  let cyc: f32 = t / 10.0;
  let k: f32 = fract(cyc);
  let seed: f32 = floor(cyc) * 7.13 + 1.0;
  let a: f32 = ease((k - 0.16) / 0.52) * (1.0 - ease((k - 0.92) / 0.08));
  let q: vec2f = p - vec2f(-0.08, -0.04);

  // Halftone sampler: coarse random cells sharpen into the target image.
  let cell: f32 = mix(0.05, 0.0068, ease(a * 1.05));
  let rq: vec2f = rot2(0.4) * q / cell;
  let id: vec2f = floor(rq);
  let cc: vec2f = (rot2(-0.4) * ((id + 0.5) * cell));
  let noiseT: f32 = h21(id + vec2f(seed * 31.0, seed * 7.0)) * (0.35 + 0.65 * vnoise(cc * 7.0 + seed));
  let tgt: f32 = sparkTone(cc, seed);
  let tone: f32 = mix(noiseT * 0.75, tgt, saturate(a * 1.25 - 0.1));
  let f: vec2f = fract(rq) - 0.5;
  let rad: f32 = sqrt(saturate(tone)) * 0.52;
  let dotsAA: f32 = saturate((rad - length(f)) * cell / pxs() + 0.5);
  let frameBox: f32 = sdBox(q, vec2f(0.33, 0.33));
  let inFrame: f32 = fillAA(frameBox);
  let dots: f32 = mix(PI * rad * rad, dotsAA, sstep(2.0, 4.0, cell / pxs())) * inFrame;

  // The crisp engraving lands as the sampler converges.
  let fd: f32 = flaskD(q);
  let lineArt: f32 = (stroke(fd, 0.8) + engrave(q.y, 0.007, 0.3) * fillAA(fd) * sstep(-0.02, -0.05, q.y)) * sstep(0.82, 1.0, a);

  let frame: f32 = stroke(frameBox, 0.5) + stroke(sdBox(q, vec2f(0.345, 0.345)), 0.3) * 0.6;
  let bar: f32 = sdRoundBox(p - vec2f(0.0, 0.405), vec2f(aspect() * 0.5 - 0.05, 0.032), 0.012);
  let promptBox: f32 = stroke(bar, 0.5);
  let typed: i32 = i32(clamp((k - 0.02) * 260.0, 0.0, ${T.prompt.count}.0));
  let promptText: f32 = textRun(p, vec2f(-aspect() * 0.5 + 0.075, 0.42), 0.028, ${T.prompt.start}, typed, 0.0);
  let caretX: f32 = -aspect() * 0.5 + 0.075 + f32(typed) * 0.028 * 0.6 + 0.008;
  let caret: f32 = fillAA(sdBox(p - vec2f(caretX, 0.405), vec2f(0.006, 0.013))) * step(0.5, fract(t * 1.8));

  let stepN: i32 = i32(floor(a * 30.0 + 0.001));
  let sx: f32 = 0.34;
  let hud: f32 = textRun(p, vec2f(sx, 0.2), 0.02, ${T.step.start}, ${T.step.count}, 0.0)
    + digitCov(p, vec2f(sx, 0.16), 0.05, stepN / 10, 0.0)
    + digitCov(p, vec2f(sx + 0.03, 0.16), 0.05, stepN % 10, 0.0)
    + textRun(p, vec2f(sx + 0.064, 0.13), 0.02, ${T.of.start}, ${T.of.count}, 0.0)
    + textRun(p, vec2f(sx, 0.02), 0.016, ${T.seed.start}, ${T.seed.count}, 0.0);
  var seedDigits: f32 = 0.0;
  let sn: f32 = 40000.0 + floor(h11(seed) * 59999.0);
  for (var j: i32 = 0; j < 5; j++) {
    let pw: f32 = pow(10.0, f32(4 - j));
    seedDigits += digitCov(p, vec2f(sx + f32(j) * 0.0168, -0.005), 0.028, i32(floor(sn / pw) - 10.0 * floor(sn / (pw * 10.0))), 0.0);
  }
  let meter: f32 = fillAA(sdBox(p - vec2f(sx + 0.075, -0.08), vec2f(0.075, 0.003))) * 0.25
    + fillAA(sdBox(p - vec2f(sx + 0.075 * a, -0.08), vec2f(0.075 * a, 0.003)));
  let micro: f32 = textLoop(p, -0.462, 0.016, ${T.micro.start}, ${T.micro.count}, t * 0.012, 0.0);

  let ink: vec3f = inkCol(p, 1.4);
  let hot: vec3f = mix(vec3f(1.0, 0.78, 0.45), holo(foilPhase(q, 3.0)), 0.35);
  let glow: f32 = exp(-length(q - vec2f(0.0, -0.115)) * 9.0) * a;
  var c: vec3f = mix(ink * 0.8, hot, saturate(tone * 1.2 - 0.25)) * dots * 0.95;
  c += silver() * lineArt * 0.55 + hot * glow * 0.35;
  c += ink * (frame * 0.7 + promptBox * 0.55) + silver() * (promptText * 0.9 + caret * 0.8 + hud * 0.75 + seedDigits * 0.55 + meter * 0.8);
  c += ink * micro * 0.4;
  return c;
}
`,
};
