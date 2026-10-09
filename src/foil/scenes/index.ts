import type { FoilScene } from "../types";
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
import { field } from "./field";

/** Every portfolio plate, in portfolio order. */
const ORDER: FoilScene[] = [
  pioneer,
  dmv,
  near,
  parks,
  spark,
  gallery,
  stem,
  medcode,
  cipher,
  terminal,
  planet,
  proto,
  weekly,
  forge,
  lens,
  gravity,
  toon,
  chronos,
  deadline,
  baker,
];

/** Page-level systems that are not portfolio plates. */
const SYSTEM: FoilScene[] = [field];

const SCENES: Record<string, FoilScene> = Object.fromEntries([...ORDER, ...SYSTEM].map((s) => [s.id, s]));

export function getScene(id: string): FoilScene | undefined {
  return SCENES[id];
}

export function allScenes(): FoilScene[] {
  return ORDER;
}

export function systemScenes(): FoilScene[] {
  return SYSTEM;
}
