import { layoutText } from "../atlas";
import type { FoilScene } from "../types";

const TEXT = layoutText(
  {
    week: "WEEK",
    of: "OF 4,680",
    cols: "52 WEEKS × 90 YEARS",
    micro: "CHRONOSLIFE · YOUR LIFE IN WEEKS · EVERY SQUARE IS SEVEN DAYS · MAKE THEM COUNT · ",
  },
  0,
);
const T = TEXT.at;

/**
 * ChronosLife — see a life through the lens of time.
 * A lifetime laid out as weeks — 52 across, 90 years deep — receding in
 * perspective; lived weeks are inked, the current one pulses.
 */
export const chronos: FoilScene = {
  id: "chronos",
  still: 5.0,
  data(d) {
    TEXT.write(d);
  },
  code: /* wgsl */ `
fn scene(uv: vec2f, p: vec2f) -> vec3f {
  let t: f32 = tnow();
  // Gentle perspective: birth (row 0) sits far at the top, later years come
  // toward the viewer; cells stay near-square through the depth.
  let horizon: f32 = 1.55;
  let z: f32 = 1.4 / (horizon - p.y);
  let wx: f32 = p.x * z;
  let nowRow: f32 = 34.0;
  let weeksLived: f32 = nowRow * 52.0 + floor(t * 2.5) - 52.0 * floor(t * 2.5 / 52.0);
  let zTop: f32 = 1.4 / (horizon - 0.4);
  let rowF: f32 = (zTop - z) / 0.0108;
  let colF: f32 = (wx + 0.02) / 0.0172 + 26.0;
  let row: f32 = floor(rowF);
  let col: f32 = floor(colF);
  let inGrid: bool = (col >= 0.0) && (col < 52.0) && (row >= 0.0) && (row < 90.0) && (p.y < 0.4);
  let idx: f32 = row * 52.0 + col;
  let lived: f32 = step(idx, weeksLived - 1.0);
  let current: f32 = 1.0 - step(0.5, abs(idx - weeksLived));

  // Cell: rounded square in grid space, AA from screen derivatives.
  let cell: vec2f = vec2f(fract(colF), fract(rowF)) - 0.5;
  let sq: f32 = sdRoundBox(cell, vec2f(0.33), 0.08);
  let fw: f32 = max(fwidth(colF), fwidth(rowF));
  let fillC: f32 = saturate(0.5 - sq / max(fw, 1e-4));
  let ringC: f32 = saturate(1.0 - abs(sq) / max(fw, 1e-4) * 1.2) * (1.0 - lived);
  let fog: f32 = 0.55 + 0.45 * sstep(0.4, -0.2, p.y);
  let decade: f32 = select(0.0, 1.0, fract(row / 10.0 + 0.001) < 0.05);
  let pulse: f32 = 0.6 + 0.4 * sin(t * 4.0);
  let gridOn: f32 = select(0.0, 1.0, inGrid);
  let livedInk: f32 = fillC * lived * gridOn * fog * (1.0 + decade * 0.45);
  let futureInk: f32 = ringC * gridOn * fog;
  let nowInk: f32 = (fillC + exp(-length(cell) * 6.0) * 0.6) * current * gridOn * pulse;

  // Sweep marking "now" across the row.
  let nowZ: f32 = zTop - (nowRow + 0.5) * 0.0108;
  let nowY: f32 = horizon - 1.4 / nowZ;
  let nowLine: f32 = stroke(p.y - nowY, 0.5) * step(abs(p.x), aspect() * 0.5 - 0.04) * 0.5;

  let wk: i32 = i32(weeksLived) + 1;
  let hx: f32 = -aspect() * 0.5 + 0.05;
  var digits: f32 = 0.0;
  for (var j: i32 = 0; j < 4; j++) {
    let pw: f32 = pow(10.0, f32(3 - j));
    digits += digitCov(p, vec2f(hx + f32(j) * 0.034 + select(0.0, 0.012, j > 0), 0.4), 0.058, i32(floor(f32(wk) / pw)) % 10, 0.0);
  }
  let comma: f32 = fillAA(length(p - vec2f(hx + 0.038, 0.348)) - 0.003);
  let labels: f32 = textRun(p, vec2f(hx, 0.448), 0.017, ${T.week.start}, ${T.week.count}, 0.0)
    + textRun(p, vec2f(hx + 0.16, 0.383), 0.017, ${T.of.start}, ${T.of.count}, 0.0)
    + textRun(p, vec2f(aspect() * 0.5 - 0.36, 0.448), 0.0155, ${T.cols.start}, ${T.cols.count}, 0.0);
  let micro: f32 = textLoop(p, -0.468, 0.014, ${T.micro.start}, ${T.micro.count}, t * 0.01, 0.0);

  let ink: vec3f = inkCol(p, 1.0);
  let lifeCol: vec3f = mix(u.accent.rgb, holo(row * 0.011 + foilPhase(p, 0.5)), 0.45);
  var c: vec3f = lifeCol * livedInk * 0.75 + ink * futureInk * 0.35 + vec3f(1.0, 0.9, 0.7) * nowInk * 1.1;
  c += ink * nowLine;
  c += silver() * (digits * 0.9 + comma + labels * 0.65) + ink * micro * 0.4;
  return c;
}
`,
};
