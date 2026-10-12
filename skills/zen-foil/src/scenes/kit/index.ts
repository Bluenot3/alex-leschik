import type { FoilScene } from "../../types";
import { seal } from "./seal";
import { globe } from "./globe";
import { usmap } from "./usmap";
import { banner } from "./banner";
import { certificate } from "./certificate";
import { metric } from "./metric";
import { network } from "./network";
import { engrave } from "./engrave";
import { stage } from "./stage";
import { vault } from "./vault";
import { field } from "./field";

/** The parameterised kit: configure with attributes, no shader code needed. */
export const KIT: FoilScene[] = [seal, globe, usmap, banner, certificate, metric, network, engrave, stage, vault, field];
