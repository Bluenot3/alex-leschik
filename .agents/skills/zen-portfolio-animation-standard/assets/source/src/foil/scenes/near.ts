import { layoutText } from "../atlas";
import type { FoilScene } from "../types";

const TEXT = layoutText(
  {
    lanes: "SHARD 0SHARD 1SHARD 2SHARD 3",
    block: "BLOCK",
    mark: "NEAR × ZEN AI CO",
    micro: "NEAR PROTOCOL × ZEN AI CO · SHARDED · DECENTRALIZED AI LITERACY · ",
  },
  0,
);
const { lanes: LANES, block: BLOCK, mark: MARK, micro: MICRO } = TEXT.at;

/**
 * NEAR Protocol × ZEN.
 * Nightshade-style sharding: chunks stream along four shard lanes, are
 * gathered into each block, and the block joins the hash-linked chain —
 * while NEAR's own mark assembles, block by finalized block, beside it.
 */
export const near: FoilScene = {
  id: "near",
  still: 2.8,
  data(d) {
    TEXT.write(d);
  },
  code: /* wgsl */ `
/* Cabinet-projected box: (edge distance, front, top, side) masks. */
fn cabinet(p: vec2f, c: vec2f, hs: vec2f, o: vec2f) -> vec4f {
  let a: vec2f = c + vec2f(-hs.x, hs.y);
  let b: vec2f = c + vec2f(hs.x, hs.y);
  let r: vec2f = c + vec2f(hs.x, -hs.y);
  var e: f32 = abs(sdBox(p - c, hs));
  e = min(e, sdSeg(p, a, a + o));
  e = min(e, sdSeg(p, b, b + o));
  e = min(e, sdSeg(p, r, r + o));
  e = min(e, sdSeg(p, a + o, b + o));
  e = min(e, sdSeg(p, b + o, r + o));
  let fm: f32 = fillAA(sdBox(p - c, hs));
  let qa: vec2f = p - a;
  let tb: f32 = qa.y / o.y;
  let ta: f32 = (qa.x - tb * o.x) / (2.0 * hs.x);
  let tm: f32 = step(0.0, tb) * step(tb, 1.0) * step(0.0, ta) * step(ta, 1.0);
  let qr: vec2f = p - r;
  let sb: f32 = qr.x / o.x;
  let sa: f32 = (qr.y - sb * o.y) / (2.0 * hs.y);
  let sm: f32 = step(0.0, sb) * step(sb, 1.0) * step(0.0, sa) * step(sa, 1.0);
  return vec4f(e, fm, tm * (1.0 - fm), sm * (1.0 - fm) * (1.0 - tm));
}

fn scene(uv: vec2f, p: vec2f) -> vec3f {
  let t: f32 = tnow();
  let period: f32 = 1.2;
  let ph: f32 = fract(t / period);
  let height: f32 = floor(t / period);
  let colX: f32 = -0.07;
  let ax: f32 = aspect() * 0.5;
  let o: vec2f = vec2f(0.016, 0.012);

  var lines: f32 = 0.0;
  var faces: f32 = 0.0;
  var edges: f32 = 0.0;
  var glow: f32 = 0.0;
  let laneHover: f32 = clamp(floor((0.36 - mouseP().y) / 0.15 + 0.5), 0.0, 3.0);

  // Shard lanes and their chunks streaming toward the assembly column.
  for (var i: i32 = 0; i < 4; i++) {
    let ly: f32 = 0.33 - f32(i) * 0.15;
    let hot: f32 = 1.0 + 0.6 * hov() * step(abs(f32(i) - laneHover), 0.1);
    lines += stroke(p.y - ly + 0.033, 0.35) * step(p.x, colX) * step(-ax + 0.17, p.x) * 0.6;
    let spacing: f32 = 0.2;
    let s: f32 = (p.x - colX) / spacing + 1.0 - ph + f32(i) * 0.13;
    let n: f32 = floor(s + 0.5);
    let cx: f32 = colX + (n - 1.0 + ph - f32(i) * 0.13) * spacing;
    let valid: f32 = step(n, 0.5) * step(-ax + 0.2, cx);
    let fb: vec4f = cabinet(p, vec2f(cx, ly), vec2f(0.034, 0.02), o);
    edges += stroke(fb.x, 0.45) * valid * hot;
    faces += (fb.y * engrave(p.x * 0.6 + p.y, 0.006, 0.22) + fb.z * 0.18 + fb.w * engrave(p.y, 0.004, 0.3)) * valid * hot;
    glow += exp(-abs(p.x - colX) * 60.0) * exp(-abs(p.y - ly) * 30.0) * sstep(0.75, 1.0, ph);
  }

  // Assembly column.
  let colLine: f32 = stroke(p.x - colX - 0.06, 0.4) * step(-0.26, p.y) * step(p.y, 0.42);
  let sweep: f32 = exp(-abs(p.y - mix(0.42, -0.26, ease(ph * 1.25))) * 80.0) * stroke(p.x - colX - 0.06, 1.2);

  // The chain: blocks shift left one slot per block, hash links between.
  let chainY: f32 = -0.33;
  let slot: f32 = 0.19;
  let shift: f32 = ease(saturate((ph - 0.02) / 0.3)) * slot;
  let k: f32 = floor((colX + shift - p.x) / slot + 0.5);
  let bx: f32 = colX + shift - k * slot;
  let bvalid: f32 = step(-0.5, k) * step(-ax, bx);
  let cb: vec4f = cabinet(p, vec2f(bx, chainY), vec2f(0.058, 0.045), o * 1.5);
  edges += stroke(cb.x, 0.6) * bvalid;
  faces += (cb.y * engrave(p.y + p.x * 0.3, 0.0055, 0.18) + cb.z * 0.25 + cb.w * engrave(p.x, 0.0035, 0.3)) * bvalid;
  let link: f32 = stroke(p.y - chainY - 0.008, 0.35) + stroke(p.y - chainY + 0.008, 0.35);
  let gap: f32 = step(0.058, abs(p.x - bx)) * step(-ax, p.x) * step(p.x, colX + 0.06 + shift);
  edges += link * gap * 0.7;
  let fresh: f32 = exp(-length(p - vec2f(colX + shift, chainY)) * 14.0) * (1.0 - ph);

  // Hex microprint inside the newest block, then the block counter.
  let hexCell: vec2f = floor((p - vec2f(bx - 0.05, chainY - 0.03)) / vec2f(0.0114, 0.018));
  let hq: vec2f = fract((p - vec2f(bx - 0.05, chainY - 0.03)) / vec2f(0.0114, 0.018));
  let inHex: f32 = step(0.0, hexCell.x) * step(hexCell.x, 8.0) * step(0.0, hexCell.y) * step(hexCell.y, 2.0) * cb.y * bvalid;
  let hv: f32 = h21(hexCell + vec2f(k - height, 3.0) * 17.0);
  let hcode: i32 = select(16 + i32(hv * 10.0), 33 + i32(fract(hv * 7.31) * 6.0), hv > 0.62);
  let hexG: f32 = glyphCov(hcode, vec2f((hq.x - 0.5) * 0.6 + 0.5, 1.0 - hq.y), 0.018, 0.0) * inHex;

  var digits: f32 = 0.0;
  let num: f32 = 451203.0 + height;
  for (var j: i32 = 0; j < 6; j++) {
    let pw: f32 = pow(10.0, f32(5 - j));
    let dg: i32 = i32(floor(num / pw) - 10.0 * floor(num / (pw * 10.0)));
    digits += digitCov(p, vec2f(colX - 0.08 + f32(j) * 0.0186, -0.405), 0.031, dg, 0.0);
  }
  let blockLabel: f32 = textRun(p, vec2f(colX - 0.08, -0.375), 0.016, ${BLOCK.start}, ${BLOCK.count}, 0.0);
  var laneLabels: f32 = 0.0;
  for (var i: i32 = 0; i < 4; i++) {
    laneLabels += textRun(p, vec2f(-ax + 0.045, 0.345 - f32(i) * 0.15), 0.016, ${LANES.start} + i * 7, 7, 0.0);
  }
  let micro: f32 = textLoop(p, 0.478, 0.015, ${MICRO.start}, ${MICRO.count}, -t * 0.01, 0.0);

  // NEAR's mark, assembled from finalized blocks (bottom up, a little out
  // of order like real finality), held, then re-minted.
  let nc: vec2f = vec2f(ax - 0.29, 0.05);
  let ns: f32 = 0.6;
  let nd: f32 = logoDist(LOGO_NEAR, p, nc, ns);
  let cell: f32 = 0.0195;
  let gq: vec2f = (p - nc) / cell;
  let gi: vec2f = floor(gq);
  let gf: vec2f = fract(gq) - vec2f(0.5);
  let gcen: vec2f = nc + (gi + vec2f(0.5)) * cell;
  let inN: f32 = step(logoDist(LOGO_NEAR, gcen, nc, ns), -cell * 0.2);
  let build: f32 = fract(t / 14.0);
  let order: f32 = h21(gi + vec2f(31.0, 7.0)) * 0.35 + (gcen.y - nc.y + 0.25) * 1.1;
  let since: f32 = build * 1.4 - order;
  let placed: f32 = step(0.0, since) * (1.0 - sstep(0.93, 1.0, build));
  let pop: f32 = exp(-max(since, 0.0) * 30.0) * placed;
  let bxd: f32 = sdBox(gf, vec2f(0.36)) * cell;
  let mosaic: f32 = saturate(0.5 - bxd / pxs()) * inN * placed;
  let mosaicEdge: f32 = lineCov(abs(bxd) / pxs(), 0.3) * inN * placed;
  let ghost: f32 = lineCov(abs(bxd) / pxs(), 0.22) * inN * (1.0 - placed) * 0.3;
  let outline: f32 = stroke(nd, 0.55) + stroke(nd - 0.012, 0.3) * 0.5;
  let mosaicTone: f32 = engrave(p.x * 0.5 + p.y, 0.005, 0.5);
  let markTxt: f32 = textRun(p, vec2f(nc.x - 0.135, nc.y - 0.27), 0.024, ${MARK.start}, ${MARK.count}, 0.1);
  let zs: vec2f = zenSeal(p, vec2f(nc.x + 0.185, nc.y - 0.258), 0.026);

  let ink: vec3f = inkCol(p, 1.6);
  var c: vec3f = mix(ink, silver(), 0.25) * (edges * 1.25 + faces * 0.8 + lines * 0.6 + colLine * 0.7);
  let mint: vec3f = mix(u.accent.rgb, vec3f(0.85, 1.0, 0.95), 0.35);
  c += mix(mint, holo(foilPhase(p, 2.0) + 0.3), 0.3) * (mosaic * (0.35 + 0.4 * mosaicTone) + mosaicEdge * 0.7 + ghost);
  c += vec3f(1.0, 1.0, 0.95) * pop * inN * 0.9;
  c += mix(silver(), mint, 0.4) * outline * 0.85;
  c += silver() * markTxt * 0.85 + mix(silver(), holo(foilPhase(p, 2.0)), 0.4) * zs.x * 0.8;
  c += holo(foilPhase(p, 2.4) + 0.1) * (sweep * 1.2 + glow * 1.1 + fresh * 0.9);
  c += mix(u.accent.rgb, vec3f(1.0), 0.45) * (digits * 0.95 + hexG * 0.6);
  c += silver() * (blockLabel + laneLabels) * 0.6 + ink * micro * 0.4;
  return c;
}
`,
};
