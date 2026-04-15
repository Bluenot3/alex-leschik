import { useRef, useEffect, useCallback, useLayoutEffect, useMemo } from "react";
import {
  clearParticleCaches,
  getParticleTemplate,
  type ParticleTemplate,
} from "@/components/interactive-name/particleLayout";

/* ── Physics ── */
const MOUSE_RADIUS = 120;
const DISPERSE_FORCE = 13;
const RETURN_SPEED = 0.1;
const FRICTION = 0.87;

/* ── Color look-up tables (pre-computed for zero-alloc rendering) ── */
const BASE_LUT = Array.from({ length: 101 }, (_, i) => `hsl(215 55% 8% / ${(i / 100).toFixed(2)})`);
const ACCENT_LUT = Array.from({ length: 101 }, (_, i) => `hsl(210 90% 48% / ${(i / 100).toFixed(2)})`);

/* ── Scroll-transition thresholds (in scrollProgress units 0-1) ── */
const TRANSITION_START = 0.004;  // start fading/shrinking (~30px scroll)
const TRANSITION_END = 0.018;    // fully gone (~133px scroll, before content scrolls into name area)

/* ── Particle state (Structure-of-Arrays) ── */
interface Particles {
  homeX: Float32Array; homeY: Float32Array;
  x: Float32Array; y: Float32Array;
  vx: Float32Array; vy: Float32Array;
  alpha: Float32Array;
  count: number;
  pointSize: number;
  accentStride: number;
  accentScale: number;
}

const EMPTY: Particles = {
  homeX: new Float32Array(0), homeY: new Float32Array(0),
  x: new Float32Array(0), y: new Float32Array(0),
  vx: new Float32Array(0), vy: new Float32Array(0),
  alpha: new Float32Array(0),
  count: 0, pointSize: 2, accentStride: 0, accentScale: 1,
};

function spawnFromTemplate(tpl: ParticleTemplate, cw: number, ch: number): Particles {
  const n = tpl.count;
  const hx = tpl.homeX.slice();
  const hy = tpl.homeY.slice();
  const px = new Float32Array(n);
  const py = new Float32Array(n);
  const al = new Float32Array(n);
  const cx = cw / 2;
  const cy = ch / 2;
  /* Entrance: particles start from a tight cloud center and sweep outward to home */
  for (let i = 0; i < n; i++) {
    const ang = Math.random() * 6.2832;
    const r = 18 + Math.random() * 36;
    px[i] = cx + Math.cos(ang) * r;
    py[i] = cy + Math.sin(ang) * r;
    al[i] = 0.06;
  }
  return {
    homeX: hx, homeY: hy, x: px, y: py,
    vx: new Float32Array(n), vy: new Float32Array(n), alpha: al,
    count: n, pointSize: tpl.pointSize,
    accentStride: tpl.accentStride, accentScale: tpl.accentScale,
  };
}

/* ── Component ── */
interface Props { scrollProgress: number; }

export default function InteractiveName({ scrollProgress }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const p = useRef<Particles>(EMPTY);
  const mouse = useRef({ x: -9999, y: -9999 });
  const raf = useRef(0);
  const dpr = useRef(1);
  const dims = useRef({ w: 0, h: 0 });
  const startTime = useRef(performance.now());
  const scrollRef = useRef(0);
  scrollRef.current = scrollProgress;

  /* Build particles for the canvas size */
  const rebuild = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const container = canvas.parentElement!;
    const d = Math.min(window.devicePixelRatio || 1, 2);
    dpr.current = d;
    const rect = container.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    if (w < 4 || h < 4) return;
    dims.current = { w, h };
    canvas.width = w * d;
    canvas.height = h * d;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const tpl = getParticleTemplate(0, w, h); // index 0 = ALEXANDER LESCHIK
    p.current = spawnFromTemplate(tpl, w, h);
    startTime.current = performance.now();
  }, []);

  /* Render loop */
  const render = useCallback((now: number) => {
    const canvas = canvasRef.current;
    if (!canvas) { raf.current = requestAnimationFrame(render); return; }
    const ctx = canvas.getContext("2d")!;
    const d = dpr.current;
    const mx = mouse.current.x;
    const my = mouse.current.y;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(d, d);

    /* Morph timing — assembles in ~300ms with ease-out-quart */
    const elapsed = now - startTime.current;
    const morphT = Math.min(1, elapsed / 300);
    const ease = 1 - Math.pow(1 - morphT, 4);

    const { homeX, homeY, x, y, vx, vy, alpha, count, pointSize, accentStride, accentScale } = p.current;
    const rSq = MOUSE_RADIUS * MOUSE_RADIUS;
    const size = pointSize * (1.12 + (1 - ease) * 0.3);
    const half = size * 0.5;
    const pulse = 0.88 + Math.sin(now * 0.005) * 0.12;

    let lastBase = -1;
    let lastAcc = -1;

    for (let i = 0; i < count; i++) {
      alpha[i] += (ease - alpha[i]) * 0.18;

      const dx = x[i] - mx;
      const dy = y[i] - my;
      const dSq = dx * dx + dy * dy;
      if (dSq < rSq && dSq > 1) {
        const f = (rSq - dSq) / rSq;
        const ff = f * f;
        const inv = 1 / Math.sqrt(dSq);
        vx[i] += dx * inv * ff * DISPERSE_FORCE;
        vy[i] += dy * inv * ff * DISPERSE_FORCE;
      }

      vx[i] += (homeX[i] - x[i]) * RETURN_SPEED;
      vy[i] += (homeY[i] - y[i]) * RETURN_SPEED;
      vx[i] *= FRICTION;
      vy[i] *= FRICTION;
      x[i] += vx[i];
      y[i] += vy[i];

      const a = alpha[i] * 0.97;
      if (a < 0.04) continue;

      /* Accent particles (subtle blue highlight) */
      const isAcc = accentStride > 0 && i % accentStride === 0;
      if (isAcc) {
        const ai = Math.min(100, (a * pulse * 100) | 0);
        if (ai !== lastAcc) { ctx.fillStyle = ACCENT_LUT[ai]; lastAcc = ai; }
        const as = size * accentScale * pulse;
        const ah = as * 0.5;
        ctx.fillRect(x[i] - ah, y[i] - ah, as, as);
        lastBase = -1;
        continue;
      }

      const ci = Math.min(100, (a * 100) | 0);
      if (ci !== lastBase) { ctx.fillStyle = BASE_LUT[ci]; lastBase = ci; }
      ctx.fillRect(x[i] - half, y[i] - half, size, size);
    }

    ctx.restore();
    raf.current = requestAnimationFrame(render);
  }, []);

  /* Lifecycle */
  useLayoutEffect(() => {
    rebuild();
    raf.current = requestAnimationFrame(render);
    window.addEventListener("resize", rebuild);
    return () => { cancelAnimationFrame(raf.current); window.removeEventListener("resize", rebuild); };
  }, [rebuild, render]);

  /* Re-render on font load */
  useEffect(() => {
    if (!("fonts" in document)) return;
    let dead = false;
    document.fonts.ready.then(() => { if (!dead) { clearParticleCaches(); rebuild(); } });
    return () => { dead = true; };
  }, [rebuild]);

  /* Mouse handlers */
  const onMove = useCallback((e: React.MouseEvent) => {
    const c = canvasRef.current;
    if (!c) return;
    const r = c.getBoundingClientRect();
    mouse.current = { x: e.clientX - r.left, y: e.clientY - r.top };
  }, []);
  const onLeave = useCallback(() => { mouse.current = { x: -9999, y: -9999 }; }, []);

  /* ── Scroll-driven transform: hero → sticky header ── */
  const t = useMemo(() => {
    if (scrollProgress <= TRANSITION_START) return 0;
    if (scrollProgress >= TRANSITION_END) return 1;
    return (scrollProgress - TRANSITION_START) / (TRANSITION_END - TRANSITION_START);
  }, [scrollProgress]);

  const ease = t * t * (3 - 2 * t); // smoothstep
  const scale = 1 - ease * 0.72;          // 1 → 0.28
  const yShift = ease * -100;             // 0 → -100 (percentage shift upward)
  const opacity = 1 - ease;                 // fades from 1→0 as name exits

  return (
    <div
      ref={wrapRef}
      className="hero-name-layer"
      style={{
        opacity,
        transform: `translateY(${yShift}%) scale(${scale})`,
        transformOrigin: "left top",
        willChange: "transform",
      }}
    >
      <div className="pointer-events-auto interactive-name-container interactive-name-container--hero">
        <canvas
          ref={canvasRef}
          onMouseMove={onMove}
          onMouseLeave={onLeave}
          className="interactive-name-canvas"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
