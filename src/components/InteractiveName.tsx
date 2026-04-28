import { useRef, useEffect, useCallback, useLayoutEffect } from "react";
import {
  clearParticleCaches,
  getParticleTemplate,
  type ParticleTemplate,
} from "@/components/interactive-name/particleLayout";

/* ── Physics ── */
const MOUSE_RADIUS    = 150;
const DISPERSE_FORCE  = 26;
const RETURN_SPEED    = 0.09;
const FRICTION        = 0.83;

/* ── Scatter-speed threshold (speed² units) ── */
const SCATTER_SQ = 9; // ~3 px/frame — only active during actual dispersal

/* ── Color LUTs — pre-computed, zero-alloc in hot path ── */
// Type-0 particles: ultra-fine dark-slate base fill
const BASE_LUT = Array.from({ length: 101 }, (_, i) =>
  `hsl(215 55% 8% / ${(i / 100).toFixed(2)})`
);
// Type-1 particles: bright electric-blue grid accent nodes
const GRID_LUT = Array.from({ length: 101 }, (_, i) =>
  `hsl(210 100% 60% / ${(i / 100).toFixed(2)})`
);
// Scatter flash: violet, shown when particle is actively displaced
const SCATTER_LUT = Array.from({ length: 101 }, (_, i) =>
  `hsl(268 85% 60% / ${(i / 100).toFixed(2)})`
);

/* ── Scroll-transition thresholds (scrollProgress 0–1) ── */
const TRANSITION_START = 0.004;  // ~30 px scroll
const TRANSITION_END   = 0.018;  // ~133 px scroll

/* ── Particle state — Structure-of-Arrays ── */
interface Particles {
  homeX: Float32Array;
  homeY: Float32Array;
  x:     Float32Array;
  y:     Float32Array;
  vx:    Float32Array;
  vy:    Float32Array;
  alpha: Float32Array;
  type:  Uint8Array;   // 0 = base fill, 1 = grid accent node
  count: number;
  pointSize:     number;   // 1 px — ultra-sharp base
  gridPointSize: number;   // 2.2 px — visible accent sub-pattern
}

const EMPTY: Particles = {
  homeX: new Float32Array(0), homeY: new Float32Array(0),
  x:     new Float32Array(0), y:     new Float32Array(0),
  vx:    new Float32Array(0), vy:    new Float32Array(0),
  alpha: new Float32Array(0),
  type:  new Uint8Array(0),
  count: 0, pointSize: 1, gridPointSize: 2.2,
};

/* Fan-in entrance: each particle spawns from the nearest screen edge */
function spawnFromTemplate(tpl: ParticleTemplate, cw: number, ch: number): Particles {
  const n  = tpl.count;
  const hx = tpl.homeX.slice();
  const hy = tpl.homeY.slice();
  const px = new Float32Array(n);
  const py = new Float32Array(n);
  const al = new Float32Array(n);

  for (let i = 0; i < n; i++) {
    const fx = hx[i] / cw;
    const fy = hy[i] / ch;
    const dT = fy;          // distance to top edge (0–1)
    const dB = 1 - fy;      // distance to bottom edge
    const dL = fx;          // distance to left edge
    const dR = 1 - fx;     // distance to right edge
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
    al[i] = 0;
  }

  return {
    homeX: hx, homeY: hy,
    x: px, y: py,
    vx: new Float32Array(n), vy: new Float32Array(n),
    alpha: al,
    type: tpl.type.slice(),
    count: n,
    pointSize:     tpl.pointSize,
    gridPointSize: tpl.gridPointSize,
  };
}

/* ── Component ── */
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

  /* ── Scroll transform — direct DOM mutation, zero React re-renders ── */
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

  /* ── Build / rebuild particles ── */
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
    const tpl  = getParticleTemplate(0, w, h);   // 0 = ALEXANDER LESCHIK
    p.current  = spawnFromTemplate(tpl, w, h);
    startTime.current = performance.now();
  }, []);

  /* ── Render loop ── */
  const render = useCallback((now: number) => {
    const canvas = canvasRef.current;
    if (!canvas) { raf.current = requestAnimationFrame(render); return; }
    const ctx  = canvas.getContext("2d")!;
    const d    = dpr.current;
    const mx   = mouse.current.x;
    const my   = mouse.current.y;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(d, d);

    /* Morph timing — ease-out-cubic, 500ms to fully assemble */
    const morphT = Math.min(1, (now - startTime.current) / 500);
    const ease   = 1 - Math.pow(1 - morphT, 3);

    /* Slow gentle breathing for grid accents (2-second period) */
    const pulse  = 0.88 + Math.sin(now * 0.003) * 0.12;

    const {
      homeX, homeY, x, y, vx, vy, alpha,
      type, count, pointSize, gridPointSize,
    } = p.current;

    const rSq      = MOUSE_RADIUS * MOUSE_RADIUS;
    const baseHalf = pointSize     * 0.5;
    const gridHalf = gridPointSize * 0.5;

    /* ── Physics pass ── */
    for (let i = 0; i < count; i++) {
      alpha[i] += (ease - alpha[i]) * 0.11;

      const dx  = x[i] - mx;
      const dy  = y[i] - my;
      const dSq = dx * dx + dy * dy;

      if (dSq < rSq && dSq > 1) {
        const f   = (rSq - dSq) / rSq;
        const inv = 1 / Math.sqrt(dSq);
        vx[i] += dx * inv * f * f * DISPERSE_FORCE;
        vy[i] += dy * inv * f * f * DISPERSE_FORCE;
      }

      vx[i] += (homeX[i] - x[i]) * RETURN_SPEED;
      vy[i] += (homeY[i] - y[i]) * RETURN_SPEED;
      vx[i] *= FRICTION;
      vy[i] *= FRICTION;
      x[i]  += vx[i];
      y[i]  += vy[i];
    }

    /* ── Render pass 1: base fill particles (type = 0) ── */
    let lastIdx = -1;
    let lastScattered = false;
    for (let i = 0; i < count; i++) {
      if (type[i] !== 0) continue;
      const a = alpha[i];
      if (a < 0.04) continue;

      const speedSq    = vx[i] * vx[i] + vy[i] * vy[i];
      const scattered  = speedSq > SCATTER_SQ;
      const lut        = scattered ? SCATTER_LUT : BASE_LUT;
      const ci         = Math.min(100, (a * 100) | 0);

      if (scattered !== lastScattered || ci !== lastIdx) {
        ctx.fillStyle = lut[ci];
        lastIdx       = ci;
        lastScattered = scattered;
      }
      ctx.fillRect(x[i] - baseHalf, y[i] - baseHalf, pointSize, pointSize);
    }

    /* ── Render pass 2: grid accent nodes (type = 1) ── *
     *  These form the design-within-a-design sub-pattern:
     *  bright blue dots at 8 px grid intersections inside the letterforms,
     *  rendered on top of the base fill for maximum clarity.              */
    lastIdx      = -1;
    lastScattered = false;
    for (let i = 0; i < count; i++) {
      if (type[i] !== 1) continue;
      const a = alpha[i];
      if (a < 0.04) continue;

      const speedSq   = vx[i] * vx[i] + vy[i] * vy[i];
      const scattered = speedSq > SCATTER_SQ;
      const lut       = scattered ? SCATTER_LUT : GRID_LUT;
      const ci        = Math.min(100, (a * pulse * 100) | 0);

      if (scattered !== lastScattered || ci !== lastIdx) {
        ctx.fillStyle = lut[ci];
        lastIdx       = ci;
        lastScattered = scattered;
      }
      ctx.fillRect(x[i] - gridHalf, y[i] - gridHalf, gridPointSize, gridPointSize);
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
