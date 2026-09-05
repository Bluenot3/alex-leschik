import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Plus, X } from "lucide-react";

const SECTIONS = [
  { label: "Origin",        glyph: "01" },
  { label: "Signal",        glyph: "02" },
  { label: "Constellation", glyph: "03" },
  { label: "Work",          glyph: "04" },
  { label: "Lab",           glyph: "05" },
  { label: "Contact",       glyph: "06" },
];

const SOCIALS = [
  { label: "LinkedIn",    icon: "in", href: "https://www.linkedin.com/in/alex-leschik/" },
  { label: "X / Twitter", icon: "x",  href: "https://x.com/MillennialAGI" },
  { label: "GitHub",      icon: "gh", href: "https://github.com/Bluenot3" },
  { label: "ZEN AI",      icon: "↗",  href: "https://www.zenai.world/" },
];

export default function HoloNav({ onNavigate, currentSection = 0 }: { onNavigate: (index: number) => void; currentSection?: number }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); triggerRef.current?.focus(); }
    };
    const onOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onOutside);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onOutside);
    };
  }, [open]);

  const navigate = (index: number) => {
    onNavigate(index);
    setOpen(false);
  };

  return (
    <header className="astra-nav" ref={rootRef}>
      <a href="#s0" className="astra-nav__brand" aria-label="Alex Leschik home">
        <svg viewBox="0 0 40 34" fill="none" aria-hidden="true"><path d="M2 30 15 4l13 26M8 21h15M28 4v26h10" stroke="currentColor" strokeWidth="2.5" /></svg>
        <span>Alex Leschik</span>
      </a>
      <nav className="astra-nav__chapters" aria-label="Main navigation">
        {SECTIONS.map((section, index) => (
          <button key={section.glyph} aria-current={currentSection === index ? "location" : undefined} onClick={() => navigate(index)}>{section.label}</button>
        ))}
      </nav>
      <button ref={triggerRef} className="astra-nav__trigger" aria-expanded={open} aria-controls="astra-index" onClick={() => setOpen((value) => !value)}>
        {open ? "Close" : "Index"} {open ? <X size={16} /> : <Plus size={16} />}
      </button>
      {open && <nav id="astra-index" className="astra-index" aria-label="Portfolio index">
        <div className="astra-index__title">Navigate <span><span aria-hidden="true">◈</span> 01 — 06</span></div>
        <div className="astra-index__chapters">
          {SECTIONS.map((section, index) => (
            <button key={section.glyph} onClick={() => navigate(index)}><span>{section.glyph}</span>{section.label}<ArrowUpRight size={17} /></button>
          ))}
        </div>
        <div className="astra-index__shortcuts">
          {[
            ["network", "Network"], ["media", "Media room"], ["archive", "Generative archive"],
            ["model-ledger", "Model ledger"], ["astra-signature", "Astra signature"],
          ].map(([id, label]) => <a key={id} href={`#${id}`} onClick={() => setOpen(false)}>{label}<ArrowUpRight size={14} /></a>)}
        </div>
        <div className="astra-index__title">Connect</div>
        <div className="astra-index__socials">{SOCIALS.map((social) => (
          <a key={social.label} href={social.href} target="_blank" rel="noopener noreferrer"><span>{social.icon}</span>{social.label}<ArrowUpRight size={13} /></a>
        ))}</div>
      </nav>}
    </header>
  );
}
