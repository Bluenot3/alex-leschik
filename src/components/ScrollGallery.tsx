import { useEffect, useRef, useState } from "react";

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

/* ── Individual card with scroll-triggered reveal ──────── */
function SgCard({ item, index }: { item: SgItem; index: number }) {
  const ref           = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  const [err, setErr] = useState(false);

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

  /* stagger left→right by column position */
  const delay = (index % 3) * 0.11;

  if (err) return null;

  return (
    <div
      ref={ref}
      className="sg-card"
      style={{
        opacity:    vis ? 1 : 0,
        transform:  vis
          ? "translateY(0px) scale(1)"
          : "translateY(64px) scale(0.91)",
        transition: `opacity 0.72s ease ${delay}s, transform 0.72s cubic-bezier(0.22,1,0.36,1) ${delay}s`,
      }}
    >
      <img
        src={item.src}
        alt={item.label}
        className="sg-card__img"
        loading="lazy"
        onError={() => setErr(true)}
      />

      {/* Corner brackets — reuse theater styles */}
      <span className="tc-br tc-br--tl" />
      <span className="tc-br tc-br--tr" />
      <span className="tc-br tc-br--bl" />
      <span className="tc-br tc-br--br" />

      {/* Scan-line sweep on hover (CSS ::after) */}

      {/* Label strip */}
      <div className="sg-card__label">
        <span className="sg-card__name">{item.label}</span>
        <span className="sg-card__sub">{item.sub}</span>
      </div>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────── */
export default function ScrollGallery() {
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
          <SgCard key={item.src} item={item} index={i} />
        ))}
      </div>
    </section>
  );
}
