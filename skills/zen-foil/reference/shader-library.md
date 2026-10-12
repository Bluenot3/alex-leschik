# Shader library

Every scene can call these functions. They sit before your code, in portable WGSL. Distances are in **p-units** (1 = plate height) unless noted. Coverage values run 0–1 and are analytically antialiased. Never redeclare these names: `scripts/check.mjs` and `lintWgsl` catch it. The exact argument and return types of all of them are in `shader-signatures.md`, generated from the source: pass `i32` where a signature says `i32`.

## Frame and input

| Function | Returns |
|---|---|
| `tnow() -> f32` | Scene time in seconds. It freezes under reduced motion and in previews. |
| `intro() -> f32` | 0→1 over the first 1.5 s of a plate's life (eased). Use it for decode-ins. |
| `pxs() -> f32` | One device pixel in p-units. |
| `aspect() -> f32` | Width / height. |
| `mouseP() -> vec2f` | Pointer in p-space. |
| `hov() -> f32` | 0–1, eased: the pointer is over the plate. |
| `pulse() -> f32` | 1→0 after a click or tap. |
| `u.tilt.xy` | Hologram tilt (pointer when hovered, otherwise scroll and idle drift). |
| `u.accent.rgb` | The accent ink. |
| `u.p0`, `u.p1`, `u.d[k]` | Behavior-written vec4s and the data block. |
| `THEME_PAPER`, `THEME_CLEAR` | 1.0 when compiled for that theme, else 0.0. |

## Math and noise

| Function | Notes |
|---|---|
| `rot2(a) -> mat2x2f` | Rotation, applied as `rot2(a) * v`. |
| `sat3(v)`, `luma(c)` | Clamp a vec3; Rec.601 luma. |
| `ease(x)` | Smoothstep curve on a 0–1 input. |
| `sstep(a, b, x)` | Smoothstep that is defined for `a > b` too. **Use it instead of `smoothstep`.** |
| `modF(x, y)` | Float modulo that agrees on every backend. **Use it instead of `%` on floats.** |
| `pcg(u32)`, `hashu(x, y)` | Integer hashes. |
| `h11(x)`, `h21(p)`, `h22(p)` | Floor-cell hashes to 0–1 (`h21(floor-ish p)`). |
| `vnoise(p)`, `gnoise(p)`, `fbm(p, octaves)` | Value noise, gradient noise (about −0.7…0.7), fBm. |

## Distance fields and strokes

| Function | Notes |
|---|---|
| `sdCircle(p, r)`, `sdBox(p, halfSize)`, `sdRoundBox(p, half, r)` | Signed distances. |
| `sdSeg(p, a, b)`, `segT(p, a, b)` | Distance to a segment, and the parameter 0–1 along it. |
| `sdQuadBez(p, a, b, c)` | Quadratic Bézier distance (a 12-segment polyline). |
| `lineCov(dPx, halfWidthPx)` | Coverage of a hairline, given a distance **in pixels**. Below 0.5 px it fades by width instead of shimmering. |
| `stroke(d, halfWidthPx)` | `lineCov(abs(d) / pxs(), …)` for a p-unit distance. |
| `fillAA(d)` | Antialiased fill of a signed distance (negative inside). |
| `halo(d, k)` | `exp(-abs(d) * k)` glow. |

## Engraving and print

| Function | Notes |
|---|---|
| `engrave(c, spacing, tone) -> f32` | Parallel burin lines along the scalar field `c` (lines where `c` is constant), every `spacing`. Line weight follows `tone` (0–1). Lines collapse to their mean tone near the pixel limit, so there is no moiré. **Uses `fwidth`: call it in uniform control flow only.** |
| `engraveP(c, spacing, tone, pixelFootprint)` | The same with an explicit footprint (`fwidth(c)`, or analytic). Safe in loops and branches. |
| `halftone(p, cell, angle, tone)` | A rotated dot screen. |
| `rosette(p, c, r0, amp, lobes, n, hwPx, phase)` | A guilloche rosette: `n` interlaced strands round radius `r0`, `lobes` whole waves per turn. |
| `guillocheBand(p, c, r0, r1, lobes, n, hwPx, phase)` | Strands weaving between two radii. |
| `sunburst(p, c, rays, tone, phase)` | Banknote rays from a centre. |
| `edgeDist(p)` | Distance to the plate edge (positive inside). |
| `plateFrame(p, inset)` | Double keyline, inset from the edge. |
| `frameCorners(p, inset, r)` | Rosettes at the four frame corners. |

## Foil and colour

| Function | Notes |
|---|---|
| `holo(t) -> vec3f` | The silvered holographic palette (cyan → violet → gold). Phase is `t`. |
| `spectral(t)` | The full rainbow. Use it sparingly. |
| `foilPhase(p, k)` | A view-dependent phase, so foil shifts with tilt and time. Feed it to `holo`. |
| `inkCol(p, k)` | The accent blended with foil: the default line ink. |
| `silver()`, `gold()` | Neutral type and keylines; credentials and serials. |

## Text

The glyph atlas holds DM Mono at 64 px with signed distances. `size` is the cap-cell height in p-units. Glyph tops sit at `origin.y`, and `weight` is a dilation in pixels (0 is regular, 0.3–0.5 is bold-ish). The default advance is 0.6 × size (open microprint tracking).

Text params, set by attributes:

| Function | Notes |
|---|---|
| `textRunP(p, topLeft, size, k, weight)` | Text param `k`. |
| `textCenterP(p, centre, size, k, weight)` | Centred on both axes. |
| `textDecodeP(p, topLeft, size, k, weight, reveal)` | Decodes in: characters past `reveal` (0–1) re-roll as cipher glyphs. `reveal = saturate((intro() - 0.3) / 0.7)` is the standard entrance. |
| `textRunPT(…, track)`, `textDecodePT(…, reveal, track)`, `textWidthPT(k, size, track)` | Explicit tracking. 0.44 suits big figures. |
| `textLoopP(p, top, size, k, shift, weight)` | A microprint band, tiled horizontally. Animate `shift`. Repeats are joined with ` · ` unless the text already ends in a space or `·`. |
| `ringTextP(p, centre, radius, size, k, rot, once)` | Text round a circle, tops outward, tiled seamlessly (joined like `textLoopP`). |
| `textLenP(k)`, `textWidthP(k, size)`, `textFitP(k, maxWidth, maxSize)` | Measure the text and fit it to a column. |
| `strParam(k) -> vec2i` | (start, count) for the raw functions below. |
| `numParam(i) -> f32` | Numeric, boolean, choice and mark params. |

Raw text (fixed strings from `layoutText`, or tables you packed yourself):

| Function | Notes |
|---|---|
| `textRun(p, topLeft, size, start, count, weight)`, `textRunT(…, track)` | A run from the data block. |
| `textLoop(p, top, size, start, count, shift, weight)` | A tiled band (joined like `textLoopP`). |
| `ringText(p, centre, radius, size, start, count, rot, once)` | Round a circle. |
| `charAt(i) -> i32` | The atlas code of character `i`. |
| `glyphAt(p, topLeft, size, code, weight)` | One glyph by atlas code (`100` is ×, `95` is ·, `16+d` is the digit d). |
| `digitCov(p, topLeft, size, digit, weight)` | One digit. |
| `numberCov(p, topLeft, size, value, digits, weight)` | A zero-padded integer, for live counters and serials. |
| `cipherRun(p, topLeft, size, count, seed, rate, hex, weight)` | A streaming hash or cipher run (`rate` re-rolls per second; 0 holds still). |
| `glyphD(code, q)`, `glyphCov(code, q, size, weight)` | Low-level glyph distance and coverage in cell space. |

## Maps, globe, marks

| Function | Notes |
|---|---|
| `mapD(q) -> f32` | Contiguous U.S. (Albers). `q` is map-local 0–1 (y down); project points with `projectUS(lon, lat)` in JS. The result is negative inside. |
| `worldD(lonLat) -> f32` | World land (Natural Earth 1:50m) in map-width units, negative on land. |
| `lonLat(n)`, `sphereDir(lonLat)` | Unit sphere ↔ degrees (y up, z toward lon 0). |
| `logoDist(slot, p, centre, cellSize)` | Signed distance to a brand mark. The mark fills about 78% of `cellSize`. |
| `logoCov(slot, p, c, s)`, `logoD(slot, q)` | Coverage (0 when `slot < 0`), and the raw cell lookup. |
| `brandSeal(p, c, r, slot) -> vec2f` | A seal (rings, guilloche, mark): (ink coverage, glow). `zenSeal(p, c, r)` is the ZEN mark. |
| `brandStamp(p, slot) -> vec3f` | An issuer stamp in the lower-right corner, already lit. `zenStamp(p)` is the ZEN mark. |
| `LOGO_ZEN`, `LOGO_BGC`, `LOGO_NEAR` | Built-in slots 0, 1 and 2. Registered marks take 3–7: read them from a `mark` param. |

## Images (layers)

| Function | Notes |
|---|---|
| `imgLod(uv, layer, lod) -> vec4f` | Samples image layer `layer` (premultiplied, uv y down). Pick `lod` from screen coverage; a deep LOD makes a cheap blur. |
| `imgGrad(uv, layer, ddx, ddy)` | Explicit-gradient sampling. |

## Data helpers

| Function | Notes |
|---|---|
| `dPt(vec4Base, i) -> vec2f` | Point `i` from pairs packed two per vec4 (`packPoints` in JS). |
| `dF(floatIndex) -> f32` | One float of the data block. |

## Constants

`PI`, `TAU`, `ATLAS_W`, `ATLAS_H`, `GCELL`, `GRAD`, `MAPRAD`, `WORLDRAD`, `LCELL`, `LOGORAD`, `LOGO_ZEN`, `LOGO_BGC`, `LOGO_NEAR`.

`libraryNames()` in JS lists every name your scene must not redeclare.
