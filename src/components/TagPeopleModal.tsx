"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { PhotoTagger, type DraftTag } from "./PhotoTagger";
import { PeopleIcon } from "./icons";
import { tagPerson, untagPerson } from "@/app/(app)/photos/[photoId]/actions";
import { createPerson } from "@/app/(app)/people/actions";
import type { FaceBox, Person } from "@/data/db/schema";

/** "Tag people" button + modal on the photo view page. Wraps PhotoTagger over
 * the persisted photo and writes each add/remove straight to the DB. */
export function TagPeopleModal({
  photoId,
  src,
  width,
  height,
  people,
  initialTags,
}: {
  photoId: string;
  src: string;
  width: number;
  height: number;
  people: Person[];
  initialTags: DraftTag[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tags, setTags] = useState<DraftTag[]>(initialTags);
  const [roster, setRoster] = useState<Person[]>(people);
  const [isPending, startTransition] = useTransition();

  async function createAndAppend(input: { name: string; gender: string; relation?: string }): Promise<Person | null> {
    const result = await createPerson(input);
    if (!result.ok || !result.person) return null;
    setRoster((prev) => [...prev, result.person!]);
    router.refresh();
    return result.person;
  }

  function add(personId: string, box: FaceBox) {
    setTags((prev) => [...prev, { personId, box }]); // optimistic
    startTransition(async () => {
      const result = await tagPerson(photoId, personId, box);
      if (!result.ok) setTags((prev) => prev.filter((t) => t.personId !== personId));
      router.refresh();
    });
  }

  function remove(personId: string) {
    const removed = tags.find((t) => t.personId === personId);
    setTags((prev) => prev.filter((t) => t.personId !== personId)); // optimistic
    startTransition(async () => {
      const result = await untagPerson(photoId, personId);
      if (!result.ok && removed) setTags((prev) => [...prev, removed]);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        data-testid="tag-people-button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium text-sepia ring-1 ring-hairline transition-colors hover:bg-cream hover:ring-sepia/40"
      >
        <PeopleIcon className="size-4" />
        Tag people
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-walnut/50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            data-testid="tag-people-modal"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-cream p-5 ring-1 ring-hairline"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold tracking-tight text-walnut">Tag people</h2>
              <button type="button" onClick={() => setOpen(false)} className="text-sm text-ink-soft hover:text-sepia">
                Done
              </button>
            </div>
            <PhotoTagger
              src={src}
              width={width}
              height={height}
              people={roster}
              tags={tags}
              onAdd={add}
              onRemove={remove}
              onCreatePerson={createAndAppend}
              busy={isPending}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
