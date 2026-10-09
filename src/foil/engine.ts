import { subscribeTick, prefersReducedMotion } from "@/hooks/useRafTicker";
import { buildAtlas } from "./atlas";
import { GpuBackend } from "./gpu";
import { GlBackend } from "./gl";
import {
  DATA_FLOATS,
  DATA_OFFSET,
  UNIFORM_FLOATS,
  type FoilBackend,
  type FoilDiagnostics,
  type FoilScene,
  type ViewState,
} from "./types";

type Mode = "auto" | "webgpu" | "webgl2" | "off";

function requestedMode(): Mode {
  if (typeof window === "undefined") return "off";
  const q = new URLSearchParams(window.location.search).get("foil");
  return q === "webgpu" || q === "webgl2" || q === "off" ? q : "auto";
}

const INTRO_MS = 1500;
/** WebGPU device losses tolerated before the session moves to WebGL2. */
const MAX_GPU_LOSSES = 2;

export type RendererStatus = "pending" | "webgpu" | "webgl2" | "static";

export interface AttachOptions {
  scene: FoilScene;
  accent: [number, number, number];
  target?: HTMLElement | null;
  seed?: number;
}

/**
 * Foil engine — one GPU device (or one WebGL2 context) for every project
 * card on the page.
 *
 * Each view is a host element; the engine owns the canvas inside it, so it
 * can swap a card from WebGPU to WebGL2 mid-session (a canvas can never
 * change context type). Backing stores are DPR-capped and adaptively
 * scaled, only on-screen views render, everything rides the shared page
 * clock, reduced motion gets one still frame, and device loss is survived.
 */
class FoilEngine {
  private backend: FoilBackend | null = null;
  private starting: Promise<void> | null = null;
  private mode: Mode = requestedMode();
  private gpuLosses = 0;
  private readonly views = new Set<ViewState>();
  private nextId = 1;
  private unsubscribe: (() => void) | null = null;
  private lastFrame = 0;
  private slowMs = 0;
  private fastMs = 0;
  private quality = 1;
  private readonly reduced = prefersReducedMotion();
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
                v.visible = e.isIntersecting;
                if (v.visible) v.dirty = true;
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
    if (typeof window !== "undefined" && (import.meta.env.DEV || /[?&]foil-debug\b/.test(window.location.search))) {
      (window as Window & { __foil?: FoilDiagnostics }).__foil = this.diagnostics;
    }
  }

  /** Which renderer is drawing the plates (for the section's status chip). */
  subscribeStatus(cb: (s: RendererStatus) => void) {
    this.statusListeners.add(cb);
    cb(this.status);
    return () => {
      this.statusListeners.delete(cb);
    };
  }

  private setStatus(s: RendererStatus) {
    this.status = s;
    this.statusListeners.forEach((cb) => cb(s));
  }

  private report = (scene: string, message: string) => {
    this.diagnostics.errors.push({ scene, message });
    if (import.meta.env.DEV) console.warn(`[foil] ${scene}: ${message}`);
    this.views.forEach((v) => {
      if (v.scene.id === scene) v.host.dataset.foil = "failed";
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
      backend.setAtlas(await buildAtlas());
      backend.onLost(() => this.recover());
      this.backend = backend;
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
   * every card to WebGL2 on new canvases for the rest of the session.
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
      if (this.backend.eagerCompile) this.backend.prepare(v.scene);
      v.host.dataset.foil = this.backend.kind;
    } catch {
      v.host.dataset.foil = "failed";
    }
  }

  private sizeView(v: ViewState) {
    const dprCap = this.lowPower ? 1.5 : 2;
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
    if (opts.scene.data) {
      const block = new Float32Array(DATA_FLOATS);
      opts.scene.data(block);
      uniforms.set(block, DATA_OFFSET);
    }
    const canvas = document.createElement("canvas");
    canvas.className = "foil-canvas";
    canvas.setAttribute("aria-hidden", "true");
    host.appendChild(canvas);

    const rect = host.getBoundingClientRect();
    const view: ViewState = {
      id: this.nextId++,
      host,
      canvas,
      target: opts.target ?? host,
      scene: opts.scene,
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
      tiltX: 0,
      tiltY: 0,
      introStart: -1,
      drawn: false,
      dirty: true,
      res: null,
    };
    this.views.add(view);
    this.byHost.set(host, view);
    this.io?.observe(host);
    this.ro?.observe(host);
    if (!this.io) view.visible = true;

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
      view.pulse = 1;
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
      this.syncLoop();
    };
  }

  private syncLoop() {
    let any = false;
    this.views.forEach((v) => {
      if (v.visible) any = true;
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

    const batch: ViewState[] = [];
    const vh = window.innerHeight || 1;
    // Synchronous (non-parallel) WebGL2 compiles go one per frame, on-screen
    // first, so a burst of plates never stalls the main thread.
    let compileBudget = backend.eagerCompile ? Infinity : 1;
    this.views.forEach((v) => {
      if (!v.visible || !v.res) return;
      const st = backend.status(v.scene);
      if (st !== "ready") {
        if (st === "pending" && compileBudget > 0) {
          compileBudget--;
          backend.prepare(v.scene);
        }
        return;
      }
      if (this.reduced && v.drawn && !v.dirty) return;
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
    v.pulse *= Math.exp(-dt / 600);

    // Tilt: the pointer while hovered, otherwise the card's travel through
    // the viewport — the foil shifts colour as it scrolls, like a hologram.
    const rect = v.host.getBoundingClientRect();
    const idleX = Math.sin(now * 0.00021 + v.seed) * 0.35;
    const idleY = ((rect.top + rect.height / 2) / vh - 0.5) * 1.6;
    const tx = idleX + ((v.mx - 0.5) * 2 - idleX) * v.hover;
    const ty = idleY + ((v.my - 0.5) * 2 - idleY) * v.hover;
    v.tiltX += (tx - v.tiltX) * k;
    v.tiltY += (ty - v.tiltY) * k;

    if (v.introStart < 0) v.introStart = now;
    const intro = this.reduced ? 1 : Math.min(1, (now - v.introStart) / INTRO_MS);
    const t = this.reduced ? v.scene.still ?? 6 : now / 1000 + v.seed;

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
    u[14] = 0;
    u[15] = 1;
    u[16] = v.accent[0];
    u[17] = v.accent[1];
    u[18] = v.accent[2];
    u[19] = 1;
  }
}

let engine: FoilEngine | null = null;

export function getFoilEngine() {
  if (!engine) engine = new FoilEngine();
  return engine;
}
