import { useEffect, useState } from "react";

const SECTIONS = [
  { label: "Origin",        glyph: "01" },
  { label: "Signal",        glyph: "02" },
  { label: "Constellation", glyph: "03" },
  { label: "Work",          glyph: "04" },
  { label: "Lab",           glyph: "05" },
  { label: "Contact",       glyph: "06" },
];

// Update these hrefs with your actual social URLs
const SOCIALS = [
  { label: "LinkedIn",    icon: "in", href: "https://linkedin.com/in/alexanderleschik" },
  { label: "X / Twitter", icon: "x",  href: "https://x.com/zenai_co" },
  { label: "Instagram",   icon: "ig", href: "https://instagram.com/zenai.co" },
  { label: "ZEN AI",      icon: "↗",  href: "https://zenai.world" },
];

export default function HoloNav({ onNavigate }: { onNavigate: (index: number) => void }) {
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`holo-nav ${visible ? "holo-nav--visible" : ""} ${open ? "holo-nav--open" : ""}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {/* Panel (slides in from right) */}
      <div className="holo-nav__panel">
        <div className="holo-nav__section-label">Navigate</div>

        {SECTIONS.map((s, i) => (
          <button
            key={s.glyph}
            className="holo-nav__link"
            onClick={() => { onNavigate(i); setOpen(false); }}
          >
            <span className="holo-nav__link-glyph">{s.glyph}</span>
            <span className="holo-nav__link-label">{s.label}</span>
          </button>
        ))}

        <div className="holo-nav__divider" />

        <div className="holo-nav__section-label">Connect</div>

        {SOCIALS.map((s) => (
          <a
            key={s.label}
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            className="holo-nav__link"
          >
            <span className="holo-nav__link-icon">{s.icon}</span>
            <span className="holo-nav__link-label">{s.label}</span>
          </a>
        ))}
      </div>

      {/* Trigger tab */}
      <div className="holo-nav__trigger" aria-label="Navigation">
        <span className="holo-nav__trigger-glyph">◈</span>
      </div>
    </div>
  );
}
