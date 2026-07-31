import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import zenInfrastructure from "@/assets/zen-infrastructure.jpg";
import zenLedger         from "@/assets/zen-ledger.jpg";
import zenOverview       from "@/assets/zen-overview.jpg";
import zenPartnership    from "@/assets/zen-partnership.jpg";
import zenPioneer        from "@/assets/zen-pioneer.jpg";

interface SgItem { src: string; label: string; sub: string; }

/* Built-in assets first (always loads) — public gallery appended when images are dropped in */
const ITEMS: SgItem[] = [
  { src: zenInfrastructure, label: "ZEN INFRASTRUCTURE", sub: "Platform Architecture" },
  { src: zenLedger,         label: "ZEN LEDGER",         sub: "Financial Systems"     },
  { src: zenOverview,       label: "ZEN OVERVIEW",       sub: "Mission Map"           },
  { src: zenPartnership,    label: "ZEN PARTNERSHIP",    sub: "Strategic Network"     },
  { src: zenPioneer,        label: "ZEN PIONEER",        sub: "Education Program"     },
  /* ── Drop images in public/gallery/ and they appear automatically ── */
  { src: "/gallery/arsenal.jpg",            label: "ARSENAL",     sub: "Visual Archive"       },
  { src: "/gallery/zenai-world-tunnel.jpg", label: "ZENAI.WORLD", sub: "Spatial Experience"   },
  { src: "/gallery/zenai-world-sphere.jpg", label: "ZENAI.WORLD", sub: "Global Constellation" },
  { src: "/gallery/zen-weekly-fresco.jpg",  label: "ZEN WEEKLY",  sub: "Cultural Record"      },
  { src: "/gallery/zen-weekly-city.jpg",    label: "ZEN WEEKLY",  sub: "Digital Frontier"     },
];

/* ── Individual card with scroll reveal + pointer tilt ──── */
function SgCard({
  item, index, onOpen,
}: { item: SgItem; index: number; onOpen: () => void }) {
  const ref             = useRef<HTMLButtonElement>(null);
  const [vis, setVis]   = useState(false);
  const [ok,  setOk]    = useState(false);
  const [err, setErr]   = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVis(true); io.disconnect(); } },
      { rootMargin: "0px 0px -60px 0px", threshold: 0.07 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /* Perspective tilt toward the cursor — resets smoothly on leave */
  const handleMove = useCallback((e: React.PointerEvent<HTMLElement>) => {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse") return;
    const r  = el.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width  - 0.5;
    const ny = (e.clientY - r.top)  / r.height - 0.5;
    el.style.setProperty("--tilt-x", `${(-ny * 6).toFixed(2)}deg`);
    el.style.setProperty("--tilt-y", `${(nx * 8).toFixed(2)}deg`);
    el.style.setProperty("--glare-x", `${((nx + 0.5) * 100).toFixed(1)}%`);
    el.style.setProperty("--glare-y", `${((ny + 0.5) * 100).toFixed(1)}%`);
  }, []);

  const handleLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--tilt-x", "0deg");
    el.style.setProperty("--tilt-y", "0deg");
  }, []);

  /* stagger left→right by column position */
  const delay = (index % 3) * 0.11;

  if (err) return null;

  return (
    <button
      ref={ref}
      type="button"
      className="sg-card"
      onClick={onOpen}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      aria-label={`View ${item.label} — ${item.sub}`}
      style={{
        opacity:    vis ? 1 : 0,
        transform:  vis
          ? "translateY(0px) scale(1)"
          : "translateY(64px) scale(0.91)",
        transition: `opacity 0.72s ease ${delay}s, transform 0.72s cubic-bezier(0.22,1,0.36,1) ${delay}s`,
      }}
    >
      <div className="sg-card__tilt">
        {!ok && <span className="sg-card__shimmer" aria-hidden />}
        <img
          src={item.src}
          alt={item.label}
          className={`sg-card__img${ok ? " sg-card__img--in" : ""}`}
          loading="lazy"
          decoding="async"
          onLoad={() => setOk(true)}
          onError={() => setErr(true)}
        />

        {/* Corner brackets — reuse theater styles */}
        <span className="tc-br tc-br--tl" />
        <span className="tc-br tc-br--tr" />
        <span className="tc-br tc-br--bl" />
        <span className="tc-br tc-br--br" />

        {/* Cursor-tracking glare */}
        <span className="sg-card__glare" aria-hidden />

        {/* Label strip */}
        <div className="sg-card__label">
          <span className="sg-card__name">{item.label}</span>
          <span className="sg-card__sub">{item.sub}</span>
        </div>

        <span className="sg-card__expand" aria-hidden>⤢</span>
      </div>
    </button>
  );
}

/* ── Fullscreen lightbox ────────────────────────────────── */
function Lightbox({
  items, index, onClose, onStep,
}: { items: SgItem[]; index: number; onClose: () => void; onStep: (dir: 1 | -1) => void }) {
  const item = items[index];

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape")     onClose();
      if (e.key === "ArrowLeft")  onStep(-1);
      if (e.key === "ArrowRight") onStep(1);
    };
    window.addEventListener("keydown", h);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", h);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, onStep]);

  if (!item) return null;

  /* Portalled to the body so page chrome cannot paint over the viewer. */
  return createPortal(
    <div className="sg-lightbox" role="dialog" aria-modal="true" aria-label={item.label} onClick={onClose}>
      <figure className="sg-lightbox__stage" onClick={e => e.stopPropagation()}>
        <img key={item.src} src={item.src} alt={item.label} className="sg-lightbox__img" />
        <figcaption className="sg-lightbox__meta">
          <span className="sg-lightbox__name">{item.label}</span>
          <span className="sg-lightbox__sub">{item.sub}</span>
          <span className="sg-lightbox__count">{String(index + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}</span>
        </figcaption>

        <button type="button" className="sg-lightbox__arrow sg-lightbox__arrow--prev" onClick={() => onStep(-1)} aria-label="Previous image">
          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M8 1L3 6l5 5" /></svg>
        </button>
        <button type="button" className="sg-lightbox__arrow sg-lightbox__arrow--next" onClick={() => onStep(1)} aria-label="Next image">
          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 1l5 5-5 5" /></svg>
        </button>
      </figure>

      <button type="button" className="sg-lightbox__close" onClick={onClose} aria-label="Close viewer">
        <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M1 1l10 10M11 1L1 11" /></svg>
      </button>
    </div>,
    document.body,
  );
}

/* ── Main component ─────────────────────────────────────── */
export default function ScrollGallery() {
  const [open, setOpen] = useState<number | null>(null);

  const step = useCallback((dir: 1 | -1) => {
    setOpen(o => (o === null ? o : (o + dir + ITEMS.length) % ITEMS.length));
  }, []);

  return (
    <section className="scroll-gallery">
      <div className="scroll-gallery__hdr">
        <span className="tag-label">Visual Field · Work in Public</span>
        <h2 className="display-heading display-lg">IMAGE<br />ARCHIVE</h2>
        <p className="body-muted" style={{ maxWidth: "26rem", margin: "0.5rem auto 0" }}>
          Every frame is a deliberate decision. Infrastructure, identity, and generative work — documented.
        </p>
      </div>

      <div className="scroll-gallery__grid">
        {ITEMS.map((item, i) => (
          <SgCard key={item.src} item={item} index={i} onOpen={() => setOpen(i)} />
        ))}
      </div>

      {open !== null && (
        <Lightbox items={ITEMS} index={open} onClose={() => setOpen(null)} onStep={step} />
      )}
    </section>
  );
}
