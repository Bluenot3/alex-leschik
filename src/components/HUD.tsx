const SECTION_NAMES = ["ORIGIN", "PROJECTS", "VISION", "CRAFT", "GALLERY", "CONNECT"];

interface HUDProps {
  progress: number;
  currentSection: number;
  onDotClick: (index: number) => void;
  editMode: boolean;
  onToggleEdit: () => void;
}

export default function HUD({ progress, currentSection, onDotClick, editMode, onToggleEdit }: HUDProps) {
  const pct = String(Math.round(progress * 100)).padStart(3, "0");
  const name = SECTION_NAMES[currentSection] ?? "";

  return (
    <>
      {/* Top-right HUD */}
      <div className="hud">
        <div className="text-muted-foreground">{pct}%</div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress * 100}%` }} />
        </div>
        <div className="mt-1.5 text-foreground/40" style={{ fontSize: "0.55rem" }}>{name}</div>
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

      {/* Edit mode toggle — liquid glass pill */}
      <button
        onClick={onToggleEdit}
        className="upload-panel flex items-center gap-2 cursor-pointer"
        style={{ bottom: "var(--ui-inset)" }}
      >
        <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${editMode ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />
        <span className="font-mono text-[0.55rem] tracking-widest uppercase text-muted-foreground">
          {editMode ? "Editing" : "Edit cube"}
        </span>
      </button>
    </>
  );
}
