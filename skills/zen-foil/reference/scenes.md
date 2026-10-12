# Scene catalogue

Generated from the scene definitions by `scripts/gen-docs.mjs`; don't edit it by hand.

All scenes take the element attributes `accent` (any CSS colour), `theme` (`plate` | `paper` | `clear`, for plate scenes), `aria-label`, `seed`, `max-dpr` and `fixed`. Params are plain attributes. Text params fit their column automatically, and every param updates live.

## Kit

### `seal` — Security seal

Guilloche medallion around a brand mark, ring microprint, a stamping pulse and a live credential serial.

Default aspect 1.6 · accent `#7cc4ff` · output `plate` (themeable)

```html
<zen-foil scene="seal" headline="ZEN AI CO" subline="ISSUED UNDER SEAL" micro="ZEN AI CO · AUTHENTIC · ORDO AB CHAO ·"></zen-foil>
```

| Param | Type | Default | Notes |
|---|---|---|---|
| `mark` | mark | `zen` | Brand mark: zen, bgc, near, a registered name, SVG path data or an image URL. |
| `layout` | auto / left / center / right | `auto` | Medallion position; auto stacks on narrow plates. |
| `counter` | boolean | `true` | Append a live 6-digit counter to the serial. |
| `speed` | number (0–4) | `1` | Animation speed (0 holds still). |
| `headline` | text | `ZEN AI CO` | Main line (fits the column automatically). |
| `subline` | text | `ISSUED UNDER SEAL` | Second line. |
| `micro` | text | `ZEN AI CO · AUTHENTIC · ORDO AB CHAO · ` | Microprint around the ring and along the edges. |
| `serial` | text | `ZEN-2026-` | Credential serial (prefix, when counter is on). |
| `caption` | text | `VERIFIED · ZENAI.WORLD` | Small line under the serial. |
| `eyebrow` | text | `CERTIFIED ISSUER` | Small label above the headline. |

### `globe` — Engraved globe

Engraved Earth turning under a holographic atmosphere; great-circle arcs carry your mark from an origin to every destination.

Default aspect 1.6 · accent `#6ee7b7` · output `plate` (themeable)

```html
<zen-foil scene="globe" headline="GLOBAL REACH" subline="ZEN AI CO · WORLDWIDE" label="D.C."></zen-foil>
```

| Param | Type | Default | Notes |
|---|---|---|---|
| `origin` | points | `-77.04, 38.91` | Where every arc starts: lon,lat. |
| `points` | points | `-79.38,43.65; -0.13,51.51; 13.40,52.52; 55.27,25.20; 103.…` | Destinations "lon,lat; lon,lat; …" (up to 14). |
| `mark` | mark | `zen` | Mark carried along the arcs and shown in the lockup. |
| `partner` | mark | — | Optional partner mark: the lockup reads mark × partner. |
| `layout` | auto / left / center / right | `auto` | Globe position (auto: right on wide plates, top on narrow). |
| `spin` | number (0–6) | `1` | Rotation speed. |
| `hubs` | number (0–14) | `6` | How many leading destinations carry the mark (the rest a spark). |
| `headline` | text | `GLOBAL REACH` | Main line. |
| `subline` | text | `ZEN AI CO · WORLDWIDE` | Second line. |
| `label` | text | `D.C.` | Label at the origin. |
| `micro` | text | `ZEN AI CO · GLOBAL NETWORK · AI LITERACY WORLDWIDE · ` | Edge microprint. |
| `stat` | text | `42 STATES · 12 COUNTRIES` | Small figure line. |

### `usmap` — U.S. reach map

Engraved U.S. map; arcs spread from an origin under your seal, and each arrival issues the next credential serial.

Default aspect 1.6 · accent `#59c3ff` · output `plate` (themeable)

```html
<zen-foil scene="usmap" label="WASHINGTON, D.C." micro="THE FIRST YOUTH AI LITERACY PROGRAM IN UNITED STATES HISTORY · ZEN AI CO ·" title="ZEN AI CERTIFIED"></zen-foil>
```

| Param | Type | Default | Notes |
|---|---|---|---|
| `origin` | points | `-77.04, 38.91` | Where the wave starts: lon,lat (contiguous U.S.). |
| `points` | points | `-76.61,39.29; -77.44,37.54; -75.17,39.95; -74.00,40.71; -…` | Cities "lon,lat; lon,lat; …" (up to 31). |
| `mark` | mark | `zen` | Seal at the origin. |
| `counter` | boolean | `true` | Live 5-digit counter after the serial. |
| `cycle` | number (4–60) | `10` | Seconds per wave. |
| `label` | text | `WASHINGTON, D.C.` | Origin label. |
| `micro` | text | `THE FIRST YOUTH AI LITERACY PROGRAM IN UNITED STATES HIST…` | Edge microprint. |
| `title` | text | `ZEN AI CERTIFIED` | Credential title (gold). |
| `serial` | text | `ZEN-AIL-2026-` | Serial (prefix, when counter is on). |
| `caption` | text | `VERIFIED · ZENAI.WORLD` | Line under the serial. |

### `banner` — Guilloche banner

Interlaced guilloche waves across a wide band, a cartouche headline, end seals and edge microprint.

Default aspect 4 · accent `#8fb4ff` · output `plate` (themeable)

```html
<zen-foil scene="banner" headline="AI PIONEER PROGRAM" subline="ZEN AI CO · AI LITERACY" micro="ZEN AI CO · AI LITERACY · BUILT IN PUBLIC ·"></zen-foil>
```

| Param | Type | Default | Notes |
|---|---|---|---|
| `mark` | mark | `zen` | End seals (none to omit). |
| `strands` | number (3–16) | `12` | Guilloche strands per rope. |
| `speed` | number (0–4) | `1` | Wave drift speed. |
| `headline` | text | `AI PIONEER PROGRAM` | Cartouche headline. |
| `subline` | text | `ZEN AI CO · AI LITERACY` | Line under the headline. |
| `micro` | text | `ZEN AI CO · AI LITERACY · BUILT IN PUBLIC · ` | Edge microprint. |

### `certificate` — Certificate

Guilloche-bordered credential: title, recipient, program, date, serial and a gold seal. Paper or holographic.

Default aspect 1.41 · accent `#c9a45c` · output `plate` (themeable)

```html
<zen-foil scene="certificate" title="CERTIFICATE OF ACHIEVEMENT" recipient="RECIPIENT NAME" program="HAS COMPLETED THE AI LITERACY PROGRAM"></zen-foil>
```

| Param | Type | Default | Notes |
|---|---|---|---|
| `mark` | mark | `zen` | Mark in the seal. |
| `speed` | number (0–4) | `1` | Animation speed. |
| `title` | text | `CERTIFICATE OF ACHIEVEMENT` | Title line. |
| `recipient` | text | `RECIPIENT NAME` | Recipient's name. |
| `program` | text | `HAS COMPLETED THE AI LITERACY PROGRAM` | What was achieved. |
| `date` | text | `MMXXVI` | Date (left foot). |
| `serial` | text | `ZEN-AIL-2026-00000` | Credential serial (right foot). Use the real ID; the default is a placeholder. |
| `issuer` | text | `ZEN AI CO` | Issuer, above the title and around the seal. |
| `micro` | text | `ZEN AI CO · VERIFIED CREDENTIAL · AI LITERACY · ` | Border microprint. |
| `presented` | text | `THIS CERTIFIES THAT` | Line above the name. |

### `metric` — Metric plate

A decoding headline figure over an engraved, foil-lined chart of your series, with a live read head.

Default aspect 1.6 · accent `#f5d06f` · output `plate` (themeable)

```html
<zen-foil scene="metric" value="20,000+" label="SUBSCRIBERS" delta="WEEKLY RESEARCH DISPATCH"></zen-foil>
```

| Param | Type | Default | Notes |
|---|---|---|---|
| `value` | text | `20,000+` | The headline figure. |
| `label` | text | `SUBSCRIBERS` | What the figure counts. |
| `delta` | text | `WEEKLY RESEARCH DISPATCH` | Change or context line (accent). Use real figures only. |
| `headline` | text | `ZEN WEEKLY` | Plate title, top left. |
| `micro` | text | `ZEN AI CO · RESEARCH + INTELLIGENCE · ` | Edge microprint. |
| `series` | list | `12,14,13,17,19,18,23,26,25,31,34,33,39,44,43,51,56,60,66,71` | Values to chart (up to 24). The default is sample data — pass the real series. |
| `mark` | mark | `zen` | Issuer stamp, bottom right (none to omit). |
| `speed` | number (0–4) | `1` | Read-head speed. |

### `network` — Agent network

Your mark as an orchestrating hub with labelled agents on an engraved orbit and packets streaming along the links.

Default aspect 1.6 · accent `#67e8f9` · output `plate` (themeable)

```html
<zen-foil scene="network" headline="ZEN ARSENAL" subline="AGENTS · ORCHESTRATED" status="6 AGENTS ONLINE"></zen-foil>
```

| Param | Type | Default | Notes |
|---|---|---|---|
| `nodes` | list | `RESEARCH, WRITER, ANALYST, DESIGNER, CODER, OPS` | Agent labels, comma separated (up to 8). |
| `mark` | mark | `zen` | Hub mark. |
| `speed` | number (0–4) | `1` | Packet speed. |
| `headline` | text | `ZEN ARSENAL` | Title, top left. |
| `subline` | text | `AGENTS · ORCHESTRATED` | Line under the title. |
| `status` | text | `6 AGENTS ONLINE` | Status line, bottom left. |
| `micro` | text | `ARSENAL.WORLD · AGENT + APP BUILDER · ZEN AI CO · ` | Microprint around the hub orbit. |

### `engrave` — Image engraving

Turns any image into a holographic banknote engraving; reveal mode adds a full-colour loupe that follows the pointer.

Default aspect 1.33 · accent `#9cc8ff` · output `plate` (themeable)

```html
<zen-foil scene="engrave" src="/photo.jpg" micro="ZEN AI CO · ENGRAVED EDITION ·"></zen-foil>
```

| Param | Type | Default | Notes |
|---|---|---|---|
| `src` | url | — | The image (same-origin or CORS-enabled). |
| `mark` | mark | `zen` | Corner seal (none to omit). |
| `mode` | engraved / duotone / reveal | `reveal` | Rendering. |
| `frame` | rect / oval / none | `rect` | Frame shape. |
| `density` | number (0.4–3) | `1` | Line density (higher = finer). |
| `headline` | text | — | Caption title (bottom). |
| `subline` | text | — | Caption line. |
| `micro` | text | `ZEN AI CO · ENGRAVED EDITION · ` | Frame microprint. |

### `stage` — Image stage

Gallery that mints each image in through its own engraved lines, over a blurred copy of itself, with sheen and microprint.

Default aspect 1.78 · accent `#6ba3f5` · output `raw`

```html
<zen-foil scene="stage" images="/one.jpg, /two.jpg" top="VISUAL ARCHIVE · ZEN AI CO · BUILT IN PUBLIC ·" bottom="ARCHIVE OF CAMPAIGNS, INTERFACES & GENERATIVE SYSTEMS ·"></zen-foil>
```

| Param | Type | Default | Notes |
|---|---|---|---|
| `images` | list | — | Image URLs (same-origin or CORS-enabled), shown in turn. |
| `src` | url | — | Show this one image (overrides images; set it to drive the stage yourself). |
| `interval` | number (2–120) | `6` | Seconds per image. |
| `top` | text | `VISUAL ARCHIVE · ZEN AI CO · BUILT IN PUBLIC · ` | Microprint along the top. |
| `bottom` | text | `ARCHIVE OF CAMPAIGNS, INTERFACES & GENERATIVE SYSTEMS · ` | Microprint along the bottom. |

### `vault` — Crystal vault

Ray-traced glass cube with dispersion, your images (or video) printed on its faces, and engraved seals until they load.

Default aspect 1 · accent `#6fa3f5` · output `alpha`

```html
<zen-foil scene="vault" images="/a.jpg, /b.jpg, /c.jpg" frame="ZEN AI CO · VISUAL ARCHIVE · ORDO AB CHAO ·" ring="ZEN AI CO · AUTHENTIC ·"></zen-foil>
```

| Param | Type | Default | Notes |
|---|---|---|---|
| `images` | list | — | Up to six image/video URLs, one per face (same-origin or CORS-enabled). |
| `mark` | mark | `zen` | Mark on the engraved seal faces. |
| `spin` | number (-60–60) | `7` | Turn speed, degrees per second. |
| `tilt` | number (-60–60) | `-20` | Downward view angle, degrees. |
| `scroll` | boolean | `false` | Also turn with page scroll. |
| `frame` | text | `ZEN AI CO · VISUAL ARCHIVE · ORDO AB CHAO · ` | Microprint round each face. |
| `ring` | text | `ZEN AI CO · AUTHENTIC · ` | Microprint round the seal. |

### `field` — Treasury field

Page-background field of floating cipher glyphs with parallax, sheen, watermark seals and decoding phrases.

Default aspect 1.78 · accent `#5b8fd6` · output `raw`

```html
<zen-foil scene="field" fixed></zen-foil>
```

| Param | Type | Default | Notes |
|---|---|---|---|
| `variant` | light / dark | `light` | Light paper ground or dark ground. |
| `density` | number (0–1) | `0.3` | Glyph density where no region says otherwise. |
| `rate` | number (0–6) | `0.9` | Shimmer rate (glyph changes per second). |
| `seals` | boolean | `true` | Guilloche watermark seals. |
| `phrases` | list | `ORDO AB CHAO, AS ABOVE SO BELOW, SOLVE ET COAGULA, ANNUIT…` | Phrases that decode out of the noise (up to 8, 24 characters each). |

## Portfolio plates (`dist/zen-foil-showcase.js`)

These are the twenty plates from the alexleschik.com project cards. Load the showcase bundle after `zen-foil.js`, from the same place, and use them by id. They take no params (their text is part of the design), but `accent` and `theme` still apply. Read their source in `src/scenes/showcase/` for worked examples of the style.

| Scene | Project | What it shows |
|---|---|---|
| `pioneer` | AI Pioneer Program | Engraved U.S. map; the program arcs out from Washington, D.C. under the ZEN seal and each arrival mints a credential. |
| `dmv` | Boys & Girls Clubs × ZEN | Intaglio globe; the Clubs' hands mark rides great-circle arcs from D.C. to world hubs. |
| `near` | NEAR Protocol × ZEN | Sharded chunks gathered into blocks on a hash-linked chain while the NEAR mark assembles. |
| `parks` | ParkPulse | USGS-style engraved topographic sheet with a live trail. |
| `spark` | SparkLab AI | A prompt is typed; a diffusion sampler resolves halftone noise into an engraved flask. |
| `gallery` | CuratePro | One-point-perspective gallery with a roving spotlight and red dots as works sell. |
| `stem` | STEMScore | Judges' rubric polygons converge on a consensus; the leaderboard re-ranks. |
| `medcode` | MedCode | Phosphor ECG sweep driving an ICD-10 lookup behind an encryption seal. |
| `cipher` | ClinicalCipher | An engraved Alberti cipher disk re-encrypting a record as the key turns. |
| `terminal` | Prompt Playground | A terminal streams an answer token by token beside next-token probabilities. |
| `planet` | Prompt a Planet | Analytic planet with procedural continents, rings and a regeneration sweep. |
| `proto` | Prompt a Prototype | A dimensioned blueprint that renders into a shaded, engraved product shot. |
| `weekly` | ZEN Weekly | An engraved front page runs through the press, then fans out to subscribers. |
| `forge` | CanvasForge | A pen plotter inks streamlines of a divergence-free flow field. |
| `lens` | InspireLens | An engraved prime lens: knurled barrel, stepping iris, heptagonal bokeh. |
| `gravity` | GravityGrid | Ray-marched spacetime sheet sagging under an orbiting binary. |
| `toon` | Animatic Pro | Bouncing ball with squash and stretch, onion skins and timeline keys. |
| `chronos` | ChronosLife | A lifetime in weeks receding in perspective; the current week pulses. |
| `deadline` | DeadlineDash | Engraved chronograph countdown; momentum fills as time runs out. |
| `baker` | BakerSpot | Minted medallion with an engraved croissant over a map of pop-up pins. |
