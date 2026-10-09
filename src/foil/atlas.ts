/**
 * Signed-distance atlas, generated at idle time (no binary assets, no
 * requests). 1024 × 1024, one 8-bit channel:
 *
 *   rows   0–511  128 glyph cells (16 × 8, 64 px) — DM Mono microprint
 *   rows 512–1023 contiguous U.S. silhouette, Albers equal-area
 *
 * Distances come from the Felzenszwalb–Huttenlocher exact Euclidean
 * transform with sub-pixel edge seeding, so glyphs stay crisp from 6 px
 * microprint up to display sizes.
 */

export const ATLAS_SIZE = 1024;
export const GLYPH_CELL = 64;
export const GLYPH_RADIUS = 10;
export const MAP_RADIUS = 48;

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

/** Coverage (0..1 alpha) → encoded SDF bytes written into `out` at row offset. */
function encodeSdf(alpha: Uint8ClampedArray, w: number, h: number, radius: number, out: Uint8Array, rowOffset: number) {
  const outer = new Float64Array(w * h);
  const inner = new Float64Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const a = alpha[i * 4 + 3] / 255;
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
  for (let i = 0; i < w * h; i++) {
    const sd = Math.sqrt(outer[i]) - Math.sqrt(inner[i]);
    const v = 0.5 - sd / (2 * radius);
    out[rowOffset * w + i] = Math.max(0, Math.min(255, Math.round(v * 255)));
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
  canvas.width = ATLAS_SIZE;
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
  return ctx.getImageData(0, 0, ATLAS_SIZE, 512).data;
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

let atlasPromise: Promise<Uint8Array<ArrayBuffer>> | null = null;

/** Builds (once) and returns the 1024² R8 atlas. */
export function buildAtlas(): Promise<Uint8Array<ArrayBuffer>> {
  if (!atlasPromise) {
    atlasPromise = (async () => {
      const out = new Uint8Array(ATLAS_SIZE * ATLAS_SIZE);
      await ensureFont();
      await idle();
      encodeSdf(drawGlyphs(), ATLAS_SIZE, 512, GLYPH_RADIUS, out, 0);
      await idle();
      encodeSdf(drawMap(), MAP_W, MAP_H, MAP_RADIUS, out, 512);
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
