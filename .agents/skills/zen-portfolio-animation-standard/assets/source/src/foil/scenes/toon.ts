import { layoutText } from "../atlas";
import type { FoilScene } from "../types";

const TEXT = layoutText(
  {
    fps: "24 FPS",
    frame: "FRAME",
    onion: "ONION SKIN ±5",
    micro: "ANIMATIC PRO · SQUASH & STRETCH · TIMING · SPACING · TOON RENDERING FOR PROFESSIONALS · ",
  },
  0,
);
const T = TEXT.at;

/**
 * Animatic Pro — animation and toon rendering for professionals.
 * The animator's first exercise: a bouncing ball with squash and stretch,
 * cel-shaded and inked, onion skins trailing, keys on the timeline.
 */
export const toon: FoilScene = {
  id: "toon",
  still: 1.92,
  data(d) {
    TEXT.write(d);
  },
  code: /* wgsl */ `
const GROUND: f32 = -0.2;
const BR: f32 = 0.062;

/* Ball state at time s: (centre.xy, squash, travel angle). */
fn ballAt(s: f32) -> vec4f {
  let cyc: f32 = 4.0;
  let k: f32 = s - cyc * floor(s / cyc);
  let x: f32 = -0.58 + k / cyc * 1.06;
  let bounce: f32 = fract(k);
  let hgt: f32 = 0.34 * pow(0.78, floor(k));
  let y: f32 = GROUND + BR + 4.0 * hgt * bounce * (1.0 - bounce);
  let contact: f32 = exp(-min(bounce, 1.0 - bounce) * 30.0);
  let vy: f32 = 4.0 * hgt * (1.0 - 2.0 * bounce);
  let stretch: f32 = saturate(abs(vy) * 0.35) * (1.0 - contact);
  return vec4f(x, y - contact * BR * 0.28, contact * 0.32 - stretch * 0.22, atan2(vy, 0.265));
}

/* Squash (z > 0) widens along the ground; stretch (z < 0) along the travel. */
fn ballD(p: vec2f, st: vec4f) -> f32 {
  let k: f32 = 1.0 + abs(st.z);
  let axis: f32 = select(st.w, 0.0, st.z > 0.0);
  let q: vec2f = rot2(-axis) * (p - st.xy);
  let e: vec2f = q / vec2f(k, 1.0 / k);
  return (length(e) - BR) / k;
}

fn scene(uv: vec2f, p: vec2f) -> vec3f {
  let t: f32 = tnow();
  let fps: f32 = 12.0;
  let s: f32 = floor(t * fps) / fps;
  let st: vec4f = ballAt(s);
  let bd: f32 = ballD(p, st);

  // Cel shading: three bands + ink line + specular.
  let local: vec2f = (p - st.xy) / BR;
  let nz: f32 = sqrt(max(1.0 - dot(local, local), 0.0));
  let lam: f32 = dot(normalize(vec3f(local, nz)), normalize(vec3f(-0.5, 0.6, 0.62)));
  let band: f32 = select(select(0.35, 0.65, lam > 0.2), 1.0, lam > 0.72);
  let inBall: f32 = fillAA(bd);
  let shadeHatch: f32 = engrave(p.x + p.y, 0.006, 0.4) * step(lam, 0.2);
  let inkLine: f32 = stroke(bd, 1.4);
  let spec: f32 = fillAA(length(local - vec2f(-0.38, 0.42)) * BR - BR * 0.16) * inBall;

  // Onion skins and motion path.
  var onion: f32 = 0.0;
  for (var i: i32 = 1; i <= 5; i++) {
    let os: vec4f = ballAt(s - f32(i) * 2.0 / fps);
    onion += stroke(ballD(p, os), 0.55) * (1.0 - f32(i) / 6.0) * (1.0 - inBall);
  }
  var path: f32 = 0.0;
  for (var i: i32 = 0; i < 40; i++) {
    let ps: vec4f = ballAt(s + (f32(i) - 20.0) * 0.05);
    path += fillAA(length(p - ps.xy) - 0.0022) * 0.5;
  }
  let groundLine: f32 = stroke(p.y - GROUND, 0.8) * step(-0.7, p.x) * step(p.x, 0.62);
  let groundHatch: f32 = engraveP(p.x - p.y, 0.012, 0.15, pxs()) * step(p.y, GROUND) * step(GROUND - 0.03, p.y) * step(-0.7, p.x) * step(p.x, 0.62);
  let hgt: f32 = st.y - GROUND - BR;
  let shadowE: vec2f = (p - vec2f(st.x, GROUND + 0.006)) / vec2f(BR * (1.0 - hgt * 1.6), 0.012);
  let shadow: f32 = fillAA((length(shadowE) - 1.0) * 0.01) * saturate(1.0 - hgt * 2.5);

  // Timeline: ticks per frame, keys at contacts and apexes, playhead.
  let tlY: f32 = -0.36;
  let tl0: f32 = -aspect() * 0.5 + 0.05;
  let tl1: f32 = aspect() * 0.5 - 0.05;
  let fpos: f32 = (p.x - tl0) / (tl1 - tl0) * 96.0;
  let onTrack: f32 = step(tl0, p.x) * step(p.x, tl1);
  let tick: f32 = stroke((fract(fpos + 0.5) - 0.5) * (tl1 - tl0) / 96.0, 0.35) * step(abs(p.y - tlY), select(0.008, 0.016, fract(floor(fpos + 0.5) / 12.0) < 0.01)) * onTrack;
  let track: f32 = (stroke(p.y - tlY - 0.022, 0.4) + stroke(p.y - tlY + 0.022, 0.4)) * onTrack;
  let keyX: f32 = (floor(fpos / 12.0 + 0.5) * 12.0) / 96.0 * (tl1 - tl0) + tl0;
  let keyQ: vec2f = rot2(PI * 0.25) * (p - vec2f(keyX, tlY));
  let keys: f32 = (stroke(sdBox(keyQ, vec2f(0.007)), 0.6) + fillAA(sdBox(keyQ, vec2f(0.004)))) * onTrack;
  let frameN: f32 = floor(t * 24.0) - 96.0 * floor(t * 24.0 / 96.0);
  let headX: f32 = tl0 + frameN / 96.0 * (tl1 - tl0);
  let playhead: f32 = stroke(p.x - headX, 0.8) * step(abs(p.y - tlY), 0.05) + fillAA(sdBox(p - vec2f(headX, tlY + 0.055), vec2f(0.01, 0.007)));

  let fi: i32 = i32(frameN);
  let hud: f32 = textRun(p, vec2f(-aspect() * 0.5 + 0.05, 0.45), 0.017, ${T.frame.start}, ${T.frame.count}, 0.0)
    + digitCov(p, vec2f(-aspect() * 0.5 + 0.05, 0.42), 0.05, (fi / 100) % 10, 0.0)
    + digitCov(p, vec2f(-aspect() * 0.5 + 0.08, 0.42), 0.05, (fi / 10) % 10, 0.0)
    + digitCov(p, vec2f(-aspect() * 0.5 + 0.11, 0.42), 0.05, fi % 10, 0.0)
    + textRun(p, vec2f(aspect() * 0.5 - 0.15, 0.45), 0.017, ${T.fps.start}, ${T.fps.count}, 0.0)
    + textRun(p, vec2f(aspect() * 0.5 - 0.25, 0.41), 0.0145, ${T.onion.start}, ${T.onion.count}, 0.0);
  let micro: f32 = textLoop(p, -0.468, 0.014, ${T.micro.start}, ${T.micro.count}, t * 0.01, 0.0);

  let ink: vec3f = inkCol(p, 1.2);
  let ballCol: vec3f = mix(u.accent.rgb, vec3f(1.0, 0.62, 0.42), 0.55);
  var c: vec3f = ballCol * band * inBall * 0.8 * (1.0 - shadeHatch * 0.5) + vec3f(1.0) * spec * 0.9 + silver() * inkLine;
  c += vec3f(0.45, 0.85, 1.0) * onion * 0.7 + ink * path * 0.6;
  c += ink * (groundLine * 0.8 + groundHatch * 0.35) + ink * shadow * 0.2;
  c += ink * (tick * 0.7 + track * 0.5) + vec3f(1.0, 0.8, 0.45) * keys * 0.9 + vec3f(1.0, 0.45, 0.4) * playhead;
  c += silver() * hud * 0.8 + ink * micro * 0.4;
  return c;
}
`,
};
