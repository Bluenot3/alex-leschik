# zen-foil

These are the engraved-hologram GPU graphics from alexleschik.com, packaged so any project, built by any agent or by hand, can use them.

```html
<script type="module" src="https://cdn.jsdelivr.net/gh/Bluenot3/alex-leschik@main/skills/zen-foil/dist/zen-foil.js"></script>
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
| `SKILL.md` | The skill file agents load: install paths, the scene catalog, the workflow and the quality bar |
| `reference/` | Aesthetic, scene params, authoring, the shader library, portable WGSL, integration recipes |
| `lab.html` | Browse every scene (serve this folder: `npx serve .`, or `python3 -m http.server`) |
| `templates/` | A standalone page, the React wrapper, a scene template and a worked example |
| `scripts/` | `install.mjs`, `new-scene.mjs`, `check.mjs`, `preview.mjs`, `build.mjs`, `gen-docs.mjs` |

## Install as a skill

| Agent | How |
|---|---|
| Claude Code (this repo) | Already available: `.claude/skills/zen-foil` points here. |
| Claude Code (any project) | Copy this folder to `~/.claude/skills/zen-foil` (all projects) or `<project>/.claude/skills/zen-foil`. |
| claude.ai / Claude Desktop | Upload the folder as a zip under Settings → Capabilities → Skills. |
| Lovable | Add it as a workspace skill. The single-file version uses the pinned CDN build. |
| Cursor, Codex and others | Point the agent at `SKILL.md`, for example from `AGENTS.md` or rules. |

## Develop

```bash
node scripts/build.mjs          # dist/zen-foil.js + dist/zen-foil-showcase.js (needs esbuild)
npx tsc -p tsconfig.json        # types, including the check that dist/zen-foil.d.ts matches
node scripts/check.mjs --all    # static checks on every scene
node scripts/preview.mjs --scenes kit --validate --backend webgpu   # compile on both backends + screenshots
node scripts/gen-docs.mjs       # regenerate reference/scenes.md
```

## Licenses

The code is © ZEN AI Co.

Bundled assets:
- **DM Mono** (subset): SIL Open Font License 1.1, in `LICENSES/DMMono-OFL.txt`.
- **World coastlines**: Natural Earth (public domain).
- **NEAR mark path**: Simple Icons (CC0).
- **ZEN and Boys & Girls Clubs marks**: owned by their organizations. Use them only for ZEN AI Co. work.
