/**
 * Pure mailing-list rules — email normalization + validation. Kept free of any
 * `"use server"`/IO so the signup action (app/mailing-list/actions.ts) stays a
 * thin wrapper and these rules are unit-tested directly (mirrors reactions.ts).
 */

/** Trim + lowercase so "  Me@Example.com " and "me@example.com" dedupe as one. */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

// Deliberately permissive: something before the @, something after, and a dot in
// the domain, with no whitespace. We're catching obvious typos, not enforcing
// RFC 5322 — a real confirmation email would be the authoritative check.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** True when `raw` looks like an email once normalized. */
export function isValidEmail(raw: string): boolean {
  return EMAIL_RE.test(normalizeEmail(raw));
}
