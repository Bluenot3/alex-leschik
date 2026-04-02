import { useEffect, useRef, useState } from "react";

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*+=<>{}[]|/\\~^`.,:;!?-_";

interface Props {
  lines?: number;
  label?: string;
}

function randomGlyph() {
  return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
}

function generateLine(cols: number): string {
  const arr: string[] = [];
  for (let i = 0; i < cols; i++) {
    arr.push(Math.random() < 0.3 ? " " : randomGlyph());
  }
  return arr.join("");
}

export default function CrypticDivider({ lines = 6, label }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [textLines, setTextLines] = useState<string[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => setVisible(e.isIntersecting),
      { threshold: 0.1 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    const cols = Math.min(80, Math.floor((ref.current?.clientWidth || 600) / 8));
    const update = () => {
      const newLines: string[] = [];
      for (let i = 0; i < lines; i++) {
        newLines.push(generateLine(cols));
      }
      setTextLines(newLines);
    };
    update();
    intervalRef.current = setInterval(update, 120);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [visible, lines]);

  return (
    <div
      ref={ref}
      className="cryptic-divider"
      style={{ opacity: visible ? 1 : 0 }}
    >
      {label && <div className="cryptic-divider__label">{label}</div>}
      <pre className="cryptic-divider__text">
        {textLines.map((line, i) => (
          <span
            key={i}
            style={{ opacity: 0.15 + (i / lines) * 0.25 }}
          >
            {line}
            {"\n"}
          </span>
        ))}
      </pre>
    </div>
  );
}
