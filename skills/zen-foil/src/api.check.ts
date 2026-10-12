/**
 * Type-level check that the hand-written dist/zen-foil.d.ts matches the
 * implementation: every implementation export must be assignable to its
 * declaration. Never bundled; `tsc -p tsconfig.json` fails on drift.
 */
import type * as Impl from "./index";
import type * as Decl from "../dist/zen-foil";

type Assignable<A extends B, B> = [A, B];
export type ApiCheck = [
  Assignable<typeof Impl.defineScene, typeof Decl.defineScene>,
  Assignable<typeof Impl.getScene, typeof Decl.getScene>,
  Assignable<typeof Impl.listScenes, typeof Decl.listScenes>,
  Assignable<typeof Impl.mount, typeof Decl.mount>,
  Assignable<typeof Impl.buildData, typeof Decl.buildData>,
  Assignable<typeof Impl.resolveParams, typeof Decl.resolveParams>,
  Assignable<typeof Impl.resolveColor, typeof Decl.resolveColor>,
  Assignable<typeof Impl.parseList, typeof Decl.parseList>,
  Assignable<typeof Impl.parseNumbers, typeof Decl.parseNumbers>,
  Assignable<typeof Impl.parsePoints, typeof Decl.parsePoints>,
  Assignable<typeof Impl.registerMark, typeof Decl.registerMark>,
  Assignable<typeof Impl.markSlot, typeof Decl.markSlot>,
  Assignable<typeof Impl.markNames, typeof Decl.markNames>,
  Assignable<typeof Impl.setClock, typeof Decl.setClock>,
  Assignable<typeof Impl.subscribeTick, typeof Decl.subscribeTick>,
  Assignable<typeof Impl.prefersReducedMotion, typeof Decl.prefersReducedMotion>,
  Assignable<ReturnType<typeof Impl.getFoilEngine>, ReturnType<typeof Decl.getFoilEngine>>,
  Assignable<typeof Impl.packText, typeof Decl.packText>,
  Assignable<typeof Impl.packPoints, typeof Decl.packPoints>,
  Assignable<typeof Impl.projectUS, typeof Decl.projectUS>,
  Assignable<typeof Impl.glyphCode, typeof Decl.glyphCode>,
  Assignable<typeof Impl.lintWgsl, typeof Decl.lintWgsl>,
  Assignable<typeof Impl.wgslToGlsl, typeof Decl.wgslToGlsl>,
  Assignable<typeof Impl.wgslModule, typeof Decl.wgslModule>,
  Assignable<typeof Impl.glslFragment, typeof Decl.glslFragment>,
  Assignable<typeof Impl.loadImage, typeof Decl.loadImage>,
  Assignable<typeof Impl.loadLayer, typeof Decl.loadLayer>,
  Assignable<typeof Impl.drawContain, typeof Decl.drawContain>,
  Assignable<typeof Impl.drawCover, typeof Decl.drawCover>,
  Assignable<typeof Impl.validateScenes, typeof Decl.validateScenes>,
  Assignable<typeof Impl.defineElement, typeof Decl.defineElement>,
  Assignable<Impl.FoilScene, Decl.FoilScene>,
  Assignable<Decl.FoilScene, Impl.FoilScene>,
  Assignable<Impl.MountOptions, Decl.MountOptions>,
  Assignable<Impl.FoilHandle, Decl.FoilHandle>,
  Assignable<Impl.MarkSource, Decl.MarkSource>,
  Assignable<Impl.ValidationResult, Decl.ValidationResult>,
  Assignable<InstanceType<typeof Impl.ZenFoilElement>, Decl.ZenFoilElement>,
];
