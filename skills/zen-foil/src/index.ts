/**
 * zen-foil — engraved-hologram GPU plates for any web project.
 *
 *   <script type="module" src=".../zen-foil.js"></script>
 *   <zen-foil scene="seal" headline="ZEN AI CO" accent="#7cc4ff"></zen-foil>
 *
 * WebGPU with an automatic WebGL2 fallback, one GPU device for every plate
 * on the page, DPR/visibility/resize/reduced-motion safeguards built in.
 * Docs: SKILL.md and reference/ beside this bundle's source.
 */
import { defineScene, getScene, listScenes, mount, buildData, resolveParams, resolveColor, parseList, parseNumbers, parsePoints, SCENE_DATA_BASE } from "./scene";
import { registerMark, markSlot, markNames } from "./marks";
import { setClock, subscribeTick, prefersReducedMotion } from "./clock";
import { getFoilEngine } from "./engine";
import { layoutText, packText, packPoints, projectUS, glyphCode, GLYPH_TABLE, LOGO } from "./atlas";
import { wgslToGlsl } from "./translate";
import { lintWgsl, libraryNames } from "./lint";
import { wgslModule, glslFragment } from "./program";
import { LIBRARY } from "./library";
import { loadImage, loadLayer, drawContain, drawCover, videoLayer, LayerLoadError } from "./images";
import { validateScenes } from "./validate";
import { ZenFoilElement, defineElement } from "./element";
import { KIT } from "./scenes/kit";
import { describe, snippet, checkTag, checkPage, setKitIds, VERSION_REF, ELEMENT_SPEC } from "./describe";

export {
  defineScene,
  getScene,
  listScenes,
  mount,
  buildData,
  resolveParams,
  resolveColor,
  parseList,
  parseNumbers,
  parsePoints,
  SCENE_DATA_BASE,
  registerMark,
  markSlot,
  markNames,
  setClock,
  subscribeTick,
  prefersReducedMotion,
  getFoilEngine,
  layoutText,
  packText,
  packPoints,
  projectUS,
  glyphCode,
  GLYPH_TABLE,
  LOGO,
  lintWgsl,
  libraryNames,
  wgslToGlsl,
  wgslModule,
  glslFragment,
  LIBRARY,
  loadImage,
  loadLayer,
  drawContain,
  drawCover,
  videoLayer,
  LayerLoadError,
  validateScenes,
  ZenFoilElement,
  defineElement,
  describe,
  snippet,
  checkTag,
  checkPage,
  ELEMENT_SPEC,
};
export type { FoilHandle, MountOptions } from "./scene";
export type { MarkSource, MarkChannel } from "./marks";
export type { RendererStatus } from "./engine";
export type { ValidationResult } from "./validate";
export type { Manifest, SceneManifest, ParamManifest, AttributeManifest, Problem, ProblemLevel, PageProblem, SnippetOptions } from "./describe";
export type { TickFn, SubscribeTick } from "./clock";
export type {
  FoilScene,
  ParamSpec,
  ParamValues,
  PostMode,
  Theme,
  LayerSpec,
  LayerSource,
  Behavior,
  BehaviorContext,
} from "./types";

export const VERSION = "1.1.0";
/** Ids of the built-in kit scenes. */
export const KIT_IDS = KIT.map((s) => s.id);

VERSION_REF.value = VERSION;
setKitIds(KIT.map((s) => s.id));
KIT.forEach((scene) => defineScene(scene));
defineElement();

/* For pages that load the bundle with a plain <script type="module"> (a
   CDN tag, Lovable) and want the API without an import: every export, plus
   the short aliases validate, lint and engine. */
if (typeof window !== "undefined") {
  (window as unknown as { ZenFoil: unknown }).ZenFoil = {
    VERSION,
    KIT_IDS,
    defineScene,
    getScene,
    listScenes,
    mount,
    buildData,
    resolveParams,
    resolveColor,
    parseList,
    parseNumbers,
    parsePoints,
    SCENE_DATA_BASE,
    registerMark,
    markSlot,
    markNames,
    setClock,
    subscribeTick,
    prefersReducedMotion,
    getFoilEngine,
    layoutText,
    packText,
    packPoints,
    projectUS,
    glyphCode,
    GLYPH_TABLE,
    LOGO,
    lintWgsl,
    libraryNames,
    wgslToGlsl,
    wgslModule,
    glslFragment,
    LIBRARY,
    loadImage,
    loadLayer,
    drawContain,
    drawCover,
    videoLayer,
    LayerLoadError,
    validateScenes,
    ZenFoilElement,
    defineElement,
    describe,
    snippet,
    checkTag,
    checkPage,
    ELEMENT_SPEC,
    check: checkPage,
    validate: validateScenes,
    lint: lintWgsl,
    engine: getFoilEngine,
  };
}
