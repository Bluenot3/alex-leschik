import worldUrl from "./assets/world-land.png";
import zenLogoUrl from "./assets/logo-zen.png";
import bgcLogoUrl from "./assets/logo-bgc.png";

/**
 * Signed-distance atlas, generated at idle time. 1024 × 2048, one 8-bit
 * channel:
 *
 *   rows    0–511  128 glyph cells (16 × 8, 64 px) — DM Mono microprint
 *   rows  512–1023 contiguous U.S. silhouette, Albers equal-area
 *   rows 1024–1535 world land, equirectangular (Natural Earth 1:50m)
 *   rows 1536–2047 brand marks, 256 px cells (see LOGO)
 *
 * Distances come from the Felzenszwalb–Huttenlocher exact Euclidean
 * transform with sub-pixel edge seeding, so glyphs and marks stay crisp from
 * 6 px microprint up to display sizes. Brand masks are tiny 4-bit coverage
 * PNGs: the ZEN and Boys & Girls Clubs marks are lifted from the owner's
 * certificate artwork, the NEAR mark is Simple Icons' path (CC0).
 */

export const ATLAS_W = 1024;
export const ATLAS_H = 2048;
export const GLYPH_CELL = 64;
export const GLYPH_RADIUS = 10;
export const MAP_RADIUS = 48;
export const WORLD_RADIUS = 16;
export const LOGO_CELL = 256;
export const LOGO_RADIUS = 24;

/** Brand-mark slots in the atlas (logoD / logoCov in the shader library). */
export const LOGO = { zen: 0, bgc: 1, near: 2 } as const;

const NEAR_PATH =
  "M21.443 0c-.89 0-1.714.46-2.18 1.218l-5.017 7.448a.533.533 0 0 0 .792.7l4.938-4.282a.2.2 0 0 1 .334.151v13.41a.2.2 0 0 1-.354.128L5.03.905A2.555 2.555 0 0 0 3.078 0h-.521A2.557 2.557 0 0 0 0 2.557v18.886a2.557 2.557 0 0 0 4.736 1.338l5.017-7.448a.533.533 0 0 0-.792-.7l-4.938 4.283a.2.2 0 0 1-.333-.152V5.352a.2.2 0 0 1 .354-.128l14.924 17.87c.486.574 1.2.905 1.952.906h.521A2.558 2.558 0 0 0 24 21.445V2.557A2.558 2.558 0 0 0 21.443 0Z";

export const GLYPH_TABLE =
  " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~" +
  "·•→←±×∷∵∴⊕⊗※÷≈≡∞△◇◈✦αλΣΩπ∇∂アイウエオカ";

const CODE_OF = new Map<string, number>();
Array.from(GLYPH_TABLE).forEach((ch, i) => CODE_OF.set(ch, i));

/** Characters requested that the atlas lacks (they render as "·"). */
export const missingGlyphs = new Set<string>();

/** Atlas code for a character (unknown characters map to "·"). */
export function glyphCode(ch: string): number {
  const code = CODE_OF.get(ch);
  if (code !== undefined) return code;
  missingGlyphs.add(ch);
  return CODE_OF.get("·") ?? 0;
}

/* Contiguous U.S. outline, [lon, lat], clockwise from Cape Flattery. */
const US_OUTLINE: [number, number][] = [
  [-124.7, 48.4], [-123.2, 48.2], [-122.8, 49.0], [-117.0, 49.0], [-110.0, 49.0], [-104.0, 49.0],
  [-97.2, 49.0], [-95.15, 49.0], [-95.15, 49.38], [-94.8, 49.3], [-93.0, 48.6], [-91.0, 48.2],
  [-89.6, 48.0], [-88.4, 48.3], [-86.5, 47.0], [-84.6, 46.5], [-84.1, 46.2], [-83.4, 45.4],
  [-82.4, 43.0], [-82.8, 42.3], [-83.2, 42.0], [-81.5, 41.8], [-79.8, 42.3], [-79.0, 42.8],
  [-79.2, 43.4], [-76.8, 43.6], [-76.2, 44.2], [-74.7, 45.0], [-71.5, 45.0], [-70.8, 45.4],
  [-70.0, 46.7], [-69.2, 47.45], [-68.2, 47.35], [-67.8, 47.1], [-67.8, 45.7], [-67.0, 44.8],
  [-68.5, 44.3], [-70.2, 43.6], [-70.8, 42.9], [-70.6, 42.6], [-71.0, 42.3], [-70.0, 41.8],
  [-69.95, 41.6], [-70.6, 41.5], [-71.8, 41.3], [-73.6, 40.9], [-72.0, 41.0], [-73.9, 40.5],
  [-74.0, 40.0], [-74.4, 39.4], [-74.9, 38.9], [-75.1, 38.4], [-75.6, 37.6], [-76.0, 36.9],
  [-75.5, 35.3], [-76.5, 34.6], [-77.9, 33.9], [-79.0, 33.2], [-80.2, 32.5], [-81.1, 32.0],
  [-81.4, 30.4], [-80.6, 28.5], [-80.0, 26.7], [-80.1, 25.8], [-80.4, 25.2], [-81.1, 25.1],
  [-81.8, 26.1], [-82.7, 27.5], [-82.8, 28.9], [-83.7, 29.9], [-84.4, 30.0], [-85.0, 29.7],
  [-85.7, 30.1], [-87.3, 30.3], [-88.1, 30.3], [-89.2, 30.3], [-89.4, 29.2], [-89.2, 29.0],
  [-90.2, 29.1], [-91.3, 29.3], [-92.3, 29.6], [-93.8, 29.7], [-94.8, 29.3], [-96.0, 28.6],
  [-97.2, 27.7], [-97.4, 26.8], [-97.2, 25.95], [-99.1, 26.4], [-99.5, 27.5], [-100.9, 29.4],
  [-102.4, 29.8], [-103.3, 29.0], [-104.5, 29.6], [-106.5, 31.8], [-108.2, 31.8], [-108.2, 31.33],
  [-111.1, 31.33], [-114.8, 32.5], [-117.1, 32.53], [-117.3, 33.1], [-118.5, 34.0], [-119.6, 34.4],
  [-120.6, 34.5], [-121.9, 36.6], [-122.5, 37.8], [-123.0, 38.3], [-123.7, 38.95], [-124.4, 40.4],
  [-124.2, 42.0], [-124.5, 42.8], [-124.1, 43.4], [-123.9, 45.5], [-124.0, 46.2], [-124.1, 47.0],
  [-124.7, 48.4],
];

/* Albers equal-area conic tuned for the lower 48 (USGS standard parallels). */
function albers(lon: number, lat: number): [number, number] {
  const rad = Math.PI / 180;
  const phi1 = 29.5 * rad;
  const phi2 = 45.5 * rad;
  const phi0 = 37.5 * rad;
  const lam0 = -96 * rad;
  const n = (Math.sin(phi1) + Math.sin(phi2)) / 2;
  const c = Math.cos(phi1) ** 2 + 2 * n * Math.sin(phi1);
  const rho0 = Math.sqrt(c - 2 * n * Math.sin(phi0)) / n;
  const rho = Math.sqrt(c - 2 * n * Math.sin(lat * rad)) / n;
  const theta = n * (lon * rad - lam0);
  return [rho * Math.sin(theta), rho0 - rho * Math.cos(theta)];
}

const MAP_W = 1024;
const MAP_H = 512;
const MAP_MARGIN = 64;

/** Fit transform: lon/lat → map-local q (0..1, y down) shared by atlas + data. */
const mapFit = (() => {
  const pts = US_OUTLINE.map(([lon, lat]) => albers(lon, lat));
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const scale = Math.min((MAP_W - MAP_MARGIN * 2) / (maxX - minX), (MAP_H - MAP_MARGIN * 2) / (maxY - minY));
  const offX = (MAP_W - (maxX - minX) * scale) / 2;
  const offY = (MAP_H - (maxY - minY) * scale) / 2;
  return (lon: number, lat: number): [number, number] => {
    const [x, y] = albers(lon, lat);
    const px = offX + (x - minX) * scale;
    const py = offY + (maxY - y) * scale;
    return [px / MAP_W, py / MAP_H];
  };
})();

export function projectUS(lon: number, lat: number): [number, number] {
  return mapFit(lon, lat);
}

/* ── Distance transform ─────────────────────────────────────── */

const INF = 1e20;

function edt1d(f: Float64Array, d: Float64Array, v: Int32Array, z: Float64Array, n: number) {
  v[0] = 0;
  z[0] = -INF;
  z[1] = INF;
  let k = 0;
  for (let q = 1; q < n; q++) {
    let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) {
      k--;
      s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = INF;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    const dq = q - v[k];
    d[q] = dq * dq + f[v[k]];
  }
}

function edt2d(grid: Float64Array, w: number, h: number) {
  const n = Math.max(w, h);
  const f = new Float64Array(n);
  const d = new Float64Array(n);
  const v = new Int32Array(n);
  const z = new Float64Array(n + 1);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) f[y] = grid[y * w + x];
    edt1d(f, d, v, z, h);
    for (let y = 0; y < h; y++) grid[y * w + x] = d[y];
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) f[x] = grid[y * w + x];
    edt1d(f, d, v, z, w);
    for (let x = 0; x < w; x++) grid[y * w + x] = d[x];
  }
}

/**
 * Coverage → encoded SDF bytes, written into the atlas at (x0, y0).
 * `channel` picks the RGBA component holding coverage (3 = alpha for canvas
 * drawing, 0 = red for grey mask images).
 */
function encodeSdf(
  rgba: Uint8ClampedArray,
  w: number,
  h: number,
  radius: number,
  out: Uint8Array,
  x0: number,
  y0: number,
  channel = 3,
) {
  const outer = new Float64Array(w * h);
  const inner = new Float64Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const a = rgba[i * 4 + channel] / 255;
    if (a >= 0.999) {
      outer[i] = 0;
      inner[i] = INF;
    } else if (a <= 0.001) {
      outer[i] = INF;
      inner[i] = 0;
    } else {
      const e = 0.5 - a;
      outer[i] = e > 0 ? e * e : 0;
      inner[i] = e < 0 ? e * e : 0;
    }
  }
  edt2d(outer, w, h);
  edt2d(inner, w, h);
  for (let y = 0; y < h; y++) {
    const row = (y0 + y) * ATLAS_W + x0;
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const sd = Math.sqrt(outer[i]) - Math.sqrt(inner[i]);
      const v = 0.5 - sd / (2 * radius);
      out[row + x] = Math.max(0, Math.min(255, Math.round(v * 255)));
    }
  }
}

const idle = () =>
  new Promise<void>((resolve) => {
    const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number })
      .requestIdleCallback;
    if (ric) ric(() => resolve(), { timeout: 300 });
    else window.setTimeout(resolve, 16);
  });

async function ensureFont() {
  if (!("fonts" in document)) return;
  try {
    await Promise.race([
      document.fonts.load('400 38px "DM Mono"'),
      new Promise((resolve) => window.setTimeout(resolve, 1500)),
    ]);
  } catch {
    /* fall back to the platform monospace */
  }
}

function drawGlyphs(): Uint8ClampedArray {
  const canvas = document.createElement("canvas");
  canvas.width = ATLAS_W;
  canvas.height = 512;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = '400 38px "DM Mono", ui-monospace, SFMono-Regular, Menlo, monospace';
  Array.from(GLYPH_TABLE).forEach((ch, i) => {
    const col = i % 16;
    const row = Math.floor(i / 16);
    ctx.fillText(ch, col * GLYPH_CELL + GLYPH_CELL / 2, row * GLYPH_CELL + 44);
  });
  return ctx.getImageData(0, 0, ATLAS_W, 512).data;
}

function drawMap(): Uint8ClampedArray {
  const canvas = document.createElement("canvas");
  canvas.width = MAP_W;
  canvas.height = MAP_H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  US_OUTLINE.forEach(([lon, lat], i) => {
    const [qx, qy] = mapFit(lon, lat);
    if (i === 0) ctx.moveTo(qx * MAP_W, qy * MAP_H);
    else ctx.lineTo(qx * MAP_W, qy * MAP_H);
  });
  ctx.closePath();
  ctx.fill();
  return ctx.getImageData(0, 0, MAP_W, MAP_H).data;
}

/** A coverage mask image (grey PNG) scaled into a w × h canvas; null if it can't load. */
async function loadMask(url: string, w: number, h: number): Promise<Uint8ClampedArray | null> {
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, w, h);
    return ctx.getImageData(0, 0, w, h).data;
  } catch {
    return null;
  }
}

/** The NEAR mark from its 24-unit SVG path, centred in a logo cell. */
function drawNear(): Uint8ClampedArray {
  const canvas = document.createElement("canvas");
  canvas.width = LOGO_CELL;
  canvas.height = LOGO_CELL;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  const pad = 30;
  const s = (LOGO_CELL - pad * 2) / 24;
  ctx.setTransform(s, 0, 0, s, pad, pad);
  ctx.fillStyle = "#fff";
  ctx.fill(new Path2D(NEAR_PATH));
  return ctx.getImageData(0, 0, LOGO_CELL, LOGO_CELL).data;
}

const WORLD_Y = 1024;
const LOGO_Y = 1536;

function logoOrigin(slot: number): [number, number] {
  return [(slot % 4) * LOGO_CELL, LOGO_Y + Math.floor(slot / 4) * LOGO_CELL];
}

let atlasPromise: Promise<Uint8Array<ArrayBuffer>> | null = null;

/** Builds (once) and returns the 1024 × 2048 R8 atlas. */
export function buildAtlas(): Promise<Uint8Array<ArrayBuffer>> {
  if (!atlasPromise) {
    atlasPromise = (async () => {
      const out = new Uint8Array(ATLAS_W * ATLAS_H);
      // Brand masks download while the glyphs are being distance-transformed.
      const masks = Promise.all([
        loadMask(worldUrl, 1024, 512),
        loadMask(zenLogoUrl, LOGO_CELL, LOGO_CELL),
        loadMask(bgcLogoUrl, LOGO_CELL, LOGO_CELL),
      ]);
      await ensureFont();
      await idle();
      encodeSdf(drawGlyphs(), ATLAS_W, 512, GLYPH_RADIUS, out, 0, 0);
      await idle();
      encodeSdf(drawMap(), MAP_W, MAP_H, MAP_RADIUS, out, 0, 512);
      const [world, zen, bgc] = await masks;
      await idle();
      if (world) encodeSdf(world, 1024, 512, WORLD_RADIUS, out, 0, WORLD_Y, 0);
      await idle();
      const logos: [number, Uint8ClampedArray | null, number][] = [
        [LOGO.zen, zen, 0],
        [LOGO.bgc, bgc, 0],
        [LOGO.near, drawNear(), 3],
      ];
      for (const [slot, data, channel] of logos) {
        if (!data) continue;
        const [x0, y0] = logoOrigin(slot);
        encodeSdf(data, LOGO_CELL, LOGO_CELL, LOGO_RADIUS, out, x0, y0, channel);
      }
      return out;
    })();
  }
  return atlasPromise;
}

/** Packs text into float slots, three 8-bit atlas codes per float (exact in f32). */
export function packText(text: string, into: Float32Array, startFloat: number) {
  const codes = Array.from(text).map(glyphCode);
  for (let i = 0; i < codes.length; i += 3) {
    const v = (codes[i] ?? 0) | ((codes[i + 1] ?? 0) << 8) | ((codes[i + 2] ?? 0) << 16);
    into[startFloat + i / 3] = v;
  }
  return Math.ceil(codes.length / 3);
}

/** Writes 2D points two per vec4, starting at vec4 index `baseVec4`. */
export function packPoints(points: [number, number][], into: Float32Array, baseVec4: number) {
  points.forEach(([x, y], i) => {
    into[baseVec4 * 4 + i * 2] = x;
    into[baseVec4 * 4 + i * 2 + 1] = y;
  });
}

/**
 * Lays out named strings in the data block from `startFloat` on and returns
 * their char offsets for interpolation into WGSL, plus a writer for data().
 */
export function layoutText<K extends string>(entries: Record<K, string>, startFloat: number) {
  let f = startFloat;
  const at = {} as Record<K, { start: number; count: number; float: number; text: string }>;
  for (const key of Object.keys(entries) as K[]) {
    const text = entries[key];
    const count = Array.from(text).length;
    at[key] = { start: f * 3, count, float: f, text };
    f += Math.ceil(count / 3);
  }
  if (f > 128) throw new Error(`foil text block overflow (${f} floats)`);
  return {
    at,
    write(d: Float32Array) {
      for (const key of Object.keys(at) as K[]) packText(at[key].text, d, at[key].float);
    },
  };
}
