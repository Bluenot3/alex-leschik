import { type RefObject, useCallback, useEffect, useId, useState } from "react";
import { motion } from "framer-motion";

interface AnimatedBeamProps {
  containerRef: RefObject<HTMLElement | null>;
  fromRef: RefObject<HTMLElement | null>;
  toRef: RefObject<HTMLElement | null>;
  /** Perpendicular curvature offset in pixels */
  curvature?: number;
  /** Reverse the direction of travel */
  reverse?: boolean;
  /** Seconds for one full traversal */
  duration?: number;
  /** Delay before first travel (seconds) */
  delay?: number;
  /** Static dim path color */
  pathColor?: string;
  pathWidth?: number;
  pathOpacity?: number;
  /** Beam gradient start color (hex / hsl string) */
  gradientStartColor?: string;
  /** Beam gradient stop color */
  gradientStopColor?: string;
  /** Fine-tune where the beam starts/ends on the element */
  startXOffset?: number;
  startYOffset?: number;
  endXOffset?: number;
  endYOffset?: number;
}

export function AnimatedBeam({
  containerRef,
  fromRef,
  toRef,
  curvature = 0,
  reverse = false,
  duration = 3.5,
  delay = 0,
  pathColor = "rgba(15,23,42,0.09)",
  pathWidth = 1.5,
  pathOpacity = 1,
  gradientStartColor = "#60a5fa",
  gradientStopColor = "#a78bfa",
  startXOffset = 0,
  startYOffset = 0,
  endXOffset = 0,
  endYOffset = 0,
}: AnimatedBeamProps) {
  const rawId = useId();
  // Safe id for SVG references (no colons)
  const uid = rawId.replace(/:/g, "");

  const [pathState, setPathState] = useState<{
    d: string;
    w: number;
    h: number;
  } | null>(null);

  const measure = useCallback(() => {
    if (!containerRef.current || !fromRef.current || !toRef.current) return;
    const cr = containerRef.current.getBoundingClientRect();
    const fr = fromRef.current.getBoundingClientRect();
    const tr = toRef.current.getBoundingClientRect();

    const sx = fr.left - cr.left + fr.width / 2 + startXOffset;
    const sy = fr.top - cr.top + fr.height / 2 + startYOffset;
    const ex = tr.left - cr.left + tr.width / 2 + endXOffset;
    const ey = tr.top - cr.top + tr.height / 2 + endYOffset;

    // Perpendicular control point for curvature
    const dx = ex - sx;
    const dy = ey - sy;
    const len = Math.hypot(dx, dy) || 1;
    const cx = (sx + ex) / 2 - (dy / len) * curvature;
    const cy = (sy + ey) / 2 + (dx / len) * curvature;

    setPathState({
      d: `M ${sx},${sy} Q ${cx},${cy} ${ex},${ey}`,
      w: cr.width,
      h: cr.height,
    });
  }, [
    containerRef, fromRef, toRef, curvature,
    startXOffset, startYOffset, endXOffset, endYOffset,
  ]);

  useEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [measure]);

  if (!pathState) return null;

  const { d, w, h } = pathState;
  const pathId = `beam-path-${uid}`;
  const filterId = `beam-glow-${uid}`;

  // strokeDashoffset travels from "just before start" to "just past end"
  // pathLength="1" → dasharray 0.28 means 28% of path is the traveling segment
  const segLen = 0.28;
  const dashFrom = reverse ? -(1) : segLen;
  const dashTo   = reverse ? segLen : -(1);

  return (
    <svg
      width={w}
      height={h}
      className="pointer-events-none absolute inset-0"
      style={{ overflow: "visible", zIndex: 1 }}
      aria-hidden
    >
      <defs>
        {/* Soft glow filter applied to the traveling beam */}
        <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ── Static dim path ── */}
      <path
        d={d}
        stroke={pathColor}
        strokeWidth={pathWidth}
        strokeOpacity={pathOpacity}
        fill="none"
        strokeLinecap="round"
      />

      {/* ── Traveling glowing segment ── */}
      <motion.path
        d={d}
        stroke={gradientStartColor}
        strokeWidth={pathWidth + 1.5}
        fill="none"
        strokeLinecap="round"
        // framer-motion special prop: normalises path length to 1
        pathLength={1}
        strokeDasharray={`${segLen} ${1 - segLen}`}
        initial={{ strokeDashoffset: dashFrom }}
        animate={{ strokeDashoffset: dashTo }}
        transition={{
          duration,
          delay,
          repeat: Infinity,
          ease: "linear",
          repeatDelay: 0,
        }}
        filter={`url(#${filterId})`}
        strokeOpacity={0.9}
      />

      {/* ── Hidden path used as mpath track ── */}
      <path id={pathId} d={d} fill="none" stroke="none" />

      {/* ── Traveling spark dot ── */}
      <circle r={2.8} fill={gradientStartColor} filter={`url(#${filterId})`} opacity={0.95}>
        <animateMotion
          dur={`${duration}s`}
          begin={`${delay}s`}
          repeatCount="indefinite"
          keyPoints={reverse ? "1;0" : "0;1"}
          keyTimes="0;1"
          calcMode="linear"
        >
          <mpath href={`#${pathId}`} />
        </animateMotion>
      </circle>
    </svg>
  );
}
