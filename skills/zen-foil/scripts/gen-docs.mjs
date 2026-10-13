#!/usr/bin/env node
/**
 * Regenerates reference/scenes.md from the scene definitions, and
 * reference/shader-signatures.md from the shader library, so neither ever
 * drifts from the code: `node scripts/gen-docs.mjs`.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
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
    // Defaults that are ZEN AI Co.'s own copy, figures or marks (flagged
    // brand: true) are the ones another brand must set.
    const zenText = (spec) => (spec.type === "mark" && spec.default && spec.default !== "none") || /\b(ZEN|ZENAI|ARSENAL|PIONEER)\b/.test(spec.default ?? "");
    for (const [name, spec] of params) if (zenText(spec) && !spec.brand) console.warn(`gen-docs: ${s.id}.${name} has a ZEN default but no brand flag`);
    const branded = params.filter(([, spec]) => spec.brand || zenText(spec));
    if (branded.length)
      md += `**Other brands:** set ${branded.map(([name]) => `\`${name}\``).join(", ")}. ${branded.length === 1 ? "Its default belongs" : "Their defaults belong"} to ZEN AI Co.\n\n`;
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

/* ── The agent contract: manifest.json, llms.txt and the AGENTS.md scene table ──
   All three come from describe(), the same object ZenFoil.describe() returns
   in the browser, so what agents read is what the engine accepts. */
const release = JSON.parse(readFileSync(join(root, "release.json"), "utf8"));
const manifest = core.describe();
const showcaseIds = new Set(SHOWCASE.map((s) => s.id));
manifest.install = {
  script: `<script type="module" src="${release.cdn}"></script>`,
  cdn: release.cdn,
  showcase: release.showcase,
  commit: release.commit,
  vendored: "node skills/zen-foil/scripts/install.mjs <project-dir>",
  check: "node skills/zen-foil/scripts/verify.mjs <files or folders>",
  write: "node skills/zen-foil/scripts/replicate.mjs tag <scene> --<param> <value>",
};
for (const s of manifest.scenes) if (showcaseIds.has(s.id)) s.group = "showcase";
const ordered = { name: manifest.name, version: manifest.version, element: manifest.element, summary: manifest.summary, install: manifest.install, rules: manifest.rules, attributes: manifest.attributes, marks: manifest.marks, events: manifest.events, methods: manifest.methods, glyphs: manifest.glyphs, scenes: manifest.scenes };
writeFileSync(join(root, "manifest.json"), JSON.stringify(ordered, null, 2) + "\n");
console.log(`manifest.json: ${manifest.scenes.length} scenes`);

const kitM = manifest.scenes.filter((s) => s.group === "kit");
let table = "| Scene | Use it for | Template (fill every {{…}}, or delete that attribute) |\n|---|---|---|\n";
for (const s of kitM) table += `| \`${s.id}\` | ${esc(s.description)} | \`${esc(s.template.replace(/\n\s*/g, " "))}\` |\n`;
const agentsPath = join(root, "AGENTS.md");
if (existsSync(agentsPath)) {
  const a = readFileSync(agentsPath, "utf8");
  const start = "<!-- scenes:start (generated by scripts/gen-docs.mjs) -->";
  const end = "<!-- scenes:end -->";
  if (a.includes(start) && a.includes(end)) {
    writeFileSync(agentsPath, a.slice(0, a.indexOf(start) + start.length) + "\n" + table + a.slice(a.indexOf(end)));
    console.log("AGENTS.md: scene table");
  } else console.warn("gen-docs: AGENTS.md has no scenes markers");
}

let llms = `# zen-foil

> ${manifest.summary}

Version ${manifest.version}. Load once, then write tags:

\`\`\`html
${manifest.install.script}
${kitM[0].example}
\`\`\`

## Rules

${manifest.rules.map((r) => `- ${r}`).join("\n")}

## Scenes

${kitM.map((s) => `- \`${s.id}\`: ${s.description} Params: ${Object.keys(s.params).join(", ")}.`).join("\n")}
- Portfolio plates (load ${"`"}zen-foil-showcase.js${"`"} from the same place): ${SHOWCASE.map((s) => `\`${s.id}\``).join(", ")}.

## Element attributes

${Object.entries(manifest.attributes).map(([k, v]) => `- \`${k}\`: ${v.description}`).join("\n")}

## Files

- [AGENTS.md](AGENTS.md): the tiered brief for coding agents (start here)
- [manifest.json](manifest.json): every scene, param, type, range and default, with examples and templates
- [SKILL.md](SKILL.md): the full skill (install paths, workflow, quality bar)
- [reference/scenes.md](reference/scenes.md): the scene catalogue
- [reference/aesthetic.md](reference/aesthetic.md): how it should look
- [reference/authoring.md](reference/authoring.md): writing new scenes
`;
writeFileSync(join(root, "llms.txt"), llms);
console.log("llms.txt");
