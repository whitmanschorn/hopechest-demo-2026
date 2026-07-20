"use server";

import { isValidEmail, normalizeEmail } from "@/data/db/mailingList";
import { insertMailingListSignup } from "@/data/db/mutations";

export interface SubscribeResult {
  ok: boolean;
  /** True when the address was already on the list (still a success, not an error). */
  alreadySubscribed?: boolean;
  errors?: string[];
}

function genId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Add an email to the launch mailing list. Public (no `requireCurrentPerson()`)
 * — the demo banner links here from every page, including the logged-out ones,
 * so unlike the in-app writes it can't require a session. Re-subscribing an
 * existing address is not an error: it returns `{ ok: true, alreadySubscribed:
 * true }` so the form can say "you're already on the list" (mirrors the
 * `{ ok: true }` "already tagged"/"already onboarded" idioms elsewhere).
 */
export async function subscribeToMailingList(emailRaw: string): Promise<SubscribeResult> {
  const email = normalizeEmail(emailRaw);
  if (!isValidEmail(email)) return { ok: false, errors: ["Enter a valid email address."] };

  const { created } = await insertMailingListSignup({ id: genId("sub"), email });
  return { ok: true, alreadySubscribed: !created };
}
