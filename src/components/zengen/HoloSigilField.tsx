import { useEffect, useRef } from "react";

/* ═══════════════════════════════════════════════════════════════
   HOLO SIGIL FIELD
   The site's abstract glyph language, scaled up into a single
   projected instrument: counter-rotating sigil rings, a wireframe
   solid tumbling at the core, a radial scan sweep, and a dithered
   plasma bloom underneath. Everything is drawn on one canvas.
   ═══════════════════════════════════════════════════════════════ */

const SIGILS = "◈∷⊕≡∞ΣΩΔ⊗⊘⊙⊚≈◉◇✦⌘⌬⌾⟨⟩∂∇√π∫∑∏αβγδεφψλμξ∴∵≠≜⊞⊟⋄⌁⟁⟠⧉⧗⩤⩥";

/* Bayer 8×8 ordered dither — same grain the boot sequence uses */
const BAYER = [
   0, 32,  8, 40,  2, 34, 10, 42,
  48, 16, 56, 24, 50, 18, 58, 26,
  12, 44,  4, 36, 14, 46,  6, 38,
  60, 28, 52, 20, 62, 30, 54, 22,
   3, 35, 11, 43,  1, 33,  9, 41,
  51, 19, 59, 27, 49, 17, 57, 25,
  15, 47,  7, 39, 13, 45,  5, 37,
  63, 31, 55, 23, 61, 29, 53, 21,
];

/* Icosahedron vertices — the tumbling core solid */
const PHI = (1 + Math.sqrt(5)) / 2;
const RAW_VERTS: [number, number, number][] = [
  [-1, PHI, 0], [1, PHI, 0], [-1, -PHI, 0], [1, -PHI, 0],
  [0, -1, PHI], [0, 1, PHI], [0, -1, -PHI], [0, 1, -PHI],
  [PHI, 0, -1], [PHI, 0, 1], [-PHI, 0, -1], [-PHI, 0, 1],
];
const NORM = Math.hypot(1, PHI);
const VERTS = RAW_VERTS.map(([x, y, z]) => [x / NORM, y / NORM, z / NORM] as const);

/* Edge list: every vertex pair at the icosahedron's edge length */
const EDGES: [number, number][] = (() => {
  const out: [number, number][] = [];
  const target = 2 / NORM;
  for (let i = 0; i < VERTS.length; i++) {
    for (let j = i + 1; j < VERTS.length; j++) {
      const d = Math.hypot(
        VERTS[i][0] - VERTS[j][0],
        VERTS[i][1] - VERTS[j][1],
        VERTS[i][2] - VERTS[j][2],
      );
      if (Math.abs(d - target) < 0.01) out.push([i, j]);
    }
  }
  return out;
})();

interface Slot {
  ring: number;
  angle: number;
  speed: number;
  glyph: number;
  drift: number;
  lock: number;
}

interface RingSpec {
  r: number;      // radius as a fraction of the field radius
  count: number;
  size: number;   // font size as a fraction of the field radius
  speed: number;  // radians per second
  alpha: number;
}

const RINGS: RingSpec[] = [
  { r: 0.42, count: 14, size: 0.075, speed:  0.10, alpha: 0.60 },
  { r: 0.62, count: 24, size: 0.058, speed: -0.07, alpha: 0.44 },
  { r: 0.80, count: 36, size: 0.044, speed:  0.05, alpha: 0.30 },
  { r: 0.95, count: 52, size: 0.032, speed: -0.035, alpha: 0.20 },
];

interface Props {
  /** Multiplies glyph density and bloom strength. */
  intensity?: number;
  className?: string;
}

export default function HoloSigilField({ intensity = 1, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* Seeded so the arrangement is stable across reloads */
    let seed = 0x5eed;
    const rnd = () => {
      seed = (seed * 1664525 + 1013904223) & 0xffffffff;
      return ((seed >>> 8) & 0xffffff) / 0xffffff;
    };

    const slots: Slot[] = [];
    RINGS.forEach((ring, ri) => {
      const count = Math.max(6, Math.round(ring.count * intensity));
      for (let i = 0; i < count; i++) {
        slots.push({
          ring: ri,
          angle: (i / count) * Math.PI * 2,
          speed: ring.speed * (0.85 + rnd() * 0.3),
          glyph: Math.floor(rnd() * SIGILS.length),
          drift: 0.3 + rnd() * 1.4,
          lock: 0,
        });
      }
    });

    let w = 0;
    let h = 0;
    let dpr = 1;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = Math.max(1, Math.round(rect.width));
      h = Math.max(1, Math.round(rect.height));
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    /* Only animate while on screen */
    let visible = false;
    const io = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting;
        if (visible && !raf) raf = requestAnimationFrame(frame);
      },
      { threshold: 0.01 },
    );
    io.observe(canvas);

    let raf = 0;
    let t = 0;
    let last = performance.now();

    /* ── Dithered plasma bloom behind the rings ── */
    const drawCore = (cx: number, cy: number, R: number) => {
      const CELL = 4;
      const span = R * 0.62;
      const steps = Math.ceil((span * 2) / CELL);
      const x0 = cx - span;
      const y0 = cy - span;

      for (let gy = 0; gy < steps; gy++) {
        for (let gx = 0; gx < steps; gx++) {
          const px = x0 + gx * CELL;
          const py = y0 + gy * CELL;
          const nx = (px - cx) / span;
          const ny = (py - cy) / span;
          const rr = Math.hypot(nx, ny);
          if (rr > 1) continue;

          const wave =
            0.5 +
            0.3 * Math.sin(rr * 11 - t * 1.6) +
            0.2 * Math.sin((nx + ny) * 7 + t * 0.9);
          const falloff = Math.pow(1 - rr, 0.85);
          const v = Math.max(0, Math.min(1, wave * falloff));

          const threshold = BAYER[(gy & 7) * 8 + (gx & 7)] / 64;
          if (v <= threshold) continue;

          const i = v - threshold;
          if (i > 0.34) ctx.fillStyle = "rgba(150,240,255,0.50)";
          else if (i > 0.18) ctx.fillStyle = "rgba(0,212,255,0.30)";
          else if (i > 0.07) ctx.fillStyle = "rgba(120,140,255,0.18)";
          else ctx.fillStyle = "rgba(60,120,190,0.10)";
          ctx.fillRect(px, py, CELL - 1, CELL - 1);
        }
      }
    };

    /* ── Tumbling wireframe solid ── */
    const drawSolid = (cx: number, cy: number, R: number) => {
      const rx = t * 0.22;
      const ry = t * 0.31;
      const scale = R * 0.34;
      const cosX = Math.cos(rx), sinX = Math.sin(rx);
      const cosY = Math.cos(ry), sinY = Math.sin(ry);

      const proj = VERTS.map(([x, y, z]) => {
        const y1 = y * cosX - z * sinX;
        const z1 = y * sinX + z * cosX;
        const x2 = x * cosY + z1 * sinY;
        const z2 = -x * sinY + z1 * cosY;
        const persp = 1.9 / (2.6 - z2);
        return { x: cx + x2 * scale * persp, y: cy + y1 * scale * persp, z: z2 };
      });

      ctx.lineWidth = 1;
      for (const [a, b] of EDGES) {
        const pa = proj[a];
        const pb = proj[b];
        const depth = (pa.z + pb.z) * 0.5;
        const alpha = 0.10 + (depth + 1) * 0.22;
        ctx.strokeStyle = `rgba(140,215,255,${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.stroke();
      }

      for (const p of proj) {
        const alpha = 0.25 + (p.z + 1) * 0.3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.5 + (p.z + 1) * 0.7, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(190,245,255,${alpha.toFixed(3)})`;
        ctx.fill();
      }
    };

    /* ── Orbiting glyph rings ── */
    const drawRings = (cx: number, cy: number, R: number) => {
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      for (const ring of RINGS) {
        ctx.beginPath();
        ctx.arc(cx, cy, R * ring.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(110,190,255,${(ring.alpha * 0.13).toFixed(3)})`;
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }

      for (const slot of slots) {
        const spec = RINGS[slot.ring];
        const a = slot.angle + t * slot.speed;
        const radius = R * spec.r;
        const x = cx + Math.cos(a) * radius;
        const y = cy + Math.sin(a) * radius * 0.42; // elliptical — reads as a tilted plane

        if (slot.lock > 0) {
          slot.lock -= 1;
        } else if (Math.random() < 0.0016) {
          slot.lock = 40 + Math.floor(Math.random() * 60);
        } else if (Math.random() < 0.012) {
          slot.glyph = (slot.glyph + 1) % SIGILS.length;
        }

        const breathe = 0.55 + 0.45 * Math.sin(t * slot.drift + slot.angle * 3);
        const size = R * spec.size;
        ctx.font = `${size.toFixed(1)}px "DM Mono", monospace`;

        if (slot.lock > 0) {
          ctx.fillStyle = `rgba(140,240,255,${(0.75 + breathe * 0.25).toFixed(3)})`;
          ctx.shadowColor = "rgba(0,212,255,0.85)";
          ctx.shadowBlur = 12;
        } else {
          ctx.fillStyle = `rgba(150,205,255,${(spec.alpha * (0.35 + breathe * 0.5)).toFixed(3)})`;
          ctx.shadowBlur = 0;
        }
        ctx.fillText(SIGILS[slot.glyph], x, y);
        ctx.shadowBlur = 0;
      }
    };

    /* ── Radial scan sweep ── */
    const drawScan = (cx: number, cy: number, R: number) => {
      const a = t * 0.5;
      const grad = ctx.createLinearGradient(
        cx, cy,
        cx + Math.cos(a) * R, cy + Math.sin(a) * R * 0.42,
      );
      grad.addColorStop(0, "rgba(0,212,255,0)");
      grad.addColorStop(0.55, "rgba(0,212,255,0.30)");
      grad.addColorStop(1, "rgba(168,110,255,0)");
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R * 0.42);
      ctx.stroke();
    };

    const frame = (now: number) => {
      raf = 0;
      if (!visible) return;

      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += reduced ? 0 : dt;

      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const R = Math.min(w, h) * 0.48;

      drawCore(cx, cy, R);
      drawScan(cx, cy, R);
      drawSolid(cx, cy, R);
      drawRings(cx, cy, R);

      if (!reduced) raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);

    return () => {
      io.disconnect();
      ro.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [intensity]);

  return <canvas ref={canvasRef} className={className ?? "holo-sigil-field"} aria-hidden />;
}
