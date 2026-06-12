import type { Metadata } from "next";
import Link from "next/link";

import { InitialsAvatar } from "@/components/InitialsAvatar";
import { SectionHeader } from "@/components/SectionHeader";
import { PeopleIcon } from "@/components/icons";
import { people, photosForPerson } from "@/data";

export const metadata: Metadata = { title: "People" };

export default function People() {
  return (
    <>
      <SectionHeader
        title="People"
        subtitle="Hopechest recognizes faces across decades — the same person at 2 and at 70."
      />
      <div className="mb-5 flex items-center gap-2.5 rounded-xl bg-cream px-4 py-3 ring-1 ring-hairline">
        <PeopleIcon className="size-5 shrink-0 text-sepia" />
        <p className="text-sm text-ink">
          <span className="font-medium">3 new face matches</span> are waiting
          for the family to confirm.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
        {people.map((person) => {
          const tagged = photosForPerson(person.id).length;
          return (
            <Link
              key={person.id}
              href={`/people/${person.id}`}
              className="group flex flex-col items-center rounded-xl bg-cream px-4 py-6 text-center ring-1 ring-hairline transition-shadow hover:shadow-lg hover:shadow-walnut/10"
            >
              <InitialsAvatar person={person} size="xl" />
              <span className="mt-3 font-display text-lg font-semibold tracking-tight text-walnut">
                {person.shortName}
              </span>
              <span className="text-sm text-ink-soft">{person.relation}</span>
              <span className="mt-2 text-xs text-ink-soft">
                {person.lifespan ? `${person.lifespan} · ` : ""}
                {tagged > 0
                  ? `${tagged} tagged photo${tagged > 1 ? "s" : ""}`
                  : "No tags yet"}
              </span>
            </Link>
          );
        })}
      </div>
    </>
  );
}
