import { useEffect } from "react";
import CrypticBackground from "@/components/CrypticBackground";

interface ContactModalProps {
  onClose: () => void;
}

export default function ContactModal({ onClose }: ContactModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      className="contact-modal"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Contact form"
    >
      <div className="contact-modal__panel" onClick={(e) => e.stopPropagation()}>

        {/* Ambient cryptic background */}
        <CrypticBackground rows={6} speed={80} opacity={0.04} />

        {/* Corner brackets */}
        <span className="tc-br tc-br--tl contact-modal__br" />
        <span className="tc-br tc-br--tr contact-modal__br" />
        <span className="tc-br tc-br--bl contact-modal__br" />
        <span className="tc-br tc-br--br contact-modal__br" />

        {/* Header */}
        <div className="contact-modal__hdr">
          <span className="tag-label">05 — Contact · Alexander Leschik</span>
          <p className="contact-modal__sub">
            If the problem matters, the interface matters.
          </p>
        </div>

        {/* Notion embed */}
        <div className="contact-modal__frame">
          <iframe
            src="https://daily-clownfish-446.notion.site/ebd//b4cd5826803a4806811f9f2abbf05783"
            title="Contact Alexander Leschik"
            allowFullScreen
          />
        </div>

        {/* Close */}
        <button
          className="contact-modal__close"
          onClick={onClose}
          aria-label="Close contact form"
        >
          <svg
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          >
            <path d="M1 1l10 10M11 1L1 11" />
          </svg>
        </button>
      </div>
    </div>
  );
}
