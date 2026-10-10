import { createContext, useContext } from "react";
import type * as THREE from "three";

/** Tag for glass meshes: `userData={GLASS}` keeps them out of the refraction buffer. */
export const GLASS = { glass: true } as const;

export const GlassBuffer = createContext<{ buffer: THREE.Texture; samples: number } | null>(null);

/** Props for a MeshTransmissionMaterial inside <SharedTransmission>. */
export function useGlass() {
  const ctx = useContext(GlassBuffer);
  if (!ctx) throw new Error("useGlass needs a <SharedTransmission> above it");
  // With a buffer supplied the material skips its own pass; a 1-pixel
  // resolution keeps the internal buffers it still creates negligible.
  return { buffer: ctx.buffer, samples: ctx.samples, resolution: 1, backsideResolution: 1 };
}
