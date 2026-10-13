/**
 * A new zen-foil scene. Copy this file (or run scripts/new-scene.mjs), rename
 * the id, and replace the WGSL body. Register it once, anywhere before the
 * element mounts:  import "./my-scene";
 *
 * Read first: reference/authoring.md (contract + workflow) and
 * reference/aesthetic.md (what makes it look right).
 *
 * Check it:   node <skill>/scripts/check.mjs path/to/this-file.ts
 * See it:     node <skill>/scripts/preview.mjs --scenes SCENE_ID --module path/to/compiled.js --validate
 */
import { defineScene } from "zen-foil"; // or the path of your vendored copy, e.g. "@/vendor/zen-foil/zen-foil.js"

export default defineScene({
  id: "SCENE_ID",
  title: "SCENE_TITLE",
  description: "One line: what the plate shows and what moves.",
  aspect: 1.6, // preferred width / height when the page doesn't size the element
  accent: "#7cc4ff", // default ink; <zen-foil accent="…"> overrides
  still: 5.0, // scene time shown under reduced motion
  params: {
    // Text: read in WGSL with textRunP / textCenterP / textDecodeP / textLoopP / ringTextP (slot k).
    headline: { type: "text", slot: 0, default: "ZEN AI CO", description: "Main line." },
    micro: { type: "text", slot: 1, default: "ZEN AI CO · AUTHENTIC · ", description: "Microprint." },
    // Numbers / marks / choices: read with numParam(i).
    mark: { type: "mark", num: 0, default: "zen", description: "Brand mark (zen, bgc, near, a registered name, SVG path or URL)." },
    speed: { type: "number", num: 1, default: "1", min: 0, max: 4, description: "Animation speed." },
  },
  code: /* wgsl */ `
/* scene(uv, p): uv 0..1 from the top-left; p centred, y up, p.y in [-0.5, 0.5],
   p.x in [-aspect()/2, aspect()/2]. Return additive light over the plate.
   Every let/var typed, float literals with a dot, no ternaries (use select),
   no smoothstep (use sstep), fn signatures on one line. */
fn scene(uv: vec2f, p: vec2f) -> vec3f {
  let A: f32 = aspect();
  let t: f32 = tnow() * numParam(1);
  let px: f32 = pxs();
  let slot: i32 = i32(numParam(0));

  // Layout that holds from phone portrait to wide banners.
  let wide: bool = A >= 1.25;
  let C: vec2f = select(vec2f(0.0, 0.14), vec2f(-A * 0.22, 0.0), wide);
  let R: f32 = select(min(0.22, A * 0.26), min(0.32, A * 0.2), wide);

  // Ornament: a guilloche rosette band round a seal.
  let band: f32 = rosette(p, C, R * 0.78, R * 0.12, 21.0, 6, 0.32, t * 0.06);
  let sealV: vec2f = brandSeal(p, C, R * 0.55, slot);
  let ring: f32 = ringTextP(p, C, R * 1.04, R * 0.07, 1, t * 0.02, false);

  // Ground: fine engraved waves, quiet.
  let waves: f32 = engrave(p.y + 0.015 * sin(p.x * 8.0 + t * 0.05), 0.011, 0.08);

  // Type: the headline decodes in during the intro.
  let hs: f32 = textFitP(0, select(A - 0.2, A * 0.5 - 0.12, wide), 0.08);
  let hx: f32 = select(-textWidthP(0, hs) * 0.5, C.x + R * 1.25, wide);
  let hy: f32 = select(C.y - R * 1.2 - 0.04, hs * 0.5, wide);
  let head: f32 = textDecodeP(p, vec2f(hx, hy), hs, 0, 0.3, saturate((intro() - 0.3) / 0.7));

  // Light: accent/foil ink, silver type, restrained intensities.
  let ink: vec3f = inkCol(p, 1.4);
  let foil: vec3f = holo(foilPhase(p, 2.2));
  var c: vec3f = vec3f(0.0);
  c += mix(ink, foil, 0.55) * band * 0.75;
  c += mix(silver(), foil, 0.5) * sealV.x + u.accent.rgb * sealV.y;
  c += silver() * ring * 0.7 + ink * waves * 0.14;
  c += mix(silver(), holo(foilPhase(p, 1.4) + 0.3), 0.3) * head;
  c += mix(ink, silver(), 0.4) * plateFrame(p, 0.024) * 0.5;
  return c;
}
`,
});
