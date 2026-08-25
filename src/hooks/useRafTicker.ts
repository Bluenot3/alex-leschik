import { useEffect, useRef } from "react";

/**
 * One requestAnimationFrame loop for the whole page.
 *
 * Every animated surface (cryptic fields, dividers, cursor trail, metrics)
 * subscribes to this single clock instead of spawning its own rAF or
 * setInterval. The loop parks itself when nobody is subscribed and when the
 * tab is hidden, so background tabs cost nothing.
 */

export type TickFn = (now: number, deltaMs: number) => void;

const subscribers = new Set<TickFn>();
let rafId = 0;
let lastNow = 0;

function frame(now: number) {
  const delta = lastNow === 0 ? 16.7 : now - lastNow;
  lastNow = now;

  // Iterate over a snapshot so a subscriber unsubscribing mid-tick is safe.
  for (const fn of Array.from(subscribers)) {
    try {
      fn(now, delta);
    } catch {
      /* a single misbehaving surface must not kill the page clock */
    }
  }

  rafId = subscribers.size > 0 ? requestAnimationFrame(frame) : 0;
}

function start() {
  if (rafId !== 0 || subscribers.size === 0) return;
  lastNow = 0;
  rafId = requestAnimationFrame(frame);
}

function stop() {
  if (rafId !== 0) cancelAnimationFrame(rafId);
  rafId = 0;
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else start();
  });
}

export function subscribeTick(fn: TickFn): () => void {
  subscribers.add(fn);
  start();
  return () => {
    subscribers.delete(fn);
    if (subscribers.size === 0) stop();
  };
}

/**
 * Subscribe a callback to the shared clock.
 *
 * @param fn       callback, always reads from the latest render via a ref
 * @param active   when false the subscription is dropped entirely
 * @param minIntervalMs optional throttle — the callback fires at most this often
 */
export function useRafTicker(fn: TickFn, active = true, minIntervalMs = 0) {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    if (!active) return;
    let last = 0;
    return subscribeTick((now, delta) => {
      if (minIntervalMs > 0) {
        if (now - last < minIntervalMs) return;
        last = now;
      }
      fnRef.current(now, delta);
    });
  }, [active, minIntervalMs]);
}

export function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
}
