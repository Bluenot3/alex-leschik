#!/usr/bin/env node
/**
 * Vendors zen-foil into a project: the bundle, its types and license, and —
 * for React projects — a typed <ZenFoil> wrapper plus JSX typings.
 *
 *   node <skill>/scripts/install.mjs [project-dir] [--dir src/vendor/zen-foil] [--showcase] [--no-react] [--force]
 *
 * Nothing is installed from the network; the files come from this skill.
 * Re-run to upgrade (existing files are replaced only with --force, except
 * the bundle itself, which is always refreshed).
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const skillRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : undefined;
};
const project = resolve(args.find((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1].startsWith("--dir"))) ?? ".");
const force = args.includes("--force");

if (!existsSync(join(skillRoot, "dist", "zen-foil.js"))) {
  console.error("dist/zen-foil.js is missing — run node scripts/build.mjs in the skill first");
  process.exit(2);
}

let pkg = {};
try {
  pkg = JSON.parse(readFileSync(join(project, "package.json"), "utf8"));
} catch {
  /* plain site without package.json */
}
const deps = { ...pkg.dependencies, ...pkg.devDependencies };
const has = (name) => Object.prototype.hasOwnProperty.call(deps, name);
const react = has("react") && !args.includes("--no-react");
const ts = existsSync(join(project, "tsconfig.json"));
const next = has("next");
const srcDir = existsSync(join(project, "src")) ? join(project, "src") : project;
const vendorDir = resolve(project, flag("dir") ?? relative(project, join(srcDir, "vendor", "zen-foil")));

mkdirSync(vendorDir, { recursive: true });
const copied = [];
const put = (from, to, always = false) => {
  if (existsSync(to) && !force && !always) return;
  copyFileSync(from, to);
  copied.push(relative(project, to));
};
put(join(skillRoot, "dist", "zen-foil.js"), join(vendorDir, "zen-foil.js"), true);
put(join(skillRoot, "dist", "zen-foil.d.ts"), join(vendorDir, "zen-foil.d.ts"), true);
put(join(skillRoot, "LICENSES", "DMMono-OFL.txt"), join(vendorDir, "DMMono-OFL.txt"), true);
if (args.includes("--showcase")) put(join(skillRoot, "dist", "zen-foil-showcase.js"), join(vendorDir, "zen-foil-showcase.js"), true);

let wrapperPath = null;
if (react) {
  const compDir = existsSync(join(srcDir, "components")) ? join(srcDir, "components") : join(srcDir, "components");
  mkdirSync(compDir, { recursive: true });
  wrapperPath = join(compDir, ts ? "ZenFoil.tsx" : "ZenFoil.jsx");
  // Import path from the wrapper to the vendored bundle, POSIX-style.
  let rel = relative(compDir, join(vendorDir, "zen-foil.js")).split(sep).join("/");
  if (!rel.startsWith(".")) rel = `./${rel}`;
  let src = readFileSync(join(skillRoot, "templates", "react", "ZenFoil.tsx"), "utf8").replaceAll("ZEN_FOIL_IMPORT", rel);
  if (!next) src = src.replace('"use client";\n', "");
  if (!ts) {
    // Plain JSX: drop the type-only parts.
    src = src
      .replace(/import type \{ ZenFoilElement \} from "[^"]+";\n/, "")
      .replace(/, type CSSProperties, type ReactNode/, "")
      .replace(/export interface ZenFoilProps \{[\s\S]*?\n\}\n\n/, "")
      .replace(/\}: ZenFoilProps\)/, "})")
      .replace(/useRef<ZenFoilElement>\(null\)/, "useRef(null)")
      .replace(/const attrs: Record<string, string> = \{\};/, "const attrs = {};")
      .replace(/\(e as CustomEvent<\{ backend: string \}>\)/g, "e")
      .replace(/\(e as CustomEvent<\{ reason: string \}>\)/g, "e")
      .replace(/\(e: Event\)/g, "(e)");
  }
  if (!existsSync(wrapperPath) || force) {
    writeFileSync(wrapperPath, src);
    copied.push(relative(project, wrapperPath));
  }
  if (ts) put(join(skillRoot, "templates", "react", "zen-foil-jsx.d.ts"), join(vendorDir, "zen-foil-jsx.d.ts"), true);
}

const importPath = (() => {
  const r = relative(srcDir, join(vendorDir, "zen-foil.js")).split(sep).join("/");
  return srcDir === project ? `./${r}` : `@/${r}`;
})();

console.log(`zen-foil installed in ${relative(process.cwd(), vendorDir) || "."}
  ${copied.join("\n  ")}
`);
if (react) {
  console.log(`React usage:
  import ZenFoil from "${wrapperPath ? "@/" + relative(srcDir, wrapperPath).split(sep).join("/").replace(/\.(t|j)sx$/, "") : "./components/ZenFoil"}";
  <ZenFoil scene="seal" accent="#7cc4ff" params={{ headline: "YOUR BRAND", mark: "/logo.svg" }} className="w-full rounded-2xl" />
${ts ? `\n  (JSX typings: ${relative(project, join(vendorDir, "zen-foil-jsx.d.ts"))} — make sure tsconfig "include" covers it.)\n` : ""}`);
} else {
  console.log(`Usage:
  import "${importPath}";              // once, client-side
  <zen-foil scene="seal" headline="YOUR BRAND" accent="#7cc4ff"></zen-foil>
`);
}
console.log(`Your own scenes: node ${relative(process.cwd(), join(skillRoot, "scripts", "new-scene.mjs"))} my-scene --out ${relative(process.cwd(), join(srcDir, "scenes")) || "scenes"} --import "${importPath.replace(/\.js$/, ".js")}"`);
