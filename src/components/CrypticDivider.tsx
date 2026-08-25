import { useEffect, useRef, useState } from "react";
import { useRafTicker, prefersReducedMotion } from "@/hooks/useRafTicker";

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
  const colsRef = useRef(60);
  const reduced = prefersReducedMotion();

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

  /* Seed a static frame as soon as the strip is measured. */
  useEffect(() => {
    const cols = Math.min(80, Math.floor((ref.current?.clientWidth || 600) / 8));
    colsRef.current = cols;
    setTextLines(Array.from({ length: lines }, () => generateLine(cols)));
  }, [lines]);

  /* Shimmer on the shared page clock, throttled and gated to the viewport. */
  useRafTicker(
    () => {
      setTextLines(Array.from({ length: lines }, () => generateLine(colsRef.current)));
    },
    visible && !reduced,
    120
  );

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
