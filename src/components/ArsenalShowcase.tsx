import { useState, useRef, useEffect, useCallback } from "react";

const HREF = "https://arsenal.world";

interface CardDef {
  src: string;
  label: string;
  sub: string;
  top: number;   /* % within stage */
  left: number;
  size: number;  /* width % */
  depth: number; /* parallax depth 0–1; 1 = moves most with cursor */
  rz: number;    /* resting rotateZ deg */
  tz: number;    /* resting translateZ px */
  accent: string;
}

const CARDS: CardDef[] = [
  /* ARSENAL — centre, dominant, closest */
  {
    src: "/gallery/arsenal.jpg",
    label: "ARSENAL", sub: "COMMAND CENTER",
    top: 11, left: 26, size: 47,
    depth: 0.88, rz: 0,   tz: 60,
    accent: "206 92% 60%",
  },
  /* ZEN WEEKLY — four corners, further back */
  {
    src: "/gallery/zen-weekly-fresco.jpg",
    label: "ZEN WEEKLY", sub: "CITY NETWORKS",
    top: 1, left: 0, size: 28,
    depth: 0.28, rz: -5,  tz: -60,
    accent: "128 80% 56%",
  },
  {
    src: "/gallery/zen-weekly-city.jpg",
    label: "ZEN WEEKLY", sub: "DIGITAL FRONTIER",
    top: 0, left: 70, size: 27,
    depth: 0.38, rz:  4,  tz: -40,
    accent: "128 80% 56%",
  },
  {
    src: "/gallery/zen-weekly-mosaic.jpg",
    label: "ZEN WEEKLY", sub: "MOSAIC ARCHIVE",
    top: 57, left: 0, size: 27,
    depth: 0.30, rz:  2,  tz: -55,
    accent: "281 82% 68%",
  },
  {
    src: "/gallery/zen-weekly-world.jpg",
    label: "ZEN WEEKLY", sub: "WORLD SYSTEM",
    top: 59, left: 71, size: 26,
    depth: 0.22, rz: -3,  tz: -68,
    accent: "352 88% 64%",
  },
];

export default function ArsenalShowcase() {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [failed,     setFailed]     = useState<Set<string>>(() => new Set());

  /* ── Parallax: direct DOM writes via RAF (no React re-renders) ── */
  const mouseRef   = useRef({ x: 0.5, y: 0.5 });
  const hovRef     = useRef<number | null>(null);
  const cardRefs   = useRef<(HTMLAnchorElement | null)[]>([]);
  const rafRef     = useRef<number>(0);
  const animActive = useRef(false);

  /* Keep hovRef in sync */
  useEffect(() => { hovRef.current = hoveredIdx; }, [hoveredIdx]);

  /* Update a single card's transform */
  const applyTransform = useCallback((i: number, noTransition = false) => {
    const el = cardRefs.current[i];
    const card = CARDS[i];
    if (!el || !card) return;
    const nx = mouseRef.current.x - 0.5;
    const ny = mouseRef.current.y - 0.5;
    const px = nx * 72 * card.depth;
    const py = ny * 52 * card.depth;
    const isHov = hovRef.current === i;
    const tx = isHov ? 130 : card.tz;
    const rz = isHov ?   0 : card.rz;
    el.style.transition = noTransition
      ? "none"
      : isHov
        ? "transform 0.5s cubic-bezier(0.22,1,0.36,1), box-shadow 0.4s ease, filter 0.35s ease"
        : "box-shadow 0.4s ease, filter 0.35s ease";
    el.style.transform = `translate(${px.toFixed(2)}px, ${py.toFixed(2)}px) translateZ(${tx}px) rotateZ(${rz}deg)`;
  }, []);

  /* RAF loop: updates parallax on every frame */
  useEffect(() => {
    animActive.current = true;
    const loop = () => {
      if (!animActive.current) return;
      CARDS.forEach((_, i) => {
        if (hovRef.current !== i) applyTransform(i, true);
      });
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      animActive.current = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [applyTransform]);

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    mouseRef.current = {
      x: (e.clientX - r.left) / r.width,
      y: (e.clientY - r.top)  / r.height,
    };
  }, []);

  const onMouseLeave = useCallback(() => {
    mouseRef.current = { x: 0.5, y: 0.5 };
  }, []);

  const onCardEnter = useCallback((i: number) => {
    setHoveredIdx(i);
    hovRef.current = i;
    applyTransform(i);
  }, [applyTransform]);

  const onCardLeave = useCallback((i: number) => {
    setHoveredIdx(null);
    hovRef.current = null;
    applyTransform(i);
  }, [applyTransform]);

  const markFailed = useCallback((src: string) => {
    setFailed(prev => { const s = new Set(prev); s.add(src); return s; });
  }, []);

  const visibleCards = CARDS.filter(c => !failed.has(c.src));

  return (
    <section className="arsenal-showcase" id="arsenal">

      {/* ── Header ── */}
      <div className="arsenal-showcase__hdr">
        <span className="tag-label">Visual Arsenal · Generated Systems</span>
        <h2 className="display-heading display-lg arsenal-showcase__title">
          COMMAND YOUR<br />AGENTIC ARSENAL
        </h2>
        <a
          href={HREF}
          target="_blank"
          rel="noopener noreferrer"
          className="arsenal-domain-link"
        >
          ARSENAL.WORLD
          <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-2.5 h-2.5">
            <path d="M1 9L9 1M9 1H4M9 1v5" />
          </svg>
        </a>
      </div>

      {/* ── 3D Parallax Stage ── */}
      <div
        className="arsenal-stage"
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        style={{ perspective: "1500px" }}
      >
        {/* Subtle scanline overlay */}
        <div className="arsenal-scanlines" aria-hidden />

        {visibleCards.map((card, i) => {
          const realIdx = CARDS.indexOf(card);
          const isHov = hoveredIdx === realIdx;

          return (
            <a
              key={card.src}
              href={HREF}
              target="_blank"
              rel="noopener noreferrer"
              ref={el => { cardRefs.current[realIdx] = el; }}
              className={`arsenal-card${isHov ? " arsenal-card--active" : ""}`}
              style={{
                position: "absolute",
                top:   `${card.top}%`,
                left:  `${card.left}%`,
                width: `${card.size}%`,
                zIndex: isHov ? 20 : realIdx === 0 ? 5 : 1,
                "--ac": card.accent,
              } as React.CSSProperties}
              onMouseEnter={() => onCardEnter(realIdx)}
              onMouseLeave={() => onCardLeave(realIdx)}
            >
              <img
                src={card.src}
                alt={card.label}
                className="arsenal-card__img"
                loading="lazy"
                decoding="async"
                onError={() => markFailed(card.src)}
              />

              {/* Corner brackets */}
              <span className="arb arb--tl" aria-hidden />
              <span className="arb arb--tr" aria-hidden />
              <span className="arb arb--bl" aria-hidden />
              <span className="arb arb--br" aria-hidden />

              {/* Label strip */}
              <div className="arsenal-card__meta">
                <span className="arsenal-card__lbl">{card.label}</span>
                <span className="arsenal-card__sub">{card.sub}</span>
              </div>

              {/* Top-edge pulse line */}
              {isHov && <div className="arsenal-card__pulse" aria-hidden />}
            </a>
          );
        })}

        {/* Floating ARSENAL.WORLD watermark on stage */}
        <div className="arsenal-stage__watermark" aria-hidden>
          ARSENAL.WORLD
        </div>
      </div>

      {/* ── Footer CTA ── */}
      <div className="arsenal-showcase__foot">
        <a
          href={HREF}
          target="_blank"
          rel="noopener noreferrer"
          className="cta-btn"
        >
          Open Arsenal.world
          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3 h-3">
            <path d="M1 6h10M6 1l5 5-5 5" />
          </svg>
        </a>
      </div>
    </section>
  );
}
