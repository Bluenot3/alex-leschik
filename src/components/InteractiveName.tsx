import { useRef, useEffect, useCallback, useLayoutEffect } from "react";
import {
  clearParticleCaches,
  getParticleTemplate,
  type ParticleTemplate,
} from "@/components/interactive-name/particleLayout";

/* ─────────────────────────────────────────────────────
   Physics — tuned for instant feel + smooth return
───────────────────────────────────────────────────── */
const MOUSE_RADIUS   = 125;   // repulsion zone radius (px)
const DISPERSE_FORCE = 46;    // push magnitude — punchy and immediate
const RETURN_SPEED   = 0.095; // spring pull toward home
const FRICTION       = 0.848; // velocity decay per frame
const MOUSE_LERP     = 0.38;  // smoothed-mouse tracking speed (0=never, 1=instant)
const MAX_SPEED      = 22;    // px/frame hard cap — prevents any spike artifact
const MAX_SPEED_SQ   = MAX_SPEED * MAX_SPEED;

/* ─────────────────────────────────────────────────────
   Gentle idle oscillation — single sin() pair per frame,
   per-particle phase offsets applied to a shared wave value
───────────────────────────────────────────────────── */
const WAVE_AMP    = 0.6;       // px — subtle breathing
const WAVE_FREQ_X = 0.00074;   // rad/ms
const WAVE_FREQ_Y = 0.00055;   // rad/ms

/* ─────────────────────────────────────────────────────
   Scroll transition
───────────────────────────────────────────────────── */
const TRANSITION_START = 0.004;
const TRANSITION_END   = 0.018;

/* ─────────────────────────────────────────────────────
   Speed² thresholds for colour state
───────────────────────────────────────────────────── */
const SPEED_GLOW    =  3;
const SPEED_SCATTER = 28;

/* ─────────────────────────────────────────────────────
   Colour LUTs — 101 pre-computed strings, zero alloc in loop
───────────────────────────────────────────────────── */
const BASE_LUT    = Array.from({length:101},(_,i)=>`hsl(216 52% 15% / ${(i/100).toFixed(2)})`);
const ACCENT_LUT  = Array.from({length:101},(_,i)=>`hsl(205 100% 60% / ${(i/100).toFixed(2)})`);
const GLOW_LUT    = Array.from({length:101},(_,i)=>`hsl(192 96% 62% / ${(i/100).toFixed(2)})`);
const SCATTER_LUT = Array.from({length:101},(_,i)=>`hsl(268 90% 68% / ${(i/100).toFixed(2)})`);
const SHIMMER_LUT = Array.from({length:101},(_,i)=>`hsl(215 78% 95% / ${(i/100).toFixed(2)})`);
const SHIMMER_SC  = Array.from({length:101},(_,i)=>`hsl(46 100% 90% / ${(i/100).toFixed(2)})`);

/* ─────────────────────────────────────────────────────
   Structure-of-Arrays particle state.
   Particles are PRE-SORTED by type at spawn time so the
   three render passes have zero branch overhead.
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
  n0:     number; // end of type-0 block (exclusive)
  n1:     number; // end of type-1 block (exclusive); type-2 goes [n1, count)
  pointSize:     number;
  gridPointSize: number;
  shimmerSize:   number;
}

const EMPTY: Particles = {
  homeX:new Float32Array(0), homeY:new Float32Array(0),
  x:new Float32Array(0),     y:new Float32Array(0),
  vx:new Float32Array(0),    vy:new Float32Array(0),
  alpha:new Float32Array(0),
  phaseX:new Float32Array(0), phaseY:new Float32Array(0),
  type:new Uint8Array(0),
  count:0, n0:0, n1:0,
  pointSize:1.5, gridPointSize:2.8, shimmerSize:4.5,
};

function spawnFromTemplate(tpl: ParticleTemplate, cw: number, ch: number): Particles {
  const n   = tpl.count;
  const tplType = tpl.type;

  /* ── Collect indices grouped by type ── */
  const idx0: number[] = [], idx1: number[] = [], idx2: number[] = [];
  for (let i = 0; i < n; i++) {
    if      (tplType[i] === 0) idx0.push(i);
    else if (tplType[i] === 1) idx1.push(i);
    else                       idx2.push(i);
  }
  const order = [...idx0, ...idx1, ...idx2]; // sorted: 0s → 1s → 2s

  /* ── Allocate SoA arrays ── */
  const homeX  = new Float32Array(n);
  const homeY  = new Float32Array(n);
  const px     = new Float32Array(n);
  const py     = new Float32Array(n);
  const phX    = new Float32Array(n);
  const phY    = new Float32Array(n);
  const al     = new Float32Array(n);
  const type   = new Uint8Array(n);

  for (let j = 0; j < n; j++) {
    const i   = order[j];
    const hx  = tpl.homeX[i];
    const hy  = tpl.homeY[i];
    homeX[j]  = hx;
    homeY[j]  = hy;
    type[j]   = tplType[i];
    phX[j]    = Math.random() * Math.PI * 2;
    phY[j]    = Math.random() * Math.PI * 2;

    /* Fan-in spawn from nearest edge */
    const fx = hx / cw, fy = hy / ch;
    const m  = Math.min(fy, 1-fy, fx, 1-fx);
    const jit = () => (Math.random() - 0.5) * 34;
    if      (m === fy)   { px[j] = hx + jit(); py[j] = -18 - Math.random()*65; }
    else if (m === 1-fy) { px[j] = hx + jit(); py[j] = ch+18 + Math.random()*65; }
    else if (m === fx)   { px[j] = -18 - Math.random()*65; py[j] = hy + jit(); }
    else                 { px[j] = cw+18 + Math.random()*65; py[j] = hy + jit(); }
    al[j] = 0;
  }

  return {
    homeX, homeY,
    x: px, y: py,
    vx: new Float32Array(n), vy: new Float32Array(n),
    alpha: al,
    phaseX: phX, phaseY: phY,
    type,
    count: n,
    n0: idx0.length,
    n1: idx0.length + idx1.length,
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef   = useRef<HTMLDivElement>(null);
  const parts     = useRef<Particles>(EMPTY);
  const rawMouse  = useRef({ x: -9999, y: -9999 }); // set by DOM events
  const sMouse    = useRef({ x: -9999, y: -9999 }); // lerped each RAF frame
  const raf       = useRef(0);
  const dpr       = useRef(1);
  const t0        = useRef(performance.now());

  /* ── Scroll opacity / transform — direct DOM write ── */
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const sp  = scrollProgress;
    const raw = sp <= TRANSITION_START ? 0
              : sp >= TRANSITION_END   ? 1
              : (sp - TRANSITION_START) / (TRANSITION_END - TRANSITION_START);
    const e   = raw * raw * (3 - 2 * raw); // smoothstep
    wrap.style.opacity   = String(1 - e);
    wrap.style.transform = `translateY(${e * -100}%) scale(${1 - e * 0.72})`;
  }, [scrollProgress]);

  /* ── Build particle arrays ── */
  const rebuild = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const d    = Math.min(window.devicePixelRatio || 1, 2);
    dpr.current = d;
    const rect = canvas.parentElement!.getBoundingClientRect();
    const w = rect.width, h = rect.height;
    if (w < 4 || h < 4) return;
    canvas.width  = w * d;
    canvas.height = h * d;
    canvas.style.width  = `${w}px`;
    canvas.style.height = `${h}px`;
    parts.current = spawnFromTemplate(getParticleTemplate(0, w, h), w, h);
    t0.current    = performance.now();
  }, []);

  /* ─────────────────────────────────────────────────────
     Main render loop
  ───────────────────────────────────────────────────── */
  const render = useCallback((now: number) => {
    const canvas = canvasRef.current;
    if (!canvas) { raf.current = requestAnimationFrame(render); return; }
    const ctx = canvas.getContext("2d")!;
    const d   = dpr.current;

    /* ── Clear (no trail — keeps the frame clean and snappy) ── */
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(d, d);

    /* ── Lerp smoothed mouse toward raw cursor ── */
    const rx = rawMouse.current.x;
    const ry = rawMouse.current.y;
    if (rx > -9000) {
      sMouse.current.x += (rx - sMouse.current.x) * MOUSE_LERP;
      sMouse.current.y += (ry - sMouse.current.y) * MOUSE_LERP;
    } else {
      sMouse.current.x = -9999;
      sMouse.current.y = -9999;
    }
    const mx = sMouse.current.x;
    const my = sMouse.current.y;

    /* ── Morph timing (ease-out-cubic, 550ms) ── */
    const morphE = 1 - Math.pow(Math.max(0, 1 - (now - t0.current) / 550), 3);

    /* ── Global wave values for this frame (2 sin calls total) ── */
    const wvX = Math.sin(now * WAVE_FREQ_X) * WAVE_AMP;
    const wvY = Math.sin(now * WAVE_FREQ_Y) * WAVE_AMP;

    /* ── Shimmer twinkle base ── */
    const twinkleBase = now * 0.0072;

    /* ── Breathe multiplier for accent nodes ── */
    const breathe = 0.88 + Math.sin(now * 0.0027) * 0.12;

    const {
      homeX, homeY, x, y, vx, vy, alpha,
      phaseX, phaseY, count,
      n0, n1,
      pointSize, gridPointSize, shimmerSize,
    } = parts.current;

    const rSq      = MOUSE_RADIUS * MOUSE_RADIUS;
    const bHalf    = pointSize     * 0.5;
    const gHalf    = gridPointSize * 0.5;
    const sHalf    = shimmerSize   * 0.5;

    /* ────────────────────────────────────────────────
       Physics pass — single loop over all particles
    ──────────────────────────────────────────────── */
    for (let i = 0; i < count; i++) {
      /* Fade in */
      alpha[i] += (morphE - alpha[i]) * 0.13;

      /* Oscillating home — per-particle phase offset applied to global wave */
      const tx = homeX[i] + Math.cos(phaseX[i]) * wvX - Math.sin(phaseX[i]) * wvY;
      const ty = homeY[i] + Math.sin(phaseY[i]) * wvX + Math.cos(phaseY[i]) * wvY;

      /* Cursor repulsion — cubic ease-in for perfectly smooth force gradient */
      const dx  = x[i] - mx;
      const dy  = y[i] - my;
      const dSq = dx * dx + dy * dy;
      if (dSq < rSq && dSq > 0.25) {
        const t   = (rSq - dSq) / rSq;
        const f   = t * t * t;
        const inv = 1.0 / Math.sqrt(dSq);
        vx[i]    += dx * inv * f * DISPERSE_FORCE;
        vy[i]    += dy * inv * f * DISPERSE_FORCE;
      }

      /* Spring + friction */
      vx[i] += (tx - x[i]) * RETURN_SPEED;
      vy[i] += (ty - y[i]) * RETURN_SPEED;
      vx[i] *= FRICTION;
      vy[i] *= FRICTION;

      /* Hard velocity cap */
      const spSq = vx[i]*vx[i] + vy[i]*vy[i];
      if (spSq > MAX_SPEED_SQ) {
        const s = MAX_SPEED / Math.sqrt(spSq);
        vx[i] *= s; vy[i] *= s;
      }

      x[i] += vx[i];
      y[i] += vy[i];
    }

    /* ────────────────────────────────────────────────
       Render pass 1 — type=0 base (indices 0..n0)
       No type check needed — array is pre-sorted
    ──────────────────────────────────────────────── */
    let last = "";
    for (let i = 0; i < n0; i++) {
      const a = alpha[i];
      if (a < 0.035) continue;
      const sp  = vx[i]*vx[i] + vy[i]*vy[i];
      const lut = sp > SPEED_SCATTER ? SCATTER_LUT : sp > SPEED_GLOW ? GLOW_LUT : BASE_LUT;
      const col = lut[(a * 100 + 0.5) | 0];
      if (col !== last) { ctx.fillStyle = col; last = col; }
      ctx.fillRect(x[i] - bHalf, y[i] - bHalf, pointSize, pointSize);
    }

    /* ────────────────────────────────────────────────
       Render pass 2 — type=1 accent (indices n0..n1)
    ──────────────────────────────────────────────── */
    last = "";
    for (let i = n0; i < n1; i++) {
      const a = alpha[i];
      if (a < 0.035) continue;
      const sp  = vx[i]*vx[i] + vy[i]*vy[i];
      const lut = sp > SPEED_SCATTER ? SCATTER_LUT : sp > SPEED_GLOW ? GLOW_LUT : ACCENT_LUT;
      const col = lut[Math.min(100, (a * breathe * 100 + 0.5) | 0)];
      if (col !== last) { ctx.fillStyle = col; last = col; }
      ctx.fillRect(x[i] - gHalf, y[i] - gHalf, gridPointSize, gridPointSize);
    }

    /* ────────────────────────────────────────────────
       Render pass 3 — type=2 shimmer (indices n1..count)
    ──────────────────────────────────────────────── */
    if (shimmerSize > 0 && n1 < count) {
      last = "";
      const armLen  = shimmerSize * 0.86;
      const armW    = 1.0;
      const armHalf = armLen * 0.5;
      for (let i = n1; i < count; i++) {
        const a = alpha[i];
        if (a < 0.035) continue;
        const tw  = 0.6 + Math.sin(twinkleBase + phaseX[i] * 3.0) * 0.4;
        const sp  = vx[i]*vx[i] + vy[i]*vy[i];
        const lut = sp > SPEED_SCATTER ? SHIMMER_SC : SHIMMER_LUT;
        const col = lut[Math.min(100, (a * tw * 100 + 0.5) | 0)];
        if (col !== last) { ctx.fillStyle = col; last = col; }
        ctx.fillRect(x[i]-sHalf,           y[i]-sHalf,           shimmerSize, shimmerSize);
        ctx.fillRect(x[i]-sHalf-armHalf,   y[i]-armW*0.5,        armLen,      armW);
        ctx.fillRect(x[i]-armW*0.5,        y[i]-sHalf-armHalf,   armW,        armLen);
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
    return () => { cancelAnimationFrame(raf.current); window.removeEventListener("resize", rebuild); };
  }, [rebuild, render]);

  useEffect(() => {
    if (!("fonts" in document)) return;
    let dead = false;
    document.fonts.ready.then(() => { if (!dead) { clearParticleCaches(); rebuild(); } });
    return () => { dead = true; };
  }, [rebuild]);

  /* ── Mouse — set raw, loop does lerp ── */
  const onMove = useCallback((e: React.MouseEvent) => {
    const r = canvasRef.current?.getBoundingClientRect();
    if (r) rawMouse.current = { x: e.clientX - r.left, y: e.clientY - r.top };
  }, []);
  const onLeave = useCallback(() => { rawMouse.current = { x: -9999, y: -9999 }; }, []);

  return (
    <div
      ref={wrapRef}
      className="hero-name-layer"
      style={{ opacity:1, transform:"translateY(0%) scale(1)", transformOrigin:"left top", willChange:"transform, opacity" }}
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
