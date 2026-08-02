import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";

/**
 * Owner session, held in a signed HttpOnly cookie.
 *
 * The PIN never reaches the client bundle and is only ever compared
 * here, in constant time. The cookie carries an expiry and an HMAC over
 * it, so it cannot be forged or extended without SESSION_SECRET.
 */

const COOKIE = "az_owner";
const TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error("SESSION_SECRET must be set to at least 16 characters");
  }
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

/** Constant-time compare that tolerates unequal lengths. */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) {
    // Still burn a comparison so length alone is not a timing signal.
    timingSafeEqual(ab, ab);
    return false;
  }
  return timingSafeEqual(ab, bb);
}

export function verifyPin(candidate: string): boolean {
  const expected = process.env.OWNER_PIN;
  if (!expected) return false;
  return safeEqual(candidate ?? "", expected);
}

export function issueCookie(): string {
  const expires = Date.now() + TTL_MS;
  const payload = `${expires}.${randomBytes(8).toString("base64url")}`;
  const value = `${payload}.${sign(payload)}`;
  return [
    `${COOKIE}=${value}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
    `Max-Age=${Math.floor(TTL_MS / 1000)}`,
  ].join("; ");
}

export function clearCookie(): string {
  return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

export function isOwner(cookieHeader: string | undefined | null): boolean {
  if (!cookieHeader) return false;

  const raw = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE}=`))
    ?.slice(COOKIE.length + 1);
  if (!raw) return false;

  const parts = raw.split(".");
  if (parts.length !== 3) return false;
  const [expires, nonce, mac] = parts;

  if (!safeEqual(mac, sign(`${expires}.${nonce}`))) return false;

  const ts = Number(expires);
  return Number.isFinite(ts) && ts > Date.now();
}
