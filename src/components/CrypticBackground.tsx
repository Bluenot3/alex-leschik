import { useEffect, useRef } from "react";

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*+=<>{}[]|/\\~^`.,:;!?-_∷∵∴⊕⊗※÷≈≡∞アイウエオカキクケコ";

const PALETTE = [
  [105, 145, 210],  // blue
  [140, 115, 195],  // violet
  [210, 140, 90],   // warm orange
  [90, 170, 210],   // cyan
  [130, 140, 165],  // ink/slate
  [180, 100, 180],  // purple
  [95, 185, 160],   // teal
];

interface Glyph {
  char: string;
  x: number;
  y: number;
  color: number[];
  alpha: number;
  nextSwap: number;
}

function randomGlyph() {
  return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
}

interface Props {
  rows?: number;
  speed?: number;
  opacity?: number;
  className?: string;
}

export default function CrypticBackground({
  rows = 20,
  speed = 120,
  opacity = 0.06,
  className = "",
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glyphsRef = useRef<Glyph[]>([]);
  const rafRef = useRef(0);
  const visibleRef = useRef(false);
  const lastRef = useRef(0);

  const effectiveOpacity = Math.min(0.85, opacity * 6);
  const frameInterval = Math.max(speed, 200); // throttle harder for smoothness

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true })!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const buildGlyphs = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;

      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      const cellW = 9;
      const cellH = 16;
      const cols = Math.floor(w / cellW);
      const lineCount = Math.max(rows, Math.floor(h / cellH));
      const glyphs: Glyph[] = [];
      const now = performance.now();

      for (let row = 0; row < lineCount; row++) {
        let col = Math.floor(Math.random() * 6);
        while (col < cols) {
          if (Math.random() < 0.4) { // fewer glyphs for perf
            const segLen = 3 + Math.floor(Math.random() * 14);
            const color = PALETTE[Math.floor(Math.random() * PALETTE.length)];
            const baseAlpha = 0.5 + Math.random() * 0.5;

            for (let s = 0; s < segLen && col + s < cols; s++) {
              glyphs.push({
                char: randomGlyph(),
                x: (col + s) * cellW,
                y: row * cellH + cellH * 0.75,
                color,
                alpha: baseAlpha * (0.7 + Math.random() * 0.3),
                nextSwap: now + Math.random() * speed * 8,
              });
            }
            col += segLen + 2 + Math.floor(Math.random() * 8);
          } else {
            col += 2 + Math.floor(Math.random() * 10);
          }
        }
      }

      glyphsRef.current = glyphs;
    };

    const io = new IntersectionObserver(
      ([e]) => {
        visibleRef.current = e.isIntersecting;
        if (e.isIntersecting && rafRef.current === 0) {
          lastRef.current = performance.now();
          rafRef.current = requestAnimationFrame(paint);
        }
      },
      { threshold: 0.01, rootMargin: "200px 0px" }
    );
    io.observe(container);

    buildGlyphs();

    const ro = new ResizeObserver(() => buildGlyphs());
    ro.observe(container);

    const paint = (now: number) => {
      if (!visibleRef.current) {
        rafRef.current = 0;
        return;
      }
      rafRef.current = requestAnimationFrame(paint);
      if (now - lastRef.current < frameInterval) return;
      lastRef.current = now;

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.save();
      ctx.scale(dpr, dpr);

      const fontSize = 10;
      ctx.font = `300 ${fontSize}px "DM Mono", monospace`;
      ctx.textBaseline = "middle";

      const glyphs = glyphsRef.current;
      // Only swap ~15% of glyphs per frame for a subtle shimmer instead of full redraw
      const swapCount = Math.max(1, (glyphs.length * 0.18) | 0);
      for (let s = 0; s < swapCount; s++) {
        const idx = (Math.random() * glyphs.length) | 0;
        glyphs[idx].char = randomGlyph();
      }

      for (let i = 0; i < glyphs.length; i++) {
        const g = glyphs[i];
        const a = g.alpha * effectiveOpacity;
        if (a < 0.01) continue;

        const [r, gc, b] = g.color;
        ctx.fillStyle = `rgba(${r},${gc},${b},${a})`;
        ctx.fillText(g.char, g.x, g.y);
      }

      ctx.restore();
    };

    rafRef.current = requestAnimationFrame(paint);

    return () => {
      cancelAnimationFrame(rafRef.current);
      io.disconnect();
      ro.disconnect();
    };
  }, [rows, speed, effectiveOpacity]);

  return (
    <div
      aria-hidden="true"
      ref={containerRef}
      className={`cryptic-bg ${className}`}
    >
      <canvas ref={canvasRef} className="cryptic-bg__canvas" />
    </div>
  );
}
