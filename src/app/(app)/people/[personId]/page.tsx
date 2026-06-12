import type { Metadata } from "next";
import Link from "next/link";

import { Img } from "@/components/Img";
import { InitialsAvatar } from "@/components/InitialsAvatar";
import { PhotoGrid } from "@/components/PhotoGrid";
import { ChevronLeftIcon, PeopleIcon } from "@/components/icons";
import {
  currentMemberId,
  describeRelationshipTo,
  getPerson,
  getPhoto,
  people,
  photosForPerson,
} from "@/data";

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
    tagged.length > 1 && tagged[0].date.year && tagged[tagged.length - 1].date.year
      ? `${tagged[0].date.year}–${tagged[tagged.length - 1].date.year}`
      : null;

  const isMe = person.id === currentMemberId;
  const relationship = isMe ? null : describeRelationshipTo(currentMemberId, person.id);
  const suggestion = person.suggestedMatchPhotoId
    ? getPhoto(person.suggestedMatchPhotoId)
    : null;

  // Identity history: every name the family knows them by.
  const aka: { label: string; value: string }[] = [];
  if (person.fullName !== person.name) aka.push({ label: "Full name", value: person.fullName });
  if (person.maidenName) aka.push({ label: "Born", value: `${person.name.split(" ")[0]} ${person.maidenName}` });
  if (person.nicknames?.length) aka.push({ label: "Nicknames", value: person.nicknames.join(", ") });
  if (person.alternateNames?.length) aka.push({ label: "Also recorded as", value: person.alternateNames.join(", ") });

  return (
    <>
      <Link
        href="/people"
        className="mb-4 inline-flex items-center gap-1 text-sm text-ink-soft transition-colors hover:text-sepia"
      >
        <ChevronLeftIcon className="size-4" />
        All people
      </Link>
      <div className="mb-6 flex items-center gap-5">
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
            {person.relation}
            {person.lifespan ? ` · ${person.lifespan}` : ""}
            {tagged.length > 0
              ? ` · tagged in ${tagged.length} photo${tagged.length > 1 ? "s" : ""}`
              : ""}
            {years ? ` spanning ${years}` : ""}
          </p>
          {relationship ? (
            <p className="mt-1 text-[15px] font-medium text-sepia">{relationship}.</p>
          ) : isMe ? (
            <p className="mt-1 text-[15px] font-medium text-sepia">This is you.</p>
          ) : null}
        </div>
      </div>

      {/* Identity history */}
      {aka.length > 0 ? (
        <dl className="mb-6 grid gap-x-6 gap-y-2 rounded-xl bg-cream px-5 py-4 ring-1 ring-hairline sm:grid-cols-2">
          {aka.map((row) => (
            <div key={row.label} className="flex flex-col">
              <dt className="text-xs uppercase tracking-wide text-ink-soft">{row.label}</dt>
              <dd className="text-[15px] text-ink">{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {suggestion ? (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl bg-cream p-4 ring-1 ring-hairline">
          <PeopleIcon className="size-5 shrink-0 text-sepia" />
          <p className="min-w-48 flex-1 text-sm leading-6 text-ink">
            <span className="font-medium">Is this also {person.shortName}?</span>{" "}
            Hopechest found a possible match in another photo.
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
