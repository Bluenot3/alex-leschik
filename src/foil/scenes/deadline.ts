import { layoutText } from "../atlas";
import type { FoilScene } from "../types";

const TEXT = layoutText(
  {
    tminus: "T-MINUS",
    mom: "MOMENTUM",
    ship: "SHIP IT",
    micro: "DEADLINEDASH · TURN DEADLINES INTO MOMENTUM · URGENCY-DRIVEN COUNTDOWNS · ",
  },
  0,
);
const T = TEXT.at;

/**
 * DeadlineDash — turn deadlines into momentum.
 * An engraved chronograph runs a live countdown; the arc warms as time
 * runs out, momentum fills as it falls, and zero detonates into speed lines.
 */
export const deadline: FoilScene = {
  id: "deadline",
  still: 6.3,
  data(d) {
    TEXT.write(d);
  },
  code: /* wgsl */ `
const DCN: vec2f = vec2f(-0.3, -0.02);
const DRR: f32 = 0.31;

fn scene(uv: vec2f, p: vec2f) -> vec3f {
  let t: f32 = tnow();
  let period: f32 = 10.0;
  let k: f32 = fract(t / period);
  let run: f32 = saturate(k / 0.9);
  let rem: f32 = 95.0 * (1.0 - run);
  let urgency: f32 = ease(run * 1.15 - 0.15);
  let burst: f32 = saturate((k - 0.9) / 0.1);

  let d: vec2f = p - DCN;
  let r: f32 = length(d);
  let a: f32 = fract(atan2(d.x, d.y) / TAU + 1.0);

  // Bezel: minute ticks, five-minute majors, guilloche field.
  let tickA: f32 = fract(a * 60.0 + 0.5) - 0.5;
  let major: bool = fract(floor(a * 60.0 + 0.5) / 5.0) < 0.01;
  let tickLen: f32 = select(0.022, 0.045, major);
  let ticks: f32 = stroke(tickA * TAU * r / 60.0, select(0.45, 0.9, major)) * step(DRR - tickLen, r) * step(r, DRR);
  let rings: f32 = stroke(r - DRR - 0.012, 0.8) + stroke(r - DRR - 0.022, 0.35) + stroke(r - 0.2, 0.4);
  let guil: f32 = engraveP(r + 0.004 * sin(a * TAU * 24.0 + r * 80.0), 0.009, 0.1, pxs()) * step(r, 0.195);

  // Remaining-time arc, warming as it shortens.
  let remFrac: f32 = 1.0 - run;
  let arcBand: f32 = fillAA(abs(r - 0.235) - 0.012) * step(a, remFrac);
  let arcTrack: f32 = stroke(abs(r - 0.235) - 0.012, 0.35);
  let sweepA: f32 = fract(rem / 60.0);
  let hd: vec2f = vec2f(sin(sweepA * TAU), cos(sweepA * TAU));
  let hand: f32 = stroke(sdSeg(d, -hd * 0.04, hd * 0.27), 0.8) + fillAA(r - 0.012);

  // Countdown digits mm:ss.cc
  let mm: i32 = i32(floor(rem / 60.0));
  let ss: i32 = i32(floor(rem - f32(mm) * 60.0));
  let cc: i32 = i32(floor(fract(rem) * 100.0));
  let x0: f32 = 0.12;
  let sz: f32 = 0.105;
  let adv: f32 = sz * 0.6;
  var digits: f32 = 0.0;
  digits += digitCov(p, vec2f(x0, 0.1), sz, (mm / 10) % 10, 0.2) + digitCov(p, vec2f(x0 + adv, 0.1), sz, mm % 10, 0.2);
  let colon: f32 = fillAA(length(p - vec2f(x0 + adv * 2.0 + 0.012, 0.035)) - 0.006) + fillAA(length(p - vec2f(x0 + adv * 2.0 + 0.012, 0.0)) - 0.006);
  digits += digitCov(p, vec2f(x0 + adv * 2.0 + 0.028, 0.1), sz, (ss / 10) % 10, 0.2) + digitCov(p, vec2f(x0 + adv * 3.0 + 0.028, 0.1), sz, ss % 10, 0.2);
  let csz: f32 = 0.05;
  let cents: f32 = digitCov(p, vec2f(x0 + adv * 4.0 + 0.04, 0.045), csz, (cc / 10) % 10, 0.0) + digitCov(p, vec2f(x0 + adv * 4.0 + 0.04 + csz * 0.6, 0.045), csz, cc % 10, 0.0);

  // Momentum: fills as the clock falls.
  let mw: f32 = aspect() * 0.5 - 0.06 - x0;
  let mbar: f32 = fillAA(sdBox(p - vec2f(x0 + mw * run * 0.5, -0.13), vec2f(mw * run * 0.5, 0.008)));
  let mtrack: f32 = stroke(sdBox(p - vec2f(x0 + mw * 0.5, -0.13), vec2f(mw * 0.5, 0.008)), 0.35);
  var chev: f32 = 0.0;
  for (var i: i32 = 0; i < 6; i++) {
    let cx: f32 = x0 + fract(t * 0.5 + f32(i) / 6.0) * mw;
    let q: vec2f = p - vec2f(cx, -0.18);
    chev += stroke(abs(q.y) * 1.2 - (q.x - 0.0), 0.6) * step(abs(q.y), 0.016) * step(-0.02, q.x) * step(q.x, 0.02) * run;
  }

  // Zero: speed lines and the reset flash.
  let lineId: f32 = floor(a * 72.0);
  let jitter: f32 = h11(lineId * 1.7);
  let streak: f32 = stroke((fract(a * 72.0) - 0.5) * TAU * r / 72.0, 0.6) * step(0.32 + jitter * 0.1 + burst * 0.2, r) * step(r, 0.36 + jitter * 0.2 + burst * 0.75) * burst * (1.0 - burst);
  let flash: f32 = exp(-r * 8.0) * burst * (1.0 - burst) * 4.0;

  let lbl: f32 = textRun(p, vec2f(x0, 0.165), 0.018, ${T.tminus.start}, ${T.tminus.count}, 0.0)
    + textRun(p, vec2f(x0, -0.085), 0.016, ${T.mom.start}, ${T.mom.count}, 0.0)
    + textRun(p, vec2f(x0 + mw - 0.085, -0.085), 0.016, ${T.ship.start}, ${T.ship.count}, 0.0) * run;
  let micro: f32 = textLoop(p, -0.468, 0.014, ${T.micro.start}, ${T.micro.count}, t * 0.01, 0.0);

  let ink: vec3f = inkCol(p, 1.3);
  let cool: vec3f = mix(u.accent.rgb, vec3f(0.6, 0.9, 1.0), 0.3);
  let hot: vec3f = vec3f(1.0, 0.42, 0.3);
  let heat: vec3f = mix(cool, hot, urgency);
  var c: vec3f = ink * (ticks * 0.85 + rings * 0.7 + guil * 0.45 + arcTrack * 0.5);
  c += heat * arcBand * 0.85 + silver() * hand * 0.9;
  c += mix(silver(), heat, 0.35 + urgency * 0.4) * (digits + colon * step(0.5, fract(t * 2.0))) + silver() * cents * 0.6;
  c += heat * (mbar * 0.9 + chev * 0.7) + ink * mtrack * 0.6;
  c += mix(hot, vec3f(1.0, 0.9, 0.7), 0.4) * (streak * 1.2 + flash);
  c += silver() * lbl * 0.7 + ink * micro * 0.4;
  return c;
}
`,
};
