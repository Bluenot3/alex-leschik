import { useEffect, useRef, useState } from "react";

interface Options {
  /** Grow the observation box so work starts before the element is visible. */
  rootMargin?: string;
  threshold?: number;
  /** Stop observing after the first intersection (one-way reveal). */
  once?: boolean;
}

/**
 * Shared viewport observer used to gate expensive render loops and reveals.
 * Returns a ref to attach and the current in-view flag.
 */
export function useInView<T extends HTMLElement = HTMLDivElement>({
  rootMargin = "200px 0px",
  threshold = 0.01,
  once = false,
}: Options = {}) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) io.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { rootMargin, threshold }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin, threshold, once]);

  return { ref, inView };
}
