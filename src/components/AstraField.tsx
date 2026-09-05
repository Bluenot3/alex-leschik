import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { useRafTicker } from "@/hooks/useRafTicker";

interface AstraFieldProps {
  variant?: "hero" | "signature";
  formation?: number;
}

const TAU = Math.PI * 2;
const COLORS = ["44,112,169", "117,84,165", "76,132,153"];
const STARS = Array.from({ length: 84 }, (_, i) => ({
  x: ((i * 73.137 + 19.31) % 101) / 101,
  y: ((i * i * 13.731 + 7.91) % 103) / 103,
  size: i % 11 === 0 ? 1.6 : 0.65,
}));

/** Six deterministic orbital paths, on the portfolio's existing shared clock. */
export default function AstraField({ variant = "hero", formation = 0 }: AstraFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });
  const pointerRef = useRef({ x: 0, y: 0 });
  const currentRef = useRef({ x: 0, y: 0, formation: 0 });
  const timeRef = useRef(0);
  const [visible, setVisible] = useState(false);
  const reduced = useReducedMotion();

  const draw = useCallback((delta = 0) => {
    const cv = canvasRef.current;
    const ctx = cv?.getContext("2d");
    const { w, h, dpr } = sizeRef.current;
    if (!cv || !ctx || !w || !h) return;
    if (!reduced) timeRef.current += Math.min(delta, 60) * 0.00016;
    const t = timeRef.current;
    const current = currentRef.current;
    current.x += (pointerRef.current.x - current.x) * 0.07;
    current.y += (pointerRef.current.y - current.y) * 0.07;
    current.formation += (formation - current.formation) * (reduced ? 1 : 0.035);
    const f = current.formation;
    const radius = Math.min(w, h) * 0.405;
    const cx = w * 0.5;
    const cy = h * 0.5;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // The dim stars and measurement rings stay crisp; only the core blooms.
    for (const star of STARS) {
      ctx.fillStyle = `rgba(76,105,135,${star.size > 1 ? 0.6 : 0.3})`;
      ctx.fillRect(star.x * w, star.y * h, star.size, star.size);
    }
    ctx.save();
    ctx.translate(cx, cy);
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
    glow.addColorStop(0, "rgba(121,183,238,0.17)");
    glow.addColorStop(0.36, "rgba(140,129,199,0.05)");
    glow.addColorStop(1, "rgba(140,129,199,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(-cx, -cy, w, h);
    for (const scale of [0.76, 0.96, 1, 1.04]) {
      ctx.beginPath();
      ctx.arc(0, 0, radius * scale, 0, TAU);
      ctx.strokeStyle = `rgba(100,112,141,${scale === 1 ? 0.38 : 0.13})`;
      ctx.lineWidth = 0.7;
      ctx.setLineDash(scale === 0.76 ? [1, 5] : []);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    for (let i = 0; i < 120; i++) {
      const a = (i / 120) * TAU;
      const major = i % 10 === 0;
      const inner = radius * (major ? 0.91 : 0.94);
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
      ctx.lineTo(Math.cos(a) * radius * 0.96, Math.sin(a) * radius * 0.96);
      ctx.strokeStyle = `rgba(100,112,141,${major ? 0.5 : 0.22})`;
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(67,108,145,0.16)";
    for (let i = 0; i < 4; i++) {
      ctx.save();
      ctx.rotate(i * Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(radius * 0.84, 0);
      ctx.lineTo(radius * 1.08, 0);
      ctx.moveTo(radius * 1.02, -5);
      ctx.lineTo(radius * 1.02, 5);
      ctx.stroke();
      ctx.restore();
    }

    const signature = variant === "signature";
    const tilt = (reduced ? 0 : current.x * 0.16) + Math.sin(t * 0.3) * 0.06;
    ctx.rotate(signature ? t * 0.025 : -0.48 + tilt);
    for (let orbit = 0; orbit < 6; orbit++) {
      const color = COLORS[orbit % COLORS.length];
      const angle = signature ? (orbit / 6) * TAU + f * 0.14 : orbit * 0.11;
      const point = (a: number, ribbon = 0) => {
        const wave = Math.sin(a * 3 + t + orbit + ribbon * 0.7) * radius * (signature ? 0.012 : 0.006) * ribbon;
        const rx = signature ? radius * (0.44 + 0.06 * Math.sin(f * 1.6)) : radius * (0.79 + orbit * 0.047);
        const ry = signature ? radius * (0.19 + Math.sin(f * 1.4) * 0.06) : radius * (0.24 + orbit * 0.044 + current.y * 0.025);
        const x = (Math.cos(a) + (signature ? 1 : 0)) * (rx + wave);
        const y = Math.sin(a) * (ry + wave);
        return [x * Math.cos(angle) - y * Math.sin(angle), x * Math.sin(angle) + y * Math.cos(angle)];
      };
      for (let ribbon = 0; ribbon < 3; ribbon++) {
        ctx.beginPath();
        for (let step = 0; step <= 180; step++) {
          const [x, y] = point((step / 180) * TAU, ribbon);
          if (step === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(${color},${ribbon === 0 ? 0.83 : 0.29})`;
        ctx.lineWidth = ribbon === 0 ? 0.9 : 0.5;
        ctx.stroke();
      }
      // A bright moving arc leaves a precise, short trail along each orbit.
      const head = t * (orbit % 2 ? -0.7 : 0.55) + orbit * 1.047;
      ctx.beginPath();
      for (let step = 0; step <= 24; step++) {
        const [x, y] = point(head - 0.28 + step / 24 * 0.28);
        if (step === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `rgba(${color},0.9)`;
      ctx.lineWidth = 1.7;
      ctx.stroke();
      const [x, y] = point(head);
      ctx.beginPath();
      ctx.arc(x, y, orbit % 2 ? 2 : 3, 0, TAU);
      ctx.fillStyle = `rgb(${color})`;
      ctx.shadowColor = `rgb(${color})`;
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.shadowBlur = 0;
      if (signature) {
        for (let star = 0; star < 28; star++) {
          const [sx, sy] = point(star / 28 * TAU + orbit * 0.13, 2);
          ctx.fillStyle = `rgba(${color},${star % 7 === 0 ? 0.85 : 0.38})`;
          const size = star % 7 === 0 ? 1.8 : 0.8;
          ctx.fillRect(sx - size / 2, sy - size / 2, size, size);
        }
      }
    }
    if (signature) {
      ctx.rotate(-t * 0.025);
      const core = ctx.createRadialGradient(0, 0, 1, 0, 0, 30);
      core.addColorStop(0, "rgba(31,102,164,1)");
      core.addColorStop(0.12, "rgba(76,145,205,0.8)");
      core.addColorStop(1, "rgba(76,145,205,0)");
      ctx.fillStyle = core;
      ctx.fillRect(-30, -30, 60, 60);
      ctx.strokeStyle = "rgba(37,93,145,0.9)";
      for (let i = 0; i < 6; i++) {
        ctx.rotate(TAU / 6);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, 17);
        ctx.stroke();
      }
    }
    ctx.restore();
  }, [formation, reduced, variant]);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const resize = () => {
      const { width: w, height: h } = cv.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      sizeRef.current = { w, h, dpr };
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      draw();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(cv);
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    io.observe(cv);
    resize();
    return () => { ro.disconnect(); io.disconnect(); };
  }, [draw]);

  useRafTicker((_now, delta) => draw(delta), visible && !reduced, 1000 / 30);

  return <canvas
    ref={canvasRef}
    className={`astra-field astra-field--${variant}`}
    aria-hidden="true"
    onPointerMove={(event) => {
      const rect = event.currentTarget.getBoundingClientRect();
      pointerRef.current = { x: (event.clientX - rect.left) / rect.width - 0.5, y: (event.clientY - rect.top) / rect.height - 0.5 };
    }}
    onPointerLeave={() => { pointerRef.current = { x: 0, y: 0 }; }}
  />;
}
