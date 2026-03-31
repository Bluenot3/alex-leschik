const SECTION_NAMES = ["ORIGIN", "PROJECTS", "VISION", "CRAFT", "GALLERY", "CONNECT"];

interface HUDProps {
  progress: number;
  currentSection: number;
  onDotClick: (index: number) => void;
}

export default function HUD({ progress, currentSection, onDotClick }: HUDProps) {
  const pct = String(Math.round(progress * 100)).padStart(3, "0");
  const name = SECTION_NAMES[currentSection] ?? "";

  return (
    <>
      {/* Top-right HUD */}
      <div className="hud">
        <div>{pct}%</div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress * 100}%` }} />
        </div>
        <div className="mt-1.5 text-primary" style={{ fontSize: "0.6rem" }}>{name}</div>
      </div>

      {/* Left nav dots */}
      <div className="fixed left-8 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-3 max-md:hidden">
        {SECTION_NAMES.map((_, i) => (
          <button
            key={i}
            onClick={() => onDotClick(i)}
            className={`scene-dot ${currentSection === i ? "scene-dot-active" : ""}`}
            aria-label={`Go to ${SECTION_NAMES[i]}`}
          />
        ))}
      </div>

      {/* Bottom caption */}
      <div className="face-caption">
        <div className="face-caption-num">
          {String(currentSection + 1).padStart(2, "0")}
        </div>
        <div className="face-caption-name">{name}</div>
      </div>
    </>
  );
}
