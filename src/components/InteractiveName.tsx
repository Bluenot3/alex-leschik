import { useRef, useEffect, useCallback } from "react";

const FIRST = "ALEXANDER";
const LAST = "LESCHIK";
const CHAR_SIZE = 7;
const GRID_STEP = 3;
const MOUSE_RADIUS = 100;
const RETURN_SPEED = 0.08;
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

export default function InteractiveName() {
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
    const d = window.devicePixelRatio || 1;
    dpr.current = d;
    const rect = container.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    canvas.width = w * d;
    canvas.height = h * d;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const fontSize = Math.min(w * 0.14, 140);
    const letterSpacing = fontSize * 0.68;
    const pts: Particle[] = [];
    let globalIdx = 0;

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

        // Each particle displays the LOWERCASE version of its parent letter
        const displayChar = char.toLowerCase();

        glyphPts.forEach((pt) => {
          pts.push({
            char: displayChar,
            homeX: cx + pt.x,
            homeY: cy + pt.y,
            x: cx + pt.x + (Math.random() - 0.5) * 300,
            y: cy + pt.y + (Math.random() - 0.5) * 300,
            vx: 0,
            vy: 0,
            rot: (Math.random() - 0.5) * 360,
            vr: 0,
            delay: globalIdx * 0.15,
            alpha: 0,
          });
          globalIdx++;
        });
      });
    });

    particles.current = pts;
    startTime.current = Date.now();
  }, []);

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

    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];

      const entranceT = Math.min(1, Math.max(0, (elapsed - p.delay) / 700));
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
          const force = ((MOUSE_RADIUS - dist) / MOUSE_RADIUS);
          const forceSq = force * force;
          const angle = Math.atan2(dy, dx);
          p.vx += Math.cos(angle) * forceSq * DISPERSE_FORCE;
          p.vy += Math.sin(angle) * forceSq * DISPERSE_FORCE;
          p.vr += (Math.random() - 0.5) * forceSq * 30;
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

      const homeDist = Math.sqrt((p.x - p.homeX) ** 2 + (p.y - p.homeY) ** 2);
      const displaceNorm = Math.min(1, homeDist / 100);

      // Rich dark text — very dark at rest, blue-shift on disperse
      const hue = 215 + displaceNorm * 25;
      const sat = 20 + displaceNorm * 40;
      const light = 5 + displaceNorm * 30;
      const a = p.alpha * Math.max(0.5, 1 - displaceNorm * 0.3);

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rot * Math.PI) / 180);
      ctx.font = `900 ${CHAR_SIZE}px "Inter", "Helvetica Neue", sans-serif`;
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
    <div
      className="interactive-name-container"
      data-reveal
      style={{
        opacity: 0,
        transform: "translateY(10px)",
        transition: "opacity 0.6s ease 0.1s, transform 0.6s ease 0.1s",
      }}
    >
      <canvas
        ref={canvasRef}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        className="interactive-name-canvas"
      />
    </div>
  );
}
