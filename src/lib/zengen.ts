import { supabase } from "@/integrations/supabase/client";

export const ZENGEN_BUCKET = "zen-gen";
export const PAGE_SIZE = 48;

export interface ZenGenImage {
  id: string;
  storage_path: string;
  thumb_path: string | null;
  title: string;
  prompt: string;
  model: string;
  collection_id: string | null;
  width: number | null;
  height: number | null;
  featured: boolean;
  created_at: string;
}

export interface ZenGenCollection {
  id: string;
  slug: string;
  title: string;
  description: string;
  accent: string;
  sort_order: number;
}

/** Storage paths are stable, so the resolved URL is worth caching. */
const urlCache = new Map<string, string>();

export function publicUrl(path: string | null | undefined): string {
  if (!path) return "";
  const hit = urlCache.get(path);
  if (hit) return hit;
  const { data } = supabase.storage.from(ZENGEN_BUCKET).getPublicUrl(path);
  urlCache.set(path, data.publicUrl);
  return data.publicUrl;
}

/** Grid/stream views pull the thumbnail; the lightbox pulls the original. */
export function thumbUrl(img: ZenGenImage): string {
  return publicUrl(img.thumb_path ?? img.storage_path);
}

export function fullUrl(img: ZenGenImage): string {
  return publicUrl(img.storage_path);
}

export async function fetchCollections(): Promise<ZenGenCollection[]> {
  const { data, error } = await (supabase as any)
    .from("zengen_collections")
    .select("id, slug, title, description, accent, sort_order")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as ZenGenCollection[];
}

export interface PageResult {
  images: ZenGenImage[];
  hasMore: boolean;
}

/**
 * True when the archive tables simply have not been created yet.
 * That is a setup state, not a fault, and the UI says so differently.
 */
export function isNotProvisioned(err: unknown): boolean {
  const code = (err as { code?: string } | null)?.code ?? "";
  const message = (err as { message?: string } | null)?.message ?? "";
  return (
    code === "42P01" ||        // postgres: undefined_table
    code === "PGRST205" ||     // postgrest: table not found in schema cache
    /does not exist|could not find the table/i.test(message)
  );
}

/**
 * Offset pagination against the (created_at DESC, id DESC) index.
 * Requests one extra row to learn whether another page exists without
 * paying for a count query on a table meant to hold thousands of rows.
 */
export async function fetchImagePage(
  page: number,
  collectionId: string | null,
): Promise<PageResult> {
  const from = page * PAGE_SIZE;
  let query = (supabase as any)
    .from("zengen_images")
    .select(
      "id, storage_path, thumb_path, title, prompt, model, collection_id, width, height, featured, created_at",
    )
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, from + PAGE_SIZE);

  if (collectionId) query = query.eq("collection_id", collectionId);

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as unknown as ZenGenImage[];
  return { images: rows.slice(0, PAGE_SIZE), hasMore: rows.length > PAGE_SIZE };
}

export async function countImages(collectionId: string | null): Promise<number> {
  let query = (supabase as any)
    .from("zengen_images")
    .select("id", { count: "exact", head: true });
  if (collectionId) query = query.eq("collection_id", collectionId);
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

/* ── Client-side image processing ──────────────────────────────
   Thousands of full-resolution generations would make the grid
   unusable, so each upload also produces a small WebP thumbnail.
   Both derive from one decode pass.                             */

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

/** Collision-proof key that keeps uploads sorted by arrival. */
export function makeKey(file: File): string {
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  const safe = file.name
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "frame";
  return `${stamp}-${rand}-${safe}`;
}
