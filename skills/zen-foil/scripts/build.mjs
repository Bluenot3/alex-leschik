#!/usr/bin/env node
/**
 * Builds dist/zen-foil.js (engine + kit + <zen-foil>) and
 * dist/zen-foil-showcase.js (the twenty portfolio plates, importing
 * ./zen-foil.js so both share one engine). Needs esbuild (any Vite project
 * has it): `node scripts/build.mjs`.
 */
import { build } from "esbuild";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const { version } = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const banner = `/* eslint-disable */\n/*! zen-foil ${version} — engraved-hologram GPU plates (WebGPU + WebGL2). DM Mono subset: SIL OFL 1.1. */`;

/* Shader sources ship without comments or indentation: they are most of
   the bundle, and the browser only needs the code. (Your own scenes are
   untouched, so their compile errors keep their line numbers.) */
function minifyShader(code) {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n`]*/g, "")
    .split("\n")
    .map((l) => l.trim().replace(/[ \t]+/g, " "))
    .filter(Boolean)
    .join("\n");
}
const shaderMinify = {
  name: "shader-minify",
  setup(b) {
    b.onLoad({ filter: /[\\/]src[\\/].*\.ts$/ }, async (args) => {
      const { readFile } = await import("node:fs/promises");
      const src = await readFile(args.path, "utf8");
      const out = src.replace(/\/\* (wgsl|glsl) \*\/ `([^`]*)`/g, (_m, tag, body) => {
        // Leave ${…} interpolations intact; minify the text between them.
        const parts = body.split(/(\$\{[^}]*\})/);
        const min = parts.map((part) => (part.startsWith("${") ? part : tag === "wgsl" ? minifyShader(part) : part)).join("");
        return `/* ${tag} */ \`${min}\``;
      });
      return { contents: out, loader: "ts" };
    });
  },
};

const shared = {
  bundle: true,
  format: "esm",
  target: "es2020",
  minify: true,
  legalComments: "none",
  banner: { js: banner },
  logLevel: "info",
};

await build({ ...shared, entryPoints: [join(root, "src/index.ts")], outfile: join(root, "dist/zen-foil.js"), plugins: [shaderMinify] });
await build({
  ...shared,
  entryPoints: [join(root, "src/showcase.ts")],
  outfile: join(root, "dist/zen-foil-showcase.js"),
  plugins: [
    shaderMinify,
    {
      name: "core-external",
      setup(b) {
        b.onResolve({ filter: /^zen-foil$/ }, () => ({ path: "./zen-foil.js", external: true }));
      },
    },
  ],
});
