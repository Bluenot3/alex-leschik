import { getFoilEngine } from "./engine";
import { atlas, missingGlyphs, packText } from "./atlas";
import { markSlot } from "./marks";
import { lintWgsl } from "./lint";
import {
  DATA_FLOATS,
  FREE_BASE_FLOAT,
  NUM_BASE_FLOAT,
  NUM_SLOTS,
  STRING_SLOTS,
  TEXT_BASE_FLOAT,
  type Behavior,
  type BehaviorContext,
  type FoilScene,
  type LayerSource,
  type LayerSpec,
  type ParamValues,
  type PostMode,
  type Theme,
} from "./types";

/* ── Registry ─────────────────────────────────────────────────── */

const registry = new Map<string, FoilScene>();
/** Fired on window (detail: id) whenever a scene is defined. */
export const SCENE_EVENT = "zen-foil:scene";

function debugging() {
  if (typeof window === "undefined") return false;
  return (globalThis as { ZEN_FOIL_DEBUG?: boolean }).ZEN_FOIL_DEBUG === true || /[?&]foil-debug\b/.test(window.location.search);
}

/**
 * Registers a scene so <zen-foil scene="id"> and mount() can use it.
 * Re-defining an id replaces it (handy while iterating). With ?foil-debug
 * the scene is linted for portability problems on registration.
 */
export function defineScene(scene: FoilScene): FoilScene {
  if (!scene.id || !/^[a-z0-9][\w-]*$/i.test(scene.id)) throw new Error(`zen-foil: invalid scene id "${scene.id}"`);
  for (const [name, spec] of Object.entries(scene.params ?? {})) {
    if (spec.type === "text" && (spec.slot === undefined || spec.slot < 0 || spec.slot >= STRING_SLOTS))
      throw new Error(`zen-foil: ${scene.id}.${name}: text params need a slot 0–${STRING_SLOTS - 1}`);
    // Numeric params without a slot are fine: data() or the behavior reads them.
    if (spec.num !== undefined && (spec.num < 0 || spec.num >= NUM_SLOTS))
      throw new Error(`zen-foil: ${scene.id}.${name}: num slots run 0–${NUM_SLOTS - 1}`);
    if (spec.type === "mark" && spec.num === undefined)
      throw new Error(`zen-foil: ${scene.id}.${name}: mark params need a num slot (the shader reads the atlas slot)`);
    if (spec.type === "color" && spec.num !== undefined && spec.num > NUM_SLOTS - 3)
      throw new Error(`zen-foil: ${scene.id}.${name}: color params need a num slot 0–${NUM_SLOTS - 3} (three floats)`);
  }
  registry.set(scene.id, scene);
  // scripts/check.mjs collects scenes through this hook (no DOM needed).
  (globalThis as { ZEN_FOIL_COLLECT?: FoilScene[] }).ZEN_FOIL_COLLECT?.push(scene);
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(SCENE_EVENT, { detail: scene.id }));
  if (debugging()) {
    const problems = lintWgsl(scene.code, scene.id);
    if (problems.length) console.warn(`[zen-foil] ${problems.join("\n")}`);
  }
  return scene;
}

export function getScene(id: string): FoilScene | undefined {
  return registry.get(id);
}

export function listScenes(): FoilScene[] {
  return [...registry.values()];
}

/* ── Params ───────────────────────────────────────────────────── */

/** Defaults filled in, raw values kept as strings. */
export function resolveParams(scene: FoilScene, raw: ParamValues = {}): ParamValues {
  const out: ParamValues = {};
  for (const [name, spec] of Object.entries(scene.params ?? {})) {
    if (spec.default !== undefined) out[name] = spec.default;
  }
  for (const [name, value] of Object.entries(raw)) {
    if (value !== undefined && value !== null) out[name] = String(value);
  }
  return out;
}

const truthy = (v: string | undefined) => v !== undefined && v !== "false" && v !== "0" && v !== "off" && v !== "no";

/** Parses "a, b; c" style numbers. */
export function parseNumbers(value: string | undefined): number[] {
  if (!value) return [];
  return value
    .split(/[\s,;|]+/)
    .map(Number)
    .filter((n) => Number.isFinite(n));
}

/** Parses "lon,lat; lon,lat" (or "x y | x y") into pairs. */
export function parsePoints(value: string | undefined): [number, number][] {
  if (!value) return [];
  return value
    .split(/[;|\n]+/)
    .map((pair) => pair.trim().split(/[\s,]+/).map(Number))
    .filter((p) => p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]))
    .map((p) => [p[0], p[1]] as [number, number]);
}

/** Parses a comma/semicolon/newline separated list. */
export function parseList(value: string | undefined): string[] {
  if (!value) return [];
  // data: URIs carry their own commas and semicolons: separate them with spaces or |.
  if (value.includes("data:")) return value.split(/[\s|]+/).filter(Boolean);
  const sep = value.includes(";") || value.includes("\n") ? /[;\n]+/ : /,/;
  return value
    .split(sep)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Any CSS colour (hex, rgb(), hsl(var(--x)), oklch(), names…) → 0–1 sRGB. */
export function resolveColor(value: string | [number, number, number] | undefined, context?: Element | null): [number, number, number] | null {
  if (!value) return null;
  if (Array.isArray(value)) return value;
  const v = value.trim();
  const hex = v.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const c = hex[1].length === 3 ? hex[1].replace(/./g, "$&$&") : hex[1];
    const n = parseInt(c, 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }
  if (typeof document === "undefined") return null;
  try {
    // Resolve var()/currentColor in context, then let canvas convert any
    // colour space to sRGB bytes.
    let css = v;
    if (v.includes("var(") || v === "currentColor") {
      const probe = document.createElement("span");
      probe.style.display = "none";
      probe.style.color = v;
      (context ?? document.body).appendChild(probe);
      css = getComputedStyle(probe).color;
      probe.remove();
    }
    const c = document.createElement("canvas");
    c.width = 1;
    c.height = 1;
    const ctx = c.getContext("2d", { willReadFrequently: true })!;
    ctx.fillStyle = "#000";
    ctx.fillStyle = css;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return [r / 255, g / 255, b / 255];
  } catch {
    return null;
  }
}

/**
 * The static data block for a scene and params: text params in the string
 * table, numbers/marks/colours in the numeric slots, then the scene's own
 * data() (arrays, fixed text).
 */
export function buildData(scene: FoilScene, params: ParamValues): Float32Array {
  const d = new Float32Array(DATA_FLOATS);
  let textFloat = TEXT_BASE_FLOAT;
  for (const [name, spec] of Object.entries(scene.params ?? {})) {
    const value = params[name] ?? "";
    if (spec.type === "text" && spec.slot !== undefined) {
      let text = value;
      const room = (DATA_FLOATS - textFloat) * 3;
      if (Array.from(text).length > room) {
        console.warn(`[zen-foil] ${scene.id}.${name}: text clipped to ${room} characters (288 in all across text params)`);
        text = Array.from(text).slice(0, room).join("");
      }
      const count = Array.from(text).length;
      d[spec.slot * 2] = textFloat * 3;
      d[spec.slot * 2 + 1] = count;
      textFloat += packText(text, d, textFloat);
    } else if (spec.num !== undefined) {
      const at = NUM_BASE_FLOAT + spec.num;
      if (spec.type === "number") {
        let n = Number(value);
        if (!Number.isFinite(n)) n = Number(spec.default ?? 0) || 0;
        if (spec.min !== undefined) n = Math.max(spec.min, n);
        if (spec.max !== undefined) n = Math.min(spec.max, n);
        d[at] = n;
      } else if (spec.type === "boolean") {
        // A bare attribute (<zen-foil spin>) is true, like any HTML boolean.
        const raw = params[name];
        d[at] = raw === undefined ? 0 : raw === "" ? 1 : truthy(raw) ? 1 : 0;
      } else if (spec.type === "choice") {
        const i = (spec.options ?? []).indexOf(value.trim().toLowerCase());
        d[at] = i >= 0 ? i : Math.max(0, (spec.options ?? []).indexOf(spec.default ?? ""));
      } else if (spec.type === "mark") {
        d[at] = markSlot(value);
      } else if (spec.type === "color") {
        const c = resolveColor(value) ?? [1, 1, 1];
        d.set(c, at);
      }
    }
  }
  scene.data?.(d, params);
  if (missingGlyphs.size && debugging()) console.warn(`[zen-foil] characters not in the glyph atlas: ${[...missingGlyphs].join(" ")}`);
  return d;
}

/* ── Mounting ─────────────────────────────────────────────────── */

export interface MountOptions {
  /** A registered scene id, or a scene object. */
  scene: string | FoilScene;
  /** Accent ink: any CSS colour (hex, rgb(), hsl(var(--primary)), oklch()…) or 0–1 RGB. */
  accent?: string | [number, number, number];
  /** "plate" (dark, default), "paper" (light) or "clear" (transparent ink). */
  theme?: Theme;
  /** Scene params (attribute-style strings). */
  params?: ParamValues;
  /** Element whose pointer drives hover/tilt (default: host). */
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
  /** Merge new params (text, numbers, marks, images…) without recompiling. */
  update(params: ParamValues): void;
  setAccent(accent: string | [number, number, number]): void;
  /** Upload an image layer directly (scenes that reserve layers). */
  setLayer(index: number, source: LayerSource | null): void;
  /** Pause/resume while still on screen. */
  setActive(active: boolean): void;
  /** The next frame as ImageData (read back from the GPU on WebGPU). */
  capture(): Promise<ImageData | null>;
  destroy(): void;
}

function postFor(scene: FoilScene, theme: Theme | undefined): PostMode {
  const base = scene.post ?? "plate";
  if (base !== "plate") return base;
  return theme === "paper" || theme === "clear" ? theme : "plate";
}

/**
 * Mounts a live plate into `host` (which must have a size). The engine owns
 * a canvas inside it; your own content can sit on top.
 */
export function mount(host: HTMLElement, opts: MountOptions): FoilHandle {
  const scene = typeof opts.scene === "string" ? registry.get(opts.scene) : opts.scene;
  if (!scene) throw new Error(`zen-foil: unknown scene "${String(opts.scene)}" (registered: ${[...registry.keys()].join(", ")})`);
  const engine = getFoilEngine();
  let params = resolveParams(scene, opts.params);
  const accent = resolveColor(opts.accent ?? scene.accent ?? "#6fb8ff", host) ?? [0.43, 0.72, 1];
  const target = opts.target ?? host;

  const rect = host.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const layers: LayerSpec | null = scene.layers?.(params, { width: rect.width, height: rect.height, dpr }) ?? null;

  let behavior: Behavior | null = null;
  let destroyed = false;
  const ctx: BehaviorContext = {
    host,
    target,
    params: () => params,
    setLayer: (i, src) => engine.setLayer(host, i, src),
    invalidate: () => engine.invalidate(host),
    reduced: engine.reduced,
    layers,
    warn: (message) => {
      console.warn(`[zen-foil] ${scene.id}: ${message}`);
      host.dispatchEvent(new CustomEvent("foil-error", { detail: { scene: scene.id, message }, bubbles: true, composed: true }));
    },
  };

  const detach = engine.attach(host, {
    scene,
    post: postFor(scene, opts.theme),
    accent,
    target,
    seed: opts.seed,
    maxDpr: opts.maxDpr,
    glMaxDpr: opts.glMaxDpr,
    data: buildData(scene, params),
    layers,
    onFrame: (u, now, dt) => behavior?.frame?.(u, now, dt),
    needsFrame: () => behavior?.needsFrame?.() ?? false,
    onVisible: (on) => behavior?.visible?.(on),
    onLive: opts.onLive,
    onFail: opts.onFail,
  });
  behavior = scene.behavior?.(ctx) ?? null;

  // A late-arriving mark re-renders on-demand (reduced-motion) views too.
  const offAtlas = atlas.onChange(() => engine.invalidate(host));

  return {
    scene,
    get params() {
      return params;
    },
    update(next) {
      if (destroyed) return;
      params = resolveParams(scene, { ...params, ...next });
      engine.setData(host, buildData(scene, params));
      behavior?.update?.(params);
    },
    setAccent(next) {
      const c = resolveColor(next, host);
      if (c) engine.setAccent(host, c);
    },
    setLayer(i, src) {
      engine.setLayer(host, i, src);
    },
    setActive(on) {
      engine.setActive(host, on);
    },
    capture() {
      return engine.capture(host);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      offAtlas();
      behavior?.destroy?.();
      detach();
    },
  };
}

/** Float index where a scene's own data() may start writing (after params). */
export const SCENE_DATA_BASE = FREE_BASE_FLOAT;
