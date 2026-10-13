import { useEffect, useRef } from "react";
import { getFoilEngine } from "@/foil/engine";
import { field, FIELD_REGIONS } from "@/foil/scenes/field";
import { fieldRegions, getFieldState, setFieldState } from "@/foil/fieldStore";

const FADE_MS = 1200;

/**
 * The Treasury field: one fixed GPU layer under the whole page (it paints the
 * page background itself), carrying the floating cipher glyphs, watermark
 * seals, holographic sheen and pointer glints. Sections declare density via
 * <CrypticBackground>; without a GPU those fall back to their 2D canvases.
 */
export default function TreasuryField() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    const engine = getFoilEngine();
    const pointer = { x: -9999, y: -9999, active: 0, target: 0 };
    let fadeStart = -1;
    let last = { scroll: -1, w: 0, h: 0 };

    const onMove = (e: PointerEvent) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.target = e.pointerType === "touch" ? 0 : 1;
    };
    const onLeave = () => {
      pointer.target = 0;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);

    const offStatus = engine.subscribeStatus((s) => {
      if (s === "static") setFieldState("off");
    });
    // A GPU that never produces a frame should not leave the page bare.
    const watchdog = window.setTimeout(() => {
      if (getFieldState() === "pending") setFieldState("off");
    }, 8000);

    const detach = engine.attach(host, {
      scene: field,
      accent: [0.4, 0.6, 0.9],
      maxDpr: 1.5,
      glMaxDpr: 1.15,
      onLive: () => {
        fadeStart = performance.now();
        setFieldState("live");
      },
      onFail: () => setFieldState("off"),
      needsFrame: () => {
        const moved = window.scrollY !== last.scroll || window.innerWidth !== last.w || window.innerHeight !== last.h;
        return moved || (fadeStart >= 0 && performance.now() - fadeStart < FADE_MS);
      },
      onFrame: (u, now) => {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        last = { scroll: window.scrollY, w: vw, h: vh };
        pointer.active += (pointer.target - pointer.active) * 0.08;
        u[20] = window.scrollY;
        u[21] = vw;
        u[22] = vh;
        u[23] = u[2];
        u[24] = pointer.x;
        u[25] = pointer.y;
        u[26] = pointer.active;
        u[27] = fadeStart < 0 ? 0 : Math.min(1, (now - fadeStart) / FADE_MS);
        let n = 0;
        for (const r of fieldRegions) {
          if (n >= FIELD_REGIONS) break;
          const b = r.el.getBoundingClientRect();
          if (b.bottom < -120 || b.top > vh + 120 || b.height < 1) continue;
          const o = 28 + n * 4;
          u[o] = b.top;
          u[o + 1] = b.bottom;
          u[o + 2] = r.alpha;
          u[o + 3] = r.rate;
          n++;
        }
        for (; n < FIELD_REGIONS; n++) {
          const o = 28 + n * 4;
          u[o] = 0;
          u[o + 1] = 0;
          u[o + 2] = 0;
          u[o + 3] = 1;
        }
      },
    });

    return () => {
      detach();
      offStatus();
      window.clearTimeout(watchdog);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return <div ref={ref} className="treasury-field" aria-hidden="true" />;
}
