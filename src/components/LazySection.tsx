import { useRef, useState, useEffect, type ReactNode } from "react";

/**
 * Lazy-mounts children only when the container is within `rootMargin` of the viewport.
 * Once mounted, stays mounted (no teardown on scroll-away) unless `unmountOnLeave` is true.
 */
export default function LazySection({
  children,
  rootMargin = "600px 0px",
  unmountOnLeave = false,
  className = "",
}: {
  children: ReactNode;
  rootMargin?: string;
  unmountOnLeave?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setMounted(true);
          if (!unmountOnLeave) io.disconnect();
        } else if (unmountOnLeave) {
          setMounted(false);
        }
      },
      { rootMargin, threshold: 0 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin, unmountOnLeave]);

  return (
    <div ref={ref} className={className} style={{ minHeight: mounted ? undefined : "200px" }}>
      {mounted ? children : null}
    </div>
  );
}
