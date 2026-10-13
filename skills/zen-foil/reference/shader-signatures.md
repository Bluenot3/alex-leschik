# Shader library signatures

Generated from the library source by `scripts/gen-docs.mjs`; don't edit it by hand. `shader-library.md` explains how to use these functions. The argument types are exact: where a signature says `i32`, pass an integer (`rosette(…, 3, …)`, not `3.0`), and where it says `f32`, pass a float literal (`1.0`, not `1`).

## Math, noise, distance fields, strokes, engraving, foil

| Signature | Returns | Notes |
|---|---|---|
| `tnow()` | `f32` |  |
| `pxs()` | `f32` |  |
| `aspect()` | `f32` |  |
| `hov()` | `f32` |  |
| `pulse()` | `f32` |  |
| `mouseP()` | `vec2f` |  |
| `intro()` | `f32` |  |
| `stampP()` | `vec2f` | Where the plate was last pressed (pointerdown), in p coordinates. |
| `rot2(a: f32)` | `mat2x2f` |  |
| `sat3(v: vec3f)` | `vec3f` |  |
| `luma(c: vec3f)` | `f32` |  |
| `ease(x: f32)` | `f32` |  |
| `sstep(a: f32, b: f32, x: f32)` | `f32` | smoothstep that stays defined when a > b (GLSL/MSL leave that undefined). |
| `modF(x: f32, y: f32)` | `f32` | Float modulo that agrees on every backend. |
| `pcg(v: u32)` | `u32` |  |
| `hashu(x: i32, y: i32)` | `u32` |  |
| `h21(p: vec2f)` | `f32` |  |
| `h22(p: vec2f)` | `vec2f` |  |
| `h11(x: f32)` | `f32` |  |
| `vnoise(p: vec2f)` | `f32` |  |
| `grad2(i: vec2f)` | `vec2f` |  |
| `gnoise(p: vec2f)` | `f32` |  |
| `fbm(p: vec2f, oct: i32)` | `f32` |  |
| `sdCircle(p: vec2f, r: f32)` | `f32` |  |
| `sdBox(p: vec2f, b: vec2f)` | `f32` |  |
| `sdRoundBox(p: vec2f, b: vec2f, r: f32)` | `f32` |  |
| `sdSeg(p: vec2f, a: vec2f, b: vec2f)` | `f32` |  |
| `segT(p: vec2f, a: vec2f, b: vec2f)` | `f32` |  |
| `sdQuadBez(p: vec2f, a: vec2f, b: vec2f, c: vec2f)` | `f32` |  |
| `lineCov(d: f32, hw: f32)` | `f32` | Line coverage for a stroke of half-width hw px at distance d px. Hairlines (hw < 0.5) keep a 1px footprint and fade by their true width so nothing shimmers. |
| `stroke(d: f32, hwPx: f32)` | `f32` | Stroke from a distance field measured in p-units. |
| `halo(d: f32, k: f32)` | `f32` | Soft luminous halo around a distance field (p-units). |
| `fillAA(d: f32)` | `f32` |  |
| `engraveP(c: f32, s: f32, tone: f32, ps: f32)` | `f32` | Intaglio engraving: parallel lines following the scalar c with period s. tone 0..1 sets line weight, like a burin cut deeper for darker ink. When the period approaches a pixel the pattern resolves to its mean tone instead of moiré. |
| `engrave(c: f32, s: f32, tone: f32)` | `f32` |  |
| `halftone(p: vec2f, cell: f32, ang: f32, tone: f32)` | `f32` | Halftone dot screen (rotated grid), radius grows with tone. |
| `holo(t: f32)` | `vec3f` | Holographic foil: silvered cosine palette that sweeps cyan → violet → gold. Phase is driven by geometry, view tilt and time. |
| `spectral(t: f32)` | `vec3f` |  |
| `foilPhase(p: vec2f, k: f32)` | `f32` | View-dependent foil phase for a point: the tilt makes it shift like a hologram. |
| `inkCol(p: vec2f, k: f32)` | `vec3f` | Ink colour for engraved line-work: accent blended with silver foil. |
| `silver()` | `vec3f` |  |
| `gold()` | `vec3f` |  |
| `dPt(base: i32, i: i32)` | `vec2f` | Static scene data: 2D points packed two per vec4 from vec4 index `base`. |
| `dF(i: i32)` | `f32` | One float of the data block by float index. |

## Signed-distance glyph atlas (DM Mono, 16 × 8 cells of 64 px)

| Signature | Returns | Notes |
|---|---|---|
| `glyphD(code: i32, q: vec2f)` | `f32` |  |
| `glyphCov(code: i32, q: vec2f, size: f32, weight: f32)` | `f32` | Glyph coverage: q glyph-local (y down, 0..1 across the cell), size = cell height in p-units. |
| `charAt(i: i32)` | `i32` | Character codes packed three per float into u.d. |
| `tiledLen(start: i32, count: i32)` | `i32` | Tiled microprint (textLoop, ringText) repeats its text with a " · " joint, unless the text already ends in a space or a dot, so runs never fuse ("…AI COZEN AI…"). tiledLen is the repeat length; tiledChar(…, idx) the atlas code at idx, reading only inside the text. |
| `tiledChar(start: i32, count: i32, idx: i32)` | `i32` |  |
| `textRunT(p: vec2f, origin: vec2f, size: f32, start: i32, count: i32, weight: f32, track: f32)` | `f32` | Monospace text run from u.d with explicit tracking: start char index, count, top-left origin (p-space), cap size, advance = track × size. 0.6 is the open microprint spacing; ~0.42 sets tight display figures. |
| `textRun(p: vec2f, origin: vec2f, size: f32, start: i32, count: i32, weight: f32)` | `f32` | The default run (open microprint spacing). Returns coverage. |
| `textLoop(p: vec2f, top: f32, size: f32, start: i32, count: i32, shift: f32, weight: f32)` | `f32` | Repeating microprint band: the string tiles horizontally, shifted by `shift` (p-units). Offset keeps indices positive for GLSL's %. |
| `ringText(p: vec2f, ctr: vec2f, radius: f32, size: f32, start: i32, count: i32, rot: f32, once: bool)` | `f32` | Microprint set around a circle (clockwise from twelve o'clock, glyph tops facing outward). Tiles a whole number of times so the seam is invisible (joined like textLoop); once = true prints a single run starting at rot. |
| `digitCov(p: vec2f, origin: vec2f, size: f32, digit: i32, weight: f32)` | `f32` | A glyph chosen by number (e.g. animated digits): code = 16 + digit. |
| `glyphAt(p: vec2f, origin: vec2f, size: f32, code: i32, weight: f32)` | `f32` | One glyph by atlas code (see GLYPH_TABLE; e.g. 100 = ×, 95 = ·) at a top-left origin. |
| `numberCov(p: vec2f, origin: vec2f, size: f32, value: i32, digits: i32, weight: f32)` | `f32` | A zero-padded integer, `digits` wide, from its top-left origin. |
| `cipherCode(h: f32)` | `i32` | A random glyph from the cipher set (digits, punctuation, capitals). |
| `cipherRun(p: vec2f, origin: vec2f, size: f32, count: i32, seed: f32, rate: f32, hex: bool, weight: f32)` | `f32` | A streaming cipher/hash run: `count` characters that re-roll `rate` times a second. hex = true restricts to 0–9 A–F. |

## Parameters (written by the engine from attributes / props)

| Signature | Returns | Notes |
|---|---|---|
| `numParam(i: i32)` | `f32` |  |
| `strParam(k: i32)` | `vec2i` |  |
| `textLenP(k: i32)` | `f32` | Characters in text param k, and its width at cap size `size`. |
| `textWidthP(k: i32, size: f32)` | `f32` |  |
| `textFitP(k: i32, maxW: f32, maxSize: f32)` | `f32` | The largest cap size ≤ maxSize at which text param k fits in maxW. |
| `textRunP(p: vec2f, origin: vec2f, size: f32, k: i32, weight: f32)` | `f32` |  |
| `textCenterP(p: vec2f, c: vec2f, size: f32, k: i32, weight: f32)` | `f32` | Text param k centred on c (both axes). |
| `textLoopP(p: vec2f, top: f32, size: f32, k: i32, shift: f32, weight: f32)` | `f32` |  |
| `ringTextP(p: vec2f, ctr: vec2f, radius: f32, size: f32, k: i32, rot: f32, once: bool)` | `f32` |  |
| `textRunPT(p: vec2f, origin: vec2f, size: f32, k: i32, weight: f32, track: f32)` | `f32` | Text param k with explicit tracking (see textRunT). |
| `textWidthPT(k: i32, size: f32, track: f32)` | `f32` |  |
| `textDecodePT(p: vec2f, origin: vec2f, size: f32, k: i32, weight: f32, reveal: f32, track: f32)` | `f32` | Text param k decoding in, with tracking: characters past `reveal` (0..1 of the run) show re-rolling cipher glyphs; settled ones the text. |
| `textDecodeP(p: vec2f, origin: vec2f, size: f32, k: i32, weight: f32, reveal: f32)` | `f32` | Text param k decoding in at the default spacing. |

## Map silhouette region (contiguous U.S., Albers)

| Signature | Returns | Notes |
|---|---|---|
| `mapD(q: vec2f)` | `f32` |  |

## World land (equirectangular)

| Signature | Returns | Notes |
|---|---|---|
| `worldD(ll: vec2f)` | `f32` |  |
| `lonLat(n: vec3f)` | `vec2f` | Unit-sphere direction (y up, z toward lon 0 / lat 0) → (lon, lat) degrees. |
| `sphereDir(ll: vec2f)` | `vec3f` |  |

## Brand marks (256 px cells; slot 0 ZEN, 1 BGC, 2 NEAR, 3–7 registered)

| Signature | Returns | Notes |
|---|---|---|
| `logoD(slot: i32, q: vec2f)` | `f32` |  |
| `logoDist(slot: i32, p: vec2f, c: vec2f, s: f32)` | `f32` | Mark distance in p-units: centre c, cell size s (p-units). |
| `logoCov(slot: i32, p: vec2f, c: vec2f, s: f32)` | `f32` | Mark coverage; 0 everywhere when slot < 0 (no mark). |
| `brandSeal(p: vec2f, c: vec2f, r: f32, slot: i32)` | `vec2f` | A security seal of radius r around a brand mark: twin rings around a counter-turning guilloche band. slot < 0 leaves the centre empty. Returns (ink coverage, glow). |
| `zenSeal(p: vec2f, c: vec2f, r: f32)` | `vec2f` |  |
| `brandStamp(p: vec2f, slot: i32)` | `vec3f` | An issuer stamp in the plate's lower-right corner. |
| `zenStamp(p: vec2f)` | `vec3f` |  |

## Security-print ornaments

| Signature | Returns | Notes |
|---|---|---|
| `rosette(p: vec2f, c: vec2f, r0: f32, amp: f32, lobes: f32, n: i32, hw: f32, ph: f32)` | `f32` | Guilloche rosette: n interlaced sinusoidal strands around radius r0 (amplitude amp, `lobes` whole waves per turn), each a hairline of half-width hw px, phase-shifted by ph. Line width stays even on steep flanks (the radial distance is slope-corrected). |
| `guillocheBand(p: vec2f, c: vec2f, r0: f32, r1: f32, lobes: f32, n: i32, hw: f32, ph: f32)` | `f32` | A guilloche band: n strands weaving between radii r0 and r1. |
| `sunburst(p: vec2f, c: vec2f, n: f32, tone: f32, ph: f32)` | `f32` | Banknote sunburst: n engraved rays from c, tone 0..1. |
| `edgeDist(p: vec2f)` | `f32` | Distance from p to the plate's edge (positive inside). |
| `plateFrame(p: vec2f, inset: f32)` | `f32` | An engraved double keyline `inset` in from the plate edge. |
| `frameCorners(p: vec2f, inset: f32, r: f32)` | `f32` | Corner rosettes for a frame `inset` in from the edge: (coverage). |

