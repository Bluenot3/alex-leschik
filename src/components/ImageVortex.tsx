import { useRef, useEffect, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// ASCII character ramp from dark to light
const ASCII_RAMP = " .,:;+*?%S#@";

interface FloatingMedia {
  url: string;
  type: "image" | "video";
}

interface AsciiOrbiterProps {
  progress: number;
}

/**
 * Converts an image/video frame to ASCII art on a canvas.
 * Also renders floating orbital media as ASCII-styled elements.
 */
export default function ImageVortex({ progress }: AsciiOrbiterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRef = useRef<FloatingMedia[]>([]);
  const imagesLoadedRef = useRef<(HTMLImageElement | HTMLVideoElement)[]>([]);
  const rafRef = useRef<number>(0);
  const [loaded, setLoaded] = useState(false);

  // Load gallery media from storage
  useEffect(() => {
    const loadMedia = async () => {
      const { data } = await supabase
        .from("gallery_items")
        .select("*")
        .order("sort_order", { ascending: true })
        .limit(8);

      if (data && data.length > 0) {
        const items: FloatingMedia[] = [];
        const elements: (HTMLImageElement | HTMLVideoElement)[] = [];

        for (const item of data) {
          let url = "";
          const isVideo = item.type === "video";

          if (item.storage_path) {
            const { data: urlData } = supabase.storage
              .from("portfolio")
              .getPublicUrl(item.storage_path);
            url = urlData.publicUrl;
          } else if (item.external_url) {
            url = item.external_url;
          }

          if (!url) continue;

          items.push({ url, type: isVideo ? "video" : "image" });

          if (isVideo) {
            const vid = document.createElement("video");
            vid.src = url;
            vid.crossOrigin = "anonymous";
            vid.muted = true;
            vid.loop = true;
            vid.playsInline = true;
            vid.autoplay = true;
            vid.play().catch(() => {});
            elements.push(vid);
          } else {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = url;
            elements.push(img);
          }
        }

        mediaRef.current = items;
        imagesLoadedRef.current = elements;
        setLoaded(true);
      } else {
        // Fallback: use cube face images
        const { data: cubeData } = await supabase
          .from("portfolio_images")
          .select("*");

        if (cubeData && cubeData.length > 0) {
          const items: FloatingMedia[] = [];
          const elements: (HTMLImageElement | HTMLVideoElement)[] = [];

          for (const row of cubeData) {
            const { data: urlData } = supabase.storage
              .from("portfolio")
              .getPublicUrl(row.storage_path);

            items.push({ url: urlData.publicUrl, type: "image" });
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = urlData.publicUrl;
            elements.push(img);
          }

          mediaRef.current = items;
          imagesLoadedRef.current = elements;
          setLoaded(true);
        }
      }
    };

    loadMedia();
  }, []);

  const vortexProgress = Math.max(0, (progress - 0.4) / 0.6);
  const isVisible = vortexProgress > 0;

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, w, h);

    const elements = imagesLoadedRef.current;
    const t = vortexProgress;
    const count = elements.length;

    if (count === 0) {
      // Draw procedural ASCII pattern
      renderProceduralAscii(ctx, w, h, t);
    } else {
      // Render each media item as an ASCII-art orbital
      elements.forEach((el, i) => {
        const angle = (i / count) * Math.PI * 2 + t * Math.PI * 2;
        const radiusX = w * 0.25 + Math.sin(t * 3 + i) * w * 0.08;
        const radiusY = h * 0.2 + Math.cos(t * 2.5 + i * 0.7) * h * 0.06;
        const cx = w / 2 + Math.cos(angle) * radiusX;
        const cy = h / 2 + Math.sin(angle) * radiusY;
        const size = Math.min(w, h) * 0.18;

        renderMediaAsAscii(ctx, el, cx, cy, size, t, i);
      });
    }

    rafRef.current = requestAnimationFrame(render);
  }, [vortexProgress]);

  useEffect(() => {
    if (!isVisible) {
      cancelAnimationFrame(rafRef.current);
      return;
    }
    rafRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isVisible, render]);

  if (!isVisible) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        opacity: Math.min(1, vortexProgress * 2),
      }}
    />
  );
}

/**
 * Renders a media element (image or video frame) as ASCII art at a given position.
 */
function renderMediaAsAscii(
  ctx: CanvasRenderingContext2D,
  source: HTMLImageElement | HTMLVideoElement,
  cx: number,
  cy: number,
  size: number,
  t: number,
  index: number
) {
  // Sample the source into a small buffer
  const sampleSize = 28;
  const charW = size / sampleSize;
  const charH = charW * 1.8;

  const offscreen = document.createElement("canvas");
  offscreen.width = sampleSize;
  offscreen.height = sampleSize;
  const offCtx = offscreen.getContext("2d")!;

  try {
    const sw =
      source instanceof HTMLVideoElement ? source.videoWidth : source.naturalWidth;
    const sh =
      source instanceof HTMLVideoElement ? source.videoHeight : source.naturalHeight;

    if (!sw || !sh) return;

    offCtx.drawImage(source, 0, 0, sampleSize, sampleSize);
    const imgData = offCtx.getImageData(0, 0, sampleSize, sampleSize);
    const data = imgData.data;

    const startX = cx - size / 2;
    const startY = cy - (sampleSize * charH) / 2;

    // Subtle float animation
    const floatY = Math.sin(t * 2 + index * 1.5) * 8;
    const floatX = Math.cos(t * 1.7 + index * 2.1) * 5;

    ctx.font = `${Math.max(4, charW * 0.85)}px "DM Mono", monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (let row = 0; row < sampleSize; row++) {
      for (let col = 0; col < sampleSize; col++) {
        const idx = (row * sampleSize + col) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];

        if (a < 30) continue;

        const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
        const charIdx = Math.floor(brightness * (ASCII_RAMP.length - 1));
        const char = ASCII_RAMP[charIdx];

        if (char === " ") continue;

        const px = startX + col * charW + floatX;
        const py = startY + row * charH + floatY;

        const alpha = Math.min(0.85, 0.3 + brightness * 0.55);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.fillText(char, px, py);
      }
    }
  } catch {
    // CORS or not-loaded — draw placeholder pattern
    renderAsciiPlaceholder(ctx, cx, cy, size, t, index);
  }
}

/**
 * Placeholder ASCII pattern when media can't be read
 */
function renderAsciiPlaceholder(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  t: number,
  index: number
) {
  const chars = "◆◇○●□■△▽";
  const gridSize = 8;
  const cellSize = size / gridSize;

  ctx.font = `${cellSize * 0.6}px "DM Mono", monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const floatY = Math.sin(t * 2 + index * 1.5) * 10;

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const px = cx - size / 2 + c * cellSize + cellSize / 2;
      const py = cy - size / 2 + r * cellSize + cellSize / 2 + floatY;
      const dist = Math.sqrt((r - gridSize / 2) ** 2 + (c - gridSize / 2) ** 2);
      const wave = Math.sin(dist - t * 4 + index) * 0.5 + 0.5;
      const charIdx = Math.floor(wave * (chars.length - 1));
      const alpha = 0.15 + wave * 0.35;

      ctx.fillStyle = `hsla(215, 20%, ${40 + wave * 30}%, ${alpha})`;
      ctx.fillText(chars[charIdx], px, py);
    }
  }
}

/**
 * When no media is loaded, render a procedural ASCII vortex pattern
 */
function renderProceduralAscii(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number
) {
  const symbols = "⟨⟩◈◇△▽○●∗∘·";
  const cols = Math.floor(w / 14);
  const rows = Math.floor(h / 22);
  const cellW = w / cols;
  const cellH = h / rows;

  ctx.font = `9px "DM Mono", monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const centerX = w / 2;
  const centerY = h / 2;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const px = c * cellW + cellW / 2;
      const py = r * cellH + cellH / 2;
      const dx = px - centerX;
      const dy = py - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);

      const spiral = Math.sin(dist * 0.02 - t * 4 + angle * 3) * 0.5 + 0.5;
      const pulse = Math.sin(dist * 0.015 - t * 2) * 0.5 + 0.5;
      const combined = spiral * 0.7 + pulse * 0.3;

      if (combined < 0.2) continue;

      const charIdx = Math.floor(combined * (symbols.length - 1));
      const alpha = combined * 0.25;
      const lightness = 50 + combined * 25;

      ctx.fillStyle = `hsla(215, 15%, ${lightness}%, ${alpha})`;
      ctx.fillText(symbols[charIdx], px, py);
    }
  }
}
