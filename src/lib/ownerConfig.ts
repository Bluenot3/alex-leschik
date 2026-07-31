/**
 * Owner sign-in configuration.
 *
 * The PIN is the password on the allowlisted Supabase account — it is
 * sent to Supabase Auth, never compared in the browser. That keeps the
 * real check on the server: row-level security rejects any write from a
 * session whose verified email is not on the allowlist, so knowing or
 * bypassing anything in this file grants nothing on its own.
 *
 * Note that a six-digit PIN is a short password. It is protected by
 * Supabase's auth rate limiting rather than by length.
 */
export const OWNER_EMAIL = "royaltokens@gmail.com";

export const PIN_LENGTH = 6;
