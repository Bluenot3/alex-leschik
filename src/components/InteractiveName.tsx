import { useRef, useEffect, useCallback } from "react";

const FIRST = "ALEXANDER";
const LAST = "LESCHIK";
const CHAR_SIZE = 7;
const GRID_STEP = 2;
const MOUSE_RADIUS = 120;
const RETURN_SPEED = 0.09;
const DISPERSE_FORCE = 22;

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
  delay: number;
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
  const dims = useRef({ w: 0, h: 0 });

  const init = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const d = Math.min(window.devicePixelRatio || 1, 2);
    dpr.current = d;
    const w = window.innerWidth;
    const h = window.innerHeight;
    dims.current = { w, h };
    canvas.width = w * d;
    canvas.height = h * d;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    // Size text to fill the viewport width
    const fontSize = Math.min(w * 0.22, h * 0.38, 320);
    const letterSpacing = fontSize * 0.72;
    const pts: Particle[] = [];
    let globalIdx = 0;

    const lines = [FIRST, LAST];
    lines.forEach((line, lineIdx) => {
      const chars = line.split("");
      const totalW = chars.length * letterSpacing;
      const startX = (w - totalW) / 2;
      const lineY = lineIdx === 0 ? h * 0.38 : h * 0.68;

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
            x: cx + pt.x + (Math.random() - 0.5) * 120,
            y: cy + pt.y + (Math.random() - 0.5) * 120,
            vx: 0,
            vy: 0,
            rot: (Math.random() - 0.5) * 90,
            vr: 0,
            delay: globalIdx * 0.03,
            alpha: 0,
          });
          globalIdx++;
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
    const sp = scrollRef.current;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(d, d);

    const { w, h } = dims.current;
    const rSq = MOUSE_RADIUS * MOUSE_RADIUS;
    const ps = particles.current;

    // Scroll-driven transformations
    // Phase 1 (0–0.15): particles assemble (entrance)
    // Phase 2 (0.15–0.5): stable with parallax drift
    // Phase 3 (0.5–0.8): spread apart / dissolve outward
    // Phase 4 (0.8–1): fade out

    const parallaxX = Math.sin(sp * Math.PI * 2) * w * 0.03;
    const parallaxY = sp * -h * 0.08;
    const spreadFactor = sp > 0.5 ? (sp - 0.5) / 0.3 : 0;
    const spreadClamp = Math.min(1, spreadFactor);
    const fadeOut = sp > 0.7 ? 1 - (sp - 0.7) / 0.3 : 1;
    const globalAlpha = Math.max(0, Math.min(1, fadeOut));

    // Scale up slightly as user scrolls
    const scaleBoost = 1 + sp * 0.06;

    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];

      const entranceT = Math.min(1, Math.max(0, (elapsed - p.delay) / 700));
      const ease = 1 - Math.pow(1 - entranceT, 3);
      p.alpha = ease * globalAlpha;

      if (p.alpha < 0.01) continue;

      // Spread effect: push particles outward from center
      const cxOff = (p.homeX - w / 2) * spreadClamp * 1.8;
      const cyOff = (p.homeY - h / 2) * spreadClamp * 1.2;

      const targetX = (p.homeX + cxOff + parallaxX) * scaleBoost - (scaleBoost - 1) * w / 2;
      const targetY = (p.homeY + cyOff + parallaxY) * scaleBoost - (scaleBoost - 1) * h / 2;

      if (entranceT < 1) {
        p.x += (targetX - p.x) * 0.06;
        p.y += (targetY - p.y) * 0.06;
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
          p.vr += (Math.random() - 0.5) * forceSq * 30;
        }

        p.vx += (targetX - p.x) * RETURN_SPEED;
        p.vy += (targetY - p.y) * RETURN_SPEED;
        p.vr *= 0.88;
        p.rot += p.vr;
        p.vx *= 0.84;
        p.vy *= 0.84;
        p.x += p.vx;
        p.y += p.vy;
      }

      const homeDist = Math.sqrt((p.x - targetX) ** 2 + (p.y - targetY) ** 2);
      const displaceNorm = Math.min(1, homeDist / 100);

      const hue = 218 + displaceNorm * 15;
      const sat = 18 + displaceNorm * 30;
      const light = 28 + displaceNorm * 18;
      const a = p.alpha * Math.max(0.55, 0.85 - displaceNorm * 0.25);

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rot * Math.PI) / 180);
      ctx.font = `900 ${CHAR_SIZE}px "Bebas Neue", "Inter", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
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

  return (
    <canvas
      ref={canvasRef}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="fixed inset-0 z-0 pointer-events-auto"
      style={{ cursor: "default" }}
    />
  );
}
