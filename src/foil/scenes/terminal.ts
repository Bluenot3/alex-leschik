import { layoutText } from "../atlas";
import type { FoilScene } from "../types";

const W = 42;
const LINES = [
  "> explain photosynthesis to a 12-year-old",
  "Plants are solar-powered chefs. They catch",
  "sunlight with chlorophyll, pull in water",
  "and CO2, and cook them into sugar,",
  "breathing out the oxygen we use.",
].map((l) => l.padEnd(W, " ").slice(0, W));

const TEXT = layoutText(
  {
    body: LINES.join(""),
    cands: "sunlightlight   energy  rays    photons ",
    title: "zen://prompt-playground",
    next: "NEXT TOKEN",
    micro: "ZEN AI · MODULE 1 · PIONEERS AGES 11-18 · ",
  },
  0,
);
const T = TEXT.at;

/**
 * Prompt Playground — the terminal Pioneers (ages 11–18) use in Module 1.
 * A prompt is typed, the answer streams in token-sized chunks, and a
 * next-token panel shows the probabilities the model is choosing from.
 */
export const terminal: FoilScene = {
  id: "terminal",
  still: 9.0,
  data(d) {
    TEXT.write(d);
  },
  code: /* wgsl */ `
fn scene(uv: vec2f, p: vec2f) -> vec3f {
  let t: f32 = tnow();
  let cyc: f32 = t - 12.0 * floor(t / 12.0);
  let ax: f32 = aspect() * 0.5;

  // Window chrome.
  let wl: f32 = -ax + 0.05;
  let wr: f32 = 0.27;
  let win: f32 = sdRoundBox(p - vec2f((wl + wr) * 0.5, 0.0), vec2f((wr - wl) * 0.5, 0.42), 0.02);
  let frame: f32 = stroke(win, 0.7);
  let bar: f32 = stroke(p.y - 0.355, 0.45) * step(wl, p.x) * step(p.x, wr);
  var dots: f32 = 0.0;
  for (var i: i32 = 0; i < 3; i++) {
    dots += fillAA(length(p - vec2f(wl + 0.035 + f32(i) * 0.03, 0.388)) - 0.0075);
  }
  let title: f32 = textRun(p, vec2f(wl + 0.14, 0.4), 0.018, ${T.title.start}, ${T.title.count}, 0.0);

  // Text grid.
  let size: f32 = 0.029;
  let lead: f32 = 0.062;
  let x0: f32 = wl + 0.035;
  let y0: f32 = 0.31;
  let promptN: f32 = clamp((cyc - 0.2) * 34.0, 0.0, ${LINES[0].trimEnd().length}.0);
  let streamN: f32 = floor(clamp((cyc - 2.2) * 36.0, 0.0, ${W * 4}.0) / 4.0) * 4.0;
  let ln: f32 = floor((y0 - p.y) / lead);
  let row: i32 = i32(ln);
  let shownN: f32 = select(streamN - f32(row - 1) * ${W}.0, promptN, row == 0);
  let lineY: f32 = y0 - ln * lead;
  let validRow: bool = (ln >= 0.0) && (ln <= 4.0);
  let rowText: f32 = textRun(p, vec2f(x0, lineY), size, ${T.body.start} + clamp(row, 0, 4) * ${W}, i32(clamp(shownN, 0.0, ${W}.0)), 0.0);
  let glyphs: f32 = select(0.0, rowText, validRow);
  let isPrompt: f32 = select(0.0, 1.0, row == 0);

  // Caret: after the prompt while typing, then at the stream head.
  let streaming: bool = cyc > 2.2;
  let headRow: f32 = select(0.0, 1.0 + floor(min(streamN, ${W * 4 - 1}.0) / ${W}.0), streaming);
  let headCol: f32 = select(promptN, streamN - (headRow - 1.0) * ${W}.0, streaming);
  let caretP: vec2f = vec2f(x0 + headCol * size * 0.6 + 0.008, y0 - headRow * lead - size * 0.5);
  let caret: f32 = fillAA(sdBox(p - caretP, vec2f(0.0075, 0.0135))) * step(0.45, fract(t * 1.7));
  let thinking: f32 = step(1.7, cyc) * step(cyc, 2.2);
  var spin: f32 = 0.0;
  for (var i: i32 = 0; i < 3; i++) {
    spin += fillAA(length(p - vec2f(x0 + f32(i) * 0.02, y0 - lead - 0.012)) - 0.004) * (0.4 + 0.6 * step(0.5, fract(t * 3.0 - f32(i) * 0.33)));
  }
  spin *= thinking;

  // CRT texture: scanlines + phosphor bloom inside the window.
  let inside: f32 = fillAA(win);
  let scan: f32 = 0.82 + 0.18 * sin(p.y / pxs() * PI * 0.66);

  // Next-token panel.
  let px0: f32 = 0.33;
  let pw: f32 = ax - 0.05 - px0;
  let settle: f32 = sstep(18.0, 42.0, streamN);
  let chosen: f32 = step(42.0, streamN) * (1.0 - step(70.0, streamN));
  var panel: f32 = 0.0;
  var chosenInk: f32 = 0.0;
  for (var i: i32 = 0; i < 5; i++) {
    let y: f32 = 0.24 - f32(i) * 0.1;
    let truth: f32 = select(select(select(select(0.03, 0.05, i == 3), 0.07, i == 2), 0.12, i == 1), 0.71, i == 0);
    let noiseP: f32 = 0.08 + 0.3 * vnoise(vec2f(f32(i) * 4.1, t * 1.3));
    let prob: f32 = mix(noiseP, truth, settle);
    let lbl: f32 = textRun(p, vec2f(px0, y + 0.014), 0.019, ${T.cands.start} + i * 8, 8, 0.0);
    let barW: f32 = pw * prob;
    let barD: f32 = fillAA(sdBox(p - vec2f(px0 + barW * 0.5, y - 0.03), vec2f(barW * 0.5, 0.0055)));
    let track: f32 = stroke(sdBox(p - vec2f(px0 + pw * 0.5, y - 0.03), vec2f(pw * 0.5, 0.0055)), 0.3) * 0.5;
    let pct: i32 = i32(floor(prob * 100.0 + 0.5));
    let dg: f32 = digitCov(p, vec2f(px0 + pw - 0.04, y + 0.016), 0.024, (pct / 10) % 10, 0.0) + digitCov(p, vec2f(px0 + pw - 0.0256, y + 0.016), 0.024, pct % 10, 0.0);
    let isTop: f32 = select(0.0, 1.0, i == 0);
    panel += lbl * 0.7 + barD * (1.0 - isTop * chosen) + track + dg * 0.6;
    chosenInk += (barD + lbl) * isTop * chosen;
  }
  let nextLbl: f32 = textRun(p, vec2f(px0, 0.37), 0.017, ${T.next.start}, ${T.next.count}, 0.0);
  let micro: f32 = textLoop(p, -0.465, 0.015, ${T.micro.start}, ${T.micro.count}, t * 0.01, 0.0);

  let ink: vec3f = inkCol(p, 1.3);
  let phos: vec3f = mix(u.accent.rgb, vec3f(0.82, 1.0, 0.9), 0.3);
  var c: vec3f = ink * (frame * 0.8 + bar * 0.45) + vec3f(1.0, 0.55, 0.45) * dots * 0.6 + silver() * title * 0.6;
  c += mix(phos, vec3f(1.0, 0.86, 0.6), isPrompt * 0.6) * glyphs * scan * 1.05;
  c += phos * (caret * 0.9 + spin * 0.8) + phos * inside * 0.02;
  c += ink * panel * 0.8 + mix(vec3f(1.0, 0.86, 0.55), holo(foilPhase(p, 2.0)), 0.25) * chosenInk + silver() * nextLbl * 0.65;
  c += ink * micro * 0.4;
  return c;
}
`,
};
