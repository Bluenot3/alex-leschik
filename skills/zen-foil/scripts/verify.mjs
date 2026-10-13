#!/usr/bin/env node
/**
 * Checks every <zen-foil> tag (and <ZenFoil> component) in your source files
 * against the real scene definitions, and prints exactly what to change.
 * No browser, no dependencies. Run it after every edit until it is clean:
 *
 *   node scripts/verify.mjs index.html src            files and folders
 *   node scripts/verify.mjs src --json                machine-readable
 *   node scripts/verify.mjs src --strict              warnings fail too
 *   node scripts/verify.mjs src --no-hints            hide style hints
 *
 * Exit code: 0 clean · 1 errors (or warnings with --strict) · 2 bad usage.
 * The rules are the bundle's own checkTag(), the same ones ZenFoil.check()
 * runs in the browser, so the two never disagree.
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--")));
const targets = args.filter((a) => !a.startsWith("--"));
if (!targets.length || flags.has("--help")) {
  console.log("usage: node scripts/verify.mjs <file|folder>… [--json] [--strict] [--no-hints]");
  process.exit(targets.length ? 0 : 2);
}

const core = await import(pathToFileURL(join(root, "dist", "zen-foil.js")).href);
await import(pathToFileURL(join(root, "dist", "zen-foil-showcase.js")).href).catch(() => {});

const EXT = new Set([".html", ".htm", ".jsx", ".tsx", ".js", ".mjs", ".ts", ".vue", ".svelte", ".astro", ".md", ".mdx", ".php", ".liquid", ".hbs", ".njk", ".erb"]);
const SKIP = new Set(["node_modules", ".git", "dist", "build", ".next", ".nuxt", ".svelte-kit", ".output", "coverage", ".vercel", ".turbo"]);

function walk(p, out) {
  if (!existsSync(p)) {
    console.error(`verify: ${p} does not exist`);
    process.exit(2);
  }
  const st = statSync(p);
  if (st.isDirectory()) {
    for (const name of readdirSync(p)) if (!SKIP.has(name) && !name.startsWith(".")) walk(join(p, name), out);
  } else if (EXT.has(extname(p).toLowerCase()) && !/zen-foil(-showcase)?\.js$/.test(p)) out.push(p);
  return out;
}

/* ── A small tag reader: quotes, JSX braces and template literals ── */

function lineCol(src, i) {
  let line = 1;
  let last = -1;
  for (let k = 0; k < i; k++) if (src.charCodeAt(k) === 10) {
    line++;
    last = k;
  }
  return { line, col: i - last };
}

/** Reads attributes from just after the tag name up to the closing > (or />). */
function readAttrs(src, i) {
  const attrs = [];
  const n = src.length;
  while (i < n) {
    while (i < n && /\s/.test(src[i])) i++;
    if (src[i] === ">") return { attrs, end: i + 1, selfClosing: false };
    if (src[i] === "/" && src[i + 1] === ">") return { attrs, end: i + 2, selfClosing: true };
    if (src[i] === "{") {
      // {...spread} in JSX
      const j = matchBrace(src, i);
      attrs.push({ name: "{…}", value: null, dynamic: true, at: i });
      i = j + 1;
      continue;
    }
    const m = /^[^\s=>/]+/.exec(src.slice(i, i + 200));
    if (!m) return { attrs, end: i + 1, selfClosing: false };
    const name = m[0];
    const at = i;
    i += name.length;
    while (i < n && /\s/.test(src[i])) i++;
    if (src[i] !== "=") {
      attrs.push({ name, value: "", dynamic: false, at });
      continue;
    }
    i++;
    while (i < n && /\s/.test(src[i])) i++;
    const q = src[i];
    if (q === '"' || q === "'") {
      const j = src.indexOf(q, i + 1);
      attrs.push({ name, value: decode(src.slice(i + 1, j)), dynamic: false, at });
      i = j + 1;
    } else if (q === "{") {
      const j = matchBrace(src, i);
      const expr = src.slice(i + 1, j).trim();
      const lit = /^(["'`])([\s\S]*)\1$/.exec(expr);
      if (lit && !(lit[1] === "`" && lit[2].includes("${"))) attrs.push({ name, value: lit[2], dynamic: false, at });
      else if (/^-?\d+(\.\d+)?$/.test(expr) || expr === "true" || expr === "false") attrs.push({ name, value: expr === "true" ? "" : expr, dynamic: false, at, bool: expr === "false" });
      else attrs.push({ name, value: expr, dynamic: true, at });
      i = j + 1;
    } else {
      const m2 = /^[^\s>]+/.exec(src.slice(i));
      attrs.push({ name, value: m2 ? m2[0] : "", dynamic: false, at });
      i += m2 ? m2[0].length : 0;
    }
  }
  return { attrs, end: n, selfClosing: false };
}

function matchBrace(src, i) {
  let depth = 0;
  for (let k = i; k < src.length; k++) {
    const c = src[k];
    if (c === '"' || c === "'" || c === "`") {
      const j = src.indexOf(c, k + 1);
      if (j < 0) return src.length - 1;
      k = j;
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}" && --depth === 0) return k;
  }
  return src.length - 1;
}

const decode = (s) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

/** { key: "value", key2: 3 } → entries (string/number/boolean literals only). */
function objectLiteral(expr) {
  const out = {};
  const body = expr.replace(/^\{\s*/, "").replace(/\s*\}$/, "");
  const re = /(?:^|,)\s*(?:"([^"]+)"|'([^']+)'|([A-Za-z_$][\w$-]*))\s*:\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`[^`$]*`|-?\d+(?:\.\d+)?|true|false|[^,]+)/g;
  for (const m of body.matchAll(re)) {
    const key = m[1] ?? m[2] ?? m[3];
    const raw = m[4].trim();
    if (/^["'`]/.test(raw)) out[key] = { value: raw.slice(1, -1).replace(/\\(.)/g, "$1"), dynamic: false };
    else if (/^-?\d/.test(raw)) out[key] = { value: raw, dynamic: false };
    else if (raw === "true") out[key] = { value: "", dynamic: false };
    else if (raw === "false") out[key] = { value: "false", dynamic: false };
    else out[key] = { value: raw, dynamic: true };
  }
  return out;
}

/* ── Checking ───────────────────────────────────────────────── */

const WRAPPER_PROPS = { scene: "scene", accent: "accent", theme: "theme", label: "aria-label", fixed: "fixed", seed: "seed", maxDpr: "max-dpr", className: "class", style: "style" };

const results = [];
function report(file, src, at, p) {
  const { line, col } = lineCol(src, at);
  results.push({ file: relative(process.cwd(), file) || file, line, col, ...p });
}

/* Comments (and prose, in markdown) aren't markup: blank them out, keeping
   every offset so line numbers stay right. */
function mask(src, ext) {
  const blank = (m) => m.replace(/[^\n]/g, " ");
  let s = src.replace(/<!--[\s\S]*?-->/g, blank);
  if (![".html", ".htm", ".md"].includes(ext)) s = s.replace(/\/\*[\s\S]*?\*\//g, blank).replace(/(^|[^:"'`\\])(\/\/[^\n]*)/gm, (_m, a, b) => a + blank(b));
  if (ext === ".md" || ext === ".mdx") {
    // Only fenced code blocks count in markdown.
    let out = "";
    let last = 0;
    for (const m of s.matchAll(/^```[^\n]*\n[\s\S]*?^```/gm)) {
      out += blank(s.slice(last, m.index)) + m[0];
      last = m.index + m[0].length;
    }
    s = out + blank(s.slice(last));
  }
  return s;
}

function checkFile(file) {
  const ext = extname(file).toLowerCase();
  const src = mask(readFileSync(file, "utf8"), ext);
  const isJsx = [".jsx", ".tsx", ".js", ".mjs", ".ts", ".astro", ".mdx"].includes(ext);
  let tags = 0;

  for (const m of src.matchAll(/<(zen-foil|ZenFoil)(?=[\s/>])/g)) {
    const kind = m[1];
    const { attrs, selfClosing } = readAttrs(src, m.index + m[0].length);
    tags++;
    const map = {};
    const dynamic = new Set();
    if (kind === "zen-foil") {
      if (selfClosing && !isJsx)
        report(file, src, m.index, { level: "error", code: "self-closing", message: "<zen-foil … /> doesn't close in HTML: everything after it becomes its child.", fix: "<zen-foil …></zen-foil>" });
      for (const a of attrs) {
        if (a.name === "{…}") continue;
        if (a.bool) continue;
        map[a.name] = a.dynamic ? "" : a.value;
        if (a.dynamic) dynamic.add(a.name.toLowerCase());
      }
    } else {
      for (const a of attrs) {
        if (a.name === "params") {
          if (a.dynamic && /^\{[\s\S]*\}$/.test(a.value.trim())) {
            for (const [k, v] of Object.entries(objectLiteral(a.value.trim()))) {
              map[k] = v.value;
              if (v.dynamic) dynamic.add(k.toLowerCase());
            }
          }
          continue;
        }
        if (a.name === "children" || a.name === "onLive" || a.name === "onFail" || a.name === "key" || a.name === "ref" || a.name === "{…}") continue;
        const mapped = WRAPPER_PROPS[a.name];
        if (!mapped) {
          report(file, src, a.at, { level: "error", code: "unknown-prop", attribute: a.name, message: `<ZenFoil> has no "${a.name}" prop. Scene params go in params={{ … }}; props are ${Object.keys(WRAPPER_PROPS).join(", ")}.`, fix: `params={{ ${a.name}: ${a.dynamic ? a.value : JSON.stringify(a.value)} }}` });
          continue;
        }
        if (a.bool) continue;
        map[mapped] = a.dynamic ? "" : a.value;
        if (a.dynamic) dynamic.add(mapped);
      }
    }
    if (dynamic.has("scene")) continue; // can't know the scene statically
    for (const p of core.checkTag(map)) {
      if (p.attribute && dynamic.has(p.attribute.toLowerCase()) && p.code !== "unknown-param") continue;
      if (kind === "ZenFoil" && p.code === "classname") continue;
      const a = attrs.find((x) => x.name.toLowerCase() === (p.attribute ?? "").toLowerCase());
      report(file, src, a ? a.at : m.index, p);
    }
  }
  if (!tags) return;

  // Loading: one URL, pinned, present somewhere a page can see it.
  const urls = [...new Set([...src.matchAll(/["'`]([^"'`\s]*zen-foil(?:\.min)?\.js)["'`]/g)].map((x) => x[1]))];
  if (urls.length > 1) report(file, src, src.indexOf(urls[1]), { level: "error", code: "two-engines", message: `zen-foil.js loads from ${urls.length} different URLs (${urls.join(", ")}). Each starts its own engine: use one.` });
  for (const u of urls)
    if (/@main\//.test(u)) report(file, src, src.indexOf(u), { level: "warning", code: "cdn-main", message: "The CDN URL follows a branch. Pin it to a commit (@<sha>) so the page can't change (or 404) underneath you.", fix: u.replace(/@main\//, "@<commit-sha>/") });
  if ([".html", ".htm"].includes(ext) && !urls.length && !/import\s*["'][^"']*zen-foil/.test(src) && !/ZenFoil\s*=\s*\{|window\.ZenFoil|zen-foil\.js/.test(src))
    report(file, src, 0, { level: "warning", code: "no-loader", message: "This page uses <zen-foil> but never loads zen-foil.js. Add the module script once (head or end of body).", fix: '<script type="module" src="https://cdn.jsdelivr.net/gh/Bluenot3/alex-leschik@<commit-sha>/skills/zen-foil/dist/zen-foil.js"></script>' });
}

const files = targets.flatMap((t) => walk(resolve(t), []));
for (const f of files) checkFile(f);

const shown = results.filter((r) => !(flags.has("--no-hints") && r.level === "hint"));
const errors = shown.filter((r) => r.level === "error").length;
const warnings = shown.filter((r) => r.level === "warning").length;
const fail = errors > 0 || (flags.has("--strict") && warnings > 0);

if (flags.has("--json")) {
  console.log(JSON.stringify({ ok: !fail, errors, warnings, files: files.length, problems: shown }, null, 2));
} else {
  const tagCount = files.reduce((n, f) => n + (mask(readFileSync(f, "utf8"), extname(f).toLowerCase()).match(/<(zen-foil|ZenFoil)(?=[\s/>])/g)?.length ?? 0), 0);
  for (const r of shown) {
    console.log(`${r.file}:${r.line}:${r.col}  ${r.level.toUpperCase()}  [${r.code}] ${r.message}`);
    if (r.fix) console.log(`    fix: ${r.fix}`);
  }
  const verdict = fail ? "FAIL" : "OK";
  console.log(`${shown.length ? "\n" : ""}zen-foil verify: ${verdict} · ${tagCount} tag${tagCount === 1 ? "" : "s"} in ${files.length} file${files.length === 1 ? "" : "s"} · ${errors} error${errors === 1 ? "" : "s"}, ${warnings} warning${warnings === 1 ? "" : "s"}${flags.has("--no-hints") ? "" : `, ${shown.length - errors - warnings} hint${shown.length - errors - warnings === 1 ? "" : "s"}`}`);
  if (fail) console.log("Apply each fix, save, and run verify again until it says OK.");
}
process.exit(fail ? 1 : 0);
