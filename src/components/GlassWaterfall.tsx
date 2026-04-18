import az1Logo from "@/assets/az1-logo-transparent.png";

// 3 per side — no backdrop-filter, GPU-friendly flat glass
const LEFT_CUBES = [
  { size: 56, delay: 0,   duration: 14, x: 10, tiltX: 18,  tiltY: 22,  tiltZ: -8,  opacity: 0.55 },
  { size: 42, delay: 5.2, duration: 10, x: 48, tiltX: -12, tiltY: 26,  tiltZ: 6,   opacity: 0.45 },
  { size: 64, delay: 9.8, duration: 16, x: 22, tiltX: 20,  tiltY: -18, tiltZ: 10,  opacity: 0.60 },
];

const RIGHT_CUBES = [
  { size: 50, delay: 2.4, duration: 13, x: 10, tiltX: -16, tiltY: -22, tiltZ: 8,   opacity: 0.55 },
  { size: 60, delay: 7.1, duration: 15, x: 46, tiltX: 20,  tiltY: -26, tiltZ: -10, opacity: 0.62 },
  { size: 40, delay: 11.5,duration: 11, x: 28, tiltX: -10, tiltY: 18,  tiltZ: 6,   opacity: 0.44 },
];

interface CubeConfig {
  size: number; delay: number; duration: number;
  x: number; tiltX: number; tiltY: number; tiltZ: number; opacity: number;
}

function WaterfallCube({ cfg, side }: { cfg: CubeConfig; side: "left" | "right" }) {
  const { size, delay, duration, x, tiltX, tiltY, tiltZ, opacity } = cfg;
  const tilt = `perspective(320px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) rotateZ(${tiltZ}deg)`;
  const pos: React.CSSProperties = side === "left" ? { left: `${x}px` } : { right: `${x}px` };

  return (
    <div
      className="glass-waterfall-cube"
      style={{
        width: size, height: size,
        animationDelay: `-${delay}s`,
        animationDuration: `${duration}s`,
        "--cube-tilt": tilt,
        "--cube-opacity": opacity,
        ...pos,
      } as React.CSSProperties}
    >
      <img src={az1Logo} alt="" aria-hidden="true" className="glass-waterfall-cube__logo"
        style={{ width: size * 0.52, height: size * 0.52 }} />
    </div>
  );
}

export default function GlassWaterfall() {
  return (
    <>
      <div className="glass-waterfall glass-waterfall--left" aria-hidden="true">
        {LEFT_CUBES.map((cfg, i) => <WaterfallCube key={i} cfg={cfg} side="left" />)}
      </div>
      <div className="glass-waterfall glass-waterfall--right" aria-hidden="true">
        {RIGHT_CUBES.map((cfg, i) => <WaterfallCube key={i} cfg={cfg} side="right" />)}
      </div>
    </>
  );
}
