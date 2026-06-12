import Link from "next/link";

import { InitialsAvatar } from "./InitialsAvatar";
import type { Person } from "@/data";

export function PersonChip({
  person,
  detail,
}: {
  person: Person;
  detail?: string;
}) {
  return (
    <Link
      href={`/people/${person.id}`}
      className="inline-flex items-center gap-2 rounded-full bg-cream py-1 pl-1 pr-3 ring-1 ring-hairline transition-colors hover:ring-sepia/40"
    >
      <InitialsAvatar person={person} size="sm" />
      <span className="text-sm font-medium text-ink">{person.shortName}</span>
      {detail ? <span className="text-xs text-ink-soft">{detail}</span> : null}
    </Link>
  );
}
