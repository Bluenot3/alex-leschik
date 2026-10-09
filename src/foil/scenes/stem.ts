import { layoutText } from "../atlas";
import type { FoilScene } from "../types";

/* Rubric axes, each centred in a 10-character slot. */
const TEXT = layoutText(
  {
    axes: "INNOVATION  METHOD     DATA     IMPACT    DESIGN   DELIVERY ",
    teams: "TEAM 04TEAM 11TEAM 07TEAM 19TEAM 02",
    score: "CONSENSUS",
    judges: "3 JUDGES",
    micro: "STEMSCORE · RUBRICS · BLIND JUDGING · LIVE LEADERBOARD · COMPETITION PIPELINE · ",
  },
  0,
);
const T = TEXT.at;

/**
 * STEMScore — competition management for STEM judges.
 * Three judges score six rubric axes; their polygons converge on an
 * engraved consensus while the leaderboard re-ranks live.
 */
export const stem: FoilScene = {
  id: "stem",
  still: 5.0,
  data(d) {
    TEXT.write(d);
  },
  code: /* wgsl */ `
const RC: vec2f = vec2f(-0.27, -0.03);
const RR: f32 = 0.3;

fn judgeScore(j: i32, i: i32) -> f32 {
  let t: f32 = tnow();
  return 0.38 + 0.56 * vnoise(vec2f(f32(i) * 3.1 + f32(j) * 11.7, t * 0.22 + f32(j) * 0.7));
}
fn axisDir(i: i32) -> vec2f {
  let a: f32 = PI * 0.5 - f32(i) * TAU / 6.0;
  return vec2f(cos(a), sin(a));
}
/* j = 0..2 judges, j = 3 consensus (mean). */
fn radarV(j: i32, i: i32) -> vec2f {
  let ii: i32 = i % 6;
  var s: f32 = 0.0;
  if (j == 3) {
    s = (judgeScore(0, ii) + judgeScore(1, ii) + judgeScore(2, ii)) / 3.0;
  } else {
    s = judgeScore(j, ii);
  }
  return RC + axisDir(ii) * RR * s;
}
fn radarEdge(p: vec2f, j: i32) -> f32 {
  var d: f32 = 1e9;
  for (var i: i32 = 0; i < 6; i++) {
    d = min(d, sdSeg(p, radarV(j, i), radarV(j, i + 1)));
  }
  return d;
}
fn radarInside(p: vec2f, j: i32) -> f32 {
  let q: vec2f = p - RC;
  let a: f32 = fract(0.25 - atan2(q.y, q.x) / TAU + 1.0) * 6.0;
  let k: i32 = i32(floor(a)) % 6;
  let v0: vec2f = radarV(j, k);
  let v1: vec2f = radarV(j, k + 1);
  let e: vec2f = v1 - v0;
  let sideC: f32 = e.x * (RC.y - v0.y) - e.y * (RC.x - v0.x);
  let sideP: f32 = e.x * (p.y - v0.y) - e.y * (p.x - v0.x);
  return step(0.0, sideC * sideP);
}

fn scene(uv: vec2f, p: vec2f) -> vec3f {
  let t: f32 = tnow();
  let q: vec2f = p - RC;
  let rho: f32 = max(max(abs(q.x), abs(dot(q, vec2f(0.5, 0.8660254)))), abs(dot(q, vec2f(-0.5, 0.8660254)))) / 0.8660254;

  // Engraved web: hexagonal rings, spokes, and a woven guilloche between.
  var web: f32 = 0.0;
  for (var l: i32 = 1; l <= 5; l++) {
    web += stroke((rho - RR * f32(l) * 0.2) * 0.87, select(0.35, 0.6, l == 5));
  }
  var spokes: f32 = 0.0;
  for (var i: i32 = 0; i < 6; i++) {
    spokes += stroke(sdSeg(p, RC, RC + axisDir(i) * RR), 0.35);
  }
  let ang: f32 = atan2(q.y, q.x);
  let weave: f32 = engraveP(rho + 0.006 * sin(ang * 18.0 + rho * 60.0), 0.012, 0.08, pxs()) * step(rho, RR) * 0.35;

  // Judges and consensus.
  let j0: f32 = stroke(radarEdge(p, 0), 0.45);
  let j1: f32 = stroke(radarEdge(p, 1), 0.45) * step(0.5, fract(ang * 9.0 + t * 0.3));
  let j2: f32 = stroke(radarEdge(p, 2), 0.7) * step(0.72, fract(ang * 24.0));
  let inside: f32 = radarInside(p, 3);
  let fillC: f32 = inside * engrave(p.x * 0.5 - p.y, 0.0075, 0.3);
  let edgeC: f32 = stroke(radarEdge(p, 3), 0.9);
  var verts: f32 = 0.0;
  for (var i: i32 = 0; i < 6; i++) {
    verts += fillAA(length(p - radarV(3, i)) - 0.0065);
  }

  var labels: f32 = 0.0;
  for (var i: i32 = 0; i < 6; i++) {
    let anchor: vec2f = RC + axisDir(i) * (RR + 0.048);
    let ls: f32 = 0.0165;
    labels += textRun(p, anchor + vec2f(-3.0 * ls, ls * 0.5), ls, ${T.axes.start} + i * 10, 10, 0.0);
  }

  // Leaderboard.
  let bx: f32 = 0.13;
  let bw: f32 = aspect() * 0.5 - 0.06 - bx - 0.12;
  var best: f32 = 0.0;
  for (var i: i32 = 0; i < 5; i++) {
    best = max(best, vnoise(vec2f(f32(i) * 5.3, t * 0.18)));
  }
  var board: f32 = 0.0;
  var lead: f32 = 0.0;
  var nums: f32 = 0.0;
  for (var i: i32 = 0; i < 5; i++) {
    let y: f32 = 0.26 - f32(i) * 0.115;
    let v: f32 = vnoise(vec2f(f32(i) * 5.3, t * 0.18));
    let isLead: f32 = step(best - 0.0001, v);
    let score: f32 = 70.0 + 28.0 * v;
    let len: f32 = bw * (score - 60.0) / 40.0;
    let bar: f32 = fillAA(sdBox(p - vec2f(bx + len * 0.5, y - 0.03), vec2f(len * 0.5, 0.006)));
    let track: f32 = stroke(sdBox(p - vec2f(bx + bw * 0.5, y - 0.03), vec2f(bw * 0.5, 0.006)), 0.3);
    board += track * 0.5 + bar * (1.0 - isLead) + textRun(p, vec2f(bx, y + 0.012), 0.017, ${T.teams.start} + i * 7, 7, 0.0) * 0.8;
    lead += bar * isLead;
    let sx: f32 = bx + bw + 0.02;
    let s10: i32 = i32(floor(score * 10.0 + 0.5));
    nums += digitCov(p, vec2f(sx, y - 0.012), 0.032, (s10 / 100) % 10, 0.0)
      + digitCov(p, vec2f(sx + 0.0192, y - 0.012), 0.032, (s10 / 10) % 10, 0.0)
      + fillAA(length(p - vec2f(sx + 0.041, y - 0.04)) - 0.002)
      + digitCov(p, vec2f(sx + 0.046, y - 0.012), 0.032, s10 % 10, 0.0);
  }

  var total: f32 = 0.0;
  for (var i: i32 = 0; i < 6; i++) {
    total += (judgeScore(0, i) + judgeScore(1, i) + judgeScore(2, i)) / 3.0;
  }
  let pct: i32 = i32(floor(total / 6.0 * 1000.0 + 0.5));
  let hx: f32 = -aspect() * 0.5 + 0.05;
  let head: f32 = textRun(p, vec2f(hx, 0.45), 0.017, ${T.score.start}, ${T.score.count}, 0.0)
    + textRun(p, vec2f(hx, 0.335), 0.014, ${T.judges.start}, ${T.judges.count}, 0.0)
    + digitCov(p, vec2f(hx, 0.425), 0.06, (pct / 100) % 10, 0.0)
    + digitCov(p, vec2f(hx + 0.036, 0.425), 0.06, (pct / 10) % 10, 0.0)
    + fillAA(length(p - vec2f(hx + 0.077, 0.372)) - 0.003)
    + digitCov(p, vec2f(hx + 0.083, 0.425), 0.06, pct % 10, 0.0);
  let micro: f32 = textLoop(p, -0.465, 0.015, ${T.micro.start}, ${T.micro.count}, t * 0.01, 0.0);

  let ink: vec3f = inkCol(p, 1.5);
  let gold: vec3f = vec3f(1.0, 0.82, 0.48);
  var c: vec3f = ink * (web * 0.5 + spokes * 0.4 + weave * 0.6);
  c += holo(0.1 + foilPhase(p, 1.0)) * j0 * 0.7 + holo(0.45 + foilPhase(p, 1.0)) * j1 * 0.7 + holo(0.75 + foilPhase(p, 1.0)) * j2 * 0.8;
  c += mix(ink, u.accent.rgb, 0.5) * fillC * 0.55 + mix(u.accent.rgb, vec3f(1.0), 0.5) * (edgeC * 1.1 + verts);
  c += ink * board * 0.75 + gold * lead * 0.95 + silver() * (nums * 0.8 + labels * 0.6 + head * 0.85);
  c += ink * micro * 0.4;
  return c;
}
`,
};
