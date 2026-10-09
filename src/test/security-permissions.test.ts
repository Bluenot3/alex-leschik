import { describe, expect, it } from "vitest";

const url = process.env.SECURITY_TEST_URL;
const key = process.env.SECURITY_TEST_ANON_KEY;
const configured = Boolean(url && key);

async function request(path: string, method = "GET", body?: object) {
  if (!url || !key) throw new Error("Live permission test configuration missing");
  return fetch(`${url}${path}`, {
    method,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe.skipIf(!configured)("public visitor permissions", () => {
  it("cannot read lead information", async () => {
    const response = await request("/rest/v1/leads?select=id&limit=1");
    expect([401, 403]).toContain(response.status);
  });
  it("cannot read subscriber information", async () => {
    const response = await request("/rest/v1/newsletter_signups?select=id&limit=1");
    expect([401, 403]).toContain(response.status);
  });
  it("cannot add portfolio gallery content", async () => {
    const response = await request("/rest/v1/gallery_items", "POST", { type: "image", title: "permission-test" });
    expect([401, 403]).toContain(response.status);
  });
  it("cannot forge completed game records", async () => {
    const response = await request("/rest/v1/game_plays", "POST", { day_key: "2026-10-09", score: 5 });
    expect([401, 403]).toContain(response.status);
  });
  it("can still read public portfolio content", async () => {
    const response = await request("/rest/v1/gallery_items?select=id&limit=1");
    expect(response.status).toBe(200);
  });
});