import { getFoilEngine } from "./engine";
import { getScene, mount, resolveColor, SCENE_EVENT, type FoilHandle } from "./scene";
import type { ParamValues, Theme } from "./types";

/* Attributes that configure the element itself rather than the scene. */
const OWN = new Set([
  "scene",
  "accent",
  "theme",
  "seed",
  "fixed",
  "class",
  "style",
  "id",
  "slot",
  "part",
  "role",
  "hidden",
  "tabindex",
  "title",
  "lang",
  "dir",
  "draggable",
  "inert",
  "is",
  "nonce",
  "popover",
  "contenteditable",
  "max-dpr",
]);
const isOwn = (name: string) => OWN.has(name) || name.startsWith("aria-") || name.startsWith("data-") || name.startsWith("on");

const STYLE = /* css */ `
:host {
  display: block;
  position: relative;
  overflow: hidden;
  isolation: isolate;
  aspect-ratio: var(--zen-foil-aspect, var(--zf-scene-aspect, 16 / 10));
  border-radius: inherit;
  background: var(--zen-foil-poster, var(--zf-poster));
  -webkit-tap-highlight-color: transparent;
}
:host([hidden]) { display: none; }
:host([fixed]) {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  width: 100%;
  height: 100vh;
  height: 100lvh;
  aspect-ratio: auto;
  z-index: var(--zen-foil-z, -1);
  pointer-events: none;
  border-radius: 0;
}
.plate { position: absolute; inset: 0; border-radius: inherit; overflow: hidden; }
.plate > canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  opacity: 0;
  transition: opacity 0.8s cubic-bezier(0.2, 0.7, 0.2, 1);
}
.plate[data-live] > canvas { opacity: 1; }
::slotted(*) { position: relative; z-index: 1; }
@media (prefers-reduced-motion: reduce) { .plate > canvas { transition: none; } }
`;

function rgb255(c: [number, number, number]) {
  return c.map((x) => Math.round(x * 255)).join(" ");
}

/* Posters: what shows before the first frame, and if there is no GPU. */
function poster(theme: Theme | "raw" | "alpha", accent: [number, number, number]) {
  const a = rgb255(accent);
  if (theme === "paper")
    return `repeating-radial-gradient(circle at 12% -10%, rgb(${a} / 0.07) 0 1px, transparent 1px 9px), linear-gradient(180deg, #faf8f3, #f1eee6)`;
  // Clear and alpha plates float over the page; raw scenes paint their own ground.
  if (theme === "clear" || theme === "alpha" || theme === "raw") return "transparent";
  return `repeating-radial-gradient(circle at 15% -20%, rgb(${a} / 0.06) 0 1px, transparent 1px 8px), radial-gradient(120% 95% at 30% 15%, rgb(16 22 40), rgb(5 7 13) 72%)`;
}

/**
 * <zen-foil> — a live engraved-hologram plate.
 *
 *   <zen-foil scene="seal" accent="#7cc4ff" headline="ZEN AI CO"></zen-foil>
 *
 * Attributes: scene, accent (any CSS colour), theme (plate | paper | clear),
 * seed, max-dpr, aria-label (accessible name; otherwise decorative), fixed
 * (full-viewport background layer), and any scene params (headline, mark,
 * points, label…).
 * Children render on top of the plate. Events: foil-live, foil-fail,
 * foil-error (bubbling, composed).
 */
/* Server-side rendering (Next.js, Astro, Nuxt…) evaluates this module
   without a DOM: extend a stand-in there so importing never throws. */
const ElementBase = (typeof HTMLElement !== "undefined" ? HTMLElement : class {}) as typeof HTMLElement;

export class ZenFoilElement extends ElementBase {
  private handle: FoilHandle | null = null;
  private readonly plate: HTMLDivElement;
  private readonly sheet: HTMLStyleElement;
  private readonly observer: MutationObserver;
  private extraParams: ParamValues = {};
  private mountedKey = "";
  private scheduled = false;
  private waiting: (() => void) | null = null;

  constructor() {
    super();
    const root = this.attachShadow({ mode: "open" });
    root.innerHTML = `<style>${STYLE}</style><style data-scene></style><div class="plate" part="plate" aria-hidden="true"></div><slot></slot>`;
    this.plate = root.querySelector(".plate") as HTMLDivElement;
    this.sheet = root.querySelector("style[data-scene]") as HTMLStyleElement;
    this.observer = new MutationObserver((records) => this.onAttributes(records));
  }

  connectedCallback() {
    this.observer.observe(this, { attributes: true });
    this.schedule();
  }

  disconnectedCallback() {
    this.observer.disconnect();
    // Moving the element re-connects it in the same task: only tear down if it stays gone.
    queueMicrotask(() => {
      if (!this.isConnected) this.unmount();
    });
  }

  /** Scene params set from script (merged over attributes). */
  get params(): ParamValues {
    return { ...this.attributeParams(), ...this.extraParams };
  }
  set params(value: ParamValues) {
    this.extraParams = { ...value };
    this.handle?.update(this.params);
  }

  get scene() {
    return this.getAttribute("scene") ?? "";
  }
  set scene(id: string) {
    this.setAttribute("scene", id);
  }

  /** Which renderer is drawing: "webgpu", "webgl2", "static" (no GPU) or "pending". */
  get renderer() {
    return getFoilEngine().renderer;
  }

  /** The next frame as ImageData (works headless, where WebGPU can't present). */
  capture(): Promise<ImageData | null> {
    return this.handle ? this.handle.capture() : Promise.resolve(null);
  }

  /** Merge params (same as setting attributes, without touching the DOM). */
  update(params: ParamValues) {
    this.extraParams = { ...this.extraParams, ...params };
    this.handle?.update(this.params);
  }

  private attributeParams(): ParamValues {
    const out: ParamValues = {};
    for (const a of Array.from(this.attributes)) if (!isOwn(a.name)) out[a.name] = a.value;
    return out;
  }

  private onAttributes(records: MutationRecord[]) {
    let remount = false;
    let params = false;
    for (const r of records) {
      const name = r.attributeName ?? "";
      if (name === "scene" || name === "theme" || name === "seed" || name === "max-dpr") remount = true;
      else if (name === "accent") {
        this.applyPoster();
        // Removing the attribute returns to the scene's own accent.
        this.handle?.setAccent(this.getAttribute("accent") ?? getScene(this.scene)?.accent ?? "#6fb8ff");
      } else if (name === "aria-label") this.applyLabel();
      else if (!isOwn(name)) params = true;
    }
    if (remount) this.schedule(true);
    else if (params) this.handle?.update(this.params);
  }

  private schedule(force = false) {
    if (force) this.mountedKey = "";
    if (this.scheduled) return;
    this.scheduled = true;
    // Wait a microtask so frameworks can finish setting attributes.
    queueMicrotask(() => {
      this.scheduled = false;
      if (this.isConnected) this.mountPlate();
    });
  }

  /* An aria-label makes the plate meaningful (role img); without one it is decorative. */
  private applyLabel() {
    if (this.getAttribute("aria-label") && !this.hasAttribute("role")) this.setAttribute("role", "img");
  }

  private applyPoster() {
    const def = getScene(this.scene);
    const theme = (this.getAttribute("theme") as Theme | null) ?? "plate";
    const accent = resolveColor(this.getAttribute("accent") ?? def?.accent ?? "#6fb8ff", this) ?? [0.43, 0.72, 1];
    const kind = def?.post && def.post !== "plate" ? def.post : theme;
    const aspect = def?.aspect ? `--zf-scene-aspect: ${def.aspect};` : "";
    this.sheet.textContent = `:host { --zf-poster: ${poster(kind, accent)}; ${aspect} }`;
  }

  private mountPlate() {
    const id = this.scene;
    const key = `${id}|${this.getAttribute("theme") ?? ""}|${this.getAttribute("seed") ?? ""}|${this.getAttribute("max-dpr") ?? ""}`;
    if (key === this.mountedKey && this.handle) return;
    this.unmount();
    this.mountedKey = key;
    this.applyPoster();
    this.applyLabel();
    if (!id) return;
    if (!getScene(id)) {
      // Scenes defined later (your own module, the showcase bundle) mount as they arrive.
      const onDefined = (e: Event) => {
        if ((e as CustomEvent<string>).detail !== id) return;
        window.removeEventListener(SCENE_EVENT, onDefined);
        this.waiting = null;
        if (this.isConnected) this.schedule(true);
      };
      window.addEventListener(SCENE_EVENT, onDefined);
      this.waiting = () => window.removeEventListener(SCENE_EVENT, onDefined);
      return;
    }
    const seed = this.getAttribute("seed");
    const maxDpr = Number(this.getAttribute("max-dpr"));
    this.handle = mount(this.plate, {
      scene: id,
      accent: this.getAttribute("accent") ?? undefined,
      theme: (this.getAttribute("theme") as Theme | null) ?? undefined,
      params: this.params,
      target: this,
      seed: seed !== null && seed !== "" ? Number(seed) : undefined,
      maxDpr: Number.isFinite(maxDpr) && maxDpr > 0 ? maxDpr : undefined,
      onLive: () => this.setAttribute("data-live", ""),
      onFail: () => this.setAttribute("data-static", ""),
    });
  }

  private unmount() {
    this.waiting?.();
    this.waiting = null;
    this.handle?.destroy();
    this.handle = null;
    this.removeAttribute("data-live");
    this.removeAttribute("data-static");
  }
}

/** Registers <zen-foil> (idempotent). */
export function defineElement(name = "zen-foil") {
  if (typeof customElements === "undefined" || customElements.get(name)) return;
  customElements.define(name, name === "zen-foil" ? ZenFoilElement : class extends ZenFoilElement {});
}
