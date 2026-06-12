import Link from "next/link";

import { ChestIcon } from "@/components/icons";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <ChestIcon className="size-12 text-sepia/50" />
      <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight text-walnut">
        This memory isn&rsquo;t in the chest yet
      </h1>
      <p className="mt-2 max-w-sm text-[15px] leading-7 text-ink-soft">
        The page you&rsquo;re looking for doesn&rsquo;t exist — but the family
        archive is right this way.
      </p>
      <Link
        href="/home"
        className="mt-7 inline-flex h-11 items-center justify-center rounded-full bg-sepia px-6 text-sm font-medium text-cream transition-colors hover:bg-walnut"
      >
        Back to the chest
      </Link>
    </main>
  );
}
