import { useRef, useEffect, useCallback } from "react";

/* ─────────────────────────────────────────────────────
   Cipher glyph vocabulary
───────────────────────────────────────────────────── */
const GLYPHS = [
  "0x","SHA","AES","RSA","ECC","zk","sig","key","tx",
  "∞","∇","∂","Σ","Ω","π","λ","⊕","⊗","∀","∃",
  "≡","≈","⌁","⌬","◈","✦","==","!=","<<",">>",
  "{}","[]","</>","κ","φ","∮","⊂","ℵ","ℏ","∝",
];

/* ─────────────────────────────────────────────────────
   Pearl palette — [h, s, l] — NO shadows, pure alpha+color
───────────────────────────────────────────────────── */
const PAL: [number, number, number][] = [
  [220, 90, 74],
  [240, 80, 78],
  [200, 95, 70],
  [258, 75, 80],
  [210,100, 80],
  [230, 70, 84],
];

const MAX_POOL = 120; // hard cap — never let the pool grow unbounded

interface Smoke {
  x: number; y: number;
  vx: number; vy: number;
  glyph: string;
  /** font size in CSS px — bucketed to even integers for batching */
  size: number;
  rotation: number;
  rotSpeed: number;
  life: number;
  maxLife: number;
  h: number; s: number; l: number;
  curlPhase: number;
  curlAmp: number;
}

interface Props {
  variant?: "pearl";
  intensity?: "subtle" | "normal" | "cinematic";
  className?: string;
}

const CFG = {
  subtle:    { ms: 90, burst: 1, lifeMin: 65,  lifeMax: 100 },
  normal:    { ms: 55, burst: 1, lifeMin: 75,  lifeMax: 120 },
  cinematic: { ms: 40, burst: 2, lifeMin: 80,  lifeMax: 130 },
};

export default function CipherSmokeCursor({
  intensity = "cinematic",
  className = "",
}: Props) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const pool       = useRef<Smoke[]>([]);
  const mouse      = useRef({ x: -1, y: -1, on: false });
  const raf        = useRef(0);
  const dpr        = useRef(1);
  const lastEmit   = useRef(0);
  const cfg        = CFG[intensity];

  /* ── Viewport resize ── */
  const resize = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const d = Math.min(window.devicePixelRatio || 1, 2);
    dpr.current = d;
    c.width  = window.innerWidth  * d;
    c.height = window.innerHeight * d;
    c.style.width  = `${window.innerWidth}px`;
    c.style.height = `${window.innerHeight}px`;
  }, []);

  /* ── Spawn ── */
  const emit = useCallback((now: number) => {
    if (!mouse.current.on) return;
    if (now - lastEmit.current < cfg.ms) return;
    lastEmit.current = now;

    const { x, y } = mouse.current;
    const space = MAX_POOL - pool.current.length;
    const n = Math.min(cfg.burst, space);
    if (n <= 0) return;

    for (let i = 0; i < n; i++) {
      const angle  = -Math.PI / 2 + (Math.random() - 0.5) * 1.3;
      const speed  = 0.35 + Math.random() * 0.65;
      const [h, s, l] = PAL[Math.floor(Math.random() * PAL.length)];
      // bucket size to even integer → minimises ctx.font state changes
      const rawSize = 9 + Math.random() * 7;
      const size = Math.round(rawSize / 2) * 2; // 8, 10, 12, 14, 16

      pool.current.push({
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 10,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        glyph:     GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
        size,
        rotation:  Math.random() * Math.PI * 2,
        rotSpeed:  (Math.random() - 0.5) * 0.04,
        life:      0,
        maxLife:   cfg.lifeMin + Math.random() * (cfg.lifeMax - cfg.lifeMin),
        h, s, l,
        curlPhase: Math.random() * Math.PI * 2,
        curlAmp:   0.02 + Math.random() * 0.035,
      });
    }
  }, [cfg]);

  /* ── Render ── */
  const render = useCallback((now: number) => {
    const c = canvasRef.current;
    if (!c) { raf.current = requestAnimationFrame(render); return; }
    const ctx = c.getContext("2d")!;
    const d   = dpr.current;

    ctx.clearRect(0, 0, c.width, c.height);
    emit(now);

    if (pool.current.length === 0) {
      raf.current = requestAnimationFrame(render);
      return;
    }

    ctx.save();
    ctx.scale(d, d);

    /* Sort by size so we switch ctx.font as rarely as possible */
    pool.current.sort((a, b) => a.size - b.size);

    const alive: Smoke[] = [];
    let lastFont = "";

    for (const p of pool.current) {
      p.life++;
      if (p.life >= p.maxLife) continue;

      /* Physics: sinusoidal curl + gentle decel */
      p.vx += Math.sin(p.life * p.curlAmp + p.curlPhase) * 0.010;
      p.vx *= 0.984;
      p.vy *= 0.987;
      p.x  += p.vx;
      p.y  += p.vy;
      p.rotation += p.rotSpeed;

      /* Alpha envelope: fast in, long hold, gentle out */
      const t      = p.life / p.maxLife;
      const fadeIn = Math.min(1, p.life / 10);
      const fadeOut = t > 0.5 ? 1 - (t - 0.5) / 0.5 : 1;
      const alpha  = fadeIn * fadeOut * fadeOut; // ease-out tail
      if (alpha < 0.01) { alive.push(p); continue; } // skip draw but keep particle

      /* Slight size bloom as it rises */
      const size = p.size * (1 + t * 0.28);

      /* Only update font string when size actually changes */
      const fontKey = `${size.toFixed(1)}px`;
      if (fontKey !== lastFont) {
        ctx.font = `600 ${size.toFixed(1)}px "Courier New","SF Mono",monospace`;
        lastFont = fontKey;
      }

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.textAlign    = "center";
      ctx.textBaseline = "middle";

      /* Single draw — no shadow, just crisp colored glyph with alpha */
      ctx.fillStyle = `hsl(${p.h} ${p.s}% ${p.l}%)`;
      ctx.fillText(p.glyph, 0, 0);

      ctx.restore();
      alive.push(p);
    }

    ctx.restore();
    pool.current = alive;
    raf.current  = requestAnimationFrame(render);
  }, [emit]);

  /* ── Lifecycle ── */
  useEffect(() => {
    resize();
    raf.current = requestAnimationFrame(render);

    const onMove  = (e: MouseEvent) => {
      mouse.current = { x: e.clientX, y: e.clientY, on: true };
    };
    const onLeave = () => { mouse.current.on = false; };

    window.addEventListener("mousemove",    onMove,  { passive: true });
    document.addEventListener("mouseleave", onLeave, { passive: true });
    window.addEventListener("resize",       resize,  { passive: true });

    return () => {
      cancelAnimationFrame(raf.current);
      window.removeEventListener("mousemove",    onMove);
      document.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("resize",       resize);
    };
  }, [resize, render]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9998 }}
      aria-hidden="true"
    />
  );
}
