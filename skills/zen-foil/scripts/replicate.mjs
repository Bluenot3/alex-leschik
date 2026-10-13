#!/usr/bin/env node
/**
 * Writes correct zen-foil markup for you, so no agent has to compose it from
 * the docs. Every command validates against the real scene definitions and
 * refuses bad input with the exact fix. No dependencies.
 *
 *   node scripts/replicate.mjs list                         every scene, one line each
 *   node scripts/replicate.mjs show globe                   its params, example and template
 *   node scripts/replicate.mjs tag seal --headline "ACME LABS" --mark /logo.svg --accent "#ff6a00"
 *   node scripts/replicate.mjs tag --json '{"scene":"seal","headline":"ACME LABS"}'
 *   node scripts/replicate.mjs tag network --nodes "A, B, C" --react     <ZenFoil> for React
 *   node scripts/replicate.mjs page seal --headline "ACME LABS" --heading "Acme Labs" --out seal.html
 *   node scripts/replicate.mjs page seal … --inline         bundle inlined (CDN-blocked sandboxes, artifacts)
 *   node scripts/replicate.mjs cdn                          the pinned <script> tag
 *   node scripts/replicate.mjs brief [1|2|3]                the agent brief from AGENTS.md
 *
 * Element options: --theme plate|paper|clear  --accent <css colour>  --label <aria-label>
 * Page options:    --title  --heading  --lede  --eyebrow  --light  --no-field  --out <file>  --inline
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const core = await import(pathToFileURL(join(root, "dist", "zen-foil.js")).href);
await import(pathToFileURL(join(root, "dist", "zen-foil-showcase.js")).href).catch(() => {});
const release = JSON.parse(readFileSync(join(root, "release.json"), "utf8"));

const argv = process.argv.slice(2);
const cmd = argv[0];
const opts = {};
const positional = [];
for (let i = 1; i < argv.length; i++) {
  const a = argv[i];
  if (a.startsWith("--")) {
    const eq = a.indexOf("=");
    if (eq > 0) opts[a.slice(2, eq)] = a.slice(eq + 1);
    else if (argv[i + 1] !== undefined && !argv[i + 1].startsWith("--")) opts[a.slice(2)] = argv[++i];
    else opts[a.slice(2)] = true;
  } else positional.push(a);
}

const ELEMENT_OPTS = ["theme", "accent", "label", "react", "json", "out", "inline", "title", "heading", "lede", "eyebrow", "light", "no-field", "cdn"];
const die = (msg, code = 1) => {
  console.error(msg);
  process.exit(code);
};

function input() {
  let spec = {};
  if (opts.json) {
    const raw = existsSync(resolve(String(opts.json))) ? readFileSync(resolve(String(opts.json)), "utf8") : String(opts.json);
    try {
      spec = JSON.parse(raw);
    } catch (e) {
      die(`--json is not valid JSON: ${e.message}`, 2);
    }
  }
  const scene = positional[0] ?? spec.scene;
  if (!scene) die("Which scene? e.g. node scripts/replicate.mjs tag seal --headline \"ACME LABS\"  (list them with: replicate.mjs list)", 2);
  const params = { ...(spec.params ?? {}) };
  for (const [k, v] of Object.entries(spec)) if (!["scene", "params", "theme", "accent", "label"].includes(k)) params[k] = v;
  for (const [k, v] of Object.entries(opts)) if (!ELEMENT_OPTS.includes(k)) params[k] = v === true ? true : v;
  return {
    scene,
    params,
    theme: opts.theme ?? spec.theme,
    accent: opts.accent ?? spec.accent,
    label: opts.label ?? spec.label,
  };
}

function build(spec, format) {
  try {
    return core.snippet(spec.scene, spec.params, { theme: spec.theme, accent: spec.accent, label: spec.label, format });
  } catch (e) {
    die(`Can't write that tag:\n${e.message.split("\n").map((l) => `  - ${l}`).join("\n")}\nFix the input and run again.`);
  }
}

function warnings(spec) {
  const attrs = { scene: spec.scene };
  for (const [k, v] of Object.entries(spec.params)) attrs[k] = v === true ? "" : String(v);
  if (spec.theme) attrs.theme = spec.theme;
  if (spec.accent) attrs.accent = spec.accent;
  for (const p of core.checkTag(attrs).filter((p) => p.level !== "error")) console.error(`${p.level}: ${p.message}${p.fix ? `  (fix: ${p.fix})` : ""}`);
}

const scriptTag = () => `<script type="module" src="${opts.cdn ?? release.cdn}"></script>`;

function page(spec) {
  const tag = build(spec);
  const light = !!opts.light || spec.theme === "paper";
  const heading = String(opts.heading ?? spec.params.headline ?? "Your heading");
  const title = String(opts.title ?? heading);
  const lede = String(opts.lede ?? "One or two true sentences about what this is. The plate is the visual; this text is what search engines and screen readers get.");
  const eyebrow = opts.eyebrow ? `<p class="eyebrow">${esc(String(opts.eyebrow))}</p>\n      ` : "";
  const loader = opts.inline
    ? `<script type="module">\n${readFileSync(join(root, "dist", "zen-foil.js"), "utf8").replace(/<\/script/gi, "<\\/script")}\n</script>`
    : scriptTag();
  const field = opts["no-field"] || spec.scene === "field" ? "" : `\n  <zen-foil scene="field" fixed variant="${light ? "light" : "dark"}" density="0.18" max-dpr="1.25"></zen-foil>\n`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
${loader}
<style>
  :root { --bg: ${light ? "#f3f1ea" : "#05070d"}; --ink: ${light ? "#141b28" : "#e3e9f5"}; --dim: ${light ? "#5a6476" : "#8a95ab"}; --gold: ${light ? "#87672b" : "#d6b26a"}; color-scheme: ${light ? "light" : "dark"}; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--ink); font: 16px/1.6 system-ui, -apple-system, "Segoe UI", sans-serif; }
  main { max-width: 1240px; margin: 0 auto; padding: clamp(32px, 7vw, 96px) max(16px, 4vw); }
  .hero { display: grid; grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.35fr); gap: clamp(24px, 4vw, 56px); align-items: center; }
  .eyebrow { font: 12px ui-monospace, Menlo, monospace; letter-spacing: 0.24em; color: var(--gold); margin: 0 0 12px; text-transform: uppercase; }
  h1 { font-size: clamp(40px, 6vw, 76px); line-height: 0.98; margin: 0 0 16px; letter-spacing: -0.01em; text-wrap: balance; }
  .lede { color: var(--dim); max-width: 48ch; margin: 0; }
  .hero zen-foil { border-radius: 18px; }
  @media (max-width: 860px) { .hero { grid-template-columns: minmax(0, 1fr); } .hero zen-foil { order: -1; } }
</style>
</head>
<body>${field}
  <main>
    <section class="hero">
      <div>
      ${eyebrow}<h1>${esc(heading)}</h1>
        <p class="lede">${esc(lede)}</p>
      </div>
      ${tag.replace(/\n/g, "\n      ")}
    </section>
  </main>
</body>
</html>
`;
}

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function out(text) {
  if (opts.out) {
    writeFileSync(resolve(String(opts.out)), text);
    console.error(`wrote ${opts.out}`);
  } else process.stdout.write(text.endsWith("\n") ? text : text + "\n");
}

switch (cmd) {
  case "list": {
    const m = core.describe();
    const w = Math.max(...m.scenes.map((s) => s.id.length));
    for (const s of m.scenes) console.log(`${s.id.padEnd(w)}  ${s.group === "kit" ? "kit " : "plate"}  ${s.description}`);
    console.log(`\nDetails: replicate.mjs show <scene>. Write one: replicate.mjs tag <scene> --param value …`);
    break;
  }
  case "show": {
    const id = positional[0];
    const s = id && core.describe(id);
    if (!s) die(`No scene "${id ?? ""}". Scenes: ${core.describe().scenes.map((x) => x.id).join(", ")}`, 2);
    console.log(`${s.id} — ${s.title}\n${s.description}\naspect ${s.aspect} · accent ${s.accent} · themes ${s.themes.join(", ") || "(draws its own ground)"}\n`);
    const rows = Object.entries(s.params);
    if (rows.length) {
      console.log("params:");
      for (const [n, p] of rows) {
        const type = p.options ? p.options.join("|") : p.type;
        const range = p.min !== undefined || p.max !== undefined ? ` ${p.min ?? "…"}–${p.max ?? "…"}` : "";
        console.log(`  ${n.padEnd(10)} ${`${type}${range}`.padEnd(26)} ${p.brand ? "[brand] " : ""}${p.description ?? ""}${p.default ? `  (default: ${p.default.length > 48 ? p.default.slice(0, 45) + "…" : p.default})` : ""}`);
      }
    } else console.log("params: none (accent and theme still apply)");
    console.log(`\nexample:\n${s.example}\n\ntemplate (replace every {{…}}; delete an attribute rather than invent its text):\n${s.template}`);
    break;
  }
  case "tag": {
    const spec = input();
    const text = build(spec, opts.react ? "react" : "html");
    warnings(spec);
    out(text);
    break;
  }
  case "page": {
    const spec = input();
    warnings(spec);
    out(page(spec));
    break;
  }
  case "cdn":
    console.log(scriptTag());
    if (release.note) console.error(release.note);
    break;
  case "brief": {
    const md = readFileSync(join(root, "AGENTS.md"), "utf8");
    const tier = positional[0];
    if (!tier) out(md);
    else {
      const start = md.search(new RegExp(`^## Tier ${tier}\\b`, "m"));
      if (start < 0) die(`No "Tier ${tier}" section in AGENTS.md (tiers: 1, 2, 3).`, 2);
      const rest = md.slice(start + 3);
      const end = rest.search(/^## /m);
      out(md.slice(0, md.search(/^## /m)) + md.slice(start, end < 0 ? undefined : start + 3 + end));
    }
    break;
  }
  default:
    console.log(readFileSync(fileURLToPath(import.meta.url), "utf8").split("*/")[0].replace(/^#!.*\n\/\*\*\n/, "").replace(/^ \* ?/gm, ""));
    process.exit(cmd ? 2 : 0);
}
