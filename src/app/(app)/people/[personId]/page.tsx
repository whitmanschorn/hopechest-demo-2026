import type { Metadata } from "next";
import Link from "next/link";

import { Img } from "@/components/Img";
import { PhotoGrid } from "@/components/PhotoGrid";
import { PersonHeaderEditor } from "@/components/person/PersonHeaderEditor";
import { LifeEventsTimeline } from "@/components/person/LifeEventsTimeline";
import { ChevronLeftIcon, HistoryIcon, PeopleIcon } from "@/components/icons";
import {
  describeRelationshipTo,
  getLocations,
  getPerson,
  getPhoto,
  lifeEventsForPerson,
  photosForPerson,
} from "@/data";
import { requireCurrentPerson } from "@/lib/auth/session";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ personId: string }>;
}): Promise<Metadata> {
  const { personId } = await params;
  return { title: (await getPerson(personId)).name };
}

export default async function PersonView({
  params,
}: {
  params: Promise<{ personId: string }>;
}) {
  const { personId } = await params;
  const me = await requireCurrentPerson();
  const person = await getPerson(personId);
  const tagged = await photosForPerson(personId);
  const lifeEvents = await lifeEventsForPerson(personId);
  const locations = await getLocations();
  const years =
    tagged.length > 1 && tagged[0].date.year && tagged[tagged.length - 1].date.year
      ? `${tagged[0].date.year}–${tagged[tagged.length - 1].date.year}`
      : null;

  const isMe = person.id === me.id;
  const relationship = isMe ? null : await describeRelationshipTo(me.id, person.id);
  const suggestion = person.suggestedMatchPhotoId
    ? await getPhoto(person.suggestedMatchPhotoId)
    : null;

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link
          href="/people"
          className="inline-flex items-center gap-1 text-sm text-ink-soft transition-colors hover:text-sepia"
        >
          <ChevronLeftIcon className="size-4" />
          All people
        </Link>
        <Link
          href={`/people/${person.id}/history`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft transition-colors hover:text-sepia"
        >
          <HistoryIcon className="size-4" />
          View history
        </Link>
      </div>

      <PersonHeaderEditor
        person={person}
        relationship={relationship}
        isMe={isMe}
        taggedCount={tagged.length}
        years={years}
      />

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

      <LifeEventsTimeline personId={person.id} events={lifeEvents} locations={locations} />
    </>
  );
}
