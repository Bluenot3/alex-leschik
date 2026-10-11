import { layoutText } from "../atlas";
import type { FoilScene } from "../types";

const TEXT = layoutText(
  {
    top: "VISUAL ARSENAL · ZEN AI CO · BUILT IN PUBLIC · ",
    bottom: "ALEXANDER LESCHIK · ARCHIVE OF CAMPAIGNS, INTERFACES & GENERATIVE SYSTEMS · ",
  },
  16,
);

/** u.d slots written by the stage's onFrame hook. */
export const STAGE_SLOTS = {
  /** (image aspect in layer 0, in layer 1, transition start s, incoming layer) */
  images: 0,
  /** (layer aspect, layer 0 ready, layer 1 ready, layer width px) */
  layers: 1,
} as const;

/**
 * The Visual Arsenal stage: the archive's images on the GPU.
 *
 * Each image is shown whole (contained) over a blurred, darkened copy of
 * itself, so portrait infographics and wide campaign art both sit in the
 * frame. A new image mints in: a diagonal front sweeps across, the old
 * image dissolving into its own burin lines while the new one resolves from
 * engraving into full colour. A holographic sheen drifts across, the pointer
 * carries a soft light and parallax, and microprint runs along the frame.
 */
export const stage: FoilScene = {
  id: "stage",
  post: "raw",
  still: 4.0,
  data(d) {
    TEXT.write(d);
  },
  code: /* wgsl */ `
/* Window uv → image-local uv for an image of aspect ia in a frame of aspect wa. */
fn fitUV(uv: vec2f, wa: f32, ia: f32, cover: bool) -> vec2f {
  let wider: bool = ia > wa;
  let contain: vec2f = select(vec2f(ia / wa, 1.0), vec2f(1.0, wa / ia), wider);
  let coverS: vec2f = select(vec2f(1.0, wa / ia), vec2f(ia / wa, 1.0), wider);
  return select((uv - 0.5) / contain + 0.5, (uv - 0.5) / coverS + 0.5, cover);
}
/* Image-local uv → layer uv (images are contain-fitted into their layer). */
fn layerUV(iuv: vec2f, la: f32, ia: f32) -> vec2f {
  let s: vec2f = select(vec2f(ia / la, 1.0), vec2f(1.0, la / ia), ia > la);
  return (iuv - 0.5) * s + 0.5;
}

/* One archive image in the window: (colour, coverage). */
fn archive(uv: vec2f, slot: i32, ia: f32, lod: f32) -> vec4f {
  let wa: f32 = aspect();
  let la: f32 = u.d[${STAGE_SLOTS.layers}].x;
  let iuv: vec2f = fitUV(uv, wa, ia, false);
  let inside: f32 = step(0.0, iuv.x) * step(iuv.x, 1.0) * step(0.0, iuv.y) * step(iuv.y, 1.0);
  let img: vec4f = imgLod(clamp(layerUV(iuv, la, ia), vec2f(0.0), vec2f(1.0)), slot, lod);
  // Backdrop: the image itself, cover-fitted and deep in the mip chain.
  // Un-premultiplying removes the darkening the transparent margins add.
  let bs: vec4f = imgLod(clamp(layerUV(clamp(fitUV(uv, wa, ia, true), vec2f(0.0), vec2f(1.0)), la, ia), vec2f(0.0), vec2f(1.0)), slot, 4.5);
  let back: vec3f = bs.rgb / max(bs.a, 0.03);
  let bl: f32 = luma(back);
  // A soft drop shadow lifts the print off its ambient backdrop.
  let e: vec2f = max(-iuv, iuv - vec2f(1.0)) * vec2f(ia, 1.0);
  let outer: f32 = max(e.x, e.y);
  let shadow: f32 = 1.0 - 0.55 * exp(-max(outer, 0.0) * 22.0) * (1.0 - inside);
  let bg: vec3f = mix(vec3f(bl), back, 1.35) * 0.5 * shadow;
  return vec4f(bg * (1.0 - inside * img.a) + img.rgb * inside, inside);
}

fn scene(uv0: vec2f, p: vec2f) -> vec3f {
  let t: f32 = tnow();
  let im: vec4f = u.d[${STAGE_SLOTS.images}];
  let ly: vec4f = u.d[${STAGE_SLOTS.layers}];
  let cur: i32 = i32(im.w + 0.5);
  let prv: i32 = 1 - cur;
  let aCur: f32 = select(im.x, im.y, cur == 1);
  let aPrv: f32 = select(im.x, im.y, prv == 1);
  let hasCur: f32 = select(ly.y, ly.z, cur == 1);
  let hasPrv: f32 = select(ly.y, ly.z, prv == 1);

  // Pointer parallax: the print drifts a touch inside its window.
  let par: vec2f = (vec2f(u.mouse.x, u.mouse.y) - 0.5) * 0.018 * u.mouse.z;
  let uv: vec2f = (uv0 - 0.5) * 0.965 + 0.5 - par;
  let lod: f32 = max(log2(ly.w / max(u.res.x, 1.0)), 0.0);

  let nowImg: vec4f = archive(uv, cur, aCur, lod);
  let oldImg: vec4f = archive(uv, prv, aPrv, lod);
  let k: f32 = saturate((t - im.z) / 1.8);
  let front: f32 = k * 1.5 - 0.25;
  let diag: f32 = uv0.x * 0.72 + (1.0 - uv0.y) * 0.28;
  let dd: f32 = diag - front;
  let shown: f32 = sstep(0.03, -0.03, dd) * hasCur;
  // Ahead of the front the old print breaks into its own burin lines; just
  // behind it the new one arrives as engraving, then resolves into colour.
  let lumN: f32 = luma(nowImg.rgb);
  let lumO: f32 = luma(oldImg.rgb);
  let lineC: f32 = uv0.y * 0.9 + uv0.x * 0.1;
  let ink: vec3f = mix(vec3f(0.55, 0.72, 1.0), holo(diag * 3.0 + t * 0.1), 0.35);
  let inkN: vec3f = ink * engrave(lineC + lumN * 0.004, 0.0042, 1.0 - lumN);
  let inkO: vec3f = ink * engrave(lineC + lumO * 0.004, 0.0042, 1.0 - lumO);
  let aheadBand: f32 = exp(-max(dd, 0.0) * 18.0) * (1.0 - k) * hasPrv;
  let behindBand: f32 = exp(-max(-dd, 0.0) * 14.0) * (1.0 - k);
  let pre: vec3f = mix(vec3f(0.02, 0.03, 0.05), oldImg.rgb, hasPrv);
  let colAhead: vec3f = mix(pre, inkO * 0.85, aheadBand * 0.9);
  let colBehind: vec3f = mix(nowImg.rgb, inkN * 0.9, behindBand * 0.9);
  var col: vec3f = mix(colAhead, colBehind, shown);
  col += holo(diag * 2.0 + k) * exp(-abs(dd) * 26.0) * (1.0 - k) * hasCur * 0.35;

  // Holographic sheen drifting across, and the pointer's light.
  let sb: f32 = dot(uv0 - 0.5, normalize(vec2f(0.85, -0.5))) - (fract(t / 8.0) * 2.6 - 1.3);
  col += holo(sb * 1.5 + 0.3) * exp(-sb * sb * 40.0) * 0.07;
  let mp: vec2f = vec2f(u.mouse.x, u.mouse.y);
  let md: vec2f = (uv0 - mp) * vec2f(aspect(), 1.0);
  col += vec3f(1.0, 0.97, 0.92) * exp(-dot(md, md) * 9.0) * 0.07 * u.mouse.z;
  let grating: f32 = engrave(dot(uv0 * vec2f(aspect(), 1.0), vec2f(0.6, 0.8)), 0.0025, 0.5);
  col += holo(dot(md, vec2f(1.0, 0.6)) * 2.0 + t * 0.05) * grating * exp(-dot(md, md) * 6.0) * 0.05 * u.mouse.z;

  // Frame: hairline keylines and microprint running along top and bottom.
  let ax: f32 = aspect() * 0.5;
  let ed: f32 = min(ax - abs(p.x), 0.5 - abs(p.y));
  let keyline: f32 = lineCov(abs(ed - 0.028) / pxs(), 0.4) + lineCov(abs(ed - 0.006) / pxs(), 0.3);
  let topRun: f32 = textLoop(p, 0.4885, 0.0135, ${TEXT.at.top.start}, ${TEXT.at.top.count}, t * 0.01, 0.0);
  let botRun: f32 = textLoop(p, -0.4755, 0.0135, ${TEXT.at.bottom.start}, ${TEXT.at.bottom.count}, -t * 0.01, 0.0);
  let band: f32 = 1.0 - sstep(0.026, 0.03, 0.5 - abs(p.y));
  col = mix(col, col * 0.35, band);
  col += mix(silver(), holo(p.x * 0.8 + t * 0.03), 0.4) * (keyline * 0.35 + (topRun + botRun) * 0.55);

  let v: vec2f = uv0 - 0.5;
  col *= 1.0 - dot(v, v) * 0.55;
  return col;
}
`,
};
