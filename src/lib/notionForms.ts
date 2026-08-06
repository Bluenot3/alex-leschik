/**
 * Notion is the single source of truth for inbound signal.
 *
 * Leads and newsletter subscribers land directly in these Notion databases
 * via native Notion forms — no third-party middleware.
 * The in-app database remains as a silent backup path only.
 */

/** Public Notion form — full inbound lead intake. */
export const NOTION_LEAD_FORM_URL =
  "https://www.notion.so/form/52b50c8ce7684ee2979900470f7c0dc6";

/** Public Notion form — ZEN Weekly subscribe. */
export const NOTION_NEWSLETTER_FORM_URL =
  "https://www.notion.so/form/38cfe6f2a3a14a50a34b1ed40d12ee83";

/** Internal Notion workspace databases (owner-only). */
export const NOTION_LEADS_DB_URL =
  "https://app.notion.com/p/daddc43f4b8844e78ac221a09c8b0b58";
export const NOTION_NEWSLETTER_DB_URL =
  "https://app.notion.com/p/01c14615e9ff44688d455f18600aef32";
