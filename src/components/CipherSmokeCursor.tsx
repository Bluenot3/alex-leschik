import { useRef, useEffect, useCallback } from "react";

/* ─────────────────────────────────────────────────────
   Cipher glyph vocabulary
───────────────────────────────────────────────────── */
const GLYPHS = [
  "0x", "SHA", "AES", "RSA", "ECC", "zk", "sig", "key", "tx",
  "∞", "∇", "∂", "Σ", "Ω", "π", "λ", "⊕", "⊗", "∀", "∃",
  "≡", "≈", "⌁", "⌬", "◈", "✦", "==", "!=", "<<", ">>",
  "{}", "[]", "</>", "κ", "φ", "∮", "⊂", "⊃", "∈", "∉",
  "0x1F", "ℵ", "ℏ", "⟨⟩", "‖", "∝", "√", "∛", "∬",
];

/* ─────────────────────────────────────────────────────
   Pearl colour palette — deep violet/slate/blue on dark
───────────────────────────────────────────────────── */
// Each entry: [hue, saturation%, lightness%]
const PEARL_PALETTE: [number, number, number][] = [
  [220, 80, 72],   // soft electric blue
  [240, 70, 76],   // periwinkle violet
  [200, 90, 68],   // bright cyan-blue
  [260, 72, 80],   // lavender
  [210, 100, 78],  // pure sky
  [230, 65, 84],   // ice blue
  [250, 60, 82],   // blue-violet
];

/* ─────────────────────────────────────────────────────
   Particle type
───────────────────────────────────────────────────── */
interface Smoke {
  x: number;
  y: number;
  vx: number;
  vy: number;
  glyph: string;
  size: number;
  rotation: number;
  rotSpeed: number;
  life: number;
  maxLife: number;
  hue: number;
  sat: number;
  lit: number;
  curlPhase: number; // for sinusoidal horizontal drift
  curlAmp: number;
}

/* ─────────────────────────────────────────────────────
   Props
───────────────────────────────────────────────────── */
interface Props {
  variant?: "pearl";
  intensity?: "subtle" | "normal" | "cinematic";
  className?: string;
}

const INTENSITY_MAP = {
  subtle:    { interval: 90,  burst: 1, maxLife: [70,  110] as [number, number] },
  normal:    { interval: 55,  burst: 1, maxLife: [80,  130] as [number, number] },
  cinematic: { interval: 38,  burst: 2, maxLife: [90,  150] as [number, number] },
};

export default function CipherSmokeCursor({
  intensity = "cinematic",
  className = "",
}: Props) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const pool       = useRef<Smoke[]>([]);
  const mouse      = useRef({ x: -1, y: -1, active: false });
  const raf        = useRef(0);
  const dpr        = useRef(1);
  const lastEmit   = useRef(0);
  const cfg        = INTENSITY_MAP[intensity];

  /* ── Resize canvas to full viewport ── */
  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const d = Math.min(window.devicePixelRatio || 1, 2);
    dpr.current = d;
    canvas.width  = window.innerWidth  * d;
    canvas.height = window.innerHeight * d;
    canvas.style.width  = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
  }, []);

  /* ── Spawn particles at cursor ── */
  const emit = useCallback(() => {
    const { x, y, active } = mouse.current;
    if (!active || x < 0) return;

    for (let i = 0; i < cfg.burst; i++) {
      const [hue, sat, lit] = PEARL_PALETTE[Math.floor(Math.random() * PEARL_PALETTE.length)];
      const angle  = -Math.PI / 2 + (Math.random() - 0.5) * 1.4; // mostly upward
      const speed  = 0.3 + Math.random() * 0.7;
      const [minL, maxL] = cfg.maxLife;
      const maxLife = minL + Math.random() * (maxL - minL);

      pool.current.push({
        x:         x + (Math.random() - 0.5) * 12,
        y:         y + (Math.random() - 0.5) * 12,
        vx:        Math.cos(angle) * speed,
        vy:        Math.sin(angle) * speed,
        glyph:     GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
        size:      8 + Math.random() * 8,
        rotation:  Math.random() * Math.PI * 2,
        rotSpeed:  (Math.random() - 0.5) * 0.045,
        life:      0,
        maxLife,
        hue, sat, lit,
        curlPhase: Math.random() * Math.PI * 2,
        curlAmp:   0.025 + Math.random() * 0.04,
      });
    }
  }, [cfg]);

  /* ── Render loop ── */
  const render = useCallback((now: number) => {
    const canvas = canvasRef.current;
    if (!canvas) { raf.current = requestAnimationFrame(render); return; }
    const ctx = canvas.getContext("2d")!;
    const d   = dpr.current;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    /* Emit new smoke on interval */
    if (now - lastEmit.current >= cfg.interval) {
      emit();
      lastEmit.current = now;
    }

    ctx.save();
    ctx.scale(d, d);

    const alive: Smoke[] = [];

    for (const p of pool.current) {
      p.life++;
      if (p.life >= p.maxLife) continue;

      const t       = p.life / p.maxLife;

      /* Alpha envelope: quick fade-in, long float, gentle fade-out */
      const fadeIn  = Math.min(1, p.life / 12);
      const fadeOut = t > 0.55 ? 1 - (t - 0.55) / 0.45 : 1;
      const alpha   = fadeIn * fadeOut * fadeOut; // ease-out fade

      /* Sinusoidal horizontal curl (smoke turbulence) */
      p.vx += Math.sin(p.life * p.curlAmp + p.curlPhase) * 0.012;

      /* Very gentle deceleration */
      p.vx *= 0.985;
      p.vy *= 0.988;

      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotSpeed;

      /* Size expands slightly as it rises (smoke bloom) */
      const size = p.size * (1 + t * 0.35);

      ctx.save();
      ctx.globalAlpha = alpha * 0.92;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);

      /* Outer soft glow */
      ctx.shadowColor = `hsla(${p.hue}, ${p.sat}%, ${p.lit}%, 0.55)`;
      ctx.shadowBlur  = 12 + alpha * 8;

      /* Glyph fill — lightness drifts slightly as alpha changes */
      const dynamicLit = p.lit - (1 - alpha) * 10;
      ctx.fillStyle = `hsl(${p.hue} ${p.sat}% ${dynamicLit}% / 1)`;
      ctx.font      = `${size}px "Courier New", "SF Mono", monospace`;
      ctx.textAlign    = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(p.glyph, 0, 0);

      /* Second pass: bright inner highlight for premium depth */
      ctx.shadowBlur  = 4;
      ctx.shadowColor = `hsla(${p.hue}, 100%, 90%, ${alpha * 0.4})`;
      ctx.globalAlpha = alpha * 0.28;
      ctx.fillStyle   = `hsl(${p.hue} 60% 96%)`;
      ctx.fillText(p.glyph, 0, 0);

      ctx.restore();
      alive.push(p);
    }

    ctx.restore();
    pool.current = alive;
    raf.current  = requestAnimationFrame(render);
  }, [emit, cfg.interval]);

  /* ── Lifecycle ── */
  useEffect(() => {
    resize();
    raf.current = requestAnimationFrame(render);

    const onMove  = (e: MouseEvent) => {
      mouse.current = { x: e.clientX, y: e.clientY, active: true };
    };
    const onEnter = (e: MouseEvent) => {
      mouse.current = { x: e.clientX, y: e.clientY, active: true };
    };
    const onLeave = () => {
      mouse.current.active = false;
    };

    window.addEventListener("mousemove",  onMove,  { passive: true });
    window.addEventListener("mouseenter", onEnter, { passive: true });
    document.addEventListener("mouseleave", onLeave);
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(raf.current);
      window.removeEventListener("mousemove",  onMove);
      window.removeEventListener("mouseenter", onEnter);
      document.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("resize", resize);
    };
  }, [resize, render]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        position:      "fixed",
        inset:         0,
        pointerEvents: "none",
        zIndex:        9998,
      }}
      aria-hidden="true"
    />
  );
}
