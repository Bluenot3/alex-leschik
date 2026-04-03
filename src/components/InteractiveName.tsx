import { useRef, useEffect, useCallback, useLayoutEffect } from "react";
import {
  WORD_SETS,
  clearParticleCaches,
  getParticleTemplate,
  prewarmParticleTemplates,
  type ParticleTemplate,
} from "@/components/interactive-name/particleLayout";

const MOUSE_RADIUS = 112;
const DISPERSE_FORCE = 12.5;
const RETURN_SPEED = 0.11;
const HERO_RETURN_SPEED = 0.095;

const BASE_COLOR_LUT = Array.from({ length: 101 }, (_, alphaIndex) => {
  const alpha = (alphaIndex / 100).toFixed(2);
  return `hsl(218 34% 22% / ${alpha})`;
});

const HERO_ACCENT_COLOR_LUT = Array.from({ length: 101 }, (_, alphaIndex) => {
  const alpha = (alphaIndex / 100).toFixed(2);
  return `hsl(208 86% 56% / ${alpha})`;
});

type BuildMode = "immediate" | "scatter";

interface ParticleArrays {
  homeX: Float32Array;
  homeY: Float32Array;
  x: Float32Array;
  y: Float32Array;
  vx: Float32Array;
  vy: Float32Array;
  alpha: Float32Array;
  count: number;
  pointSize: number;
  accentStride: number;
  accentScale: number;
  isHero: boolean;
}

function emptyArrays(): ParticleArrays {
  return {
    homeX: new Float32Array(0),
    homeY: new Float32Array(0),
    x: new Float32Array(0),
    y: new Float32Array(0),
    vx: new Float32Array(0),
    vy: new Float32Array(0),
    alpha: new Float32Array(0),
    count: 0,
    pointSize: 1.9,
    accentStride: 0,
    accentScale: 1,
    isHero: false,
  };
}

function createParticleState(
  template: ParticleTemplate,
  mode: BuildMode,
  centerX: number,
  centerY: number
): ParticleArrays {
  const homeX = template.homeX.slice();
  const homeY = template.homeY.slice();
  const x = homeX.slice();
  const y = homeY.slice();
  const alpha = new Float32Array(template.count);
  const spread = template.introSpread;

  if (mode === "scatter") {
    for (let i = 0; i < template.count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const distance = spread * (0.4 + Math.random() * 0.9);
      x[i] = centerX + Math.cos(angle) * distance;
      y[i] = centerY + Math.sin(angle) * distance;
      alpha[i] = template.isHero ? 0.12 : 0;
    }
  } else {
    for (let i = 0; i < template.count; i += 1) {
      x[i] += (Math.random() - 0.5) * spread * (template.isHero ? 0.16 : 0.08);
      y[i] += (Math.random() - 0.5) * spread * (template.isHero ? 0.24 : 0.1);
      alpha[i] = template.isHero ? 0.82 : 0.68;
    }
  }

  return {
    homeX,
    homeY,
    x,
    y,
    vx: new Float32Array(template.count),
    vy: new Float32Array(template.count),
    alpha,
    count: template.count,
    pointSize: template.pointSize,
    accentStride: template.accentStride,
    accentScale: template.accentScale,
    isHero: template.isHero,
  };
}

interface Props {
  scrollProgress: number;
}

export default function InteractiveName({ scrollProgress }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<ParticleArrays>(emptyArrays());
  const mouse = useRef({ x: -9999, y: -9999 });
  const raf = useRef(0);
  const warmupTimer = useRef<number | null>(null);
  const dpr = useRef(1);
  const dims = useRef({ w: 0, h: 0 });
  const currentWordIdx = useRef(0);
  const morphStart = useRef(0);

  const scrollRef = useRef(0);
  scrollRef.current = scrollProgress;

  const rebuildForWord = useCallback((idx: number, mode: BuildMode) => {
    const { w, h } = dims.current;
    if (w === 0 || h === 0) return;

    const template = getParticleTemplate(idx, w, h);
    particles.current = createParticleState(template, mode, w / 2, h / 2);
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

    if (warmupTimer.current !== null) {
      window.clearTimeout(warmupTimer.current);
    }

    rebuildForWord(currentWordIdx.current, currentWordIdx.current === 0 ? "immediate" : "scatter");
    warmupTimer.current = window.setTimeout(() => {
      prewarmParticleTemplates(w, h);
    }, 72);
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
      rebuildForWord(targetIdx, targetIdx === 0 ? "immediate" : "scatter");
    }

    const active = particles.current;
    const morphDuration = active.isHero ? 160 : 320;
    const morphT = Math.min(1, (now - morphStart.current) / morphDuration);
    const morphEase = 1 - Math.pow(1 - morphT, 4);
    const targetAlpha = active.isHero ? 1 : morphEase;
    const returnSpeed = active.isHero ? HERO_RETURN_SPEED : RETURN_SPEED;
    const friction = active.isHero ? 0.84 : 0.82;
    const baseSize = active.pointSize * (active.isHero ? 1.1 + (1 - morphEase) * 0.34 : 1 + (1 - morphEase) * 0.1);
    const baseHalf = baseSize * 0.5;
    const accentPulse = active.isHero ? 0.88 + Math.sin(now * 0.006) * 0.14 : 1;

    const rSq = MOUSE_RADIUS * MOUSE_RADIUS;
    const { homeX, homeY, x, y, vx, vy, alpha, count } = active;

    let lastColorIdx = -1;
    let lastAccentIdx = -1;

    for (let i = 0; i < count; i++) {
      alpha[i] += (targetAlpha - alpha[i]) * (active.isHero ? 0.14 : 0.24);

      const dx = x[i] - mx;
      const dy = y[i] - my;
      const distSq = dx * dx + dy * dy;

      if (distSq < rSq && distSq > 1) {
        const force = (rSq - distSq) / rSq;
        const ff = force * force;
        const invDist = 1 / Math.sqrt(distSq);
        vx[i] += dx * invDist * ff * DISPERSE_FORCE;
        vy[i] += dy * invDist * ff * DISPERSE_FORCE;
      }

      vx[i] += (homeX[i] - x[i]) * returnSpeed;
      vy[i] += (homeY[i] - y[i]) * returnSpeed;
      vx[i] *= friction;
      vy[i] *= friction;
      x[i] += vx[i];
      y[i] += vy[i];

      const a = alpha[i] * (active.isHero ? 0.98 : 0.92);
      if (a < 0.04) continue;

      const isAccent = active.isHero && active.accentStride > 0 && i % active.accentStride === 0;

      if (isAccent) {
        const accentAlpha = Math.min(1, a * (0.82 + accentPulse * 0.24));
        const accentIdx = Math.min(100, (accentAlpha * 100) | 0);
        if (accentIdx !== lastAccentIdx) {
          ctx.fillStyle = HERO_ACCENT_COLOR_LUT[accentIdx];
          lastAccentIdx = accentIdx;
        }

        const accentSize = baseSize * active.accentScale * accentPulse;
        const accentHalf = accentSize * 0.5;
        ctx.fillRect(x[i] - accentHalf, y[i] - accentHalf, accentSize, accentSize);
        lastColorIdx = -1;
        continue;
      }

      const colorIdx = Math.min(100, (a * 100) | 0);
      if (colorIdx !== lastColorIdx) {
        ctx.fillStyle = BASE_COLOR_LUT[colorIdx];
        lastColorIdx = colorIdx;
      }
      ctx.fillRect(x[i] - baseHalf, y[i] - baseHalf, baseSize, baseSize);
    }

    ctx.restore();
    raf.current = requestAnimationFrame(render);
  }, [rebuildForWord]);

  useLayoutEffect(() => {
    init();
    raf.current = requestAnimationFrame(render);
    window.addEventListener("resize", init);
    return () => {
      cancelAnimationFrame(raf.current);
      window.removeEventListener("resize", init);
      if (warmupTimer.current !== null) {
        window.clearTimeout(warmupTimer.current);
      }
    };
  }, [init, render]);

  useEffect(() => {
    if (!("fonts" in document)) return;

    let cancelled = false;

    document.fonts.ready.then(() => {
      if (cancelled) return;
      clearParticleCaches();
      init();
    });

    return () => {
      cancelled = true;
    };
  }, [init]);

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
      className="fixed inset-0 z-0 pointer-events-none hero-name-layer"
      style={{ opacity, willChange: "opacity" }}
    >
      <div
        className="pointer-events-auto interactive-name-container interactive-name-container--hero interactive-name-focus"
      >
        <canvas
          ref={canvasRef}
          onMouseMove={onMove}
          onMouseLeave={onLeave}
          className="interactive-name-canvas"
          aria-hidden="true"
          style={{ cursor: "default" }}
        />
      </div>
    </div>
  );
}
