import { useRef, useState, useCallback, useEffect } from "react";
import az1Logo from "@/assets/az1-logo-transparent.png";

interface AZ1Logo3DProps {
  progress: number;
}

export default function AZ1Logo3D({ progress }: AZ1Logo3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const velocity = useRef({ x: 0, y: 0 });
  const animFrame = useRef(0);
  const isVisible = progress > 0;

  // Auto-rotate when not dragging
  useEffect(() => {
    if (isDragging || !isVisible) return;
    let running = true;
    const spin = () => {
      if (!running) return;
      setRotation((r) => ({
        x: r.x + velocity.current.x,
        y: r.y + velocity.current.y + 0.3,
      }));
      // Decay velocity
      velocity.current.x *= 0.97;
      velocity.current.y *= 0.97;
      animFrame.current = requestAnimationFrame(spin);
    };
    animFrame.current = requestAnimationFrame(spin);
    return () => {
      running = false;
      cancelAnimationFrame(animFrame.current);
    };
  }, [isDragging, isVisible]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setIsDragging(true);
    lastPos.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - lastPos.current.x;
      const dy = e.clientY - lastPos.current.y;
      velocity.current = { x: dy * 0.3, y: dx * 0.3 };
      setRotation((r) => ({
        x: r.x + dy * 0.4,
        y: r.y + dx * 0.4,
      }));
      lastPos.current = { x: e.clientX, y: e.clientY };
    },
    [isDragging]
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  if (!isVisible) return null;

  const scale = Math.min(1, progress * 2);
  const opacity = Math.min(1, progress * 3);

  return (
    <div
      ref={containerRef}
      className="relative w-full flex items-center justify-center py-16 select-none"
      style={{ perspective: "1200px", opacity }}
    >
      <div
        className="relative cursor-grab active:cursor-grabbing"
        style={{
          width: "280px",
          height: "280px",
          transformStyle: "preserve-3d",
          transform: `scale(${scale}) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
          transition: isDragging ? "none" : "transform 0.05s linear",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* Front face */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ transform: "translateZ(40px)", backfaceVisibility: "hidden" }}
        >
          <img
            src={az1Logo}
            alt="AZ1 Logo"
            className="w-full h-full object-contain drop-shadow-2xl"
            draggable={false}
            style={{ filter: "drop-shadow(0 0 30px rgba(100,180,255,0.15))" }}
          />
        </div>
        {/* Back face */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            transform: "translateZ(-40px) rotateY(180deg)",
            backfaceVisibility: "hidden",
          }}
        >
          <img
            src={az1Logo}
            alt="AZ1 Logo"
            className="w-full h-full object-contain"
            draggable={false}
            style={{
              filter: "drop-shadow(0 0 30px rgba(100,180,255,0.15)) brightness(0.85)",
            }}
          />
        </div>
        {/* Edge - thin side panels for 3D depth */}
        {[0, 90, 180, 270].map((angle) => (
          <div
            key={angle}
            className="absolute"
            style={{
              width: "80px",
              height: "280px",
              left: "50%",
              top: 0,
              marginLeft: "-40px",
              background: "linear-gradient(180deg, hsl(215 20% 18%), hsl(215 20% 12%))",
              transform: `rotateY(${angle}deg) translateZ(40px)`,
              backfaceVisibility: "hidden",
              opacity: 0.7,
            }}
          />
        ))}
      </div>

      {/* Subtle floor reflection */}
      <div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 rounded-full"
        style={{
          width: "200px",
          height: "30px",
          background: "radial-gradient(ellipse, rgba(100,180,255,0.08) 0%, transparent 70%)",
          filter: "blur(8px)",
          transform: `translateX(-50%) scale(${scale})`,
        }}
      />

      {/* Label */}
      <p
        className="absolute bottom-2 left-1/2 -translate-x-1/2 font-mono text-[10px] tracking-[0.25em] uppercase"
        style={{ color: "hsl(var(--muted-foreground))", opacity: Math.min(0.5, progress) }}
      >
        drag to rotate
      </p>
    </div>
  );
}
