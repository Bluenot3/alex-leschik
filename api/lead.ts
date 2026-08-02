import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createPage, title, text, email, select, NotionError } from "./_lib/notion.js";

const MAX = { name: 120, email: 200, company: 160, projectType: 120, budget: 80, message: 4000 };

const clean = (v: unknown, cap: number) =>
  typeof v === "string" ? v.trim().slice(0, cap) : "";

/** Deliberately permissive — just enough to reject obvious junk. */
const looksLikeEmail = (v: string) => /^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(v);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const db = process.env.NOTION_LEADS_DB;
  if (!db) return res.status(500).json({ error: "Leads database is not configured" });

  const name = clean(req.body?.name, MAX.name);
  const addr = clean(req.body?.email, MAX.email);
  const message = clean(req.body?.message, MAX.message);

  if (!name) return res.status(400).json({ error: "Name is required" });
  if (!looksLikeEmail(addr)) return res.status(400).json({ error: "A valid email is required" });

  /* Honeypot: bots fill hidden fields, people never see them. */
  if (clean(req.body?.website, 100)) {
    return res.status(200).json({ ok: true });
  }

  try {
    await createPage(db, {
      Name: title(name),
      Email: email(addr),
      Company: text(clean(req.body?.company, MAX.company)),
      "Project Type": text(clean(req.body?.projectType, MAX.projectType)),
      Budget: text(clean(req.body?.budgetRange, MAX.budget)),
      Message: text(message),
      Status: select("new"),
      Source: text(clean(req.body?.source, 120) || "alexleschik.com"),
    });
    return res.status(200).json({ ok: true });
  } catch (err) {
    const status = err instanceof NotionError ? err.status : 500;
    console.error("[lead] failed:", err);
    return res.status(status).json({ error: "Could not record that. Please try again." });
  }
}
