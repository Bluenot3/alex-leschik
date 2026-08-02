import { describe, it, expect, beforeEach, vi } from "vitest";
import authHandler from "./auth";
import leadHandler from "./lead";

/** Minimal stand-in for the Vercel req/res pair. */
function mock(method: string, body: unknown = {}, cookie?: string) {
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    headers: {} as Record<string, string>,
    status(code: number) { this.statusCode = code; return this; },
    json(payload: unknown) { this.body = payload; return this; },
    setHeader(k: string, v: string) { this.headers[k] = v; },
  };
  const req = { method, body, headers: cookie ? { cookie } : {} };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { req: req as any, res: res as any };
}

beforeEach(() => {
  process.env.SESSION_SECRET = "test-secret-that-is-long-enough";
  process.env.OWNER_PIN = "317593";
  process.env.NOTION_LEADS_DB = "db-123";
  process.env.NOTION_TOKEN = "tok";
  vi.restoreAllMocks();
});

describe("/api/auth", () => {
  it("issues a session for the correct PIN", async () => {
    const { req, res } = mock("POST", { pin: "317593" });
    await authHandler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ owner: true });
    expect(res.headers["Set-Cookie"]).toMatch(/^az_owner=/);
    expect(res.headers["Set-Cookie"]).toContain("HttpOnly");
    expect(res.headers["Set-Cookie"]).toContain("SameSite=Strict");
  });

  it("rejects a wrong PIN without issuing a cookie", async () => {
    const { req, res } = mock("POST", { pin: "000000" });
    await authHandler(req, res);
    expect(res.statusCode).toBe(401);
    expect(res.headers["Set-Cookie"]).toBeUndefined();
  });

  it("rejects a non-string PIN", async () => {
    const { req, res } = mock("POST", { pin: { toString: () => "317593" } });
    await authHandler(req, res);
    expect(res.statusCode).toBe(401);
  });

  it("reports no owner for an unauthenticated GET", async () => {
    const { req, res } = mock("GET");
    await authHandler(req, res);
    expect(res.body).toEqual({ owner: false });
  });

  it("never caches", async () => {
    const { req, res } = mock("GET");
    await authHandler(req, res);
    expect(res.headers["Cache-Control"]).toBe("no-store");
  });
});

describe("/api/lead", () => {
  it("rejects a missing name", async () => {
    const { req, res } = mock("POST", { email: "a@b.co" });
    await leadHandler(req, res);
    expect(res.statusCode).toBe(400);
  });

  it("rejects a malformed email", async () => {
    for (const bad of ["nope", "a@b", "@b.co", ""]) {
      const { req, res } = mock("POST", { name: "Alex", email: bad });
      await leadHandler(req, res);
      expect(res.statusCode).toBe(400);
    }
  });

  it("swallows honeypot submissions without calling Notion", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { req, res } = mock("POST", {
      name: "Bot", email: "bot@spam.co", website: "http://spam",
    });
    await leadHandler(req, res);
    expect(res.statusCode).toBe(200);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("posts a valid lead to Notion", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "p1" }), { status: 200 }),
    );
    const { req, res } = mock("POST", {
      name: "Alex", email: "alex@zenai.world", message: "hello",
    });
    await leadHandler(req, res);
    expect(res.statusCode).toBe(200);
    expect(fetchSpy).toHaveBeenCalledOnce();

    const [url, init] = fetchSpy.mock.calls[0];
    expect(String(url)).toContain("/pages");
    const sent = JSON.parse((init as RequestInit).body as string);
    expect(sent.parent.database_id).toBe("db-123");
    expect(sent.properties.Name.title[0].text.content).toBe("Alex");
    expect(sent.properties.Status.select.name).toBe("new");
  });

  it("surfaces a friendly error when Notion fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("boom", { status: 500 }),
    );
    const { req, res } = mock("POST", { name: "Alex", email: "a@b.co" });
    await leadHandler(req, res);
    expect(res.statusCode).toBe(502);
    expect(String((res.body as { error: string }).error)).not.toContain("boom");
  });

  it("rejects non-POST", async () => {
    const { req, res } = mock("GET");
    await leadHandler(req, res);
    expect(res.statusCode).toBe(405);
  });
});
