#!/usr/bin/env node
/**
 * Static checks for zen-foil scenes — no browser needed.
 *
 *   node scripts/check.mjs path/to/my-scene.ts [more files…]
 *   node scripts/check.mjs --all          (every built-in scene)
 *
 * Loads each module (TypeScript is bundled on the fly with esbuild, which
 * any Vite/Next project already has), collects the scenes it defines and
 * reports portability problems: untranslatable syntax, reserved names,
 * float %, ternaries, smoothstep, params without slots, text the glyph
 * atlas can't print, and text that overflows the data block. Exit code 1
 * on any problem. Compile errors need a GPU: run scripts/preview.mjs
 * --validate for those.
 */
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const skillRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(skillRoot, "dist", "zen-foil.js");
if (!existsSync(dist)) {
  console.error(`missing ${dist} — run node scripts/build.mjs first`);
  process.exit(2);
}

const files = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const all = process.argv.includes("--all");
if (!files.length && !all) {
  console.log("usage: node scripts/check.mjs <scene file…> | --all");
  process.exit(2);
}

// defineScene() pushes every scene it registers into this list.
globalThis.ZEN_FOIL_COLLECT = [];
const core = await import(pathToFileURL(dist).href);
const firstOwn = all ? 0 : globalThis.ZEN_FOIL_COLLECT.length;

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

const tmp = mkdtempSync(join(tmpdir(), "zen-foil-check-"));
let loadErrors = 0;
try {
  if (all) await import(pathToFileURL(join(skillRoot, "dist", "zen-foil-showcase.js")).href);
  for (const f of files) {
    try {
      const abs = resolve(f);
      const ext = extname(abs);
      if (ext === ".js" || ext === ".mjs") {
        await import(pathToFileURL(abs).href);
        continue;
      }
      const esbuild = await loadEsbuild();
      if (!esbuild) {
        console.error(`${f}: TypeScript needs esbuild (npm i -D esbuild), or pass the compiled .js`);
        process.exit(2);
      }
      // Bundle the scene with "zen-foil" (or a vendored copy) pointing at this
      // skill's dist, so its defineScene() calls land in the collector.
      const out = join(tmp, `${Math.random().toString(36).slice(2)}.mjs`);
      await esbuild.build({
        entryPoints: [abs],
        bundle: true,
        format: "esm",
        platform: "neutral",
        outfile: out,
        logLevel: "silent",
        plugins: [
          {
            name: "zen-foil-core",
            setup(b) {
              b.onResolve({ filter: /(^zen-foil$|zen-foil(\.js)?$)/ }, () => ({ path: pathToFileURL(dist).href, external: true }));
            },
          },
        ],
      });
      await import(pathToFileURL(out).href);
    } catch (err) {
      // defineScene() throws on a bad param spec; esbuild throws on syntax errors.
      loadErrors++;
      console.log(`✗ ${f}`);
      console.log(`    ${err instanceof Error ? err.message : String(err)}`);
    }
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

const byId = new Map();
for (const s of globalThis.ZEN_FOIL_COLLECT.slice(firstOwn)) byId.set(s.id, s);
const scenes = [...byId.values()];
const dot = core.glyphCode("·");

let problems = 0;
for (const scene of scenes) {
  const out = [...core.lintWgsl(scene.code, scene.id)];
  const params = core.resolveParams(scene, {});
  try {
    core.buildData(scene, params);
  } catch (err) {
    out.push(`data() threw: ${err instanceof Error ? err.message : String(err)}`);
  }
  const entries = Object.entries(scene.params ?? {});
  const textParams = entries.filter(([, s]) => s.type === "text");
  const numParams = entries.filter(([, s]) => s.num !== undefined);
  if (/\b(textRunP|textCenterP|textLoopP|ringTextP|textDecodeP|textRunPT|textDecodePT|strParam|textWidthP|textFitP|textLenP)\(/.test(scene.code) && !textParams.length)
    out.push("the shader reads text params but the scene declares none");
  if (/\bnumParam\(/.test(scene.code) && !numParams.length) out.push("the shader reads numParam() but no param declares a num slot");
  const slots = textParams.map(([, s]) => s.slot);
  if (new Set(slots).size !== slots.length) out.push("two text params share a slot");
  const nums = numParams.flatMap(([, s]) => (s.type === "color" ? [s.num, s.num + 1, s.num + 2] : [s.num]));
  if (new Set(nums).size !== nums.length) out.push("two params share a num slot");
  const chars = textParams.reduce((n, [name]) => n + Array.from(params[name] ?? "").length, 0);
  if (chars > 288) out.push(`default text params total ${chars} characters (288 fit)`);
  for (const [name] of textParams) {
    const odd = [...new Set(Array.from(params[name] ?? "").filter((ch) => ch !== "·" && core.glyphCode(ch) === dot))];
    if (odd.length) out.push(`${name}: ${odd.join(" ")} not in the glyph atlas (prints as ·)`);
  }
  if (/\b(textRun|textLoop|ringText|charAt)\(/.test(scene.code) && !scene.data && !textParams.length)
    out.push("draws text from u.d but has no data() to write it (use text params or layoutText)");
  if (out.length) {
    problems += out.length;
    console.log(`✗ ${scene.id}`);
    for (const m of out) console.log(`    ${m}`);
  } else {
    console.log(`✓ ${scene.id}`);
  }
}
problems += loadErrors;
if (!scenes.length && !loadErrors) console.log("no scenes found — does the file call defineScene()?");
console.log(problems ? `${problems} problem(s)` : `${scenes.length} scene(s) clean`);
process.exit(problems ? 1 : 0);
