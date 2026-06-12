import Link from "next/link";

import { InitialsAvatar } from "./InitialsAvatar";
import type { Person } from "@/data";

/**
 * A resolved @mention: a smart link with a hover/focus preview card showing
 * who the mentioned person actually is.
 */
export function MentionLink({ person }: { person: Person }) {
  return (
    <span className="group/mention relative inline-block">
      <Link
        href={`/people/${person.id}`}
        className="rounded bg-cream/25 px-1 font-medium underline decoration-cream/60 decoration-2 underline-offset-2 hover:decoration-cream"
      >
        @{person.name}
      </Link>
      <span className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 w-56 -translate-x-1/2 scale-95 rounded-xl bg-cream p-3 text-left opacity-0 shadow-xl shadow-walnut/25 ring-1 ring-hairline transition-all duration-150 group-hover/mention:pointer-events-auto group-hover/mention:scale-100 group-hover/mention:opacity-100 group-focus-within/mention:pointer-events-auto group-focus-within/mention:scale-100 group-focus-within/mention:opacity-100">
        <span className="flex items-center gap-3">
          <InitialsAvatar person={person} size="lg" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-ink">
              {person.fullName}
            </span>
            {person.maidenName || person.nicknames?.length ? (
              <span className="block truncate text-xs italic text-ink-soft">
                {person.maidenName ? `née ${person.maidenName}` : ""}
                {person.maidenName && person.nicknames?.length ? " · " : ""}
                {person.nicknames?.length
                  ? `“${person.nicknames.join("”, “")}”`
                  : ""}
              </span>
            ) : null}
            <span className="block text-xs text-ink-soft">
              {person.relation}
              {person.lifespan ? ` · ${person.lifespan}` : ""}
            </span>
          </span>
        </span>
        <span className="mt-2 block border-t border-hairline pt-2 text-xs text-ink-soft">
          {person.photoCount > 0
            ? `In ${person.photoCount} photos in the chest`
            : "No photos in the chest yet"}{" "}
          · <span className="font-medium text-sepia">View profile →</span>
        </span>
      </span>
    </span>
  );
}
