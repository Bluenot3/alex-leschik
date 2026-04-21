import { useRef, useEffect } from "react";

/* ── Platform icon SVGs ─────────────────────────────── */
function IconX() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="social-chip__icon">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
function IconLinkedIn() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="social-chip__icon">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}
function IconYouTube() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="social-chip__icon">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}
function IconInstagram() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="social-chip__icon">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
    </svg>
  );
}
function IconTikTok() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="social-chip__icon">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.21 8.21 0 0 0 4.8 1.54V6.78a4.85 4.85 0 0 1-1.03-.09z" />
    </svg>
  );
}
function IconDiscord() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="social-chip__icon">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}
function IconTelegram() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="social-chip__icon">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}
function IconGitHub() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="social-chip__icon">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}
function IconLink() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="social-chip__icon">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}
function IconArchive() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="social-chip__icon">
      <polyline points="21 8 21 21 3 21 3 8" />
      <rect x="1" y="3" width="22" height="5" />
      <line x1="10" y1="12" x2="14" y2="12" />
    </svg>
  );
}
function IconGlobe() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="social-chip__icon">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}
function IconScroll() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="social-chip__icon">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

/* ── Data ────────────────────────────────────────────── */
const DOSSIER = [
  { label: "ZEN AI World", sub: "zenai.world", url: "https://www.zenai.world/", badge: "CORE", icon: <IconGlobe /> },
  { label: "Legacy Dossier", sub: "zenai.world/legacydossier", url: "https://www.zenai.world/legacydossier", badge: "PROOF", icon: <IconScroll /> },
  { label: "AI Literacy Youth", sub: "zenai.world/ailiteracyyouth", url: "https://www.zenai.world/ailiteracyyouth", badge: "HISTORIC", icon: <IconGlobe /> },
  { label: "ZEN Weekly", sub: "Newsletter", url: "https://www.zenai.world/zenweekly/categories/zen-weekly", badge: "LIVE", icon: <IconLink /> },
];

const ZEN_SOCIALS = [
  { platform: "X / Twitter", handle: "@ZEN_AGI", url: "https://x.com/ZEN_AGI", icon: <IconX /> },
  { platform: "LinkedIn", handle: "z3nai", url: "https://www.linkedin.com/company/z3nai", icon: <IconLinkedIn /> },
  { platform: "YouTube", handle: "@ZENAIML", url: "https://www.youtube.com/@ZENAIML", icon: <IconYouTube /> },
  { platform: "Instagram", handle: "@0xvvs1", url: "https://www.instagram.com/0xvvs1/", icon: <IconInstagram /> },
  { platform: "TikTok", handle: "@milennialai", url: "https://www.tiktok.com/@milennialai", icon: <IconTikTok /> },
  { platform: "Discord", handle: "Community", url: "https://discord.gg/qbKgCc46Ym", icon: <IconDiscord /> },
  { platform: "Telegram", handle: "@ZENOAI", url: "https://t.me/ZENOAI", icon: <IconTelegram /> },
  { platform: "Linq", handle: "zenai", url: "https://linqapp.com/zenai?r=link", icon: <IconLink /> },
];

const ALEX_SOCIALS = [
  { platform: "LinkedIn", handle: "alex-leschik", url: "https://www.linkedin.com/in/alex-leschik/", icon: <IconLinkedIn /> },
  { platform: "GitHub", handle: "Bluenot3", url: "https://github.com/Bluenot3", icon: <IconGitHub /> },
  { platform: "X / Twitter", handle: "@MillennialAGI", url: "https://x.com/MillennialAGI", icon: <IconX /> },
  { platform: "Instagram", handle: "@0xvvs1", url: "https://www.instagram.com/0xvvs1/", icon: <IconInstagram /> },
];

/* ── Component ───────────────────────────────────────── */
export default function SocialLinks() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const els = ref.current?.querySelectorAll("[data-reveal]");
    if (!els) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            (e.target as HTMLElement).style.opacity = "1";
            (e.target as HTMLElement).style.transform = "translateY(0) scale(1)";
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.08 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const ease = "cubic-bezier(0.22, 1, 0.36, 1)";

  return (
    <section ref={ref} className="social-links-section" id="network">
      <div className="social-links-header">
        <span className="tag-label" data-reveal style={{ opacity: 0, transform: "translateY(10px)", transition: `opacity 0.6s ${ease}, transform 0.6s ${ease}` }}>Network</span>
        <h2 className="display-heading display-lg social-links-title" data-reveal style={{ opacity: 0, transform: "translateY(14px)", transition: `opacity 0.7s ${ease} 0.06s, transform 0.7s ${ease} 0.06s` }}>
          FIND<br />THE<br />SIGNAL
        </h2>
        <p className="body-muted social-links-desc" data-reveal style={{ opacity: 0, transform: "translateY(10px)", transition: `opacity 0.6s ${ease} 0.14s, transform 0.6s ${ease} 0.14s` }}>
          ZEN AI is building in public — live on every channel, verified in the archive, and open to collaboration.
          Find the work, trace the history, start the conversation.
        </p>
      </div>

      <div className="social-dossier-grid">
        {DOSSIER.map((item, i) => (
          <a
            key={item.url}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="dossier-card"
            data-reveal
            style={{ opacity: 0, transform: "translateY(14px)", transition: `opacity 0.65s ${ease} ${0.22 + i * 0.07}s, transform 0.65s ${ease} ${0.22 + i * 0.07}s` }}
          >
            <div className="dossier-card__top">
              <span className="dossier-card__icon">{item.icon}</span>
              <span className={`dossier-card__badge dossier-card__badge--${item.badge.toLowerCase()}`}>{item.badge}</span>
            </div>
            <div className="dossier-card__label">{item.label}</div>
            <div className="dossier-card__sub">{item.sub}</div>
            <div className="dossier-card__arrow">
              <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M1 6h10M6 1l5 5-5 5" />
              </svg>
            </div>
          </a>
        ))}
      </div>

      <div className="social-columns">
        <div className="social-column">
          <div className="social-column__label" data-reveal style={{ opacity: 0, transform: "translateY(8px)", transition: `opacity 0.5s ${ease} 0.5s, transform 0.5s ${ease} 0.5s` }}>
            <span className="social-column__dot" />
            ZEN AI — Channels
          </div>
          <div className="social-chip-grid">
            {ZEN_SOCIALS.map((s, i) => (
              <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer" className="social-chip"
                data-reveal style={{ opacity: 0, transform: "translateY(10px)", transition: `opacity 0.55s ${ease} ${0.55 + i * 0.055}s, transform 0.55s ${ease} ${0.55 + i * 0.055}s` }}>
                <span className="social-chip__icon-wrap">{s.icon}</span>
                <span className="social-chip__body">
                  <span className="social-chip__platform">{s.platform}</span>
                  <span className="social-chip__handle">{s.handle}</span>
                </span>
                <svg className="social-chip__ext" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.4">
                  <path d="M1 9L9 1M9 1H4M9 1v5" />
                </svg>
              </a>
            ))}
          </div>
        </div>

        <div className="social-column">
          <div className="social-column__label" data-reveal style={{ opacity: 0, transform: "translateY(8px)", transition: `opacity 0.5s ${ease} 0.5s, transform 0.5s ${ease} 0.5s` }}>
            <span className="social-column__dot social-column__dot--violet" />
            Alex Leschik — Personal
          </div>
          <div className="social-chip-grid">
            {ALEX_SOCIALS.map((s, i) => (
              <a key={s.url + s.handle} href={s.url} target="_blank" rel="noopener noreferrer" className="social-chip social-chip--violet"
                data-reveal style={{ opacity: 0, transform: "translateY(10px)", transition: `opacity 0.55s ${ease} ${0.55 + i * 0.07}s, transform 0.55s ${ease} ${0.55 + i * 0.07}s` }}>
                <span className="social-chip__icon-wrap">{s.icon}</span>
                <span className="social-chip__body">
                  <span className="social-chip__platform">{s.platform}</span>
                  <span className="social-chip__handle">{s.handle}</span>
                </span>
                <svg className="social-chip__ext" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.4">
                  <path d="M1 9L9 1M9 1H4M9 1v5" />
                </svg>
              </a>
            ))}
          </div>

          <div className="archive-strip" data-reveal style={{ opacity: 0, transform: "translateY(8px)", transition: `opacity 0.6s ${ease} 0.8s, transform 0.6s ${ease} 0.8s` }}>
            <div className="archive-strip__label">
              <IconArchive />
              Historical Proof — Wayback Machine
            </div>
            <div className="archive-strip__links">
              <a href="https://archive.org/" target="_blank" rel="noopener noreferrer" className="archive-strip__link">
                archive.org
                <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-2.5 h-2.5">
                  <path d="M1 9L9 1M9 1H4M9 1v5" />
                </svg>
              </a>
              <a href="https://web.archive.org/" target="_blank" rel="noopener noreferrer" className="archive-strip__link">
                web.archive.org
                <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-2.5 h-2.5">
                  <path d="M1 9L9 1M9 1H4M9 1v5" />
                </svg>
              </a>
            </div>
            <p className="archive-strip__note">
              Search: <code>zenai.world ai pioneer program</code> · <code>youth ai literacy zen</code>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
