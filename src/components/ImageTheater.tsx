import { useState, useRef, useEffect, useCallback } from "react";

import zenInfrastructure from "@/assets/zen-infrastructure.jpg";
import zenLedger        from "@/assets/zen-ledger.jpg";
import zenOverview      from "@/assets/zen-overview.jpg";
import zenPartnership   from "@/assets/zen-partnership.jpg";
import zenPioneer       from "@/assets/zen-pioneer.jpg";

interface GalleryItem { src: string; label: string; sub: string; eager?: boolean; }

/* Built-in bundled assets — always available */
const BUILT_IN: GalleryItem[] = [
  { src: zenInfrastructure, label: "ZEN INFRASTRUCTURE", sub: "Platform Architecture",  eager: true },
  { src: zenLedger,         label: "ZEN LEDGER",         sub: "Financial Systems",       eager: true },
  { src: zenOverview,       label: "ZEN OVERVIEW",       sub: "Mission Map",             eager: true },
  { src: zenPartnership,    label: "ZEN PARTNERSHIP",    sub: "Strategic Network",       eager: true },
  { src: zenPioneer,        label: "ZEN PIONEER",        sub: "Education Program",       eager: true },
];

const PUBLIC_GALLERY: GalleryItem[] = [
  { src: "/gallery/zen-weekly-fresco.jpg",  label: "ZEN WEEKLY",  sub: "Cultural Archive"    },
  { src: "/gallery/zen-weekly-city.jpg",    label: "ZEN WEEKLY",  sub: "Digital Frontier"    },
  { src: "/gallery/arsenal.jpg",            label: "ARSENAL",     sub: "Visual Archive"      },
  { src: "/gallery/zenai-world-tunnel.jpg", label: "ZENAI.WORLD", sub: "Market Intelligence" },
  { src: "/gallery/zenai-world-sphere.jpg", label: "ZENAI.WORLD", sub: "Neural Systems"      },
];

const ALL_ITEMS = [...BUILT_IN, ...PUBLIC_GALLERY];

/* ── Enhanced procedural wave-field canvas ──────────────────────── */
function WaveField({ active }: { active: number }) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const rafRef     = useRef<number>(0);
  const tRef       = useRef(0);
  const frameRef   = useRef(0);
  const activeRef  = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const COLS = 48;   /* was 64 — 44% fewer dots */
    const ROWS = 24;   /* was 32 */

    const tick = () => {
      if (document.hidden) { rafRef.current = requestAnimationFrame(tick); return; }

      /* Skip every other frame → effective 30 fps for background canvas */
      frameRef.current++;
      if (frameRef.current % 2 !== 0) { rafRef.current = requestAnimationFrame(tick); return; }

      tRef.current += 0.024;  /* doubled to compensate for frame-skip (maintains same visual speed) */
      const t   = tRef.current;
      const act = activeRef.current;

      const w = canvas.offsetWidth  || 900;
      const h = canvas.offsetHeight || 520;
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }

      /* Fade trail for motion blur effect (slightly stronger at 30fps cadence) */
      ctx.fillStyle = "rgba(4, 8, 18, 0.30)";
      ctx.fillRect(0, 0, w, h);

      const cw = w / COLS;
      const ch = h / ROWS;

      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const nx = c / COLS;
          const ny = r / ROWS;
          const d  = Math.sqrt((nx - 0.5) ** 2 + (ny - 0.5) ** 2);

          /* Three layered waves */
          const w1 = Math.sin(d * 22 - t * 3.2) * 0.5 + 0.5;
          const w2 = Math.cos(nx * 16 + t * 1.8) * Math.sin(ny * 12 - t * 2.4) * 0.5 + 0.5;
          const w3 = Math.sin((nx + ny) * 10 - t * 1.5) * 0.5 + 0.5;
          const v  = w1 * 0.45 + w2 * 0.35 + w3 * 0.20;

          if (v < 0.25) continue;

          const size  = v * 3.2;
          const alpha = (v - 0.25) * 0.32;

          /* Rainbow hue shift based on wave value + active index */
          const hue   = 190 + act * 18 + v * 80 + Math.sin(t * 0.5 + d * 6) * 30;
          const sat   = 65 + v * 25;
          const light = 55 + v * 30;

          ctx.beginPath();
          ctx.arc(c * cw + cw / 2, r * ch + ch / 2, size, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${hue},${sat}%,${light}%,${alpha})`;
          ctx.fill();

          /* Extra glow dot at center for bright nodes */
          if (v > 0.72) {
            ctx.beginPath();
            ctx.arc(c * cw + cw / 2, r * ch + ch / 2, size * 0.35, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${hue},90%,90%,${alpha * 0.6})`;
            ctx.fill();
          }
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
    />
  );
}

/* ── Individual card ───────────────────────────────────── */
function TheaterCard({
  item, offset, isActive, mouse, onClick, onFail,
}: {
  item: GalleryItem;
  offset: number;
  isActive: boolean;
  mouse: { x: number; y: number };
  onClick: () => void;
  onFail: (src: string) => void;
}) {
  const abs = Math.abs(offset);
  if (abs > 3) return null;

  const sign   = offset < 0 ? -1 : 1;
  /* Adjusted spread values for 380px wide card */
  const rotY   = isActive ? (mouse.x - 0.5) * 20   : Math.max(-72, Math.min(72, offset * 55));
  const rotX   = isActive ? (mouse.y - 0.5) * -12  : 0;
  const transX = isActive ? 0 : sign * Math.min(500, abs * 140);
  const transZ = isActive ? 80 : -Math.min(580, abs * 200);
  const scale  = isActive ? 1  : Math.max(0.32, 1 - abs * 0.23);
  const opac   = isActive ? 1  : Math.max(0.06, 1 - abs * 0.38);
  const blur   = isActive ? 0  : Math.max(0, (abs - 1) * 2.5);

  return (
    <div
      className={`theater-card${isActive ? " theater-card--active" : ""}`}
      style={{
        transform:  `translateX(${transX}px) translateZ(${transZ}px) rotateY(${rotY}deg) rotateX(${rotX}deg) scale(${scale})`,
        opacity:    opac,
        filter:     blur > 0 ? `blur(${blur}px)` : undefined,
        zIndex:     100 - abs * 10,
        cursor:     isActive ? "default" : "pointer",
        willChange: "transform, opacity",
        transition: "transform 0.65s cubic-bezier(0.22,1,0.36,1), opacity 0.6s ease, filter 0.45s ease",
      }}
      onClick={onClick}
    >
      <div className="theater-card__face">
        <img
          src={item.src}
          alt={item.label}
          className="theater-card__img"
          loading={item.eager ? "eager" : "lazy"}
          decoding="async"
          onError={() => onFail(item.src)}
        />

        {/* Holographic prismatic overlay */}
        {isActive && <div className="theater-card__holo" />}

        {/* Scanlines */}
        <div className="theater-card__scanlines" aria-hidden />

        {/* Corner brackets */}
        <span className="tc-br tc-br--tl" />
        <span className="tc-br tc-br--tr" />
        <span className="tc-br tc-br--bl" />
        <span className="tc-br tc-br--br" />

        {/* Active card label */}
        {isActive && (
          <div className="theater-card__label">
            <span className="theater-card__label-name">{item.label}</span>
            <span className="theater-card__label-sub">{item.sub}</span>
          </div>
        )}

        {/* Active: top-edge pulse line */}
        {isActive && <div className="theater-card__pulse-line" aria-hidden />}
      </div>

      {/* Mirror reflection below active card */}
      {isActive && (
        <div className="theater-card__mirror" aria-hidden>
          <img src={item.src} alt="" className="theater-card__mirror-img" loading="eager" />
        </div>
      )}
    </div>
  );
}

/* ── Sigil cipher strip ─────────────────────────────────── */
const SIGIL_POOL = "◈∷⊕≡∞ΣΩΔ⊗⊘⊙⊚≈◉◇✦⌘⌬⌾⟨⟩∂∇√π∫∑∏αβγδεφψλμξ∴∵≠≜⊞⊟";

function RunningGlyphs({ count = 28 }: { count?: number }) {
  const spanRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const slotRef = useRef(
    Array.from({ length: count }, () => ({
      idx:     Math.random() * SIGIL_POOL.length,
      speed:   0.022 + Math.random() * 0.09,
      locked:  false,
      lockFor: 0,
    }))
  );

  useEffect(() => {
    let frame = 0;
    let raf: number;
    const tick = () => {
      frame++;
      const t = frame * 0.016;

      slotRef.current.forEach((slot, i) => {
        const el = spanRefs.current[i];
        if (!el) return;

        /* Sine-wave brightness sweeps left → right continuously */
        const wave = Math.sin(t * 2.2 - i * 0.32) * 0.5 + 0.5;

        if (slot.locked) {
          slot.lockFor--;
          if (slot.lockFor <= 0) {
            slot.locked = false;
            el.style.textShadow = "";
          }
          /* Locked glyph still pulses with wave */
          const a = (0.72 + wave * 0.28).toFixed(3);
          el.style.color = `rgba(0,212,255,${a})`;
          return;
        }

        /* Advance index — update textContent every other frame */
        slot.idx += slot.speed;
        if (slot.idx >= SIGIL_POOL.length) slot.idx -= SIGIL_POOL.length;
        if (frame % 2 === 0) el.textContent = SIGIL_POOL[Math.floor(slot.idx)];

        /* Dim base + wave overlay */
        const alpha = (0.14 + wave * 0.20).toFixed(3);
        el.style.color = `rgba(160,200,255,${alpha})`;

        /* Random lock: cyan glow flash */
        if (Math.random() < 0.005) {
          slot.locked  = true;
          slot.lockFor = 30 + Math.floor(Math.random() * 50);
          el.style.textShadow = "0 0 7px rgba(0,212,255,0.65), 0 0 18px rgba(0,212,255,0.22)";
        }
      });

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [count]);

  return (
    <div className="image-theater__sigils" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          ref={el => { spanRefs.current[i] = el; }}
          className="image-theater__sigil"
        >
          {SIGIL_POOL[Math.floor(slotRef.current[i].idx)]}
        </span>
      ))}
    </div>
  );
}

/* ── Glitch text scrambler ──────────────────────────────── */
const GLYPHS = "0123456789アイウ∷≡⊕";
function useScramble(value: string) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    if (prev.current === value) return;
    prev.current = value;
    let frame = 0;
    const total = 10;
    const id = setInterval(() => {
      frame++;
      if (frame >= total) { setDisplay(value); clearInterval(id); return; }
      setDisplay(value.split("").map((ch, i) =>
        frame / total > i / value.length ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
      ).join(""));
    }, 28);
    return () => clearInterval(id);
  }, [value]);
  return display;
}

/* ── Main component ─────────────────────────────────────── */
export default function ImageTheater() {
  const [active,    setActive]    = useState(0);
  const [mouse,     setMouse]     = useState({ x: 0.5, y: 0.5 });
  const [paused,    setPaused]    = useState(false);
  const [failedSet, setFailedSet] = useState<Set<string>>(() => new Set());
  const autoRef = useRef<ReturnType<typeof setInterval>>();

  const markFailed = useCallback((src: string) => {
    setFailedSet(prev => { const s = new Set(prev); s.add(src); return s; });
  }, []);

  const items = ALL_ITEMS.filter(item => !failedSet.has(item.src));
  const n = items.length;

  useEffect(() => {
    setActive(a => (n > 0 ? Math.min(a, n - 1) : 0));
  }, [n]);

  const prev = useCallback(() => setActive(a => (a - 1 + n) % n), [n]);
  const next = useCallback(() => setActive(a => (a + 1) % n),     [n]);

  useEffect(() => {
    if (paused) return;
    autoRef.current = setInterval(next, 5500);
    return () => clearInterval(autoRef.current);
  }, [paused, next]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft")  prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [prev, next]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setMouse({ x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height });
  }, []);

  const counterNum = useScramble(String(active + 1).padStart(2, "0"));

  return (
    <section className="image-theater">
      <div className="image-theater__hdr">
        <span className="tag-label">Visual Archive · Built in Public</span>
        <h2 className="display-heading display-lg">VISUAL<br />ARSENAL</h2>
        <p className="body-muted" style={{ maxWidth: "28rem", margin: "0.5rem auto 0" }}>
          A visual archive of the campaigns, interfaces, product worlds, and generative systems behind ZEN AI, Arsenal, and AI literacy.
        </p>
        <div className="image-theater__count">
          <span className="image-theater__count-n">{counterNum}</span>
          <span className="image-theater__count-sep">/</span>
          <span className="image-theater__count-total">{String(n).padStart(2, "0")}</span>
        </div>
      </div>

      <div
        className="image-theater__stage"
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => { setPaused(false); setMouse({ x: 0.5, y: 0.5 }); }}
      >
        <WaveField active={active} />
        <div className="theater-coverflow">
          {items.map((item, i) => (
            <TheaterCard
              key={item.src}
              item={item}
              offset={i - active}
              isActive={i === active}
              mouse={mouse}
              onClick={() => { setActive(i); setPaused(true); }}
              onFail={markFailed}
            />
          ))}
        </div>
      </div>

      <div className="image-theater__nav">
        <button className="theater-arrow" onClick={prev} aria-label="Previous image">
          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M8 1L3 6l5 5" />
          </svg>
        </button>
        <div className="theater-dots">
          {items.map((item, i) => (
            <button
              key={item.src}
              className={`theater-dot${i === active ? " theater-dot--on" : ""}`}
              onClick={() => setActive(i)}
              aria-label={`Image ${i + 1}`}
            />
          ))}
        </div>
        <button className="theater-arrow" onClick={next} aria-label="Next image">
          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M4 1l5 5-5 5" />
          </svg>
        </button>
      </div>

      <RunningGlyphs />
    </section>
  );
}
