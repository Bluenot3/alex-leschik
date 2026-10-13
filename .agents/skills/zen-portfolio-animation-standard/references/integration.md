# Integration map

## Contents
- Source closure
- Rendering contract
- Embedding and adaptation
- Known hazards

## Source closure

The snapshot contains the actual engine, all 23 registered scenes (20 plates plus field/cube/stage), atlas masks, supporting clock, field/image consumers, particle layout, and shared-glass primitives. `assets/source/manifest.json` records SHA-256 hashes of the original copied files. It is a source reference, not a standalone built app or a runtime package.

- **Foil cards:** copy `src/foil/` plus `src/hooks/useRafTicker.ts`. This intentionally preserves the complete registry dependency closure. Prune unused scenes only after updating every registry import and verifying both renderers.
- **Ambient page:** add `TreasuryField.tsx`, adapt `fieldStore.ts` region registration, and provide a CSS/static background. See its host sizing below.
- **Images:** add `TheaterStage.tsx`; read the stage shader and image helpers.
- **Particle identity:** copy `InteractiveName.tsx`, `interactive-name/particleLayout.ts`, and shared clock; inspect its DOM selectors and scroll/resize coupling before use.
- **R3F glass:** copy `three/SharedTransmission.tsx`, `three/glass.ts`, and `StudioEnvironment.tsx`; use target-compatible `three`, `@react-three/fiber`, and `@react-three/drei`. Historical versions were approximately 0.170 / 8.18 / 9.122, not mandatory pins.

Foil requires React/TypeScript integration, `@webgpu/types` for its GPU type reference, a browser build pipeline for imported PNGs, and the `@/` alias or rewritten imports. React + Vite is the tested source shape. For another framework preserve the shader/backend contract and reimplement only lifecycle ownership; do not claim the React consumers run unchanged everywhere.

Read every copied file before modifying it. Install packages only when absent. Keep unrelated editing forms, owner gates, backend code, and personal portfolio copy out of new integrations.

## Rendering contract

- `FoilScene`: id, portable WGSL code, optional still time, optional data writer, optional post (`plate`, `raw`, `alpha`).
- Default `scene(uv,p)` returns additive `vec3f`; alpha scenes return premultiplied `vec4f`. `uv` is DOM-oriented [0,1]; `p` is centered, y-up, aspect-correct, normalized by view height.
- Uniform block: 39 vec4s / 156 floats / 624 bytes. Offsets: resolution 0, time 4, pointer 8, tilt 12, accent 16, p0 20, p1 24, data 28. The data block is 128 floats. Never overrun it; text packing and geometry compete for slots.
- WGSL source passes through the bundled limited translator, not a general WGSL compiler. Extend only syntax supported by `translate.ts` or update and verify both backend implementations.
- Atlas: 1024×2048 R8; glyphs, US silhouette, world mask, brand marks. Load the target mono font before baking. The source requests DM Mono; supply an appropriate local/approved font and test microprint metrics. Asset rights are not implied by inclusion.
- Engine singleton owns one device/context family, per-view lifecycle, pending/live/static status, pointer state, visibility, adaptive quality, and the shared tick subscription. `attach()` returns cleanup. Use it rather than creating a new GPU engine per card.

## Embedding and adaptation

Use `FoilCanvas` inside a stable, positioned artwork container (e.g. aspect-ratio 16/10). Keep the actual title and link outside or above the decorative canvas with normal accessible DOM controls. Provide a meaningful static poster beneath it. The host and `.foil-canvas` need absolute inset:0, stable width/height, and a first-live opacity transition.

The historical `FoilCanvas` accent prop expects a hex string. For target adoption, resolve a semantic token into normalized RGB using a browser color parser or adapt the wrapper to accept an RGB tuple; never feed unresolved `hsl(var(...))` to its hex parser. Shader material constants may remain in the source recipe, but expose theme-critical palette values as target tokens/uniforms.

For pointer tilt, update CSS properties via refs rather than React state on every move. Prefer delta-time damping `1-exp(-dt/tau)` for consistent feel; start with shallow rotation, local glare, and neutral reset on leave. Touch and keyboard use must not depend on hover.

For fixed ambient fields use `height:100lvh` where supported and a 100vh fallback so collapsing mobile browser chrome does not continuously reallocate GPU textures. Set a deliberate stacking context: below content, above a static fallback, pointer-events:none. Do not put a fixed canvas at negative z-index without checking it remains visible.

## Known hazards and repairs

- The source snapshot preserves historical code, including TypeScript non-null assertions and raw style values. Do not treat those as conventions: guard nullable contexts/resources and migrate styling to semantic roles in the target copy only.
- `TheaterStage` uses a nullable 2D context without a guard in the original: handle unavailable contexts via the fallback callback before touching it. Preserve async cancellation.
- Restore render target, tone mapping, and mesh visibility in `try/finally` when adapting the shared FBO pass; exceptions must not leave the rest of the scene hidden.
- Do not restart a mint reveal on visibility changes or reload the whole document on device loss. After repeated GPU loss fall back to WebGL2, then a static poster. Keep watchdogs for stalled initialization.
- Reuse an existing page clock instead of introducing a second one. Park it while hidden; unsubscribe offscreen work. Reduced motion renders a still and updates only when relevant geometry changes.
- Distinguish exact original recipes from target improvements in documentation. The snapshot is not a production certification; verify the target integration independently.