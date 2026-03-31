import { useRef, useEffect, useCallback } from "react";

const FIRST = "ALEXANDER";
const LAST = "LESCHIK";
const CHAR_SIZE = 7;
const GRID_STEP = 3; // coarser sampling = far fewer particles
const MOUSE_RADIUS = 100;
const RETURN_SPEED = 0.09;
const DISPERSE_FORCE = 18;

interface Particle {
  char: string;
  homeX: number;
  homeY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  alpha: number;
}

function sampleGlyph(
  char: string,
  fontSize: number,
  step: number
): { x: number; y: number }[] {
  const c = document.createElement("canvas");
  const s = Math.ceil(fontSize * 1.4);
  c.width = s;
  c.height = s;
  const ctx = c.getContext("2d")!;
  ctx.font = `900 ${fontSize}px "Bebas Neue", Impact, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#000";
  ctx.fillText(char, s / 2, s / 2);
  const id = ctx.getImageData(0, 0, s, s);
  const pts: { x: number; y: number }[] = [];
  for (let py = 0; py < s; py += step) {
    for (let px = 0; px < s; px += step) {
      if (id.data[(py * s + px) * 4 + 3] > 60) {
        pts.push({ x: px - s / 2, y: py - s / 2 });
      }
    }
  }
  return pts;
}

interface Props {
  scrollProgress: number;
}

export default function InteractiveName({ scrollProgress }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const mouse = useRef({ x: -9999, y: -9999 });
  const raf = useRef(0);
  const dpr = useRef(1);
  const startTime = useRef(Date.now());

  const init = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const container = canvas.parentElement!;
    const d = Math.min(window.devicePixelRatio || 1, 2);
    dpr.current = d;
    const rect = container.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    canvas.width = w * d;
    canvas.height = h * d;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const fontSize = Math.min(w * 0.14, 140);
    const letterSpacing = fontSize * 0.72;
    const pts: Particle[] = [];

    const lines = [FIRST, LAST];
    lines.forEach((line, lineIdx) => {
      const chars = line.split("");
      const totalW = chars.length * letterSpacing;
      const startX = (w - totalW) / 2;
      const lineY = lineIdx === 0 ? h * 0.36 : h * 0.72;

      chars.forEach((char, ci) => {
        const cx = startX + ci * letterSpacing + letterSpacing * 0.5;
        const cy = lineY;
        const glyphPts = sampleGlyph(char, fontSize, GRID_STEP);
        const displayChar = char.toLowerCase();

        glyphPts.forEach((pt) => {
          pts.push({
            char: displayChar,
            homeX: cx + pt.x,
            homeY: cy + pt.y,
            x: cx + pt.x + (Math.random() - 0.5) * 60,
            y: cy + pt.y + (Math.random() - 0.5) * 60,
            vx: 0,
            vy: 0,
            rot: (Math.random() - 0.5) * 60,
            vr: 0,
            alpha: 0,
          });
        });
      });
    });

    particles.current = pts;
    startTime.current = Date.now();
  }, []);

  const scrollRef = useRef(0);
  scrollRef.current = scrollProgress;

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const d = dpr.current;
    const m = mouse.current;
    const elapsed = Date.now() - startTime.current;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(d, d);

    const rSq = MOUSE_RADIUS * MOUSE_RADIUS;
    const ps = particles.current;

    // Batch font set once
    ctx.font = `900 ${CHAR_SIZE}px "Bebas Neue", "Inter", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];

      // Simple entrance — clamp to 700ms
      const entranceT = Math.min(1, elapsed / 700);
      const ease = 1 - Math.pow(1 - entranceT, 3);
      p.alpha = ease;

      if (entranceT < 1) {
        p.x += (p.homeX - p.x) * 0.06;
        p.y += (p.homeY - p.y) * 0.06;
        p.rot *= 0.94;
      } else {
        const dx = p.x - m.x;
        const dy = p.y - m.y;
        const distSq = dx * dx + dy * dy;

        if (distSq < rSq && distSq > 0.01) {
          const dist = Math.sqrt(distSq);
          const force = (MOUSE_RADIUS - dist) / MOUSE_RADIUS;
          const forceSq = force * force;
          const angle = Math.atan2(dy, dx);
          p.vx += Math.cos(angle) * forceSq * DISPERSE_FORCE;
          p.vy += Math.sin(angle) * forceSq * DISPERSE_FORCE;
          p.vr += (Math.random() - 0.5) * forceSq * 25;
        }

        p.vx += (p.homeX - p.x) * RETURN_SPEED;
        p.vy += (p.homeY - p.y) * RETURN_SPEED;
        p.vr *= 0.88;
        p.rot += p.vr;
        p.vx *= 0.84;
        p.vy *= 0.84;
        p.x += p.vx;
        p.y += p.vy;
      }

      const homeDist = Math.abs(p.x - p.homeX) + Math.abs(p.y - p.homeY);
      const displaceNorm = Math.min(1, homeDist / 120);

      const hue = 218 + displaceNorm * 15;
      const sat = 18 + displaceNorm * 30;
      const light = 28 + displaceNorm * 18;
      const a = p.alpha * Math.max(0.55, 0.85 - displaceNorm * 0.25);

      if (a < 0.02) continue;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rot * Math.PI) / 180);
      ctx.fillStyle = `hsla(${hue}, ${sat}%, ${light}%, ${a})`;
      ctx.fillText(p.char, 0, 0);
      ctx.restore();
    }

    ctx.restore();
    raf.current = requestAnimationFrame(render);
  }, []);

  useEffect(() => {
    init();
    raf.current = requestAnimationFrame(render);
    window.addEventListener("resize", init);
    return () => {
      cancelAnimationFrame(raf.current);
      window.removeEventListener("resize", init);
    };
  }, [init, render]);

  const onMove = useCallback((e: React.MouseEvent) => {
    const c = canvasRef.current;
    if (!c) return;
    const r = c.getBoundingClientRect();
    mouse.current = { x: e.clientX - r.left, y: e.clientY - r.top };
  }, []);

  const onLeave = useCallback(() => {
    mouse.current = { x: -9999, y: -9999 };
  }, []);

  // Scroll-driven CSS transforms for smooth parallax without per-particle recalc
  const opacity = Math.max(0, 1 - scrollProgress * 1.5);
  const yShift = scrollProgress * -40;
  const scale = 1 + scrollProgress * 0.04;

  return (
    <div
      className="fixed inset-0 z-0 flex items-center justify-center pointer-events-none"
      style={{
        opacity,
        transform: `translate3d(0, ${yShift}vh, 0) scale(${scale})`,
        willChange: "transform, opacity",
      }}
    >
      <div
        className="pointer-events-auto w-full"
        style={{ height: "clamp(220px, 36vw, 420px)" }}
      >
        <canvas
          ref={canvasRef}
          onMouseMove={onMove}
          onMouseLeave={onLeave}
          className="block w-full h-full"
          style={{ cursor: "default" }}
        />
      </div>
    </div>
  );
}
