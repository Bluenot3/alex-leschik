/** A foil scene: portable WGSL defining `fn scene(uv: vec2f, p: vec2f) -> vec3f`. */
export interface FoilScene {
  id: string;
  code: string;
  /** Scene time used for the reduced-motion still frame. */
  still?: number;
  /** Fills the 128-float static data block (u.d) once per view. */
  data?: (d: Float32Array) => void;
  /**
   * "plate" (default) composites over the engraved foil substrate with the
   * minting intro; "raw" outputs scene() as-is (full-page fields); "alpha"
   * expects `scene() -> vec4f` (premultiplied) and renders transparent.
   */
  post?: "plate" | "raw" | "alpha";
}

/** Per-view image array (texture_2d_array), e.g. the cube's six faces. */
export interface LayerSpec {
  width: number;
  height: number;
  count: number;
}

export type LayerSource = HTMLCanvasElement | ImageBitmap;

export const UNIFORM_FLOATS = (7 + 32) * 4;
export const UNIFORM_BYTES = UNIFORM_FLOATS * 4;
/** Float offset of u.d inside the uniform block. */
export const DATA_OFFSET = 7 * 4;
export const DATA_FLOATS = 32 * 4;

export interface ViewState {
  id: number;
  /** Stable element owned by React; the engine owns the canvas inside. */
  host: HTMLElement;
  canvas: HTMLCanvasElement;
  target: HTMLElement;
  scene: FoilScene;
  accent: [number, number, number];
  seed: number;
  visible: boolean;
  cssW: number;
  cssH: number;
  pxW: number;
  pxH: number;
  uniforms: Float32Array<ArrayBuffer>;
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
  /** Paused by its owner (e.g. hidden by CSS while still on screen). */
  active: boolean;
  /** Image layers reserved for this view, and their current sources. */
  layers: LayerSpec | null;
  layerSrc: (LayerSource | null)[];
  /** Backend-owned resources. */
  res: unknown;
}

export interface FoilBackend {
  readonly kind: "webgpu" | "webgl2";
  /** Async compilers can take every scene up front; sync ones go lazily. */
  readonly eagerCompile: boolean;
  setAtlas(data: Uint8Array<ArrayBuffer>): void;
  /** Starts (async) compilation for a scene. Safe to call repeatedly. */
  prepare(scene: FoilScene): void;
  status(scene: FoilScene): "pending" | "ready" | "failed";
  attach(view: ViewState): void;
  detach(view: ViewState): void;
  /** Uploads one image layer (allocating the view's array on first use). */
  writeLayer(view: ViewState, index: number, source: LayerSource): void;
  /** Renders every view in one submission; returns the views that were drawn. */
  render(views: ViewState[]): ViewState[];
  onLost(cb: () => void): void;
  destroy(): void;
}

export interface FoilDiagnostics {
  backend: string;
  errors: { scene: string; message: string }[];
  frames: number;
  quality: number;
}
