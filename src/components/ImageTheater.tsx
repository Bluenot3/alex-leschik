import { useState, useRef, useEffect, useCallback } from "react";

import zenInfrastructure from "@/assets/zen-infrastructure.jpg";
import zenLedger        from "@/assets/zen-ledger.jpg";
import zenOverview      from "@/assets/zen-overview.jpg";
import zenPartnership   from "@/assets/zen-partnership.jpg";
import zenPioneer       from "@/assets/zen-pioneer.jpg";

/* ── Gallery items ───────────────────────────────────────
   Drop your 5 images in  public/gallery/  with these exact names:
     arsenal.jpg  |  zenai-world-tunnel.jpg  |  zenai-world-sphere.jpg
     zen-weekly-fresco.jpg  |  zen-weekly-city.jpg
   They load automatically — no code changes needed.
──────────────────────────────────────────────────────── */
interface GalleryItem { src: string; label: string; sub: string; }

const PUBLIC_GALLERY: GalleryItem[] = [
  { src: "/gallery/arsenal.jpg",            label: "ARSENAL",     sub: "Visual Archive" },
  { src: "/gallery/zenai-world-tunnel.jpg", label: "ZENAI.WORLD", sub: "Spatial Experience" },
  { src: "/gallery/zenai-world-sphere.jpg", label: "ZENAI.WORLD", sub: "Global Constellation" },
  { src: "/gallery/zen-weekly-fresco.jpg",  label: "ZEN WEEKLY",  sub: "Cultural Record" },
  { src: "/gallery/zen-weekly-city.jpg",    label: "ZEN WEEKLY",  sub: "Digital Frontier" },
];

const BUILT_IN: GalleryItem[] = [
  { src: zenInfrastructure, label: "ZEN INFRASTRUCTURE", sub: "Platform Architecture" },
  { src: zenLedger,         label: "ZEN LEDGER",         sub: "Financial Systems" },
  { src: zenOverview,       label: "ZEN OVERVIEW",       sub: "Mission Map" },
  { src: zenPartnership,    label: "ZEN PARTNERSHIP",    sub: "Strategic Network" },
  { src: zenPioneer,        label: "ZEN PIONEER",        sub: "Education Program" },
];

const ALL_ITEMS = [...PUBLIC_GALLERY, ...BUILT_IN];

/* ── Procedural wave-field canvas ──────────────────────── */
function WaveField({ active }: { active: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const tRef      = useRef(0);
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const COLS = 55;
    const ROWS = 28;

    const tick = () => {
      tRef.current += 0.011;
      const t = tRef.current;
      const act = activeRef.current;

      const w = canvas.offsetWidth  || 800;
      const h = canvas.offsetHeight || 500;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width  = w;
        canvas.height = h;
      }

      ctx.clearRect(0, 0, w, h);

      const cw = w / COLS;
      const ch = h / ROWS;

      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const nx = c / COLS;
          const ny = r / ROWS;
          const d  = Math.sqrt((nx - 0.5) ** 2 + (ny - 0.5) ** 2);

          const w1 = Math.sin(d * 20 - t * 2.8) * 0.5 + 0.5;
          const w2 = Math.cos(nx * 14 + t * 1.6) * Math.sin(ny * 10 - t * 2.1) * 0.5 + 0.5;
          const v  = w1 * 0.55 + w2 * 0.45;

          if (v < 0.28) continue;

          const size  = v * 2.8;
          const alpha = (v - 0.28) * 0.22;
          const hue   = 205 + act * 18 + v * 50;

          ctx.beginPath();
          ctx.arc(c * cw + cw / 2, r * ch + ch / 2, size, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${hue},72%,65%,${alpha})`;
          ctx.fill();
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
  item, offset, isActive, mouse, onClick,
}: {
  item: GalleryItem;
  offset: number;
  isActive: boolean;
  mouse: { x: number; y: number };
  onClick: () => void;
}) {
  const abs = Math.abs(offset);
  if (abs > 4) return null;

  const sign  = offset < 0 ? -1 : 1;
  const rotY  = isActive ? (mouse.x - 0.5) * 24  : Math.max(-72, Math.min(72, offset * 54));
  const rotX  = isActive ? (mouse.y - 0.5) * -16 : 0;
  const transX = isActive ? 0 : sign * Math.min(580, abs * 135);
  const transZ = isActive ? 60 : -Math.min(680, abs * 240);
  const scale  = isActive ? 1  : Math.max(0.28, 1 - abs * 0.22);
  const opac   = isActive ? 1  : Math.max(0.07, 1 - abs * 0.33);
  const blur   = isActive ? 0  : Math.max(0, (abs - 1) * 2.2);

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
        transition: "transform 0.68s cubic-bezier(0.22,1,0.36,1), opacity 0.68s ease, filter 0.5s ease",
      }}
      onClick={onClick}
    >
      {/* Card face */}
      <div className="theater-card__face">
        <img
          src={item.src}
          alt={item.label}
          className="theater-card__img"
          loading="lazy"
          onError={e => { (e.currentTarget as HTMLImageElement).style.opacity = "0"; }}
        />

        {/* Holographic sweep — active only */}
        {isActive && <div className="theater-card__holo" />}

        {/* Scanlines */}
        <div className="theater-card__scanlines" aria-hidden />

        {/* Corner brackets */}
        <span className="tc-br tc-br--tl" /><span className="tc-br tc-br--tr" />
        <span className="tc-br tc-br--bl" /><span className="tc-br tc-br--br" />

        {/* Label strip */}
        {isActive && (
          <div className="theater-card__label">
            <span className="theater-card__label-name">{item.label}</span>
            <span className="theater-card__label-sub">{item.sub}</span>
          </div>
        )}
      </div>

      {/* Mirror reflection — active only */}
      {isActive && (
        <div className="theater-card__mirror" aria-hidden>
          <img src={item.src} alt="" className="theater-card__mirror-img" />
        </div>
      )}
    </div>
  );
}

/* ── Glitch text scrambler for counter ─────────────────── */
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
      setDisplay(
        value.split("").map((ch, i) =>
          frame / total > i / value.length ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
        ).join("")
      );
    }, 28);
    return () => clearInterval(id);
  }, [value]);

  return display;
}

/* ── Main component ─────────────────────────────────────── */
export default function ImageTheater() {
  const [active,  setActive]  = useState(0);
  const [mouse,   setMouse]   = useState({ x: 0.5, y: 0.5 });
  const [paused,  setPaused]  = useState(false);
  const autoRef = useRef<ReturnType<typeof setInterval>>();
  const n = ALL_ITEMS.length;

  const prev = useCallback(() => setActive(a => (a - 1 + n) % n), [n]);
  const next = useCallback(() => setActive(a => (a + 1) % n),     [n]);

  /* Auto-advance */
  useEffect(() => {
    if (paused) return;
    autoRef.current = setInterval(next, 5000);
    return () => clearInterval(autoRef.current);
  }, [paused, next]);

  /* Keyboard navigation */
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
      {/* ── Header ── */}
      <div className="image-theater__hdr">
        <span className="tag-label">Visual Archive · Built in Public</span>
        <h2 className="display-heading display-lg">VISUAL<br />ARSENAL</h2>
        <p className="body-muted" style={{ maxWidth: "28rem", margin: "0.5rem auto 0" }}>
          Every image is a deployment. Generative, intentional, and built to hold attention.
        </p>
        <div className="image-theater__count">
          <span className="image-theater__count-n">{counterNum}</span>
          <span className="image-theater__count-sep">/</span>
          <span className="image-theater__count-total">{String(n).padStart(2, "0")}</span>
        </div>
      </div>

      {/* ── Stage ── */}
      <div
        className="image-theater__stage"
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => { setPaused(false); setMouse({ x: 0.5, y: 0.5 }); }}
      >
        <WaveField active={active} />

        <div className="theater-coverflow">
          {ALL_ITEMS.map((item, i) => (
            <TheaterCard
              key={i}
              item={item}
              offset={i - active}
              isActive={i === active}
              mouse={mouse}
              onClick={() => { setActive(i); setPaused(true); }}
            />
          ))}
        </div>
      </div>

      {/* ── Navigation ── */}
      <div className="image-theater__nav">
        <button className="theater-arrow" onClick={prev} aria-label="Previous image">
          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M8 1L3 6l5 5" />
          </svg>
        </button>

        <div className="theater-dots">
          {ALL_ITEMS.map((_, i) => (
            <button
              key={i}
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

      {/* ── Dev-skill label strip ── */}
      <div className="image-theater__stack">
        {["Canvas API", "CSS 3D Transforms", "requestAnimationFrame", "React Hooks", "Physics Simulation", "Procedural Generation"].map(t => (
          <span key={t} className="image-theater__stack-chip">{t}</span>
        ))}
      </div>
    </section>
  );
}
