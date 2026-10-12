#!/usr/bin/env node
/**
 * Regenerates reference/scenes.md from the scene definitions, and
 * reference/shader-signatures.md from the shader library, so neither ever
 * drifts from the code: `node scripts/gen-docs.mjs`.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const core = await import(pathToFileURL(join(root, "dist", "zen-foil.js")).href);
const { SHOWCASE } = await import(pathToFileURL(join(root, "dist", "zen-foil-showcase.js")).href);

const esc = (s) => String(s ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
const kit = core.KIT_IDS.map((id) => core.getScene(id));

function example(scene) {
  const attrs = Object.entries(scene.params ?? {})
    .filter(([, spec]) => spec.type === "text" && spec.default)
    .slice(0, 3)
    .map(([name, spec]) => `${name}="${spec.default.trim()}"`);
  const extra = { field: " fixed", vault: ' images="/a.jpg, /b.jpg, /c.jpg"', stage: ' images="/one.jpg, /two.jpg"', engrave: ' src="/photo.jpg"' }[scene.id] ?? "";
  return `<zen-foil scene="${scene.id}"${extra}${attrs.length ? " " + attrs.join(" ") : ""}></zen-foil>`;
}

let md = `# Scene catalogue

Generated from the scene definitions by \`scripts/gen-docs.mjs\`; don't edit it by hand.

All scenes take the element attributes \`accent\` (any CSS colour), \`theme\` (\`plate\` | \`paper\` | \`clear\`, for plate scenes), \`aria-label\`, \`seed\`, \`max-dpr\` and \`fixed\`. Params are plain attributes. Text params fit their column automatically, and every param updates live.

## Kit

`;
for (const s of kit) {
  md += `### \`${s.id}\` — ${s.title ?? s.id}\n\n${s.description ?? ""}\n\n`;
  md += `Default aspect ${Number(s.aspect ?? 1.6).toFixed(2).replace(/\.?0+$/, "")} · accent \`${s.accent ?? "#6fb8ff"}\` · output \`${s.post ?? "plate"}\`${(s.post ?? "plate") === "plate" ? " (themeable)" : ""}\n\n`;
  md += "```html\n" + example(s) + "\n```\n\n";
  const params = Object.entries(s.params ?? {});
  if (params.length) {
    md += "| Param | Type | Default | Notes |\n|---|---|---|---|\n";
    for (const [name, spec] of params) {
      const type = spec.type === "choice" ? (spec.options ?? []).join(" / ") : spec.type;
      const range = spec.min !== undefined || spec.max !== undefined ? ` (${spec.min ?? "…"}–${spec.max ?? "…"})` : "";
      const def = spec.default === undefined || spec.default === "" ? "—" : `\`${esc(spec.default.length > 60 ? spec.default.slice(0, 57) + "…" : spec.default)}\``;
      md += `| \`${name}\` | ${esc(type)}${range} | ${def} | ${esc(spec.description)} |\n`;
    }
    md += "\n";
    // Defaults are ZEN AI Co. copy and marks: name the ones another brand must set.
    const branded = params.filter(([, spec]) => (spec.type === "mark" && spec.default && spec.default !== "none") || /\b(ZEN|ZENAI|ARSENAL|PIONEER)\b/.test(spec.default ?? ""));
    if (branded.length) {
      const marks = branded.filter(([, spec]) => spec.type === "mark").length;
      const what = marks === branded.length ? "the ZEN mark" : marks ? "ZEN AI Co. text and the ZEN mark" : "ZEN AI Co. text";
      md += `**Other brands:** set ${branded.map(([name]) => `\`${name}\``).join(", ")}. ${branded.length === 1 ? "Its default is" : "Their defaults are"} ${what}.\n\n`;
    }
  }
}

md += `## Portfolio plates (\`dist/zen-foil-showcase.js\`)

These are the twenty plates from the alexleschik.com project cards. Load the showcase bundle after \`zen-foil.js\`, from the same place, and use them by id. They take no params (their text is part of the design), but \`accent\` and \`theme\` still apply. Read their source in \`src/scenes/showcase/\` for worked examples of the style.

| Scene | Project | What it shows |
|---|---|---|
`;
for (const s of SHOWCASE) md += `| \`${s.id}\` | ${esc(s.title)} | ${esc(s.description)} |\n`;

writeFileSync(join(root, "reference", "scenes.md"), md);
console.log(`reference/scenes.md: ${kit.length} kit scenes, ${SHOWCASE.length} portfolio plates`);

/* Exact signatures, read from the shader library source (the bundle ships
   it without comments): section banners ("── Name ──") start a table, and
   a comment directly above a fn is its note. */
const libSrc = readFileSync(join(root, "src", "library.ts"), "utf8");
const libAt = libSrc.indexOf("export const LIBRARY = /* wgsl */ `");
if (libAt < 0) throw new Error("gen-docs: LIBRARY not found in src/library.ts");
const library = libSrc
  .slice(libSrc.indexOf("`", libAt) + 1, libSrc.indexOf("\n`;", libAt))
  .replace(/\\`/g, "`")
  .replace(/\\\\/g, "\\");
const token = /\/\*\s*──\s*(.+?)\s*──[\s\S]*?\*\/|(?:\/\*((?:[^*]|\*(?!\/))*)\*\/\n)?fn (\w+)\(([^)]*)\) -> (\S+) \{/g;
const sections = new Map([["Math, noise, distance fields, strokes, engraving, foil", []]]);
let section = sections.keys().next().value;
let fnCount = 0;
for (const m of library.matchAll(token)) {
  if (m[1]) {
    section = m[1];
    if (!sections.has(section)) sections.set(section, []);
    continue;
  }
  sections.get(section).push({ name: m[3], args: m[4], ret: m[5], note: (m[2] ?? "").replace(/\s+/g, " ").trim() });
  fnCount++;
}
let sig = `# Shader library signatures

Generated from the library source by \`scripts/gen-docs.mjs\`; don't edit it by hand. \`shader-library.md\` explains how to use these functions. The argument types are exact: where a signature says \`i32\`, pass an integer (\`rosette(…, 3, …)\`, not \`3.0\`), and where it says \`f32\`, pass a float literal (\`1.0\`, not \`1\`).

`;
for (const [name, fns] of sections) {
  if (!fns.length) continue;
  sig += `## ${name}\n\n| Signature | Returns | Notes |\n|---|---|---|\n`;
  for (const f of fns) sig += `| \`${f.name}(${f.args})\` | \`${f.ret}\` | ${esc(f.note)} |\n`;
  sig += "\n";
}
writeFileSync(join(root, "reference", "shader-signatures.md"), sig);
console.log(`reference/shader-signatures.md: ${fnCount} library functions`);
