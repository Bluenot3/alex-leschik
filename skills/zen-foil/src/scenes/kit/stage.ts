import { LayerLoadError, loadImage } from "../../images";
import { parseList } from "../../scene";
import type { FoilScene } from "../../types";

/** vec4 slots in u.d written each frame by the behavior. */
const SLOT = {
  /** (image aspect in layer 0, in layer 1, transition start s, incoming layer) */
  images: 8,
  /** (layer aspect, layer 0 ready, layer 1 ready, layer width px) */
  layers: 9,
} as const;

/**
 * stage — an image gallery on the GPU.
 *
 * Each image is shown whole over a blurred, darkened copy of itself, so
 * portrait and wide images both sit in the frame. A new image mints in: a
 * diagonal front sweeps across, the old image dissolving into its own burin
 * lines while the new one resolves from engraving into full colour. A
 * holographic sheen drifts across, the pointer carries a soft light and
 * parallax, and microprint runs along the frame.
 */
export const stage: FoilScene = {
  id: "stage",
  title: "Image stage",
  description: "Gallery that mints each image in through its own engraved lines, over a blurred copy of itself, with sheen and microprint.",
  post: "raw",
  aspect: 16 / 9,
  accent: "#6ba3f5",
  still: 4.0,
  params: {
    images: { type: "list", default: "", description: "Image URLs (same-origin or CORS-enabled), shown in turn." },
    src: { type: "url", default: "", description: "Show this one image (overrides images; set it to drive the stage yourself)." },
    interval: { type: "number", default: "6", min: 2, max: 120, description: "Seconds per image." },
    top: { type: "text", brand: true, slot: 0, default: "VISUAL ARCHIVE · ZEN AI CO · BUILT IN PUBLIC · ", description: "Microprint along the top." },
    bottom: { type: "text", brand: true, slot: 1, default: "ARCHIVE OF CAMPAIGNS, INTERFACES & GENERATIVE SYSTEMS · ", description: "Microprint along the bottom." },
  },
  layers(_params, box) {
    const w = Math.min(2048, Math.max(512, Math.round(box.width * Math.min(box.dpr, 2))));
    const h = Math.max(256, Math.round((w * box.height) / Math.max(box.width, 1)));
    return { width: w, height: h, count: 2 };
  },
  behavior(ctx) {
    const w = ctx.layers?.width ?? 1024;
    const h = ctx.layers?.height ?? 576;
    const s = { aspects: [1, 1], ready: [0, 0], urls: [null, null] as (string | null)[], cur: 0, start: -100, pending: "", dirty: true };
    let list: string[] = [];
    let index = 0;
    let timer = 0;
    let visible = true;
    let destroyed = false;

    const show = (src: string) => {
      if (!src || (s.urls[s.cur] === src && s.ready[s.cur])) return;
      s.pending = src;
      loadImage(src)
        .then((img) => {
          if (destroyed || s.pending !== src) return;
          // Contain-fit into the free layer (transparent margins); the shader
          // fills them with a blurred copy of the image.
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const c2 = canvas.getContext("2d")!;
          c2.imageSmoothingQuality = "high";
          const k = Math.min(w / img.naturalWidth, h / img.naturalHeight);
          c2.drawImage(img, (w - img.naturalWidth * k) / 2, (h - img.naturalHeight * k) / 2, img.naturalWidth * k, img.naturalHeight * k);
          const slot = s.ready[s.cur] ? 1 - s.cur : s.cur;
          ctx.setLayer(slot, canvas);
          s.aspects[slot] = img.naturalWidth / img.naturalHeight;
          s.ready[slot] = 1;
          s.urls[slot] = src;
          s.cur = slot;
          s.start = -1;
          s.dirty = true;
        })
        .catch((err: unknown) => {
          if (destroyed || s.pending !== src) return;
          ctx.warn(err instanceof LayerLoadError && err.corsOnly ? `image has no CORS headers, so the GPU can't read it: ${src}` : `image failed to load: ${src}`);
          if (list.length > 1) advance();
        });
    };
    const advance = () => {
      if (!list.length) return;
      index = (index + 1) % list.length;
      show(list[index]);
    };
    const schedule = () => {
      window.clearInterval(timer);
      const p = ctx.params();
      if (p.src || list.length < 2 || ctx.reduced) return;
      timer = window.setInterval(() => visible && !document.hidden && advance(), Math.max(2, Number(p.interval) || 6) * 1000);
    };
    const apply = (p: Record<string, string>) => {
      list = parseList(p.images);
      if (p.src) show(p.src);
      else if (list.length) show(list[Math.min(index, list.length - 1)]);
      schedule();
    };
    apply(ctx.params());

    return {
      update: apply,
      visible(on) {
        visible = on;
      },
      needsFrame() {
        const d = s.dirty;
        s.dirty = false;
        return d;
      },
      frame(u) {
        // Transition clocks run on scene time (u.time.x).
        const frozen = typeof (globalThis as { ZEN_FOIL_FREEZE?: number }).ZEN_FOIL_FREEZE === "number";
        if (s.start === -1) s.start = ctx.reduced || frozen ? -100 : u[4];
        const im = 28 + SLOT.images * 4;
        u[im] = s.aspects[0];
        u[im + 1] = s.aspects[1];
        u[im + 2] = s.start;
        u[im + 3] = s.cur;
        const ly = 28 + SLOT.layers * 4;
        u[ly] = w / h;
        u[ly + 1] = s.ready[0];
        u[ly + 2] = s.ready[1];
        u[ly + 3] = w;
      },
      destroy() {
        destroyed = true;
        window.clearInterval(timer);
      },
    };
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
  let la: f32 = u.d[${SLOT.layers}].x;
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
  let im: vec4f = u.d[${SLOT.images}];
  let ly: vec4f = u.d[${SLOT.layers}];
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
  // Nothing loaded yet: an engraved rosette waits in the frame.
  let waitR: f32 = rosette(p, vec2f(0.0), 0.22, 0.05, 16.0, 6, 0.3, t * 0.08) + rosette(p, vec2f(0.0), 0.15, 0.04, 11.0, 5, 0.28, -t * 0.06);
  col = mix(col + mix(silver(), holo(t * 0.05 + p.x), 0.4) * saturate(waitR) * 0.35, col, max(hasCur, hasPrv));
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
  let topRun: f32 = textLoop(p, 0.4885, 0.0135, strParam(0).x, strParam(0).y, t * 0.01, 0.0);
  let botRun: f32 = textLoop(p, -0.4755, 0.0135, strParam(1).x, strParam(1).y, -t * 0.01, 0.0);
  let band: f32 = 1.0 - sstep(0.026, 0.03, 0.5 - abs(p.y));
  col = mix(col, col * 0.35, band);
  col += mix(silver(), holo(p.x * 0.8 + t * 0.03), 0.4) * (keyline * 0.35 + (topRun + botRun) * 0.55);

  let v: vec2f = uv0 - 0.5;
  col *= 1.0 - dot(v, v) * 0.55;
  return col;
}
`,
};
