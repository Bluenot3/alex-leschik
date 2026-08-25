import { useRef, useEffect, type ReactNode } from "react";

interface ScrollSectionProps {
  children: ReactNode;
  index: number;
  align?: "left" | "right" | "center";
  ghost?: string;
}

export default function ScrollSection({ children, index, align = "left", ghost }: ScrollSectionProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const els = ref.current?.querySelectorAll("[data-reveal]");
    if (!els) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-revealed");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0, rootMargin: "0px 0px 140px 0px" }
    );

    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const ghostLabel = ghost ?? String(index).padStart(2, "0");

  return (
    <section
      ref={ref}
      data-scroll-section
      id={`s${index}`}
      className={`scroll-section ${index === 0 ? "!min-h-screen items-center" : ""}`}
    >
      {/* Large translucent background word fills the opposite side */}
      <span
        aria-hidden="true"
        className={`scroll-section__ghost ${align === "right" ? "" : "scroll-section__ghost--right"}`}
      >
        {ghostLabel}
      </span>

      <div
        className={`glass-card ${align === "right" ? "glass-card-right" : ""} ${align === "center" ? "mx-auto text-center border-l-0 border-t border-t-[var(--card-border-accent)]" : ""}`}
      >
        {children}
      </div>
    </section>
  );
}

/* ── Reveal helpers ──
   All reveals share one easing curve and one stagger scale (`--reveal-step`),
   declared in CSS so the compositor — not React — animates them. */

export function RevealTag({ children }: { children: ReactNode }) {
  return (
    <div data-reveal className="tag-label reveal reveal--step-0">
      {children}
    </div>
  );
}

export function RevealHeading({ children, size = "lg" }: { children: ReactNode; size?: "xl" | "lg" | "hero" }) {
  const cls = size === "xl" ? "display-xl" : size === "hero" ? "display-hero" : "display-lg";
  return (
    <h2 data-reveal className={`display-heading ${cls} reveal reveal--blur reveal--step-1`}>
      {children}
    </h2>
  );
}

export function RevealBody({ children }: { children: ReactNode }) {
  return (
    <p data-reveal className="body-muted reveal reveal--step-2">
      {children}
    </p>
  );
}

export function RevealLine() {
  return <div data-reveal className="accent-line reveal reveal--line" />;
}

export function RevealStats({ stats }: { stats: { num: string; label: string }[] }) {
  return (
    <div data-reveal className="flex gap-10 mt-8 flex-wrap reveal reveal--step-3">
      {stats.map((s) => (
        <div key={s.label} className="flex flex-col gap-0.5">
          <span className="stat-number">{s.num}</span>
          <span className="stat-label">{s.label}</span>
        </div>
      ))}
    </div>
  );
}

export function RevealCTA({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <div data-reveal className="mt-7 flex items-center gap-3 reveal reveal--step-4">
      <button onClick={onClick} className="cta-btn">
        {children}
        <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3 h-3">
          <path d="M1 6h10M6 1l5 5-5 5" />
        </svg>
      </button>
    </div>
  );
}
