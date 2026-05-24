import { useState, useCallback } from "react";

const HREF = "https://arsenal.world";

interface CardDef {
  src:    string;
  label:  string;
  sub:    string;
  accent: string;
  hero?:  boolean;
}

const CARDS: CardDef[] = [
  /* Hero — tall left column */
  {
    src: "/gallery/arsenal.jpg",
    label: "ARSENAL", sub: "COMMAND CENTER",
    accent: "206 92% 60%",
    hero: true,
  },
  /* 2 × 2 right grid */
  {
    src: "/gallery/zen-weekly-fresco.jpg",
    label: "ZEN WEEKLY", sub: "CITY NETWORKS",
    accent: "128 80% 56%",
  },
  {
    src: "/gallery/zen-weekly-city.jpg",
    label: "ZEN WEEKLY", sub: "DIGITAL FRONTIER",
    accent: "128 80% 56%",
  },
  {
    src: "/gallery/zen-weekly-mosaic.jpg",
    label: "ZEN WEEKLY", sub: "MOSAIC ARCHIVE",
    accent: "281 82% 68%",
  },
  {
    src: "/gallery/zen-weekly-world.jpg",
    label: "ZEN WEEKLY", sub: "WORLD SYSTEM",
    accent: "352 88% 64%",
  },
];

export default function ArsenalShowcase() {
  const [hov,    setHov]    = useState<number | null>(null);
  const [failed, setFailed] = useState<Set<string>>(() => new Set());

  const markFailed = useCallback((src: string) => {
    setFailed(prev => { const s = new Set(prev); s.add(src); return s; });
  }, []);

  const cards = CARDS.filter(c => !failed.has(c.src));

  return (
    <section className="arsenal-showcase" id="arsenal">

      {/* ── Header ── */}
      <div className="arsenal-showcase__hdr">
        <span className="tag-label">Visual Arsenal · Generated Systems</span>
        <h2 className="display-heading display-lg arsenal-showcase__title">
          COMMAND YOUR<br />AGENTIC ARSENAL
        </h2>
        <a href={HREF} target="_blank" rel="noopener noreferrer" className="arsenal-domain-link">
          ARSENAL.WORLD
          <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-2.5 h-2.5">
            <path d="M1 9L9 1M9 1H4M9 1v5" />
          </svg>
        </a>
      </div>

      {/* ── Editorial grid: 1 hero left + 2×2 right ── */}
      <div className="arsenal-grid">
        {cards.map((card, i) => (
          <a
            key={card.src}
            href={HREF}
            target="_blank"
            rel="noopener noreferrer"
            className={[
              "arsenal-cell",
              card.hero  ? "arsenal-cell--hero" : "",
              hov === i  ? "arsenal-cell--hov"  : "",
            ].filter(Boolean).join(" ")}
            style={{ "--ac": card.accent } as React.CSSProperties}
            onMouseEnter={() => setHov(i)}
            onMouseLeave={() => setHov(null)}
          >
            <img
              src={card.src}
              alt={card.label}
              className="arsenal-cell__img"
              loading="lazy"
              decoding="async"
              onError={() => markFailed(card.src)}
            />

            {/* Corner brackets */}
            <span className="arb arb--tl" aria-hidden />
            <span className="arb arb--tr" aria-hidden />
            <span className="arb arb--bl" aria-hidden />
            <span className="arb arb--br" aria-hidden />

            {/* Label overlay */}
            <div className="arsenal-cell__meta">
              <span className="arsenal-cell__lbl">{card.label}</span>
              <span className="arsenal-cell__sub">{card.sub}</span>
            </div>
          </a>
        ))}
      </div>

      {/* ── Footer CTA ── */}
      <div className="arsenal-showcase__foot">
        <a href={HREF} target="_blank" rel="noopener noreferrer" className="cta-btn">
          Open Arsenal.world
          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3 h-3">
            <path d="M1 6h10M6 1l5 5-5 5" />
          </svg>
        </a>
      </div>
    </section>
  );
}
