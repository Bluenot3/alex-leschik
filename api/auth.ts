import type { VercelRequest, VercelResponse } from "@vercel/node";
import { verifyPin, issueCookie, clearCookie, isOwner } from "./_lib/session.js";

/** Small delay on failure to blunt automated PIN guessing. */
const FAIL_DELAY_MS = 600;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "GET") {
    return res.status(200).json({ owner: isOwner(req.headers.cookie) });
  }

  if (req.method === "DELETE") {
    res.setHeader("Set-Cookie", clearCookie());
    return res.status(200).json({ owner: false });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const pin = typeof req.body?.pin === "string" ? req.body.pin : "";

  if (!verifyPin(pin)) {
    await new Promise((r) => setTimeout(r, FAIL_DELAY_MS));
    return res.status(401).json({ error: "PIN not accepted" });
  }

  try {
    res.setHeader("Set-Cookie", issueCookie());
  } catch {
    return res.status(500).json({ error: "Session signing is not configured" });
  }
  return res.status(200).json({ owner: true });
}
