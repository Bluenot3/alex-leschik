import { useEffect, useRef } from "react";
import { getFoilEngine } from "@/foil/engine";
import { stage, STAGE_SLOTS } from "@/foil/scenes/stage";
import { prefersReducedMotion } from "@/hooks/useRafTicker";

interface Props {
  /** The image to show; changing it mints the next one in. */
  src: string | undefined;
  /** First frame with an image on screen. */
  onShown?: () => void;
  /** This image can't be decoded (the theater drops it). */
  onImageError?: (src: string) => void;
  /** No GPU path: the theater falls back to its <img> stage. */
  onFail: () => void;
}

/**
 * GPU stage for the Visual Arsenal theater: two image layers that trade
 * places, so each new image mints in over the last one.
 */
export default function TheaterStage({ src, onShown, onImageError, onFail }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const cb = useRef({ onShown, onImageError, onFail });
  cb.current = { onShown, onImageError, onFail };
  const st = useRef({
    w: 1024,
    h: 576,
    aspects: [1, 1],
    ready: [0, 0],
    urls: [null, null] as (string | null)[],
    cur: 0,
    start: -100,
    pending: "",
    dirty: true,
  });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const engine = getFoilEngine();
    const s = st.current;
    const r = host.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    s.w = Math.min(2048, Math.max(512, Math.round(r.width * dpr)));
    s.h = Math.max(256, Math.round((s.w * r.height) / Math.max(r.width, 1)));

    const offStatus = engine.subscribeStatus((x) => {
      if (x === "static") cb.current.onFail();
    });
    const detach = engine.attach(host, {
      scene: stage,
      accent: [0.42, 0.64, 0.96],
      seed: 0,
      maxDpr: 2,
      glMaxDpr: 1.5,
      target: host.parentElement,
      layers: { width: s.w, height: s.h, count: 2 },
      onFail: () => cb.current.onFail(),
      needsFrame: () => {
        const d = s.dirty;
        s.dirty = false;
        return d;
      },
      onFrame: (u) => {
        const im = 28 + STAGE_SLOTS.images * 4;
        u[im] = s.aspects[0];
        u[im + 1] = s.aspects[1];
        u[im + 2] = s.start;
        u[im + 3] = s.cur;
        const ly = 28 + STAGE_SLOTS.layers * 4;
        u[ly] = s.w / s.h;
        u[ly + 1] = s.ready[0];
        u[ly + 2] = s.ready[1];
        u[ly + 3] = s.w;
      },
    });
    return () => {
      detach();
      offStatus();
    };
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !src) return;
    const s = st.current;
    if (s.urls[s.cur] === src && s.ready[s.cur]) return;
    s.pending = src;
    const img = new Image();
    img.decoding = "async";
    img.src = src;
    img
      .decode()
      .then(() => {
        if (s.pending !== src || !hostRef.current) return;
        // Contain-fit into the free layer (transparent margins); the shader
        // fills them with a blurred copy of the image.
        const canvas = document.createElement("canvas");
        canvas.width = s.w;
        canvas.height = s.h;
        const ctx = canvas.getContext("2d")!;
        ctx.imageSmoothingQuality = "high";
        const k = Math.min(s.w / img.naturalWidth, s.h / img.naturalHeight);
        const dw = img.naturalWidth * k;
        const dh = img.naturalHeight * k;
        ctx.drawImage(img, (s.w - dw) / 2, (s.h - dh) / 2, dw, dh);
        const slot = s.ready[s.cur] ? 1 - s.cur : s.cur;
        getFoilEngine().setLayer(host, slot, canvas);
        s.aspects[slot] = img.naturalWidth / img.naturalHeight;
        s.ready[slot] = 1;
        s.urls[slot] = src;
        s.cur = slot;
        s.start = prefersReducedMotion() ? -100 : performance.now() / 1000;
        s.dirty = true;
        cb.current.onShown?.();
      })
      .catch(() => {
        if (s.pending === src) cb.current.onImageError?.(src);
      });
  }, [src]);

  return <div ref={hostRef} className="theater-stage" aria-hidden="true" />;
}
