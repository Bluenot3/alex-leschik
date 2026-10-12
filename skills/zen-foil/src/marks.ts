import { atlas, drawPath, loadMask, LOGO, LOGO_CELL, MARK_SLOTS } from "./atlas";

/**
 * Brand marks: any logo becomes an engravable signed-distance mark.
 *
 * Slots 0–2 hold the built-ins (zen, bgc, near); slots 3–7 hold registered
 * marks. A mark can come from
 *   – SVG path data (Simple Icons' 24 × 24 paths drop straight in),
 *   – inline <svg> markup,
 *   – an image URL (PNG/SVG/WebP; same-origin or CORS-enabled), or
 *   – a canvas you drew yourself.
 * Only the shape matters: every opaque pixel is ink (or, with
 * channel "dark", every dark pixel — for logos on a white background).
 */

export type MarkChannel = "alpha" | "luma" | "dark";

export type MarkSource =
  | string
  | { path: string; viewBox?: [number, number, number, number]; fillRule?: CanvasFillRule; padding?: number }
  | { svg: string; padding?: number }
  | { url: string; channel?: MarkChannel; padding?: number }
  | { canvas: HTMLCanvasElement | OffscreenCanvas; channel?: MarkChannel; padding?: number };

const DEFAULT_PAD = 28;
const slots = new Map<string, number>([
  ["zen", LOGO.zen],
  ["bgc", LOGO.bgc],
  ["near", LOGO.near],
]);
/** Registered names in slots 3–7, least recently registered first. */
const order: string[] = [];

function isPathData(s: string) {
  return /^\s*[Mm]\s*-?[\d.]/.test(s) && !/[<>]/.test(s);
}

function svgToDataUrl(svg: string) {
  let markup = svg.trim();
  // Give viewBox-only SVGs an intrinsic size so <img> decodes them.
  if (!/<svg[^>]*\swidth=/.test(markup)) markup = markup.replace(/<svg/, '<svg width="512" height="512"');
  if (!/xmlns=/.test(markup)) markup = markup.replace(/<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
}

/** Moves the chosen coverage channel into alpha. */
function toAlpha(rgba: Uint8ClampedArray, channel: MarkChannel) {
  if (channel === "alpha") return rgba;
  for (let i = 0; i < rgba.length; i += 4) {
    const l = (rgba[i] * 0.299 + rgba[i + 1] * 0.587 + rgba[i + 2] * 0.114) * (rgba[i + 3] / 255);
    const bg = 255 - rgba[i + 3];
    rgba[i + 3] = channel === "luma" ? l : Math.max(0, 255 - l - bg);
  }
  return rgba;
}

async function rasterize(source: MarkSource): Promise<Uint8ClampedArray | null> {
  if (typeof source === "string") {
    const s = source.trim();
    if (s.startsWith("<svg")) return rasterize({ svg: s });
    if (isPathData(s)) return rasterize({ path: s });
    return rasterize({ url: s });
  }
  const pad = source.padding ?? DEFAULT_PAD;
  if ("path" in source) return drawPath(source.path, source.viewBox ?? [0, 0, 24, 24], pad, source.fillRule ?? "nonzero");
  if ("svg" in source) return loadMask(svgToDataUrl(source.svg), LOGO_CELL, LOGO_CELL, "contain", pad);
  if ("url" in source) {
    const data = await loadMask(source.url, LOGO_CELL, LOGO_CELL, "contain", pad);
    return data && toAlpha(data, source.channel ?? "alpha");
  }
  const c = document.createElement("canvas");
  c.width = LOGO_CELL;
  c.height = LOGO_CELL;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  const w = source.canvas.width;
  const h = source.canvas.height;
  const s = Math.min((LOGO_CELL - pad * 2) / w, (LOGO_CELL - pad * 2) / h);
  ctx.drawImage(source.canvas as CanvasImageSource, (LOGO_CELL - w * s) / 2, (LOGO_CELL - h * s) / 2, w * s, h * s);
  return toAlpha(ctx.getImageData(0, 0, LOGO_CELL, LOGO_CELL).data, source.channel ?? "alpha");
}

/**
 * Registers (or replaces) a brand mark and returns its atlas slot. The slot
 * is usable at once; the mark appears as soon as it has been rasterized.
 * Up to five custom marks live at a time — a sixth reuses the oldest slot.
 */
export function registerMark(name: string, source: MarkSource): number {
  const key = name.trim();
  let slot = slots.get(key);
  if (slot === undefined || slot < 3) {
    if (order.length >= MARK_SLOTS - 3) {
      const evicted = order.shift()!;
      slot = slots.get(evicted)!;
      slots.delete(evicted);
      console.warn(`[zen-foil] more than ${MARK_SLOTS - 3} custom marks; "${evicted}" was replaced by "${key}"`);
    } else {
      slot = 3 + order.length;
    }
    slots.set(key, slot);
  } else {
    order.splice(order.indexOf(key), 1);
  }
  order.push(key);
  const target = slot;
  void rasterize(source).then((rgba) => {
    if (!rgba) {
      console.warn(`[zen-foil] mark "${key}" could not be loaded (check the URL and its CORS headers)`);
      return;
    }
    if (slots.get(key) === target) atlas.writeMark(target, rgba, 3);
  });
  return target;
}

/**
 * Resolves a mark attribute: a registered name ("zen", "bgc", "near", or one
 * of yours), "none" / "" for no mark, or a source (path data, <svg>, URL),
 * which is registered on first use under its own text.
 */
export function markSlot(value: string | undefined | null): number {
  const v = (value ?? "").trim();
  if (!v || v === "none") return -1;
  const known = slots.get(v);
  if (known !== undefined) return known;
  if (isPathData(v) || v.startsWith("<svg") || /[./:]/.test(v)) return registerMark(v, v);
  console.warn(`[zen-foil] unknown mark "${v}" — register it with registerMark("${v}", source) first`);
  return -1;
}

/** Names of the marks currently available. */
export function markNames() {
  return [...slots.keys()];
}
