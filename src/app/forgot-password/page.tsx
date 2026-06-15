import type { Metadata } from "next";
import Link from "next/link";

import { ChestIcon, MailIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Trouble signing in" };

export default function ForgotPassword() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-7 flex items-center justify-center gap-2">
          <ChestIcon className="size-7 text-sepia" />
          <span className="font-display text-2xl font-semibold tracking-tight text-walnut">
            Hopechest
          </span>
        </Link>
        <div className="rounded-2xl bg-cream p-7 text-center shadow-xl shadow-walnut/10 ring-1 ring-hairline">
          <span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-sepia/10">
            <MailIcon className="size-6 text-sepia" />
          </span>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-walnut">
            No passwords here
          </h1>
          <p className="mt-2 text-sm leading-6 text-ink-soft">
            Hopechest signs you in with your phone number and a one-time code —
            there&rsquo;s nothing to reset. Head back and enter your number to
            get a fresh code.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-full border border-sepia/40 px-6 text-sm font-medium text-sepia transition-colors hover:bg-sepia/10"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
