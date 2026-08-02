import { AwsClient } from "aws4fetch";

/**
 * Cloudflare R2 access.
 *
 * R2 speaks the S3 API, so uploads are handed to the browser as
 * short-lived presigned PUT URLs. Bytes go straight from the browser to
 * R2 — they never pass through a Vercel function, which keeps large
 * batches off the 4.5MB request-body limit and off metered bandwidth.
 */

const UPLOAD_TTL_SECONDS = 900; // 15 minutes

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicBase: string;
}

export function r2Config(): R2Config {
  const cfg = {
    accountId: process.env.R2_ACCOUNT_ID ?? "",
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
    bucket: process.env.R2_BUCKET ?? "",
    publicBase: (process.env.R2_PUBLIC_BASE ?? "").replace(/\/+$/, ""),
  };
  const missing = Object.entries(cfg)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (missing.length) {
    throw new Error(`R2 is not configured — missing: ${missing.join(", ")}`);
  }
  return cfg;
}

export function publicUrl(key: string): string {
  return `${r2Config().publicBase}/${key}`;
}

/** Presigned PUT the browser can upload to directly. */
export async function presignUpload(key: string, contentType: string): Promise<string> {
  const cfg = r2Config();
  const client = new AwsClient({
    accessKeyId: cfg.accessKeyId,
    secretAccessKey: cfg.secretAccessKey,
    service: "s3",
    region: "auto",
  });

  const endpoint = `https://${cfg.accountId}.r2.cloudflarestorage.com/${cfg.bucket}/${key}`;
  const url = new URL(endpoint);
  url.searchParams.set("X-Amz-Expires", String(UPLOAD_TTL_SECONDS));

  const signed = await client.sign(
    new Request(url, { method: "PUT", headers: { "Content-Type": contentType } }),
    { aws: { signQuery: true } },
  );
  return signed.url;
}

/** Object keys are derived server-side so a client cannot escape the prefix. */
export function makeKeys(name: string): { full: string; thumb: string } {
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  const safe =
    name
      .replace(/\.[^.]+$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "frame";
  const base = `${stamp}-${rand}-${safe}`;
  return { full: `full/${base}.webp`, thumb: `thumb/${base}.webp` };
}
