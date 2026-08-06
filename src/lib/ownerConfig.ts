/**
 * Owner sign-in configuration.
 *
 * The PIN is the password on the allowlisted Supabase account — it is
 * sent to Supabase Auth, never compared in the browser. That keeps the
 * real check on the server: row-level security rejects any write from a
 * session whose verified email is not on the allowlist, so knowing or
 * bypassing anything in this file grants nothing on its own.
 *
 * The pad accepts any code between MIN_PIN_LENGTH and MAX_PIN_LENGTH
 * digits, so the account password can be any length without the UI
 * dictating it. Short codes are protected by auth rate limiting rather
 * than by length — prefer a longer one.
 */
export const OWNER_EMAIL = "royaltokens@gmail.com";

export const MIN_PIN_LENGTH = 4;
export const MAX_PIN_LENGTH = 12;
