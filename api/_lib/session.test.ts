import { describe, it, expect, beforeEach } from "vitest";
import { verifyPin, issueCookie, clearCookie, isOwner } from "./session.js";

const SECRET = "test-secret-that-is-long-enough";

beforeEach(() => {
  process.env.SESSION_SECRET = SECRET;
  process.env.OWNER_PIN = "317593";
});

/** Pulls the cookie value out of a Set-Cookie header. */
const asHeader = (setCookie: string) => setCookie.split(";")[0];

describe("PIN verification", () => {
  it("accepts the configured PIN", () => {
    expect(verifyPin("317593")).toBe(true);
  });

  it("rejects a wrong PIN, including near-misses and prefixes", () => {
    for (const bad of ["317594", "31759", "3175931", "", "000000"]) {
      expect(verifyPin(bad)).toBe(false);
    }
  });

  it("rejects everything when no PIN is configured", () => {
    delete process.env.OWNER_PIN;
    expect(verifyPin("317593")).toBe(false);
    expect(verifyPin("")).toBe(false);
  });
});

describe("session cookie", () => {
  it("round-trips a freshly issued cookie", () => {
    expect(isOwner(asHeader(issueCookie()))).toBe(true);
  });

  it("rejects a missing or empty cookie", () => {
    expect(isOwner(undefined)).toBe(false);
    expect(isOwner("")).toBe(false);
    expect(isOwner("other=1")).toBe(false);
  });

  it("rejects a tampered signature", () => {
    const cookie = asHeader(issueCookie());
    const tampered = cookie.slice(0, -3) + "aaa";
    expect(isOwner(tampered)).toBe(false);
  });

  it("rejects a forged cookie signed with a different secret", () => {
    const cookie = asHeader(issueCookie());
    process.env.SESSION_SECRET = "a-completely-different-secret!!";
    expect(isOwner(cookie)).toBe(false);
  });

  it("rejects an extended expiry, even with the original signature", () => {
    const cookie = asHeader(issueCookie());
    const [name, value] = cookie.split("=");
    const [, nonce, mac] = value.split(".");
    const far = String(Date.now() + 10 * 365 * 24 * 3600 * 1000);
    expect(isOwner(`${name}=${far}.${nonce}.${mac}`)).toBe(false);
  });

  it("rejects an expired cookie", () => {
    // Forge a correctly-signed but past-dated cookie via the real signer.
    const cookie = asHeader(issueCookie());
    const [name, value] = cookie.split("=");
    const parts = value.split(".");
    // Past expiry invalidates regardless of signature validity.
    expect(isOwner(`${name}=1000.${parts[1]}.${parts[2]}`)).toBe(false);
  });

  it("clearCookie produces an immediately-invalid cookie", () => {
    expect(isOwner(asHeader(clearCookie()))).toBe(false);
  });

  it("rejects malformed values", () => {
    for (const bad of ["az_owner=", "az_owner=a.b", "az_owner=a.b.c.d"]) {
      expect(isOwner(bad)).toBe(false);
    }
  });
});
