import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "@/components/LoginForm";
import { ChestIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Create your chest" };

export default function Signup() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-7 flex items-center justify-center gap-2">
          <ChestIcon className="size-7 text-sepia" />
          <span className="font-display text-2xl font-semibold tracking-tight text-walnut">
            Hopechest
          </span>
        </Link>
        <div className="rounded-2xl bg-cream p-7 shadow-xl shadow-walnut/10 ring-1 ring-hairline">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-walnut">
            Create your chest
          </h1>
          <p className="mb-6 mt-1 text-sm text-ink-soft">
            Enter your phone number — we&rsquo;ll text you a one-time code (shown
            on screen in this demo). No passwords, ever.
          </p>
          <LoginForm cta="Send my code" />
        </div>
        <p className="mt-5 text-center text-sm text-ink-soft">
          Already have a chest?{" "}
          <Link
            href="/"
            className="font-medium text-sepia underline decoration-hairline underline-offset-4"
          >
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
