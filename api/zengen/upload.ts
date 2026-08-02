import type { VercelRequest, VercelResponse } from "@vercel/node";
import { isOwner } from "../_lib/session";
import { presignUpload, makeKeys } from "../_lib/r2";
import { createPage, title, text, select, number, checkbox, NotionError } from "../_lib/notion";

/**
 * Two-step upload, both steps owner-gated:
 *   POST { name }            -> presigned PUT URLs for the full image and its thumbnail
 *   POST { commit: {...} }   -> records the finished upload in Notion
 *
 * Keys are minted here rather than accepted from the client, so nothing
 * can write outside the full/ and thumb/ prefixes.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!isOwner(req.headers.cookie)) {
    return res.status(401).json({ error: "Owner session required" });
  }

  const commit = req.body?.commit;

  try {
    if (!commit) {
      const name = typeof req.body?.name === "string" ? req.body.name : "frame";
      const keys = makeKeys(name);
      const [fullUrl, thumbUrl] = await Promise.all([
        presignUpload(keys.full, "image/webp"),
        presignUpload(keys.thumb, "image/webp"),
      ]);
      return res.status(200).json({ keys, fullUrl, thumbUrl });
    }

    const key = typeof commit.key === "string" ? commit.key : "";
    const thumbKey = typeof commit.thumbKey === "string" ? commit.thumbKey : "";
    if (!/^full\/[A-Za-z0-9._-]+$/.test(key)) {
      return res.status(400).json({ error: "Invalid key" });
    }
    if (thumbKey && !/^thumb\/[A-Za-z0-9._-]+$/.test(thumbKey)) {
      return res.status(400).json({ error: "Invalid thumbnail key" });
    }

    const db = process.env.NOTION_ZENGEN_DB;
    if (!db) return res.status(500).json({ error: "Archive database is not configured" });

    await createPage(db, {
      Title: title(typeof commit.title === "string" ? commit.title : "Untitled"),
      Key: text(key),
      "Thumb Key": text(thumbKey),
      Prompt: text(typeof commit.prompt === "string" ? commit.prompt : ""),
      Collection: select(typeof commit.collection === "string" ? commit.collection : "unfiled"),
      Width: number(commit.width),
      Height: number(commit.height),
      Featured: checkbox(false),
      Published: checkbox(true),
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[zengen/upload] failed:", err);
    const status = err instanceof NotionError ? err.status : 500;
    const message =
      err instanceof Error && err.message.startsWith("R2 is not configured")
        ? err.message
        : "Upload could not be prepared";
    return res.status(status).json({ error: message });
  }
}
