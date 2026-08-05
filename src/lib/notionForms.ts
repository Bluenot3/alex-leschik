/**
 * Notion is the single source of truth for inbound signal.
 *
 * Leads and newsletter subscribers land directly in these Notion databases
 * via native Notion forms — no third-party middleware.
 * The in-app database remains as a silent backup path only.
 */

/** Public Notion form — full inbound lead intake. */
export const NOTION_LEAD_FORM_URL =
  "https://www.notion.so/form/3b39c47118d881c6bd99000cdf694789";

/** Public Notion form — ZEN Weekly subscribe. */
export const NOTION_NEWSLETTER_FORM_URL =
  "https://www.notion.so/form/3b39c47118d881bc82e5000c3c298c36";

/** Internal Notion workspace databases (owner-only). */
export const NOTION_LEADS_DB_URL =
  "https://www.notion.so/de35280d391a4f9e9bb2c144dcc92369";
export const NOTION_NEWSLETTER_DB_URL =
  "https://www.notion.so/a659333303d64148aa6c09cae0430cb2";
