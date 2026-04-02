import { useRef, useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const TARGET_SCENE_FPS = 24;

interface VideoItem {
  url: string;
  title: string;
  description: string;
}

/**
 * ASCII/Mesh rendered amphitheatre with surround video wall.
 * Draws a desert amphitheatre in perspective using canvas,
 * then overlays hoverable video tiles on the "screen" area.
 */
export default function Amphitheatre({ progress }: { progress: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [previewVid, setPreviewVid] = useState<HTMLVideoElement | null>(null);
  const rafRef = useRef<number>(0);
  const progressRef = useRef(progress);
  progressRef.current = progress;

  // Load video items from gallery
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("gallery_items")
        .select("*")
        .order("sort_order", { ascending: true });

      if (data) {
        const items: VideoItem[] = data.map((d) => {
          let url = "";
          if (d.storage_path) {
            const { data: u } = supabase.storage
              .from("portfolio")
              .getPublicUrl(d.storage_path);
            url = u.publicUrl;
          } else if (d.external_url) {
            url = d.external_url;
          }
          return { url, title: d.title, description: d.description };
        });
        setVideos(items);
      }
    };
    load();
  }, []);

  // Create preview video element on hover
  useEffect(() => {
    if (hoveredIdx !== null && videos[hoveredIdx]) {
      const vid = document.createElement("video");
      vid.src = videos[hoveredIdx].url;
      vid.crossOrigin = "anonymous";
      vid.muted = true;
      vid.loop = true;
      vid.playsInline = true;
      vid.autoplay = true;
      vid.play().catch(() => {});
      setPreviewVid(vid);
      return () => {
        vid.pause();
        vid.src = "";
        setPreviewVid(null);
      };
    } else {
      setPreviewVid(null);
    }
  }, [hoveredIdx, videos]);

  const drawScene = useCallback((time: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const nextWidth = Math.floor(w * dpr);
    const nextHeight = Math.floor(h * dpr);

    if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
      canvas.width = nextWidth;
      canvas.height = nextHeight;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const t = time * 0.001;
    const reveal = Math.min(1, progressRef.current * 2);

    // -- Draw amphitheatre structure in ASCII/line art --
    const cx = w / 2;
    const stageY = h * 0.55;
    const stageW = w * 0.7 * reveal;
    const stageH = h * 0.35 * reveal;

    // Desert ground gradient
    const groundGrad = ctx.createLinearGradient(0, h * 0.7, 0, h);
    groundGrad.addColorStop(0, "hsla(35, 30%, 75%, 0.08)");
    groundGrad.addColorStop(1, "hsla(25, 25%, 60%, 0.15)");
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, h * 0.7, w, h * 0.3);

    // Tiered seating rows (ASCII dots/lines)
    ctx.font = `${Math.max(6, w * 0.006)}px "DM Mono", monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const seatRows = 12;
    const seatChars = "○●◦∘·";

    for (let row = 0; row < seatRows; row++) {
      const rowProgress = Math.max(0, reveal - row * 0.04);
      if (rowProgress <= 0) continue;

      const rowY = stageY + stageH * 0.3 + row * (h * 0.025);
      const rowSpread = stageW * 0.5 + row * (w * 0.035);
      const curve = 1 + row * 0.15; // curvature
      const seatCount = 20 + row * 6;

      for (let s = 0; s < seatCount; s++) {
        const seatT = (s / (seatCount - 1)) * 2 - 1; // -1 to 1
        const sx = cx + seatT * rowSpread;
        const sy = rowY + Math.abs(seatT) * curve * 8;

        const charIdx = Math.floor(
          (Math.sin(s * 0.7 + t + row) * 0.5 + 0.5) * (seatChars.length - 1)
        );
        const alpha = rowProgress * (0.15 + (1 - Math.abs(seatT)) * 0.25);

        ctx.fillStyle = `hsla(215, 15%, ${55 + row * 2}%, ${alpha})`;
        ctx.fillText(seatChars[charIdx], sx, sy);
      }
    }

    // Stage floor — wireframe mesh
    const meshRows = 8;
    const meshCols = 16;
    ctx.strokeStyle = `hsla(215, 20%, 70%, ${reveal * 0.2})`;
    ctx.lineWidth = 0.5;

    for (let mr = 0; mr <= meshRows; mr++) {
      ctx.beginPath();
      const my = stageY - stageH * 0.1 + mr * (stageH * 0.4 / meshRows);
      const perspShrink = 1 - (mr / meshRows) * 0.4;
      const mw = stageW * perspShrink;
      ctx.moveTo(cx - mw / 2, my);
      ctx.lineTo(cx + mw / 2, my);
      ctx.stroke();
    }

    for (let mc = 0; mc <= meshCols; mc++) {
      ctx.beginPath();
      const mxT = (mc / meshCols) * 2 - 1;
      const topX = cx + mxT * stageW * 0.3;
      const botX = cx + mxT * stageW * 0.5;
      ctx.moveTo(topX, stageY - stageH * 0.1);
      ctx.lineTo(botX, stageY + stageH * 0.3);
      ctx.stroke();
    }

    // Surround screen structure — curved arch of ASCII blocks
    const screenArc = Math.PI * 0.85;
    const screenRadius = stageW * 0.55;
    const screenCenterY = stageY - stageH * 0.2;
    const screenChars = "█▓▒░▐▌";
    const arcSteps = 60;

    ctx.font = `${Math.max(8, w * 0.008)}px "DM Mono", monospace`;

    for (let step = 0; step < arcSteps; step++) {
      const arcProgress = Math.max(0, reveal - 0.3 - step * 0.005);
      if (arcProgress <= 0) continue;

      const a = -Math.PI / 2 - screenArc / 2 + (step / (arcSteps - 1)) * screenArc;
      const ax = cx + Math.cos(a) * screenRadius;
      const ay = screenCenterY + Math.sin(a) * screenRadius * 0.4;

      // Multiple rows of the screen arch
      for (let sr = 0; sr < 4; sr++) {
        const sry = ay - sr * (h * 0.02);
        const wave = Math.sin(step * 0.3 + t * 2 + sr) * 0.5 + 0.5;
        const charIdx = Math.floor(wave * (screenChars.length - 1));
        const alpha = arcProgress * (0.1 + wave * 0.2);

        ctx.fillStyle = `hsla(210, 25%, ${60 + wave * 20}%, ${alpha})`;
        ctx.fillText(screenChars[charIdx], ax, sry);
      }
    }

    // Side pillars
    const pillarChars = "║│┃┆┇";
    for (let side = -1; side <= 1; side += 2) {
      const px = cx + side * stageW * 0.58;
      for (let py = 0; py < 15; py++) {
        const pillarProgress = Math.max(0, reveal - 0.2 - py * 0.02);
        if (pillarProgress <= 0) continue;
        const pillarY = stageY - stageH * 0.6 + py * (h * 0.025);
        const charIdx = Math.floor(
          (Math.sin(py * 0.5 + t) * 0.5 + 0.5) * (pillarChars.length - 1)
        );
        ctx.fillStyle = `hsla(215, 15%, 55%, ${pillarProgress * 0.3})`;
        ctx.fillText(pillarChars[charIdx], px, pillarY);
      }
    }

    // Star field above
    ctx.font = `${Math.max(4, w * 0.004)}px "DM Mono", monospace`;
    const stars = "✦✧·∗∘";
    for (let i = 0; i < 80; i++) {
      const sx = (Math.sin(i * 127.1 + 0.5) * 0.5 + 0.5) * w;
      const sy = (Math.cos(i * 311.7 + 0.3) * 0.5 + 0.5) * h * 0.4;
      const twinkle = Math.sin(t * (1 + i * 0.1) + i) * 0.5 + 0.5;
      const starAlpha = reveal * twinkle * 0.25;
      if (starAlpha < 0.02) continue;
      const starChar = stars[i % stars.length];
      ctx.fillStyle = `hsla(220, 20%, 80%, ${starAlpha})`;
      ctx.fillText(starChar, sx, sy);
    }

  }, []);

  const isVisible = progress > 0;

  useEffect(() => {
    if (!isVisible) {
      cancelAnimationFrame(rafRef.current);
      return;
    }

    let lastFrame = 0;

    const loop = (now: number) => {
      if (now - lastFrame >= 1000 / TARGET_SCENE_FPS) {
        drawScene(now);
        lastFrame = now;
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [drawScene, isVisible]);

  useEffect(() => {
    if (isVisible) {
      drawScene(performance.now());
    }
  }, [drawScene, isVisible, progress]);

  if (!isVisible) return null;

  // Layout video tiles in a curved grid
  const tileCount = Math.min(videos.length, 12);
  const cols = 4;
  const rows = Math.ceil(tileCount / cols);
  const reveal = Math.min(1, progress * 2);

  return (
    <div
      ref={containerRef}
      className="amphitheatre-wrap"
      style={{ opacity: Math.min(1, progress * 3) }}
    >
      <canvas
        ref={canvasRef}
        className="amphitheatre-canvas"
      />

      {/* Video tile grid overlay */}
      <div className="amphitheatre-tiles">
        <div className="amphitheatre-tiles-label">
          <span>◈</span>
          <span>SURROUND SCREENING ROOM</span>
          <span>◈</span>
        </div>
        <div
          className="amphitheatre-grid"
          style={{
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            opacity: reveal > 0.5 ? (reveal - 0.5) * 2 : 0,
          }}
        >
          {videos.slice(0, tileCount).map((vid, i) => {
            const isHovered = hoveredIdx === i;
            return (
              <div
                key={i}
                className={`amphitheatre-tile ${isHovered ? "amphitheatre-tile-active" : ""}`}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                style={{
                  transform: `translateY(${Math.sin(i * 0.8) * 4}px)`,
                  transitionDelay: `${i * 40}ms`,
                }}
              >
                {isHovered && previewVid ? (
                  <video
                    src={vid.url}
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="amphitheatre-tile-preview"
                  />
                ) : (
                  <div className="amphitheatre-tile-placeholder">
                    <span className="amphitheatre-tile-ascii">
                      {["▶", "◈", "◆", "▣", "◉", "▧"][i % 6]}
                    </span>
                  </div>
                )}
                <div className="amphitheatre-tile-info">
                  <span className="amphitheatre-tile-title">{vid.title || `Piece ${i + 1}`}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
