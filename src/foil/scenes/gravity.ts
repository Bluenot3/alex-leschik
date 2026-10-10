import type { FoilScene } from "../types";

/**
 * GravityGrid — physics simulation of gravity and spacetime.
 * A ray-marched embedding diagram: the coordinate sheet sags under an
 * orbiting binary (Plummer potentials); the pointer drops a third mass.
 */
export const gravity: FoilScene = {
  id: "gravity",
  still: 3.2,
  code: /* wgsl */ `
fn ggSheet(xz: vec2f, pm: vec2f) -> f32 {
  let t: f32 = tnow() * 0.42;
  let c: vec2f = vec2f(cos(t), sin(t));
  let a: vec2f = xz - c * 0.40;
  let b: vec2f = xz + c * 0.29;
  let m: vec2f = xz - pm;
  return -0.040 / sqrt(dot(a, a) + 0.011) - 0.055 / sqrt(dot(b, b) + 0.013) - 0.026 * hov() / sqrt(dot(m, m) + 0.010);
}

fn scene(uv: vec2f, p: vec2f) -> vec3f {
  let ro: vec3f = vec3f(0.0, 1.1, -1.9);
  let ta: vec3f = vec3f(0.0, -0.45, 0.25);
  let fw: vec3f = normalize(ta - ro);
  let rt: vec3f = normalize(cross(vec3f(0.0, 1.0, 0.0), fw));
  let up: vec3f = cross(fw, rt);
  let rd: vec3f = normalize(fw * 1.55 + rt * p.x + up * p.y);

  let mp: vec2f = mouseP();
  let rdm: vec3f = normalize(fw * 1.55 + rt * mp.x + up * mp.y);
  let pm: vec2f = ro.xz + rdm.xz * (-ro.y / min(rdm.y, -0.05));

  let hit: bool = rd.y < -0.01;
  var lo: f32 = -ro.y / min(rd.y, -0.01);
  var hi: f32 = lo;
  var done: bool = false;
  for (var i: i32 = 0; i < 44; i++) {
    if (!done) {
      let pos: vec3f = ro + rd * hi;
      if (pos.y < ggSheet(pos.xz, pm)) {
        done = true;
      } else {
        lo = hi;
        hi = hi + 0.03 + hi * 0.015;
      }
    }
  }
  for (var j: i32 = 0; j < 6; j++) {
    let mid: f32 = 0.5 * (lo + hi);
    let pos: vec3f = ro + rd * mid;
    let below: bool = pos.y < ggSheet(pos.xz, pm);
    hi = select(hi, mid, below);
    lo = select(mid, lo, below);
  }
  let th: f32 = 0.5 * (lo + hi);
  let sp: vec3f = ro + rd * th;
  let h: f32 = ggSheet(sp.xz, pm);

  let e: f32 = 0.004;
  let hx: f32 = ggSheet(sp.xz + vec2f(e, 0.0), pm) - h;
  let hz: f32 = ggSheet(sp.xz + vec2f(0.0, e), pm) - h;
  let n: vec3f = normalize(vec3f(-hx / e, 1.0, -hz / e));
  let depth: f32 = saturate(-h * 1.4);
  let facing: f32 = saturate(dot(n, -rd));
  let rim: f32 = pow(1.0 - facing, 2.0);

  let gs: f32 = 0.085;
  let tone: f32 = 0.055 + depth * 0.11;
  let gx: f32 = engrave(sp.x, gs, tone);
  let gz: f32 = engrave(sp.z, gs, tone);
  let fine: f32 = max(engrave(sp.x, gs * 0.25, 0.05), engrave(sp.z, gs * 0.25, 0.05)) * 0.35;
  let fog: f32 = exp(-max(th - 1.6, 0.0) * 0.55);
  let grid: f32 = (max(gx, gz) + fine) * fog * select(0.0, 1.0, hit);

  let tt: f32 = tnow() * 0.42;
  let cc: vec2f = vec2f(cos(tt), sin(tt));
  let orbitA: f32 = stroke(length(sp.xz) - 0.40, 0.45) * step(0.5, fract(atan2(sp.z, sp.x) * 7.0)) * fog;
  let orbitB: f32 = stroke(length(sp.xz) - 0.29, 0.45) * fog * 0.6;

  // Masses glow at the floor of their wells (projected to screen).
  var orbs: f32 = 0.0;
  var cores: f32 = 0.0;
  for (var k: i32 = 0; k < 3; k++) {
    let bodyXZ: vec2f = select(select(-cc * 0.29, pm, k == 2), cc * 0.40, k == 0);
    let weight: f32 = select(select(1.0, hov(), k == 2), 0.8, k == 0);
    let wp: vec3f = vec3f(bodyXZ.x, ggSheet(bodyXZ, pm) + 0.04, bodyXZ.y);
    let v: vec3f = wp - ro;
    let z: f32 = dot(v, fw);
    let sp2: vec2f = vec2f(dot(v, rt), dot(v, up)) / z * 1.55;
    let dd: f32 = length(p - sp2);
    let rad: f32 = select(select(0.024, 0.014, k == 2), 0.019, k == 0);
    orbs += exp(-dd / rad * 1.6) * weight;
    cores += fillAA(dd - rad * 0.36) * weight;
  }

  let stars: f32 = step(0.9965, h21(floor(uv * u.res.xy / 2.0))) * (1.0 - sstep(-0.05, 0.12, -p.y + 0.15)) * select(1.0, 0.0, hit);
  let ink: vec3f = inkCol(sp.xz * 0.8, 1.4);
  var c: vec3f = ink * grid * (0.42 + rim * 0.9 + depth * 0.65);
  c += holo(depth * 1.6 + foilPhase(p, 0.8)) * grid * depth * 0.55;
  c += u.accent.rgb * (orbitA * 0.5 + orbitB * 0.35);
  c += mix(u.accent.rgb, vec3f(1.0, 0.92, 0.78), 0.55) * orbs * 0.9 + vec3f(1.0) * cores;
  c += silver() * stars * 0.6;
  return c;
}
`,
};
