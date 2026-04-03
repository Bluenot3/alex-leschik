import { useEffect, useRef, useState } from "react";

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*+=<>{}[]|/\\~^`.,:;!?-_∷∵∴⊕⊗※÷≈≡∞アイウエオカキクケコ";

const COLORS = [
  "rgba(99,102,241,0.35)",   // indigo
  "rgba(168,85,247,0.3)",    // purple
  "rgba(236,72,153,0.25)",   // pink
  "rgba(34,211,238,0.3)",    // cyan
  "rgba(74,222,128,0.25)",   // green
  "rgba(251,191,36,0.25)",   // amber
  "rgba(248,113,113,0.2)",   // red
  "rgba(156,163,175,0.3)",   // gray
];

function randomGlyph() {
  return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
}

interface GlyphCell {
  char: string;
  color: string;
}

function generateLine(cols: number): GlyphCell[] {
  const arr: GlyphCell[] = [];
  for (let i = 0; i < cols; i++) {
    if (Math.random() < 0.35) {
      arr.push({ char: " ", color: "transparent" });
    } else {
      arr.push({
        char: randomGlyph(),
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      });
    }
  }
  return arr;
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
  const [textLines, setTextLines] = useState<GlyphCell[][]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

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
    const cols = Math.min(140, Math.floor((ref.current?.clientWidth || 800) / 7));
    const update = () => {
      const newLines: GlyphCell[][] = [];
      for (let i = 0; i < rows; i++) {
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
      ref={ref}
      className={`cryptic-bg ${className}`}
      style={{ opacity: visible ? 1 : 0 }}
    >
      <pre className="cryptic-bg__text" style={{ opacity }}>
        {textLines.map((line, i) => (
          <span key={i} style={{ opacity: 0.5 + Math.sin(i * 0.25) * 0.3 }}>
            {line.map((cell, j) => (
              <span key={j} style={{ color: cell.color }}>{cell.char}</span>
            ))}
            {"\n"}
          </span>
        ))}
      </pre>
    </div>
  );
}
