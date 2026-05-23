import { useState, useEffect, useRef } from "react";

const startTime = Date.now();

export default function LiveMetricsTicker() {
  const [fps,    setFps]    = useState(60);
  const [uptime, setUptime] = useState(0);
  const frames  = useRef<number[]>([]);
  const rafRef  = useRef<number>(0);

  /* Real FPS meter */
  useEffect(() => {
    let last = performance.now();
    const loop = (now: number) => {
      const delta = now - last;
      last = now;
      if (delta > 0) {
        frames.current.push(1000 / delta);
        if (frames.current.length > 24) frames.current.shift();
        setFps(Math.round(
          frames.current.reduce((a, b) => a + b, 0) / frames.current.length
        ));
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

  const mm = String(Math.floor(uptime / 60)).padStart(2, "0");
  const ss = String(uptime % 60).padStart(2, "0");

  const stats: [string, string, boolean][] = [
    ["FPS",               `${fps}`,                    fps < 50],
    ["PARTICLES",         "11,000",                    false],
    ["CANVAS CTX",        "3 ACTIVE",                  false],
    ["FLOAT32 BUFFERS",   "4 × 11K",                   false],
    ["SIN/COS PER FRAME", "4",                         false],
    ["BUNDLE",            "< 200 KB GZIP",             false],
    ["EXTERNAL REQUESTS", "0",                         false],
    ["IFRAMES AT LOAD",   "0",                         false],
    ["UPTIME",            `${mm}:${ss}`,               false],
    ["STACK",             "REACT 18 · VITE 5 · TS",   false],
    ["DEPLOY",            "VERCEL · MAIN",             false],
    ["STATUS",            "NOMINAL",                   false],
  ];

  return (
    <div className="metrics-ticker" aria-hidden="true">
      <div className="metrics-ticker__track">
        {[...stats, ...stats].map(([k, v, warn], i) => (
          <span key={i} className="metrics-ticker__item">
            <span className="metrics-ticker__key">{k}</span>
            <span className={`metrics-ticker__val${warn ? " metrics-ticker__val--warn" : ""}`}>
              {v}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
