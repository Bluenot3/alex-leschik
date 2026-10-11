import { useEffect, useRef } from "react";
import { getFoilEngine } from "./engine";
import { getScene } from "./scenes";

function hexToRgb01(hex: string): [number, number, number] {
  const c = hex.replace("#", "");
  const n = parseInt(c.length === 3 ? c.replace(/./g, "$&$&") : c, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

interface FoilCanvasProps {
  /** Scene id from the registry. */
  scene: string;
  /** Accent ink, hex. */
  accent: string;
  className?: string;
  /** Element whose pointer movement drives tilt/hover (defaults to the plate). */
  targetRef?: React.RefObject<HTMLElement | null>;
}

/**
 * A live engraved-hologram plate. The host shows its CSS poster until the
 * shared foil engine (WebGPU, else WebGL2) presents the first frame.
 */
export default function FoilCanvas({ scene, accent, className = "", targetRef }: FoilCanvasProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = ref.current;
    const def = getScene(scene);
    if (!host || !def) return;
    return getFoilEngine().attach(host, {
      scene: def,
      accent: hexToRgb01(accent),
      target: targetRef?.current ?? host,
    });
  }, [scene, accent, targetRef]);

  return <div ref={ref} className={`foil-host ${className}`} aria-hidden="true" />;
}
