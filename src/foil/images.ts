/**
 * Image → GPU layer helpers. Layers are square-cropped (object-fit: cover)
 * into canvases at the view's layer size so both backends upload them the
 * same way.
 */

export class LayerLoadError extends Error {
  /** True when the image loads for an <img> but not for the GPU (no CORS). */
  constructor(
    message: string,
    readonly corsOnly: boolean,
  ) {
    super(message);
  }
}

function decode(url: string, cors: boolean) {
  const img = new Image();
  if (cors) img.crossOrigin = "anonymous";
  img.decoding = "async";
  img.src = url;
  return img.decode().then(() => img);
}

function drawCover(src: CanvasImageSource, iw: number, ih: number, canvas: HTMLCanvasElement) {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  const s = Math.max(w / iw, h / ih);
  const dw = iw * s;
  const dh = ih * s;
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(src, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

/** Loads `url` into a w × h canvas, cover-cropped. Throws LayerLoadError. */
export async function loadLayer(url: string, w: number, h: number): Promise<HTMLCanvasElement> {
  let img: HTMLImageElement;
  try {
    img = await decode(url, true);
  } catch {
    // Distinguish "missing" from "readable by <img> but not by the GPU".
    const plain = await decode(url, false).then(
      () => true,
      () => false,
    );
    throw new LayerLoadError(`layer image failed: ${url}`, plain);
  }
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  drawCover(img, img.naturalWidth, img.naturalHeight, canvas);
  try {
    canvas.getContext("2d")!.getImageData(0, 0, 1, 1);
  } catch {
    throw new LayerLoadError(`layer image is cross-origin: ${url}`, true);
  }
  return canvas;
}

/** A looping muted video drawn into a layer canvas on demand. */
export function videoLayer(url: string, w: number, h: number) {
  const video = document.createElement("video");
  video.crossOrigin = "anonymous";
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = url;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ready = new Promise<void>((resolve, reject) => {
    video.addEventListener("loadeddata", () => resolve(), { once: true });
    video.addEventListener("error", () => reject(new LayerLoadError(`layer video failed: ${url}`, false)), { once: true });
  });
  return {
    canvas,
    ready,
    play: () => video.play().catch(() => {}),
    pause: () => video.pause(),
    /** Copies the current frame; false while there is nothing new to show. */
    draw() {
      if (video.readyState < 2 || !video.videoWidth) return false;
      drawCover(video, video.videoWidth, video.videoHeight, canvas);
      return true;
    },
    dispose() {
      video.pause();
      video.removeAttribute("src");
      video.load();
    },
  };
}
