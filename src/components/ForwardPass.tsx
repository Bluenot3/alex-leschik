import { useCallback, useEffect, useMemo, useRef } from "react";
import { prefersReducedMotion, useRafTicker } from "@/hooks/useRafTicker";

type Point = { x: number; y: number };
type SectionDatum = {
  element: HTMLElement;
  index: number;
  words: number;
  tokens: Set<string>;
  label: string;
};

const STOP_WORDS = new Set([
  "about", "after", "again", "also", "been", "being", "built", "could", "every",
  "from", "have", "into", "more", "most", "only", "over", "that", "their", "there",
  "these", "they", "this", "through", "under", "very", "what", "when", "where", "which",
  "with", "would", "your",
]);

function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+]+/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 3 && !STOP_WORDS.has(token));
}

function similarity(a: Set<string>, b: Set<string>) {
  if (!a.size || !b.size) return 0;
  let shared = 0;
  a.forEach((token) => {
    if (b.has(token)) shared += 1;
  });
  return shared / Math.sqrt(a.size * b.size);
}

/* innerText forces layout and serializes the whole section — do it once per
   element, not on every re-measure. */
const sectionText = new WeakMap<HTMLElement, { words: number; tokens: Set<string>; label: string }>();

function readSection(element: HTMLElement, index: number) {
  const cached = sectionText.get(element);
  if (cached) return cached;
  const text = element.innerText || "";
  const heading = element.querySelector<HTMLElement>("h1, h2, h3, [class*='title']");
  const entry = {
    words: text.trim() ? text.trim().split(/\s+/).length : 0,
    tokens: new Set(tokenize(text).slice(0, 96)),
    label: (heading?.innerText || `SECTION ${String(index + 1).padStart(2, "0")}`).replace(/\s+/g, " ").trim().slice(0, 24),
  };
  // Lazy sections arrive empty first; only cache once they have content.
  if (entry.words > 0) sectionText.set(element, entry);
  return entry;
}

function readToken(style: CSSStyleDeclaration, name: string, fallback: string) {
  const value = style.getPropertyValue(name).trim();
  return value ? `hsl(${value})` : fallback;
}

export default function ForwardPass() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sectionsRef = useRef<SectionDatum[]>([]);
  const pointerRef = useRef<Point>({ x: 0, y: 0 });
  const scanRef = useRef(0);
  const lastPaintRef = useRef(0);
  const sizeRef = useRef({ width: 0, height: 0, dpr: 1 });
  const colorsRef = useRef({ ink: "hsl(215 25% 12%)", signal: "hsl(196 88% 45%)", warm: "hsl(25 95% 58%)" });
  const reduced = useMemo(() => prefersReducedMotion(), []);

  const measure = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, width < 768 ? 1.25 : 1.6);
    sizeRef.current = { width, height, dpr };
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const nodes = Array.from(
      document.querySelectorAll<HTMLElement>("main section, .portfolio-shell section, [data-scroll-section]"),
    ).filter((element, index, all) => all.indexOf(element) === index && element.offsetHeight > 80);

    sectionsRef.current = nodes.map((element, index) => ({ element, index, ...readSection(element, index) }));

    const style = getComputedStyle(document.documentElement);
    colorsRef.current = {
      ink: readToken(style, "--forward-ink", "hsl(215 25% 12%)"),
      signal: readToken(style, "--forward-signal", "hsl(196 88% 45%)"),
      warm: readToken(style, "--forward-active", "hsl(25 95% 58%)"),
    };
  }, []);

  useEffect(() => {
    measure();
    pointerRef.current = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

    let resizeFrame = 0;
    const onResize = () => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(measure);
    };
    const onPointer = (event: PointerEvent) => {
      if (event.pointerType !== "touch") pointerRef.current = { x: event.clientX, y: event.clientY };
    };

    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("pointermove", onPointer, { passive: true });
    const refresh = window.setInterval(measure, 2400);
    return () => {
      cancelAnimationFrame(resizeFrame);
      window.clearInterval(refresh);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointer);
    };
  }, [measure]);

  useRafTicker((now, deltaMs) => {
    if (now - lastPaintRef.current < (reduced ? 250 : 34)) return;
    lastPaintRef.current = now;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const { width, height, dpr } = sizeRef.current;
    if (!width || !height) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const { ink, signal, warm } = colorsRef.current;
    const mobile = width < 760;
    const railX = mobile ? 9 : 25;
    const rightX = width - 24;
    const pageHeight = Math.max(document.documentElement.scrollHeight, 1);
    const visible = sectionsRef.current
      .map((section) => ({ section, rect: section.element.getBoundingClientRect() }))
      .filter(({ rect }) => rect.bottom > -height * 0.35 && rect.top < height * 1.35);

    const active = visible.reduce<{ section: SectionDatum; rect: DOMRect } | null>((best, item) => {
      const distance = Math.abs(item.rect.top + item.rect.height * 0.25 - height * 0.44);
      if (!best) return item;
      const bestDistance = Math.abs(best.rect.top + best.rect.height * 0.25 - height * 0.44);
      return distance < bestDistance ? item : best;
    }, null);

    const targetScan = active ? Math.max(18, Math.min(height - 18, active.rect.top)) : height * 0.5;
    const damping = reduced ? 1 : 1 - Math.exp(-deltaMs / 95);
    scanRef.current += (targetScan - scanRef.current) * damping;

    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = ink;
    ctx.lineWidth = 0.55;
    ctx.beginPath();
    ctx.moveTo(railX, 15);
    ctx.lineTo(railX, height - 15);
    ctx.stroke();

    sectionsRef.current.forEach((section) => {
      const absoluteTop = section.element.offsetTop;
      const y = 15 + (absoluteTop / pageHeight) * (height - 30);
      const activeSection = active?.section === section;
      ctx.globalAlpha = activeSection ? 0.9 : 0.24;
      ctx.strokeStyle = activeSection ? signal : ink;
      ctx.lineWidth = activeSection ? 1.25 : 0.6;
      const tick = Math.min(mobile ? 10 : 30, 6 + Math.sqrt(section.words) * 1.35);
      ctx.beginPath();
      ctx.moveTo(railX, y);
      ctx.lineTo(railX + tick, y);
      ctx.stroke();
      if (!mobile && activeSection) {
        ctx.globalAlpha = 0.56;
        ctx.fillStyle = ink;
        ctx.font = "8px 'DM Mono', monospace";
        ctx.fillText(`${String(section.index + 1).padStart(2, "0")} · ${section.words}w`, railX + tick + 6, y + 3);
      }
    });

    if (!mobile && active) {
      const previous = sectionsRef.current
        .slice(0, active.section.index)
        .map((section) => ({ section, weight: similarity(active.section.tokens, section.tokens) }))
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 3);

      previous.forEach(({ section, weight }, edgeIndex) => {
        const fromY = Math.max(28, Math.min(height - 28, active.rect.top + 26 + edgeIndex * 9));
        const sourceRect = section.element.getBoundingClientRect();
        const toY = Math.max(28, Math.min(height - 28, sourceRect.top + 24));
        const laneX = rightX - 14 - edgeIndex * 10;
        ctx.globalAlpha = 0.12 + weight * 0.65;
        ctx.strokeStyle = edgeIndex === 0 ? signal : ink;
        ctx.lineWidth = 0.55 + weight * 1.1;
        ctx.beginPath();
        ctx.moveTo(rightX, fromY);
        ctx.lineTo(laneX, fromY);
        ctx.lineTo(laneX, toY);
        ctx.lineTo(rightX - 3, toY);
        ctx.stroke();
      });

      const headingPoints = visible
        .map(({ section }) => section.element.querySelector<HTMLElement>("h1, h2, h3, [class*='title']"))
        .filter((heading): heading is HTMLElement => Boolean(heading))
        .map((heading) => {
          const rect = heading.getBoundingClientRect();
          return { x: Math.min(width - 210, rect.right + 12), y: rect.top + rect.height / 2 };
        })
        .filter((point) => point.y > 30 && point.y < height - 30)
        .sort((a, b) => Math.hypot(a.x - pointerRef.current.x, a.y - pointerRef.current.y) - Math.hypot(b.x - pointerRef.current.x, b.y - pointerRef.current.y))
        .slice(0, 3);

      const rawWeights = headingPoints.map((point) => Math.exp(-Math.hypot(point.x - pointerRef.current.x, point.y - pointerRef.current.y) / 360));
      const sum = rawWeights.reduce((total, value) => total + value, 0) || 1;
      headingPoints.forEach((point, index) => {
        const weight = rawWeights[index] / sum;
        ctx.globalAlpha = 0.1 + weight * 0.32;
        ctx.strokeStyle = signal;
        ctx.setLineDash([2, 5]);
        ctx.beginPath();
        ctx.moveTo(rightX, point.y);
        ctx.lineTo(Math.max(point.x, width - 185), point.y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = ink;
        ctx.font = "8px 'DM Mono', monospace";
        ctx.fillText(weight.toFixed(2), width - 54, point.y - 4);
      });
    }

    const scanGradient = ctx.createLinearGradient(0, 0, width, 0);
    scanGradient.addColorStop(0, warm);
    scanGradient.addColorStop(0.22, signal);
    scanGradient.addColorStop(0.72, signal);
    scanGradient.addColorStop(1, warm);
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = scanGradient;
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(0, scanRef.current);
    ctx.lineTo(mobile ? 26 : 82, scanRef.current);
    ctx.moveTo(mobile ? width - 26 : width - 82, scanRef.current);
    ctx.lineTo(width, scanRef.current);
    ctx.stroke();
    ctx.restore();
  }, true, 0);

  return <canvas ref={canvasRef} className="forward-pass" aria-hidden="true" />;
}