/**
 * zen-foil — engraved-hologram GPU plates (WebGPU + WebGL2) for any web project.
 *
 *   <script type="module" src=".../zen-foil.js"></script>
 *   <zen-foil scene="seal" headline="ZEN AI CO" accent="#7cc4ff"></zen-foil>
 *
 * Importing the module registers <zen-foil> and the kit scenes. Full docs:
 * SKILL.md and reference/ in the skill folder.
 */

/** "plate" (dark engraved plate), "paper" (light security paper) or "clear" (ink over the page). */
export type Theme = "plate" | "paper" | "clear";
export type PostMode = "plate" | "paper" | "clear" | "raw" | "alpha";
/** Raw parameter values, as attribute strings. */
export type ParamValues = Record<string, string>;

export interface ParamSpec {
  type: "text" | "number" | "boolean" | "choice" | "mark" | "color" | "points" | "list" | "url";
  default?: string;
  /** Text params: string-table slot 0–7 (WGSL: textRunP(…, k, …)). */
  slot?: number;
  /** Number/boolean/choice/mark params: numeric slot 0–15 (WGSL: numParam(i)). Colors take three. */
  num?: number;
  /** Choice params: allowed values (stored as their index). */
  options?: string[];
  min?: number;
  max?: number;
  description?: string;
  /** Docs only: the default is ZEN AI Co. copy, data or mark, so another brand must set this param. */
  brand?: boolean;
}

export interface LayerSpec {
  width: number;
  height: number;
  count: number;
}
export type LayerSource = HTMLCanvasElement | ImageBitmap | OffscreenCanvas;

export interface BehaviorContext {
  host: HTMLElement;
  target: HTMLElement;
  params(): ParamValues;
  setLayer(index: number, source: LayerSource | null): void;
  invalidate(): void;
  readonly reduced: boolean;
  readonly layers: LayerSpec | null;
  warn(message: string): void;
}

export interface Behavior {
  /** Write per-frame uniforms: u[20..23] = p0, u[24..27] = p1, u[28 + i] = d float i. */
  frame?(u: Float32Array, now: number, dt: number): void;
  needsFrame?(): boolean;
  update?(params: ParamValues): void;
  visible?(on: boolean): void;
  destroy?(): void;
}

export interface FoilScene {
  id: string;
  /** Portable WGSL defining fn scene(uv: vec2f, p: vec2f) -> vec3f (vec4f for post "alpha"). */
  code: string;
  still?: number;
  post?: "plate" | "raw" | "alpha";
  params?: Record<string, ParamSpec>;
  /** Fill the 256-float data block u.d (floats 32–159 are yours; params own the rest). */
  data?: (d: Float32Array, params: ParamValues) => void;
  layers?: (params: ParamValues, box: { width: number; height: number; dpr: number }) => LayerSpec | null;
  behavior?: (ctx: BehaviorContext) => Behavior;
  aspect?: number;
  accent?: string;
  title?: string;
  description?: string;
}

export interface MountOptions {
  scene: string | FoilScene;
  /** Any CSS colour (hex, rgb(), hsl(var(--primary)), oklch()…) or 0–1 RGB. */
  accent?: string | [number, number, number];
  theme?: Theme;
  params?: ParamValues;
  target?: HTMLElement | null;
  seed?: number;
  maxDpr?: number;
  glMaxDpr?: number;
  onLive?: () => void;
  onFail?: (reason: string) => void;
}

export interface FoilHandle {
  readonly scene: FoilScene;
  readonly params: ParamValues;
  update(params: ParamValues): void;
  setAccent(accent: string | [number, number, number]): void;
  setLayer(index: number, source: LayerSource | null): void;
  setActive(active: boolean): void;
  capture(): Promise<ImageData | null>;
  /** Plays the minting intro again (no-op under reduced motion). */
  replay(): void;
  destroy(): void;
}

export type MarkChannel = "alpha" | "luma" | "dark";
export type MarkSource =
  | string
  | { path: string; viewBox?: [number, number, number, number]; fillRule?: CanvasFillRule; padding?: number }
  | { svg: string; padding?: number }
  | { url: string; channel?: MarkChannel; padding?: number }
  | { canvas: HTMLCanvasElement | OffscreenCanvas; channel?: MarkChannel; padding?: number };

export type RendererStatus = "pending" | "webgpu" | "webgl2" | "static";

export interface ValidationResult {
  scene: string;
  post: PostMode;
  lint: string[];
  webgpu: string[] | null;
  webgl2: string[] | null;
}

export type TickFn = (now: number, deltaMs: number) => void;
export type SubscribeTick = (fn: TickFn) => () => void;

export interface FoilEngine {
  readonly reduced: boolean;
  readonly renderer: RendererStatus;
  readonly diagnostics: { backend: string; errors: { scene: string; message: string }[]; frames: number; quality: number };
  subscribeStatus(cb: (s: RendererStatus) => void): () => void;
  capture(host: HTMLElement): Promise<ImageData | null>;
  replay(host: HTMLElement): void;
  invalidate(host: HTMLElement): void;
}

/** Registers (or replaces) a scene for <zen-foil scene="id"> and mount(). */
export declare function defineScene(scene: FoilScene): FoilScene;
export declare function getScene(id: string): FoilScene | undefined;
export declare function listScenes(): FoilScene[];
/** Mounts a live plate into a sized element. */
export declare function mount(host: HTMLElement, opts: MountOptions): FoilHandle;
export declare function buildData(scene: FoilScene, params: ParamValues): Float32Array;
export declare function resolveParams(scene: FoilScene, raw?: ParamValues): ParamValues;
export declare function resolveColor(value: string | [number, number, number] | undefined, context?: Element | null): [number, number, number] | null;
export declare function parseList(value: string | undefined): string[];
export declare function parseNumbers(value: string | undefined): number[];
export declare function parsePoints(value: string | undefined): [number, number][];
/** First float of u.d a scene's own data() may use. */
export declare const SCENE_DATA_BASE: number;

/** Registers a brand mark (slots 3–7) and returns its atlas slot. */
export declare function registerMark(name: string, source: MarkSource): number;
export declare function markSlot(value: string | undefined | null): number;
export declare function markNames(): string[];

/** Drive every plate from your page's own shared animation clock. */
export declare function setClock(subscribe: SubscribeTick | null): void;
export declare function subscribeTick(fn: TickFn): () => void;
export declare function prefersReducedMotion(): boolean;
export declare function getFoilEngine(): FoilEngine;

export declare function layoutText<K extends string>(
  entries: Record<K, string>,
  startFloat: number,
  limit?: number,
): { at: Record<K, { start: number; count: number; float: number; text: string }>; end: number; write(d: Float32Array): void };
export declare function packText(text: string, into: Float32Array, startFloat: number): number;
export declare function packPoints(points: [number, number][], into: Float32Array, baseVec4: number): void;
/** (lon, lat) → U.S. map-local q (0..1, y down), as mapD() samples it. */
export declare function projectUS(lon: number, lat: number): [number, number];
export declare function glyphCode(ch: string): number;
export declare const GLYPH_TABLE: string;
export declare const LOGO: { readonly zen: 0; readonly bgc: 1; readonly near: 2 };

/** Static portability checks for scene WGSL (returns readable problems). */
export declare function lintWgsl(code: string, label?: string): string[];
/** Names the library already declares (a scene must not redeclare them). */
export declare function libraryNames(): string[];
export declare function wgslToGlsl(src: string): string;
export declare function wgslModule(program: { key: string; scene: FoilScene; post: PostMode }): string;
export declare function glslFragment(program: { key: string; scene: FoilScene; post: PostMode }): string;
/** The shared WGSL library source. */
export declare const LIBRARY: string;

export declare class LayerLoadError extends Error {
  readonly corsOnly: boolean;
  constructor(message: string, corsOnly: boolean);
}
export declare function loadImage(url: string): Promise<HTMLImageElement>;
export declare function loadLayer(url: string, w: number, h: number): Promise<HTMLCanvasElement>;
export declare function drawContain(src: CanvasImageSource, iw: number, ih: number, canvas: HTMLCanvasElement): void;
export declare function drawCover(src: CanvasImageSource, iw: number, ih: number, canvas: HTMLCanvasElement): void;
export declare function videoLayer(
  url: string,
  w: number,
  h: number,
): { canvas: HTMLCanvasElement; ready: Promise<void>; play(): Promise<void>; pause(): void; draw(): boolean; dispose(): void };

/** Compiles scenes on WebGPU and WebGL2 (without drawing) and lints them. */
export declare function validateScenes(ids?: string[], posts?: PostMode[]): Promise<ValidationResult[]>;

/** The <zen-foil> custom element. */
export declare class ZenFoilElement extends HTMLElement {
  params: ParamValues;
  scene: string;
  readonly renderer: RendererStatus;
  update(params: ParamValues): void;
  capture(): Promise<ImageData | null>;
  /** Plays the minting intro again: burin, foil, press. */
  replay(): void;
}
export declare function defineElement(name?: string): void;

/* ── Self-description and checking (manifest.json is describe()) ── */

export type ProblemLevel = "error" | "warning" | "hint";
export interface Problem {
  level: ProblemLevel;
  code: string;
  attribute?: string;
  message: string;
  /** What to write instead, when there is one exact answer. */
  fix?: string;
}
export interface PageProblem extends Problem {
  element?: Element;
  where: string;
}
export interface ParamManifest {
  type: ParamSpec["type"];
  options?: string[];
  default?: string;
  min?: number;
  max?: number;
  description?: string;
  brand?: boolean;
}
export interface SceneManifest {
  id: string;
  group: "kit" | "other";
  title: string;
  description: string;
  aspect: number;
  accent: string;
  post: "plate" | "raw" | "alpha";
  themes: ("plate" | "paper" | "clear")[];
  params: Record<string, ParamManifest>;
  brandParams: string[];
  example: string;
  template: string;
}
export interface AttributeManifest {
  type: string;
  options?: string[];
  description: string;
}
export interface Manifest {
  name: "zen-foil";
  version: string;
  element: "zen-foil";
  summary: string;
  attributes: Record<string, AttributeManifest>;
  marks: string[];
  events: Record<string, string>;
  methods: Record<string, string>;
  glyphs: string;
  rules: string[];
  scenes: SceneManifest[];
}
export interface SnippetOptions {
  theme?: "plate" | "paper" | "clear";
  accent?: string;
  label?: string;
  fixed?: boolean;
  format?: "html" | "react";
}
/** The machine-readable contract (every scene, param and attribute), or one scene's entry. */
export declare function describe(): Manifest;
export declare function describe(id: string): SceneManifest | null;
/** A valid tag for a scene; throws with each problem and its fix when the input is wrong. */
export declare function snippet(id: string, params?: Record<string, string | number | boolean>, opts?: SnippetOptions): string;
/** Problems with one tag's attributes (as written, including scene). */
export declare function checkTag(attrs: Record<string, string>): Problem[];
/** Checks every plate on the page (window.ZenFoil.check()); logs a table unless log is false. */
export declare function checkPage(root?: ParentNode, log?: boolean): PageProblem[];
/** The element's own attributes. */
export declare const ELEMENT_SPEC: Record<string, AttributeManifest>;

export declare const VERSION: string;
/** Ids of the built-in kit scenes. */
export declare const KIT_IDS: string[];

declare global {
  interface HTMLElementTagNameMap {
    "zen-foil": ZenFoilElement;
  }
  interface HTMLElementEventMap {
    "foil-live": CustomEvent<{ backend: string }>;
    "foil-fail": CustomEvent<{ reason: string }>;
    "foil-error": CustomEvent<{ scene: string; message: string }>;
  }
}
