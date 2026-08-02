/**
 * ZEN-GEN data access.
 *
 * Records live in Notion and image bytes live in Cloudflare R2; both are
 * reached through this site's own /api functions, so no third-party
 * token ever ships to the browser.
 */

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

export interface ZenGenCollection {
  id: string;
  slug: string;
  title: string;
  accent: string;
}

/** Mirrors the Collection options on the Notion database. */
export const COLLECTIONS: ZenGenCollection[] = [
  { id: "genesis", slug: "genesis", title: "GENESIS", accent: "cyan" },
  { id: "artifacts", slug: "artifacts", title: "ARTIFACTS", accent: "violet" },
  { id: "worlds", slug: "worlds", title: "WORLDS", accent: "amber" },
];

export const thumbUrl = (img: ZenGenImage) => img.thumbUrl || img.url;
export const fullUrl = (img: ZenGenImage) => img.url;

export interface PageResult {
  images: ZenGenImage[];
  nextCursor: string | null;
  configured: boolean;
}

async function asJson(res: Response) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error ?? `Request failed (${res.status})`);
  return body;
}

export async function fetchImagePage(
  cursor: string | null,
  collection: string | null,
): Promise<PageResult> {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  if (collection) params.set("collection", collection);

  const body = await asJson(await fetch(`/api/zengen/list?${params}`));
  return {
    images: (body.images ?? []) as ZenGenImage[],
    nextCursor: body.nextCursor ?? null,
    configured: body.configured !== false,
  };
}

/* ── Owner session ─────────────────────────────────────────── */

export async function checkOwner(): Promise<boolean> {
  try {
    const res = await fetch("/api/auth", { credentials: "same-origin" });
    return res.ok && (await res.json()).owner === true;
  } catch {
    return false;
  }
}

export async function signInWithPin(pin: string): Promise<string | null> {
  try {
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ pin }),
    });
    if (res.ok) return null;
    const body = await res.json().catch(() => ({}));
    return body?.error ?? "PIN not accepted";
  } catch {
    return "Could not reach the server";
  }
}

export async function signOutOwner(): Promise<void> {
  await fetch("/api/auth", { method: "DELETE", credentials: "same-origin" }).catch(() => {});
}

/* ── Upload ────────────────────────────────────────────────── */

export interface Processed {
  full: Blob;
  thumb: Blob;
  width: number;
  height: number;
}

const FULL_MAX = 2560;
const THUMB_MAX = 640;

function drawTo(bitmap: ImageBitmap, max: number, quality: number): Promise<Blob> {
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("canvas unavailable"));
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, w, h);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("encode failed"))),
      "image/webp",
      quality,
    );
  });
}

/** Both sizes come from a single decode pass. */
export async function processImage(file: File): Promise<Processed> {
  const bitmap = await createImageBitmap(file);
  try {
    const [full, thumb] = await Promise.all([
      drawTo(bitmap, FULL_MAX, 0.9),
      drawTo(bitmap, THUMB_MAX, 0.72),
    ]);
    return { full, thumb, width: bitmap.width, height: bitmap.height };
  } finally {
    bitmap.close();
  }
}

export async function uploadOne(
  file: File,
  collection: string,
): Promise<void> {
  const { full, thumb, width, height } = await processImage(file);

  const prep = await asJson(
    await fetch("/api/zengen/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ name: file.name }),
    }),
  );

  /* Bytes go browser -> R2 directly; the function only signs the URL. */
  const put = async (url: string, blob: Blob) => {
    const res = await fetch(url, {
      method: "PUT",
      body: blob,
      headers: { "Content-Type": "image/webp" },
    });
    if (!res.ok) throw new Error(`Storage rejected the upload (${res.status})`);
  };

  await Promise.all([put(prep.fullUrl, full), put(prep.thumbUrl, thumb)]);

  await asJson(
    await fetch("/api/zengen/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        commit: {
          key: prep.keys.full,
          thumbKey: prep.keys.thumb,
          title: file.name.replace(/\.[^.]+$/, ""),
          collection: collection || "unfiled",
          width,
          height,
        },
      }),
    }),
  );
}
