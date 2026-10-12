#!/usr/bin/env node
/**
 * Scaffolds a new scene from templates/scene-template.ts.
 *
 *   node scripts/new-scene.mjs my-scene [--out src/scenes] [--title "My scene"] [--import "@/vendor/zen-foil/zen-foil.js"] [--js]
 *
 * --import sets where the file imports defineScene from (default "zen-foil";
 * use your vendored path, or --js for a plain-JS file that uses
 * window.ZenFoil.defineScene, for pages that load the bundle from a CDN).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const skillRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const id = args.find((a) => !a.startsWith("--"));
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : fallback;
};
if (!id || !/^[a-z0-9][\w-]*$/i.test(id)) {
  console.log("usage: node scripts/new-scene.mjs <scene-id> [--out dir] [--title text] [--import path] [--js]");
  process.exit(2);
}
const js = args.includes("--js");
const outDir = resolve(flag("out", "."));
const title = flag("title", id.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()));
const from = flag("import", "zen-foil");

let src = readFileSync(join(skillRoot, "templates", "scene-template.ts"), "utf8")
  .replaceAll("SCENE_ID", id)
  .replaceAll("SCENE_TITLE", title)
  .replace('import { defineScene } from "zen-foil"; // or the path of your vendored copy, e.g. "@/vendor/zen-foil/zen-foil.js"', `import { defineScene } from "${from}";`);
if (js) {
  src = src
    .replace(`import { defineScene } from "${from}";\n`, "/* Uses the global API the zen-foil bundle installs (load it first). */\nconst { defineScene } = window.ZenFoil;\n")
    .replace("export default defineScene(", "defineScene(");
}
mkdirSync(outDir, { recursive: true });
const file = join(outDir, `${id}.${js ? "js" : "ts"}`);
if (existsSync(file)) {
  console.error(`${file} exists — not overwriting`);
  process.exit(1);
}
writeFileSync(file, src);
console.log(`created ${file}
next:
  1. import it once before the plate mounts (e.g. in main.tsx / layout):  import "./${id}";
  2. use it:  <zen-foil scene="${id}"></zen-foil>
  3. check:   node ${join(skillRoot, "scripts", "check.mjs")} ${file}
  4. look:    node ${join(skillRoot, "scripts", "preview.mjs")} --scenes ${id} --module <compiled .js> --validate`);
