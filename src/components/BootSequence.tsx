import { useState, useEffect } from "react";

const SESSION_KEY = "boot_v3";

const LINES = [
  { text: "INITIALIZING  alexander-leschik.com  v3.2.0",  delay: 0,    hi: false },
  { text: "PARTICLE ENGINE   Float32Array × 4 × 11,000",  delay: 240,  hi: false },
  { text: "WAVE PHASE LUT    sin/cos precomputed  ✓",      delay: 460,  hi: false },
  { text: "CANVAS CONTEXTS   main · trail · wavefield",   delay: 660,  hi: false },
  { text: "THREE.JS FIBER    WebGL2 context  ✓",          delay: 840,  hi: false },
  { text: "LAZY CHUNKS       8 modules · IO-gated",       delay: 1000, hi: false },
  { text: "BUNDLE SIZE       < 200 KB gzip · 0 ext req",  delay: 1140, hi: false },
  { text: "DEPLOY TARGET     vercel · main · live  ✓",    delay: 1280, hi: false },
  { text: "▸  ALL SYSTEMS NOMINAL",                       delay: 1440, hi: true  },
];

export default function BootSequence() {
  const [visible,  setVisible]  = useState<Set<number>>(() => new Set());
  const [exiting,  setExiting]  = useState(false);
  const [gone,     setGone]     = useState(() => {
    try { return sessionStorage.getItem(SESSION_KEY) === "1"; } catch { return true; }
  });

  useEffect(() => {
    if (gone) return;
    try { sessionStorage.setItem(SESSION_KEY, "1"); } catch {}

    const ids: ReturnType<typeof setTimeout>[] = [];
    LINES.forEach((l, i) =>
      ids.push(setTimeout(() => setVisible(p => new Set([...p, i])), l.delay))
    );
    ids.push(setTimeout(() => setExiting(true), 1820));
    ids.push(setTimeout(() => setGone(true),    2500));
    return () => ids.forEach(clearTimeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (gone) return null;

  return (
    <div className={`boot-seq${exiting ? " boot-seq--exit" : ""}`} aria-hidden="true">
      <div className="boot-seq__panel">
        <div className="boot-seq__titlebar">
          <span className="boot-seq__tl boot-seq__tl--r" />
          <span className="boot-seq__tl boot-seq__tl--y" />
          <span className="boot-seq__tl boot-seq__tl--g" />
          <span className="boot-seq__name">alex-leschik — system init</span>
        </div>
        <div className="boot-seq__body">
          {LINES.map((l, i) => (
            <div
              key={i}
              className={`boot-seq__row${visible.has(i) ? " boot-seq__row--on" : ""}${l.hi ? " boot-seq__row--hi" : ""}`}
            >
              {!l.hi && <span className="boot-seq__prompt">$ </span>}
              <span className="boot-seq__text">{l.text}</span>
            </div>
          ))}
          <span className="boot-seq__cursor">█</span>
        </div>
      </div>
    </div>
  );
}
