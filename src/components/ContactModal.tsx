import { useEffect, useState } from "react";
import CrypticBackground from "@/components/CrypticBackground";
import ContactForm from "@/components/ContactForm";

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

        {/* Intake — Notion form (primary) */}
        <div className="contact-modal__frame contact-modal__frame--form">
          {mode === "notion" ? (
            <iframe
              src={NOTION_LEAD_FORM_URL}
              title="Contact Alexander Leschik"
              className="contact-modal__notion"
              loading="lazy"
            />
          ) : (
            <ContactForm onSuccess={() => setTimeout(onClose, 2500)} />
          )}
        </div>

        {/* Intake footer */}
        <div className="contact-modal__foot">
          <a
            href={NOTION_LEAD_FORM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="contact-modal__foot-link"
          >
            <ExternalLink className="w-3 h-3" />
            Open form in a new tab
          </a>
          <button
            type="button"
            className="contact-modal__foot-btn"
            onClick={() => setMode(mode === "notion" ? "native" : "notion")}
          >
            {mode === "notion" ? "Form not loading? Use direct intake" : "Back to standard form"}
          </button>
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
