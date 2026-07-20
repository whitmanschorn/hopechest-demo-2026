import type { Metadata } from "next";
import Link from "next/link";

import { MailingListForm } from "@/components/MailingListForm";
import { ChestIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Join the mailing list" };

export default function MailingList() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-7 flex items-center justify-center gap-2">
          <ChestIcon className="size-7 text-sepia" />
          <span className="font-display text-2xl font-semibold tracking-tight text-walnut">
            Hopechest
          </span>
        </Link>
        <div className="rounded-2xl bg-cream p-7 shadow-xl shadow-walnut/10 ring-1 ring-hairline">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-walnut sm:text-3xl">
            The real Hope Chest is coming soon
          </h1>
          <p className="mb-6 mt-2 text-[15px] leading-6 text-ink-soft">
            What you&rsquo;re browsing is an interactive demo built around a
            fictional family. Leave your email and we&rsquo;ll let you know the
            moment the real Hope Chest opens — no spam, just one note at launch.
          </p>
          <MailingListForm />
        </div>
        <p className="mt-5 text-center text-sm text-ink-soft">
          <Link
            href="/"
            className="font-medium text-sepia underline decoration-hairline underline-offset-4"
          >
            Back to the demo
          </Link>
        </p>
      </div>
    </main>
  );
}
