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
  let out = "";
  for (let i = 0; i < cols; i++) out += Math.random() < 0.3 ? " " : randomGlyph();
  return out;
}

/**
 * Cipher strip between sections. The shimmer writes straight into the text
 * nodes on the shared page clock — no React re-render per tick.
 */
export default function CrypticDivider({ lines = 6, label }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const colsRef = useRef(60);
  const [visible, setVisible] = useState(false);
  const reduced = prefersReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.1 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /* Seed a static frame as soon as the strip is measured. */
  useEffect(() => {
    colsRef.current = Math.min(80, Math.floor((ref.current?.clientWidth || 600) / 8));
    rowRefs.current.forEach((row) => {
      if (row) row.textContent = generateLine(colsRef.current);
    });
  }, [lines]);

  useRafTicker(
    () => {
      rowRefs.current.forEach((row) => {
        if (row) row.textContent = generateLine(colsRef.current);
      });
    },
    visible && !reduced,
    120,
  );

  return (
    <div ref={ref} className="cryptic-divider" style={{ opacity: visible ? 1 : 0 }} aria-hidden="true">
      {label && <div className="cryptic-divider__label">{label}</div>}
      <pre className="cryptic-divider__text">
        {Array.from({ length: lines }, (_, i) => (
          <span key={i} style={{ opacity: 0.15 + (i / lines) * 0.25, display: "block" }}>
            <span
              ref={(node) => {
                rowRefs.current[i] = node;
              }}
            />
          </span>
        ))}
      </pre>
    </div>
  );
}
