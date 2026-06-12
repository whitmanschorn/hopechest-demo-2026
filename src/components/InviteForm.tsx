"use client";

import { useState } from "react";

import { MailIcon } from "./icons";

export function InviteForm() {
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");
  if (sent) {
    return (
      <div className="flex items-center gap-2.5 rounded-xl bg-brass/10 px-4 py-3.5 text-sm text-ink ring-1 ring-brass/25">
        <MailIcon className="size-5 shrink-0 text-brass" />
        <span>
          <span className="font-medium">Invite sent</span>
          {email ? ` to ${email}` : ""} — they&rsquo;ll join as a Viewer until
          an admin promotes them.
        </span>
      </div>
    );
  }
  return (
    <form
      className="flex flex-col gap-2 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault();
        setSent(true);
      }}
    >
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="cousin@example.com"
        className="h-11 flex-1 rounded-full border border-hairline bg-cream px-5 text-[15px] text-ink placeholder:text-ink-soft/50 focus:border-sepia focus:outline-none focus:ring-2 focus:ring-sepia/20"
      />
      <button
        type="submit"
        className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-sepia px-6 text-sm font-medium text-cream transition-colors hover:bg-walnut"
      >
        <MailIcon className="size-4.5" />
        Send invite
      </button>
    </form>
  );
}
