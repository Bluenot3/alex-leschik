import { layoutText } from "../atlas";
import type { FoilScene } from "../types";

const TEXT = layoutText(
  {
    prompt: "> a ringed ocean world with violet forests",
    gen: "GENERATING WORLD",
    micro: "PROMPT A PLANET · ZEN AI PIONEER CURRICULUM · DALL·E 3 · GPT-IMAGE · FLUX · ",
  },
  0,
);
const T = TEXT.at;

/**
 * Prompt a Planet — world-building from the Pioneer curriculum.
 * An analytic sphere with procedural continents, engraved oceans and a
 * hatched terminator, rings that pass behind and in front, a moon — and a
 * regeneration sweep that re-rolls the world from a new seed.
 */
export const planet: FoilScene = {
  id: "planet",
  still: 3.0,
  data(d) {
    TEXT.write(d);
  },
  code: /* wgsl */ `
const PC: vec2f = vec2f(-0.12, 0.02);
const PR: f32 = 0.3;

fn landAt(n: vec3f, seed: f32) -> f32 {
  let a: f32 = fbm(n.xy * 2.1 + vec2f(seed, seed * 0.37), 5);
  let b: f32 = fbm(n.yz * 2.1 + vec2f(seed * 0.61, 4.0), 4);
  let c: f32 = fbm(n.zx * 2.1 + vec2f(9.0, seed), 4);
  return (a + b + c) / 3.0;
}

fn ringMask(p: vec2f) -> vec2f {
  // tilted ring plane: returns (ring coverage, 1 if in front half)
  let q: vec2f = rot2(-0.38) * (p - PC);
  let e: vec2f = vec2f(q.x, q.y / 0.24) / PR;
  let r: f32 = length(e);
  let band: f32 = sstep(1.35, 1.37, r) * sstep(1.98, 1.95, r) * (1.0 - sstep(1.62, 1.66, r) * sstep(1.7, 1.66, r) * 0.85);
  return vec2f(band, step(0.0, -q.y));
}

fn scene(uv: vec2f, p: vec2f) -> vec3f {
  let t: f32 = tnow();
  let gen: f32 = t / 11.0;
  let seedNew: f32 = floor(gen) * 3.71 + 2.0;
  let seedOld: f32 = seedNew - 3.71;
  let sweepK: f32 = fract(gen);
  let sweepY: f32 = mix(PC.y + PR + 0.03, PC.y - PR - 0.03, ease(sweepK / 0.22));
  let regen: f32 = step(sweepK, 0.24);

  let d: vec2f = (p - PC) / PR;
  let rr: f32 = dot(d, d);
  let onDisk: f32 = fillAA((sqrt(rr) - 1.0) * PR);
  let z: f32 = sqrt(max(1.0 - rr, 0.0));
  let spin: f32 = t * 0.06 + u.tilt.x * 0.25;
  let n0: vec3f = vec3f(d.x, d.y, z);
  let n: vec3f = vec3f(n0.x * cos(spin) + n0.z * sin(spin), n0.y, -n0.x * sin(spin) + n0.z * cos(spin));
  let useNew: bool = (regen < 0.5) || (p.y > sweepY);
  let seed: f32 = select(seedOld, seedNew, useNew);
  let land: f32 = landAt(n, seed);
  let isLand: f32 = sstep(-0.012, 0.008, land);

  let light: vec3f = normalize(vec3f(-0.55, 0.45, 0.7));
  let lam: f32 = saturate(dot(n0, light));
  let dark: f32 = 1.0 - lam;

  // Engraving: oceans as latitude lines, land as relief contours, the night
  // side as cross-hatching.
  let lat: f32 = asin(clamp(n.y, -1.0, 1.0));
  let ocean: f32 = engrave(lat, 0.045, 0.16 + lam * 0.22) * (1.0 - isLand);
  let relief: f32 = engrave(land, 0.03, 0.25) * isLand + isLand * lam * 0.12;
  let lon: f32 = atan2(n.x, n.z);
  let night: f32 = engrave(lon * 0.6 + lat, 0.06, dark * dark * 0.4) * dark;
  let rim: f32 = pow(1.0 - z, 3.0);
  let atmo: f32 = exp(-max(sqrt(rr) - 1.0, 0.0) * PR * 60.0) * (1.0 - onDisk) * step(1.0, rr) + rim * 0.6 * onDisk;

  // Rings: back half hidden by the planet, front half over it.
  let rm: vec2f = ringMask(p);
  let ringQ: vec2f = rot2(-0.38) * (p - PC);
  let ringLines: f32 = engraveP(length(vec2f(ringQ.x, ringQ.y / 0.24)) / PR, 0.045, 0.32, pxs() / PR * 1.8);
  let ringVis: f32 = rm.x * ringLines * select(1.0 - onDisk, 1.0, rm.y > 0.5);
  let ringShadow: f32 = 1.0 - 0.55 * rm.x * onDisk * step(rm.y, 0.5);

  // Moon.
  let mo: vec2f = PC + vec2f(cos(t * 0.23) * 0.52, sin(t * 0.23) * 0.12 + 0.12);
  let md: f32 = length(p - mo) - 0.035;
  let moonFront: f32 = step(0.0, sin(t * 0.23));
  let moonVis: f32 = select(1.0 - onDisk, 1.0, moonFront > 0.5);
  let moon: f32 = (fillAA(md) * engrave(p.y - mo.y + (p.x - mo.x) * 0.4, 0.006, 0.35) + stroke(md, 0.6)) * moonVis;

  let sweepLine: f32 = stroke(p.y - sweepY, 1.2) * regen * onDisk + exp(-abs(p.y - sweepY) * 80.0) * regen * onDisk * 0.4;
  let stars: f32 = step(0.997, h21(floor(uv * u.res.xy / 2.0) + vec2f(3.0, 1.0))) * (1.0 - onDisk) * (0.5 + 0.5 * sin(t * 2.0 + h21(floor(uv * 90.0)) * 6.0));

  let promptTxt: f32 = textRun(p, vec2f(-aspect() * 0.5 + 0.05, -0.385), 0.022, ${T.prompt.start}, ${T.prompt.count}, 0.0);
  let genTxt: f32 = textRun(p, vec2f(-aspect() * 0.5 + 0.05, 0.45), 0.016, ${T.gen.start}, ${T.gen.count}, 0.0) * regen * step(0.5, fract(t * 2.0));
  let micro: f32 = textLoop(p, -0.468, 0.014, ${T.micro.start}, ${T.micro.count}, t * 0.01, 0.0);

  let ink: vec3f = inkCol(p, 1.2);
  let violet: vec3f = vec3f(0.72, 0.52, 1.0);
  let sea: vec3f = mix(u.accent.rgb, vec3f(0.45, 0.75, 1.0), 0.4);
  var c: vec3f = (sea * ocean * 0.75 + mix(violet, vec3f(0.85, 0.75, 1.0), lam) * relief * 0.95) * onDisk * (0.35 + lam * 0.85) * ringShadow;
  c += ink * night * 0.25 * onDisk;
  c += holo(rim * 1.8 + foilPhase(p, 1.0)) * atmo * 0.85;
  c += mix(ink, holo(foilPhase(ringQ, 2.0) + 0.3), 0.5) * ringVis * 0.8;
  c += silver() * moon * 0.8 + silver() * stars * 0.7;
  c += mix(sea, vec3f(1.0), 0.5) * sweepLine;
  c += silver() * (promptTxt * 0.8 + genTxt * 0.6) + ink * micro * 0.4;
  c += zenStamp(p);
  return c;
}
`,
};
