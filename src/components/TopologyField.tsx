import { useEffect, useRef } from "react";
import { prefersReducedMotion, useRafTicker } from "@/hooks/useRafTicker";
import { useInView } from "@/hooks/useInView";

/** A projected, folded sheet: continuous contours, not a particle cloud. */
export default function TopologyField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { ref, inView } = useInView<HTMLDivElement>({ rootMargin: "100px" });
  const frame = useRef<(now: number) => void>(() => {});

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = ref.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !host || !context) return;
    const reduced = prefersReducedMotion();
    let width = 0;
    let height = 0;
    let resizeFrame = 0;
    let pointer = 0;
    let smoothed = 0;
    const style = getComputedStyle(document.documentElement);
    const ink = `hsl(${style.getPropertyValue("--forward-ink").trim()})`;
    const signal = `hsl(${style.getPropertyValue("--forward-signal").trim()})`;
    const active = `hsl(${style.getPropertyValue("--forward-active").trim()})`;

    frame.current = (now) => {
      if (!width || !height) return;
      context.clearRect(0, 0, width, height);
      const mobile = width < 760;
      const time = reduced ? 0.8 : now * 0.00022;
      smoothed += (pointer - smoothed) * 0.06;
      const lines = mobile ? 28 : 46;
      const samples = mobile ? 72 : 120;
      const project = (u: number, v: number) => {
        const twist = u * 5.6 + time;
        const fold = Math.sin(twist) * (0.18 + v * 0.16);
        return {
          x: width * (0.04 + u * 0.92) + Math.sin(twist + v * 2) * width * 0.045,
          y: height * (0.60 + fold + Math.cos(u * 7.4 - time * 0.7) * 0.085 + v * 0.22)
            + smoothed * Math.sin(u * Math.PI) * 22,
        };
      };
      for (let row = 0; row < lines; row++) {
        const v = row / (lines - 1) - 0.5;
        context.beginPath();
        for (let step = 0; step <= samples; step++) {
          const point = project(step / samples, v);
          if (step === 0) context.moveTo(point.x, point.y);
          else context.lineTo(point.x, point.y);
        }
        context.strokeStyle = row % 11 === 0 ? signal : ink;
        context.globalAlpha = row % 11 === 0 ? 0.56 : 0.12 + Math.abs(v) * 0.23;
        context.lineWidth = row % 11 === 0 ? 1.1 : 0.65;
        context.stroke();
        // Ordered, sparse stippling makes the surface resolve into fine print.
        if (row % 2 === 0) {
          context.fillStyle = row % 6 === 0 ? active : signal;
          context.globalAlpha = 0.48;
          for (let step = row % 4; step < samples; step += 6) {
            const point = project(step / samples, v);
            context.fillRect(point.x, point.y, 1.2, 1.2);
          }
        }
      }
      context.globalAlpha = 1;
    };
    const resize = () => {
      const rect = host.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, width < 760 ? 1.25 : 1.5);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      frame.current(performance.now());
    };
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(resize);
    });
    const move = (event: PointerEvent) => {
      if (!reduced && event.pointerType !== "touch") pointer = event.clientX / window.innerWidth - 0.5;
    };
    observer.observe(host);
    window.addEventListener("pointermove", move, { passive: true });
    resize();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(resizeFrame);
      window.removeEventListener("pointermove", move);
      frame.current = () => {};
    };
  }, [ref]);

  useRafTicker((now) => frame.current(now), inView && !prefersReducedMotion(), 50);
  return <div ref={ref} className="topology-field" aria-hidden="true"><canvas ref={canvasRef} /></div>;
}