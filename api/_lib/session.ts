import { createHmac, timingSafeEqual } from "crypto";

const COOKIE_NAME = "owner_session";
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not configured");
  return secret;
}

function getPin(): string {
  const pin = process.env.OWNER_PIN;
  if (!pin) throw new Error("OWNER_PIN is not configured");
  return pin;
}

interface SessionData {
  iat: number;
  exp: number;
}

function sign(data: SessionData): string {
  const payload = JSON.stringify(data);
  const sig = createHmac("sha256", getSecret()).update(payload).digest("base64url");
  return `${sig}.${Buffer.from(payload).toString("base64url")}`;
}

function verify(token: string): SessionData | null {
  const [sig, payload] = token.split(".");
  if (!sig || !payload) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    const expected = createHmac("sha256", getSecret()).update(JSON.stringify(data)).digest("base64url");

    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return null;
    }

    const now = Date.now();
    if (now > data.exp) return null;

    return data;
  } catch {
    return null;
  }
}

export function verifyPin(input: string): boolean {
  const pin = getPin();
  try {
    return timingSafeEqual(Buffer.from(input), Buffer.from(pin));
  } catch {
    return false;
  }
}

export function isOwner(cookieHeader: string | undefined): boolean {
  if (!cookieHeader) return false;
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  if (!match) return false;
  return verify(match[1]) !== null;
}

export function issueCookie(): string {
  const now = Date.now();
  const token = sign({ iat: now, exp: now + SESSION_DURATION_MS });
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${Math.floor(SESSION_DURATION_MS / 1000)}`;
}

export function clearCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;
}
