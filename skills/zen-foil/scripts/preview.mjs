#!/usr/bin/env node
/**
 * Renders scenes in a real browser and saves screenshots — the visual check
 * for every scene you write. Needs Playwright (`npm i -D playwright` or
 * @playwright/test) with a Chromium build.
 *
 *   node scripts/preview.mjs --scenes seal,globe --theme paper --t 6 --out shots
 *   node scripts/preview.mjs --scenes my-scene --module ./my-scene.js --validate
 *   node scripts/preview.mjs --url http://localhost:5173/ --out shots     (any page)
 *   node scripts/preview.mjs --url /templates/standalone.html --full      (a page in this folder)
 *
 * Flags
 *   --scenes   all | kit | showcase | id,id      (default kit)
 *   --module   extra ES module(s) to load first (your defineScene() files, built JS)
 *   --theme    plate | paper | clear             --accent  #hex
 *   --t        freeze scene time (deterministic frames; default 6)
 *   --intro    pin the minting intro's progress, 0–1 (default 1: finished)
 *   --backend  webgl2 | webgpu | auto            (default webgl2; webgpu reads frames back)
 *   --w --h    plate size in CSS px              --cols   grid columns
 *   --dpr      device pixel ratio (default 1.5)  --bg light
 *   --p.NAME=VALUE   any scene param, e.g. --p.headline="ACME LABS"
 *   --validate compile every program on both backends and print errors
 *   --each     one screenshot per plate instead of one sheet
 *   --out      output directory (default ./zen-foil-shots)
 */
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, extname, join, resolve, relative, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const skillRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (!a.startsWith("--")) continue;
  const eq = a.indexOf("=");
  if (eq > 0) args[a.slice(2, eq)] = a.slice(eq + 1);
  else if (process.argv[i + 1] && !process.argv[i + 1].startsWith("--")) args[a.slice(2)] = process.argv[++i];
  else args[a.slice(2)] = true;
}

async function loadPlaywright() {
  for (const name of ["playwright", "@playwright/test", "playwright-core"]) {
    try {
      const mod = await import(name);
      return mod.chromium ?? mod.default?.chromium;
    } catch {
      /* try the next */
    }
  }
  // Fall back to the project's node_modules relative to the working directory.
  for (const name of ["playwright", "@playwright/test"]) {
    const p = join(process.cwd(), "node_modules", name, "index.mjs");
    if (existsSync(p)) {
      const mod = await import(pathToFileURL(p).href);
      return mod.chromium ?? mod.default?.chromium;
    }
  }
  console.error("Playwright not found. Install it: npm i -D playwright && npx playwright install chromium");
  process.exit(2);
}

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml", ".json": "application/json", ".woff2": "font/woff2" };

/* Serves the skill folder at / and the working directory at /cwd/ (for --module and images). */
function serve() {
  const cwd = process.cwd();
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, "http://x");
    let path = decodeURIComponent(url.pathname);
    const base = path.startsWith("/cwd/") ? cwd : skillRoot;
    if (path.startsWith("/cwd/")) path = path.slice(4);
    const file = resolve(base, "." + path);
    if (!file.startsWith(base + sep) && file !== base) {
      res.writeHead(403).end();
      return;
    }
    try {
      const body = await readFile(file);
      res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream", "access-control-allow-origin": "*", "cache-control": "no-store" });
      res.end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
  return new Promise((ok) => server.listen(0, "127.0.0.1", () => ok(server)));
}

async function loadEsbuild() {
  for (const base of [process.cwd(), skillRoot, join(skillRoot, "..", "..")]) {
    const p = join(base, "node_modules", "esbuild", "lib", "main.js");
    if (existsSync(p)) return (await import(pathToFileURL(p).href)).default;
  }
  try {
    return (await import("esbuild")).default;
  } catch {
    return null;
  }
}
const tmpDir = join(skillRoot, ".preview-tmp");
await mkdir(tmpDir, { recursive: true });

const chromium = await loadPlaywright();
const backend = String(args.backend ?? "webgl2");
const out = resolve(String(args.out ?? "zen-foil-shots"));
await mkdir(out, { recursive: true });

const server = await serve();
const origin = `http://127.0.0.1:${server.address().port}`;

const launchArgs = ["--ignore-gpu-blocklist", "--enable-unsafe-webgpu", "--enable-features=Vulkan", "--use-angle=swiftshader", "--use-webgpu-adapter=swiftshader"];
/* Any installed Chromium will do when the Playwright package and its browser
   build disagree (a common state): look in the usual browser caches. */
async function findChromium() {
  const { readdirSync } = await import("node:fs");
  const homes = [process.env.PLAYWRIGHT_BROWSERS_PATH, "/opt/pw-browsers", join(process.env.HOME ?? "", ".cache/ms-playwright")].filter(Boolean);
  for (const home of homes) {
    if (existsSync(join(home, "chromium"))) return join(home, "chromium");
    let dirs = [];
    try {
      dirs = readdirSync(home).filter((d) => /^chromium-\d+$/.test(d)).sort().reverse();
    } catch {
      continue;
    }
    for (const d of dirs) {
      for (const bin of ["chrome-linux/chrome", "chrome-linux64/chrome", "chrome-mac/Chromium.app/Contents/MacOS/Chromium", "chrome-win/chrome.exe"]) {
        if (existsSync(join(home, d, bin))) return join(home, d, bin);
      }
    }
  }
  return undefined;
}
let browser;
try {
  browser = await chromium.launch({ args: launchArgs, executablePath: process.env.ZEN_FOIL_CHROMIUM || undefined });
} catch (err) {
  const fallback = await findChromium();
  if (!fallback) throw err;
  browser = await chromium.launch({ args: launchArgs, executablePath: fallback });
}
const dpr = Number(args.dpr ?? 1.5);
const page = await browser.newPage({ viewport: { width: Number(args.vw ?? 1280), height: Number(args.vh ?? 900) }, deviceScaleFactor: dpr });
const logs = [];
page.on("console", (m) => {
  if ((m.type() === "error" || m.type() === "warning") && !/Failed to load resource|external Instance reference|WebGPU is experimental/.test(m.text())) logs.push(`[${m.type()}] ${m.text()}`);
});
page.on("pageerror", (e) => logs.push(`[pageerror] ${e.message}`));
page.on("response", (r) => {
  if (r.status() >= 400 && !r.url().endsWith("/favicon.ico")) logs.push(`[http ${r.status()}] ${r.url()}`);
});

let exitCode = 0;
try {
  if (args.url) {
    // "/path" opens a file served from the skill folder (e.g. a template page).
    const raw = String(args.url);
    const target = new URL(raw.startsWith("/") ? origin + raw : raw);
    if (backend !== "auto") target.searchParams.set("foil", backend);
    await page.goto(target.href, { waitUntil: "load" });
    if (args.full) {
      // Plates only render on screen: show the whole page at once.
      await page.waitForTimeout(500);
      const full = await page.evaluate(() => document.documentElement.scrollHeight);
      const vp = page.viewportSize();
      if (full > vp.height) await page.setViewportSize({ width: vp.width, height: Math.min(full, 12000) });
    }
    await page.waitForTimeout(Number(args.wait ?? 2500));
    const file = join(out, "page.png");
    await page.screenshot({ path: file, fullPage: !!args.full });
    console.log(`saved ${relative(process.cwd(), file)}`);
  } else {
    const q = new URLSearchParams();
    q.set("scenes", String(args.scenes ?? "kit"));
    q.set("t", String(args.t ?? 6));
    if (args.intro !== undefined) q.set("intro", String(args.intro));
    if (backend !== "auto") q.set("foil", backend);
    // Headless browsers can't present WebGPU canvases: read frames back instead.
    if (backend === "webgpu") q.set("foil-readback", "1");
    if (args.snap) q.set("snap", "1");
    q.set("timeout", String(args.timeout ?? 180000));
    for (const k of ["theme", "accent", "w", "h", "cols", "bg", "seed"]) if (args[k]) q.set(k, String(args[k]));
    for (const [k, v] of Object.entries(args)) if (k.startsWith("p.")) q.set(k, String(v));
    const modules = [];
    for (const m of String(args.module ?? "").split(",").filter(Boolean)) {
      const abs = resolve(m);
      if (/\.(ts|tsx|mts)$/.test(abs)) {
        // TypeScript scene modules: bundle with esbuild, pointing "zen-foil"
        // (or a vendored copy) at the lab's own bundle so they share one engine.
        const esbuild = await loadEsbuild();
        if (!esbuild) throw new Error(`${m}: bundling TypeScript needs esbuild (npm i -D esbuild)`);
        const name = `m${modules.length}-${Date.now()}.mjs`;
        await esbuild.build({
          entryPoints: [abs],
          bundle: true,
          format: "esm",
          outfile: join(tmpDir, name),
          logLevel: "silent",
          plugins: [{ name: "core", setup: (b) => b.onResolve({ filter: /(^zen-foil$|zen-foil(\.js)?$)/ }, () => ({ path: "/dist/zen-foil.js", external: true })) }],
        });
        modules.push(`/.preview-tmp/${name}`);
      } else {
        modules.push("/cwd/" + relative(process.cwd(), abs).split(sep).join("/"));
      }
    }
    if (modules.length) {
      // Load the caller's scene modules before the lab reads the registry.
      await page.addInitScript((mods) => {
        globalThis.__labModules = mods;
      }, modules);
    }
    if (args.validate) {
      // Compile-check in its own page with rendering off, so the checks
      // never compete with live plates for the device.
      const vq = new URLSearchParams(q);
      vq.set("foil", "off");
      vq.set("validate", "1");
      vq.delete("snap");
      await page.goto(`${origin}/lab.html?${vq}`, { waitUntil: "load" });
      await page.waitForFunction(() => globalThis.__lab?.validation, null, { timeout: 300000 });
      const validation = await page.evaluate(() => globalThis.__lab.validation);
      const bad = validation.filter((r) => r.lint.length || r.webgpu?.length || r.webgl2?.length);
      console.log(`validate: ${validation.length - bad.length}/${validation.length} programs clean (webgpu ${validation[0]?.webgpu === null ? "unavailable" : "checked"}, webgl2 ${validation[0]?.webgl2 === null ? "unavailable" : "checked"})`);
      for (const r of bad) {
        console.log(`  ✗ ${r.scene} [${r.post}]`);
        for (const m of r.lint) console.log(`      lint: ${m}`);
        for (const m of r.webgpu ?? []) console.log(`      webgpu: ${m}`);
        for (const m of r.webgl2 ?? []) console.log(`      webgl2: ${m}`);
      }
      if (bad.length) exitCode = 1;
    }
    await page.goto(`${origin}/lab.html?${q}`, { waitUntil: "load" });
    await page.waitForFunction(() => globalThis.__lab, null, { timeout: 60000 });
    // Plates only render on screen: grow the viewport to hold the whole sheet.
    const full = await page.evaluate(() => document.documentElement.scrollHeight);
    const vp = page.viewportSize();
    if (full > vp.height) await page.setViewportSize({ width: vp.width, height: Math.min(full + 40, 12000) });
    const result = await page.evaluate(() => globalThis.__lab.ready);
    console.log(`backend: ${result.backend}`);
    for (const s of result.states) console.log(`  ${s.state === "live" ? "✓" : "✗"} ${s.scene} ${s.state === "live" ? "" : s.state}`);
    if (result.states.some((s) => s.state !== "live")) exitCode = 1;
    // Let late arrivals (images, marks) land before the shot.
    await page.waitForTimeout(Number(args.wait ?? 900));
    if (args.each) {
      const ids = result.states.map((s) => s.scene);
      for (const id of ids) {
        const el = page.locator(`zen-foil[scene="${id}"]`).first();
        const file = join(out, `${id}${args.theme ? "-" + args.theme : ""}.png`);
        await el.screenshot({ path: file });
        console.log(`saved ${relative(process.cwd(), file)}`);
      }
    } else {
      const file = join(out, `${String(args.scenes ?? "kit").replace(/[^\w-]+/g, "_")}${args.theme ? "-" + args.theme : ""}-${result.backend}.png`);
      // Clip a page shot to the sheet: an element shot waits for the whole
      // sheet to hold still, which a tall page of live plates may never do.
      const box = await page.locator("main").boundingBox();
      await page.screenshot({ path: file, fullPage: true, ...(box ? { clip: box } : {}) });
      console.log(`saved ${relative(process.cwd(), file)}`);
    }
  }
} catch (err) {
  console.error(err);
  exitCode = 1;
}
if (logs.length) {
  console.log("browser console:");
  for (const l of logs.slice(0, 40)) console.log("  " + l);
}
await browser.close();
server.close();
const { rm } = await import("node:fs/promises");
await rm(tmpDir, { recursive: true, force: true });
process.exit(exitCode);
