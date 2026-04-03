import { useCallback, useEffect, useRef, useState } from "react";

interface ScrollState {
  progress: number;
  smoothProgress: number;
  currentSection: number;
  cubeRotation: { rx: number; ry: number };
}

const STOPS = [
  { rx: 90, ry: 0 },
  { rx: 0, ry: 0 },
  { rx: 0, ry: -90 },
  { rx: 0, ry: -180 },
  { rx: 0, ry: -270 },
  { rx: -90, ry: -360 },
];

const easeIO = (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);

export function useScrollEngine(sectionCount: number) {
  const [state, setState] = useState<ScrollState>({
    progress: 0,
    smoothProgress: 0,
    currentSection: 0,
    cubeRotation: { rx: 90, ry: 0 },
  });

  const smoothRef = useRef(0);
  const tgtRef = useRef(0);
  const lastNowRef = useRef(performance.now());
  const maxScrollRef = useRef(1);
  const sectionTopsRef = useRef<number[]>([]);
  const frameRef = useRef(0);

  const buildSectionTops = useCallback(() => {
    const sections = document.querySelectorAll("[data-scroll-section]");
    sectionTopsRef.current = Array.from(sections).map(
      (s) => (s as HTMLElement).getBoundingClientRect().top + window.scrollY
    );
  }, []);

  const sectionIndexFromScroll = useCallback((y: number) => {
    const mid = y + window.innerHeight * 0.5;
    let idx = 0;
    for (let i = 0; i < sectionTopsRef.current.length; i++) {
      if (mid >= sectionTopsRef.current[i]) idx = i;
    }
    return Math.min(idx, sectionCount - 1);
  }, [sectionCount]);

  const getCubeRotation = useCallback((s: number) => {
    const n = Math.min(sectionCount, STOPS.length);
    if (n < 2) return { rx: 90, ry: 0 };
    const t = s * (n - 1);
    const i = Math.min(Math.floor(t), n - 2);
    const f = easeIO(t - i);
    const a = STOPS[i];
    const b = STOPS[i + 1];
    return {
      rx: a.rx + (b.rx - a.rx) * f,
      ry: a.ry + (b.ry - a.ry) * f,
    };
  }, [sectionCount]);

  useEffect(() => {
    const resize = () => {
      const h = document.documentElement.scrollHeight;
      const vh = window.innerHeight;
      maxScrollRef.current = Math.max(1, h - vh);
      buildSectionTops();
    };

    const onScroll = () => {
      tgtRef.current = Math.max(0, Math.min(1, window.scrollY / maxScrollRef.current));
    };

    // No custom wheel handler — use native scroll for reliability

    const frame = (now: number) => {
      if (document.hidden) {
        lastNowRef.current = now;
        frameRef.current = requestAnimationFrame(frame);
        return;
      }

      const dt = Math.min((now - lastNowRef.current) / 1000, 0.05);
      lastNowRef.current = now;

      smoothRef.current += (tgtRef.current - smoothRef.current) * (1 - Math.exp(-dt * 8));
      smoothRef.current = Math.max(0, Math.min(1, smoothRef.current));

      const si = sectionIndexFromScroll(window.scrollY);
      const rotation = getCubeRotation(smoothRef.current);

      setState((prev) => {
        if (
          prev.currentSection === si &&
          Math.abs(prev.progress - tgtRef.current) < 0.0015 &&
          Math.abs(prev.smoothProgress - smoothRef.current) < 0.0015 &&
          Math.abs(prev.cubeRotation.rx - rotation.rx) < 0.2 &&
          Math.abs(prev.cubeRotation.ry - rotation.ry) < 0.2
        ) {
          return prev;
        }

        return {
          progress: tgtRef.current,
          smoothProgress: smoothRef.current,
          currentSection: si,
          cubeRotation: rotation,
        };
      });

      frameRef.current = requestAnimationFrame(frame);
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("scroll", onScroll, { passive: true });

    const ro = new ResizeObserver(() => {
      resize();
      tgtRef.current = maxScrollRef.current > 0 ? window.scrollY / maxScrollRef.current : 0;
      smoothRef.current = tgtRef.current;
    });
    ro.observe(document.documentElement);

    frameRef.current = requestAnimationFrame(frame);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", onScroll);
      ro.disconnect();
      cancelAnimationFrame(frameRef.current);
    };
  }, [buildSectionTops, sectionIndexFromScroll, getCubeRotation]);

  const scrollToSection = useCallback((index: number) => {
    if (sectionTopsRef.current[index] !== undefined) {
      const targetY = sectionTopsRef.current[index];

      const startY = window.scrollY;
      const diff = targetY - startY;
      const start = performance.now();
      const duration = 900;

      const easeInOutCubic = (t: number) =>
        t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      const tick = (now: number) => {
        const p = Math.min(1, (now - start) / duration);
        const y = startY + diff * easeInOutCubic(p);
        window.scrollTo(0, y);
        tgtRef.current = y / maxScrollRef.current;
        smoothRef.current = tgtRef.current;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
  }, []);

  return { ...state, scrollToSection };
}
