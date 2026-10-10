import { useEffect, useRef } from "react";
import { getFoilEngine } from "@/foil/engine";
import { cube, cssRotX, cssRotY, mul3 } from "@/foil/scenes/cube";
import { LayerLoadError, loadLayer, videoLayer } from "@/foil/images";
import { prefersReducedMotion, subscribeTick } from "@/hooks/useRafTicker";

export interface VaultMedia {
  url: string;
  type: "image" | "video";
}

export interface VaultProps {
  /** One entry per face (top, front, right, back, left, bottom); null = not uploaded. */
  media: (VaultMedia | null)[];
  rotation: { rx: number; ry: number };
  /** False while the hero has scrolled away (the vault stops rendering). */
  active: boolean;
  /** No GPU path for this visitor: the caller shows the CSS cube instead. */
  onFallback: () => void;
}

const FACE_COUNT = 6;
const VIDEO_FRAME_MS = 1000 / 24;

/**
 * The hero cube on the GPU: the owner's six uploads printed on a ray-traced
 * crystal vault. Faces show an engraved ZEN seal until their image arrives,
 * then mint in — no stand-in photos at any point.
 */
export default function CubeVault({ media, rotation, active, onFallback }: VaultProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const rot = useRef(rotation);
  rot.current = rotation;
  const fallback = useRef(onFallback);
  fallback.current = onFallback;
  const state = useRef({
    size: 1024,
    loads: new Array<number>(FACE_COUNT).fill(0),
    urls: new Array<string | null>(FACE_COUNT).fill(null),
    dirty: true,
    videos: new Map<number, ReturnType<typeof videoLayer>>(),
    /** Shared-clock subscription while any face is a video. */
    videoTick: null as (() => void) | null,
    lastVideo: 0,
    active: true,
  });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const engine = getFoilEngine();
    const reduced = prefersReducedMotion();
    const st = state.current;
    // Face texture size: the cube's on-screen size at device resolution.
    const facePx = (host.parentElement?.clientWidth || 520) * Math.min(window.devicePixelRatio || 1, 2);
    st.size = facePx > 600 ? 1024 : 512;

    const ptr = { x: 0, y: 0, tx: 0, ty: 0, on: 0, ton: 0 };
    let introStart = -1;
    let last = { rx: NaN, ry: NaN };
    const onMove = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      ptr.tx = ((e.clientX - (r.left + r.width / 2)) / (r.width / 2)) * 1.4;
      ptr.ty = ((e.clientY - (r.top + r.height / 2)) / (r.height / 2)) * 1.4;
      ptr.ton = e.pointerType === "touch" ? 0 : 1;
    };
    const onLeave = () => {
      ptr.ton = 0;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);

    const offStatus = engine.subscribeStatus((s) => {
      if (s === "static") fallback.current();
    });

    const detach = engine.attach(host, {
      scene: cube,
      accent: [0.42, 0.64, 0.96],
      seed: 0,
      maxDpr: 2,
      glMaxDpr: 1.5,
      layers: { width: st.size, height: st.size, count: FACE_COUNT },
      onFail: () => fallback.current(),
      needsFrame: () => {
        const r = rot.current;
        const moved = r.rx !== last.rx || r.ry !== last.ry;
        const fresh = st.dirty;
        st.dirty = false;
        return moved || fresh;
      },
      onFrame: (u, now) => {
        const t = now / 1000;
        if (introStart < 0) introStart = now;
        ptr.x += (ptr.tx - ptr.x) * 0.06;
        ptr.y += (ptr.ty - ptr.y) * 0.06;
        ptr.on += (ptr.ton - ptr.on) * 0.05;
        const r = rot.current;
        last = { rx: r.rx, ry: r.ry };
        // Idle drift plus a slight lean toward the pointer, on top of the
        // scroll-driven rotation the CSS cube used.
        const dx = reduced ? 0 : 2.2 * Math.sin(t * 0.45) - ptr.y * ptr.on * 4.5;
        const dy = reduced ? 0 : 3.4 * Math.sin(t * 0.31) + ptr.x * ptr.on * 6.5;
        const m = mul3(cssRotX(r.rx + dx), cssRotY(r.ry + dy));
        for (let row = 0; row < 3; row++) {
          u[28 + row * 4] = m[row * 3];
          u[29 + row * 4] = m[row * 3 + 1];
          u[30 + row * 4] = m[row * 3 + 2];
        }
        for (let f = 0; f < FACE_COUNT; f++) u[40 + f] = st.loads[f];
        const k = Math.min(1, (now - introStart) / 900);
        u[20] = reduced ? 0 : 0.012 * Math.sin(t * 0.9);
        u[21] = reduced ? 1 : 1 - (1 - k) * (1 - k) * (1 - k);
        u[22] = st.size;
        u[24] = ptr.x;
        u[25] = ptr.y;
        u[26] = ptr.on;
      },
    });

    return () => {
      st.videoTick?.();
      st.videoTick = null;
      st.videos.forEach((v) => v.dispose());
      st.videos.clear();
      detach();
      offStatus();
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    state.current.active = active;
    getFoilEngine().setActive(host, active);
    state.current.videos.forEach((v) => (active ? v.play() : v.pause()));
  }, [active]);

  /* Load each face's upload into its layer; the hero's first face goes first. */
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const engine = getFoilEngine();
    const reduced = prefersReducedMotion();
    const st = state.current;
    // A result is stale once its face has moved on to another upload (or the
    // vault unmounted) — checked per face, so a new upload elsewhere never
    // strands a load already in flight.
    const stale = (f: number, url: string) => !hostRef.current || st.urls[f] !== url;

    const load = async (f: number) => {
      const m = media[f];
      if (!m || st.urls[f] === m.url) return;
      st.urls[f] = m.url;
      st.videos.get(f)?.dispose();
      st.videos.delete(f);
      try {
        if (m.type === "video") {
          const v = videoLayer(m.url, st.size, st.size);
          await v.ready;
          if (stale(f, m.url)) return v.dispose();
          st.videos.set(f, v);
          v.play();
          // Video faces re-upload frames at 24 fps on the shared page clock,
          // only while the vault is on screen.
          st.videoTick ??= subscribeTick((now) => {
            if (!st.active || now - st.lastVideo < VIDEO_FRAME_MS) return;
            st.lastVideo = now;
            st.videos.forEach((vid, face) => {
              if (!vid.draw()) return;
              engine.setLayer(host, face, vid.canvas);
              if (st.loads[face] === 0) st.loads[face] = reduced ? -1 : performance.now() / 1000;
            });
          });
          return;
        }
        const canvas = await loadLayer(m.url, st.size, st.size);
        if (stale(f, m.url)) return;
        engine.setLayer(host, f, canvas);
        st.loads[f] = reduced ? -1 : performance.now() / 1000;
        st.dirty = true;
      } catch (err) {
        // Readable as an <img> but not as a texture: let the CSS cube show it.
        if (err instanceof LayerLoadError && err.corsOnly) fallback.current();
        st.urls[f] = null;
      }
    };

    void load(0).finally(() => {
      for (let f = 1; f < FACE_COUNT; f++) void load(f);
    });
  }, [media]);

  return <div ref={hostRef} className="cube-vault" aria-hidden="true" />;
}
