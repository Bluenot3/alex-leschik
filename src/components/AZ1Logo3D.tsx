import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import az1Logo from "@/assets/az1-logo-transparent.png";
import { useInView } from "@/hooks/useInView";
import { prefersReducedMotion, useRafTicker } from "@/hooks/useRafTicker";

const REST_TILT = -8;

/**
 * Identity object — the AZ1 mark as a draggable slab. Reveals when it scrolls
 * into view, spins on the shared page clock only while visible, and writes
 * its transform straight to the DOM (no per-frame React renders).
 */
export default function AZ1Logo3D() {
  const { ref: stageRef, inView } = useInView<HTMLDivElement>({ rootMargin: "80px 0px" });
  const objRef = useRef<HTMLDivElement>(null);
  const rot = useRef({ x: REST_TILT, y: 0 });
  const vel = useRef({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number } | null>(null);
  const [revealed, setRevealed] = useState(false);
  const reduced = useMemo(() => prefersReducedMotion(), []);

  useEffect(() => {
    if (inView) setRevealed(true);
  }, [inView]);

  const apply = useCallback(() => {
    const el = objRef.current;
    if (el) el.style.transform = `rotateX(${rot.current.x.toFixed(2)}deg) rotateY(${rot.current.y.toFixed(2)}deg)`;
  }, []);

  useRafTicker(
    (_now, dt) => {
      if (!drag.current) {
        const k = dt / 16.7;
        rot.current.x += vel.current.x * k + (REST_TILT - rot.current.x) * 0.02 * k;
        rot.current.y += (vel.current.y + 0.3) * k;
        vel.current.x *= Math.pow(0.97, k);
        vel.current.y *= Math.pow(0.97, k);
      }
      apply();
    },
    inView && !reduced,
  );

  const onDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    drag.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const onMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!drag.current) return;
      const dx = e.clientX - drag.current.x;
      const dy = e.clientY - drag.current.y;
      drag.current = { x: e.clientX, y: e.clientY };
      vel.current = { x: dy * 0.3, y: dx * 0.3 };
      rot.current.x += dy * 0.4;
      rot.current.y += dx * 0.4;
      apply();
    },
    [apply],
  );

  const onUp = useCallback(() => {
    drag.current = null;
  }, []);

  return (
    <div
      ref={stageRef}
      className={`az1-stage relative w-full flex items-center justify-center py-16 select-none${revealed ? " az1-stage--in" : ""}`}
      style={{ perspective: "1200px" }}
    >
      <div
        ref={objRef}
        className="az1-object relative cursor-grab active:cursor-grabbing"
        style={{
          width: "280px",
          height: "280px",
          transformStyle: "preserve-3d",
          transform: `rotateX(${REST_TILT}deg) rotateY(0deg)`,
          touchAction: "none",
        }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
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
            alt=""
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
        }}
      />

      <p
        className="absolute bottom-2 left-1/2 -translate-x-1/2 font-mono text-[10px] tracking-[0.25em] uppercase"
        style={{ color: "hsl(var(--muted-foreground))", opacity: 0.5 }}
      >
        drag to rotate
      </p>
    </div>
  );
}
