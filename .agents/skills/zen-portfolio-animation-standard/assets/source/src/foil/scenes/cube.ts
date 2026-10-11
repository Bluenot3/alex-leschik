import { layoutText } from "../atlas";
import type { FoilScene } from "../types";

/* Microprint engraved into the cube: the frame band around every face, the
   ring around the placeholder seal, and the plate numerals. */
const TEXT = layoutText(
  {
    frame: "ZEN AI CO · ALEXANDER LESCHIK · MMXXVI · ",
    ring: "ORDO AB CHAO · ZEN AI CO · ",
    numerals: "I  II III IV V  VI ",
  },
  92,
);

/** vec4 slots inside u.d written by the cube's onFrame hook. */
export const CUBE_SLOTS = {
  /** rows of the object → view rotation (CSS axes: x right, y down, z to viewer) */
  rot: 0,
  /** reveal clocks for faces 0–3, then faces 4–5 */
  load0: 3,
  load1: 4,
  /** per face: u axis, v axis (down), outward normal — object space */
  frames: 5,
} as const;

type Mat3 = [number, number, number, number, number, number, number, number, number];

/* CSS rotate matrices (row-major, CSS axes: x right, y down, z toward the viewer). */
export function cssRotX(deg: number): Mat3 {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [1, 0, 0, 0, c, -s, 0, s, c];
}
export function cssRotY(deg: number): Mat3 {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [c, 0, s, 0, 1, 0, -s, 0, c];
}
export function mul3(a: Mat3, b: Mat3): Mat3 {
  const o = new Array(9).fill(0) as Mat3;
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++) o[r * 3 + c] = a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c];
  return o;
}

/* The six faces exactly as the CSS cube places them, in its face order
   (top, front, right, back, left, bottom) so uploads keep their faces. */
const FACE_ROT: Mat3[] = [cssRotX(-90), cssRotX(0), cssRotY(90), cssRotY(180), cssRotY(-90), cssRotX(90)];

/**
 * The hero vault: a ray-traced rounded crystal cube carrying the owner's six
 * images as printed plates under a glass skin.
 *
 * Exact ray/rounded-box intersection, Fresnel reflections of a soft studio,
 * dispersion through the bevels (each channel refracts to its own inner
 * face), an engraved frame with running microprint, and a minting sweep when
 * an image arrives. Faces still loading show an engraved ZEN seal — never a
 * stand-in photo. No derivatives anywhere, so every branch is free to skip
 * work (empty pixels cost one bounding test).
 *
 * Uniforms: p0 = (bob, intro, layer size px, 0);
 * p1 = (pointer x, pointer y in view units, pointer active, 0).
 */
export const cube: FoilScene = {
  id: "cube",
  post: "alpha",
  still: 3.0,
  data(d) {
    TEXT.write(d);
    FACE_ROT.forEach((m, f) => {
      for (let k = 0; k < 3; k++) {
        // Column k of the face rotation: its local x, y and outward z axes.
        const at = (CUBE_SLOTS.frames + f * 3 + k) * 4;
        d[at] = m[k];
        d[at + 1] = m[3 + k];
        d[at + 2] = m[6 + k];
      }
    });
  },
  code: /* wgsl */ `
const CB: f32 = 0.43;
const CR: f32 = 0.07;
const CAM_D: f32 = 2.7;
const VIEW_H: f32 = 1.75;

fn cubeRot(v: vec3f) -> vec3f {
  return vec3f(dot(u.d[${CUBE_SLOTS.rot}].xyz, v), dot(u.d[${CUBE_SLOTS.rot + 1}].xyz, v), dot(u.d[${CUBE_SLOTS.rot + 2}].xyz, v));
}
fn cubeRotT(v: vec3f) -> vec3f {
  return u.d[${CUBE_SLOTS.rot}].xyz * v.x + u.d[${CUBE_SLOTS.rot + 1}].xyz * v.y + u.d[${CUBE_SLOTS.rot + 2}].xyz * v.z;
}
fn faceAxis(f: i32, k: i32) -> vec3f { return u.d[${CUBE_SLOTS.frames} + f * 3 + k].xyz; }

fn faceLoad(f: i32) -> f32 {
  let a: vec4f = u.d[${CUBE_SLOTS.load0}];
  let b: vec4f = u.d[${CUBE_SLOTS.load1}];
  return select(select(select(select(select(b.y, b.x, f == 4), a.w, f == 3), a.z, f == 2), a.y, f == 1), a.x, f == 0);
}
/* 0 = still loading, 1 = fully minted; a negative clock means "show now". */
fn faceMint(f: i32) -> f32 {
  let t0: f32 = faceLoad(f);
  let m: f32 = saturate((tnow() - t0) / 1.6);
  return select(select(m, 1.0, t0 < 0.0), 0.0, t0 == 0.0);
}

fn sdRBox3(p: vec3f) -> f32 {
  let q: vec3f = abs(p) - vec3f(CB);
  return length(max(q, vec3f(0.0))) + min(max(q.x, max(q.y, q.z)), 0.0) - CR;
}

/* Exact ray / rounded-box intersection (after Inigo Quilez), single exit. */
fn rboxHit(ro0: vec3f, rd0: vec3f) -> f32 {
  let rd1: vec3f = rd0 + vec3f(1e-6) * (vec3f(1.0) - step(vec3f(1e-6), abs(rd0)));
  let m: vec3f = 1.0 / rd1;
  let n: vec3f = m * ro0;
  let k: vec3f = abs(m) * vec3f(CB + CR);
  let t1: vec3f = -n - k;
  let t2: vec3f = -n + k;
  let tN: f32 = max(max(t1.x, t1.y), t1.z);
  let tF: f32 = min(min(t2.x, t2.y), t2.z);
  var res: f32 = -1.0;
  if ((tN < tF) && (tF > 0.0)) {
    let pos0: vec3f = ro0 + rd1 * tN;
    let sg: vec3f = step(vec3f(0.0), pos0) * 2.0 - vec3f(1.0);
    let ro: vec3f = ro0 * sg;
    let rd: vec3f = rd1 * sg;
    let pq: vec3f = pos0 * sg - vec3f(CB);
    let pm: vec3f = max(pq, pq.yzx);
    if (min(min(pm.x, pm.y), pm.z) < 0.0) {
      res = tN;
    } else {
      let oc: vec3f = ro - vec3f(CB);
      let dd: vec3f = rd * rd;
      let oo: vec3f = oc * oc;
      let od: vec3f = oc * rd;
      let ra2: f32 = CR * CR;
      var t: f32 = 1e20;
      let cb: f32 = od.x + od.y + od.z;
      let ch: f32 = cb * cb - (oo.x + oo.y + oo.z - ra2);
      if (ch > 0.0) { t = -cb - sqrt(ch); }
      let ax: f32 = dd.y + dd.z;
      let bx: f32 = od.y + od.z;
      let hx: f32 = bx * bx - ax * (oo.y + oo.z - ra2);
      if (hx > 0.0) {
        let tx: f32 = (-bx - sqrt(hx)) / ax;
        if ((tx > 0.0) && (tx < t) && (abs(ro.x + rd.x * tx) < CB)) { t = tx; }
      }
      let ay: f32 = dd.z + dd.x;
      let by: f32 = od.z + od.x;
      let hy: f32 = by * by - ay * (oo.z + oo.x - ra2);
      if (hy > 0.0) {
        let ty: f32 = (-by - sqrt(hy)) / ay;
        if ((ty > 0.0) && (ty < t) && (abs(ro.y + rd.y * ty) < CB)) { t = ty; }
      }
      let az: f32 = dd.x + dd.y;
      let bz: f32 = od.x + od.y;
      let hz: f32 = bz * bz - az * (oo.x + oo.y - ra2);
      if (hz > 0.0) {
        let tz: f32 = (-bz - sqrt(hz)) / az;
        if ((tz > 0.0) && (tz < t) && (abs(ro.z + rd.z * tz) < CB)) { t = tz; }
      }
      res = select(t, -1.0, t > 1e19);
    }
  }
  return res;
}

/* Photographic studio in view space (y down): a dark room whose only
   reflections are crisp light sources — ceiling softbox, two strip lights, a
   holographic floor bounce — so glass reads as glass, not chrome. */
fn studio(r: vec3f) -> vec3f {
  let up: f32 = -r.y;
  var c: vec3f = mix(vec3f(0.035, 0.045, 0.07), vec3f(0.11, 0.13, 0.17), saturate(up * 0.5 + 0.5));
  let box: f32 = sstep(0.70, 0.76, up) * sstep(0.46, 0.40, abs(r.x + 0.08));
  c += vec3f(2.6, 2.6, 2.7) * box;
  let stripR: f32 = sstep(0.07, 0.035, abs(r.x - 0.80)) * sstep(-0.30, -0.22, up) * sstep(0.62, 0.54, up);
  let stripL: f32 = sstep(0.05, 0.025, abs(r.x + 0.86)) * sstep(-0.12, -0.04, up) * sstep(0.50, 0.42, up);
  c += vec3f(1.5, 1.7, 2.0) * stripR + vec3f(1.9, 1.6, 1.35) * stripL;
  c += holo(r.x * 0.9 + r.z * 0.4) * sstep(-0.1, -0.7, up) * 0.22;
  return c;
}

fn whichFace(nObj: vec3f) -> i32 {
  var best: f32 = -2.0;
  var f: i32 = 0;
  for (var i: i32 = 0; i < 6; i++) {
    let s: f32 = dot(nObj, faceAxis(i, 2));
    if (s > best) {
      best = s;
      f = i;
    }
  }
  return f;
}

/* Microprint with an explicit pixel footprint (face units); fades out
   before it would alias. */
fn microGlyph(code: i32, q: vec2f, size: f32, pxu: f32) -> f32 {
  let d: f32 = glyphD(code, q) * size;
  return saturate(0.5 - d / max(pxu, 1e-5)) * saturate(size / (pxu * 3.0) - 0.4);
}
/* Repeating run: x along the line, y down from the glyph tops. */
fn microRun(x: f32, y: f32, size: f32, start: i32, count: i32, pxu: f32) -> f32 {
  let lx: f32 = (x + 32.0) / (size * 0.6);
  let ly: f32 = y / size;
  let code: i32 = charAt(start + i32(floor(lx)) % max(count, 1));
  let q: vec2f = vec2f((fract(lx) - 0.5) * 0.6 + 0.5, ly);
  return select(0.0, microGlyph(code, q, size, pxu), (ly >= 0.0) && (ly <= 1.0) && (code > 0));
}
/* One-off label (no tiling). */
fn microLabel(x: f32, y: f32, size: f32, start: i32, count: i32, pxu: f32) -> f32 {
  let lx: f32 = x / (size * 0.6);
  let ly: f32 = y / size;
  let idx: i32 = i32(floor(lx));
  let code: i32 = charAt(start + clamp(idx, 0, max(count - 1, 0)));
  let q: vec2f = vec2f((fract(lx) - 0.5) * 0.6 + 0.5, ly);
  let inside: bool = (lx >= 0.0) && (idx < count) && (ly >= 0.0) && (ly <= 1.0) && (code > 0);
  return select(0.0, microGlyph(code, q, size, pxu), inside);
}
/* Text around a circle, tops outward, tiled a whole number of times. d is y-up. */
fn microRing(d: vec2f, radius: f32, size: f32, start: i32, count: i32, pxu: f32) -> f32 {
  let r: f32 = length(d);
  let a: f32 = atan2(d.x, d.y);
  let n: f32 = f32(max(count, 1));
  let slots: f32 = max(floor(TAU * radius / (size * 0.6) / n), 1.0) * n;
  let s: f32 = fract(a / TAU + 2.0) * slots;
  let code: i32 = charAt(start + i32(floor(s)) % max(count, 1));
  let ly: f32 = (radius + size * 0.5 - r) / size;
  let q: vec2f = vec2f(0.5 + (fract(s) - 0.5) * (TAU * r / slots) / size, ly);
  return select(0.0, microGlyph(code, q, size, pxu), (ly >= 0.0) && (ly <= 1.0) && (code > 0));
}

/* The engraved seal a face shows while its image is on the way. */
fn sealPlate(f: i32, q: vec2f, pxu: f32) -> vec3f {
  let c: vec2f = q - vec2f(0.5);
  let r: f32 = length(c);
  let a: f32 = atan2(c.y, c.x);
  var col: vec3f = mix(vec3f(0.035, 0.055, 0.105), vec3f(0.075, 0.105, 0.19), saturate(1.0 - r * 1.3));
  var g: f32 = 0.0;
  for (var k: i32 = 0; k < 6; k++) {
    let fk: f32 = f32(k);
    let rr: f32 = 0.355 + 0.032 * sin(14.0 * a + fk * 1.047 + tnow() * 0.05) + 0.011 * sin(9.0 * a - fk * 0.7) + fk * 0.006;
    g += saturate(0.9 - abs(r - rr) / pxu);
  }
  let rings: f32 = saturate(0.9 - abs(r - 0.445) / pxu) + saturate(0.9 - abs(r - 0.262) / pxu);
  let ink: vec3f = mix(vec3f(0.55, 0.70, 0.92), holo(a * 0.16 + r * 2.0 + tnow() * 0.03), 0.45);
  col += ink * saturate(g * 0.55 + rings * 0.7) * 0.75;
  // ZEN mark: engraved diagonal hatching inside, foil hairline around it.
  let ld: f32 = logoD(LOGO_ZEN, vec2f(0.5) + c / 0.36) * 0.36;
  let hatch: f32 = engraveP(c.x + c.y, 0.011, 0.55, pxu * 1.41);
  let inside: f32 = saturate(0.5 - ld / pxu);
  let edge: f32 = saturate(1.0 - abs(ld) / pxu);
  col += mix(vec3f(0.80, 0.86, 0.95), holo(c.x * 1.5 - c.y + tnow() * 0.04), 0.35) * (inside * (0.35 + 0.65 * hatch) * 0.8 + edge * 0.6);
  let rc: f32 = microRing(vec2f(c.x, -c.y), 0.3, 0.036, ${TEXT.at.ring.start}, ${TEXT.at.ring.count}, pxu);
  col += vec3f(0.62, 0.74, 0.92) * rc * 0.8;
  let num: f32 = microLabel(q.x - 0.80, q.y - 0.86, 0.05, ${TEXT.at.numerals.start} + f * 3, 3, pxu);
  col += vec3f(0.85, 0.80, 0.62) * num * 0.9;
  return col;
}

/* Face plate: the owner's image inside an engraved frame, minting in. */
fn facePlate(f: i32, q: vec2f, pxu: f32, lod: f32) -> vec3f {
  let m: f32 = faceMint(f);
  let band: f32 = 0.034;
  let iq: vec2f = clamp((q - vec2f(band)) / (1.0 - band * 2.0), vec2f(0.0), vec2f(1.0));
  let img: vec3f = imgLod(iq, f, lod).rgb;
  var col: vec3f = img;
  if (m < 1.0) {
    // Minting sweep: line-engraved image ahead of the colour.
    let seal: vec3f = sealPlate(f, q, pxu);
    let lum: f32 = luma(img);
    let front: f32 = m * 1.5 - 0.25;
    let diag: f32 = q.x * 0.62 + q.y * 0.38;
    let shown: f32 = sstep(front + 0.05, front - 0.05, diag);
    let near: f32 = exp(-abs(diag - front) * 22.0) * step(0.001, m);
    let lines: f32 = engraveP(q.y * 0.8 + q.x * 0.2 + lum * 0.012, 0.0085, 1.0 - lum, pxu);
    let engraved: vec3f = mix(seal, mix(vec3f(0.62, 0.78, 1.0), holo(diag * 3.0 + tnow() * 0.1), 0.4), lines * 0.85);
    col = mix(mix(seal, img, shown), engraved, near * 0.9);
  }
  // Frame: dark foil band, gold hairlines and microprint running clockwise
  // with the glyph tops toward the outer edge.
  let e: vec2f = min(q, vec2f(1.0) - q);
  let ed: f32 = min(e.x, e.y);
  let inBand: f32 = 1.0 - sstep(band - pxu, band, ed);
  let horiz: bool = e.y <= e.x;
  let along: f32 = select(select(1.0 - q.y, q.y, q.x > 0.5), select(1.0 - q.x, q.x, q.y < 0.5), horiz);
  let size: f32 = 0.0155;
  let mp: f32 = microRun(along, ed - (band - size) * 0.5, size, ${TEXT.at.frame.start}, ${TEXT.at.frame.count}, pxu);
  let hair: f32 = saturate(1.0 - abs(ed - band) / pxu) + saturate(1.0 - abs(ed - band * 0.14) / pxu) * 0.6;
  let foil: vec3f = mix(vec3f(0.86, 0.74, 0.48), holo(along * 2.0 + tnow() * 0.05), 0.35);
  let bandCol: vec3f = mix(vec3f(0.05, 0.07, 0.12), vec3f(0.10, 0.13, 0.20), q.y);
  col = mix(col, bandCol + foil * mp * 0.75, inBand);
  return col + foil * hair * 0.8;
}

/* What a bevel sees through the glass: the inner face, image or seal tone. */
fn innerPlate(f: i32, q: vec2f, lod: f32) -> vec3f {
  let img: vec3f = imgLod(clamp(q, vec2f(0.0), vec2f(1.0)), f, lod).rgb;
  return mix(vec3f(0.06, 0.09, 0.17), img, faceMint(f));
}

fn scene(uv: vec2f, p0: vec2f) -> vec4f {
  let intro: f32 = u.p0.y;
  let layer: f32 = max(u.p0.z, 1.0);
  let p: vec2f = vec2f(p0.x, p0.y - u.p0.x);
  let rdv: vec3f = normalize(vec3f(p.x * VIEW_H, -p.y * VIEW_H, -CAM_D));
  let roO: vec3f = cubeRotT(vec3f(0.0, 0.0, CAM_D));
  let rdO: vec3f = cubeRotT(rdv);
  let pxW: f32 = VIEW_H / u.res.y;

  // Grounding shadow beneath the vault (stays put while the cube floats).
  let sp: vec2f = (p0 - vec2f(0.0, -0.40)) / vec2f(0.30, 0.045);
  let shadowA: f32 = exp(-dot(sp, sp) * 1.4) * 0.14;
  var outc: vec4f = vec4f(0.0, 0.0, 0.0, shadowA);

  let tc: f32 = max(dot(-roO, rdO), 0.0);
  if (length(roO + rdO * tc) < 0.92) {
    let t: f32 = rboxHit(roO, rdO);
    let hit: bool = t > 0.0;
    var th: f32 = t;
    var cover: f32 = 1.0;
    if (!hit) {
      // Distance to a convex shape is convex along the ray: golden-section
      // search finds the closest approach for an exact anti-aliased edge.
      var lo: f32 = tc - 0.95;
      var hi: f32 = tc + 0.95;
      for (var i: i32 = 0; i < 12; i++) {
        let m1: f32 = lo + (hi - lo) * 0.382;
        let m2: f32 = lo + (hi - lo) * 0.618;
        if (sdRBox3(roO + rdO * m1) < sdRBox3(roO + rdO * m2)) {
          hi = m2;
        } else {
          lo = m1;
        }
      }
      th = (lo + hi) * 0.5;
      cover = saturate(0.5 - sdRBox3(roO + rdO * th) / (pxW * th / CAM_D));
    }
    if (cover > 0.0) {
      let P: vec3f = roO + rdO * th;
      let nO: vec3f = normalize(sign(P) * max(abs(P) - vec3f(CB), vec3f(1e-5)));
      let nV: vec3f = cubeRot(nO);
      let f: i32 = whichFace(nO);
      let ez: vec3f = faceAxis(f, 2);
      let q: vec2f = vec2f(dot(P, faceAxis(f, 0)) + 0.5, dot(P, faceAxis(f, 1)) + 0.5);
      let cosv: f32 = max(abs(dot(nV, rdv)), 0.06);
      let pxu: f32 = pxW * (th / CAM_D) / cosv;
      let lod: f32 = max(log2(pxu * layer), 0.0);
      let flatk: f32 = sstep(0.9985, 0.9999, dot(nO, ez));

      var col: vec3f = facePlate(f, q, pxu, lod);
      if (flatk < 0.999) {
        // Bevels: each channel refracts to the inner face it reaches.
        var refr: vec3f = vec3f(0.0);
        for (var c: i32 = 0; c < 3; c++) {
          let tr: vec3f = refract(rdO, nO, 1.0 / (1.46 + f32(c) * 0.045));
          let inv: vec3f = 1.0 / (tr + vec3f(1e-6) * (vec3f(1.0) - step(vec3f(1e-6), abs(tr))));
          let tx: vec3f = (sign(tr) * 0.5 - P) * inv;
          let E: vec3f = P + tr * max(min(min(tx.x, tx.y), tx.z), 0.0);
          let ab: vec3f = abs(E);
          let ne: vec3f = select(select(vec3f(0.0, 0.0, sign(E.z)), vec3f(0.0, sign(E.y), 0.0), (ab.y >= ab.x) && (ab.y >= ab.z)), vec3f(sign(E.x), 0.0, 0.0), (ab.x >= ab.y) && (ab.x >= ab.z));
          let f2: i32 = whichFace(ne);
          let q2: vec2f = vec2f(dot(E, faceAxis(f2, 0)) + 0.5, dot(E, faceAxis(f2, 1)) + 0.5);
          let w: vec3f = select(select(vec3f(0.0, 0.0, 1.0), vec3f(0.0, 1.0, 0.0), c == 1), vec3f(1.0, 0.0, 0.0), c == 0);
          // Curvature magnifies the bevel many times over: sample far down
          // the mip chain so the dispersion smears like real glass.
          refr += innerPlate(f2, q2, max(lod + 3.5, 4.5)) * w;
        }
        col = mix(refr * vec3f(0.86, 0.92, 1.0), col, flatk);
      }

      // Glass skin: Fresnel studio reflection (added light — the dark room
      // reflects nothing), foil iridescence, pointer light.
      let fr: f32 = 0.04 + 0.96 * pow(1.0 - cosv, 5.0);
      let rv: vec3f = reflect(rdv, nV);
      let envc: vec3f = studio(rv);
      col = col * (1.0 - fr * 0.55) + envc * fr;
      col += holo(dot(nV, vec3f(0.4, -0.7, 0.6)) * 1.6 + q.x * 0.7 + tnow() * 0.03) * pow(1.0 - cosv, 2.0) * 0.16;
      let Pv: vec3f = cubeRot(P);
      let lv: vec3f = normalize(vec3f(u.p1.x, u.p1.y, 1.6) - Pv);
      col += vec3f(1.0, 0.98, 0.94) * pow(max(dot(rv, lv), 0.0), 90.0) * (0.14 + 0.41 * u.p1.z);
      // Bevel glints: a key light's crisp highlight slides along the edges as
      // the vault turns, and a cool Fresnel rim separates it from the page.
      let key: vec3f = normalize(vec3f(-0.45, -0.75, 0.55));
      let bevel: f32 = 1.0 - flatk;
      col += vec3f(1.0, 0.99, 0.97) * pow(max(dot(rv, key), 0.0), 140.0) * bevel * 2.4;
      col += vec3f(0.72, 0.80, 0.95) * bevel * pow(1.0 - cosv, 2.5) * 0.55;

      outc = vec4f(col * cover, cover) + outc * (1.0 - cover);
    }
  }
  return outc * intro;
}
`,
};
