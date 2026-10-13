# The zen-foil aesthetic

This is security printing brought to life. Picture a Treasury note or a passport laminate, engraved and then lit from behind. It reads as authority and craft: something that was *issued*, not decorated. These rules keep it there.

## The vocabulary

| Element | What it is | Library |
|---|---|---|
| **Substrate** | Deep navy plate (or warm security paper) with faint guilloche in one corner. The post pass supplies it. | `theme` |
| **Intaglio line work** | Parallel burin lines whose weight follows tone, bending over form. This is the main way to render anything with volume: maps, globes, faces, areas under charts. | `engrave`, `engraveP` |
| **Guilloche** | Interlaced sinusoidal strands: rosettes, ropes and borders. It is the signature ornament. | `rosette`, `guillocheBand`, scene ropes |
| **Microprint** | Tiny tracked caps along edges, around rings and under rules. It rewards a close look. | `textLoopP`, `ringTextP` |
| **Seals** | Rings, a guilloche band and a mark at the centre. They carry authority, so use one or two per plate. | `brandSeal`, `sunburst` |
| **Foil** | Silver-holographic colour that shifts with tilt, pointer and scroll. It is light, not paint. | `holo`, `foilPhase`, `inkCol` |
| **Cipher** | Glyphs that re-roll and then settle into words: the "decode". | `textDecodeP`, `cipherRun` |

Everything is drawn **analytically** in the shader: lines, text and marks come from distance fields. It stays sharp at any DPR and never shimmers, and there are no bitmaps except your own photos.

## Colour

- **Pick one accent per plate, from the brand.** The ink is accent blended with foil, so even a muted brand colour gets life from the foil.
- **Silver is the neutral.** Use `silver()` for type and keylines, and `gold()` for credentials and serials (sparingly). Use the foil for the hero lines.
- **Dark plates stay dark.** Brightness should come from thin lines, not filled areas. If a plate looks washed out, cut intensities (multiply by 0.5–0.8) before adding anything new.
- **Paper** (`theme="paper"`) prints the same scene as ink on cream. Use it on light sites, for certificates, and for anything meant to look printable. Check it, because glows become washes on paper.
- **Clear** (`theme="clear"`) lays only the ink over your own background, a photo or a video. Keep that background dark.
- **No rainbow text, no neon glows, no saturated fills.** Iridescence belongs on line work and seals.

## Composition

- **One focal object** per plate: a medallion, a globe, a chart, a portrait. Give it room. Keep the furniture around it (keylines, corner rosettes, edge microprint) quiet.
- **Use a text column on wide plates and stack on narrow ones.** The kit scenes switch at an aspect ratio of about 1.25. Your scenes should do the same, and be tested at 0.75, 1.0, 1.6 and 2.4+.
- **Keep about 0.07 (in plate-height units) of safe margin** from the edges. Microprint and keylines live inside it.
- **Give type a clear hierarchy:**
  - eyebrow: 0.019, wide-tracked;
  - headline: 0.05–0.095, fitted with `textFitP`;
  - subline: 0.026–0.03;
  - serial: 0.028, in gold;
  - caption and microprint: 0.012–0.018.
- **Big figures (stats) use tight tracking:** `textRunPT` / `textDecodePT` with a track of about 0.44. Labels keep the open 0.6.

## Motion

- **Use slow, physical cadences:**
  - guilloche phase drifts at 0.03–0.1 rad/s;
  - globes turn under 0.1 rad/s;
  - sheen bands cross every 8–16 s;
  - stamps and pulses come every 6–10 s.
- **Events have a cause.** An arc *arrives*, then a ring stamps. A packet *lands*, then the node flashes. A serial ticks *with* the stamp.
- **The minting intro** plays when a plate first scrolls into view, in three beats over 2.4 s:
  1. a burin cuts the line work in along a wavering diagonal, in bare silver ink (plain ink on paper);
  2. the foil floods the colour in behind it;
  3. the plate is pressed: a brief bloom as the impression lands, while the headline decodes.

  The post pass and `intro()` provide it, so don't add another entrance. `element.replay()` plays it again (for a "re-mint" control, or after swapping content).
- **A glint every ~11 s:** a narrow light crosses the line work, as if the plate were tilted under a lamp. Each plate's seed staggers it, so plates on a page glint in turn, never together.
- **The pointer adds light, not motion.** Near the pointer the line work brightens and iridises (the torch), a loupe opens, or a cube leans. On touch screens, scroll tilt takes over automatically.
- **Pressing stamps.** A press sends a guilloche ring out from that point across the line work (a blind emboss on paper). It is the plate's only response to a click, so don't add click animations on top.
- **Reduced motion** turns all of this off: one still per plate, no glint, no stamp.
- **The still** under reduced motion is the scene's `still` time. Choose a moment where the story reads: an arrival, a stamp, a decoded headline.

## Copy

- Engraved text is **UPPERCASE**, short and **true**. Use the client's real name, program, numbers, URLs and dates.
- **Never invent figures, credentials, partners or dates.** If you don't have a number, use a different scene or leave the param empty.
- Microprint can carry a motto (Latin is traditional: `ORDO AB CHAO`, `ANNUIT COEPTIS`). It can also repeat the brand line, or carry a URL. Avoid hype words.
- The glyph atlas covers ASCII and `·•→←±×÷≈≡∞△◇◈✦αλΣΩπ∇∂`, plus a few kana. `—` prints as `-`, curly quotes as straight quotes, and accented letters as their base letter. Anything else prints as `·`.

## Page recipes

- **Hero:**
  - `seal`, or `vault` with the brand's six images, on the left or behind;
  - a real `<h1>` and CTA in the DOM;
  - a low `field` (`fixed`, `density="0.25"`) behind the whole page.
- **Project/feature cards:**
  - one plate per card at 16:10, each with its own accent;
  - for the hover effect, wire the card itself as the pointer target. Put the plate inside the card: it reacts to pointer movement over the plate.
- **Stats band:**
  - two or three `metric` plates with the client's real figures;
  - or one `banner` with the headline figure.
- **Reach:**
  - `globe` (international) or `usmap` (domestic), with the real hub list;
  - a partner lockup, using `mark` × `partner`.
- **Credential/about:**
  - `certificate` (`theme="paper"` on light sites) or `engrave` with the founder's or product photo in `reveal` mode.
- **Gallery:**
  - `stage` with an `images` list;
  - `vault` as a featured showcase.
- **Dividers:**
  - `banner` at 6:1, with `strands="10"`, a short headline, and the mark at the ends.

## Don'ts

- Don't stack many large plates in one viewport. More than about 8 visible plates costs GPU time and attention.
- Don't use the foil as a background gradient behind body text.
- Don't caption plates with marketing superlatives. The craft speaks for itself.
- Don't use marks you don't have rights to. The ZEN, Boys & Girls Clubs and NEAR marks are for ZEN AI Co. work and its partners.
- Don't ship a scene you haven't looked at in a screenshot at phone and desktop sizes.
