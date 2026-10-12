/**
 * JSX typing for <zen-foil> in React + TypeScript projects (React 18 and
 * 19), plus `window.ZenFoil` for pages that load the bundle from a <script>
 * tag. Keep this file anywhere your tsconfig includes (scripts/install.mjs
 * puts it next to the vendored bundle; CDN projects save it as
 * src/zen-foil.d.ts).
 */
import type { CSSProperties, DetailedHTMLProps, HTMLAttributes, Ref } from "react";

type ZenFoilAttributes = Omit<DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>, "ref" | "style"> & {
  ref?: Ref<HTMLElement & { capture(): Promise<ImageData | null>; update(p: Record<string, string>): void }>;
  scene: string;
  /** Use `class` on the element itself: React 18 renders `className` on a custom element as a "classname" attribute. */
  class?: string;
  accent?: string;
  theme?: "plate" | "paper" | "clear";
  fixed?: string | boolean;
  seed?: string | number;
  "max-dpr"?: string | number;
  style?: CSSProperties;
  /** Scene params as attributes: headline, subline, mark, points, images… */
  [param: string]: unknown;
};

type ZenFoilParams = Record<string, string>;

interface ZenFoilParamSpec {
  type: "text" | "number" | "boolean" | "choice" | "mark" | "color" | "points" | "list" | "url";
  default?: string;
  /** Text params: string-table slot 0–7. */
  slot?: number;
  /** Number, boolean, choice and mark params: numParam() slot 0–15. Colours take three. */
  num?: number;
  options?: string[];
  min?: number;
  max?: number;
  description?: string;
  /** Docs only: the default is brand copy another brand must replace. */
  brand?: boolean;
}

interface ZenFoilBehaviorContext {
  host: HTMLElement;
  target: HTMLElement;
  params(): ZenFoilParams;
  setLayer(index: number, source: HTMLCanvasElement | ImageBitmap | OffscreenCanvas | null): void;
  invalidate(): void;
  readonly reduced: boolean;
  readonly layers: { width: number; height: number; count: number } | null;
  warn(message: string): void;
}

interface ZenFoilSceneDef {
  id: string;
  /** Portable WGSL defining fn scene(uv: vec2f, p: vec2f) -> vec3f. */
  code: string;
  still?: number;
  post?: "plate" | "raw" | "alpha";
  params?: Record<string, ZenFoilParamSpec>;
  data?: (d: Float32Array, params: ZenFoilParams) => void;
  layers?: (params: ZenFoilParams, box: { width: number; height: number; dpr: number }) => { width: number; height: number; count: number } | null;
  behavior?: (ctx: ZenFoilBehaviorContext) => {
    frame?(u: Float32Array, now: number, dt: number): void;
    needsFrame?(): boolean;
    update?(params: ZenFoilParams): void;
    visible?(on: boolean): void;
    destroy?(): void;
  };
  aspect?: number;
  accent?: string;
  title?: string;
  description?: string;
}

/* window.ZenFoil carries every export of the module. The members typed here
   are the ones scenes and pages use; the rest (wgslToGlsl, buildData…) are
   there too, typed unknown. */
interface ZenFoilGlobal {
  readonly VERSION: string;
  readonly KIT_IDS: string[];
  /** First float of u.d a scene's own data() may use. */
  readonly SCENE_DATA_BASE: number;
  defineScene(scene: ZenFoilSceneDef): ZenFoilSceneDef;
  getScene(id: string): ZenFoilSceneDef | undefined;
  listScenes(): ZenFoilSceneDef[];
  mount(
    host: HTMLElement,
    opts: { scene: string | ZenFoilSceneDef; accent?: string; theme?: "plate" | "paper" | "clear"; params?: ZenFoilParams; seed?: number; maxDpr?: number },
  ): { update(params: ZenFoilParams): void; setAccent(accent: string): void; capture(): Promise<ImageData | null>; destroy(): void };
  registerMark(
    name: string,
    source: string | { path: string; viewBox?: [number, number, number, number]; padding?: number } | { svg: string; padding?: number } | { url: string; channel?: "alpha" | "luma" | "dark"; padding?: number },
  ): number;
  setClock(subscribe: ((tick: (now: number, deltaMs: number) => void) => () => void) | null): void;
  layoutText<K extends string>(
    entries: Record<K, string>,
    startFloat: number,
    limit?: number,
  ): { at: Record<K, { start: number; count: number; float: number; text: string }>; end: number; write(d: Float32Array): void };
  projectUS(lon: number, lat: number): [number, number];
  packText(text: string, into: Float32Array, startFloat: number): number;
  packPoints(points: [number, number][], into: Float32Array, baseVec4: number): void;
  parsePoints(value: string | undefined): [number, number][];
  parseNumbers(value: string | undefined): number[];
  parseList(value: string | undefined): string[];
  glyphCode(ch: string): number;
  markSlot(value: string | undefined | null): number;
  loadImage(url: string): Promise<HTMLImageElement>;
  loadLayer(url: string, w: number, h: number): Promise<HTMLCanvasElement>;
  drawContain(src: CanvasImageSource, iw: number, ih: number, canvas: HTMLCanvasElement): void;
  drawCover(src: CanvasImageSource, iw: number, ih: number, canvas: HTMLCanvasElement): void;
  subscribeTick(fn: (now: number, deltaMs: number) => void): () => void;
  prefersReducedMotion(): boolean;
  libraryNames(): string[];
  validate(ids?: string[]): Promise<{ scene: string; post: string; lint: string[]; webgpu: string[] | null; webgl2: string[] | null }[]>;
  lint(code: string, label?: string): string[];
  engine(): { readonly renderer: "pending" | "webgpu" | "webgl2" | "static"; subscribeStatus(cb: (status: string) => void): () => void };
  readonly [other: string]: unknown;
}

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "zen-foil": ZenFoilAttributes;
    }
  }
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "zen-foil": ZenFoilAttributes;
    }
  }
  interface Window {
    /** Set by the zen-foil bundle. Undefined until it loads (or if it fails to), so call it as window.ZenFoil?.defineScene(…). */
    ZenFoil?: ZenFoilGlobal;
  }
}
