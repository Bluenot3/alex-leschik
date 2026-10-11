# Aesthetic and shader recipes

## The actual material language

Contrast airy white/slate surroundings with precisely engraved, dark minted artifacts. Combine silver hairlines, low-amplitude iridescence, microprint, anti-aliased contours, pointer-dependent reflection, and a deliberate reveal. The material must read as a crafted physical object rather than an animated gradient pasted onto a card. Adapt foundations to the receiving product rather than imposing the portfolio's whole layout.

The primary source is `assets/source/src/foil/library.ts`; real variants live in `assets/source/src/foil/scenes/`. These files—not historic descriptions of removed components—are the reconstruction baseline.

## Core recipes

### Engraved holographic plate

- Compose project-relevant geometry with signed-distance circles, segments, boxes, quadratic curves, or a scalar flow field. Render the same geometry as intaglio hatching and a restrained highlight rather than filling everything with glow.
- Keep `lineCov`: a subpixel half-width keeps a one-pixel footprint and attenuates by the actual width. Keep `engraveP`: when spacing becomes subpixel, resolve to mean tone rather than producing moiré. Keep derivative helpers in uniform control flow.
- Preserve the material stack from `POST`: dark engraved substrate → additive scene light → diagonal mint reveal → view-dependent foil sheen → vignette → filmic shoulder → approximately one-8-bit-step noise. This last noise is quantization dither, not a substitute for deliberate ordered-dither artwork.
- Source foil palette: `holo(t) = (0.60,0.64,0.72) + (0.40,0.36,0.30) * cos(2π * (t + (0,0.16,0.34)))`. Use it for reflection, not dominant multicolor UI. Source phase is geometric position plus `tiltX*0.55 - tiltY*0.35 + time*0.025`.
- Source mint intro is 1500ms and must occur only once per newly attached view, not whenever it scrolls into view. Keep a poster visible until the first successful live frame.
- Read `vault.css` for the original pointer-driven conic edge, local glare, and registration marks. Translate its raw historical colors, font scaling, and radii into target semantic tokens and current project conventions; do not copy those styling choices indiscriminately.

### Plotter flow field — `scenes/forge.ts`

Use a stream function built from domain-warped FBM; its level sets depict divergence-free streamlines. The source uses spacing 0.0145 in height-normalized coordinates, a 16-second draw cycle, golden-ratio band ordering, left-to-right drawing, a short wet-ink highlight, and a restrained carriage/rail. Evolve the geometry with target-specific data or boundary conditions, not extra particle count.

### Cartographic propagation — `scenes/pioneer.ts`, `scenes/dmv.ts`

Read the exact packed-data functions and projection math. Pair engraved land with coherent arcs, traveling marks, and arrival impressions. Great-circle paths and map projection are real geometry, not arbitrary bezier lines. Replace regions and claims with truthful target data; use a generic geometry motif when no geographic meaning exists.

### Ambient cipher/guilloche — `scenes/field.ts`, `TreasuryField.tsx`

One page-level layer paints three glyph depths with source cell heights 15.5/19/23 CSS pixels, drift 4/-6.5/10, parallax 0.16/0.33/0.52, region-controlled density, occasional local decoding, and faint banknote rosettes. Source watermark opacity is about 0.09. Keep ambient contrast far below readable content. Feed up to eight visible section rectangles, clearing unused slots. Replace the source's hidden phrases; do not invent esoteric messaging for other brands.

### Image mint reveal — `TheaterStage.tsx`, `scenes/stage.ts`

Decode the incoming image before uploading; retain the current image while loading; swap two texture layers and reveal the new one over the last. Preserve contain-fit inspection and optional blurred margins, never sacrifice the real image to an atmospheric crop. Guard stale async results and expose a plain-image fallback.

### Particle typography — `InteractiveName.tsx`, `interactive-name/particleLayout.ts`

Use text-derived particle homes, struct-of-arrays storage, type-contiguous drawing, color lookup tables, phase trig precomputation, and an offscreen trail canvas. Source feel: radius 122, force 50, return 0.10, friction 0.855, pointer smoothing 0.42, speed cap 20. Read their units and integration before adapting. Normalize to time so behavior is not dependent on refresh rate. Provide real DOM text; snap to a legible still for reduced motion.

### Refractive studio artifacts — `three/SharedTransmission.tsx`, `three/glass.ts`, `StudioEnvironment.tsx`

One transmission buffer per 3D canvas, not per mesh. Tag glass meshes, render the scene excluding glass once, share that texture across materials, and avoid double tone mapping. Reference scale 0.6, samples 6; low-power starting scale 0.5, samples 4. Use locally baked procedural lightformers (256px environment, one bake) instead of a runtime external HDR dependency. Resolve light colors through target palette inputs.

## A stronger variation

Improve one substantive dimension: contextual geometry, mathematically coherent interaction, material readability, multi-stage choreography, or useful real-data mapping. Reuse shared primitives so the result remains recognizable as the same level of craft. Adding glow, simultaneous effects, particles, or longer loading is not an upgrade. Keep one dominant motif per surface and quiet support layers. No quality claim passes without observing it at the target sizes and comparing it with the baseline.