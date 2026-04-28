import { useRef, useEffect, useCallback, useLayoutEffect } from "react";
import {
  clearParticleCaches,
  getParticleTemplate,
  type ParticleTemplate,
} from "@/components/interactive-name/particleLayout";

/* ─────────────────────────────────────────────────────
   Physics constants
───────────────────────────────────────────────────── */
const MOUSE_RADIUS    = 150;   // px — inner repulsion zone radius
const ATTRACT_RADIUS  = 300;   // px — outer attraction annulus radius
const DISPERSE_FORCE  = 38;    // repulsion magnitude
const ATTRACT_FORCE   = 3.5;   // attraction magnitude (pulls from outer ring)
const RETURN_SPEED    = 0.065; // spring stiffness back to home
const FRICTION        = 0.87;  // velocity damping per frame

/* ─────────────────────────────────────────────────────
   Organic oscillation (slow breathing wave on home positions)
───────────────────────────────────────────────────── */
const WAVE_AMP    = 0.7;      // px amplitude of oscillation at rest
const WAVE_FREQ_X = 0.00085;  // rad/ms — horizontal drift frequency
const WAVE_FREQ_Y = 0.00062;  // rad/ms — vertical drift frequency (offset rhythm)

/* ─────────────────────────────────────────────────────
   Motion trail
───────────────────────────────────────────────────── */
const TRAIL_FADE = 0.22; // opacity subtracted per frame via destination-out rect

/* ─────────────────────────────────────────────────────
   Speed thresholds (speed² units for branch-free compare)
───────────────────────────────────────────────────── */
const SPEED_GLOW    =  4;   // speed² → soft glow tint kicks in
const SPEED_SCATTER = 36;   // speed² → full scatter/violet flash

/* ─────────────────────────────────────────────────────
   Color LUTs — pre-computed, zero-alloc in hot path
   Each LUT[i] = color at alpha i/100
───────────────────────────────────────────────────── */
// Type-0 base fill: ultra-fine dark-slate
const BASE_LUT = Array.from({ length: 101 }, (_, i) =>
  `hsl(222 45% 10% / ${(i / 100).toFixed(2)})`
);
// Type-1 accent nodes: electric blue
const ACCENT_LUT = Array.from({ length: 101 }, (_, i) =>
  `hsl(208 100% 58% / ${(i / 100).toFixed(2)})`
);
// Transitional glow: cyan-blue (shown when speed is between glow and scatter)
const GLOW_LUT = Array.from({ length: 101 }, (_, i) =>
  `hsl(194 95% 58% / ${(i / 100).toFixed(2)})`
);
// Scatter flash: violet (shown when moving fast)
const SCATTER_LUT = Array.from({ length: 101 }, (_, i) =>
  `hsl(276 88% 65% / ${(i / 100).toFixed(2)})`
);
// Type-2 shimmer stars: near-white sparkle
const SHIMMER_LUT = Array.from({ length: 101 }, (_, i) =>
  `hsl(220 60% 92% / ${(i / 100).toFixed(2)})`
);
// Shimmer scatter: hot-white when moving
const SHIMMER_SCATTER_LUT = Array.from({ length: 101 }, (_, i) =>
  `hsl(60 100% 90% / ${(i / 100).toFixed(2)})`
);

/* ─────────────────────────────────────────────────────
   Scroll-transition thresholds (scrollProgress 0–1)
───────────────────────────────────────────────────── */
const TRANSITION_START = 0.004;  // ~30 px scroll
const TRANSITION_END   = 0.018;  // ~133 px scroll

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
  phaseX: Float32Array;   // per-particle wave phase offset (0–2π)
  phaseY: Float32Array;
  type:   Uint8Array;     // 0=base, 1=accent, 2=shimmer
  count:  number;
  pointSize:    number;
  gridPointSize: number;
  shimmerSize:  number;
}

const EMPTY: Particles = {
  homeX:  new Float32Array(0), homeY:  new Float32Array(0),
  x:      new Float32Array(0), y:      new Float32Array(0),
  vx:     new Float32Array(0), vy:     new Float32Array(0),
  alpha:  new Float32Array(0),
  phaseX: new Float32Array(0), phaseY: new Float32Array(0),
  type:   new Uint8Array(0),
  count: 0, pointSize: 1, gridPointSize: 2.2, shimmerSize: 4.5,
};

/* Fan-in entrance: each particle spawns from the nearest screen edge */
function spawnFromTemplate(tpl: ParticleTemplate, cw: number, ch: number): Particles {
  const n  = tpl.count;
  const hx = tpl.homeX.slice();
  const hy = tpl.homeY.slice();
  const px = new Float32Array(n);
  const py = new Float32Array(n);
  const al = new Float32Array(n);
  const phX = new Float32Array(n);
  const phY = new Float32Array(n);

  for (let i = 0; i < n; i++) {
    const fx = hx[i] / cw;
    const fy = hy[i] / ch;
    const dT = fy;
    const dB = 1 - fy;
    const dL = fx;
    const dR = 1 - fx;
    const m  = Math.min(dT, dB, dL, dR);
    const jit = () => (Math.random() - 0.5) * 40;
    if (m === dT) {
      px[i] = hx[i] + jit(); py[i] = -20 - Math.random() * 80;
    } else if (m === dB) {
      px[i] = hx[i] + jit(); py[i] = ch + 20 + Math.random() * 80;
    } else if (m === dL) {
      px[i] = -20 - Math.random() * 80; py[i] = hy[i] + jit();
    } else {
      px[i] = cw + 20 + Math.random() * 80; py[i] = hy[i] + jit();
    }
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
  const p           = useRef<Particles>(EMPTY);
  const mouse       = useRef({ x: -9999, y: -9999 });
  const raf         = useRef(0);
  const dpr         = useRef(1);
  const startTime   = useRef(performance.now());
  const scrollRef   = useRef(scrollProgress);
  scrollRef.current = scrollProgress;

  /* Scroll transform — direct DOM mutation, zero React re-renders */
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const sp  = scrollProgress;
    const raw = sp <= TRANSITION_START ? 0
              : sp >= TRANSITION_END   ? 1
              : (sp - TRANSITION_START) / (TRANSITION_END - TRANSITION_START);
    const ease = raw * raw * (3 - 2 * raw); // smoothstep
    wrap.style.opacity   = String(1 - ease);
    wrap.style.transform = `translateY(${ease * -100}%) scale(${1 - ease * 0.72})`;
  }, [scrollProgress]);

  /* Build / rebuild particles */
  const rebuild = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const d    = Math.min(window.devicePixelRatio || 1, 2);
    dpr.current = d;
    const rect = canvas.parentElement!.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    if (w < 4 || h < 4) return;
    canvas.width        = w * d;
    canvas.height       = h * d;
    canvas.style.width  = `${w}px`;
    canvas.style.height = `${h}px`;
    const tpl  = getParticleTemplate(0, w, h);
    p.current  = spawnFromTemplate(tpl, w, h);
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
    const mx  = mouse.current.x;
    const my  = mouse.current.y;

    /* ── Motion trail (destination-out erases a fraction of previous frame) ── */
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = `rgba(0,0,0,${TRAIL_FADE})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    ctx.save();
    ctx.scale(d, d);

    /* Morph timing — ease-out-cubic, 500ms to fully assemble */
    const morphT = Math.min(1, (now - startTime.current) / 500);
    const morphE = 1 - Math.pow(1 - morphT, 3);

    /* Gentle accent breathing (2s period) */
    const breathe = 0.88 + Math.sin(now * 0.003) * 0.12;

    /* Shimmer stars twinkle faster (0.8s period), per-particle phase applied later */
    const twinkleBase = now * 0.008;

    const {
      homeX, homeY, x, y, vx, vy, alpha,
      phaseX, phaseY, type, count,
      pointSize, gridPointSize, shimmerSize,
    } = p.current;

    const rSq        = MOUSE_RADIUS * MOUSE_RADIUS;
    const attractSq  = ATTRACT_RADIUS * ATTRACT_RADIUS;
    const baseHalf   = pointSize      * 0.5;
    const gridHalf   = gridPointSize  * 0.5;
    const shimHalf   = shimmerSize    * 0.5;

    /* ── Physics pass ── */
    for (let i = 0; i < count; i++) {
      /* Fade in during morph */
      alpha[i] += (morphE - alpha[i]) * 0.11;

      /* Organic oscillating home position */
      const tx = homeX[i] + Math.sin(now * WAVE_FREQ_X + phaseX[i]) * WAVE_AMP;
      const ty = homeY[i] + Math.sin(now * WAVE_FREQ_Y + phaseY[i]) * WAVE_AMP;

      const dx  = x[i] - mx;
      const dy  = y[i] - my;
      const dSq = dx * dx + dy * dy;

      if (dSq < rSq && dSq > 1) {
        /* Inner zone: repulsion */
        const f   = (rSq - dSq) / rSq;
        const inv = 1 / Math.sqrt(dSq);
        vx[i] += dx * inv * f * f * DISPERSE_FORCE;
        vy[i] += dy * inv * f * f * DISPERSE_FORCE;
      } else if (dSq < attractSq && dSq > rSq) {
        /* Outer annulus: soft attraction — particles drift toward cursor */
        const f   = 1 - (dSq - rSq) / (attractSq - rSq);
        const inv = 1 / Math.sqrt(dSq);
        vx[i] -= dx * inv * f * f * ATTRACT_FORCE;
        vy[i] -= dy * inv * f * f * ATTRACT_FORCE;
      }

      /* Spring back to oscillating home */
      vx[i] += (tx - x[i]) * RETURN_SPEED;
      vy[i] += (ty - y[i]) * RETURN_SPEED;
      vx[i] *= FRICTION;
      vy[i] *= FRICTION;
      x[i]  += vx[i];
      y[i]  += vy[i];
    }

    /* ── Render pass 1: base fill (type=0) ── */
    let lastStyle  = "";
    for (let i = 0; i < count; i++) {
      if (type[i] !== 0) continue;
      const a = alpha[i];
      if (a < 0.04) continue;

      const speedSq = vx[i] * vx[i] + vy[i] * vy[i];
      let lut: string[];
      if      (speedSq > SPEED_SCATTER) lut = SCATTER_LUT;
      else if (speedSq > SPEED_GLOW)    lut = GLOW_LUT;
      else                               lut = BASE_LUT;

      const ci  = Math.min(100, (a * 100) | 0);
      const col = lut[ci];
      if (col !== lastStyle) { ctx.fillStyle = col; lastStyle = col; }
      ctx.fillRect(x[i] - baseHalf, y[i] - baseHalf, pointSize, pointSize);
    }

    /* ── Render pass 2: accent nodes (type=1) ── */
    lastStyle = "";
    for (let i = 0; i < count; i++) {
      if (type[i] !== 1) continue;
      const a = alpha[i];
      if (a < 0.04) continue;

      const speedSq = vx[i] * vx[i] + vy[i] * vy[i];
      let lut: string[];
      if      (speedSq > SPEED_SCATTER) lut = SCATTER_LUT;
      else if (speedSq > SPEED_GLOW)    lut = GLOW_LUT;
      else                               lut = ACCENT_LUT;

      const ci  = Math.min(100, (a * breathe * 100) | 0);
      const col = lut[ci];
      if (col !== lastStyle) { ctx.fillStyle = col; lastStyle = col; }
      ctx.fillRect(x[i] - gridHalf, y[i] - gridHalf, gridPointSize, gridPointSize);
    }

    /* ── Render pass 3: shimmer stars (type=2) — sparkle cross shape ── */
    if (shimmerSize > 0) {
      lastStyle = "";
      const armLen  = shimmerSize * 0.9;   // length of each arm from center
      const armW    = 1.2;                  // arm thickness in px
      const armHalf = armLen * 0.5;

      for (let i = 0; i < count; i++) {
        if (type[i] !== 2) continue;
        const a = alpha[i];
        if (a < 0.04) continue;

        /* Per-particle twinkle: each star has its own phase offset */
        const twinkle  = 0.6 + Math.sin(twinkleBase + phaseX[i] * 3.1) * 0.4;
        const speedSq  = vx[i] * vx[i] + vy[i] * vy[i];
        const lut      = speedSq > SPEED_SCATTER ? SHIMMER_SCATTER_LUT : SHIMMER_LUT;
        const ci       = Math.min(100, (a * twinkle * 100) | 0);
        const col      = lut[ci];

        if (col !== lastStyle) { ctx.fillStyle = col; lastStyle = col; }

        /* Center square */
        ctx.fillRect(x[i] - shimHalf, y[i] - shimHalf, shimmerSize, shimmerSize);

        /* Horizontal arm */
        ctx.fillRect(x[i] - shimHalf - armHalf, y[i] - armW * 0.5, armLen, armW);
        /* Vertical arm */
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

  /* Rebuild when web fonts finish loading (Bebas Neue glyph metrics change) */
  useEffect(() => {
    if (!("fonts" in document)) return;
    let dead = false;
    document.fonts.ready.then(() => {
      if (!dead) { clearParticleCaches(); rebuild(); }
    });
    return () => { dead = true; };
  }, [rebuild]);

  /* ── Mouse handlers ── */
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
