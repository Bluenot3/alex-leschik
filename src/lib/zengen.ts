export const PAGE_SIZE = 48;

export interface ZenGenImage {
  id: string;
  url: string;
  thumbUrl: string;
  title: string;
  prompt: string;
  collection: string;
  width: number | null;
  height: number | null;
  featured: boolean;
  createdAt: string;
}

interface ProcessedImage {
  full: Blob;
  thumb: Blob;
  width: number;
  height: number;
}

export async function processImage(file: File): Promise<ProcessedImage> {
  const img = new Image();
  const blob = await new Promise<Blob>((resolve) => {
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;

      const maxWidth = Math.min(img.width, 2560);
      const ratio = img.height / img.width;
      const width = maxWidth;
      const height = Math.round(width * ratio);

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob((blob) => resolve(blob!), "image/webp", 0.85);
    };
    img.src = URL.createObjectURL(file);
  });

  const thumbCanvas = document.createElement("canvas");
  const thumbCtx = thumbCanvas.getContext("2d")!;
  const thumbImg = new Image();

  const thumb = await new Promise<Blob>((resolve) => {
    thumbImg.onload = () => {
      const maxThumb = 640;
      const ratio = thumbImg.height / thumbImg.width;
      const width = Math.min(thumbImg.width, maxThumb);
      const height = Math.round(width * ratio);

      thumbCanvas.width = width;
      thumbCanvas.height = height;
      thumbCtx.drawImage(thumbImg, 0, 0, width, height);

      thumbCanvas.toBlob((blob) => resolve(blob!), "image/webp", 0.75);
    };
    thumbImg.src = URL.createObjectURL(file);
  });

  return {
    full: blob,
    thumb,
    width: img.width,
    height: img.height,
  };
}

export async function fetchImagePage(cursor?: string, collection?: string) {
  const params = new URLSearchParams();
  if (cursor) params.append("cursor", cursor);
  if (collection) params.append("collection", collection);

  const res = await fetch(`/api/zengen/list?${params}`);
  if (!res.ok) throw new Error("Failed to fetch images");
  return res.json() as Promise<{
    images: ZenGenImage[];
    nextCursor: string | null;
    configured: boolean;
  }>;
}

export async function checkOwner(): Promise<boolean> {
  const res = await fetch("/api/auth");
  if (!res.ok) return false;
  const data = await res.json() as { owner: boolean };
  return data.owner;
}

export async function signInWithPin(pin: string): Promise<{ error?: string }> {
  const res = await fetch("/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin }),
  });
  if (res.ok) return {};
  const data = await res.json() as { error?: string };
  return { error: data.error || "Sign in failed" };
}

export async function signOutOwner(): Promise<void> {
  await fetch("/api/auth", { method: "DELETE" });
}

interface UploadOneInput {
  name: string;
  title: string;
  prompt?: string;
  collection?: string;
  width?: number;
  height?: number;
  full: Blob;
  thumb: Blob;
}

export async function uploadOne(input: UploadOneInput) {
  // Step 1: Get presigned URLs
  const presignRes = await fetch("/api/zengen/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: input.name }),
  });
  if (!presignRes.ok) throw new Error("Failed to get upload URLs");

  const { keys, fullUrl, thumbUrl } = await presignRes.json() as {
    keys: { full: string; thumb: string };
    fullUrl: string;
    thumbUrl: string;
  };

  // Step 2: Upload images directly to R2
  const [fullRes, thumbRes] = await Promise.all([
    fetch(fullUrl, {
      method: "PUT",
      headers: { "Content-Type": "image/webp" },
      body: input.full,
    }),
    fetch(thumbUrl, {
      method: "PUT",
      headers: { "Content-Type": "image/webp" },
      body: input.thumb,
    }),
  ]);

  if (!fullRes.ok || !thumbRes.ok) {
    throw new Error("Failed to upload images to storage");
  }

  // Step 3: Record in Notion
  const commitRes = await fetch("/api/zengen/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      commit: {
        key: keys.full,
        thumbKey: keys.thumb,
        title: input.title,
        prompt: input.prompt || "",
        collection: input.collection || "unfiled",
        width: input.width || 0,
        height: input.height || 0,
      },
    }),
  });

  if (!commitRes.ok) throw new Error("Failed to record upload");
}
