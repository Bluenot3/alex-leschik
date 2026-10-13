---
name: zen-foil
description: Engraved-hologram GPU graphics in the alexleschik.com / ZEN AI Co. style, for any web project. Banknote guilloche, intaglio line engraving, microprint, holographic foil and security seals, rendered live on WebGPU with a WebGL2 fallback. Use for premium animated hero visuals, project and portfolio cards, credentials and certificates, metric plates, globes, U.S. reach maps, AI agent-network diagrams, engraved photo treatments, image galleries, glass-cube showcases and "Treasury / hologram / banknote / security-print" backgrounds. Works in plain HTML, React, Next.js, Vue, Svelte, Astro, Lovable, Webflow embeds and claude.ai artifacts.
---

# zen-foil

`zen-foil` is a dependency-free GPU engine plus a ready scene kit. Every graphic is one `<zen-foil>` element: it works in any framework and renders on WebGPU (or WebGL2). One GPU device drives every plate on the page. DPR caps, adaptive resolution, visibility culling, reduced-motion stills and device-loss recovery are built in.

```html
<script type="module" src="https://cdn.jsdelivr.net/gh/Bluenot3/alex-leschik@main/skills/zen-foil/dist/zen-foil.js"></script>

<zen-foil scene="seal" accent="#7cc4ff" headline="ACME LABS" subline="ISSUED UNDER SEAL" mark="/logo.svg"></zen-foil>
```

The element is `display:block` and full width. Its height comes from the scene's aspect ratio unless your CSS sets one. Children render on top of the plate.

## 0. The shortest path (any agent, any model size)

`AGENTS.md` is the tiered brief: five rules, then copy-paste templates (tier 1), generator and checker commands (tier 2), and scene authoring (tier 3). `manifest.json` is the same contract as data: every scene, param, type, range, default, example and template. Don't compose markup from prose when a command can write it:

```bash
node <skill>/scripts/replicate.mjs show globe                                  # params, example, template
node <skill>/scripts/replicate.mjs tag seal --headline "ACME LABS" --mark /logo.svg   # a valid tag, or the fix
node <skill>/scripts/verify.mjs src index.html                                 # every tag checked; exit 1 until clean
```

In a browser, `ZenFoil.describe()`, `ZenFoil.snippet()` and `ZenFoil.check()` give the same answers.

## 1. Choose how to install

| Situation | Do this |
|---|---|
| Plain HTML, Webflow/Framer embed, WordPress, any site builder | Add the CDN `<script type="module">` above, then use `<zen-foil>` tags. |
| Repo with a filesystem (Vite, React, Next.js, Vue, Svelte, Astro) | `node <skill>/scripts/install.mjs <project-dir>`. It vendors `zen-foil.js` and types into `src/vendor/zen-foil/`. React projects also get `components/ZenFoil.tsx` and JSX typings. Import once on the client and use the element or `<ZenFoil>`. |
| Lovable or another agent that can't run scripts | Put the CDN script in `index.html`, pinned to a commit. Copy `templates/react/ZenFoil.cdn.tsx` to `src/components/ZenFoil.tsx` and `templates/react/zen-foil-jsx.d.ts` to `src/zen-foil.d.ts` (details in `reference/integration.md#lovable`). |
| claude.ai artifact (CDN may be blocked) | Paste the contents of `dist/zen-foil.js` inline in a `<script type="module">`, then use the tags. |
| Production | Pin the CDN to a commit (`@<sha>`) instead of `@main`, or vendor the files. |

The details for each stack are in `reference/integration.md`: Next.js `"use client"`, SSR safety, Vue `isCustomElement`, CSP, shared clocks.

## 2. Pick a scene (no shader code needed)

Configure each scene with attributes. Text params fit and decode automatically. Layouts adapt from phone portrait to wide banners. Every scene also takes the `accent` and `theme` attributes.

| `scene` | Use it for | Key params |
|---|---|---|
| `seal` | Hero emblem, brand or credential mark, "verified" badge | `mark` `headline` `subline` `serial` `caption` `eyebrow` `micro` `layout` `counter` |
| `globe` | Global reach, partnerships, network expansion | `origin` `points` `mark` `partner` `headline` `subline` `stat` `label` `hubs` `spin` |
| `usmap` | U.S. footprint, program rollout city by city | `origin` `points` `mark` `headline` `serial` `caption` `label` `cycle` |
| `banner` | Section headers, dividers, wide hero bands (2:1 to 8:1) | `headline` `subline` `mark` `micro` `strands` |
| `certificate` | Certificates, badges, awards (try `theme="paper"`) | `headline` `recipient` `program` `date` `serial` `issuer` `mark` |
| `metric` | KPI or stat plates, growth stories | `value` `label` `delta` `headline` `series` `mark` |
| `network` | AI agents, platforms, integrations, hub-and-spoke | `nodes` `mark` `headline` `subline` `status` `micro` |
| `engrave` | Any photo as a banknote engraving, with a colour loupe | `src` `mode` (engraved/duotone/reveal) `frame` (rect/oval/none) `headline` `subline` `mark` |
| `stage` | Gallery or slideshow that mints images in | `images` `interval` `src` `top` `bottom` |
| `vault` | Ray-traced crystal cube carrying 6 images or videos | `images` `mark` `spin` `tilt` `scrollspin` |
| `field` | Page background of floating cipher glyphs | `variant` (light/dark) `density` `rate` `phrases` `seals` (use the `fixed` attribute) |

Every param, its default and its description are in `reference/scenes.md`. Twenty bespoke portfolio plates (`pioneer`, `dmv`, `near`, `weekly`, `terminal`…) load from `dist/zen-foil-showcase.js`. They are ready to use, and they are the best worked examples of the style.

Element attributes:
- `scene`: the scene id.
- `accent`: any CSS colour, including `hsl(var(--primary))`.
- `theme`: `plate` (dark), `paper` (light security paper) or `clear` (ink only, transparent).
- `aria-label`: an accessible name. Without it the plate is decorative. (`label` is a scene param on some scenes, such as the origin label on `globe`.)
- `fixed`: makes it a full-viewport background.
- `seed`, `max-dpr`.
- `class` and `style` work as usual. On the raw element in React 18, write `class`, not `className` (React 18 renders it as a `classname` attribute). The `<ZenFoil>` wrapper handles this.

Events are `foil-live`, `foil-fail` and `foil-error`. They bubble and are composed.

Marks:
- The built-ins are `zen`, `bgc` and `near`.
- `mark` also accepts any SVG path data (Simple Icons' 24×24 paths work as-is), inline `<svg>` markup, or an image URL.
- You can also call `registerMark("acme", source)`.
- Only use marks the project has rights to. Use the ZEN marks only for ZEN AI Co. work.
- The kit's text defaults are ZEN copy too. On any other brand, set every param on the scene's **Other brands** line in `reference/scenes.md`.

## 3. Make it look right

The style is restrained engraving, not neon. Before composing a page, read `reference/aesthetic.md`. The essentials:
- **One hero plate per viewport.** Pair it with quiet type. Use secondary plates as cards. The `field` background stays at low density.
- **Choose an accent from the brand.** Let the foil (`holo`) do the colour work. Never put rainbow gradients on text.
- **Keep copy factual and short.** Engraved type is UPPERCASE and tracked. Use microprint for real names, mottos and URLs. Never invent statistics or credentials: use the client's numbers or leave the param empty.
- **Motion is slow and physical.** Drift, minting sweeps, a stamp every few seconds. Nothing should bounce or spin fast. The engine already mints each plate in (burin, foil, press), glints it every ~11 s, lights the line work under the pointer and stamps a ring where it's pressed: don't add entrances or click effects of your own. `element.replay()` re-mints a plate.
- **Check it at 3 sizes**: a phone width (390px), a card (~600px) and a hero (1440px). Check both `plate` and `paper` if the site is light.

## 4. Write a new scene (when the kit doesn't fit)

1. **Scaffold the scene.** Run `node <skill>/scripts/new-scene.mjs my-scene --out src/scenes --import "<path to zen-foil.js>"`. For CDN pages, add `--js`.
2. **Read `reference/authoring.md`.** It covers the contract, the coordinate system, uniforms, params, the data block, behaviors, image layers and themes. The helpers you'll use are in `reference/shader-library.md`: `engrave`, `rosette`, `brandSeal`, `textDecodeP`, `sunburst`, `worldD`, `logoDist`… Their exact argument types are in `reference/shader-signatures.md`.
3. **Write the WGSL in the portable subset** (`reference/portable-wgsl.md`):
   - Type every `let`/`var`/`const`.
   - Use float literals (`1.0`).
   - Use `select()`, not `?:`.
   - Use `sstep()`, not `smoothstep`.
   - Use `modF()`, not float `%`.
   - Keep each `fn` signature on one line.
   - Never redeclare a library name.
   - Call `fwidth` and `engrave` only in uniform control flow.
   - Name params like attributes: lowercase, and never an attribute or member of the element (`title`, `id`, `scroll`, `update`…). `defineScene` throws on a bad name.
4. **Check it.** Run `node <skill>/scripts/check.mjs src/scenes/my-scene.ts`. These static checks need no browser.
5. **See it.** Run `node <skill>/scripts/preview.mjs --scenes my-scene --module src/scenes/my-scene.ts --validate --w 960 --h 600`. This compiles the scene on WebGPU and WebGL2, reports `scene line N` errors, and saves screenshots. Then look at the PNGs, and iterate until it holds up next to the kit scenes.
6. **Register it.** Import the module once before the element mounts.

In a running page, `?foil-debug` logs lint warnings and exposes `window.__zenFoil`. You can also run `await ZenFoil.validate(["my-scene"])` in the console, ideally with `?foil=off` so the check has the GPU to itself. `?foil=webgl2|webgpu|off` forces a backend.

## 5. Quality bar (check before you hand off)

- `scripts/verify.mjs` prints `OK` for every file with plates (or `ZenFoil.check()` reports no problems).
- The script tag is pinned to a commit (`release.json`), once per page.
- For new scenes, `scripts/check.mjs` is clean.
- `scripts/preview.mjs --validate` reports every program clean on both backends.
- You have looked at screenshots:
  - at phone, card and hero sizes;
  - in each theme the site uses;
  - in WebGPU (`--backend webgpu` reads frames back where headless browsers can't present them).
- Nothing important lives only in the shader. Real text for SEO and accessibility goes in the DOM (as children or nearby). Use `aria-label` when the plate carries meaning.
- At most ~8 plates are on screen at once. Use `max-dpr="1.5"` for big background layers. Off-screen plates cost nothing.
- Reduced motion shows a still, which you can test with DevTools emulation. With no GPU, the CSS poster stays.
- If the project already runs a shared animation clock, hand it over with `setClock(subscribe)`. The repo's AGENTS.md may require this, as alexleschik.com's does for `useRafTicker`.

## 6. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Blank area | The element has no width, or the `scene` id isn't registered (check the console for `[zen-foil]`). |
| CSS poster never turns live | No GPU, or the scene failed to compile. The console shows `[zen-foil] scene "x" failed to compile` with `scene line N`. Run `scripts/preview.mjs --validate`. |
| Image or mark doesn't appear | Cross-origin without CORS headers. Serve it same-origin or with `Access-Control-Allow-Origin`. The `foil-error` event says so. |
| Text shows `·` | That character isn't in the glyph atlas (ASCII, `·•→←±×÷≈≡∞△◇◈✦αλΣΩπ∇∂`, a few kana). Accents fold to their base letter. |
| Headless screenshots are black on WebGPU | Expected: use `?foil-readback` (preview.mjs does this for `--backend webgpu`). |
| Showcase or custom-scene plates stay on their posters | The showcase or your scene loads `zen-foil.js` from a different URL, which starts a second engine. Load everything from one place. |

## Files

- `AGENTS.md`: the tiered brief for any coding agent. `manifest.json`: the contract as data. `llms.txt`: the one-page summary. `release.json`: the pinned build every doc points at (`scripts/pin.mjs <commit>` re-pins them all).
- `dist/zen-foil.js`: the ESM bundle (engine, kit, `<zen-foil>`, `window.ZenFoil`). `dist/zen-foil.d.ts`: the types. `dist/zen-foil-showcase.js`: the 20 portfolio plates.
- `src/`: the TypeScript source, rebuilt with `node scripts/build.mjs` (needs esbuild).
  - `src/scenes/kit/*.ts`: the kit, readable examples.
  - `src/library.ts`: the shader library.
- `templates/`: `scene-template.ts`, `standalone.html` (a full demo page), and `react/ZenFoil.tsx` with JSX typings.
- `scripts/`: `replicate.mjs` (writes valid tags and pages), `verify.mjs` (checks tags in any source files), `install.mjs`, `new-scene.mjs`, `check.mjs`, `preview.mjs`, `build.mjs`, `gen-docs.mjs` (also writes `manifest.json`, `llms.txt` and the `AGENTS.md` table), `pin.mjs`, and `single-file.mjs` (the whole skill as one markdown file, for agents that take one, such as Lovable workspace skills).
- `lab.html`: open it (via any static server) to browse every scene with theme and accent controls.
- `reference/`:
  - `aesthetic.md`
  - `scenes.md`
  - `authoring.md`
  - `shader-library.md`
  - `shader-signatures.md` (generated)
  - `portable-wgsl.md`
  - `integration.md`
