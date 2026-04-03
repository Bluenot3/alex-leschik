import { useRef, useEffect, useCallback } from "react";

const WORD_SETS: string[][] = [
  ["ALEXANDER", "LESCHIK"],
  ["DESIGNER"],
  ["DEVELOPER"],
  ["VISIONARY"],
  ["AZ1"],
];

const CHAR_SIZE = 6;
const BASE_GRID_STEP = 4;
const MAX_PARTICLES = 2400;
const MOUSE_RADIUS = 100;
const RETURN_SPEED = 0.12;
const DISPERSE_FORCE = 14;

// SoA for cache-friendly iteration
interface ParticleArrays {
  homeX: Float32Array;
  homeY: Float32Array;
  x: Float32Array;
  y: Float32Array;
  vx: Float32Array;
  vy: Float32Array;
  alpha: Float32Array;
  count: number;
}

function emptyArrays(): ParticleArrays {
  return { homeX: new Float32Array(0), homeY: new Float32Array(0), x: new Float32Array(0), y: new Float32Array(0), vx: new Float32Array(0), vy: new Float32Array(0), alpha: new Float32Array(0), count: 0 };
}

// Pre-computed color LUT
const COLOR_LUT: string[] = [];
for (let a = 0; a <= 100; a++) {
  const alpha = a / 100;
  COLOR_LUT.push(`hsla(218,42%,22%,${alpha.toFixed(2)})`);
}

// Glyph cache
const glyphCache = new Map<string, { x: number; y: number }[]>();

function sampleGlyph(char: string, fontSize: number, step: number): { x: number; y: number }[] {
  const key = `${char}_${fontSize}_${step}`;
  const cached = glyphCache.get(key);
  if (cached) return cached;

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
  glyphCache.set(key, pts);
  return pts;
}

function buildParticlesForWords(words: string[], w: number, h: number): ParticleArrays {
  const fontSize = Math.min(w * 0.18, 150);
  const letterSpacing = fontSize * 0.68;
  const totalChars = words.reduce((c, word) => c + word.length, 0);
  const step = Math.max(BASE_GRID_STEP, Math.ceil(Math.sqrt((fontSize * Math.max(totalChars, 1)) / 50)));

  const lineCount = words.length;
  const totalTextH = lineCount * fontSize * 1.1;
  const startY = (h - totalTextH) / 2 + fontSize * 0.55;

  const rawPts: { hx: number; hy: number }[] = [];

  words.forEach((line, lineIdx) => {
    const chars = line.split("");
    const totalW = chars.length * letterSpacing;
    const startX = (w - totalW) / 2;
    const lineY = startY + lineIdx * fontSize * 1.1;

    chars.forEach((char, ci) => {
      const cx = startX + ci * letterSpacing + letterSpacing * 0.5;
      const cy = lineY;
      const glyphPts = sampleGlyph(char, fontSize, step);
      for (let k = 0; k < glyphPts.length; k++) {
        rawPts.push({ hx: cx + glyphPts[k].x, hy: cy + glyphPts[k].y });
      }
    });
  });

  let selected = rawPts;
  if (selected.length > MAX_PARTICLES) {
    const stride = Math.ceil(selected.length / MAX_PARTICLES);
    selected = selected.filter((_, i) => i % stride === 0);
  }

  const n = selected.length;
  const arrs: ParticleArrays = {
    homeX: new Float32Array(n),
    homeY: new Float32Array(n),
    x: new Float32Array(n),
    y: new Float32Array(n),
    vx: new Float32Array(n),
    vy: new Float32Array(n),
    alpha: new Float32Array(n),
    count: n,
  };

  for (let i = 0; i < n; i++) {
    arrs.homeX[i] = selected[i].hx;
    arrs.homeY[i] = selected[i].hy;
    arrs.x[i] = selected[i].hx;
    arrs.y[i] = selected[i].hy;
    arrs.alpha[i] = 1;
  }

  return arrs;
}

interface Props {
  scrollProgress: number;
}

export default function InteractiveName({ scrollProgress }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<ParticleArrays>(emptyArrays());
  const mouse = useRef({ x: -9999, y: -9999 });
  const raf = useRef(0);
  const dpr = useRef(1);
  const dims = useRef({ w: 0, h: 0 });
  const currentWordIdx = useRef(0);
  const morphStart = useRef(0);

  const scrollRef = useRef(0);
  scrollRef.current = scrollProgress;

  const rebuildForWord = useCallback((idx: number, scatter: boolean) => {
    const { w, h } = dims.current;
    if (w === 0) return;
    const arrs = buildParticlesForWords(WORD_SETS[idx], w, h);

    if (scatter) {
      const cx = w / 2;
      const cy = h / 2;
      for (let i = 0; i < arrs.count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 50 + Math.random() * 100;
        arrs.x[i] = cx + Math.cos(angle) * dist;
        arrs.y[i] = cy + Math.sin(angle) * dist;
        arrs.alpha[i] = 0;
      }
    }

    particles.current = arrs;
    currentWordIdx.current = idx;
    morphStart.current = performance.now();
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
    rebuildForWord(0, true);
  }, [rebuildForWord]);

  const render = useCallback((now: number) => {
    const canvas = canvasRef.current;
    if (!canvas) { raf.current = requestAnimationFrame(render); return; }

    const ctx = canvas.getContext("2d")!;
    const d = dpr.current;
    const mx = mouse.current.x;
    const my = mouse.current.y;
    const sp = scrollRef.current;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(d, d);

    const wordCount = WORD_SETS.length;
    const segmentSize = 1 / wordCount;
    const targetIdx = Math.min(wordCount - 1, Math.floor(sp / segmentSize));

    if (targetIdx !== currentWordIdx.current) {
      rebuildForWord(targetIdx, true);
    }

    const morphT = Math.min(1, (now - morphStart.current) / 350);
    const morphEase = 1 - Math.pow(1 - morphT, 3);

    const rSq = MOUSE_RADIUS * MOUSE_RADIUS;
    const { homeX, homeY, x, y, vx, vy, alpha, count } = particles.current;
    const halfSize = CHAR_SIZE * 0.15;
    const fullSize = CHAR_SIZE * 0.3;

    let lastColorIdx = -1;

    for (let i = 0; i < count; i++) {
      alpha[i] += (morphEase - alpha[i]) * 0.25;

      const dx = x[i] - mx;
      const dy = y[i] - my;
      const distSq = dx * dx + dy * dy;

      if (distSq < rSq && distSq > 1) {
        const dist = Math.sqrt(distSq);
        const force = (MOUSE_RADIUS - dist) / MOUSE_RADIUS;
        const ff = force * force;
        const angle = Math.atan2(dy, dx);
        vx[i] += Math.cos(angle) * ff * DISPERSE_FORCE;
        vy[i] += Math.sin(angle) * ff * DISPERSE_FORCE;
      }

      vx[i] += (homeX[i] - x[i]) * RETURN_SPEED;
      vy[i] += (homeY[i] - y[i]) * RETURN_SPEED;
      vx[i] *= 0.82;
      vy[i] *= 0.82;
      x[i] += vx[i];
      y[i] += vy[i];

      const a = alpha[i] * 0.92;
      if (a < 0.03) continue;

      const colorIdx = Math.min(100, (a * 100) | 0);
      if (colorIdx !== lastColorIdx) {
        ctx.fillStyle = COLOR_LUT[colorIdx];
        lastColorIdx = colorIdx;
      }
      ctx.fillRect(x[i] - halfSize, y[i] - halfSize, fullSize, fullSize);
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
      className="fixed inset-0 z-0 flex items-center justify-start pointer-events-none hero-name-layer"
      style={{ opacity, willChange: "opacity" }}
    >
      <div
        className="pointer-events-auto"
        style={{
          width: "52vw",
          maxWidth: "700px",
          height: "clamp(200px, 30vw, 360px)",
          marginLeft: "3vw",
        }}
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
