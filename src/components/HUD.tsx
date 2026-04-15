import { useState, useRef, useCallback } from "react";
import { Terminal, Lock } from "lucide-react";

const SECTION_NAMES = ["ORIGIN", "SIGNAL", "CONSTELLATION", "WORK", "LAB", "CONTACT"];
const PIN_HASH = "31759";

interface HUDProps {
  progress: number;
  currentSection: number;
  onDotClick: (index: number) => void;
  editMode: boolean;
  onToggleEdit: () => void;
  onOpenCmd?: () => void;
}

function PinOverlay({
  onSuccess,
  onClose,
}: {
  onSuccess: () => void;
  onClose: () => void;
}) {
  const [digits, setDigits] = useState<string[]>(["", "", "", "", ""]);
  const [error, setError] = useState(false);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = useCallback(
    (index: number, value: string) => {
      if (!/^\d?$/.test(value)) return;
      const next = [...digits];
      next[index] = value;
      setDigits(next);
      setError(false);

      if (value && index < 4) {
        refs.current[index + 1]?.focus();
      }

      // Check if complete
      if (value && index === 4) {
        const pin = next.join("");
        if (pin === PIN_HASH) {
          onSuccess();
        } else {
          setError(true);
          setTimeout(() => {
            setDigits(["", "", "", "", ""]);
            refs.current[0]?.focus();
          }, 600);
        }
      }
    },
    [digits, onSuccess]
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent) => {
      if (e.key === "Backspace" && !digits[index] && index > 0) {
        refs.current[index - 1]?.focus();
      }
      if (e.key === "Escape") onClose();
    },
    [digits, onClose]
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/40 backdrop-blur-sm" />

      {/* Pin card */}
      <div
        className="pin-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pin-card__icon">
          <Lock className="w-4 h-4" />
        </div>
        <p className="pin-card__label">Enter access PIN</p>

        <div className="pin-card__digits">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => { refs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className={`pin-card__input ${error ? "pin-card__input--error" : ""}`}
              autoFocus={i === 0}
            />
          ))}
        </div>

        {error && (
          <p className="pin-card__error">Incorrect PIN</p>
        )}

        <button onClick={onClose} className="pin-card__cancel">
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function HUD({
  progress,
  currentSection,
  onDotClick,
  editMode,
  onToggleEdit,
  onOpenCmd,
}: HUDProps) {
  const pct = String(Math.round(progress * 100)).padStart(3, "0");
  const name = SECTION_NAMES[currentSection] ?? "";
  const [showPin, setShowPin] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  const handleEditClick = useCallback(() => {
    if (editMode) {
      // Already editing — toggle off, no pin needed
      onToggleEdit();
      return;
    }
    if (unlocked) {
      onToggleEdit();
      return;
    }
    setShowPin(true);
  }, [editMode, unlocked, onToggleEdit]);

  const handlePinSuccess = useCallback(() => {
    setUnlocked(true);
    setShowPin(false);
    onToggleEdit();
  }, [onToggleEdit]);

  return (
    <>
      {/* Top-right HUD */}
      <div className="hud">
        <div className="text-muted-foreground">{pct}%</div>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <div
          className="mt-1.5 text-foreground/40"
          style={{ fontSize: "0.55rem" }}
        >
          {name}
        </div>
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

      {/* Bottom-right controls */}
      <div className="fixed bottom-[var(--ui-inset)] right-[var(--ui-inset)] z-20 flex items-center gap-2">
        <button
          onClick={onOpenCmd}
          className="upload-panel flex items-center gap-2 cursor-pointer"
          style={{ position: "relative", bottom: "auto", right: "auto" }}
        >
          <Terminal className="w-3 h-3 text-muted-foreground/60" />
          <span className="font-mono text-[0.55rem] tracking-widest uppercase text-muted-foreground">
            Command
          </span>
        </button>
        <button
          onClick={handleEditClick}
          className="upload-panel flex items-center gap-2 cursor-pointer"
          style={{ position: "relative", bottom: "auto", right: "auto" }}
        >
          <div
            className={`w-2 h-2 rounded-full transition-colors duration-300 ${
              editMode ? "bg-emerald-500" : "bg-muted-foreground/30"
            }`}
          />
          <span className="font-mono text-[0.55rem] tracking-widest uppercase text-muted-foreground">
            {editMode ? "Editing" : "Edit cube"}
          </span>
        </button>
      </div>

      {/* PIN overlay */}
      {showPin && (
        <PinOverlay
          onSuccess={handlePinSuccess}
          onClose={() => setShowPin(false)}
        />
      )}
    </>
  );
}
