/**
 * One requestAnimationFrame loop for every plate on the page.
 *
 * The loop parks itself when nothing is subscribed and while the tab is
 * hidden, so background tabs cost nothing. A page that already runs its own
 * shared clock can hand it over with setClock(), so the plates tick in the
 * same frame callback as everything else instead of a second rAF loop.
 */

export type TickFn = (now: number, deltaMs: number) => void;
export type SubscribeTick = (fn: TickFn) => () => void;

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
    } catch (err) {
      // One misbehaving plate must not stop the clock for the rest.
      console.error("[zen-foil]", err);
    }
  }
  rafId = subscribers.size > 0 ? requestAnimationFrame(frame) : 0;
}

function start() {
  if (rafId !== 0 || subscribers.size === 0) return;
  if (typeof document !== "undefined" && document.hidden) return;
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

const builtIn: SubscribeTick = (fn) => {
  subscribers.add(fn);
  start();
  return () => {
    subscribers.delete(fn);
    if (subscribers.size === 0) stop();
  };
};

let active: SubscribeTick = builtIn;

/** Subscribe to the plates' clock (the built-in loop, or the injected one). */
export function subscribeTick(fn: TickFn): () => void {
  return active(fn);
}

/**
 * Drive every plate from the page's own shared clock. `subscribe(fn)` must
 * call fn(now, deltaMs) once per animation frame and return an unsubscribe
 * function. Call before the first plate mounts (later views keep the clock
 * they started with until they next go off screen and back).
 */
export function setClock(subscribe: SubscribeTick | null) {
  active = subscribe ?? builtIn;
}

/** True when the visitor asked for reduced motion. */
export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}
