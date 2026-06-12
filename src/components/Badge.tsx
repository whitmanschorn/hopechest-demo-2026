import type { ReactNode } from "react";

const TONES = {
  brass: "bg-brass/15 text-walnut ring-brass/30",
  sepia: "bg-sepia/10 text-sepia ring-sepia/25",
  rosewood: "bg-rosewood/10 text-rosewood ring-rosewood/25",
  plain: "bg-ink/5 text-ink-soft ring-hairline",
} as const;

export function Badge({
  tone = "plain",
  children,
  className = "",
}: {
  tone?: keyof typeof TONES;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
