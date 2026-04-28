import { useRef, useEffect, useCallback, useLayoutEffect } from "react";
import {
  clearParticleCaches,
  getParticleTemplate,
  type ParticleTemplate,
} from "@/components/interactive-name/particleLayout";

/* ─────────────────────────────────────────────────────
   Physics constants
───────────────────────────────────────────────────── */
const MOUSE_RADIUS   = 130;   // px — repulsion zone
const DISPERSE_FORCE = 30;    // repulsion peak force
const RETURN_SPEED   = 0.068; // spring stiffness
const FRICTION       = 0.876; // velocity damping (tuned with spring for no oscillation feel)
const MOUSE_LERP     = 0.16;  // how fast smoothed-mouse tracks raw — lower = silkier
const MAX_SPEED      = 18;    // px/frame velocity cap — prevents spike artifacts
const MAX_SPEED_SQ   = MAX_SPEED * MAX_SPEED;

/* ─────────────────────────────────────────────────────
   Organic oscillation
───────────────────────────────────────────────────── */
const WAVE_AMP    = 0.75;
const WAVE_FREQ_X = 0.00078;
const WAVE_FREQ_Y = 0.00057;

/* ─────────────────────────────────────────────────────
   Motion trail
───────────────────────────────────────────────────── */
const TRAIL_FADE = 0.20;

/* ─────────────────────────────────────────────────────
   Speed thresholds (speed² for zero-branch compare)
───────────────────────────────────────────────────── */
const SPEED_GLOW    =  3;
const SPEED_SCATTER = 32;

/* ─────────────────────────────────────────────────────
   Color LUTs — pre-computed, zero-alloc in hot path
───────────────────────────────────────────────────── */
// Type-0 base: rich dark blue-slate — denser/darker than before
const BASE_LUT = Array.from({ length: 101 }, (_, i) =>
  `hsl(216 50% 14% / ${(i / 100).toFixed(2)})`
);
// Type-1 accent nodes: clean electric blue
const ACCENT_LUT = Array.from({ length: 101 }, (_, i) =>
  `hsl(205 100% 60% / ${(i / 100).toFixed(2)})`
);
// Transitional glow: cyan-blue on movement
const GLOW_LUT = Array.from({ length: 101 }, (_, i) =>
  `hsl(192 95% 62% / ${(i / 100).toFixed(2)})`
);
// Scatter flash: deep violet on high-speed scatter
const SCATTER_LUT = Array.from({ length: 101 }, (_, i) =>
  `hsl(270 88% 68% / ${(i / 100).toFixed(2)})`
);
// Type-2 shimmer stars: ice-white sparkle
const SHIMMER_LUT = Array.from({ length: 101 }, (_, i) =>
  `hsl(215 75% 95% / ${(i / 100).toFixed(2)})`
);
// Shimmer displaced: warm gold
const SHIMMER_SCATTER_LUT = Array.from({ length: 101 }, (_, i) =>
  `hsl(46 100% 90% / ${(i / 100).toFixed(2)})`
);

/* ─────────────────────────────────────────────────────
   Scroll-transition thresholds
───────────────────────────────────────────────────── */
const TRANSITION_START = 0.004;
const TRANSITION_END   = 0.018;

/* ─────────────────────────────────────────────────────
   Particle state — Structure-of-Arrays
───────────────────────────────────────────────────── */
interface Particles {
  homeX:  Float32Array;
  homeY:  Float32Array;
  x:      Float32Array;
  y:      Float32Array;
  vx:     Float32Array;
  vy:     Float32Array;
  alpha:  Float32Array;
  phaseX: Float32Array;
  phaseY: Float32Array;
  type:   Uint8Array;
  count:  number;
  pointSize:     number;
  gridPointSize: number;
  shimmerSize:   number;
}

const EMPTY: Particles = {
  homeX:  new Float32Array(0), homeY:  new Float32Array(0),
  x:      new Float32Array(0), y:      new Float32Array(0),
  vx:     new Float32Array(0), vy:     new Float32Array(0),
  alpha:  new Float32Array(0),
  phaseX: new Float32Array(0), phaseY: new Float32Array(0),
  type:   new Uint8Array(0),
  count: 0, pointSize: 1.3, gridPointSize: 2.5, shimmerSize: 4.5,
};

/* Fan-in entrance — particles fly in from nearest edge */
function spawnFromTemplate(tpl: ParticleTemplate, cw: number, ch: number): Particles {
  const n   = tpl.count;
  const hx  = tpl.homeX.slice();
  const hy  = tpl.homeY.slice();
  const px  = new Float32Array(n);
  const py  = new Float32Array(n);
  const al  = new Float32Array(n);
  const phX = new Float32Array(n);
  const phY = new Float32Array(n);

  for (let i = 0; i < n; i++) {
    const fx = hx[i] / cw;
    const fy = hy[i] / ch;
    const m  = Math.min(fy, 1 - fy, fx, 1 - fx);
    const jit = () => (Math.random() - 0.5) * 36;
    if (m === fy)       { px[i] = hx[i] + jit(); py[i] = -20 - Math.random() * 70; }
    else if (m === 1-fy){ px[i] = hx[i] + jit(); py[i] = ch + 20 + Math.random() * 70; }
    else if (m === fx)  { px[i] = -20 - Math.random() * 70; py[i] = hy[i] + jit(); }
    else                { px[i] = cw + 20 + Math.random() * 70; py[i] = hy[i] + jit(); }
    al[i]  = 0;
    phX[i] = Math.random() * Math.PI * 2;
    phY[i] = Math.random() * Math.PI * 2;
  }

  return {
    homeX: hx, homeY: hy,
    x: px, y: py,
    vx: new Float32Array(n), vy: new Float32Array(n),
    alpha: al,
    phaseX: phX, phaseY: phY,
    type: tpl.type.slice(),
    count: n,
    pointSize:     tpl.pointSize,
    gridPointSize: tpl.gridPointSize,
    shimmerSize:   tpl.shimmerSize,
  };
}

/* ─────────────────────────────────────────────────────
   Component
───────────────────────────────────────────────────── */
interface Props { scrollProgress: number; }

export default function InteractiveName({ scrollProgress }: Props) {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const wrapRef     = useRef<HTMLDivElement>(null);
  const particles   = useRef<Particles>(EMPTY);
  // Raw mouse from DOM events — canvas-local coords
  const rawMouse    = useRef({ x: -9999, y: -9999 });
  // Smoothed mouse — lerped every RAF frame for silky force field
  const sMouse      = useRef({ x: -9999, y: -9999 });
  const raf         = useRef(0);
  const dpr         = useRef(1);
  const startTime   = useRef(performance.now());
  const scrollRef   = useRef(scrollProgress);
  scrollRef.current = scrollProgress;

  /* ── Scroll transform — direct DOM write, no React re-render ── */
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const sp  = scrollProgress;
    const raw = sp <= TRANSITION_START ? 0
              : sp >= TRANSITION_END   ? 1
              : (sp - TRANSITION_START) / (TRANSITION_END - TRANSITION_START);
    const ease = raw * raw * (3 - 2 * raw);
    wrap.style.opacity   = String(1 - ease);
    wrap.style.transform = `translateY(${ease * -100}%) scale(${1 - ease * 0.72})`;
  }, [scrollProgress]);

  /* ── Build / rebuild particle arrays ── */
  const rebuild = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const d   = Math.min(window.devicePixelRatio || 1, 2);
    dpr.current = d;
    const rect = canvas.parentElement!.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    if (w < 4 || h < 4) return;
    canvas.width        = w * d;
    canvas.height       = h * d;
    canvas.style.width  = `${w}px`;
    canvas.style.height = `${h}px`;
    const tpl = getParticleTemplate(0, w, h);
    particles.current = spawnFromTemplate(tpl, w, h);
    startTime.current = performance.now();
  }, []);

  /* ─────────────────────────────────────────────────────
     Render loop
  ───────────────────────────────────────────────────── */
  const render = useCallback((now: number) => {
    const canvas = canvasRef.current;
    if (!canvas) { raf.current = requestAnimationFrame(render); return; }
    const ctx = canvas.getContext("2d")!;
    const d   = dpr.current;

    /* ── Trail fade ── */
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = `rgba(0,0,0,${TRAIL_FADE})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    ctx.save();
    ctx.scale(d, d);

    /* ── Advance smoothed mouse toward raw mouse ── */
    const rx = rawMouse.current.x;
    const ry = rawMouse.current.y;
    const active = rx > -9000;
    if (active) {
      sMouse.current.x += (rx - sMouse.current.x) * MOUSE_LERP;
      sMouse.current.y += (ry - sMouse.current.y) * MOUSE_LERP;
    } else {
      // cursor left — smoothly retract the effective position off-screen
      sMouse.current.x += (-9999 - sMouse.current.x) * 0.08;
      sMouse.current.y += (-9999 - sMouse.current.y) * 0.08;
    }
    const mx = sMouse.current.x;
    const my = sMouse.current.y;

    /* ── Timing ── */
    const morphT = Math.min(1, (now - startTime.current) / 600);
    const morphE = 1 - Math.pow(1 - morphT, 3); // ease-out-cubic

    const breathe    = 0.88 + Math.sin(now * 0.0028) * 0.12;
    const twinkleBase = now * 0.0075;

    const {
      homeX, homeY, x, y, vx, vy, alpha,
      phaseX, phaseY, type, count,
      pointSize, gridPointSize, shimmerSize,
    } = particles.current;

    const rSq      = MOUSE_RADIUS * MOUSE_RADIUS;
    const baseHalf = pointSize      * 0.5;
    const gridHalf = gridPointSize  * 0.5;
    const shimHalf = shimmerSize    * 0.5;

    /* ─────────────────────────────────────────────────
       Physics pass
    ───────────────────────────────────────────────── */
    for (let i = 0; i < count; i++) {
      /* Alpha fade-in */
      alpha[i] += (morphE - alpha[i]) * 0.12;

      /* Oscillating home target */
      const tx = homeX[i] + Math.sin(now * WAVE_FREQ_X + phaseX[i]) * WAVE_AMP;
      const ty = homeY[i] + Math.sin(now * WAVE_FREQ_Y + phaseY[i]) * WAVE_AMP;

      /* Repulsion from smoothed cursor — pure outward push, no attraction */
      const dx  = x[i] - mx;
      const dy  = y[i] - my;
      const dSq = dx * dx + dy * dy;

      if (dSq < rSq && dSq > 0.5) {
        const t   = (rSq - dSq) / rSq;        // 0→1 as particle nears centre
        const f   = t * t * t;                 // cubic ease-in — very smooth at edge
        const inv = 1 / Math.sqrt(dSq);
        vx[i] += dx * inv * f * DISPERSE_FORCE;
        vy[i] += dy * inv * f * DISPERSE_FORCE;
      }

      /* Spring toward home + friction */
      vx[i] += (tx - x[i]) * RETURN_SPEED;
      vy[i] += (ty - y[i]) * RETURN_SPEED;
      vx[i] *= FRICTION;
      vy[i] *= FRICTION;

      /* Velocity cap — prevents any spike from blowing a particle off-screen */
      const spSq = vx[i] * vx[i] + vy[i] * vy[i];
      if (spSq > MAX_SPEED_SQ) {
        const scale = MAX_SPEED / Math.sqrt(spSq);
        vx[i] *= scale;
        vy[i] *= scale;
      }

      x[i] += vx[i];
      y[i] += vy[i];
    }

    /* ─────────────────────────────────────────────────
       Render pass 1 — base fill (type=0)
    ───────────────────────────────────────────────── */
    let lastStyle = "";
    for (let i = 0; i < count; i++) {
      if (type[i] !== 0) continue;
      const a = alpha[i];
      if (a < 0.04) continue;
      const spSq = vx[i] * vx[i] + vy[i] * vy[i];
      const lut  = spSq > SPEED_SCATTER ? SCATTER_LUT
                 : spSq > SPEED_GLOW    ? GLOW_LUT
                 : BASE_LUT;
      const col  = lut[Math.min(100, (a * 100) | 0)];
      if (col !== lastStyle) { ctx.fillStyle = col; lastStyle = col; }
      ctx.fillRect(x[i] - baseHalf, y[i] - baseHalf, pointSize, pointSize);
    }

    /* ─────────────────────────────────────────────────
       Render pass 2 — accent nodes (type=1)
    ───────────────────────────────────────────────── */
    lastStyle = "";
    for (let i = 0; i < count; i++) {
      if (type[i] !== 1) continue;
      const a = alpha[i];
      if (a < 0.04) continue;
      const spSq = vx[i] * vx[i] + vy[i] * vy[i];
      const lut  = spSq > SPEED_SCATTER ? SCATTER_LUT
                 : spSq > SPEED_GLOW    ? GLOW_LUT
                 : ACCENT_LUT;
      const col  = lut[Math.min(100, (a * breathe * 100) | 0)];
      if (col !== lastStyle) { ctx.fillStyle = col; lastStyle = col; }
      ctx.fillRect(x[i] - gridHalf, y[i] - gridHalf, gridPointSize, gridPointSize);
    }

    /* ─────────────────────────────────────────────────
       Render pass 3 — shimmer stars (type=2)
    ───────────────────────────────────────────────── */
    if (shimmerSize > 0) {
      lastStyle = "";
      const armLen  = shimmerSize * 0.88;
      const armW    = 1.1;
      const armHalf = armLen * 0.5;

      for (let i = 0; i < count; i++) {
        if (type[i] !== 2) continue;
        const a = alpha[i];
        if (a < 0.04) continue;
        const twinkle = 0.6 + Math.sin(twinkleBase + phaseX[i] * 3.1) * 0.4;
        const spSq    = vx[i] * vx[i] + vy[i] * vy[i];
        const lut     = spSq > SPEED_SCATTER ? SHIMMER_SCATTER_LUT : SHIMMER_LUT;
        const col     = lut[Math.min(100, (a * twinkle * 100) | 0)];
        if (col !== lastStyle) { ctx.fillStyle = col; lastStyle = col; }
        ctx.fillRect(x[i] - shimHalf, y[i] - shimHalf, shimmerSize, shimmerSize);
        ctx.fillRect(x[i] - shimHalf - armHalf, y[i] - armW * 0.5, armLen, armW);
        ctx.fillRect(x[i] - armW * 0.5, y[i] - shimHalf - armHalf, armW, armLen);
      }
    }

    ctx.restore();
    raf.current = requestAnimationFrame(render);
  }, []);

  /* ── Lifecycle ── */
  useLayoutEffect(() => {
    rebuild();
    raf.current = requestAnimationFrame(render);
    window.addEventListener("resize", rebuild);
    return () => {
      cancelAnimationFrame(raf.current);
      window.removeEventListener("resize", rebuild);
    };
  }, [rebuild, render]);

  /* Rebuild once web fonts are ready (Bebas Neue changes glyph metrics) */
  useEffect(() => {
    if (!("fonts" in document)) return;
    let dead = false;
    document.fonts.ready.then(() => {
      if (!dead) { clearParticleCaches(); rebuild(); }
    });
    return () => { dead = true; };
  }, [rebuild]);

  /* ── Mouse handlers — store raw, physics loop does the lerp ── */
  const onMove = useCallback((e: React.MouseEvent) => {
    const c = canvasRef.current;
    if (!c) return;
    const r = c.getBoundingClientRect();
    rawMouse.current = { x: e.clientX - r.left, y: e.clientY - r.top };
  }, []);

  const onLeave = useCallback(() => {
    rawMouse.current = { x: -9999, y: -9999 };
  }, []);

  return (
    <div
      ref={wrapRef}
      className="hero-name-layer"
      style={{
        opacity: 1,
        transform: "translateY(0%) scale(1)",
        transformOrigin: "left top",
        willChange: "transform, opacity",
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
