import { useEffect, useRef, useState } from "react";

interface CardProps {
  videoId: string;
  channel: string;
  outlet: string;
  title: string;
}

function BroadcastCard({ videoId, channel, outlet, title }: CardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSrc(`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&rel=0&modestbranding=1`);
          io.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [videoId]);

  return (
    <div ref={ref} className="broadcast-card">
      {/* Header band */}
      <div className="broadcast-card__header">
        <div className="broadcast-card__outlet">
          <span className="broadcast-card__live-dot" />
          <span className="broadcast-card__outlet-name">{outlet}</span>
        </div>
        <span className="broadcast-card__channel">{channel}</span>
      </div>

      {/* Video area */}
      <div className="broadcast-card__screen">
        {/* Placeholder shown until iframe loads */}
        <div className={`broadcast-card__placeholder ${loaded ? "broadcast-card__placeholder--hidden" : ""}`}>
          <div className="broadcast-card__placeholder-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </div>
        </div>

        {src && (
          <iframe
            src={src}
            title={title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            className={`broadcast-card__iframe ${loaded ? "broadcast-card__iframe--visible" : ""}`}
            onLoad={() => setLoaded(true)}
          />
        )}
      </div>

      {/* Footer */}
      <div className="broadcast-card__footer">
        <p className="broadcast-card__title">{title}</p>
        <a
          href={`https://www.youtube.com/watch?v=${videoId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="broadcast-card__link"
        >
          Watch full
          <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-2.5 h-2.5">
            <path d="M1 5h8M5 1l4 4-4 4" />
          </svg>
        </a>
      </div>
    </div>
  );
}

const APPEARANCES: CardProps[] = [
  {
    videoId: "qAh2e9zl7vs",
    outlet: "TRT World",
    channel: "International News",
    title: "AI Literacy — Youth Education Segment",
  },
  {
    videoId: "_Awtm_DPfs0",
    outlet: "RT",
    channel: "Global Broadcast",
    title: "ZEN AI Co. — National Coverage",
  },
  {
    videoId: "Fubpt2JUcA0",
    outlet: "News Segment",
    channel: "Feature Report",
    title: "First Youth AI Program in US History",
  },
  {
    videoId: "rUetXddpMLY",
    outlet: "Media Appearance",
    channel: "Profile",
    title: "Alexander Leschik — AI Pioneer",
  },
];

export default function PressTV() {
  return (
    <section className="press-section">
      <div className="press-section__header">
        <span className="tag-label">Press &amp; Media · TRT World · RT · International Coverage</span>
        <h2 className="press-section__title">COVERED</h2>
        <p className="press-section__body">
          International broadcast appearances, news segments, and press coverage on the work.
        </p>
      </div>
      <div className="broadcast-grid">
        {APPEARANCES.map((card) => (
          <BroadcastCard key={card.videoId} {...card} />
        ))}
      </div>
    </section>
  );
}
