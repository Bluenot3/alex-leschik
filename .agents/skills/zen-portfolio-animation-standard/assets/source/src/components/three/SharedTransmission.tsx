import { useMemo, useRef, type ReactNode } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useFBO } from "@react-three/drei";
import * as THREE from "three";
import { GlassBuffer } from "./glass";

/**
 * One refraction buffer per canvas.
 *
 * drei's MeshTransmissionMaterial, left alone, renders the whole scene into
 * its own pair of full-size half-float buffers, once per instance per frame:
 * a field of 56 glass cubes drew itself 57 times a frame and held over
 * 100 buffers in GPU memory. Here the scene, minus the glass, is drawn once
 * into a single buffer that every glass material samples.
 *
 * Tag each glass mesh with `userData={GLASS}` and give its material
 * `{...useGlass()}` (both from ./glass).
 */
export default function SharedTransmission({
  scale = 0.6,
  samples = 6,
  children,
}: {
  /** Buffer size relative to the canvas: refraction is soft, so less is plenty. */
  scale?: number;
  /** Refraction samples per pixel. */
  samples?: number;
  children: ReactNode;
}) {
  const size = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);
  const fbo = useFBO(
    Math.max(64, Math.round(size.width * dpr * scale)),
    Math.max(64, Math.round(size.height * dpr * scale)),
  );
  const hiddenRef = useRef<THREE.Object3D[]>([]);
  const value = useMemo(() => ({ buffer: fbo.texture, samples }), [fbo, samples]);

  useFrame(({ gl, scene, camera }) => {
    const hidden = hiddenRef.current;
    hidden.length = 0;
    scene.traverse((o) => {
      if (o.userData.glass && o.visible) {
        o.visible = false;
        hidden.push(o);
      }
    });
    // The glass tone-maps the refracted image itself; don't do it twice.
    const tone = gl.toneMapping;
    gl.toneMapping = THREE.NoToneMapping;
    gl.setRenderTarget(fbo);
    gl.render(scene, camera);
    gl.setRenderTarget(null);
    gl.toneMapping = tone;
    for (const o of hidden) o.visible = true;
  });

  return <GlassBuffer.Provider value={value}>{children}</GlassBuffer.Provider>;
}
