import { useState, useEffect, useRef } from "react";

const startTime = Date.now();

type TickerStat = { kind: "stat"; key: string; val: string; warn?: boolean };
type TickerLink = { kind: "link"; prefix: string; sep?: string; linkText: string; href: string };
type TickerItem = TickerStat | TickerLink;

export default function LiveMetricsTicker() {
  const [fps,    setFps]    = useState(60);
  const [uptime, setUptime] = useState(0);
  const [loadMs, setLoadMs] = useState<number | null>(null);
  const frames  = useRef<number[]>([]);
  const rafRef  = useRef<number>(0);

  /* Real FPS meter */
  useEffect(() => {
    let last = performance.now();
    let lastCommit = 0;
    const loop = (now: number) => {
      const delta = now - last;
      last = now;
      if (delta > 0) {
        frames.current.push(1000 / delta);
        if (frames.current.length > 24) frames.current.shift();
        // Commit to React state at most twice per second — sampling still
        // happens every frame, but we avoid 60 re-renders/sec.
        if (now - lastCommit > 500) {
          lastCommit = now;
          setFps(Math.round(
            frames.current.reduce((a, b) => a + b, 0) / frames.current.length
          ));
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  /* Session uptime */
  useEffect(() => {
    const id = setInterval(
      () => setUptime(Math.floor((Date.now() - startTime) / 1000)),
      1000
    );
    return () => clearInterval(id);
  }, []);

  /* One-shot: real page load time from Navigation Timing API */
  useEffect(() => {
    const measure = () => {
      const entries = performance.getEntriesByType("navigation");
      if (entries.length > 0) {
        const nav = entries[0] as PerformanceNavigationTiming;
        const ms = Math.round(nav.loadEventEnd - nav.startTime);
        if (ms > 0) setLoadMs(ms);
      }
    };
    if (document.readyState === "complete") {
      measure();
    } else {
      window.addEventListener("load", measure, { once: true });
    }
  }, []);

  const mm = String(Math.floor(uptime / 60)).padStart(2, "0");
  const ss = String(uptime % 60).padStart(2, "0");

  const items: TickerItem[] = [
    { kind: "stat", key: "FPS",    val: `${fps}`,                                   warn: fps < 50 },
    { kind: "link",
      prefix:   "1ST YOUTH AI LITERACY PROGRAM IN UNITED STATES HISTORY",
      sep:      "·",
      linkText: "ZENAI.WORLD",
      href:     "https://zenai.world"                                                               },
    { kind: "stat", key: "LOAD",   val: loadMs != null ? `${loadMs}ms` : "—"                      },
    { kind: "link",
      prefix:   "COMMAND YOUR AGENTIC ARSENAL",
      sep:      "|",
      linkText: "ARSENAL.WORLD",
      href:     "https://arsenal.world"                                                             },
    { kind: "stat", key: "UPTIME", val: `${mm}:${ss}`                                             },
    { kind: "stat", key: "STATUS", val: "NOMINAL"                                                  },
  ];

  return (
    <div className="metrics-ticker">
      <div className="metrics-ticker__track">
        {[...items, ...items].map((item, i) =>
          item.kind === "link" ? (
            <span key={i} className="metrics-ticker__item metrics-ticker__item--link">
              <span className="metrics-ticker__prefix">{item.prefix}</span>
              {item.sep && <span className="metrics-ticker__sep">{item.sep}</span>}
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="metrics-ticker__link"
              >
                {item.linkText}
              </a>
            </span>
          ) : (
            <span key={i} className="metrics-ticker__item">
              <span className="metrics-ticker__key">{item.key}</span>
              <span className={`metrics-ticker__val${item.warn ? " metrics-ticker__val--warn" : ""}`}>
                {item.val}
              </span>
            </span>
          )
        )}
      </div>
    </div>
  );
}
