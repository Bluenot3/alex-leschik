import { prefersReducedMotion, subscribeTick } from "./clock";
import { atlas, regionsFor, type Region } from "./atlas";
import { GpuBackend } from "./gpu";
import { GlBackend } from "./gl";
import {
  DATA_FLOATS,
  DATA_OFFSET,
  UNIFORM_FLOATS,
  type FoilBackend,
  type FoilDiagnostics,
  type FoilScene,
  type LayerSource,
  type LayerSpec,
  type PostMode,
  type Program,
  type ViewState,
} from "./types";

type Mode = "auto" | "webgpu" | "webgl2" | "off";

function urlFlag(name: string) {
  if (typeof window === "undefined") return null;
  try {
    return new URLSearchParams(window.location.search).get(name);
  } catch {
    return null;
  }
}

function requestedMode(): Mode {
  const forced = (globalThis as { ZEN_FOIL_BACKEND?: string }).ZEN_FOIL_BACKEND;
  const q = forced ?? urlFlag("foil");
  return q === "webgpu" || q === "webgl2" || q === "off" ? q : "auto";
}

/* The minting intro: burin, foil, press (see POST_FX in library.ts). */
const INTRO_MS = 2400;
/** WebGPU device losses tolerated before the session moves to WebGL2. */
const MAX_GPU_LOSSES = 2;

export type RendererStatus = "pending" | "webgpu" | "webgl2" | "static";

export interface AttachOptions {
  scene: FoilScene;
  /** Post mode; defaults to the scene's own ("plate" unless it says otherwise). */
  post?: PostMode;
  /** Accent ink as 0–1 RGB. */
  accent: [number, number, number];
  /** Element whose pointer drives hover/tilt (defaults to the host). */
  target?: HTMLElement | null;
  seed?: number;
  /** Device-pixel-ratio ceiling for this view (default 2, 1.5 on low-power). */
  maxDpr?: number;
  /** Ceiling on the WebGL2 path, where each frame is blitted (large views). */
  glMaxDpr?: number;
  /** The static data block (256 floats) — see setData(). */
  data?: Float32Array;
  /** Per-frame hook to write view-specific uniforms (p0, p1, d). */
  onFrame?: (u: Float32Array, now: number, dt: number) => void;
  /** First frame presented. */
  onLive?: () => void;
  /** The scene could not be compiled on this device (or there is no GPU). */
  onFail?: (reason: string) => void;
  /** Reduced motion: return true when a fresh still is needed (e.g. on scroll). */
  needsFrame?: () => boolean;
  /** On/off screen changes. */
  onVisible?: (on: boolean) => void;
  /** Reserve an image array for this view; fill it with setLayer(). */
  layers?: LayerSpec | null;
}

interface ViewExtra {
  opts: AttachOptions;
  regions: Region[];
  atlasReady: boolean;
}

const programs = new Map<string, Program>();
function programFor(scene: FoilScene, post: PostMode): Program {
  const key = `${scene.id}#${post}`;
  let p = programs.get(key);
  if (!p || p.scene !== scene) {
    p = { key, scene, post };
    programs.set(key, p);
  }
  return p;
}

function emit(el: HTMLElement, type: string, detail?: unknown) {
  el.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
}

/**
 * The zen-foil engine — one GPU device (or one WebGL2 context) for every
 * plate on the page.
 *
 * Each view is a host element; the engine owns the canvas inside it, so it
 * can move a plate from WebGPU to WebGL2 mid-session (a canvas can never
 * change context type). Backing stores are DPR-capped and adaptively
 * scaled, only on-screen views render, everything rides one shared clock,
 * reduced motion gets still frames, and device loss is survived.
 */
export class FoilEngine {
  private backend: FoilBackend | null = null;
  private starting: Promise<void> | null = null;
  private mode: Mode = requestedMode();
  private gpuLosses = 0;
  private readonly views = new Set<ViewState>();
  private readonly extra = new WeakMap<ViewState, ViewExtra>();
  private nextId = 1;
  private unsubscribe: (() => void) | null = null;
  private lastFrame = 0;
  private slowMs = 0;
  private fastMs = 0;
  private quality = 1;
  private atlasVersion = -1;
  private readonly reported = new Set<string>();
  readonly reduced = prefersReducedMotion();
  private readonly lowPower =
    typeof window !== "undefined" &&
    (window.matchMedia?.("(pointer: coarse)").matches === true || (navigator.hardwareConcurrency || 8) <= 4);
  private readonly io: IntersectionObserver | null;
  private readonly ro: ResizeObserver | null;
  private readonly byHost = new Map<Element, ViewState>();
  private readonly statusListeners = new Set<(s: RendererStatus) => void>();
  private status: RendererStatus = "pending";
  readonly diagnostics: FoilDiagnostics = { backend: "pending", errors: [], frames: 0, quality: 1 };

  constructor() {
    this.io =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(
            (entries) => {
              for (const e of entries) {
                const v = this.byHost.get(e.target);
                if (!v) continue;
                const was = v.visible;
                v.visible = e.isIntersecting;
                if (v.visible) v.dirty = true;
                if (was !== v.visible) this.extra.get(v)?.opts.onVisible?.(v.visible);
              }
              this.syncLoop();
            },
            { rootMargin: "160px 0px" },
          )
        : null;
    this.ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver((entries) => {
            for (const e of entries) {
              const v = this.byHost.get(e.target);
              if (!v) continue;
              v.cssW = e.contentRect.width;
              v.cssH = e.contentRect.height;
              this.sizeView(v);
            }
          })
        : null;
    if (typeof window !== "undefined" && urlFlag("foil-debug") !== null) {
      (window as Window & { __zenFoil?: FoilDiagnostics }).__zenFoil = this.diagnostics;
    }
    atlas.onChange(() => this.syncLoop());
  }

  /** Which renderer is drawing the plates. */
  subscribeStatus(cb: (s: RendererStatus) => void) {
    this.statusListeners.add(cb);
    cb(this.status);
    return () => {
      this.statusListeners.delete(cb);
    };
  }

  get renderer() {
    return this.status;
  }

  private setStatus(s: RendererStatus) {
    this.status = s;
    this.statusListeners.forEach((cb) => cb(s));
    if (s === "static") this.views.forEach((v) => this.fail(v, "no-gpu"));
  }

  private fail(v: ViewState, reason: string) {
    v.host.dataset.foil = reason === "no-gpu" ? "static" : "failed";
    this.extra.get(v)?.opts.onFail?.(reason);
    emit(v.host, "foil-fail", { reason });
  }

  private report = (scene: string, message: string) => {
    this.diagnostics.errors.push({ scene, message });
    const key = `${scene}:${message}`;
    if (!this.reported.has(key)) {
      this.reported.add(key);
      console.error(`[zen-foil] scene "${scene}" failed to compile\n${message}`);
    }
    this.views.forEach((v) => {
      if (v.program.scene.id !== scene) return;
      emit(v.host, "foil-error", { scene, message });
      this.fail(v, "compile");
    });
  };

  private start() {
    if (this.starting) return this.starting;
    this.starting = (async () => {
      if (this.mode === "off") {
        this.diagnostics.backend = "off";
        this.setStatus("static");
        return;
      }
      let backend: FoilBackend | null = null;
      if (this.mode !== "webgl2") backend = await GpuBackend.create(this.report, this.mode === "webgpu");
      if (!backend && this.mode !== "webgpu") backend = GlBackend.create(this.report);
      if (!backend) {
        this.diagnostics.backend = "none";
        this.setStatus("static");
        return;
      }
      backend.onLost(() => this.recover());
      this.backend = backend;
      this.atlasVersion = -1;
      this.diagnostics.backend = backend.kind;
      this.setStatus(backend.kind);
      this.views.forEach((v) => this.bind(v));
      this.syncLoop();
    })();
    return this.starting;
  }

  /**
   * WebGPU device lost (driver reset, GPU switch, a flaky presentation
   * path): reconfigure against a fresh device; if it keeps happening, move
   * every plate to WebGL2 on new canvases for the rest of the session.
   */
  private recover() {
    const old = this.backend;
    this.backend = null;
    this.starting = null;
    this.gpuLosses++;
    if (this.gpuLosses >= MAX_GPU_LOSSES && this.mode === "auto") this.mode = "webgl2";
    const swap = this.mode === "webgl2";
    this.views.forEach((v) => {
      v.res = null;
      v.dirty = true;
      if (swap) this.freshCanvas(v);
    });
    try {
      old?.destroy();
    } catch {
      /* already gone */
    }
    this.syncLoop();
    void this.start();
  }

  private freshCanvas(v: ViewState) {
    const next = document.createElement("canvas");
    next.className = v.canvas.className;
    next.setAttribute("aria-hidden", "true");
    v.canvas.replaceWith(next);
    v.canvas = next;
    v.pxW = 0;
    v.pxH = 0;
    v.drawn = false;
    delete v.host.dataset.live;
  }

  private bind(v: ViewState) {
    if (!this.backend || v.res || !this.views.has(v)) return;
    try {
      this.sizeView(v);
      this.backend.attach(v);
      if (this.backend.eagerCompile) this.backend.prepare(v.program);
      v.layerSrc.forEach((src, i) => src && this.backend?.writeLayer(v, i, src));
      v.host.dataset.foil = this.backend.kind;
    } catch (err) {
      this.fail(v, err instanceof Error ? err.message : "attach");
    }
  }

  private sizeView(v: ViewState) {
    const opts = this.extra.get(v)?.opts;
    const viewCap = this.backend?.kind === "webgl2" ? opts?.glMaxDpr ?? opts?.maxDpr ?? 2 : opts?.maxDpr ?? 2;
    const dprCap = Math.min(this.lowPower ? 1.5 : 2, viewCap);
    const dpr = Math.min(window.devicePixelRatio || 1, dprCap) * this.quality;
    const w = Math.max(1, Math.round(v.cssW * dpr));
    const h = Math.max(1, Math.round(v.cssH * dpr));
    if (w !== v.pxW || h !== v.pxH) {
      v.pxW = w;
      v.pxH = h;
      v.canvas.width = w;
      v.canvas.height = h;
      v.dirty = true;
    }
  }

  /** Mounts a live plate into `host`; returns the detach function. */
  attach(host: HTMLElement, opts: AttachOptions) {
    const uniforms = new Float32Array(UNIFORM_FLOATS);
    if (opts.data) uniforms.set(opts.data.subarray(0, DATA_FLOATS), DATA_OFFSET);
    const canvas = document.createElement("canvas");
    canvas.className = "zen-foil-canvas";
    canvas.setAttribute("aria-hidden", "true");
    host.appendChild(canvas);

    const rect = host.getBoundingClientRect();
    const post: PostMode = opts.post ?? opts.scene.post ?? "plate";
    const view: ViewState = {
      id: this.nextId++,
      host,
      canvas,
      target: opts.target ?? host,
      program: programFor(opts.scene, post),
      accent: opts.accent,
      seed: opts.seed ?? Math.random() * 100,
      visible: false,
      cssW: rect.width,
      cssH: rect.height,
      pxW: 0,
      pxH: 0,
      uniforms,
      mx: 0.5,
      my: 0.5,
      tmx: 0.5,
      tmy: 0.5,
      hover: 0,
      hoverTarget: 0,
      pulse: 0,
      sx: 0.5,
      sy: 0.5,
      tiltX: 0,
      tiltY: 0,
      introStart: -1,
      drawn: false,
      dirty: true,
      active: true,
      layers: opts.layers ?? null,
      layerSrc: [],
      res: null,
    };
    const regions = regionsFor(opts.scene.code);
    const ex: ViewExtra = { opts, regions, atlasReady: atlas.has(regions) };
    this.extra.set(view, ex);
    this.views.add(view);
    this.byHost.set(host, view);
    this.io?.observe(host);
    this.ro?.observe(host);
    if (!this.io) view.visible = true;
    if (!ex.atlasReady) {
      void atlas.ensure(regions).then(() => {
        ex.atlasReady = true;
        view.dirty = true;
        this.syncLoop();
      });
    }

    const t = view.target;
    const local = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      view.tmx = Math.min(1.2, Math.max(-0.2, (e.clientX - r.left) / Math.max(1, r.width)));
      view.tmy = Math.min(1.2, Math.max(-0.2, (e.clientY - r.top) / Math.max(1, r.height)));
    };
    const onMove = (e: PointerEvent) => {
      local(e);
      if (e.pointerType !== "touch") view.hoverTarget = 1;
      if (this.reduced) view.dirty = true;
    };
    const onLeave = () => {
      view.hoverTarget = 0;
      view.tmx = 0.5;
      view.tmy = 0.5;
      if (this.reduced) view.dirty = true;
    };
    const onDown = (e: PointerEvent) => {
      local(e);
      // The stamp ring starts exactly where the plate was pressed.
      view.sx = view.tmx;
      view.sy = view.tmy;
      view.pulse = this.reduced ? 0 : 1;
    };
    t.addEventListener("pointermove", onMove, { passive: true });
    t.addEventListener("pointerleave", onLeave, { passive: true });
    t.addEventListener("pointerdown", onDown, { passive: true });

    void this.start().then(() => this.bind(view));

    return () => {
      t.removeEventListener("pointermove", onMove);
      t.removeEventListener("pointerleave", onLeave);
      t.removeEventListener("pointerdown", onDown);
      this.io?.unobserve(host);
      this.ro?.unobserve(host);
      this.byHost.delete(host);
      this.views.delete(view);
      this.backend?.detach(view);
      view.canvas.remove();
      delete host.dataset.live;
      delete host.dataset.foil;
      this.syncLoop();
    };
  }

  /** Replaces the static data block (u.d) of the view in `host`. */
  setData(host: HTMLElement, data: Float32Array) {
    const v = this.byHost.get(host);
    if (!v) return;
    v.uniforms.fill(0, DATA_OFFSET);
    v.uniforms.set(data.subarray(0, DATA_FLOATS), DATA_OFFSET);
    v.dirty = true;
  }

  /** Changes the accent ink (0–1 RGB). */
  setAccent(host: HTMLElement, accent: [number, number, number]) {
    const v = this.byHost.get(host);
    if (!v) return;
    v.accent = accent;
    v.dirty = true;
  }

  /**
   * Fills one image layer of the view mounted in `host` (uploaded now, or as
   * soon as a renderer is bound — and again after device loss).
   */
  setLayer(host: HTMLElement, index: number, source: LayerSource | null) {
    const v = this.byHost.get(host);
    if (!v || !v.layers || index < 0 || index >= v.layers.count) return;
    v.layerSrc[index] = source;
    if (source && v.res && this.backend) this.backend.writeLayer(v, index, source);
    v.dirty = true;
  }

  /** Pause or resume a view that stays in the viewport but is hidden by its owner. */
  setActive(host: HTMLElement, active: boolean) {
    const v = this.byHost.get(host);
    if (!v || v.active === active) return;
    v.active = active;
    if (active) v.dirty = true;
    this.syncLoop();
  }

  /**
   * The next frame of the plate in `host` as ImageData — on WebGPU read back
   * from the GPU, so it works where a headless browser can't present.
   */
  capture(host: HTMLElement): Promise<ImageData | null> {
    const v = this.byHost.get(host);
    if (!v || !this.backend?.capture) return Promise.resolve(null);
    v.dirty = true;
    return this.backend.capture(v);
  }

  /** Plays the minting intro again (burin, foil, press) from the start. */
  replay(host: HTMLElement) {
    const v = this.byHost.get(host);
    if (!v || this.reduced) return;
    v.introStart = -1;
    v.dirty = true;
  }

  /** Request a redraw (reduced motion renders on demand). */
  invalidate(host: HTMLElement) {
    const v = this.byHost.get(host);
    if (v) v.dirty = true;
  }

  private syncLoop() {
    let any = false;
    this.views.forEach((v) => {
      if (v.visible && v.active) any = true;
    });
    const want = any && !!this.backend;
    if (want && !this.unsubscribe) {
      this.lastFrame = 0;
      this.unsubscribe = subscribeTick(this.tick);
    } else if (!want && this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  /** Adaptive resolution: trade pixels for frame time, with hysteresis. */
  private adapt(dt: number) {
    if (dt > 26) {
      this.slowMs += dt;
      this.fastMs = 0;
    } else if (dt < 18.5) {
      this.fastMs += dt;
      this.slowMs = Math.max(0, this.slowMs - dt * 0.5);
    }
    let next = this.quality;
    if (this.slowMs > 1600 && this.quality > 0.55) next = Math.max(0.55, this.quality - 0.15);
    else if (this.fastMs > 5000 && this.quality < 1) next = Math.min(1, this.quality + 0.1);
    if (next !== this.quality) {
      this.quality = next;
      this.diagnostics.quality = next;
      this.slowMs = 0;
      this.fastMs = 0;
      this.views.forEach((v) => this.sizeView(v));
    }
  }

  private tick = (now: number) => {
    const backend = this.backend;
    if (!backend) return;
    const minGap = this.lowPower ? 31 : 0;
    if (this.lastFrame && now - this.lastFrame < minGap) return;
    const dt = this.lastFrame ? Math.min(100, now - this.lastFrame) : 16.7;
    this.lastFrame = now;
    if (!this.reduced) this.adapt(dt);
    if (this.atlasVersion !== atlas.version) {
      this.atlasVersion = atlas.version;
      backend.setAtlas(atlas.data);
      this.views.forEach((v) => (v.dirty = true));
    }

    const batch: ViewState[] = [];
    const vh = window.innerHeight || 1;
    // Synchronous (non-parallel) WebGL2 compiles go one per frame, on-screen
    // first, so a burst of plates never stalls the main thread.
    let compileBudget = backend.eagerCompile ? Infinity : 1;
    this.views.forEach((v) => {
      const ex = this.extra.get(v);
      if (!v.visible || !v.active || !v.res || !ex?.atlasReady) return;
      const st = backend.status(v.program);
      if (st !== "ready") {
        if (st === "pending" && compileBudget > 0) {
          compileBudget--;
          backend.prepare(v.program);
        }
        return;
      }
      if (this.reduced && v.drawn && !v.dirty && !ex.opts.needsFrame?.()) return;
      this.updateUniforms(v, now, dt, vh);
      batch.push(v);
    });
    if (!batch.length) return;
    const drawn = backend.render(batch);
    for (const v of drawn) {
      v.dirty = false;
      if (!v.drawn) {
        v.drawn = true;
        v.host.dataset.live = "1";
        this.extra.get(v)?.opts.onLive?.();
        emit(v.host, "foil-live", { backend: backend.kind });
      }
    }
    this.diagnostics.frames++;
  };

  private updateUniforms(v: ViewState, now: number, dt: number, vh: number) {
    const k = 1 - Math.exp(-dt / 110);
    const kh = 1 - Math.exp(-dt / 220);
    v.mx += (v.tmx - v.mx) * k;
    v.my += (v.tmy - v.my) * k;
    v.hover += (v.hoverTarget - v.hover) * kh;
    v.pulse *= Math.exp(-dt / 900);

    // Tilt: the pointer while hovered, otherwise the plate's travel through
    // the viewport — the foil shifts colour as it scrolls, like a hologram.
    const rect = v.host.getBoundingClientRect();
    const idleX = Math.sin(now * 0.00021 + v.seed) * 0.35;
    const idleY = ((rect.top + rect.height / 2) / vh - 0.5) * 1.6;
    const tx = idleX + ((v.mx - 0.5) * 2 - idleX) * v.hover;
    const ty = idleY + ((v.my - 0.5) * 2 - idleY) * v.hover;
    v.tiltX += (tx - v.tiltX) * k;
    v.tiltY += (ty - v.tiltY) * k;

    if (v.introStart < 0) v.introStart = now;
    // ZEN_FOIL_FREEZE pins every plate to one scene time (deterministic previews).
    const freeze = (globalThis as { ZEN_FOIL_FREEZE?: number }).ZEN_FOIL_FREEZE;
    const frozen = typeof freeze === "number";
    // ZEN_FOIL_INTRO (0–1) pins the minting intro's progress, to preview its beats.
    const pin = (globalThis as { ZEN_FOIL_INTRO?: number }).ZEN_FOIL_INTRO;
    const intro = typeof pin === "number" ? Math.min(1, Math.max(0, pin)) : this.reduced || frozen ? 1 : Math.min(1, (now - v.introStart) / INTRO_MS);
    const t = frozen ? freeze : this.reduced ? v.program.scene.still ?? 6 : now / 1000 + v.seed;

    const u = v.uniforms;
    u[0] = v.pxW;
    u[1] = v.pxH;
    u[2] = v.pxW / Math.max(1, v.cssW);
    u[3] = v.pxW / Math.max(1, v.pxH);
    u[4] = t;
    u[5] = dt / 1000;
    u[6] = v.seed;
    u[7] = 1 - (1 - intro) * (1 - intro) * (1 - intro);
    u[8] = v.mx;
    u[9] = v.my;
    u[10] = v.hover;
    u[11] = v.pulse;
    u[12] = v.tiltX;
    u[13] = v.tiltY;
    u[14] = v.sx;
    u[15] = v.sy;
    u[16] = v.accent[0];
    u[17] = v.accent[1];
    u[18] = v.accent[2];
    u[19] = 1;
    this.extra.get(v)?.opts.onFrame?.(u, now, dt);
  }
}

let engine: FoilEngine | null = null;

/** The page's engine (created on first use). */
export function getFoilEngine() {
  if (!engine) engine = new FoilEngine();
  return engine;
}
