import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createPage, title, text, NotionError } from "./_lib/notion.js";

const looksLikeEmail = (v: string) => /^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(v);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const db = process.env.NOTION_NEWSLETTER_DB;
  if (!db) return res.status(500).json({ error: "Newsletter database is not configured" });

  const addr = typeof req.body?.email === "string" ? req.body.email.trim().slice(0, 200) : "";
  if (!looksLikeEmail(addr)) {
    return res.status(400).json({ error: "A valid email is required" });
  }

  try {
    await createPage(db, {
      Email: title(addr),
      Source: text(
        typeof req.body?.source === "string" ? req.body.source.slice(0, 120) : "alexleschik.com",
      ),
    });
    return res.status(200).json({ ok: true });
  } catch (err) {
    const status = err instanceof NotionError ? err.status : 500;
    console.error("[newsletter] failed:", err);
    return res.status(status).json({ error: "Could not sign you up. Please try again." });
  }
}
