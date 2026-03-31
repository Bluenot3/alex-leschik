import { useRef, useEffect, useCallback } from "react";

const WORD_SETS: string[][] = [
  ["ALEXANDER", "LESCHIK"],
  ["DESIGNER"],
  ["DEVELOPER"],
  ["VISIONARY"],
  ["AZ1"],
];

const CHAR_SIZE = 7;
const GRID_STEP = 3;
const MOUSE_RADIUS = 100;
const RETURN_SPEED = 0.08;
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

function buildParticlesForWords(
  words: string[],
  w: number,
  h: number
): Particle[] {
  const isMobile = w < 600;
  const fontSize = isMobile ? Math.min(w * 0.14, 60) : Math.min(w * 0.18, 150);
  const letterSpacing = fontSize * 0.72;
  const pts: Particle[] = [];

  const lineCount = words.length;
  const totalTextH = lineCount * fontSize * 1.1;
  const startY = (h - totalTextH) / 2 + fontSize * 0.55;

  words.forEach((line, lineIdx) => {
    const chars = line.split("");
    const totalW = chars.length * letterSpacing;
    const startX = (w - totalW) / 2;
    const lineY = startY + lineIdx * fontSize * 1.1;

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
          x: cx + pt.x,
          y: cy + pt.y,
          vx: 0,
          vy: 0,
          rot: 0,
          vr: 0,
          alpha: 1,
        });
      });
    });
  });

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
  const dims = useRef({ w: 0, h: 0 });
  const currentWordIdx = useRef(0);
  const morphing = useRef(false);
  const morphStart = useRef(0);

  const scrollRef = useRef(0);
  scrollRef.current = scrollProgress;

  const rebuildForWord = useCallback((idx: number, scatter: boolean) => {
    const { w, h } = dims.current;
    if (w === 0) return;
    const newPts = buildParticlesForWords(WORD_SETS[idx], w, h);

    if (scatter) {
      // Scatter new particles from random positions
      const cx = w / 2;
      const cy = h / 2;
      newPts.forEach((p) => {
        const angle = Math.random() * Math.PI * 2;
        const dist = 100 + Math.random() * 200;
        p.x = cx + Math.cos(angle) * dist;
        p.y = cy + Math.sin(angle) * dist;
        p.rot = (Math.random() - 0.5) * 120;
        p.alpha = 0;
      });
    }

    particles.current = newPts;
    currentWordIdx.current = idx;
    morphing.current = true;
    morphStart.current = Date.now();
  }, []);

  const init = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const container = canvas.parentElement!;
    const d = Math.min(window.devicePixelRatio || 1, 2);
    dpr.current = d;
    const rect = container.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    dims.current = { w, h };
    canvas.width = w * d;
    canvas.height = h * d;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    // Initialize with first word set, scattered entrance
    rebuildForWord(0, true);
  }, [rebuildForWord]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const d = dpr.current;
    const m = mouse.current;
    const sp = scrollRef.current;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(d, d);

    // Determine which word set we should be showing based on scroll
    const wordCount = WORD_SETS.length;
    const segmentSize = 1 / wordCount;
    const targetIdx = Math.min(wordCount - 1, Math.floor(sp / segmentSize));

    if (targetIdx !== currentWordIdx.current) {
      rebuildForWord(targetIdx, true);
    }

    // Morph-in timing
    const morphElapsed = Date.now() - morphStart.current;
    const morphT = Math.min(1, morphElapsed / 800);
    const morphEase = 1 - Math.pow(1 - morphT, 3);

    const rSq = MOUSE_RADIUS * MOUSE_RADIUS;
    const ps = particles.current;

    ctx.font = `900 ${CHAR_SIZE}px "Bebas Neue", "Inter", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];

      p.alpha += (morphEase - p.alpha) * 0.1;

      // Mouse interaction
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
  }, [rebuildForWord]);

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

  const opacity = Math.max(0, 1 - scrollProgress * 0.15);

  return (
    <div
      className="fixed inset-x-0 top-0 z-0 flex items-start md:items-center justify-center md:justify-start pointer-events-none"
      style={{
        opacity,
        bottom: 0,
        paddingTop: "6vh",
        willChange: "opacity",
      }}
    >
      <div
        className="pointer-events-auto w-full md:pr-[20vw]"
        style={{ height: "clamp(140px, 30vw, 440px)" }}
      >
        <canvas
          ref={canvasRef}
          onMouseMove={onMove}
          onMouseLeave={onLeave}
          onTouchMove={(e) => {
            const t = e.touches[0];
            const r = canvasRef.current?.getBoundingClientRect();
            if (r) mouse.current = { x: t.clientX - r.left, y: t.clientY - r.top };
          }}
          onTouchEnd={onLeave}
          className="block w-full h-full"
          style={{ cursor: "default" }}
        />
      </div>
    </div>
  );
}
