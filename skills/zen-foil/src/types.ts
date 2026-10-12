/**
 * Core types for the zen-foil engine.
 *
 * A scene is one fragment program in portable WGSL (see translate.ts) that
 * defines `fn scene(uv: vec2f, p: vec2f) -> vec3f` (or `-> vec4f` for
 * transparent "alpha" scenes). The engine wraps it with the shared shader
 * library, a post pass (the substrate, minting intro and sheen) and the entry
 * points, and runs it natively on WebGPU or, translated, on WebGL2.
 */

/** How a scene's output is composited. */
export type PostMode = "plate" | "paper" | "clear" | "raw" | "alpha";

/**
 * Themes a "plate" scene can be shown in: the dark engraved banknote plate
 * (default), light security paper, or transparent ink over the page.
 */
export type Theme = "plate" | "paper" | "clear";

/** Raw parameter values, exactly as attributes or props provide them. */
export type ParamValues = Record<string, string>;

/**
 * A scene parameter. Params with a `slot` (text) or `num` (number, boolean,
 * mark, color) are written into the data block automatically; the WGSL reads
 * them with textRunP/textLoopP/ringTextP (text) and numParam (numbers).
 * Anything else (points, lists, URLs) is the scene's to handle in data() or
 * its behavior.
 */
export interface ParamSpec {
  type: "text" | "number" | "boolean" | "choice" | "mark" | "color" | "points" | "list" | "url";
  /** Choice params: the allowed values (stored as their index). */
  options?: string[];
  default?: string;
  /** Text params: string-table slot 0–7. */
  slot?: number;
  /** Number/boolean/choice/mark params: numeric slot 0–15 (colors take three). */
  num?: number;
  /** Clamp for numbers. */
  min?: number;
  max?: number;
  /** One line for the docs and the lab. */
  description?: string;
}

/** Image layers a view needs (a texture_2d_array the shader samples). */
export interface LayerSpec {
  width: number;
  height: number;
  count: number;
}

export type LayerSource = HTMLCanvasElement | ImageBitmap | OffscreenCanvas;

/** Helpers handed to a scene's behavior (its per-view runtime). */
export interface BehaviorContext {
  /** The element the plate is mounted in (its pointer drives tilt). */
  host: HTMLElement;
  /** The element that receives pointer input. */
  target: HTMLElement;
  /** Current raw params (attributes / props, defaults filled in). */
  params(): ParamValues;
  /** Upload an image layer (after `layers` reserved them). */
  setLayer(index: number, source: LayerSource | null): void;
  /** Ask for a redraw (needed under reduced motion, where frames are on demand). */
  invalidate(): void;
  /** The visitor asked for reduced motion: show stills, no drift. */
  readonly reduced: boolean;
  /** The reserved layer size, if any. */
  readonly layers: LayerSpec | null;
  /** Report a problem (surfaces as a console warning and a foil-error event). */
  warn(message: string): void;
}

/** A scene's per-view runtime: pointer/scroll state, image loading, timers. */
export interface Behavior {
  /** Write per-frame uniforms: u[20..23] = p0, u[24..27] = p1, u[28..] = d. */
  frame?(u: Float32Array, now: number, dt: number): void;
  /** Under reduced motion: return true when a fresh still is needed. */
  needsFrame?(): boolean;
  /** Params changed (after the data block was rewritten). */
  update?(params: ParamValues): void;
  /** The view went off/on screen. */
  visible?(on: boolean): void;
  destroy?(): void;
}

export interface FoilScene {
  id: string;
  /** Portable WGSL defining scene(uv, p). */
  code: string;
  /** Scene time used for the reduced-motion still frame. */
  still?: number;
  /**
   * "plate" (default): additive light over the engraved substrate, with the
   * minting intro; also renders as "paper" or "clear" via the theme.
   * "raw": scene() is the final colour (full-bleed fields, stages).
   * "alpha": scene() returns premultiplied vec4f and composites over the page.
   */
  post?: "plate" | "raw" | "alpha";
  /** Parameters, with their defaults. */
  params?: Record<string, ParamSpec>;
  /** Fills the static data block u.d (256 floats). Re-run when params change. */
  data?: (d: Float32Array, params: ParamValues) => void;
  /** Image layers to reserve for a view (count and pixel size). */
  layers?: (params: ParamValues, box: { width: number; height: number; dpr: number }) => LayerSpec | null;
  /** Per-view runtime (pointer, scroll, images…). */
  behavior?: (ctx: BehaviorContext) => Behavior;
  /** Preferred aspect ratio (width / height) when the page doesn't size the element. */
  aspect?: number;
  /** Accent used when none is given, hex. */
  accent?: string;
  /** Short human title and description, for the lab and docs. */
  title?: string;
  description?: string;
}

/* ── Uniform block ──────────────────────────────────────────────
   res, time, mouse, tilt, accent, p0, p1 (7 vec4) + d: array<vec4f, 64>. */
export const DATA_VEC4S = 64;
export const UNIFORM_FLOATS = (7 + DATA_VEC4S) * 4;
export const UNIFORM_BYTES = UNIFORM_FLOATS * 4;
/** Float offset of u.d inside the uniform block. */
export const DATA_OFFSET = 7 * 4;
export const DATA_FLOATS = DATA_VEC4S * 4;

/* ── Data block map for parameterised scenes ──
   d[0..3]   string table: slot k → d[k/2].xy (even) / .zw (odd) = (start, count)
   d[4..7]   numeric params 0–15
   d[8..39]  free for the scene's own data() (arrays, static text)
   d[40..63] characters of the text params (3 per float, 288 in all) */
export const STRING_SLOTS = 8;
export const NUM_SLOTS = 16;
export const NUM_BASE_FLOAT = 16;
export const FREE_BASE_FLOAT = 32;
export const TEXT_BASE_FLOAT = 160;

export interface ViewState {
  id: number;
  /** Stable element owned by the caller; the engine owns the canvas inside. */
  host: HTMLElement;
  canvas: HTMLCanvasElement;
  target: HTMLElement;
  program: Program;
  accent: [number, number, number];
  seed: number;
  visible: boolean;
  cssW: number;
  cssH: number;
  pxW: number;
  pxH: number;
  uniforms: Float32Array;
  /** Pointer in uv (0..1), smoothed + target. */
  mx: number;
  my: number;
  tmx: number;
  tmy: number;
  hover: number;
  hoverTarget: number;
  pulse: number;
  tiltX: number;
  tiltY: number;
  introStart: number;
  drawn: boolean;
  dirty: boolean;
  /** Paused by its owner (e.g. hidden while still on screen). */
  active: boolean;
  /** Image layers reserved for this view, and their current sources. */
  layers: LayerSpec | null;
  layerSrc: (LayerSource | null)[];
  /** Backend-owned resources. */
  res: unknown;
}

/** A compiled unit: a scene under one post mode. */
export interface Program {
  key: string;
  scene: FoilScene;
  post: PostMode;
}

export interface FoilBackend {
  readonly kind: "webgpu" | "webgl2";
  /** Async compilers can take every program up front; sync ones go lazily. */
  readonly eagerCompile: boolean;
  setAtlas(data: Uint8Array): void;
  /** Starts (async) compilation for a program. Safe to call repeatedly. */
  prepare(program: Program): void;
  status(program: Program): "pending" | "ready" | "failed";
  attach(view: ViewState): void;
  detach(view: ViewState): void;
  /** Uploads one image layer (allocating the view's array on first use). */
  writeLayer(view: ViewState, index: number, source: LayerSource): void;
  /** Renders every view in one submission; returns the views that were drawn. */
  render(views: ViewState[]): ViewState[];
  onLost(cb: () => void): void;
  /** Reads back the next frame drawn for a view (previews and tests). */
  capture?(view: ViewState): Promise<ImageData | null>;
  destroy(): void;
}

export interface FoilDiagnostics {
  backend: string;
  errors: { scene: string; message: string }[];
  frames: number;
  quality: number;
}
