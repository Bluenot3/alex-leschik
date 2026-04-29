import { useRef, useEffect, useCallback, useLayoutEffect } from "react";
import {
  clearParticleCaches,
  getParticleTemplate,
  type ParticleTemplate,
} from "@/components/interactive-name/particleLayout";

/* ─────────────────────────────────────────────────────
   Physics
───────────────────────────────────────────────────── */
const MOUSE_RADIUS   = 122;
const DISPERSE_FORCE = 50;    // punchy scatter
const RETURN_SPEED   = 0.10;  // snappy spring
const FRICTION       = 0.855; // tight damping — fast return, no oscillation
const MOUSE_LERP     = 0.42;  // feel-instant, still blocks spikes
const MAX_SPEED      = 20;
const MAX_SPEED_SQ   = MAX_SPEED * MAX_SPEED;

/* ─────────────────────────────────────────────────────
   Idle oscillation
   Two sin/cos pairs are computed ONCE per frame;
   hot loop does only multiplications (no transcendentals)
───────────────────────────────────────────────────── */
const WAVE_AMP    = 0.65;
const WAVE_FREQ_X = 0.00076;
const WAVE_FREQ_Y = 0.00057;

/* ─────────────────────────────────────────────────────
   Trail — offscreen canvas drawn at reduced opacity each
   frame. GPU-accelerated drawImage, no destination-out.
───────────────────────────────────────────────────── */
const TRAIL_OPACITY = 0.70; // previous frame redrawn at 70% → ~8-frame tail

/* ─────────────────────────────────────────────────────
   Scroll transition
───────────────────────────────────────────────────── */
const TRANSITION_START = 0.004;
const TRANSITION_END   = 0.018;

/* ─────────────────────────────────────────────────────
   Speed² thresholds
───────────────────────────────────────────────────── */
const SPEED_GLOW    =  3;
const SPEED_SCATTER = 26;

/* ─────────────────────────────────────────────────────
   Colour LUTs — vivid, saturated for crispness
───────────────────────────────────────────────────── */
const BASE_LUT    = Array.from({length:101},(_,i)=>`hsl(215 58% 16% / ${(i/100).toFixed(2)})`);
const ACCENT_LUT  = Array.from({length:101},(_,i)=>`hsl(204 100% 63% / ${(i/100).toFixed(2)})`);
const GLOW_LUT    = Array.from({length:101},(_,i)=>`hsl(190 100% 65% / ${(i/100).toFixed(2)})`);
const SCATTER_LUT = Array.from({length:101},(_,i)=>`hsl(265 95% 70% / ${(i/100).toFixed(2)})`);
const SHIMMER_LUT = Array.from({length:101},(_,i)=>`hsl(214 80% 96% / ${(i/100).toFixed(2)})`);
const SHIMMER_SC  = Array.from({length:101},(_,i)=>`hsl(44 100% 92% / ${(i/100).toFixed(2)})`);

/* ─────────────────────────────────────────────────────
   Particle SoA — pre-sorted by type + precomputed trig
───────────────────────────────────────────────────── */
interface Particles {
  homeX:  Float32Array;
  homeY:  Float32Array;
  x:      Float32Array;
  y:      Float32Array;
  vx:     Float32Array;
  vy:     Float32Array;
  alpha:  Float32Array;
  /* Precomputed at spawn — eliminate transcendentals from hot loop */
  cosPhX: Float32Array; sinPhX: Float32Array;
  cosPhY: Float32Array; sinPhY: Float32Array;
  /* Raw phase for shimmer twinkle (still used in shimmer pass) */
  phaseX: Float32Array;
  type:   Uint8Array;
  count:  number;
  n0:     number; // [0, n0)  = type-0
  n1:     number; // [n0, n1) = type-1; [n1, count) = type-2
  pointSize:     number;
  gridPointSize: number;
  shimmerSize:   number;
}

const EMPTY: Particles = {
  homeX:new Float32Array(0), homeY:new Float32Array(0),
  x:new Float32Array(0),     y:new Float32Array(0),
  vx:new Float32Array(0),    vy:new Float32Array(0),
  alpha:new Float32Array(0),
  cosPhX:new Float32Array(0), sinPhX:new Float32Array(0),
  cosPhY:new Float32Array(0), sinPhY:new Float32Array(0),
  phaseX:new Float32Array(0),
  type:new Uint8Array(0),
  count:0, n0:0, n1:0,
  pointSize:1.4, gridPointSize:2.6, shimmerSize:4.5,
};

function spawnFromTemplate(tpl: ParticleTemplate, cw: number, ch: number): Particles {
  const n       = tpl.count;
  const tplType = tpl.type;

  /* Group indices by type */
  const idx0: number[] = [], idx1: number[] = [], idx2: number[] = [];
  for (let i = 0; i < n; i++) {
    if      (tplType[i] === 0) idx0.push(i);
    else if (tplType[i] === 1) idx1.push(i);
    else                       idx2.push(i);
  }
  const order = [...idx0, ...idx1, ...idx2];

  /* Allocate */
  const homeX  = new Float32Array(n);
  const homeY  = new Float32Array(n);
  const px     = new Float32Array(n);
  const py     = new Float32Array(n);
  const al     = new Float32Array(n);
  const cosPhX = new Float32Array(n);
  const sinPhX = new Float32Array(n);
  const cosPhY = new Float32Array(n);
  const sinPhY = new Float32Array(n);
  const phaseX = new Float32Array(n);
  const type   = new Uint8Array(n);

  for (let j = 0; j < n; j++) {
    const i  = order[j];
    const hx = tpl.homeX[i];
    const hy = tpl.homeY[i];
    homeX[j] = hx;
    homeY[j] = hy;
    type[j]  = tplType[i];

    /* Precompute trig for wave oscillation — never called in hot loop */
    const pX = Math.random() * Math.PI * 2;
    const pY = Math.random() * Math.PI * 2;
    cosPhX[j] = Math.cos(pX);
    sinPhX[j] = Math.sin(pX);
    cosPhY[j] = Math.cos(pY);
    sinPhY[j] = Math.sin(pY);
    phaseX[j] = pX; // kept for shimmer twinkle

    /* Fan-in from nearest edge */
    const fx = hx / cw, fy = hy / ch;
    const m  = Math.min(fy, 1-fy, fx, 1-fx);
    const jit = () => (Math.random() - 0.5) * 32;
    if      (m === fy)   { px[j] = hx + jit(); py[j] = -16 - Math.random()*60; }
    else if (m === 1-fy) { px[j] = hx + jit(); py[j] = ch+16 + Math.random()*60; }
    else if (m === fx)   { px[j] = -16 - Math.random()*60; py[j] = hy + jit(); }
    else                 { px[j] = cw+16 + Math.random()*60; py[j] = hy + jit(); }
    al[j] = 0;
  }

  return {
    homeX, homeY,
    x: px, y: py,
    vx: new Float32Array(n), vy: new Float32Array(n),
    alpha: al,
    cosPhX, sinPhX, cosPhY, sinPhY, phaseX,
    type,
    count: n, n0: idx0.length, n1: idx0.length + idx1.length,
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
  const trailRef  = useRef<HTMLCanvasElement | null>(null); // offscreen trail buffer
  const wrapRef   = useRef<HTMLDivElement>(null);
  const parts     = useRef<Particles>(EMPTY);
  const rawMouse  = useRef({ x: -9999, y: -9999 });
  const sMouse    = useRef({ x: -9999, y: -9999 });
  const raf       = useRef(0);
  const dpr       = useRef(1);
  const t0        = useRef(performance.now());

  /* ── Scroll opacity/transform — direct DOM write ── */
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const sp  = scrollProgress;
    const raw = sp <= TRANSITION_START ? 0
              : sp >= TRANSITION_END   ? 1
              : (sp - TRANSITION_START) / (TRANSITION_END - TRANSITION_START);
    const e = raw * raw * (3 - 2 * raw);
    wrap.style.opacity   = String(1 - e);
    wrap.style.transform = `translateY(${e * -100}%) scale(${1 - e * 0.72})`;
  }, [scrollProgress]);

  /* ── Build particle arrays + create trail canvas ── */
  const rebuild = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const d = Math.min(window.devicePixelRatio || 1, 2);
    dpr.current = d;
    const rect = canvas.parentElement!.getBoundingClientRect();
    const w = rect.width, h = rect.height;
    if (w < 4 || h < 4) return;

    canvas.width  = w * d;
    canvas.height = h * d;
    canvas.style.width  = `${w}px`;
    canvas.style.height = `${h}px`;

    /* Trail canvas — same physical size, never inserted into DOM */
    const trail = document.createElement("canvas");
    trail.width  = w * d;
    trail.height = h * d;
    trailRef.current = trail;

    parts.current = spawnFromTemplate(getParticleTemplate(0, w, h), w, h);
    t0.current    = performance.now();
  }, []);

  /* ─────────────────────────────────────────────────────
     Render loop
  ───────────────────────────────────────────────────── */
  const render = useCallback((now: number) => {
    const canvas = canvasRef.current;
    const trail  = trailRef.current;
    if (!canvas) { raf.current = requestAnimationFrame(render); return; }
    const ctx = canvas.getContext("2d")!;
    const d   = dpr.current;

    /* ── 1. Clear main canvas ── */
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    /* ── 2. Composite trail from previous frame (GPU-accelerated drawImage) ── */
    if (trail) {
      ctx.globalAlpha = TRAIL_OPACITY;
      ctx.drawImage(trail, 0, 0);
      ctx.globalAlpha = 1.0;
    }

    ctx.save();
    ctx.scale(d, d);

    /* ── 3. Advance smoothed cursor ── */
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

    /* ── 4. Per-frame wave scalars (4 trig calls total — zero in hot loop) ── */
    const morphE   = 1 - Math.pow(Math.max(0, 1 - (now - t0.current) / 500), 3);
    const wvXsin   = Math.sin(now * WAVE_FREQ_X) * WAVE_AMP;
    const wvXcos   = Math.cos(now * WAVE_FREQ_X) * WAVE_AMP;
    const wvYsin   = Math.sin(now * WAVE_FREQ_Y) * WAVE_AMP;
    const wvYcos   = Math.cos(now * WAVE_FREQ_Y) * WAVE_AMP;
    const breathe  = 0.88 + Math.sin(now * 0.0028) * 0.12; // 1 extra sin — worth it
    const twinkleB = now * 0.0070;

    const {
      homeX, homeY, x, y, vx, vy, alpha,
      cosPhX, sinPhX, cosPhY, sinPhY, phaseX,
      count, n0, n1,
      pointSize, gridPointSize, shimmerSize,
    } = parts.current;

    const rSq   = MOUSE_RADIUS * MOUSE_RADIUS;
    const bHalf = pointSize     * 0.5;
    const gHalf = gridPointSize * 0.5;
    const sHalf = shimmerSize   * 0.5;

    /* ─────────────────────────────────────────────────
       Physics — pure multiply/add, zero transcendentals
    ──────────────────────────────────────────────── */
    for (let i = 0; i < count; i++) {
      alpha[i] += (morphE - alpha[i]) * 0.13;

      /* Per-particle wave: expand sin(freq*t + phase) using precomputed trig
         sin(A+B) = sinA·cosB + cosA·sinB  |  cos(A+B) = cosA·cosB - sinA·sinB  */
      const tx = homeX[i] + wvXsin * cosPhX[i] + wvXcos * sinPhX[i];
      const ty = homeY[i] + wvYsin * cosPhY[i] + wvYcos * sinPhY[i];

      /* Repulsion: cubic falloff for silky smooth edge */
      const dx  = x[i] - mx;
      const dy  = y[i] - my;
      const dSq = dx * dx + dy * dy;
      if (dSq < rSq && dSq > 0.25) {
        const t   = (rSq - dSq) / rSq;
        const f   = t * t * t;
        const inv = 1.0 / Math.sqrt(dSq);
        vx[i] += dx * inv * f * DISPERSE_FORCE;
        vy[i] += dy * inv * f * DISPERSE_FORCE;
      }

      vx[i] += (tx - x[i]) * RETURN_SPEED;
      vy[i] += (ty - y[i]) * RETURN_SPEED;
      vx[i] *= FRICTION;
      vy[i] *= FRICTION;

      const spSq = vx[i]*vx[i] + vy[i]*vy[i];
      if (spSq > MAX_SPEED_SQ) {
        const s = MAX_SPEED / Math.sqrt(spSq);
        vx[i] *= s; vy[i] *= s;
      }

      x[i] += vx[i];
      y[i] += vy[i];
    }

    /* ─────────────────────────────────────────────────
       Render — three type-contiguous passes, no branch
    ──────────────────────────────────────────────── */
    let last = "";

    /* Pass 1: type-0 base */
    for (let i = 0; i < n0; i++) {
      const a = alpha[i]; if (a < 0.03) continue;
      const sp  = vx[i]*vx[i] + vy[i]*vy[i];
      const lut = sp > SPEED_SCATTER ? SCATTER_LUT : sp > SPEED_GLOW ? GLOW_LUT : BASE_LUT;
      const col = lut[(a * 100 + 0.5) | 0];
      if (col !== last) { ctx.fillStyle = col; last = col; }
      ctx.fillRect(x[i] - bHalf, y[i] - bHalf, pointSize, pointSize);
    }

    /* Pass 2: type-1 accent */
    last = "";
    for (let i = n0; i < n1; i++) {
      const a = alpha[i]; if (a < 0.03) continue;
      const sp  = vx[i]*vx[i] + vy[i]*vy[i];
      const lut = sp > SPEED_SCATTER ? SCATTER_LUT : sp > SPEED_GLOW ? GLOW_LUT : ACCENT_LUT;
      const col = lut[Math.min(100, (a * breathe * 100 + 0.5) | 0)];
      if (col !== last) { ctx.fillStyle = col; last = col; }
      ctx.fillRect(x[i] - gHalf, y[i] - gHalf, gridPointSize, gridPointSize);
    }

    /* Pass 3: type-2 shimmer */
    if (shimmerSize > 0 && n1 < count) {
      last = "";
      const armLen  = shimmerSize * 0.86;
      const armW    = 1.0;
      const armHalf = armLen * 0.5;
      for (let i = n1; i < count; i++) {
        const a = alpha[i]; if (a < 0.03) continue;
        const tw  = 0.6 + Math.sin(twinkleB + phaseX[i] * 3.0) * 0.4;
        const sp  = vx[i]*vx[i] + vy[i]*vy[i];
        const lut = sp > SPEED_SCATTER ? SHIMMER_SC : SHIMMER_LUT;
        const col = lut[Math.min(100, (a * tw * 100 + 0.5) | 0)];
        if (col !== last) { ctx.fillStyle = col; last = col; }
        ctx.fillRect(x[i]-sHalf,         y[i]-sHalf,         shimmerSize, shimmerSize);
        ctx.fillRect(x[i]-sHalf-armHalf, y[i]-armW*0.5,      armLen,      armW);
        ctx.fillRect(x[i]-armW*0.5,      y[i]-sHalf-armHalf, armW,        armLen);
      }
    }

    ctx.restore();

    /* ── 5. Capture this frame into the trail buffer ── */
    if (trail) {
      const tc = trail.getContext("2d")!;
      tc.clearRect(0, 0, trail.width, trail.height);
      tc.drawImage(canvas, 0, 0);
    }

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
