import { useEffect, useRef, useState } from "react";

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*+=<>{}[]|/\\~^`.,:;!?-_∷∵∴⊕⊗※÷≈≡∞アイウエオカキクケコ";

function randomGlyph() {
  return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
}

function generateLine(cols: number): string {
  const arr: string[] = [];
  for (let i = 0; i < cols; i++) {
    arr.push(Math.random() < 0.4 ? " " : randomGlyph());
  }
  return arr.join("");
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
  opacity = 0.06,
  className = "",
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [textLines, setTextLines] = useState<string[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => setVisible(e.isIntersecting),
      { threshold: 0.05 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    const cols = Math.min(120, Math.floor((ref.current?.clientWidth || 800) / 7));
    const update = () => {
      const newLines: string[] = [];
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
          <span key={i} style={{ opacity: 0.4 + Math.sin(i * 0.3) * 0.3 }}>
            {line}
            {"\n"}
          </span>
        ))}
      </pre>
    </div>
  );
}
