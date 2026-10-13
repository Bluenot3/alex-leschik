/**
 * Self-description and checking: the contract any agent can replicate from,
 * however small the model.
 *
 * - describe()  the machine-readable spec of every scene and attribute (the
 *               same object scripts/gen-docs.mjs writes to manifest.json).
 * - snippet()   writes a valid <zen-foil> tag (or <ZenFoil>) from a scene id
 *               and params, and refuses invalid input with the fix.
 * - checkTag()  checks one tag's attributes and says exactly what to change.
 * - checkPage() checks every plate on a live page (window.ZenFoil.check()).
 *
 * scripts/verify.mjs runs checkTag() over source files, so the browser and
 * the command line never disagree about what is valid.
 */
import { getScene, listScenes, parsePoints } from "./scene";
import { markNames } from "./marks";
import { hasGlyph } from "./atlas";
import type { FoilScene, ParamSpec } from "./types";

export type ProblemLevel = "error" | "warning" | "hint";

export interface Problem {
  /** error: won't render as intended · warning: renders, probably not as meant · hint: style or brand. */
  level: ProblemLevel;
  /** Stable machine code, e.g. "unknown-param". */
  code: string;
  /** The attribute concerned, when there is one. */
  attribute?: string;
  message: string;
  /** What to write instead, when there is one exact answer. */
  fix?: string;
}

export interface ParamManifest {
  type: ParamSpec["type"];
  options?: string[];
  default?: string;
  min?: number;
  max?: number;
  description?: string;
  /** The default is ZEN AI Co. copy, data or mark: set it for any other brand. */
  brand?: boolean;
}

export interface SceneManifest {
  id: string;
  group: "kit" | "other";
  title: string;
  description: string;
  aspect: number;
  accent: string;
  /** How it composites: plate scenes take every theme; raw and alpha scenes ignore theme. */
  post: "plate" | "raw" | "alpha";
  themes: ("plate" | "paper" | "clear")[];
  params: Record<string, ParamManifest>;
  /** Params whose defaults belong to ZEN AI Co. */
  brandParams: string[];
  /** A real, working tag. */
  example: string;
  /** The same tag with {{TOKENS}} wherever a brand must supply its own text. */
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

/* ── The element's own attributes ───────────────────────────── */

export const ELEMENT_SPEC: Record<string, AttributeManifest> = {
  scene: { type: "scene id", description: "Required. Which scene to draw (see scenes)." },
  accent: { type: "color", description: "Any CSS colour: #hex, rgb(), hsl(var(--primary)), oklch(). One per plate, from the brand." },
  theme: { type: "choice", options: ["plate", "paper", "clear"], description: "plate (dark, default), paper (light security paper) or clear (ink only, over your own background). Ignored by raw/alpha scenes." },
  "aria-label": { type: "text", description: "Accessible name. Without it the plate is decorative." },
  fixed: { type: "boolean", description: "Full-viewport background layer (use with scene=\"field\")." },
  seed: { type: "number", description: "Fixes the plate's random phase." },
  "max-dpr": { type: "number", description: "Device-pixel-ratio ceiling (1–3). Use 1.25–1.5 for big background layers." },
  class: { type: "text", description: "CSS classes. On the raw element in React 18 write class, not className." },
  style: { type: "text", description: "Inline CSS. The height comes from the scene's aspect unless CSS sets one." },
};

const SUMMARY =
  "One <zen-foil> element = one live engraved-hologram plate (WebGPU, WebGL2 fallback, CSS poster without a GPU). Load dist/zen-foil.js once as a module, then write tags. Every option is a plain HTML attribute.";

const RULES = [
  "Load zen-foil.js exactly once, from one URL, as <script type=\"module\">. Pin the CDN to a commit (@<sha>), not @main.",
  "Use only scene ids and attributes listed here. Anything else is ignored, so check with ZenFoil.check() or scripts/verify.mjs.",
  "Points are \"lon,lat; lon,lat\" with longitude first (Washington, D.C. is -77.04,38.91).",
  "Engraved text is short, UPPERCASE and true. Never invent figures, partners or credentials: leave the attribute out instead.",
  "Brand params default to ZEN AI Co. copy. For any other brand set every brandParams entry, or remove ZEN marks with mark=\"none\" where allowed.",
  "One hero plate per viewport, at most ~8 plates on screen, field backgrounds at low density (0.15–0.3).",
  "Real headings and copy stay in the DOM next to the plate (SEO, accessibility); the plate is the visual.",
  "The plate's height comes from the scene's aspect ratio unless your CSS sets a height; give it a width (it is display:block, full width).",
];

/* Words agents reach for that aren't attributes, and what they meant. */
const ALIASES: Record<string, string[]> = {
  title: ["headline"],
  heading: ["headline"],
  header: ["headline"],
  text: ["headline"],
  name: ["headline", "recipient"],
  subtitle: ["subline"],
  subheading: ["subline"],
  tagline: ["subline"],
  description: ["subline"],
  logo: ["mark"],
  icon: ["mark"],
  brand: ["mark"],
  emblem: ["mark"],
  color: ["accent"],
  colour: ["accent"],
  primary: ["accent"],
  tint: ["accent"],
  image: ["src", "images"],
  img: ["src", "images"],
  photo: ["src", "images"],
  url: ["src", "images"],
  gallery: ["images"],
  background: ["theme"],
  bg: ["theme"],
  mode: ["theme", "variant"],
  number: ["value"],
  stat: ["value"],
  data: ["series"],
  values: ["series"],
  chart: ["series"],
  agents: ["nodes"],
  items: ["nodes"],
  cities: ["points"],
  locations: ["points"],
  destinations: ["points"],
  markers: ["points"],
  home: ["origin"],
  center: ["origin"],
  from: ["origin"],
  start: ["origin"],
  speed: ["speed", "spin", "rate"],
  classname: ["class"],
  label: ["aria-label"],
  alt: ["aria-label"],
  dpr: ["max-dpr"],
  maxdpr: ["max-dpr"],
  fullscreen: ["fixed"],
  dark: ["theme", "variant"],
  light: ["theme", "variant"],
};

/* Curated examples for the kit: real ZEN AI Co. copy (true facts only). */
const KIT_EXAMPLES: Record<string, Record<string, string>> = {
  seal: { headline: "ZEN AI CO", subline: "ISSUED UNDER SEAL", serial: "ZEN-2026-", mark: "zen" },
  globe: { headline: "GLOBAL REACH", subline: "AI PIONEER PROGRAM", origin: "-77.04, 38.91", points: "-0.13,51.51; 13.40,52.52; 55.27,25.20; 139.69,35.69", mark: "zen" },
  usmap: { headline: "ZEN AI CERTIFIED", origin: "-77.04, 38.91", label: "WASHINGTON, D.C.", serial: "ZEN-AIL-2026-", mark: "zen" },
  banner: { headline: "AI PIONEER PROGRAM", subline: "FIRST YOUTH AI LITERACY PROGRAM IN U.S. HISTORY", mark: "zen" },
  certificate: { recipient: "RECIPIENT NAME", program: "HAS COMPLETED THE AI PIONEER PROGRAM", serial: "ZEN-AIL-2026-00000", issuer: "ZEN AI CO", mark: "zen" },
  metric: { value: "20,000+", label: "ZEN WEEKLY SUBSCRIBERS", headline: "ZEN WEEKLY" },
  network: { headline: "ZEN ARSENAL", subline: "AGENTS · ORCHESTRATED", nodes: "RESEARCH, WRITER, ANALYST, DESIGNER, CODER, OPS", mark: "zen" },
  engrave: { src: "/images/photo.jpg", mode: "reveal", headline: "ZEN-GEN", subline: "ENGRAVED EDITION" },
  stage: { images: "/one.jpg, /two.jpg, /three.jpg", interval: "6" },
  vault: { images: "/a.jpg, /b.jpg, /c.jpg, /d.mp4", mark: "zen" },
  field: { variant: "dark", density: "0.25" },
};

/* ── Helpers ────────────────────────────────────────────────── */

function lev(a: string, b: string) {
  const m = a.length;
  const n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...new Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
}

function closest(word: string, pool: string[], max = 2) {
  let best: string | null = null;
  let bestD = Infinity;
  for (const w of pool) {
    const dd = lev(word.toLowerCase(), w.toLowerCase());
    if (dd < bestD) {
      bestD = dd;
      best = w;
    }
  }
  return bestD <= Math.max(1, Math.min(max, Math.floor(word.length / 3))) ? best : null;
}

const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const brandDefault = (spec: ParamSpec) =>
  !!spec.brand || (spec.type === "mark" && !!spec.default && spec.default !== "none") || /\b(ZEN|ZENAI|ARSENAL|PIONEER)\b/.test(spec.default ?? "");
const isElementAttr = (name: string) => name in ELEMENT_SPEC || name.startsWith("aria-") || name.startsWith("data-") || name.startsWith("on") || ["id", "slot", "part", "role", "hidden", "tabindex", "lang", "dir", "title"].includes(name);
const looksLikeColor = (v: string) =>
  /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v) || /^(rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color|var)\(/i.test(v) || /^[a-z]+$/i.test(v);
const looksLikeUrl = (v: string) => /^(https?:\/\/|\/|\.\.?\/|data:|blob:)/i.test(v) || /\.(svg|png|jpe?g|webp|gif|avif|mp4|webm|mov)(\?.*)?$/i.test(v);
const looksLikePath = (v: string) => /^\s*[Mm]\s*-?[\d.]/.test(v);

function themesOf(scene: FoilScene): SceneManifest["themes"] {
  return (scene.post ?? "plate") === "plate" ? ["plate", "paper", "clear"] : [];
}

/* ── describe / snippet ─────────────────────────────────────── */

let kitIds: ReadonlySet<string> = new Set();
/** Called once by index.ts with the kit's ids. */
export function setKitIds(ids: string[]) {
  kitIds = new Set(ids);
}

function sceneManifest(scene: FoilScene): SceneManifest {
  const params: Record<string, ParamManifest> = {};
  const brandParams: string[] = [];
  for (const [name, spec] of Object.entries(scene.params ?? {})) {
    const entry: ParamManifest = { type: spec.type };
    if (spec.options) entry.options = [...spec.options];
    if (spec.default !== undefined && spec.default !== "") entry.default = spec.default;
    if (spec.min !== undefined) entry.min = spec.min;
    if (spec.max !== undefined) entry.max = spec.max;
    if (spec.description) entry.description = spec.description;
    if (brandDefault(spec)) {
      entry.brand = true;
      brandParams.push(name);
    }
    params[name] = entry;
  }
  const ex = KIT_EXAMPLES[scene.id] ?? {};
  const tpl: Record<string, string> = {};
  for (const name of brandParams) {
    const spec = scene.params?.[name];
    if (!spec) continue;
    tpl[name] = spec.type === "mark" ? "{{MARK: /logo.svg or none}}" : spec.type === "points" ? (name === "origin" ? "{{LON,LAT}}" : "{{LON,LAT; LON,LAT}}") : `{{${name.toUpperCase()}}}`;
  }
  // Every piece of copy is the brand's to write; numbers, choices and lists keep the example.
  for (const [k, v] of Object.entries(ex)) {
    if (k in tpl) continue;
    const t = scene.params?.[k]?.type;
    if (t === "text") tpl[k] = `{{${k.toUpperCase()}}}`;
    else if (t === "url") tpl[k] = "{{IMAGE URL}}";
    else if (k === "images") tpl[k] = "{{IMAGE URLS, COMMA-SEPARATED}}";
    else tpl[k] = v;
  }
  return {
    id: scene.id,
    group: kitIds.has(scene.id) ? "kit" : "other",
    title: scene.title ?? scene.id,
    description: scene.description ?? "",
    aspect: Math.round((scene.aspect ?? 1.6) * 1000) / 1000,
    accent: scene.accent ?? "#6fb8ff",
    post: scene.post ?? "plate",
    themes: themesOf(scene),
    params,
    brandParams,
    example: tagFor(scene, ex),
    template: tagFor(scene, tpl, { raw: true }),
  };
}

function tagFor(scene: FoilScene, params: Record<string, string | number | boolean>, opts: SnippetOptions & { raw?: boolean } = {}) {
  const attrs: string[] = [`scene="${scene.id}"`];
  if (opts.theme && opts.theme !== "plate") attrs.push(`theme="${esc(opts.theme)}"`);
  if (opts.accent) attrs.push(`accent="${esc(opts.accent)}"`);
  if (opts.label) attrs.push(`aria-label="${esc(opts.label)}"`);
  if (opts.fixed || (scene.id === "field" && opts.fixed !== false)) attrs.push("fixed");
  const order = Object.keys(scene.params ?? {});
  const names = Object.keys(params).sort((a, b) => (order.indexOf(a) + 999 * +!order.includes(a)) - (order.indexOf(b) + 999 * +!order.includes(b)));
  for (const k of names) {
    const v = params[k];
    if (v === undefined || v === null || v === false) continue;
    attrs.push(v === true ? k : `${k}="${opts.raw ? String(v).replace(/"/g, "&quot;") : esc(String(v))}"`);
  }
  const one = `<zen-foil ${attrs.join(" ")}></zen-foil>`;
  if (one.length <= 100) return one;
  // Wrap long tags like the docs do: two-space continuation lines.
  const lines: string[] = [];
  let cur = `<zen-foil ${attrs[0]}`;
  for (const a of attrs.slice(1)) {
    if (cur.length + a.length + 1 > 88) {
      lines.push(cur);
      cur = `  ${a}`;
    } else cur += ` ${a}`;
  }
  lines.push(cur + "></zen-foil>");
  return lines.join("\n");
}

/** The full contract, or one scene's entry. */
export function describe(): Manifest;
export function describe(id: string): SceneManifest | null;
export function describe(id?: string): Manifest | SceneManifest | null {
  if (id !== undefined) {
    const s = getScene(id);
    return s ? sceneManifest(s) : null;
  }
  return {
    name: "zen-foil",
    version: VERSION_REF.value,
    element: "zen-foil",
    summary: SUMMARY,
    attributes: ELEMENT_SPEC,
    marks: [...markNames(), "none"],
    events: {
      "foil-live": "First frame presented (detail.backend: webgpu | webgl2).",
      "foil-fail": "No GPU or the scene failed to compile: the CSS poster stays (detail.reason).",
      "foil-error": "A problem with an image, mark or param (detail.message).",
    },
    methods: {
      "replay()": "Plays the minting intro again (burin, foil, press).",
      "update(params)": "Merges params without touching attributes.",
      "capture()": "The next frame as ImageData.",
      "ZenFoil.check()": "Checks every plate on the page; returns problems with exact fixes.",
      "ZenFoil.describe(id?)": "This contract, or one scene's entry.",
      "ZenFoil.snippet(id, params, opts?)": "A valid tag for a scene, or an error saying what to fix.",
    },
    glyphs: "ASCII, ·•→←±×∷∵∴⊕⊗※÷≈≡∞△◇◈✦αλΣΩπ∇∂ and アイウエオカ. Accents fold to the base letter, — prints as -, anything else as ·.",
    rules: RULES,
    scenes: listScenes().map(sceneManifest),
  };
}

/** Filled in by index.ts (avoids an import cycle). */
export const VERSION_REF = { value: "0.0.0" };

export interface SnippetOptions {
  theme?: "plate" | "paper" | "clear";
  accent?: string;
  /** Accessible name (aria-label). */
  label?: string;
  fixed?: boolean;
  /** "html" (default) or "react" (the <ZenFoil> wrapper). */
  format?: "html" | "react";
}

/**
 * A valid tag for `id` with `params`. Throws with every problem and its fix
 * when the input is wrong, so an agent can correct it and call again.
 */
export function snippet(id: string, params: Record<string, string | number | boolean> = {}, opts: SnippetOptions = {}): string {
  const scene = getScene(id);
  const attrs: Record<string, string> = { scene: id };
  for (const [k, v] of Object.entries(params)) if (v !== false && v !== undefined && v !== null) attrs[k] = v === true ? "" : String(v);
  if (opts.theme) attrs.theme = opts.theme;
  if (opts.accent) attrs.accent = opts.accent;
  const errors = checkTag(attrs).filter((p) => p.level === "error");
  if (!scene || errors.length) throw new Error(errors.map((e) => `${e.message}${e.fix ? ` Fix: ${e.fix}` : ""}`).join("\n"));
  if (opts.format === "react") {
    const props: string[] = [`scene="${id}"`];
    if (opts.theme && opts.theme !== "plate") props.push(`theme="${opts.theme}"`);
    if (opts.accent) props.push(`accent="${opts.accent}"`);
    if (opts.label) props.push(`label=${JSON.stringify(opts.label)}`);
    if (opts.fixed || id === "field") props.push("fixed");
    const p = Object.entries(params).filter(([, v]) => v !== false && v !== undefined);
    if (p.length) props.push(`params={{ ${p.map(([k, v]) => `${/^[a-z]\w*$/.test(k) ? k : JSON.stringify(k)}: ${JSON.stringify(v)}`).join(", ")} }}`);
    return `<ZenFoil ${props.join(" ")} />`;
  }
  return tagFor(scene, params, opts);
}

/* ── Checking ───────────────────────────────────────────────── */

function checkValue(scene: FoilScene, name: string, spec: ParamSpec, value: string, out: Problem[]) {
  const v = value.trim();
  switch (spec.type) {
    case "choice": {
      const opts = spec.options ?? [];
      if (!opts.includes(v.toLowerCase()))
        out.push({ level: "error", code: "bad-choice", attribute: name, message: `${scene.id}: ${name}="${value}" is not one of ${opts.join(", ")}.`, fix: `${name}="${closest(v, opts, 3) ?? spec.default ?? opts[0]}"` });
      return;
    }
    case "number": {
      const n = Number(v);
      if (v === "" || !Number.isFinite(n)) {
        out.push({ level: "error", code: "bad-number", attribute: name, message: `${scene.id}: ${name}="${value}" is not a number.`, fix: `${name}="${spec.default ?? 1}"` });
        return;
      }
      if ((spec.min !== undefined && n < spec.min) || (spec.max !== undefined && n > spec.max)) {
        const c = Math.min(spec.max ?? n, Math.max(spec.min ?? n, n));
        out.push({ level: "warning", code: "out-of-range", attribute: name, message: `${scene.id}: ${name}="${value}" is outside ${spec.min ?? "…"}–${spec.max ?? "…"}; it draws as ${c}.`, fix: `${name}="${c}"` });
      }
      return;
    }
    case "boolean":
      if (!["", "true", "false", "1", "0", "on", "off", "yes", "no"].includes(v.toLowerCase()))
        out.push({ level: "warning", code: "bad-boolean", attribute: name, message: `${scene.id}: ${name}="${value}" isn't a boolean (true/false).`, fix: `${name}="true"` });
      return;
    case "color":
      if (!looksLikeColor(v)) out.push({ level: "error", code: "bad-color", attribute: name, message: `${scene.id}: ${name}="${value}" is not a CSS colour.`, fix: `${name}="#7cc4ff"` });
      return;
    case "mark": {
      const names = [...markNames(), "none"];
      if (!v || names.includes(v) || looksLikePath(v) || /^<svg[\s>]/i.test(v) || looksLikeUrl(v)) return;
      const near = closest(v, names, 2);
      out.push({
        level: "error",
        code: "bad-mark",
        attribute: name,
        message: `${scene.id}: ${name}="${value}" is not a built-in mark (${names.join(", ")}), SVG path data, inline <svg> or an image URL.`,
        fix: near ? `${name}="${near}"` : `${name}="/logo.svg"`,
      });
      return;
    }
    case "points": {
      const parts = v.split(/[;|\n]+/).map((s) => s.trim()).filter(Boolean);
      const pts = parsePoints(v);
      if (parts.length && pts.length < parts.length) {
        out.push({ level: "error", code: "bad-points", attribute: name, message: `${scene.id}: ${name} must be "lon,lat; lon,lat" (numbers, longitude first). ${parts.length - pts.length} of ${parts.length} entries didn't parse.`, fix: `${name}="-77.04,38.91; -0.13,51.51"` });
        return;
      }
      const isSwapped = ([a, b]: [number, number]) => (Math.abs(a) <= 90 && Math.abs(b) > 90) || (scene.id === "usmap" && a >= 18 && a <= 72 && b <= -60 && b >= -170);
      const bad = pts.filter(([a, b]) => Math.abs(a) > 180 || Math.abs(b) > 90);
      if (pts.some(isSwapped))
        out.push({
          level: "error",
          code: "lat-lon-swapped",
          attribute: name,
          message: `${scene.id}: ${name} looks like lat,lon. Points are lon,lat (longitude first).`,
          fix: `${name}="${pts.map((q) => (isSwapped(q) ? `${q[1]},${q[0]}` : `${q[0]},${q[1]}`)).join("; ")}"`,
        });
      else if (bad.length) out.push({ level: "error", code: "bad-points", attribute: name, message: `${scene.id}: ${name} has coordinates out of range (lon −180…180, lat −90…90).` });
      return;
    }
    case "text": {
      const missing = [...new Set(Array.from(v).filter((ch) => !hasGlyph(ch)))];
      if (missing.length) out.push({ level: "warning", code: "missing-glyph", attribute: name, message: `${scene.id}: ${name} uses characters the engraving font lacks (${missing.join(" ")}); they print as ·.`, fix: `${name}="${Array.from(v).filter((ch) => hasGlyph(ch)).join("")}"` });
      if (/[a-z]/.test(v) && v === v.replace(/[A-Z]/g, "") && v.length > 2)
        out.push({ level: "hint", code: "lowercase-text", attribute: name, message: `${scene.id}: engraved type reads best UPPERCASE.`, fix: `${name}="${v.toUpperCase()}"` });
      return;
    }
    default:
      return;
  }
}

/**
 * Problems with one tag. `attrs` are its attributes as written (names
 * lowercase, values as strings, "" for bare attributes), including scene.
 */
export function checkTag(attrs: Record<string, string>): Problem[] {
  const out: Problem[] = [];
  const id = (attrs.scene ?? "").trim();
  const all = listScenes().map((s) => s.id);
  if (!id) {
    out.push({ level: "error", code: "no-scene", attribute: "scene", message: `Every <zen-foil> needs scene="…" (${all.join(", ")}).`, fix: 'scene="seal"' });
    return out;
  }
  const scene = getScene(id);
  if (!scene) {
    const near = closest(id, all, 3);
    out.push({
      level: "error",
      code: "unknown-scene",
      attribute: "scene",
      message: `scene="${id}" is not registered. Scenes: ${all.join(", ")}. (The 20 portfolio plates need dist/zen-foil-showcase.js loaded from the same place as zen-foil.js.)`,
      fix: near ? `scene="${near}"` : undefined,
    });
    return out;
  }
  const params = scene.params ?? {};
  const pool = [...Object.keys(params), ...Object.keys(ELEMENT_SPEC)];
  for (const [rawName, value] of Object.entries(attrs)) {
    const name = rawName.toLowerCase();
    if (/\{\{[^}]*\}\}/.test(value))
      out.push({ level: "error", code: "unfilled-token", attribute: rawName, message: `${rawName}="${value}" still has a template token. Replace it with the client's real text, or delete the attribute.` });
    if (name === "scene") continue;
    if (name === "classname") {
      out.push({ level: "error", code: "classname", attribute: rawName, message: "On the raw <zen-foil> element React 18 renders className as a classname attribute. Write class (or use the <ZenFoil> wrapper).", fix: `class="${value}"` });
      continue;
    }
    if (name === "theme") {
      const opts = ELEMENT_SPEC.theme.options ?? [];
      if (!opts.includes(value.trim().toLowerCase()))
        out.push({ level: "error", code: "bad-theme", attribute: "theme", message: `theme="${value}" is not one of ${opts.join(", ")}.${value === "dark" || value === "light" ? ` (dark is plate, light is paper${scene.id === "field" ? "; the field scene uses variant" : ""}.)` : ""}`, fix: scene.id === "field" ? `variant="${value === "dark" ? "dark" : "light"}"` : `theme="${value === "light" ? "paper" : value === "dark" ? "plate" : closest(value, opts, 3) ?? "plate"}"` });
      else if ((scene.post ?? "plate") !== "plate") out.push({ level: "warning", code: "theme-ignored", attribute: "theme", message: `${scene.id} draws its own ground (post "${scene.post}"), so theme is ignored.${scene.id === "field" ? ' Use variant="light|dark".' : ""}` });
      continue;
    }
    if (name === "accent") {
      if (!looksLikeColor(value.trim())) out.push({ level: "error", code: "bad-color", attribute: "accent", message: `accent="${value}" is not a CSS colour.`, fix: 'accent="#7cc4ff"' });
      continue;
    }
    if (name === "max-dpr" || name === "seed") {
      if (!Number.isFinite(Number(value)) || value.trim() === "") out.push({ level: "error", code: "bad-number", attribute: name, message: `${name}="${value}" is not a number.`, fix: name === "max-dpr" ? 'max-dpr="1.5"' : 'seed="7"' });
      continue;
    }
    if (name === "fixed" && scene.id !== "field") {
      out.push({ level: "warning", code: "fixed-not-field", attribute: "fixed", message: `fixed makes ${scene.id} a full-viewport background. That is meant for scene="field".` });
      continue;
    }
    const spec = params[name];
    if (spec) {
      checkValue(scene, name, spec, value, out);
      continue;
    }
    if (isElementAttr(name)) {
      if (name === "title") out.push({ level: "warning", code: "title-attribute", attribute: "title", message: `title is the HTML tooltip attribute, not text on the plate.${params.headline ? ' Use headline="…" for the engraved title.' : ""}`, fix: params.headline ? `headline="${value}"` : undefined });
      continue;
    }
    const alias = (ALIASES[name] ?? []).filter((a) => a in params || a in ELEMENT_SPEC);
    const near = alias[0] ?? closest(name, pool, 2);
    out.push({
      level: "error",
      code: "unknown-param",
      attribute: rawName,
      message: `${scene.id} has no "${rawName}" attribute, so it is ignored. ${scene.id} takes: ${Object.keys(params).join(", ") || "no params"} (plus ${Object.keys(ELEMENT_SPEC).join(", ")}).`,
      fix: near ? `${near}="${value}"` : undefined,
    });
  }
  const unsetBrand = Object.entries(params).filter(([n, s]) => brandDefault(s) && !(n in attrs));
  if (unsetBrand.length && unsetBrand.length === Object.entries(params).filter(([, s]) => brandDefault(s)).length)
    out.push({ level: "hint", code: "brand-defaults", message: `${scene.id} is showing ZEN AI Co.'s default ${unsetBrand.map(([n]) => n).join(", ")}. Fine for ZEN AI Co. work; any other brand sets them.` });
  return out;
}

export interface PageProblem extends Problem {
  /** The element, when the problem belongs to one. */
  element?: Element;
  /** A short locator, e.g. 'zen-foil[scene="globe"] #3'. */
  where: string;
}

/** Checks every plate on a page (or under `root`). Logs a table when `log` is true. */
export function checkPage(root: ParentNode = document, log = true): PageProblem[] {
  const out: PageProblem[] = [];
  const els = Array.from(root.querySelectorAll("zen-foil"));
  els.forEach((el, i) => {
    const attrs: Record<string, string> = {};
    for (const a of Array.from(el.attributes)) attrs[a.name] = a.value;
    const where = `zen-foil[scene="${attrs.scene ?? ""}"] #${i + 1}`;
    for (const p of checkTag(attrs)) out.push({ ...p, element: el, where });
    const r = el.getBoundingClientRect();
    if (!el.hasAttribute("fixed") && (r.width < 2 || r.height < 2) && getComputedStyle(el).display !== "none")
      out.push({ level: "warning", code: "no-size", element: el, where, message: "This plate has no size. It is display:block: give its container a width (and a height if the aspect ratio is wrong)." });
  });
  const fixed = els.filter((e) => e.hasAttribute("fixed"));
  if (fixed.length > 1) out.push({ level: "warning", code: "many-fixed", where: "page", message: `${fixed.length} fixed background plates; use one.` });
  const visible = els.filter((e) => {
    const r = e.getBoundingClientRect();
    return r.bottom > 0 && r.top < innerHeight && r.width > 0;
  });
  if (visible.length > 8) out.push({ level: "warning", code: "too-many-plates", where: "viewport", message: `${visible.length} plates on screen at once. Keep it to ~8 for frame rate and focus.` });
  const srcs = new Set(
    Array.from(document.querySelectorAll<HTMLScriptElement>("script[src]"))
      .map((s) => s.src)
      .filter((s) => /zen-foil(\.min)?\.js(\?|$)/.test(s)),
  );
  if (srcs.size > 1) out.push({ level: "error", code: "two-engines", where: "page", message: `zen-foil.js loads from ${srcs.size} URLs (${[...srcs].join(", ")}). Each starts its own engine; load it from one place.` });
  for (const s of srcs) if (/@main\//.test(s)) out.push({ level: "warning", code: "cdn-main", where: "page", message: `${s} follows a branch. Pin the CDN to a commit (@<sha>) so the page never changes underneath you.` });
  if (log && typeof console !== "undefined") {
    if (!out.length) console.info(`[zen-foil] check: ${els.length} plate${els.length === 1 ? "" : "s"}, no problems.`);
    else console.table(out.map(({ level, code, where, message, fix }) => ({ level, code, where, message, fix: fix ?? "" })));
  }
  return out;
}
