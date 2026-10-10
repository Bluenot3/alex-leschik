import { Suspense, startTransition, useCallback, useEffect, useState, type MutableRefObject, type ReactNode } from "react";
import SafeVisual from "@/components/SafeVisual";
import { useInView } from "@/hooks/useInView";

interface ArtifactProps {
  children: ReactNode;
  /** Reserved height so nothing shifts while the chunk streams in. */
  minHeight: number | string;
  /** How far ahead of the viewport the chunk should start loading. */
  lead?: "near" | "far" | "eager";
  /**
   * Also mount during idle time after load, wherever the reader is, so the
   * page reaches its true height before they scroll there. For content
   * sections; heavy 3D scenes stay viewport-gated.
   */
  idle?: boolean;
  /** Fetch the section's code a few screens ahead of mounting it. */
  prefetch?: () => Promise<unknown>;
  /** Human label shown if the artifact fails to render. */
  label?: string;
  className?: string;
  /** Skip the error boundary for plain (non-3D) content. */
  guard?: boolean;
}

const LEAD_MARGIN: Record<NonNullable<ArtifactProps["lead"]>, string> = {
  near: "600px 0px",
  far: "1400px 0px",
  eager: "2400px 0px",
};

/* ── Idle mounting ───────────────────────────────────────────────
   A reserved height is only a guess: on a phone some sections render
   several times taller (the project grid alone is ~9,000px). Mounting them
   as the reader approaches made the page keep growing under their thumb,
   and jump on browsers without scroll anchoring (Safari). Instead, after
   load, opted-in sections mount one at a time, top to bottom, in idle time,
   as interruptible transitions, so the page settles before anyone gets
   there. */
const idleQueue: Array<() => void> = [];
let pumpStarted = false;

const whenIdle = (fn: () => void, timeout: number) => {
  if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(fn, { timeout });
  else window.setTimeout(fn, 180);
};

function pump() {
  const next = idleQueue.shift();
  if (!next) {
    pumpStarted = false;
    return;
  }
  startTransition(next);
  // Space the sections out so each render lands in its own idle window.
  window.setTimeout(() => whenIdle(pump, 1500), 260);
}

function enqueueIdleMount(mount: () => void) {
  idleQueue.push(mount);
  if (pumpStarted) return;
  pumpStarted = true;
  // Let the hero finish its entrance before anything else renders.
  const start = () => window.setTimeout(() => whenIdle(pump, 2000), 1200);
  if (document.readyState === "complete") start();
  else window.addEventListener("load", start, { once: true });
}

/**
 * One wrapper for every heavy section: viewport-gated mount, suspense
 * boundary, error boundary and a reserved-height skeleton — so each artifact
 * occupies its final space from first paint and fades up once ready.
 */
export default function Artifact({
  children,
  minHeight,
  lead = "far",
  idle = false,
  prefetch,
  label,
  className = "",
  guard = true,
}: ArtifactProps) {
  const { ref, inView } = useInView<HTMLDivElement>({
    rootMargin: LEAD_MARGIN[lead],
    once: true,
  });
  const { ref: aheadRef, inView: ahead } = useInView<HTMLDivElement>({
    rootMargin: "2600px 0px",
    once: true,
  });
  const [idleReady, setIdleReady] = useState(false);
  const ready = inView || idleReady;
  const hostRef = useCallback(
    (el: HTMLDivElement | null) => {
      (ref as MutableRefObject<HTMLDivElement | null>).current = el;
      (aheadRef as MutableRefObject<HTMLDivElement | null>).current = el;
    },
    [ref, aheadRef],
  );

  useEffect(() => {
    if (!idle || ready) return;
    let live = true;
    enqueueIdleMount(() => {
      if (live) setIdleReady(true);
    });
    return () => {
      live = false;
    };
  }, [idle, ready]);

  useEffect(() => {
    if (ahead && prefetch) prefetch().catch(() => {});
  }, [ahead, prefetch]);

  const reserved = typeof minHeight === "number" ? `${minHeight}px` : minHeight;

  const body = (
    <Suspense fallback={<div className="artifact__skeleton" style={{ minHeight: reserved }} />}>
      {children}
    </Suspense>
  );

  return (
    <div
      ref={hostRef}
      className={`artifact ${ready ? "artifact--ready" : ""} ${className}`}
      style={{ minHeight: reserved }}
    >
      {ready ? (
        guard ? <SafeVisual label={label}>{body}</SafeVisual> : body
      ) : (
        <div className="artifact__skeleton" style={{ minHeight: reserved }} />
      )}
    </div>
  );
}
