const BASE = "https://api.notion.com/v1";

export class NotionError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "NotionError";
  }
}

async function request(
  method: string,
  path: string,
  token: string,
  body?: Record<string, unknown>,
) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();

  if (!res.ok) {
    const msg =
      typeof data === "object" && data !== null && "message" in data
        ? String(data.message)
        : `HTTP ${res.status}`;
    throw new NotionError(res.status, msg);
  }

  return data;
}

export interface DatabaseQuery {
  page_size?: number;
  start_cursor?: string;
  filter?: Record<string, unknown>;
  sorts?: Array<{ property: string; direction: "ascending" | "descending" }>;
}

export async function queryDatabase(
  dbId: string,
  token: string,
  query: DatabaseQuery,
) {
  return request("POST", `/databases/${dbId}/query`, token, query);
}

export async function createPage(
  dbId: string,
  token: string,
  properties: Record<string, unknown>,
) {
  return request("POST", "/pages", token, {
    parent: { database_id: dbId },
    properties,
  });
}

export const title = (text: string) => ({
  title: [{ type: "text" as const, text: { content: text } }],
});

export const text = (content: string) => ({
  rich_text: [{ type: "text" as const, text: { content } }],
});

export const email = (content: string) => ({
  email: content,
});

export const select = (name: string) => ({
  select: { name },
});

export const number = (n: unknown) => ({
  number: typeof n === "number" ? n : null,
});

export const checkbox = (value: boolean) => ({
  checkbox: value,
});

export const readText = (prop: unknown): string => {
  if (
    typeof prop === "object" &&
    prop !== null &&
    "rich_text" in prop &&
    Array.isArray(prop.rich_text)
  ) {
    return prop.rich_text
      .map((rt) => (typeof rt === "object" && rt !== null && "text" in rt ? rt.text?.content || "" : ""))
      .join("");
  }
  return "";
};

export const readSelect = (prop: unknown): string => {
  if (typeof prop === "object" && prop !== null && "select" in prop && prop.select) {
    return typeof prop.select === "object" && prop.select !== null && "name" in prop.select
      ? String(prop.select.name)
      : "";
  }
  return "";
};

export const readNumber = (prop: unknown): number | null => {
  return typeof prop === "object" && prop !== null && "number" in prop && typeof prop.number === "number"
    ? prop.number
    : null;
};

export const readCheckbox = (prop: unknown): boolean => {
  return typeof prop === "object" && prop !== null && "checkbox" in prop && prop.checkbox === true;
};
