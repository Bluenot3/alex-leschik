import { useRef, useEffect, useCallback } from "react";

const NAME = "ALEXANDER LESCHIK";
const PARTICLE_FONT_SIZE = 5; // px — tiny letters
const GRID_STEP = 6; // spacing between particles
const MOUSE_RADIUS = 60; // px radius of dispersion
const RETURN_SPEED = 0.08; // how fast particles return (0-1)
const DISPERSE_FORCE = 12; // how far particles fly

interface Particle {
  char: string;
  homeX: number;
  homeY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  vr: number;
}

/**
 * For each big letter, sample a grid of positions that fall inside the letter shape.
 * We render the letter to an offscreen canvas, read pixels, and keep positions where alpha > 0.
 */
function sampleLetterShape(
  char: string,
  fontSize: number,
  gridStep: number
): { x: number; y: number }[] {
  const canvas = document.createElement("canvas");
  const size = Math.ceil(fontSize * 1.3);
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.font = `bold ${fontSize}px "Bebas Neue", Impact, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#000";
  ctx.fillText(char, size / 2, size / 2);

  const imageData = ctx.getImageData(0, 0, size, size);
  const points: { x: number; y: number }[] = [];

  for (let py = 0; py < size; py += gridStep) {
    for (let px = 0; px < size; px += gridStep) {
      const idx = (py * size + px) * 4;
      if (imageData.data[idx + 3] > 80) {
        points.push({ x: px - size / 2, y: py - size / 2 });
      }
    }
  }
  return points;
}

export default function InteractiveName() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const rafRef = useRef<number>(0);
  const dprRef = useRef(1);

  const init = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const container = canvas.parentElement!;
    const dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr;
    const rect = container.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    // Layout: two lines
    const lines = NAME.split(" ");
    const bigFontSize = Math.min(w * 0.12, 100);
    const particles: Particle[] = [];

    lines.forEach((line, lineIdx) => {
      const chars = line.split("");
      const totalLetterWidth = chars.length * bigFontSize * 0.7;
      const startX = (w - totalLetterWidth) / 2;
      const startY = lineIdx === 0 ? h * 0.3 : h * 0.7;

      chars.forEach((char, charIdx) => {
        const letterCenterX = startX + charIdx * bigFontSize * 0.7 + bigFontSize * 0.35;
        const letterCenterY = startY;
        const points = sampleLetterShape(char, bigFontSize, GRID_STEP);

        points.forEach((pt) => {
          particles.push({
            char,
            homeX: letterCenterX + pt.x,
            homeY: letterCenterY + pt.y,
            x: letterCenterX + pt.x,
            y: letterCenterY + pt.y,
            vx: 0,
            vy: 0,
            rotation: 0,
            vr: 0,
          });
        });
      });
    });

    particlesRef.current = particles;
  }, []);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = dprRef.current;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    const mouse = mouseRef.current;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(dpr, dpr);

    const particles = particlesRef.current;
    const rSq = MOUSE_RADIUS * MOUSE_RADIUS;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      // Mouse repulsion
      const dx = p.x - mouse.x;
      const dy = p.y - mouse.y;
      const distSq = dx * dx + dy * dy;

      if (distSq < rSq && distSq > 0.01) {
        const dist = Math.sqrt(distSq);
        const force = (MOUSE_RADIUS - dist) / MOUSE_RADIUS;
        const angle = Math.atan2(dy, dx);
        p.vx += Math.cos(angle) * force * DISPERSE_FORCE;
        p.vy += Math.sin(angle) * force * DISPERSE_FORCE;
        p.vr += (Math.random() - 0.5) * force * 20;
      }

      // Spring back to home
      p.vx += (p.homeX - p.x) * RETURN_SPEED;
      p.vy += (p.homeY - p.y) * RETURN_SPEED;
      p.vr *= 0.92; // rotation damping
      p.rotation += p.vr;

      // Damping
      p.vx *= 0.88;
      p.vy *= 0.88;

      p.x += p.vx;
      p.y += p.vy;

      // Draw the mini letter
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.font = `${PARTICLE_FONT_SIZE}px "Bebas Neue", Impact, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Opacity based on distance from home (more displaced = more transparent)
      const homeDist = Math.sqrt(
        (p.x - p.homeX) ** 2 + (p.y - p.homeY) ** 2
      );
      const alpha = Math.max(0.2, 1 - homeDist / 120);
      ctx.fillStyle = `hsla(215, 25%, 12%, ${alpha})`;
      ctx.fillText(p.char, 0, 0);
      ctx.restore();
    }

    ctx.restore();
    rafRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    init();
    rafRef.current = requestAnimationFrame(animate);

    const handleResize = () => {
      init();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", handleResize);
    };
  }, [init, animate]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    mouseRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  const handleMouseLeave = useCallback(() => {
    mouseRef.current = { x: -9999, y: -9999 };
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
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="interactive-name-canvas"
      />
    </div>
  );
}
