import { useState, useEffect, useRef } from "react";

/**
 * Real-feel boot sequence:
 *  • Bayer 8×8 ordered dithering on a flowing field (no fake particles)
 *  • Type-on terminal lines of *actual* code from this project
 *  • Char-by-char reveal with cursor, syntax tinting, no corny emojis
 */

type Tok = { t: string; c?: "kw" | "fn" | "str" | "num" | "com" | "op" | "ty" | "var" };
type Line = {
  prompt?: string;       // shell prompt ($ / >) or null for code
  toks: Tok[];
  cps?: number;          // chars per second (default 220)
  pause?: number;        // ms pause after line completes
};

const k = (t: string): Tok => ({ t, c: "kw" });
const f = (t: string): Tok => ({ t, c: "fn" });
const s = (t: string): Tok => ({ t, c: "str" });
const n = (t: string): Tok => ({ t, c: "num" });
const c = (t: string): Tok => ({ t, c: "com" });
const o = (t: string): Tok => ({ t, c: "op" });
const y = (t: string): Tok => ({ t, c: "ty" });
const v = (t: string): Tok => ({ t, c: "var" });
const p = (t: string): Tok => ({ t });

const SCRIPT: Line[] = [
  { prompt: "$", toks: [p("pnpm "), f("build"), p(" "), o("--"), p("mode production")], cps: 260, pause: 120 },
  { prompt: ">", toks: [p("vite v5.4 "), c("// 0 external requests · 198 kB gzip")], cps: 320, pause: 180 },

  { toks: [k("import"), p(" { "), v("ParticleField"), p(" } "), k("from"), p(" "), s("'@/engine/particles'")], pause: 60 },
  { toks: [k("const"), p(" "), v("field"), p(" = "), k("new"), p(" "), y("ParticleField"), p("({ "), v("count"), p(": "), n("11_000"), p(", "), v("layout"), p(": "), s("'name'"), p(" })")], pause: 120 },

  { prompt: "$", toks: [f("alex"), p(" "), k("init"), p(" "), o("--"), p("scene hero")], pause: 120 },
  { prompt: ">", toks: [p("wave LUT  "), c("// sin/cos precomputed → 4096")], pause: 60 },
  { prompt: ">", toks: [p("contexts  main · trail · wavefield")], pause: 60 },
  { prompt: ">", toks: [p("webgl2    "), o("✓"), p(" three.js fiber attached")], pause: 120 },

  { toks: [k("await"), p(" "), v("hydrate"), p("({ "), v("modules"), p(": "), n("8"), p(", "), v("gate"), p(": "), s("'intersection'"), p(" })")], pause: 80 },
  { toks: [v("router"), p("."), f("mount"), p("("), s("'/'"), p(", "), y("Index"), p(")")], pause: 80 },

  { prompt: "$", toks: [f("alex"), p(" "), k("status")], pause: 100 },
  { prompt: ">", toks: [p("origin    alexander-leschik.com")], pause: 40 },
  { prompt: ">", toks: [p("deploy    main "), o("·"), p(" live")], pause: 40 },
  { prompt: ">", toks: [p("nominal   "), o("█"), o("█"), o("█"), o("█"), o("█"), o("█"), o("█"), o("█")], pause: 200 },
];

// Bayer 8×8 ordered dither matrix (values 0..63)
const BAYER8 = [
   0,32, 8,40, 2,34,10,42,
  48,16,56,24,50,18,58,26,
  12,44, 4,36,14,46, 6,38,
  60,28,52,20,62,30,54,22,
   3,35,11,43, 1,33, 9,41,
  51,19,59,27,49,17,57,25,
  15,47, 7,39,13,45, 5,37,
  63,31,55,23,61,29,53,21,
];

function tokClass(c?: Tok["c"]) {
  switch (c) {
    case "kw":  return "boot-tok boot-tok--kw";
    case "fn":  return "boot-tok boot-tok--fn";
    case "str": return "boot-tok boot-tok--str";
    case "num": return "boot-tok boot-tok--num";
    case "com": return "boot-tok boot-tok--com";
    case "op":  return "boot-tok boot-tok--op";
    case "ty":  return "boot-tok boot-tok--ty";
    case "var": return "boot-tok boot-tok--var";
    default:    return "boot-tok";
  }
}

export default function BootSequence() {
  const [gone, setGone] = useState(false);
  const [exiting, setExiting] = useState(false);
  // Per-line revealed character count
  const [revealed, setRevealed] = useState<number[]>(() => SCRIPT.map(() => 0));
  const [activeIdx, setActiveIdx] = useState(0);
  const [appReady, setAppReady] = useState(false);
  const [minElapsed, setMinElapsed] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const panelRef  = useRef<HTMLDivElement>(null);
  const rafRef    = useRef<number>(0);

  /* ── Track real app readiness ── */
  useEffect(() => {
    let cancelled = false;
    // Minimum on-screen time so the boot doesn't flash
    const minTimer = setTimeout(() => !cancelled && setMinElapsed(true), 900);

    const markReady = () => !cancelled && setAppReady(true);
    if (document.readyState === "complete") {
      // give one frame + idle so first paints land
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if ("requestIdleCallback" in window) {
          (window as any).requestIdleCallback(markReady, { timeout: 600 });
        } else {
          setTimeout(markReady, 120);
        }
      }));
    } else {
      window.addEventListener("load", () => {
        requestAnimationFrame(() => requestAnimationFrame(markReady));
      }, { once: true });
    }
    // Hard ceiling so it never hangs
    const hardCap = setTimeout(markReady, 4500);
    return () => {
      cancelled = true;
      clearTimeout(minTimer);
      clearTimeout(hardCap);
    };
  }, []);

  /* ── Exit when both: app ready AND min display time elapsed ── */
  useEffect(() => {
    if (!appReady || !minElapsed || exiting) return;
    setExiting(true);
    const t = setTimeout(() => setGone(true), 520);
    return () => clearTimeout(t);
  }, [appReady, minElapsed, exiting]);

  /* ── Dither background ── */
  useEffect(() => {
    if (gone) return;
    const canvas = canvasRef.current;
    const panel  = panelRef.current;
    if (!canvas || !panel) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const CELL = 3; // finer grain
    let W = 0, H = 0, cw = 0, ch = 0;

    const resize = () => {
      const r = panel.getBoundingClientRect();
      W = Math.round(r.width);
      H = Math.round(r.height);
      canvas.width = W;
      canvas.height = H;
      cw = Math.ceil(W / CELL);
      ch = Math.ceil(H / CELL);
    };
    resize();
    window.addEventListener("resize", resize);

    let t0 = performance.now();
    const draw = (now: number) => {
      const t = (now - t0) * 0.001;
      ctx.clearRect(0, 0, W, H);
      // Multi-source interference field — two drifting "emitters" + flow band
      // Yields plasma-like ripples that morph continuously.
      const ax = 0.5 + 0.32 * Math.sin(t * 0.31);
      const ay = 0.5 + 0.28 * Math.cos(t * 0.27);
      const bx = 0.5 + 0.36 * Math.cos(t * 0.19 + 1.7);
      const by = 0.5 + 0.30 * Math.sin(t * 0.23 + 0.9);
      const flow = t * 0.55;

      for (let y = 0; y < ch; y++) {
        for (let x = 0; x < cw; x++) {
          const nx = x / cw;
          const ny = y / ch;
          const dx1 = nx - ax, dy1 = ny - ay;
          const dx2 = nx - bx, dy2 = ny - by;
          const r1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
          const r2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
          // interference of two radial waves + diagonal flow band
          const w =
            0.5 +
            0.25 * Math.sin(r1 * 38 - t * 2.4) +
            0.25 * Math.sin(r2 * 32 + t * 1.9) +
            0.18 * Math.sin((nx + ny) * 14 - flow);
          // vignette pull-in
          const cx = nx - 0.5, cy = ny - 0.5;
          const vign = 1 - Math.min(1, (cx * cx + cy * cy) * 1.6);
          const v = Math.max(0, Math.min(1, w * vign));
          const threshold = BAYER8[(y & 7) * 8 + (x & 7)] / 64;
          if (v > threshold) {
            const i = v - threshold;
            // two-tone: bright cyan core, soft teal halo
            if (i > 0.42) {
              ctx.fillStyle = `rgba(120,235,255,0.62)`;
            } else if (i > 0.22) {
              ctx.fillStyle = `rgba(0,212,255,0.38)`;
            } else if (i > 0.08) {
              ctx.fillStyle = `rgba(40,160,200,0.22)`;
            } else {
              ctx.fillStyle = `rgba(30,120,170,0.12)`;
            }
            ctx.fillRect(x * CELL, y * CELL, CELL - 1, CELL - 1);
          }
        }
      }
      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(rafRef.current);
    };
  }, [gone]);

  /* ── Type-on engine ── */
  useEffect(() => {
    if (gone) return;
    let cancelled = false;
    let i = 0;

    const runLine = async () => {
      while (!cancelled && i < SCRIPT.length) {
        const line = SCRIPT[i];
        const total = line.toks.reduce((sum, tk) => sum + tk.t.length, 0);
        const cps = (line.cps ?? 230) * 4.2;
        const stepMs = Math.max(8, 1000 / cps);
        setActiveIdx(i);
        for (let r = 1; r <= total; r++) {
          if (cancelled) return;
          const idx = i;
          const val = r;
          setRevealed(prev => {
            if (prev[idx] === val) return prev;
            const next = prev.slice();
            next[idx] = val;
            return next;
          });
          // Vary slightly for organic feel
          const jitter = 1 + (Math.random() - 0.5) * 0.4;
          await new Promise(res => setTimeout(res, stepMs * jitter));
        }
        await new Promise(res => setTimeout(res, (line.pause ?? 80) * 0.12));
        i++;
      }
      // No forced exit here — exit is driven by app readiness effect above.
    };
    runLine();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (gone) return null;

  // Progress: total chars typed / total chars
  const totalChars = SCRIPT.reduce((s, l) => s + l.toks.reduce((a, t) => a + t.t.length, 0), 0);
  const typedChars = revealed.reduce((s, n) => s + n, 0);
  const pct = Math.min(100, Math.round((typedChars / totalChars) * 100));

  return (
    <div className={`boot-seq${exiting ? " boot-seq--exit" : ""}`} aria-hidden="true">
      <div className="boot-seq__panel" ref={panelRef}>
        <canvas ref={canvasRef} className="boot-seq__canvas" />
        <div className="boot-seq__grain" />
        <div className="boot-seq__scanline" />

        <div className="boot-seq__titlebar">
          <span className="boot-seq__tl boot-seq__tl--r" />
          <span className="boot-seq__tl boot-seq__tl--y" />
          <span className="boot-seq__tl boot-seq__tl--g" />
          <span className="boot-seq__name">~ / alex-leschik — zsh</span>
          <span className="boot-seq__status">
            {pct < 100 ? `BOOT ${String(pct).padStart(3, "0")}%` : "READY"}
          </span>
        </div>

        <div className="boot-seq__body">
          {SCRIPT.map((line, li) => {
            if (revealed[li] === 0 && li > activeIdx) return null;
            let remain = revealed[li];
            const showCursor = li === activeIdx;
            return (
              <div key={li} className="boot-seq__row boot-seq__row--on">
                {line.prompt && (
                  <span className={`boot-seq__prompt ${line.prompt === "$" ? "is-cmd" : "is-out"}`}>
                    {line.prompt}
                  </span>
                )}
                <span className="boot-seq__text">
                  {line.toks.map((tk, ti) => {
                    if (remain <= 0) return null;
                    const take = Math.min(remain, tk.t.length);
                    remain -= take;
                    return (
                      <span key={ti} className={tokClass(tk.c)}>
                        {tk.t.slice(0, take)}
                      </span>
                    );
                  })}
                  {showCursor && <span className="boot-seq__cursor">▍</span>}
                </span>
              </div>
            );
          })}
        </div>

        <div className="boot-seq__loader">
          <div className="boot-seq__loader-row">
            <span className="boot-seq__loader-label">
              {pct < 100 ? "COMPILING" : "READY"}
              <span className="boot-seq__loader-task">
                {pct < 100 ? (SCRIPT[activeIdx]?.toks.map(t => t.t).join("").slice(0, 38) || "…") : "all systems nominal"}
              </span>
            </span>
            <span className="boot-seq__loader-pct">{String(pct).padStart(3, "0")}<span>%</span></span>
          </div>
          <div className="boot-seq__loader-bar">
            {Array.from({ length: 40 }).map((_, i) => {
              const filled = (pct / 100) * 40;
              const isOn = i < Math.floor(filled);
              const isEdge = i === Math.floor(filled);
              return (
                <span
                  key={i}
                  className={`boot-seq__loader-cell${isOn ? " is-on" : ""}${isEdge ? " is-edge" : ""}`}
                />
              );
            })}
          </div>
          <div className="boot-seq__loader-meta">
            <span>{Math.round((pct / 100) * 198)} / 198 kB</span>
            <span>chunks {Math.min(8, Math.ceil((pct / 100) * 8))} / 8</span>
            <span>{pct < 100 ? `eta ${(((100 - pct) * 18) / 1000).toFixed(1)}s` : "eta 0.0s"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
