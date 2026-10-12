import { LayerLoadError, loadImage } from "../../images";
import type { FoilScene } from "../../types";

/** d[8] = (image aspect, ready, mint start s, layer size px), written each frame. */
const IMG_VEC4 = 8;

/**
 * engrave — any image as a banknote intaglio engraving.
 *
 * Luminance drives the burin: lines bow over a dome around the centre and
 * ride the image's own relief, swell in the lights (on the dark plate; in
 * the darks on paper) and gain a cross-hatch in the deep tones, all in
 * holographic ink. The image mints in through a sweep. Modes:
 *   engraved — pure line work
 *   duotone  — line work over a dimmed colour print
 *   reveal   — a loupe follows the pointer (and drifts on its own),
 *              showing the full-colour image through the engraving
 * Frames: rect (keylines, corner rosettes, microprint), oval (a portrait
 * cartouche ringed with guilloche) or none.
 */
export const engrave: FoilScene = {
  id: "engrave",
  title: "Image engraving",
  description: "Turns any image into a holographic banknote engraving; reveal mode adds a full-colour loupe that follows the pointer.",
  aspect: 4 / 3,
  accent: "#9cc8ff",
  still: 4.0,
  params: {
    src: { type: "url", default: "", description: "The image (same-origin or CORS-enabled)." },
    mark: { type: "mark", brand: true, num: 0, default: "zen", description: "Corner seal (none to omit)." },
    mode: { type: "choice", num: 1, options: ["engraved", "duotone", "reveal"], default: "reveal", description: "Rendering." },
    frame: { type: "choice", num: 2, options: ["rect", "oval", "none"], default: "rect", description: "Frame shape." },
    density: { type: "number", num: 3, default: "1", min: 0.4, max: 3, description: "Line density (higher = finer)." },
    headline: { type: "text", slot: 0, default: "", description: "Caption title (bottom)." },
    subline: { type: "text", slot: 1, default: "", description: "Caption line." },
    micro: { type: "text", brand: true, slot: 2, default: "ZEN AI CO · ENGRAVED EDITION · ", description: "Frame microprint." },
  },
  layers(_params, box) {
    const px = Math.max(box.width, box.height) * box.dpr;
    const size = px > 1100 ? 2048 : 1024;
    return { width: size, height: size, count: 1 };
  },
  behavior(ctx) {
    const size = ctx.layers?.width ?? 1024;
    const st = { aspect: 1, ready: 0, start: -100, src: "", dirty: true };
    let destroyed = false;
    const load = (src: string) => {
      if (!src || src === st.src) return;
      st.src = src;
      loadImage(src)
        .then((img) => {
          if (destroyed || st.src !== src) return;
          const canvas = document.createElement("canvas");
          canvas.width = size;
          canvas.height = size;
          const c2 = canvas.getContext("2d")!;
          c2.imageSmoothingQuality = "high";
          const k = Math.min(size / img.naturalWidth, size / img.naturalHeight);
          c2.drawImage(img, (size - img.naturalWidth * k) / 2, (size - img.naturalHeight * k) / 2, img.naturalWidth * k, img.naturalHeight * k);
          ctx.setLayer(0, canvas);
          st.aspect = img.naturalWidth / Math.max(1, img.naturalHeight);
          st.ready = 1;
          st.start = -1;
          st.dirty = true;
        })
        .catch((err: unknown) => {
          if (destroyed || st.src !== src) return;
          ctx.warn(err instanceof LayerLoadError && err.corsOnly ? `image has no CORS headers, so the GPU can't read it: ${src}` : `image failed to load: ${src}`);
        });
    };
    load(ctx.params().src);
    return {
      update: (p) => load(p.src),
      needsFrame() {
        const d = st.dirty;
        st.dirty = false;
        return d;
      },
      frame(u) {
        const frozen = typeof (globalThis as { ZEN_FOIL_FREEZE?: number }).ZEN_FOIL_FREEZE === "number";
        if (st.start === -1) st.start = ctx.reduced || frozen ? -100 : u[4];
        const o = 28 + IMG_VEC4 * 4;
        u[o] = st.aspect;
        u[o + 1] = st.ready;
        u[o + 2] = st.start;
        u[o + 3] = size;
      },
      destroy() {
        destroyed = true;
      },
    };
  },
  code: /* wgsl */ `
/* Window uv (0..1, y down) → image uv, cover-fitted. */
fn coverUV(w: vec2f, wa: f32, ia: f32) -> vec2f {
  let s: vec2f = select(vec2f(1.0, wa / ia), vec2f(ia / wa, 1.0), ia > wa);
  return (w - 0.5) / s + 0.5;
}
/* Image uv → uv in the square layer the image was contain-fitted into. */
fn squareUV(iuv: vec2f, ia: f32) -> vec2f {
  let s: vec2f = select(vec2f(ia, 1.0), vec2f(1.0, 1.0 / ia), ia > 1.0);
  return (iuv - 0.5) * s + 0.5;
}

fn scene(uv: vec2f, p: vec2f) -> vec3f {
  let A: f32 = aspect();
  let t: f32 = tnow();
  let px: f32 = pxs();
  let info: vec4f = u.d[${IMG_VEC4}];
  let ia: f32 = max(info.x, 0.05);
  let ready: f32 = info.y;
  let L: f32 = max(info.w, 64.0);
  let mode: f32 = numParam(1);
  let frameMode: f32 = numParam(2);
  let dens: f32 = max(numParam(3), 0.4);
  let slot: i32 = i32(numParam(0));
  let hasText: f32 = select(0.0, 1.0, textLenP(0) + textLenP(1) > 0.0);

  // ── The image window ──
  let none: bool = frameMode > 1.5;
  let oval: bool = (frameMode > 0.5) && (frameMode < 1.5);
  let inset: f32 = select(0.07, 0.0, none);
  let ww: f32 = A - inset * 2.0;
  let wh: f32 = 1.0 - inset * 2.0;
  let wuv: vec2f = vec2f((p.x + ww * 0.5) / ww, (wh * 0.5 - p.y) / wh);
  let iuv: vec2f = coverUV(wuv, ww / wh, ia);
  let luv: vec2f = clamp(squareUV(iuv, ia), vec2f(0.0), vec2f(1.0));
  let texelsPerPx: f32 = L / (u.res.y * wh) / max(min(ia, ww / wh), 0.2);
  let lod: f32 = max(log2(max(texelsPerPx, 1e-3)), 0.0);
  let col: vec3f = imgLod(luv, 0, lod).rgb;
  let blur: vec3f = imgLod(luv, 0, lod + 3.5).rgb;
  let lum: f32 = pow(saturate(luma(col)), 0.9);
  let detail: f32 = saturate(lum + (lum - luma(blur)) * 0.85);
  // Plate: lines are light, so they swell with brightness. Paper: ink, so with darkness.
  let tone: f32 = mix(detail, 1.0 - detail, THEME_PAPER);

  // ── Burin lines: bowed over a dome, displaced by the relief ──
  let sp: f32 = 0.0062 / dens;
  let q: vec2f = (p - vec2f(0.0, 0.04)) / vec2f(max(ww, 0.3) * 0.5, wh * 0.5);
  let dome: f32 = 1.0 - min(dot(q, q), 1.6);
  let c1: f32 = p.y * 0.94 + p.x * 0.34 + dome * 0.045 + detail * sp * 0.9;
  let c2: f32 = p.y * 0.36 - p.x * 0.93 + dome * 0.03;
  let e1: f32 = engrave(c1, sp, 0.08 + tone * 0.9);
  let e2: f32 = engrave(c2, sp * 1.18, saturate((tone - 0.55) * 2.2) * 0.75);
  let lines: f32 = saturate(e1 + e2 * 0.8);

  // ── Mint-in sweep and placeholder ──
  let k: f32 = saturate((t - info.z) / 1.9);
  let front: f32 = k * 1.5 - 0.25;
  let diag: f32 = uv.x * 0.72 + (1.0 - uv.y) * 0.28;
  let shown: f32 = sstep(front + 0.04, front - 0.04, diag) * ready;
  let edgeGlow: f32 = exp(-abs(diag - front) * 30.0) * (1.0 - k) * ready;
  let wait: f32 = rosette(p, vec2f(0.0), 0.24, 0.06, 16.0, 6, 0.3, t * 0.08) + rosette(p, vec2f(0.0), 0.17, 0.05, 11.0, 5, 0.28, -t * 0.06);
  let waitSeal: vec2f = brandSeal(p, vec2f(0.0), 0.08, slot);

  // ── Compose by mode ──
  let paper: bool = THEME_PAPER > 0.5;
  let ink: vec3f = mix(inkCol(p, 1.2), holo(foilPhase(p, 1.6) + detail * 0.6), 0.35);
  let engr: vec3f = ink * lines * (0.95 + 0.1 * hov());
  // Duotone: a dimmed colour print under the lines (a slate wash on paper).
  let wash: vec3f = select(col * 0.42, silver() * (1.0 - lum) * 0.32, paper);
  let duo: vec3f = wash + ink * lines * 0.62;
  // The loupe: follows the pointer, or drifts on its own. On the plate it
  // shows the full-colour image; on paper it magnifies the engraving.
  let drift: vec2f = vec2f(sin(t * 0.21) * ww * 0.3, cos(t * 0.17) * wh * 0.22);
  let lc: vec2f = mix(drift, mouseP(), hov());
  let lr: f32 = 0.19 + 0.03 * sin(t * 0.7);
  let ld: f32 = length(p - lc);
  let lens: f32 = 1.0 - sstep(lr - 0.012, lr + 0.012, ld);
  let rim: f32 = lineCov(abs(ld - lr) / px, 0.6) + lineCov(abs(ld - lr - 0.008) / px, 0.3) * 0.6;
  let pm: vec2f = lc + (p - lc) / 1.7;
  let wuvM: vec2f = vec2f((pm.x + ww * 0.5) / ww, (wh * 0.5 - pm.y) / wh);
  let colM: vec3f = imgLod(clamp(squareUV(coverUV(wuvM, ww / wh, ia), ia), vec2f(0.0), vec2f(1.0)), 0, max(lod - 0.75, 0.0)).rgb;
  let lumM: f32 = pow(saturate(luma(colM)), 0.9);
  let qM: vec2f = (pm - vec2f(0.0, 0.04)) / vec2f(max(ww, 0.3) * 0.5, wh * 0.5);
  let c1M: f32 = pm.y * 0.94 + pm.x * 0.34 + (1.0 - min(dot(qM, qM), 1.6)) * 0.045 + lumM * sp * 0.9;
  let magn: vec3f = ink * engrave(c1M, sp, 0.08 + mix(lumM, 1.0 - lumM, THEME_PAPER) * 0.9);
  let inLens: vec3f = select(col * 0.95 + ink * lines * 0.08, magn, paper);
  let revealC: vec3f = mix(engr, inLens, lens) + holo(atan2(p.y - lc.y, p.x - lc.x) * 0.3 + t * 0.1) * rim * 0.55;
  var img: vec3f = select(select(revealC, duo, (mode > 0.5) && (mode < 1.5)), engr, mode < 0.5);
  img = mix(mix(silver(), ink, 0.5) * wait * 0.45 + mix(silver(), holo(foilPhase(p, 2.0)), 0.5) * waitSeal.x + u.accent.rgb * waitSeal.y, img, shown);
  img += holo(diag * 2.4 + k) * edgeGlow * 0.6;

  // ── Window mask and frames ──
  let rectD: f32 = sdBox(p, vec2f(ww * 0.5, wh * 0.5));
  // With a caption, the oval rises to leave it room underneath.
  let oc: vec2f = vec2f(0.0, 0.055 * hasText);
  let ex: vec2f = vec2f(ww * 0.5 * 0.94, wh * 0.5 * (0.97 - 0.13 * hasText));
  let eq: vec2f = (p - oc) / ex;
  let eDist: f32 = (length(eq) - 1.0) * min(ex.x, ex.y);
  let winD: f32 = select(rectD, eDist, oval);
  let inWin: f32 = select(fillAA(winD), 1.0, none);
  var c: vec3f = img * inWin;

  // Oval: guilloche ground outside, banded rim with microprint.
  let ground: f32 = rosette(eq * min(ex.x, ex.y), vec2f(0.0), min(ex.x, ex.y) * 1.16, 0.035, 36.0, 4, 0.25, t * 0.05) * (1.0 - inWin) * (1.0 - hasText * sstep(oc.y - ex.y + 0.02, oc.y - ex.y - 0.03, p.y) * step(abs(p.x), ww * 0.42));
  let rimO: f32 = lineCov(abs(eDist) / px, 0.6) + lineCov(abs(eDist - 0.014) / px, 0.3) + lineCov(abs(eDist - 0.042) / px, 0.45);
  let ringO: f32 = ringTextP(eq * min(ex.x, ex.y), vec2f(0.0), min(ex.x, ex.y) * 1.0 + 0.026, 0.013, 2, t * 0.01, false);
  // Rect: keylines, corner rosettes and microprint top and bottom.
  let edgeR: f32 = lineCov(abs(rectD) / px, 0.55) + lineCov(abs(rectD - 0.018) / px, 0.3);
  let cornersR: f32 = frameCorners(p, inset * 0.5, inset * 0.42);
  let micT: f32 = textLoopP(p, 0.5 - inset * 0.5 + 0.0065, 0.013, 2, t * 0.01, 0.0) * step(abs(p.x), A * 0.5 - inset * 1.2);
  let micB: f32 = textLoopP(p, -0.5 + inset * 0.5 + 0.0065, 0.013, 2, -t * 0.01, 0.0) * step(abs(p.x), A * 0.5 - inset * 1.2);
  let frameInk: vec3f = mix(inkCol(p, 1.3), silver(), 0.35);
  let ovalF: f32 = select(0.0, 1.0, oval);
  let rectF: f32 = select(0.0, 1.0, !oval && !none);
  c += ovalF * (mix(frameInk, holo(foilPhase(p, 2.0)), 0.4) * ground * 0.32 + frameInk * rimO * 0.8 + silver() * ringO * 0.6);
  c += rectF * (frameInk * (edgeR * 0.7 + cornersR * 0.55) + inkCol(p, 1.3) * (micT + micB) * 0.45);

  // ── Caption: a dark band with the title and line, bottom left ──
  let capY: f32 = -wh * 0.5 + 0.03;
  let hs: f32 = textFitP(0, ww * 0.7, 0.05);
  let ss: f32 = textFitP(1, ww * 0.7, 0.02);
  let bandH: f32 = (hs + ss + 0.07) * hasText;
  let band: f32 = (1.0 - sstep(capY + bandH * 0.6, capY + bandH * 1.25, p.y)) * inWin * hasText;
  c = mix(c, c * 0.22, band * 0.85 * select(1.0, 0.0, oval));
  let tx: f32 = select(-ww * 0.5 + 0.05, -textWidthP(0, hs) * 0.5, oval);
  let tyH: f32 = select(capY + hs + ss + 0.045, oc.y - ex.y - 0.035, oval);
  let head: f32 = textDecodeP(p, vec2f(tx, tyH), hs, 0, 0.35, saturate((intro() - 0.2) / 0.8));
  let sub: f32 = textRunP(p, vec2f(select(-ww * 0.5 + 0.05, -textWidthP(1, ss) * 0.5, oval), tyH - hs - 0.022), ss, 1, 0.05);
  c += mix(silver(), holo(foilPhase(p, 1.4) + 0.3), 0.3) * head + silver() * sub * 0.75;

  // Corner seal.
  let sv: vec2f = brandSeal(p, vec2f(ww * 0.5 - 0.075, -wh * 0.5 + 0.075), 0.046, slot) * select(1.0, 0.0, oval);
  c += mix(silver(), holo(foilPhase(p, 2.0) + 0.2), 0.5) * sv.x * 0.9 + u.accent.rgb * sv.y * 0.8;
  return c;
}
`,
};
