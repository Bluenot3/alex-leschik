import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import HoloSigilField from "@/components/zengen/HoloSigilField";
import {
  fetchImagePage,
  COLLECTIONS,
  thumbUrl,
  fullUrl,
  type ZenGenImage,
} from "@/lib/zengen";

const ZenGenStudio = lazy(() => import("@/components/ZenGenStudio"));

type ViewMode = "stream" | "slideshow" | "orbit" | "mosaic";

const MODES: { id: ViewMode; label: string; glyph: string }[] = [
  { id: "stream",    label: "Stream",    glyph: "≡" },
  { id: "slideshow", label: "Slideshow", glyph: "◈" },
  { id: "orbit",     label: "Orbit",     glyph: "⊚" },
  { id: "mosaic",    label: "Mosaic",    glyph: "⊞" },
];

const SLIDE_MS = 6000;

/* ── One frame in the scroll stream ───────────────────────────── */
function StreamFrame({
  image, index, onOpen,
}: { image: ZenGenImage; index: number; onOpen: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [vis, setVis] = useState(false);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVis(true); io.disconnect(); } },
      { rootMargin: "200px 0px -40px 0px", threshold: 0.02 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /* Deterministic rhythm: every 7th frame runs wide, every 3rd tall */
  const span = index % 7 === 0 ? "wide" : index % 3 === 1 ? "tall" : "unit";

  return (
    <button
      ref={ref}
      type="button"
      className={`zg-frame zg-frame--${span}${vis ? " zg-frame--in" : ""}`}
      style={{ transitionDelay: `${(index % 4) * 70}ms` }}
      onClick={onOpen}
      aria-label={image.title || "Open generation"}
    >
      {!ok && <span className="zg-frame__shimmer" aria-hidden />}
      {vis && (
        <img
          src={thumbUrl(image)}
          alt={image.title || "ZEN-GEN generation"}
          className={`zg-frame__img${ok ? " zg-frame__img--in" : ""}`}
          loading="lazy"
          decoding="async"
          onLoad={() => setOk(true)}
        />
      )}
      <span className="zg-frame__grid" aria-hidden />
      <span className="zg-frame__scan" aria-hidden />
      <span className="tc-br tc-br--tl" aria-hidden />
      <span className="tc-br tc-br--tr" aria-hidden />
      <span className="tc-br tc-br--bl" aria-hidden />
      <span className="tc-br tc-br--br" aria-hidden />
      <span className="zg-frame__meta">
        <span className="zg-frame__idx">{String(index + 1).padStart(4, "0")}</span>
        {image.title && <span className="zg-frame__title">{image.title}</span>}
      </span>
    </button>
  );
}

/* ── Cinematic slideshow ──────────────────────────────────────── */
function Slideshow({
  images, onOpen,
}: { images: ZenGenImage[]; onOpen: (i: number) => void }) {
  const [i, setI] = useState(0);
  const [held, setHeld] = useState(false);
  const [ok, setOk] = useState(false);
  const n = images.length;

  const step = useCallback((d: 1 | -1) => {
    setI((v) => (v + d + n) % n);
  }, [n]);

  useEffect(() => {
    if (held || n < 2) return;
    const id = setInterval(() => step(1), SLIDE_MS);
    return () => clearInterval(id);
  }, [held, n, step]);

  useEffect(() => { setOk(false); }, [i]);

  /* Warm the neighbour so the cut never lands on an empty frame */
  useEffect(() => {
    if (n < 2) return;
    const img = new Image();
    img.src = fullUrl(images[(i + 1) % n]);
  }, [i, n, images]);

  const current = images[i];
  if (!current) return null;

  return (
    <div
      className="zg-slideshow"
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
    >
      <div className="zg-slideshow__stage" onClick={() => onOpen(i)}>
        {!ok && <span className="zg-frame__shimmer" aria-hidden />}
        <img
          key={current.id}
          src={fullUrl(current)}
          alt={current.title || "ZEN-GEN generation"}
          className={`zg-slideshow__img${ok ? " zg-slideshow__img--in" : ""}`}
          decoding="async"
          onLoad={() => setOk(true)}
        />
        <span className="zg-slideshow__vignette" aria-hidden />
        <span className="zg-frame__scan" aria-hidden />
        <span className="tc-br tc-br--tl" aria-hidden />
        <span className="tc-br tc-br--tr" aria-hidden />
        <span className="tc-br tc-br--bl" aria-hidden />
        <span className="tc-br tc-br--br" aria-hidden />

        <div className="zg-slideshow__meta">
          <span className="zg-slideshow__counter">
            {String(i + 1).padStart(3, "0")}<em>/</em>{String(n).padStart(3, "0")}
          </span>
          {current.title && <span className="zg-slideshow__title">{current.title}</span>}
          {current.prompt && <p className="zg-slideshow__prompt">{current.prompt}</p>}
        </div>

        <div
          key={`bar-${i}`}
          className={`zg-slideshow__timer${held ? " zg-slideshow__timer--held" : ""}`}
          style={{ animationDuration: `${SLIDE_MS}ms` }}
          aria-hidden
        />
      </div>

      <div className="zg-slideshow__nav">
        <button type="button" className="theater-arrow" onClick={() => step(-1)} aria-label="Previous">
          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M8 1L3 6l5 5" /></svg>
        </button>
        <div className="zg-slideshow__dots">
          {images.slice(0, 24).map((img, d) => (
            <button
              key={img.id}
              type="button"
              className={`zg-dot${d === i ? " zg-dot--on" : ""}`}
              onClick={() => setI(d)}
              aria-label={`Frame ${d + 1}`}
            />
          ))}
        </div>
        <button type="button" className="theater-arrow" onClick={() => step(1)} aria-label="Next">
          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 1l5 5-5 5" /></svg>
        </button>
      </div>
    </div>
  );
}

/* ── Holographic orbit carousel ───────────────────────────────── */
function Orbit({
  images, onOpen,
}: { images: ZenGenImage[]; onOpen: (i: number) => void }) {
  const ring = useMemo(() => images.slice(0, 16), [images]);
  const [angle, setAngle] = useState(0);
  const [held, setHeld] = useState(false);
  const raf = useRef(0);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || held || ring.length === 0) return;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      setAngle((a) => a + dt * 9);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [held, ring.length]);

  if (ring.length === 0) return null;
  const step = 360 / ring.length;
  /* Wide enough that neighbours do not overlap, tight enough that the
     ring still reads as one object inside the frame. */
  const radius = Math.max(300, Math.round(ring.length * 34));

  return (
    <div
      className="zg-orbit"
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
    >
      <HoloSigilField intensity={1.15} className="zg-orbit__field" />
      <div className="zg-orbit__stage" style={{ transform: `rotateX(-9deg) rotateY(${angle}deg)` }}>
        {ring.map((img, i) => (
          <button
            key={img.id}
            type="button"
            className="zg-orbit__card"
            style={{ transform: `rotateY(${i * step}deg) translateZ(${radius}px)` }}
            onClick={() => onOpen(images.indexOf(img))}
            aria-label={img.title || `Generation ${i + 1}`}
          >
            <img src={thumbUrl(img)} alt="" loading="lazy" decoding="async" />
            <span className="zg-orbit__glow" aria-hidden />
          </button>
        ))}
      </div>
      <div className="zg-orbit__hint">
        <span>{held ? "◈ held" : "⊚ orbiting"}</span>
        <span>{ring.length} in ring · hover to hold</span>
      </div>
    </div>
  );
}

/* ── Fullscreen viewer ────────────────────────────────────────── */
function Viewer({
  images, index, onClose, onStep,
}: {
  images: ZenGenImage[]; index: number;
  onClose: () => void; onStep: (d: 1 | -1) => void;
}) {
  const img = images[index];

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onStep(-1);
      if (e.key === "ArrowRight") onStep(1);
    };
    window.addEventListener("keydown", h);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", h);
      document.body.style.overflow = prev;
    };
  }, [onClose, onStep]);

  if (!img) return null;

  /* Portalled to the body: the gallery sits inside a stacking context,
     which would otherwise trap the overlay beneath fixed page chrome. */
  return createPortal(
    <div className="zg-viewer" role="dialog" aria-modal="true" onClick={onClose}>
      <figure className="zg-viewer__stage" onClick={(e) => e.stopPropagation()}>
        <img key={img.id} src={fullUrl(img)} alt={img.title || "ZEN-GEN generation"} className="zg-viewer__img" />
        <figcaption className="zg-viewer__meta">
          <span className="zg-viewer__count">{String(index + 1).padStart(3, "0")} / {String(images.length).padStart(3, "0")}</span>
          {img.title && <span className="zg-viewer__title">{img.title}</span>}
          {img.prompt && <p className="zg-viewer__prompt">{img.prompt}</p>}
        </figcaption>
        <button type="button" className="sg-lightbox__arrow sg-lightbox__arrow--prev" onClick={() => onStep(-1)} aria-label="Previous">
          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M8 1L3 6l5 5" /></svg>
        </button>
        <button type="button" className="sg-lightbox__arrow sg-lightbox__arrow--next" onClick={() => onStep(1)} aria-label="Next">
          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 1l5 5-5 5" /></svg>
        </button>
      </figure>
      <button type="button" className="sg-lightbox__close" onClick={onClose} aria-label="Close">
        <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M1 1l10 10M11 1L1 11" /></svg>
      </button>
    </div>,
    document.body,
  );
}

/* ── Section ──────────────────────────────────────────────────── */
export default function ZenGenGallery() {
  const [images, setImages] = useState<ZenGenImage[]>([]);
  const collections = COLLECTIONS;
  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const [mode, setMode] = useState<ViewMode>("stream");
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [viewing, setViewing] = useState<number | null>(null);
  const [studioOpen, setStudioOpen] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);

  const reload = useCallback(async (collectionId: string | null) => {
    setLoading(true);
    setFailed(false);
    try {
      const { images: rows, nextCursor } = await fetchImagePage(null, collectionId);
      setImages(rows);
      setCursor(nextCursor);
      setHasMore(!!nextCursor);
    } catch {
      setImages([]);
      setHasMore(false);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void reload(activeCollection); }, [activeCollection, reload]);

  /* Infinite scroll — only armed in the modes that grow downward */
  useEffect(() => {
    if (!hasMore || loading) return;
    if (mode !== "stream" && mode !== "mosaic") return;
    const el = sentinel.current;
    if (!el) return;

    const io = new IntersectionObserver(async ([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      try {
        const { images: rows, nextCursor } = await fetchImagePage(cursor, activeCollection);
        setImages((prev) => [...prev, ...rows]);
        setCursor(nextCursor);
        setHasMore(!!nextCursor);
      } catch {
        setHasMore(false);
      }
    }, { rootMargin: "800px 0px" });

    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loading, cursor, activeCollection, mode]);

  const stepViewer = useCallback((d: 1 | -1) => {
    setViewing((v) => (v === null ? v : (v + d + images.length) % images.length));
  }, [images.length]);

  const empty = !loading && !failed && images.length === 0;

  return (
    <section className="zen-gen" id="zen-gen" aria-label="ZEN-GEN generative archive">
      {/* Ambient instrument behind the header */}
      <div className="zen-gen__aura" aria-hidden>
        <HoloSigilField intensity={1} />
      </div>

      <header className="zen-gen__head">
        <span className="zen-gen__eyebrow">◈ ZEN-GEN · generative archive</span>
        <h2 className="zen-gen__title display-heading">
          SIGNALS
          <br />
          RENDERED
        </h2>
        <p className="zen-gen__lede">
          Every frame here was generated by ZEN-GEN. The archive grows continuously — read it as a
          stream, run it as a slideshow, or put it in orbit.
        </p>

        <div className="zen-gen__stat">
          <span className="zen-gen__stat-n">{String(images.length).padStart(4, "0")}{hasMore ? "+" : ""}</span>
          <span className="zen-gen__stat-l">frames in the archive</span>
        </div>
      </header>

      <div className="zen-gen__controls">
        <div className="zen-gen__modes" role="tablist" aria-label="Display mode">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={mode === m.id}
              className={`zg-mode${mode === m.id ? " zg-mode--on" : ""}`}
              onClick={() => setMode(m.id)}
            >
              <span className="zg-mode__glyph">{m.glyph}</span>
              {m.label}
            </button>
          ))}
        </div>

        {collections.length > 0 && (
          <div className="zen-gen__collections">
            <button
              type="button"
              className={`zg-chip${activeCollection === null ? " zg-chip--on" : ""}`}
              onClick={() => setActiveCollection(null)}
            >
              All
            </button>
            {collections.map((c) => (
              <button
                key={c.slug}
                type="button"
                className={`zg-chip zg-chip--${c.accent}${activeCollection === c.slug ? " zg-chip--on" : ""}`}
                onClick={() => setActiveCollection(c.slug)}
              >
                {c.title}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading && (
        <div className="zen-gen__loading">
          <span className="zen-gen__loading-glyph">⊚</span>
          <span>decoding archive…</span>
        </div>
      )}

      {failed && !loading && (
        <div className="zen-gen__empty">
          <HoloSigilField intensity={0.7} className="zen-gen__empty-field" />
          <div className="zen-gen__empty-copy">
            <span className="zen-gen__empty-title">ARCHIVE UNREACHABLE</span>
            <span className="zen-gen__empty-sub">
              The archive did not answer. Check the connection and try again.
            </span>
            <button
              type="button"
              className="zen-gen__studio-btn"
              onClick={() => reload(activeCollection)}
            >
              ⟳ Retry
            </button>
          </div>
        </div>
      )}

      {empty && (
        <div className="zen-gen__empty">
          <HoloSigilField intensity={0.7} className="zen-gen__empty-field" />
          <div className="zen-gen__empty-copy">
            <span className="zen-gen__empty-title">ARCHIVE STANDING BY</span>
            <span className="zen-gen__empty-sub">
              No frames yet. Open the studio to bring the first generations online.
            </span>
          </div>
        </div>
      )}

      {!loading && images.length > 0 && (
        <>
          {mode === "stream" && (
            <div className="zg-stream">
              {images.map((img, i) => (
                <StreamFrame key={img.id} image={img} index={i} onOpen={() => setViewing(i)} />
              ))}
            </div>
          )}

          {mode === "mosaic" && (
            <div className="zg-mosaic">
              {images.map((img, i) => (
                <button
                  key={img.id}
                  type="button"
                  className="zg-tile"
                  onClick={() => setViewing(i)}
                  aria-label={img.title || `Generation ${i + 1}`}
                >
                  <img src={thumbUrl(img)} alt="" loading="lazy" decoding="async" />
                  <span className="zg-tile__glow" aria-hidden />
                </button>
              ))}
            </div>
          )}

          {mode === "slideshow" && <Slideshow images={images} onOpen={setViewing} />}
          {mode === "orbit" && <Orbit images={images} onOpen={setViewing} />}
        </>
      )}

      {(mode === "stream" || mode === "mosaic") && hasMore && (
        <div ref={sentinel} className="zen-gen__sentinel">
          <span className="zen-gen__loading-glyph">⊚</span>
          <span>loading more frames…</span>
        </div>
      )}

      <footer className="zen-gen__foot">
        <span>zen-gen · {String(images.length).padStart(4, "0")} frames loaded</span>
        <button type="button" className="zen-gen__studio-btn" onClick={() => setStudioOpen(true)}>
          ⌘ Studio
        </button>
      </footer>

      {viewing !== null && (
        <Viewer images={images} index={viewing} onClose={() => setViewing(null)} onStep={stepViewer} />
      )}

      {studioOpen && (
        <Suspense fallback={null}>
          <ZenGenStudio
            collections={collections}
            onClose={() => setStudioOpen(false)}
            onUploaded={() => reload(activeCollection)}
          />
        </Suspense>
      )}
    </section>
  );
}
