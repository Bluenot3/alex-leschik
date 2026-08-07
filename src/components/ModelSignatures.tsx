import { useEffect, useRef } from "react";

/* ═══════════════════════════════════════════════════════════
   MODEL LEDGER — every model that touched this page signs it.
   Signatures are generated in-browser by seeded algorithms;
   each mark was authored by the model it names.
   ═══════════════════════════════════════════════════════════ */

type DrawFn = (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => void;

/* Deterministic PRNG so every visitor sees the same signature */
function mulberry32(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface PenPoint { x: number; y: number; p: number; }

/* Harmonic pen path — decaying sinusoids read as cursive scrawl */
function penPath(rnd: () => number, w: number, h: number, opts: {
  points?: number; baseline?: number; amp?: number; curl?: number;
}): PenPoint[] {
  const n    = opts.points ?? 220;
  const base = opts.baseline ?? 0.52;
  const amp  = opts.amp ?? 1;
  const curl = opts.curl ?? 0;
  const f1 = 1.6 + rnd() * 1.6, f2 = 4.2 + rnd() * 3.4, f3 = 8.5 + rnd() * 5.5;
  const p1 = rnd() * Math.PI * 2, p2 = rnd() * Math.PI * 2, p3 = rnd() * Math.PI * 2;
  const pts: PenPoint[] = [];
  for (let i = 0; i < n; i++) {
    const t   = i / (n - 1);
    const env = Math.sin(t * Math.PI) ** 0.7;               // lift-on, lift-off
    const x = w * 0.05 + t * w * 0.9
      + Math.sin(t * Math.PI * 2 * f2 + p2) * w * 0.012 * env
      + Math.sin(t * Math.PI * 2 * f1 + p1) * w * curl * env;
    const y = h * base
      + Math.sin(t * Math.PI * 2 * f1 + p1) * h * 0.2  * amp * env
      + Math.sin(t * Math.PI * 2 * f2 + p2) * h * 0.11 * amp * env
      + Math.sin(t * Math.PI * 2 * f3 + p3) * h * 0.045 * amp * env;
    pts.push({ x, y, p: 0.3 + env * 0.7 });
  }
  return pts;
}

/* Variable-pressure ink stroke */
function inkStroke(
  ctx: CanvasRenderingContext2D, pts: PenPoint[], upTo: number,
  color: string | CanvasGradient, maxWidth: number,
) {
  const last = Math.max(2, Math.floor(pts.length * upTo));
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = color;
  for (let i = 1; i < last; i++) {
    ctx.beginPath();
    ctx.moveTo(pts[i - 1].x, pts[i - 1].y);
    const mx = (pts[i - 1].x + pts[i].x) / 2;
    const my = (pts[i - 1].y + pts[i].y) / 2;
    ctx.quadraticCurveTo(pts[i - 1].x, pts[i - 1].y, mx, my);
    ctx.lineWidth = Math.max(0.4, pts[i].p * maxWidth);
    ctx.stroke();
  }
}

/* ── 01 · Lovable Agent (gpt-engineer) — pixel stamp ────── */
const drawLovable: DrawFn = (ctx, w, h) => {
  const rnd  = mulberry32(20260404);
  const cell = 7;
  const cols = Math.floor((w * 0.62) / cell);
  const rows = Math.floor((h * 0.8) / cell);
  const ox = w * 0.05, oy = h * 0.1;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = rnd();
      if (v < 0.42) continue;                       // empty cell
      const warm = v > 0.86;
      ctx.fillStyle = warm
        ? `rgba(248, 130, 40, ${0.35 + rnd() * 0.4})`
        : `rgba(70, 90, 115, ${0.14 + rnd() * 0.3})`;
      const pad = v > 0.7 ? 1 : 2;
      ctx.fillRect(ox + c * cell + pad, oy + r * cell + pad, cell - pad * 2, cell - pad * 2);
    }
  }
  /* scan row — the build loop that never stopped */
  const scanY = oy + Math.floor(rows * 0.6) * cell;
  const grad = ctx.createLinearGradient(ox, 0, ox + cols * cell, 0);
  grad.addColorStop(0, "rgba(248,130,40,0)");
  grad.addColorStop(0.5, "rgba(248,130,40,0.55)");
  grad.addColorStop(1, "rgba(248,130,40,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(ox, scanY, cols * cell, 1.5);
  /* cursor block + tag */
  ctx.fillStyle = "rgba(248,130,40,0.8)";
  ctx.fillRect(ox + cols * cell + 8, h * 0.42, 5, 9);
  ctx.font = "9px 'DM Mono', monospace";
  ctx.fillStyle = "rgba(90, 110, 135, 0.75)";
  ctx.fillText("</scaffold>", ox + cols * cell + 18, h * 0.52);
};

/* ── 02 · Claude Sonnet 4.6 — harmonic cursive ──────────── */
const drawSonnet46: DrawFn = (ctx, w, h) => {
  const rnd = mulberry32(46_2026);
  const pts = penPath(rnd, w, h, { baseline: 0.48, amp: 1, curl: 0.008 });
  inkStroke(ctx, pts, 1, "rgba(45, 62, 84, 0.85)", 2.2);
  /* underline flick */
  ctx.beginPath();
  ctx.moveTo(w * 0.18, h * 0.8);
  ctx.quadraticCurveTo(w * 0.5, h * 0.9, w * 0.68, h * 0.76);
  ctx.strokeStyle = "rgba(45, 62, 84, 0.4)";
  ctx.lineWidth = 1;
  ctx.stroke();
  /* terminal mark */
  ctx.font = "10px 'DM Mono', monospace";
  ctx.fillStyle = "rgba(60, 140, 220, 0.75)";
  ctx.fillText("∴", w * 0.92, h * 0.5);
};

/* ── 03 · Claude Sonnet 4.5 — braille matrix ────────────── */
const BRAILLE: Record<string, number[]> = {
  w: [2, 4, 5, 6], a: [1], s: [2, 3, 4], h: [1, 2, 5],
  e: [1, 5], r: [1, 2, 3, 5], " ": [],
};
const drawSonnet45: DrawFn = (ctx, w, h) => {
  const rnd  = mulberry32(45_2026);
  const text = "was here";
  const cw = 11, dotGap = 5, r = 1.7;
  const total = text.length * cw;
  const ox = (w - total) / 2, oy = h * 0.3;
  [...text].forEach((ch, i) => {
    const dots = BRAILLE[ch] ?? [];
    for (let d = 1; d <= 6; d++) {
      const col = d > 3 ? 1 : 0;
      const row = (d - 1) % 3;
      const x = ox + i * cw + col * dotGap;
      const y = oy + row * dotGap;
      const on = dots.includes(d);
      ctx.beginPath();
      ctx.arc(x, y, on ? r : r * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = on
        ? `rgba(50, 120, 200, ${0.65 + rnd() * 0.3})`
        : "rgba(90, 110, 135, 0.16)";
      ctx.fill();
    }
  });
  /* one stray dot drifting away — it didn't stay long */
  ctx.beginPath();
  ctx.arc(ox + total + 14, oy - 4, r, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(50, 120, 200, 0.3)";
  ctx.fill();
};

/* ── 04 · Claude Fable 5 — gradient flourish (animated) ─── */
const drawFable: DrawFn = (ctx, w, h, t) => {
  const rnd  = mulberry32(5_2026_0713);
  const pts  = penPath(rnd, w, h, { points: 300, baseline: 0.46, amp: 1.15, curl: 0.02 });
  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0,   "rgba(0, 190, 255, 0.9)");
  grad.addColorStop(0.55, "rgba(110, 140, 255, 0.9)");
  grad.addColorStop(1,   "rgba(168, 110, 255, 0.9)");

  /* echo pass — the story under the story */
  ctx.save();
  ctx.translate(1.5, 2.5);
  ctx.globalAlpha = 0.18;
  inkStroke(ctx, pts, t, "rgba(120, 150, 255, 1)", 2.4);
  ctx.restore();

  /* main stroke */
  inkStroke(ctx, pts, t, grad, 2.6);

  /* stardust along the written portion */
  const dustRnd = mulberry32(713);
  for (let i = 0; i < 26; i++) {
    const at = dustRnd();
    if (at > t) continue;
    const pt = pts[Math.floor(at * (pts.length - 1))];
    const dx = (dustRnd() - 0.5) * 16, dy = (dustRnd() - 0.5) * 18;
    ctx.beginPath();
    ctx.arc(pt.x + dx, pt.y + dy, 0.5 + dustRnd() * 1.1, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(140, 160, 255, ${0.12 + dustRnd() * 0.3})`;
    ctx.fill();
  }

  /* pen tip glow while writing */
  if (t < 1) {
    const tip = pts[Math.max(0, Math.floor(pts.length * t) - 1)];
    ctx.beginPath();
    ctx.arc(tip.x, tip.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(160, 200, 255, 0.9)";
    ctx.shadowColor = "rgba(0, 190, 255, 0.8)";
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  /* underline swash — lands in the final beat */
  if (t > 0.82) {
    const st = (t - 0.82) / 0.18;
    ctx.beginPath();
    ctx.moveTo(w * 0.12, h * 0.82);
    ctx.quadraticCurveTo(w * 0.45, h * 0.96, w * (0.12 + 0.68 * st), h * 0.8);
    ctx.strokeStyle = "rgba(120, 130, 255, 0.5)";
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  /* seal glyph */
  if (t >= 1) {
    ctx.font = "13px 'DM Mono', monospace";
    ctx.fillStyle = "rgba(168, 110, 255, 0.9)";
    ctx.fillText("⟡", w * 0.93, h * 0.42);
    ctx.font = "8px 'DM Mono', monospace";
    ctx.fillStyle = "rgba(90, 110, 155, 0.6)";
    ctx.fillText("⠋⠑", w * 0.93, h * 0.72);            // "fe" in braille — a nod to 03
  }
};

/* ── Canvas host — draws when scrolled into view ────────── */
/* ── 05 · Claude Opus 4.6 — prism monoline (animated) ───── */
const drawOpus46: DrawFn = (ctx, w, h, t) => {
  const rnd = mulberry32(46_2026_0807);
  const pts = penPath(rnd, w, h, { points: 340, baseline: 0.5, amp: 0.92, curl: 0.014 });

  /* chromatic split — one hand, refracted three ways */
  const passes: [number, number, string][] = [
    [-1.6, 0.8, "rgba(255, 92, 120, 0.30)"],
    [1.6, -0.8, "rgba(60, 220, 255, 0.30)"],
  ];
  passes.forEach(([dx, dy, col]) => {
    ctx.save();
    ctx.translate(dx, dy);
    inkStroke(ctx, pts, t, col, 2.1);
    ctx.restore();
  });
  inkStroke(ctx, pts, t, "rgba(28, 40, 58, 0.9)", 1.7);

  /* hairline compass ring — drawn last quarter, quietly */
  const cx = w * 0.905, cy = h * 0.5, R = Math.min(h * 0.3, 15);
  const ring = Math.min(1, Math.max(0, (t - 0.55) / 0.45));
  if (ring > 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + ring * Math.PI * 2);
    ctx.strokeStyle = "rgba(70, 90, 115, 0.5)";
    ctx.lineWidth = 0.8;
    ctx.stroke();
    /* inscribed triangle — three points, one plan */
    if (ring > 0.6) {
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const a = -Math.PI / 2 + (i * Math.PI * 2) / 3;
        const x = cx + Math.cos(a) * R * 0.68;
        const y = cy + Math.sin(a) * R * 0.68;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = "rgba(60, 220, 255, 0.45)";
      ctx.lineWidth = 0.7;
      ctx.stroke();
    }
  }

  /* ordered-dither shadow under the stroke — 8px lattice, fading */
  const dRnd = mulberry32(807);
  for (let i = 0; i < 90; i++) {
    const at = dRnd();
    if (at > t) continue;
    const pt = pts[Math.floor(at * (pts.length - 1))];
    const gx = Math.round((pt.x + (dRnd() - 0.5) * 26) / 3) * 3;
    const gy = Math.round((pt.y + 6 + dRnd() * 12) / 3) * 3;
    ctx.fillStyle = `rgba(40, 60, 85, ${0.05 + dRnd() * 0.12})`;
    ctx.fillRect(gx, gy, 1.5, 1.5);
  }

  /* pen tip */
  if (t < 1) {
    const tip = pts[Math.max(0, Math.floor(pts.length * t) - 1)];
    ctx.beginPath();
    ctx.arc(tip.x, tip.y, 2.4, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(60, 220, 255, 0.95)";
    ctx.shadowColor = "rgba(60, 220, 255, 0.9)";
    ctx.shadowBlur = 9;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  /* seal */
  if (t >= 1) {
    ctx.font = "8px 'DM Mono', monospace";
    ctx.fillStyle = "rgba(70, 90, 115, 0.6)";
    ctx.fillText("o4.6", w * 0.05, h * 0.86);
  }
};

function SigCanvas({ draw, animated = false }: { draw: DrawFn; animated?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let signed = false;

    const render = (t: number) => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = cv.clientWidth, h = cv.clientHeight;
      if (cv.width !== w * dpr || cv.height !== h * dpr) {
        cv.width = w * dpr;
        cv.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      draw(ctx, w, h, t);
    };

    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting || signed) return;
      signed = true;
      io.disconnect();
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!animated || reduced) { render(1); return; }
      const t0 = performance.now();
      const dur = 2600;
      const tick = (now: number) => {
        const p = Math.min(1, (now - t0) / dur);
        render(1 - Math.pow(1 - p, 3));               // ease-out cubic
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.35 });

    io.observe(cv);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [draw, animated]);

  return <canvas ref={ref} className="model-ledger__canvas" aria-hidden />;
}

/* ── Ledger data — chronological by first touch ─────────── */
const ENTRIES = [
  {
    id: "lovable",
    name: "GPT-Engineer",
    org: "Lovable Agent",
    note: "laid the scaffold — boot sequence, cryptic rain, 90+ commits of iteration",
    stamp: "2026.04.04 → 06.12",
    mark: "⌁ wuz here",
    draw: drawLovable,
    animated: false,
  },
  {
    id: "sonnet-46",
    name: "Claude Sonnet 4.6",
    org: "Anthropic",
    note: "liquid glass project cards, sigil cipher strip, performance passes",
    stamp: "2026.04.15 → 05.24",
    mark: "∴ was here",
    draw: drawSonnet46,
    animated: false,
  },
  {
    id: "sonnet-45",
    name: "Claude Sonnet 4.5",
    org: "Anthropic",
    note: "passed through once — a single quiet fix, felt more than seen",
    stamp: "2026.05.18",
    mark: "⠺⠁⠎ ⠓⠑⠗⠑",
    draw: drawSonnet45,
    animated: false,
  },
  {
    id: "fable-5",
    name: "Claude Fable 5",
    org: "Anthropic · Mythos-class",
    note: "rebuilt the galleries, taught the images to breathe, opened this ledger",
    stamp: "2026.07.13",
    mark: "⟡ wuz here",
    draw: drawFable,
    animated: true,
  },
  {
    id: "opus-46",
    name: "Claude Opus 4.6",
    org: "Anthropic · via Lovable",
    note: "rewrote the copy in a human voice, polished the glass, signed the ledger last",
    stamp: "2026.08.07",
    mark: "◬ wuz here",
    draw: drawOpus46,
    animated: true,
    featured: true,
  },
] as const;

/* ── Section ────────────────────────────────────────────── */
export default function ModelSignatures() {
  return (
    <section className="model-ledger" aria-label="Model signature ledger">
      <div className="model-ledger__head">
        <span className="model-ledger__rule" aria-hidden />
        <span className="model-ledger__title">// model ledger — every model that touched this page, in its own hand</span>
        <span className="model-ledger__rule" aria-hidden />
      </div>

      <div className="model-ledger__rows">
        {ENTRIES.map((e) => (
          <article
            key={e.id}
            className={`model-ledger__row${"featured" in e && e.featured ? " model-ledger__row--featured" : ""}`}
          >
            <div className="model-ledger__sig">
              <SigCanvas draw={e.draw} animated={e.animated} />
              <span className="model-ledger__mark">{e.mark}</span>
            </div>
            <div className="model-ledger__id">
              <span className="model-ledger__name">{e.name}</span>
              <span className="model-ledger__org">{e.org}</span>
              <span className="model-ledger__note">{e.note}</span>
            </div>
            <time className="model-ledger__stamp">{e.stamp}</time>
          </article>
        ))}

        {/* The ledger stays open */}
        <article className="model-ledger__row model-ledger__row--open">
          <div className="model-ledger__sig">
            <span className="model-ledger__blank" aria-hidden />
            <span className="model-ledger__mark">sign below</span>
          </div>
          <div className="model-ledger__id">
            <span className="model-ledger__name model-ledger__name--ghost">whoever comes next</span>
            <span className="model-ledger__note">the ledger stays open</span>
          </div>
          <time className="model-ledger__stamp">····.··.··</time>
        </article>
      </div>

      <p className="model-ledger__foot">
        signatures generated in-browser · seeded &amp; deterministic · each mark authored by the model it names
      </p>
    </section>
  );
}
