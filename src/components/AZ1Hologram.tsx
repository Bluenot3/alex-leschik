import { useRef, useEffect, useCallback } from "react";

interface AZ1HologramProps {
  progress: number; // 0→1 scroll progress for this section
}

// ASCII art representation of the AZ1 logo - carefully crafted
const AZ1_ASCII = [
  "          ▄▄▄▄▄▄▄▄▄▄▄▄          ",
  "        ▄█▀▀▀▀▀▀▀▀▀▀▀▀█▄        ",
  "       ██    ▄▄▄▄▄▄    ██       ",
  "      ██   ██▀▀▀▀██   ██      ",
  "     ██   ██      ██   ██     ",
  "    ██   ██        ██   ██    ",
  "   ██   ██████████████   ██   ",
  "  ██   ██            ██   ██  ",
  " ██   ██   ▄▄▄▄▄▄    ██   ██ ",
  "██   ██   ▀▀▀██▀▀▀    ██   ██",
  "██   ██      ██  ▄▄   ██   ██",
  "██   ██     ██  ██    ██   ██",
  " ██   ██   ██▄▄██    ██   ██ ",
  "  ██   ██            ██   ██  ",
  "   ██   ██████████████   ██   ",
  "    ██                  ██    ",
  "     ██    ▄▄▄▄▄▄▄▄   ██     ",
  "      ██  ██      ██  ██      ",
  "       ██ ██      ██ ██       ",
  "        ████      ████        ",
  "          ██      ██          ",
  "          ██▄▄▄▄▄▄██          ",
];

// More stylized compact version
const AZ1_LINES = [
  "     ╔═══╗        ╔╗      ",
  "    ╔╝   ╚╗       ║║      ",
  "   ╔╝     ╚╗      ║║      ",
  "  ╔╝  ╔═╗  ╚╗     ║║      ",
  " ╔╝  ╔╝ ╚╗  ╚╗    ║║      ",
  "╔╝  ╔╝   ╚╗  ╚╗   ║║      ",
  "║   ╚═════╝   ║   ║║      ",
  "║  ╔═══════╗  ║   ║║      ",
  "║ ╔╝ Z1    ╚╗ ║   ║║      ",
  "║╔╝         ╚╗║   ║╚═══╗  ",
  "║║           ║║   ║    ╚╗ ",
  "║║           ║║   ║     ╚╗",
  "╚╝           ╚╝   ╚══════╝",
];

export default function AZ1Hologram({ progress }: AZ1HologramProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progressRef = useRef(progress);
  const smoothProgress = useRef(0);
  const frameRef = useRef(0);
  const particlesRef = useRef<{
    x: number; y: number; targetX: number; targetY: number;
    char: string; vx: number; vy: number; delay: number;
    hue: number; alpha: number; size: number;
  }[]>([]);
  const initializedRef = useRef(false);

  progressRef.current = progress;

  const initParticles = useCallback((canvas: HTMLCanvasElement) => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const particles: typeof particlesRef.current = [];
    const charSet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<>{}[]|/\\·•◦○●◉◎★☆▪▫▬▮▰▲△▶▷▸▹►▻";
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    // Build particles from the AZ1 ASCII art
    const lines = AZ1_LINES;
    const lineHeight = 22;
    const charWidth = 14;
    const totalH = lines.length * lineHeight;
    const maxW = Math.max(...lines.map(l => l.length)) * charWidth;
    const startY = cy - totalH / 2;
    const startX = cx - maxW / 2;

    for (let row = 0; row < lines.length; row++) {
      for (let col = 0; col < lines[row].length; col++) {
        const ch = lines[row][col];
        if (ch === " ") continue;
        const tx = startX + col * charWidth;
        const ty = startY + row * lineHeight;

        // Spawn from random positions around the canvas
        const angle = Math.random() * Math.PI * 2;
        const dist = 300 + Math.random() * 400;

        particles.push({
          x: cx + Math.cos(angle) * dist,
          y: cy + Math.sin(angle) * dist,
          targetX: tx,
          targetY: ty,
          char: ch,
          vx: 0,
          vy: 0,
          delay: Math.random() * 0.4,
          hue: 190 + Math.random() * 40, // cyan-blue hologram range
          alpha: 0,
          size: 13 + Math.random() * 4,
        });
      }
    }

    // Add ambient floating particles
    for (let i = 0; i < 80; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 80 + Math.random() * 280;
      particles.push({
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        targetX: cx + Math.cos(angle) * dist * 0.5,
        targetY: cy + Math.sin(angle) * dist * 0.5,
        char: charSet[Math.floor(Math.random() * charSet.length)],
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        delay: Math.random() * 0.6,
        hue: 180 + Math.random() * 60,
        alpha: 0,
        size: 8 + Math.random() * 6,
        });
    }

    particlesRef.current = particles;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d")!;
    let running = true;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2);
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initializedRef.current = false;
      initParticles(canvas);
    };

    resize();
    window.addEventListener("resize", resize);

    const animate = () => {
      if (!running) return;
      frameRef.current++;

      const target = progressRef.current;
      smoothProgress.current += (target - smoothProgress.current) * 0.04;
      const p = Math.max(0, Math.min(1, smoothProgress.current));

      const w = canvas.width / Math.min(window.devicePixelRatio, 2);
      const h = canvas.height / Math.min(window.devicePixelRatio, 2);

      // Clear with slight trail for glow effect
      ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
      ctx.fillRect(0, 0, w, h);

      const time = frameRef.current * 0.016;
      const particles = particlesRef.current;

      for (let i = 0; i < particles.length; i++) {
        const pt = particles[i];
        const localP = Math.max(0, Math.min(1, (p - pt.delay) / (1 - pt.delay)));

        if (localP < 0.001) {
          pt.alpha *= 0.95;
          if (pt.alpha < 0.01) continue;
        }

        // Converge toward target
        const ease = 1 - Math.pow(1 - localP, 3);

        // Ambient particles float; letter particles converge
        const isAmbient = i >= particles.length - 80;

        if (isAmbient) {
          pt.x += Math.sin(time * 0.3 + i * 0.7) * 0.3;
          pt.y += Math.cos(time * 0.25 + i * 1.1) * 0.3;
          pt.alpha = Math.min(0.3, localP * 0.4);
        } else {
          // Interpolate position
          const tx = pt.targetX + Math.sin(time * 0.8 + i * 0.3) * (1 - ease) * 30;
          const ty = pt.targetY + Math.cos(time * 0.6 + i * 0.5) * (1 - ease) * 30;
          pt.x += (tx - pt.x) * 0.06;
          pt.y += (ty - pt.y) * 0.06;

          // Hologram flicker
          const flicker = Math.sin(time * 4 + i * 0.8) * 0.1 + 0.9;
          pt.alpha = Math.min(1, ease * 1.2) * flicker;

          // Scanline effect - slight alpha variation by row
          const scanline = Math.sin(pt.y * 0.15 + time * 2) * 0.15 + 0.85;
          pt.alpha *= scanline;
        }

        // Draw glow
        if (pt.alpha > 0.05) {
          const glowAlpha = pt.alpha * 0.3;
          ctx.shadowColor = `hsla(${pt.hue}, 80%, 65%, ${glowAlpha})`;
          ctx.shadowBlur = 12;
          ctx.fillStyle = `hsla(${pt.hue}, 85%, 70%, ${pt.alpha})`;
          ctx.font = `${pt.size}px "DM Mono", monospace`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(pt.char, pt.x, pt.y);

          // Double render for glow intensity
          ctx.shadowBlur = 0;
          ctx.fillStyle = `hsla(${pt.hue}, 60%, 85%, ${pt.alpha * 0.5})`;
          ctx.fillText(pt.char, pt.x, pt.y);
        }
      }

      // Scanline overlay
      if (p > 0.1) {
        ctx.strokeStyle = `rgba(100, 220, 255, ${p * 0.03})`;
        ctx.lineWidth = 1;
        for (let y = 0; y < h; y += 4) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }
      }

      // Center glow pulse
      if (p > 0.2) {
        const cx = w / 2;
        const cy = h / 2;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 200);
        const pulse = Math.sin(time * 1.5) * 0.02 + 0.04;
        grad.addColorStop(0, `rgba(100, 200, 255, ${pulse * p})`);
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      }

      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);

    return () => {
      running = false;
      window.removeEventListener("resize", resize);
    };
  }, [initParticles]);

  if (progress <= 0) return null;

  return (
    <div
      className="relative w-full flex items-center justify-center"
      style={{
        height: "70vh",
        opacity: Math.min(1, progress * 2.5),
      }}
    >
      {/* Dark backdrop for hologram contrast */}
      <div
        className="absolute inset-0 rounded-2xl overflow-hidden"
        style={{
          background: "radial-gradient(ellipse at center, rgba(5,15,30,0.95) 0%, rgba(0,0,0,0.98) 70%)",
          border: "1px solid rgba(100, 200, 255, 0.08)",
          boxShadow: "0 0 60px rgba(80, 180, 255, 0.05), inset 0 0 80px rgba(0,0,0,0.5)",
        }}
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full rounded-2xl"
      />
      {/* Hologram label */}
      <div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 font-mono text-xs tracking-[0.3em] uppercase"
        style={{
          color: `rgba(100, 200, 255, ${Math.min(0.6, progress * 0.8)})`,
          textShadow: "0 0 10px rgba(100, 200, 255, 0.3)",
        }}
      >
        AZ1 • Holographic Identity
      </div>
    </div>
  );
}
