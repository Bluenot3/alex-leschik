#!/usr/bin/env node
/**
 * Writes the whole skill as one self-contained markdown file, for agents
 * that take a single document: Lovable workspace skills, Cursor rules, an
 * AGENTS.md section, a custom GPT. Plates load from jsDelivr pinned to a
 * commit, so pass a pushed commit whose dist/zen-foil.js is the build you
 * want:
 *
 *   node scripts/single-file.mjs --sha <commit> [--out zen-foil.single.md] [--repo owner/name]
 *
 * Code and reference sections are read from the templates and docs, so the
 * file never drifts from the skill.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const git = (...a) => execFileSync("git", a, { cwd: root, maxBuffer: 1 << 26 });

let sha = opt("sha");
const repo = opt("repo") ?? "Bluenot3/alex-leschik";
if (!sha || !/^[0-9a-f]{7,40}$/i.test(sha)) {
  console.error("usage: node scripts/single-file.mjs --sha <commit> [--out file.md] [--repo owner/name]");
  process.exit(2);
}
const out = resolve(opt("out") ?? "zen-foil.single.md");

// The file documents this tree but loads the build at <sha>: they must match.
try {
  sha = git("rev-parse", `${sha}^{commit}`).toString().trim();
  const top = git("rev-parse", "--show-toplevel").toString().trim();
  const rel = relative(top, join(root, "dist", "zen-foil.js")).split(sep).join("/");
  if (!git("show", `${sha}:${rel}`).equals(readFileSync(join(root, "dist", "zen-foil.js"))))
    console.warn(`warning: dist/zen-foil.js at ${sha.slice(0, 7)} differs from this tree's build. Commit and push the build, then pass that commit.`);
} catch {
  console.warn(`warning: couldn't check ${sha} against git. Make sure it is a pushed commit that contains this build.`);
}

const cdn = `https://cdn.jsdelivr.net/gh/${repo}@${sha}/skills/zen-foil/dist`;
const read = (p) => readFileSync(join(root, p), "utf8").replace(/\r\n/g, "\n").trimEnd();
/** Drops the H1 (and anything before the first ## when `from` is given) and demotes headings. */
function section(md, { from, until, by = 1 } = {}) {
  let s = md.replace(/^# .*\n+/, "");
  if (from) s = s.slice(s.indexOf(from));
  if (until && s.includes(until)) s = s.slice(0, s.indexOf(until));
  return s.trimEnd().replace(/^(#{1,5}) /gm, (_m, h) => `${"#".repeat(Math.min(h.length + by, 6))} `);
}
function swap(md, pairs) {
  for (const [a, b] of pairs) {
    if (!md.includes(a)) console.warn(`warning: expected text not found, left as is: ${a.slice(0, 60)}…`);
    md = md.split(a).join(b);
  }
  return md;
}

const jsx = read("templates/react/zen-foil-jsx.d.ts");
const wrapper = read("templates/react/ZenFoil.cdn.tsx");
const countdown = read("templates/examples/countdown.ts")
  .replace(/^\/\*\*[\s\S]*?\*\/\n/, "")
  .replace('import { defineScene } from "zen-foil";\n\n', "")
  .replace("export default defineScene({", 'customElements.whenDefined("zen-foil").then(() => window.ZenFoil?.defineScene({')
  .replace(/\n\}\);$/, "\n}));");

const scenes = section(read("reference/scenes.md"), { from: "All scenes take" })
  .replace(/^Generated from .*\n+/m, "")
  .replace("Load the showcase bundle after `zen-foil.js`, from the same place, and use them by id.", "Add the showcase script (section 1) and use them by id.")
  .replace("Read their source in `src/scenes/showcase/` for worked examples of the style.", "Their source, in the skill repo under `skills/zen-foil/src/scenes/showcase/`, is the best set of worked examples of the style.");
const aesthetic = section(read("reference/aesthetic.md"));
const authoring = section(read("reference/authoring.md"), { from: "## Coordinates", until: "## Workflow", by: 2 });
const portable = swap(section(read("reference/portable-wgsl.md"), { by: 2 }), [
  [
    "`scripts/check.mjs` and `lintWgsl()` enforce most of them, and `scripts/preview.mjs --validate` compiles on both backends for the rest.",
    '`ZenFoil.lint(code)` catches most of them, and `await ZenFoil.validate(["my-scene"])` compiles on both backends for the rest.',
  ],
]);
const library = swap(section(read("reference/shader-library.md"), { by: 2 }), [
  ["`scripts/check.mjs` and `lintWgsl` catch it.", "`ZenFoil.lint(code)` catches it."],
  ["The exact argument and return types of all of them are in `shader-signatures.md`, generated from the source", "The exact argument and return types of all of them are in the next section"],
]);
const signatures = section(read("reference/shader-signatures.md"), { by: 2 }).replace(/^Generated from the library source by .*?don't edit it by hand\. /m, "");

const doc = `---
name: zen-foil
description: Drop-in engraved-hologram GPU graphics in the alexleschik.com / ZEN AI Co. style, loaded from one CDN script as <zen-foil> elements with no engine code to copy. Banknote guilloche, intaglio line engraving, microprint, holographic foil and security seals, live on WebGPU with a WebGL2 fallback. Use for hero emblems, project and portfolio cards, certificates and credentials, KPI plates, globes, U.S. reach maps, AI agent-network diagrams, engraved photos, image galleries, a crystal-cube showcase and Treasury / hologram / security-print page backgrounds, and for writing new scenes in the same style. Prefer it to copying engine source unless the task is changing the engine itself.
---

# zen-foil

\`zen-foil\` puts the engraved-hologram plates from the alexleschik.com project cards into any page. One script registers a \`<zen-foil>\` element and eleven configurable scenes, and twenty finished portfolio plates are one more script away. Every plate is a live GPU drawing on WebGPU, or WebGL2 where WebGPU is missing, sharing one device with every other plate on the page. DPR caps, adaptive resolution, off-screen culling, reduced-motion stills, CSS posters without a GPU, and device-loss recovery are built in. Don't wrap plates in your own canvas or animation loop.

This file pins build \`${sha.slice(0, 7)}\` of the skill at github.com/${repo} (\`skills/zen-foil\`).

## 1. Set up once per project

1. **Load the bundle.** In \`index.html\`, add this before \`</head>\`, above the \`src/main.tsx\` script:

   \`\`\`html
   <script type="module" src="${cdn}/zen-foil.js"></script>
   \`\`\`

   - Use this exact URL everywhere. A second URL makes a second engine.
   - For the twenty portfolio plates (section 3), add \`<script type="module" src="${cdn}/zen-foil-showcase.js"></script>\` after it. It loads \`zen-foil.js\` from beside itself, so both share one engine.
   - A project without \`index.html\` (TanStack Start, Next.js and other frameworks that render the document): put the same tag in the root document's \`<head>\` with the framework's head API. For Next.js, also make \`"use client"\` the first line of the wrapper below.
2. **Types.** Create \`src/zen-foil.d.ts\`. It types \`<zen-foil>\` for React 18 and 19, and \`window.ZenFoil\`:

   \`\`\`ts
${indent(jsx, 3)}
   \`\`\`
3. **Wrapper.** Create \`src/components/ZenFoil.tsx\`:

   \`\`\`tsx
${indent(wrapper, 3)}
   \`\`\`
4. **Check the preview.** Plates fade in over their CSS posters, and the console shows no \`[zen-foil]\` errors. Add \`?foil=webgl2\` to the preview URL to test the fallback, \`?foil=off\` to see the no-GPU posters, and \`?foil-debug\` for lint warnings and \`window.__zenFoil\` diagnostics.

## 2. Use it

\`\`\`tsx
import ZenFoil from "@/components/ZenFoil";

export function Examples() {
  return (
    <>
      {/* Hero emblem (one per viewport), beside a real <h1> in the DOM */}
      <ZenFoil scene="seal" accent="hsl(var(--primary))" label="Acme Labs seal" className="w-full rounded-2xl"
               params={{ headline: "ACME LABS", subline: "INSTRUMENTS · RESEARCH", eyebrow: "ISSUER", serial: "AL-",
                         caption: "ACMELABS.EXAMPLE", micro: "ACME LABS · INSTRUMENTS · RESEARCH · ", mark: "none" }} />

      {/* Page background: fixed behind everything, low density */}
      <ZenFoil scene="field" fixed maxDpr={1.25} params={{ variant: "dark", density: 0.2, phrases: "ACME LABS, MEASURE TWICE, ACMELABS.EXAMPLE" }} />

      {/* Card visual */}
      <ZenFoil scene="network" accent="#67e8f9" className="rounded-xl"
               params={{ headline: "AGENT LAB", subline: "ORCHESTRATION", nodes: "PLANNER, RESEARCH, CODER, REVIEW", status: "4 AGENTS",
                         micro: "ACME LABS · AGENT LAB · ", mark: "none" }} />

      {/* Credential on a light page: real recipient and ID only */}
      <ZenFoil scene="certificate" theme="paper" label="Certificate of completion"
               params={{ headline: "CERTIFICATE OF COMPLETION", recipient: "RECIPIENT NAME", program: "COMPLETED THE FOUNDATIONS TRACK",
                         date: "MMXXVI", serial: "REAL-CREDENTIAL-ID", issuer: "ACME LABS", micro: "ACME LABS · VERIFIED CREDENTIAL · ", mark: "none" }} />

      {/* Divider band. Children render on top of the plate */}
      <ZenFoil scene="banner" className="aspect-[6/1]"
               params={{ headline: "PROGRAMS", subline: "RESEARCH · EDUCATION", micro: "ACME LABS · PROGRAMS · ", mark: "none" }}>
        <a href="#programs" className="absolute bottom-3 right-4 text-xs text-muted-foreground">See all programs</a>
      </ZenFoil>
    </>
  );
}
\`\`\`

- **\`params\`** are the scene's attributes (section 3). Changing one updates the plate live, without recompiling. \`true\` sets a bare attribute, and \`false\` removes it.
- **\`label\`** sets the accessible name (\`aria-label\`, \`role="img"\`). Without it the plate is decorative and hidden from screen readers. Keep the real headings and copy in the DOM either way.
- **Size and shape:** the element is \`display: block\` and fills its container's width. Its height comes from the scene's aspect ratio unless CSS sets \`height\` or \`aspect-ratio\`. \`border-radius\` rounds the plate.
- **\`accent\`** takes any CSS colour, including theme tokens: \`hsl(var(--primary))\` where the token holds HSL numbers (shadcn on Tailwind 3), or \`var(--primary)\` where it holds a whole colour (Tailwind 4). **\`theme\`** is \`plate\` (dark, the default), \`paper\` (light security paper, for light pages and printables) or \`clear\` (ink only, over your own dark background or photo).
- **\`onLive(backend)\`** fires on the first frame. **\`onFail(reason)\`** fires when there is no GPU or a scene fails, and the poster stays.
- **The raw element in JSX:** write \`class\`, not \`className\`. React 18 renders \`className\` on a custom element as a dead \`classname\` attribute. The wrapper handles this for you.
- **Images and marks by URL** must be same-origin (put them in \`public/\`) or served with CORS. Public Supabase Storage URLs work.
- **Brand marks:** \`mark\` takes \`zen\`, \`bgc\` or \`near\` (ZEN AI Co. work only), SVG path data (Simple Icons' 24×24 paths work as-is), inline \`<svg>\` markup, an image URL, or \`none\`. To reuse one, call \`window.ZenFoil?.registerMark("acme", source)\` once, then use \`mark: "acme"\`.

## 3. Scenes

${scenes}

## 4. The aesthetic

Follow this. It is what makes plates look issued rather than decorated.

${aesthetic}

## 5. Content rules

- **ZEN AI Co. assets are for ZEN AI Co. work only.** That covers the \`zen\`, \`bgc\` and \`near\` marks and ZEN copy. The kit's defaults carry ZEN text and the ZEN mark, so on any other brand, set every param on the scene's **Other brands** line in section 3.
- **Never invent statistics, partners, dates or credentials.** Use the client's real figures, or leave the param empty, or choose another scene. Certificates carry the real recipient and credential ID: \`RECIPIENT NAME\` and \`ZEN-AIL-2026-00000\` are placeholders.
- **Engraved text is uppercase, short and true.** The glyph atlas prints ASCII and \`·•→←±×÷≈≡∞△◇◈✦αλΣΩπ∇∂\`. Accents fold to their base letter, and anything else prints as \`·\`.

## 6. Custom scenes

Write one only when no kit scene fits. A scene is one WGSL function plus optional JavaScript. The engine adds the shared library (section 6.4), the theme pass, uniforms and entry points. It compiles natively on WebGPU and translates to GLSL for WebGL2.

### 6.1 Register it

Put each scene in a client-side module that \`src/main.tsx\` imports once, for example \`import "./scenes/countdown";\`. \`whenDefined\` waits for the bundle whichever script runs first, and \`?.\` keeps the app running if the CDN is unreachable. A plate that names a scene before it is defined mounts as soon as it is.

\`\`\`ts
// src/scenes/countdown.ts — a behavior writes the time left into u.p0 every frame; the shader engraves the digits.
${countdown}
\`\`\`

Use it as \`<ZenFoil scene="countdown" params={{ target: "2030-01-01T00:00:00Z", label: "LAUNCH IN" }} />\`.

The fields are:
- \`id\`;
- \`code\`, which must define \`fn scene(uv: vec2f, p: vec2f) -> vec3f\`;
- optional \`title\`, \`description\`, \`aspect\`, \`accent\`, \`still\` (the reduced-motion time) and \`post\` (\`plate\`, \`raw\` or \`alpha\`);
- optional \`params\`, \`data(d, params)\`, \`layers(params, box)\` and \`behavior(ctx)\`.

The helpers mentioned below (\`layoutText\`, \`packText\`, \`packPoints\`, \`parsePoints\`, \`loadImage\`, \`drawContain\`, \`SCENE_DATA_BASE\`…) live on \`window.ZenFoil\`. Inside a \`whenDefined\` callback, read them as \`const ZF = window.ZenFoil; if (!ZF) return;\`.

### 6.2 The contract

${authoring}

### 6.3 Portable WGSL

${portable}

### 6.4 Shader library

${library}

### 6.5 Exact signatures

${signatures}

### 6.6 Check it before you hand off

There is no CLI here, so check in the preview:
1. **Compile it on both backends.** Open the preview with \`?foil=off\`, so the plates stay posters and the check has the GPU to itself. Then run \`await window.ZenFoil.validate(["my-scene"])\` in the console. In every result, \`lint\`, \`webgpu\` and \`webgl2\` must be empty lists (\`null\` means that backend isn't available in this browser). Errors read \`scene line N\`, counted from the first line of \`code\`.
2. **Look at it** at a phone width (390 px), card size (~600 px) and hero size (1440 px). Check it in \`paper\` if the site is light, with \`?foil=webgl2\`, and with reduced motion emulated in DevTools.
3. **Compare it with a kit scene** side by side. It should look like the same hand made it.

## 7. Performance and accessibility

- **One device and one draw per visible plate per frame.** Off-screen plates cost nothing, and hidden tabs stop the loop.
- **Keep about 8 plates visible at once, at most.** Use \`maxDpr={1.25}\` on a \`fixed\` field.
- **Reduced motion** shows one still per plate and redraws only on input.
- **Without a GPU,** the CSS poster stays. Pages must read fine that way.
- **Plates are \`aria-hidden\` unless they have a \`label\`.** Real text belongs in the DOM.

## 8. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Blank area | The element has no width, or the \`scene\` id isn't registered (see the console). |
| Poster never turns live | No GPU, or the scene failed to compile: the console shows \`[zen-foil] scene "x" failed to compile\` with \`scene line N\`. |
| Tailwind classes ignored | The raw \`<zen-foil>\` was given \`className\` under React 18. Use the wrapper, or \`class\`. |
| A param does nothing | Check its spelling against section 3. Custom scenes can't use attribute or element-member names (\`title\`, \`id\`, \`scroll\`…); \`defineScene\` throws on them. |
| Image or mark missing | Cross-origin without CORS. Serve it from \`public/\` or a CORS-enabled bucket; the \`foil-error\` event explains. |
| Text shows \`·\` | The character isn't in the glyph atlas (section 5). |
| \`window.ZenFoil\` is undefined | The script tag is missing or blocked, or code ran before it. Register scenes inside \`customElements.whenDefined("zen-foil")\`. |
| Showcase plates stay on their posters | The showcase or the page loads \`zen-foil.js\` from a different URL, which starts a second engine. Load everything from one commit. |

## 9. Upgrading

Every URL in this file points at commit \`${sha.slice(0, 7)}\`, so nothing changes under you. To upgrade, regenerate this file at a newer commit with \`node scripts/single-file.mjs --sha <commit>\` (in \`skills/zen-foil\`), then replace the commit in \`index.html\`.
`;

function indent(text, n) {
  const pad = " ".repeat(n);
  return text
    .split("\n")
    .map((l) => (l ? pad + l : l))
    .join("\n");
}

writeFileSync(out, doc);
console.log(`${relative(process.cwd(), out)}: ${doc.length.toLocaleString("en-US")} characters, pinned to ${sha.slice(0, 7)}`);
