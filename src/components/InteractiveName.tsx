import { useRef, useEffect, useState, useCallback } from "react";

const FIRST = "ALEXANDER";
const LAST = "LESCHIK";

export default function InteractiveName() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    setMousePos({ x, y });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("mousemove", handleMouseMove);
    return () => el.removeEventListener("mousemove", handleMouseMove);
  }, [handleMouseMove]);

  return (
    <div
      ref={containerRef}
      className="interactive-name-container"
      data-reveal
      style={{
        opacity: 0,
        transform: "translateY(10px)",
        transition: "opacity 0.6s ease 0.1s, transform 0.6s ease 0.1s",
      }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="interactive-name-row">
        {FIRST.split("").map((char, i) => {
          const offset = isHovering
            ? {
                x: mousePos.x * (8 + i * 1.5) * (i % 2 === 0 ? 1 : -1),
                y: mousePos.y * (6 + i * 1.2) * (i % 2 === 0 ? -1 : 1),
                rotate: mousePos.x * (3 + i * 0.8) * (i % 2 === 0 ? 1 : -1),
                scale: 1 + Math.abs(mousePos.x * mousePos.y) * 0.08,
              }
            : { x: 0, y: 0, rotate: 0, scale: 1 };

          return (
            <span
              key={i}
              className="interactive-char"
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) rotate(${offset.rotate}deg) scale(${offset.scale})`,
                transitionDelay: `${i * 15}ms`,
              }}
            >
              {char}
            </span>
          );
        })}
      </div>
      <div className="interactive-name-row interactive-name-last">
        {LAST.split("").map((char, i) => {
          const offset = isHovering
            ? {
                x: mousePos.x * (10 + i * 2) * (i % 2 === 0 ? -1 : 1),
                y: mousePos.y * (8 + i * 1.5) * (i % 2 === 0 ? 1 : -1),
                rotate: mousePos.y * (4 + i * 1) * (i % 2 === 0 ? -1 : 1),
                scale: 1 + Math.abs(mousePos.x * mousePos.y) * 0.1,
              }
            : { x: 0, y: 0, rotate: 0, scale: 1 };

          return (
            <span
              key={i}
              className="interactive-char"
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) rotate(${offset.rotate}deg) scale(${offset.scale})`,
                transitionDelay: `${i * 20}ms`,
              }}
            >
              {char}
            </span>
          );
        })}
      </div>
    </div>
  );
}
