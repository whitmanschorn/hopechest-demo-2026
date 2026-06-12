import type { Metadata } from "next";
import Link from "next/link";

import { FauxAuthButton } from "@/components/FauxAuthButton";
import { ChestIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Create your chest" };

const FIELDS = [
  { label: "Your name", type: "text", placeholder: "Margaret Whitfield" },
  { label: "Email", type: "email", placeholder: "you@example.com" },
  { label: "Password", type: "password", placeholder: "••••••••" },
] as const;

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
          <p className="mt-1 text-sm text-ink-soft">
            A safe place for everything your family wants to keep.
          </p>
          <div className="mt-6 flex flex-col gap-4">
            {FIELDS.map((f) => (
              <label key={f.label} className="block">
                <span className="mb-1.5 block text-sm font-medium text-ink">
                  {f.label}
                </span>
                <input
                  type={f.type}
                  placeholder={f.placeholder}
                  className="h-11 w-full rounded-lg border border-hairline bg-parchment px-3.5 text-[15px] text-ink placeholder:text-ink-soft/50 focus:border-sepia focus:outline-none focus:ring-2 focus:ring-sepia/20"
                />
              </label>
            ))}
            <FauxAuthButton
              label="Create my chest"
              busyLabel="Setting things up…"
              className="mt-1 w-full"
            />
          </div>
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
