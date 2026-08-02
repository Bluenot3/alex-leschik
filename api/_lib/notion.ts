/**
 * Minimal Notion REST client.
 *
 * The official SDK pulls in more than these few calls justify, and the
 * token must never reach the browser — every function in this folder
 * runs server-side on Vercel with NOTION_TOKEN from the environment.
 */

const NOTION_VERSION = "2022-06-28";
const BASE = "https://api.notion.com/v1";

export class NotionError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

function token(): string {
  const t = process.env.NOTION_TOKEN;
  if (!t) throw new NotionError("NOTION_TOKEN is not configured", 500);
  return t;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token()}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new NotionError(
      `Notion ${res.status}: ${detail.slice(0, 300)}`,
      res.status === 429 ? 429 : 502,
    );
  }
  return res.json() as Promise<T>;
}

/* ── Property builders ─────────────────────────────────────── */

export const title = (v: string) => ({ title: [{ text: { content: v.slice(0, 2000) } }] });
export const text = (v: string) =>
  v ? { rich_text: [{ text: { content: v.slice(0, 2000) } }] } : { rich_text: [] };
export const email = (v: string) => ({ email: v || null });
export const select = (v: string) => (v ? { select: { name: v } } : { select: null });
export const number = (v: number | null | undefined) =>
  typeof v === "number" && Number.isFinite(v) ? { number: v } : { number: null };
export const checkbox = (v: boolean) => ({ checkbox: !!v });

/* ── Property readers ──────────────────────────────────────── */

type Prop = Record<string, unknown>;

export function readText(prop: Prop | undefined): string {
  if (!prop) return "";
  const rich = (prop.rich_text ?? prop.title) as { plain_text?: string }[] | undefined;
  if (Array.isArray(rich)) return rich.map((r) => r.plain_text ?? "").join("");
  return "";
}

export function readSelect(prop: Prop | undefined): string {
  const sel = prop?.select as { name?: string } | null | undefined;
  return sel?.name ?? "";
}

export function readNumber(prop: Prop | undefined): number | null {
  const n = prop?.number;
  return typeof n === "number" ? n : null;
}

export function readCheckbox(prop: Prop | undefined): boolean {
  return prop?.checkbox === true;
}

/* ── Operations ────────────────────────────────────────────── */

export function createPage(databaseId: string, properties: Record<string, unknown>) {
  return call<{ id: string }>("/pages", {
    method: "POST",
    body: JSON.stringify({ parent: { database_id: databaseId }, properties }),
  });
}

export interface QueryResult {
  results: { id: string; properties: Record<string, Prop>; created_time: string }[];
  next_cursor: string | null;
  has_more: boolean;
}

export function queryDatabase(
  databaseId: string,
  body: Record<string, unknown>,
): Promise<QueryResult> {
  return call<QueryResult>(`/databases/${databaseId}/query`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
