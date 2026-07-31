import { useState, useRef, useEffect, useCallback } from "react";

import zenInfrastructure from "@/assets/zen-infrastructure.jpg";
import zenLedger        from "@/assets/zen-ledger.jpg";
import zenOverview      from "@/assets/zen-overview.jpg";
import zenPartnership   from "@/assets/zen-partnership.jpg";
import zenPioneer       from "@/assets/zen-pioneer.jpg";

interface GalleryItem { src: string; label: string; sub: string; eager?: boolean; }

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
        const wave = Math.sin(t * 2.2 - i * 0.32) * 0.5 + 0.5;
        if (slot.locked) {
          slot.lockFor--;
          if (slot.lockFor <= 0) { slot.locked = false; el.style.textShadow = ""; }
          el.style.color = `rgba(0,212,255,${(0.72 + wave * 0.28).toFixed(3)})`;
          return;
        }
        slot.idx += slot.speed;
        if (slot.idx >= SIGIL_POOL.length) slot.idx -= SIGIL_POOL.length;
        if (frame % 2 === 0) el.textContent = SIGIL_POOL[Math.floor(slot.idx)];
        el.style.color = `rgba(160,200,255,${(0.14 + wave * 0.20).toFixed(3)})`;
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
        <span key={i} ref={el => { spanRefs.current[i] = el; }} className="image-theater__sigil">
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
const AUTO_MS = 5500;

export default function ImageTheater() {
  const [active,    setActive]    = useState(0);
  const [mouse,     setMouse]     = useState({ x: 0.5, y: 0.5 });
  const [paused,    setPaused]    = useState(false);
  const [loaded,    setLoaded]    = useState(false);
  const [failedSet, setFailedSet] = useState<Set<string>>(() => new Set());
  const autoRef  = useRef<ReturnType<typeof setInterval>>();
  const touchRef = useRef<{ x: number; y: number } | null>(null);

  const markFailed = useCallback((src: string) => {
    setFailedSet(prev => { const s = new Set(prev); s.add(src); return s; });
  }, []);

  const items = ALL_ITEMS.filter(item => !failedSet.has(item.src));
  const n = items.length;

  useEffect(() => { setActive(a => (n > 0 ? Math.min(a, n - 1) : 0)); }, [n]);

  const prev = useCallback(() => setActive(a => (a - 1 + n) % n), [n]);
  const next = useCallback(() => setActive(a => (a + 1) % n),     [n]);

  useEffect(() => {
    if (paused) return;
    autoRef.current = setInterval(next, AUTO_MS);
    return () => clearInterval(autoRef.current);
  }, [paused, next]);

  /* Warm the next slide so the crossfade never flashes an empty frame */
  useEffect(() => {
    if (n < 2) return;
    const img = new Image();
    img.src = items[(active + 1) % n].src;
  }, [active, n, items]);

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

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const start = touchRef.current;
    touchRef.current = null;
    if (!start) return;
    const dx = e.changedTouches[0].clientX - start.x;
    const dy = e.changedTouches[0].clientY - start.y;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx > 0) prev(); else next();
    }
  }, [prev, next]);

  useEffect(() => { setLoaded(false); }, [active]);

  const counterNum = useScramble(String(active + 1).padStart(2, "0"));
  const item = items[active];

  /* Subtle parallax — image drifts inside the masked window */
  const px = (mouse.x - 0.5) * 32;
  const py = (mouse.y - 0.5) * 20;

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

      {/* ── Large feature window ── */}
      <div
        className="image-theater__feature"
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => { setPaused(false); setMouse({ x: 0.5, y: 0.5 }); }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Corner brackets */}
        <span className="tc-br tc-br--tl" aria-hidden />
        <span className="tc-br tc-br--tr" aria-hidden />
        <span className="tc-br tc-br--bl" aria-hidden />
        <span className="tc-br tc-br--br" aria-hidden />

        {/* Decrypting shimmer while the frame loads */}
        {!loaded && <div className="image-theater__feature-shimmer" aria-hidden />}

        {/* Primary image — parallax on wrapper, slow Ken Burns drift on img */}
        {item && (
          <div
            key={item.src}
            className="image-theater__feature-drift"
            style={{ transform: `translate(${px.toFixed(1)}px, ${py.toFixed(1)}px)` }}
          >
            <img
              src={item.src}
              alt={item.label}
              className={`image-theater__feature-img${loaded ? " image-theater__feature-img--in" : ""}`}
              loading={item.eager ? "eager" : "lazy"}
              decoding="async"
              onLoad={() => setLoaded(true)}
              onError={() => markFailed(item.src)}
            />
          </div>
        )}

        {/* Scanlines overlay */}
        <div className="image-theater__feature-scanlines" aria-hidden />

        {/* Bottom label */}
        {item && (
          <div className="image-theater__feature-meta">
            <span className="image-theater__feature-name">{item.label}</span>
            <span className="image-theater__feature-sub">{item.sub}</span>
          </div>
        )}

        {/* Autoplay countdown — refills each slide, freezes on hover */}
        <div
          key={`t-${active}`}
          className={`image-theater__timer${paused ? " image-theater__timer--held" : ""}`}
          style={{ animationDuration: `${AUTO_MS}ms` }}
          aria-hidden
        />

        {/* Top-edge pulse line */}
        <div className="image-theater__feature-pulse" aria-hidden />
      </div>

      {/* ── Thumbnail strip nav ── */}
      <div className="image-theater__nav">
        <button className="theater-arrow" onClick={prev} aria-label="Previous image">
          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M8 1L3 6l5 5" />
          </svg>
        </button>

        <div className="image-theater__thumbs">
          {items.map((it, i) => (
            <button
              key={it.src}
              className={`image-theater__thumb${i === active ? " image-theater__thumb--on" : ""}`}
              onClick={() => { setActive(i); setPaused(true); }}
              aria-label={it.label}
            >
              <img src={it.src} alt="" loading="lazy" decoding="async" />
              {i === active && <span className="image-theater__thumb-bar" />}
            </button>
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
