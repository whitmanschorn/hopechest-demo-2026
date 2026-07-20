import Link from "next/link";

/**
 * Site-wide demo announcement bar. Fixed to the very top of every page (rendered
 * once in RootLayout, above both the public pages and the app shell). Its height
 * is the `--banner-h` CSS var from globals.css: RootLayout reserves it with a
 * matching body padding-top, and AppShell offsets its own fixed sidebar/header
 * down by the same amount so nothing hides behind the bar.
 */
export function DemoBanner() {
  return (
    <div className="fixed inset-x-0 top-0 z-40 flex h-[var(--banner-h)] items-center justify-center gap-x-1.5 bg-walnut px-4 text-center text-cream">
      <Link
        href="/mailing-list"
        data-testid="demo-banner"
        className="group inline-flex items-center gap-1.5 text-xs sm:text-sm"
      >
        <span className="font-medium">
          <span className="sm:hidden">Demo — the real Hope Chest is coming soon.</span>
          <span className="hidden sm:inline">
            You&rsquo;re viewing a demo. The real Hope Chest is coming soon.
          </span>
        </span>
        <span className="whitespace-nowrap font-medium text-brass underline decoration-brass/40 underline-offset-4 transition-colors group-hover:text-cream group-hover:decoration-cream/60">
          Join the mailing list →
        </span>
      </Link>
    </div>
  );
}
