import { useState, useEffect, useRef } from "react";

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

type Spark = {
  x: number; y: number;
  vx: number; vy: number;
  life: number; decay: number;
  size: number; hue: number; bright: number;
};

export default function BootSequence() {
  const [visible,  setVisible]  = useState<Set<number>>(() => new Set());
  const [exiting,  setExiting]  = useState(false);
  const [gone,     setGone]     = useState(() => {
    try { return sessionStorage.getItem(SESSION_KEY) === "1"; } catch { return true; }
  });

  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const panelRef   = useRef<HTMLDivElement>(null);
  const lineRefs   = useRef<(HTMLDivElement | null)[]>([]);
  const sparksRef  = useRef<Spark[]>([]);
  const rafRef     = useRef<number>(0);
  const spawnRef   = useRef<(i: number) => void>(() => {});
  const prevVisRef = useRef<Set<number>>(new Set());

  /* ── Canvas particle engine ── */
  useEffect(() => {
    if (gone) return;
    const canvas = canvasRef.current;
    const panel  = panelRef.current;
    if (!canvas || !panel) return;

    const resize = () => {
      const r = panel.getBoundingClientRect();
      canvas.width  = Math.round(r.width);
      canvas.height = Math.round(r.height);
    };
    resize();
    window.addEventListener("resize", resize);

    const tick = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const sparks = sparksRef.current;

      /* Fade-trail — panel bg is #080b10 */
      ctx.fillStyle = "rgba(8,11,16,0.26)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.065; // gravity
        s.vx *= 0.97;  // drag
        s.life -= s.decay;
        if (s.life <= 0) { sparks.splice(i, 1); continue; }

        const a = Math.max(0, s.life);
        /* Glow halo */
        const gr = s.size * 4.2;
        const grd = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, gr);
        grd.addColorStop(0,   `hsla(${s.hue},100%,${s.bright}%,${a * 0.88})`);
        grd.addColorStop(0.38,`hsla(${s.hue}, 90%,${Math.round(s.bright * 0.7)}%,${a * 0.38})`);
        grd.addColorStop(1,   `hsla(${s.hue}, 80%,${Math.round(s.bright * 0.5)}%,0)`);
        ctx.beginPath();
        ctx.arc(s.x, s.y, gr, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();

        /* Bright core */
        ctx.beginPath();
        ctx.arc(s.x, s.y, Math.max(0.35, s.size * 0.52), 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${s.hue},100%,96%,${a * 0.94})`;
        ctx.fill();
      }

      if (sparks.length > 0) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    const spawnSparks = (lineIndex: number) => {
      const lineEl = lineRefs.current[lineIndex];
      if (!lineEl) return;
      const cr = canvas.getBoundingClientRect();
      const lr = lineEl.getBoundingClientRect();
      const isHi = LINES[lineIndex].hi;
      const count = isHi ? 290 : 175;
      const sparks = sparksRef.current;

      for (let i = 0; i < count; i++) {
        const t = Math.random();
        /* Distribute across ~82% of the text row */
        const x = lr.left - cr.left + t * lr.width * 0.82;
        const y = lr.top  - cr.top  + lr.height * (0.1 + Math.random() * 0.8);
        /* Mostly upward burst with some horizontal scatter */
        const ang = -Math.PI * (0.05 + Math.random() * 1.9);
        const spd = 0.35 + Math.random() * 3.1;
        /* Cyan/teal for regular lines, warm gold for the NOMINAL finale */
        const hue = isHi ? 42 + Math.random() * 28 : 174 + Math.random() * 38;
        sparks.push({
          x, y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          life:  0.65 + Math.random() * 0.35,
          decay: 0.008 + Math.random() * 0.024,
          size:  0.6 + Math.random() * 1.55,
          hue,
          bright: 56 + Math.random() * 44,
        });
      }

      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };

    spawnRef.current = spawnSparks;

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(rafRef.current);
    };
  // runs once on mount (when gone is false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gone]);

  /* ── Detect newly visible lines → spawn sparks ── */
  useEffect(() => {
    const prev = prevVisRef.current;
    visible.forEach(i => {
      if (!prev.has(i)) {
        /* Small delay lets the browser paint the line before we read its rect */
        setTimeout(() => spawnRef.current(i), 18);
      }
    });
    prevVisRef.current = new Set(visible);
  }, [visible]);

  /* ── Boot sequence timers ── */
  useEffect(() => {
    if (gone) return;
    try { sessionStorage.setItem(SESSION_KEY, "1"); } catch {}

    const ids: ReturnType<typeof setTimeout>[] = [];
    LINES.forEach((l, i) =>
      ids.push(setTimeout(() => setVisible(p => new Set([...p, i])), l.delay))
    );
    ids.push(setTimeout(() => setExiting(true), 1820));
    ids.push(setTimeout(() => setGone(true),    2500));
    return () => {
      ids.forEach(clearTimeout);
      cancelAnimationFrame(rafRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (gone) return null;

  const pct = Math.round((visible.size / LINES.length) * 100);

  return (
    <div className={`boot-seq${exiting ? " boot-seq--exit" : ""}`} aria-hidden="true">
      <div className="boot-seq__panel" ref={panelRef}>

        {/* Canvas — particle sparks layer */}
        <canvas ref={canvasRef} className="boot-seq__canvas" />

        {/* Scanning line sweep */}
        <div className="boot-seq__scanline" />

        {/* macOS-style title bar */}
        <div className="boot-seq__titlebar">
          <span className="boot-seq__tl boot-seq__tl--r" />
          <span className="boot-seq__tl boot-seq__tl--y" />
          <span className="boot-seq__tl boot-seq__tl--g" />
          <span className="boot-seq__name">alex-leschik — system init</span>
          <span className="boot-seq__status">
            {pct < 100 ? `${pct}%` : "✓ READY"}
          </span>
        </div>

        {/* Terminal body */}
        <div className="boot-seq__body">
          {LINES.map((l, i) => (
            <div
              key={i}
              ref={(el) => { lineRefs.current[i] = el; }}
              className={`boot-seq__row${visible.has(i) ? " boot-seq__row--on" : ""}${l.hi ? " boot-seq__row--hi" : ""}`}
            >
              {!l.hi && <span className="boot-seq__prompt">$ </span>}
              <span className="boot-seq__text">{l.text}</span>
            </div>
          ))}
          <span className="boot-seq__cursor">█</span>
        </div>

        {/* Progress bar */}
        <div className="boot-seq__progress">
          <div
            className="boot-seq__progress-fill"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
