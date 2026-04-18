import { useEffect, useRef, useState } from "react";

const VIDEOS = [
  { id: "qAh2e9zl7vs", network: "TRT World", label: "Alexander Leschik — AI Education Interview" },
  { id: "_Awtm_DPfs0", network: "TRT World", label: "ZEN AI Co. — Youth Literacy Feature" },
  { id: "Fubpt2JUcA0", network: "RT News",   label: "Alexander Leschik — AI Literacy Segment" },
  { id: "rUetXddpMLY", network: "RT News",   label: "First Youth AI Program in US History" },
];

function RetroTV({ videoId, network, label }: { videoId: string; network: string; label: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setActive(entry.isIntersecting),
      { rootMargin: "0px 0px -5% 0px", threshold: 0.25 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const src = active
    ? `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&rel=0&modestbranding=1&playsinline=1`
    : "";

  return (
    <div ref={wrapRef} className="retro-tv">
      <div className="retro-tv__cabinet">
        <div className="retro-tv__antenna retro-tv__antenna--left" />
        <div className="retro-tv__antenna retro-tv__antenna--right" />

        <div className="retro-tv__screen-bezel">
          <div className="retro-tv__screen">
            {src ? (
              <iframe
                src={src}
                title={label}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                className="retro-tv__iframe"
              />
            ) : (
              <div className="retro-tv__standby">
                <span className="retro-tv__standby-dot" />
              </div>
            )}
            <div className="retro-tv__scanlines" />
            <div className="retro-tv__screen-glare" />
          </div>
        </div>

        <div className="retro-tv__controls">
          <span className="retro-tv__network">{network}</span>
          <div className="retro-tv__knobs">
            <span className="retro-tv__knob" />
            <span className="retro-tv__knob" />
          </div>
        </div>

        <div className="retro-tv__stand" />
      </div>

      <p className="retro-tv__caption">{label}</p>
    </div>
  );
}

export default function MediaRoom() {
  return (
    <section className="media-room">
      <div className="media-room__header">
        <span className="tag-label">Press &amp; Media · As Seen On</span>
        <h2 className="display-heading display-lg">AS SEEN ON</h2>
        <p className="body-muted" style={{ maxWidth: "30rem", margin: "0.5rem auto 0" }}>
          TRT World, RT News, and international media on ZEN AI Co. and the first youth AI literacy program in US history — featuring Alexander Leschik.
        </p>
      </div>

      <div className="media-room__grid">
        {VIDEOS.map((v) => (
          <RetroTV key={v.id} videoId={v.id} network={v.network} label={v.label} />
        ))}
      </div>
    </section>
  );
}
