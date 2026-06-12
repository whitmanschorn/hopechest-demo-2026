"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Demo theater: brief spinner, then into the app. No real auth. */
export function FauxAuthButton({
  label,
  busyLabel,
  className = "",
}: {
  label: string;
  busyLabel: string;
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => {
        setBusy(true);
        setTimeout(() => router.push("/home"), 650);
      }}
      className={`inline-flex h-12 items-center justify-center gap-2 rounded-full bg-sepia px-7 text-[15px] font-medium text-cream transition-colors hover:bg-walnut disabled:opacity-80 ${className}`}
    >
      {busy ? (
        <>
          <span className="size-4 animate-spin rounded-full border-2 border-cream/40 border-t-cream" />
          {busyLabel}
        </>
      ) : (
        label
      )}
    </button>
  );
}
