import type { FoilScene } from "zen-foil";
import { pioneer } from "./pioneer";
import { dmv } from "./dmv";
import { near } from "./near";
import { parks } from "./parks";
import { spark } from "./spark";
import { gallery } from "./gallery";
import { stem } from "./stem";
import { medcode } from "./medcode";
import { cipher } from "./cipher";
import { terminal } from "./terminal";
import { planet } from "./planet";
import { proto } from "./proto";
import { weekly } from "./weekly";
import { forge } from "./forge";
import { lens } from "./lens";
import { gravity } from "./gravity";
import { toon } from "./toon";
import { chronos } from "./chronos";
import { deadline } from "./deadline";
import { baker } from "./baker";

/**
 * The twenty portfolio plates from alexleschik.com, each built for one
 * project. Ready to drop in by id, and the best worked examples of the
 * style: read their code before writing a new scene.
 */
const META: [FoilScene, string, string, string][] = [
  [pioneer, "#59c3ff", "AI Pioneer Program", "Engraved U.S. map; the program arcs out from Washington, D.C. under the ZEN seal and each arrival mints a credential."],
  [dmv, "#6ee7b7", "Boys & Girls Clubs × ZEN", "Intaglio globe; the Clubs' hands mark rides great-circle arcs from D.C. to world hubs."],
  [near, "#4ee6ad", "NEAR Protocol × ZEN", "Sharded chunks gathered into blocks on a hash-linked chain while the NEAR mark assembles."],
  [parks, "#86d9a8", "ParkPulse", "USGS-style engraved topographic sheet with a live trail."],
  [spark, "#ffb86b", "SparkLab AI", "A prompt is typed; a diffusion sampler resolves halftone noise into an engraved flask."],
  [gallery, "#f2a7c3", "CuratePro", "One-point-perspective gallery with a roving spotlight and red dots as works sell."],
  [stem, "#8fb4ff", "STEMScore", "Judges' rubric polygons converge on a consensus; the leaderboard re-ranks."],
  [medcode, "#5eead4", "MedCode", "Phosphor ECG sweep driving an ICD-10 lookup behind an encryption seal."],
  [cipher, "#ff8fa3", "ClinicalCipher", "An engraved Alberti cipher disk re-encrypting a record as the key turns."],
  [terminal, "#7ef0c2", "Prompt Playground", "A terminal streams an answer token by token beside next-token probabilities."],
  [planet, "#b69cff", "Prompt a Planet", "Analytic planet with procedural continents, rings and a regeneration sweep."],
  [proto, "#67e8f9", "Prompt a Prototype", "A dimensioned blueprint that renders into a shaded, engraved product shot."],
  [weekly, "#f5d06f", "ZEN Weekly", "An engraved front page runs through the press, then fans out to subscribers."],
  [forge, "#fb9a6b", "CanvasForge", "A pen plotter inks streamlines of a divergence-free flow field."],
  [lens, "#c4b5fd", "InspireLens", "An engraved prime lens: knurled barrel, stepping iris, heptagonal bokeh."],
  [gravity, "#60a5fa", "GravityGrid", "Ray-marched spacetime sheet sagging under an orbiting binary."],
  [toon, "#fda4af", "Animatic Pro", "Bouncing ball with squash and stretch, onion skins and timeline keys."],
  [chronos, "#93c5fd", "ChronosLife", "A lifetime in weeks receding in perspective; the current week pulses."],
  [deadline, "#fbbf24", "DeadlineDash", "Engraved chronograph countdown; momentum fills as time runs out."],
  [baker, "#fcd34d", "BakerSpot", "Minted medallion with an engraved croissant over a map of pop-up pins."],
];

export const SHOWCASE: FoilScene[] = META.map(([scene, accent, title, description]) => {
  scene.accent ??= accent;
  scene.title ??= title;
  scene.description ??= description;
  scene.aspect ??= 1.6;
  return scene;
});
