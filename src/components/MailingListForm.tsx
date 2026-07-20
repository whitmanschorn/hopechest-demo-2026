"use client";

import { useState, useTransition } from "react";

import { subscribeToMailingList } from "@/app/mailing-list/actions";
import { MailIcon } from "./icons";

type Status = "idle" | "subscribed" | "already";

/**
 * Public mailing-list signup. Calls the `subscribeToMailingList` server action
 * (useTransition + await, the house pattern — no useActionState here). A brand-
 * new address and an already-subscribed one both land in the same brass success
 * card, with slightly different copy so a repeat signup reads as reassurance,
 * not an error.
 */
export function MailingListForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, start] = useTransition();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    start(async () => {
      const res = await subscribeToMailingList(email);
      if (!res.ok) {
        setErrors(res.errors ?? ["Something went wrong — please try again."]);
        return;
      }
      setStatus(res.alreadySubscribed ? "already" : "subscribed");
    });
  };

  if (status !== "idle") {
    const already = status === "already";
    return (
      <div
        data-testid="mailing-list-success"
        data-already={already ? "true" : "false"}
        className="flex items-start gap-2.5 rounded-xl bg-brass/10 px-4 py-3.5 text-sm text-ink ring-1 ring-brass/25"
      >
        <MailIcon className="size-5 shrink-0 text-brass" />
        <span>
          <span className="font-medium">
            {already ? "You're already on the list" : "You're on the list"}
          </span>{" "}
          {already
            ? "— this address is already signed up, so we won't add it twice. We'll be in touch when the real Hope Chest opens."
            : "— thanks! We'll email you the moment the real Hope Chest is ready."}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <form className="flex flex-col gap-2 sm:flex-row" onSubmit={onSubmit}>
        <input
          type="email"
          name="email"
          data-testid="mailing-list-email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="h-11 flex-1 rounded-full border border-hairline bg-cream px-5 text-[15px] text-ink placeholder:text-ink-soft/50 focus:border-sepia focus:outline-none focus:ring-2 focus:ring-sepia/20"
        />
        <button
          type="submit"
          disabled={pending}
          data-testid="mailing-list-submit"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-sepia px-6 text-sm font-medium text-cream transition-colors hover:bg-walnut disabled:opacity-70"
        >
          <MailIcon className="size-4.5" />
          {pending ? "Signing up…" : "Notify me"}
        </button>
      </form>
      {errors.length > 0 && (
        <ul
          data-testid="mailing-list-errors"
          className="space-y-1 rounded-lg bg-rosewood/10 px-3.5 py-2.5 text-sm text-rosewood ring-1 ring-rosewood/25"
        >
          {errors.map((err) => (
            <li key={err}>{err}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
