# zen-foil

These are the engraved-hologram GPU graphics from alexleschik.com, packaged so any project, built by any agent or by hand, can use them.

```html
<script type="module" src="https://cdn.jsdelivr.net/gh/Bluenot3/alex-leschik@2285a08ee32e5cec72aff9ef30dbfd296e44dfb5/skills/zen-foil/dist/zen-foil.js"></script>
<zen-foil scene="seal" headline="ZEN AI CO" subline="ISSUED UNDER SEAL"></zen-foil>
```

**Rendering:**
- WebGPU, with an automatic WebGL2 fallback, and one GPU device for every plate on a page.
- Built-in safeguards: DPR caps, adaptive resolution, visibility culling, reduced-motion stills and device-loss recovery.

**Contents:**
- 11 configurable scenes: seal, globe, U.S. map, banner, certificate, metric, agent network, photo engraving, image stage, crystal vault and glyph background.
- The 20 portfolio plates.
- Authoring tools, so agents can write new scenes in the same style.

| Start here | |
|---|---|
| `AGENTS.md` | The tiered brief for any coding agent, from small models (copy-paste templates) to frontier agents (new scenes) |
| `manifest.json` | The contract as data: every scene, param, type, range, default, example and template |
| `SKILL.md` | The skill file agents load: install paths, the scene catalog, the workflow and the quality bar |
| `reference/` | Aesthetic, scene params, authoring, the shader library and its exact signatures, portable WGSL, integration recipes |
| `lab.html` | Browse every scene (serve this folder: `npx serve .`, or `python3 -m http.server`) |
| `templates/` | A standalone page, the React wrapper (installed and CDN versions) with JSX typings, a scene template and a worked example |
| `scripts/` | `replicate.mjs` (writes valid tags), `verify.mjs` (checks them), `install.mjs`, `new-scene.mjs`, `check.mjs`, `preview.mjs`, `build.mjs`, `gen-docs.mjs`, `pin.mjs`, `single-file.mjs` |

## Install as a skill

| Agent | How |
|---|---|
| Claude Code (this repo) | Already available: `.claude/skills/zen-foil` points here. |
| Claude Code (any project) | Copy this folder to `~/.claude/skills/zen-foil` (all projects) or `<project>/.claude/skills/zen-foil`. |
| claude.ai / Claude Desktop | Upload the folder as a zip under Settings → Capabilities → Skills. |
| Lovable | Add the single-file version as a workspace skill. `node scripts/single-file.mjs --sha <commit>` writes it, with the CDN pinned to that commit. |
| Codex | Already available in this repo: `.agents/skills/zen-foil` points here, and Codex reads `skills/zen-foil/AGENTS.md` when it works in this folder. In other repos, copy the folder and reference `AGENTS.md` from the project's own `AGENTS.md`. |
| Cursor, Copilot, Gemini and others | Point the agent at `AGENTS.md` (from rules or the project's `AGENTS.md`), or paste in the single-file version. |
| Small or local models | Paste `AGENTS.md` (or `node scripts/replicate.mjs brief 1`, tier 1 only) into the prompt. The templates need no tools. |

## Develop

```bash
node scripts/build.mjs          # dist/zen-foil.js + dist/zen-foil-showcase.js (needs esbuild)
npx tsc -p tsconfig.json        # types, including the check that dist/zen-foil.d.ts matches
node scripts/check.mjs --all    # static checks on every scene
node scripts/preview.mjs --scenes kit --validate --backend webgpu   # compile on both backends + screenshots
node scripts/gen-docs.mjs       # regenerate reference/scenes.md, shader-signatures.md, manifest.json, llms.txt, the AGENTS.md table
node scripts/verify.mjs templates                     # every tag in the templates is valid
node scripts/pin.mjs <pushed-commit> && node scripts/gen-docs.mjs   # point every doc and the manifest at that build
```

## Licenses

The code is © ZEN AI Co.

Bundled assets:
- **DM Mono** (subset): SIL Open Font License 1.1, in `LICENSES/DMMono-OFL.txt`.
- **World coastlines**: Natural Earth (public domain).
- **NEAR mark path**: Simple Icons (CC0).
- **ZEN and Boys & Girls Clubs marks**: owned by their organizations. Use them only for ZEN AI Co. work.
