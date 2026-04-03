import { useEffect, useRef, useState } from "react";

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*+=<>{}[]|/\\~^`.,:;!?-_∷∵∴⊕⊗※÷≈≡∞アイウエオカキクケコ";
const TONES = ["--cryptic-ink", "--cryptic-cool", "--cryptic-warm", "--cryptic-violet"] as const;

function randomGlyph() {
  return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
}

interface GlyphSegment {
  gap: string;
  opacity: number;
  text: string;
  tone: (typeof TONES)[number];
}

interface DrizzleLine {
  opacity: number;
  segments: GlyphSegment[];
}

function randomSequence(length: number) {
  let value = "";
  for (let i = 0; i < length; i++) {
    value += randomGlyph();
  }
  return value;
}

function generateLine(cols: number): DrizzleLine {
  const density = Math.random();
  const segmentCount = density < 0.16 ? 0 : density < 0.46 ? 1 : density < 0.8 ? 2 : density < 0.94 ? 3 : 4;
  const segments: GlyphSegment[] = [];
  let remaining = cols;
  let gap = Math.floor(Math.random() * Math.max(8, cols * 0.28));

  for (let i = 0; i < segmentCount && remaining > 4; i++) {
    remaining -= gap;
    if (remaining <= 4) break;

    const length = Math.min(
      remaining,
      Math.floor(4 + Math.random() * Math.min(20, Math.max(5, remaining - 2)))
    );

    segments.push({
      gap: " ".repeat(Math.max(0, gap)),
      opacity: 0.34 + Math.random() * 0.48,
      text: randomSequence(length),
      tone: TONES[Math.floor(Math.random() * TONES.length)],
    });

    remaining -= length;
    gap = Math.floor(Math.random() * Math.max(4, Math.min(remaining, cols * 0.2)));
  }

  return {
    opacity: 0.48 + Math.random() * 0.36,
    segments,
  };
}

interface Props {
  rows?: number;
  speed?: number;
  opacity?: number;
  className?: string;
}

export default function CrypticBackground({
  rows = 20,
  speed = 100,
  opacity = 0.08,
  className = "",
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [textLines, setTextLines] = useState<DrizzleLine[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const enhancedOpacity = Math.min(0.28, opacity * 2.35);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => setVisible(e.isIntersecting),
      { threshold: 0.01, rootMargin: "100px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    const update = () => {
      const width = ref.current?.clientWidth || 800;
      const height = ref.current?.clientHeight || rows * 28;
      const cols = Math.min(160, Math.floor(width / 9));
      const lineCount = Math.max(rows, Math.ceil(height / 18));
      const newLines: DrizzleLine[] = [];

      for (let i = 0; i < lineCount; i++) {
        newLines.push(generateLine(cols));
      }

      setTextLines(newLines);
    };

    update();
    intervalRef.current = setInterval(update, speed);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [visible, rows, speed]);

  return (
    <div
      aria-hidden="true"
      ref={ref}
      className={`cryptic-bg ${className}`}
      style={{ opacity: visible ? 1 : 0 }}
    >
      <pre className="cryptic-bg__text" style={{ opacity: enhancedOpacity }}>
        {textLines.map((line, i) => !line ? null : (
          <span
            key={i}
            className="cryptic-bg__line"
            style={{ opacity: Math.max(0.12, (line.opacity ?? 0.5) + Math.sin(i * 0.45) * 0.12) }}
          >
            {!line.segments || line.segments.length === 0 ? " " : line.segments.map((segment, j) => (
              <span
                key={j}
                className="cryptic-bg__segment"
                style={{
                  color: `hsl(var(${segment.tone}) / ${segment.opacity})`,
                  textShadow: `0 0 10px hsl(var(${segment.tone}) / 0.18)`,
                }}
              >
                {segment.gap}
                {segment.text}
              </span>
            ))}
            {"\n"}
          </span>
        ))}
      </pre>
    </div>
  );
}
