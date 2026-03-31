import { useMemo } from "react";

import cubeImg1 from "@/assets/hero-cube-1.jpg";
import cubeImg2 from "@/assets/hero-cube-2.jpg";
import cubeImg3 from "@/assets/hero-cube-3.jpg";
import cubeImg4 from "@/assets/hero-cube-4.jpg";
import cubeImg5 from "@/assets/hero-cube-5.jpg";
import cubeImg6 from "@/assets/hero-cube-6.jpg";

const VORTEX_IMAGES = [cubeImg1, cubeImg2, cubeImg3, cubeImg4, cubeImg5, cubeImg6, cubeImg1, cubeImg2, cubeImg3, cubeImg4, cubeImg5, cubeImg6];

interface ImageVortexProps {
  progress: number; // 0-1 overall scroll progress
}

export default function ImageVortex({ progress }: ImageVortexProps) {
  // Only activate after 50% scroll
  const vortexProgress = Math.max(0, (progress - 0.45) / 0.55);
  const isVisible = vortexProgress > 0;

  const items = useMemo(() => {
    const count = VORTEX_IMAGES.length;
    return VORTEX_IMAGES.map((src, i) => {
      const angle = (i / count) * Math.PI * 2;
      const depthOffset = (i / count) * 100;
      return { src, angle, depthOffset, index: i };
    });
  }, []);

  if (!isVisible) return null;

  return (
    <div className="vortex-container" style={{ opacity: Math.min(1, vortexProgress * 2.5) }}>
      <div className="vortex-tunnel" style={{ perspective: "800px" }}>
        {items.map((item) => {
          const t = vortexProgress;
          // Spiral outward as scroll increases
          const radius = 30 + t * 35;
          const spin = item.angle + t * Math.PI * 3;
          const x = Math.cos(spin) * radius;
          const y = Math.sin(spin) * radius;
          const z = -item.depthOffset * t * 8 + t * 300 - 150;
          const scale = Math.max(0.3, 1 - item.depthOffset * 0.006);
          const rotateZ = spin * (180 / Math.PI) * 0.3;
          const imgOpacity = Math.min(1, t * 3) * (0.4 + 0.6 * (1 - item.depthOffset / 100));

          return (
            <div
              key={item.index}
              className="vortex-item"
              style={{
                transform: `translate3d(${x}vw, ${y}vh, ${z}px) rotateZ(${rotateZ}deg) scale(${scale})`,
                opacity: imgOpacity,
              }}
            >
              <img src={item.src} alt="" loading="lazy" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
