import type { Metadata } from "next";
import Link from "next/link";

import { Img } from "@/components/Img";
import { InitialsAvatar } from "@/components/InitialsAvatar";
import { PhotoGrid } from "@/components/PhotoGrid";
import { ChevronLeftIcon, PeopleIcon } from "@/components/icons";
import { getPerson, getPhoto, people, photosForPerson } from "@/data";

export const dynamicParams = false;

export function generateStaticParams() {
  return people.map((p) => ({ personId: p.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ personId: string }>;
}): Promise<Metadata> {
  const { personId } = await params;
  return { title: getPerson(personId).name };
}

export default async function PersonView({
  params,
}: {
  params: Promise<{ personId: string }>;
}) {
  const { personId } = await params;
  const person = getPerson(personId);
  const tagged = photosForPerson(personId);
  const years =
    tagged.length > 1
      ? `${tagged[0].era ?? ""} – ${tagged[tagged.length - 1].era ?? ""}`.replaceAll(
          "c. ",
          "",
        )
      : null;
  const suggestion = getPhoto("county-fair-1937");
  return (
    <>
      <Link
        href="/people"
        className="mb-4 inline-flex items-center gap-1 text-sm text-ink-soft transition-colors hover:text-sepia"
      >
        <ChevronLeftIcon className="size-4" />
        All people
      </Link>
      <div className="mb-7 flex items-center gap-5">
        <InitialsAvatar person={person} size="xl" />
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-walnut sm:text-4xl">
            {person.name}
            {person.maidenName ? (
              <span className="ml-2 align-middle font-display text-xl font-normal italic text-ink-soft">
                née {person.maidenName}
              </span>
            ) : null}
          </h1>
          <p className="mt-1 text-[15px] text-ink-soft">
            {person.fullName}
            {person.nicknames?.length
              ? ` · known as “${person.nicknames.join("”, “")}”`
              : ""}
          </p>
          <p className="mt-0.5 text-[15px] text-ink-soft">
            {person.relation}
            {person.lifespan ? ` · ${person.lifespan}` : ""}
            {tagged.length > 0
              ? ` · tagged in ${tagged.length} photo${tagged.length > 1 ? "s" : ""}`
              : ""}
            {years ? ` spanning ${years}` : ""}
          </p>
        </div>
      </div>

      {person.id === "klara" ? (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl bg-cream p-4 ring-1 ring-hairline">
          <PeopleIcon className="size-5 shrink-0 text-sepia" />
          <p className="min-w-48 flex-1 text-sm leading-6 text-ink">
            <span className="font-medium">Is this also Klara?</span> Hopechest
            found a possible match in the 1937 county fair photo.
          </p>
          <Link
            href={`/photos/${suggestion.id}`}
            className="flex items-center gap-3 rounded-lg bg-parchment p-1.5 pr-4 ring-1 ring-hairline transition-colors hover:ring-sepia/40"
          >
            <Img
              src={suggestion.src}
              alt={suggestion.title}
              width={suggestion.width}
              height={suggestion.height}
              className="h-12 w-16 rounded-md object-cover"
            />
            <span className="text-sm font-medium text-sepia">Review match</span>
          </Link>
        </div>
      ) : null}

      {tagged.length > 0 ? (
        <PhotoGrid photos={tagged} />
      ) : (
        <div className="rounded-xl bg-cream px-6 py-12 text-center ring-1 ring-hairline">
          <p className="font-display text-lg text-walnut">No tagged photos yet</p>
          <p className="mt-1 text-sm text-ink-soft">
            Upload photos and Hopechest will start recognizing{" "}
            {person.shortName}.
          </p>
        </div>
      )}
    </>
  );
}
