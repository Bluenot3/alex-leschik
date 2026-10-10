import { useState } from "react";

const VIDEOS = [
  { id: "qAh2e9zl7vs", network: "TRT World",   label: "Alexander Leschik — AI Education Interview",  type: "interview" },
  { id: "_Awtm_DPfs0", network: "TRT World",   label: "ZEN AI Co. — Youth Literacy Feature",          type: "interview" },
  { id: "Fubpt2JUcA0", network: "RT News",     label: "AI Literacy Segment",                          type: "interview" },
  { id: "rUetXddpMLY", network: "RT News",     label: "First Youth AI Program in US History",         type: "interview" },
  { id: "ZqGZHs5QLeM", network: "Press",       label: "Media Appearance — Alexander Leschik",         type: "interview" },
  { id: "akTTOpyxdSs", network: "Media",       label: "ZEN AI Co. Feature",                           type: "interview" },
  { id: "FbxRjX0qOh0", network: "Press",       label: "International Coverage",                       type: "interview" },
  { id: "02Ol3p5sdic", network: "Client Work", label: "Generative Video — Client Production",         type: "work" },
];

/**
 * One broadcast screen. It shows the video's poster frame and loads the
 * YouTube player only when the visitor presses play: eight live players
 * would stream and decode eight videos at once (and stall a phone).
 */
function HoloPanel({
  videoId, network, label, type, index,
}: {
  videoId: string; network: string; label: string; type: string; index: number;
}) {
  const [playing, setPlaying] = useState(false);

  return (
    <div
      className="holo-panel-wrap"
      style={{ animationDelay: `${(index % 4) * 0.1}s` }}
    >
      <div className="holo-border-ring" />

      <div className="holo-panel">
        <span className="holo-corner holo-corner--tl" />
        <span className="holo-corner holo-corner--tr" />
        <span className="holo-corner holo-corner--bl" />
        <span className="holo-corner holo-corner--br" />

        <div className="holo-panel__hud">
          <span className="holo-panel__network">{network}</span>
          <span className="holo-panel__type">{type === "interview" ? "◈ LIVE BROADCAST" : "◈ PRODUCTION"}</span>
          <span className={`holo-panel__dot ${playing ? "holo-panel__dot--live" : ""}`} />
        </div>

        <div className="holo-panel__screen-wrap">
          <div className="holo-panel__screen">
            {playing ? (
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
                title={label}
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                className="holo-panel__iframe"
              />
            ) : (
              <button
                type="button"
                className="holo-panel__poster"
                onClick={() => setPlaying(true)}
                aria-label={`Play: ${label} (${network})`}
              >
                <img
                  src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
                  alt=""
                  width={480}
                  height={360}
                  loading="lazy"
                  decoding="async"
                  className="holo-panel__thumb"
                  // An unreachable thumbnail leaves the dark screen, not a broken icon.
                  onError={(e) => {
                    e.currentTarget.style.visibility = "hidden";
                  }}
                />
                <span className="holo-panel__play" aria-hidden />
              </button>
            )}
            <div className="holo-panel__scanlines" />
            <div className="holo-panel__shimmer" />
            <div className="holo-panel__vignette" />
          </div>
        </div>

        <div className="holo-panel__footer">
          <span className="holo-panel__label">{label}</span>
        </div>
      </div>
    </div>
  );
}

export default function MediaRoom() {
  return (
    <section className="media-room">
      <div className="media-room__header">
        <span className="tag-label">Press &amp; Media · International Coverage</span>
        <h2 className="display-heading display-lg">AS SEEN ON</h2>
        <p className="body-muted" style={{ maxWidth: "32rem", margin: "0.5rem auto 0" }}>
          TRT World, RT News, and international media on ZEN AI Co. and the first youth AI literacy program in US history — featuring Alexander Leschik.
        </p>
      </div>

      <div className="media-room__grid">
        {VIDEOS.map((v, i) => (
          <HoloPanel
            key={v.id}
            videoId={v.id}
            network={v.network}
            label={v.label}
            type={v.type}
            index={i}
          />
        ))}
      </div>
    </section>
  );
}
