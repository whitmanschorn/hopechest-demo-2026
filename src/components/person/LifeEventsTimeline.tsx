"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Badge } from "@/components/Badge";
import { CalendarIcon, PencilIcon, PlusIcon, TrashIcon } from "@/components/icons";
import { LifeEventForm } from "./LifeEventForm";
import { addLifeEvent, editLifeEvent, removeLifeEvent } from "@/app/(app)/people/[personId]/actions";
import type { LifeEventInput } from "@/app/(app)/people/[personId]/actions";
import { formatDate, type FuzzyDate, type LifeEvent, type LifeEventKind, type Location } from "@/data";

const KIND_TONE: Record<LifeEventKind, "brass" | "sepia" | "rosewood" | "plain"> = {
  birth: "brass",
  marriage: "sepia",
  death: "rosewood",
  immigration: "sepia",
  residence: "plain",
  military: "plain",
  education: "plain",
  work: "plain",
  other: "plain",
};

const KIND_LABEL: Record<LifeEventKind, string> = {
  birth: "Birth",
  marriage: "Marriage",
  death: "Death",
  immigration: "Immigration",
  residence: "Residence",
  military: "Military",
  education: "Education",
  work: "Work",
  other: "Event",
};

/** Best re-parseable input string for an existing fuzzy date (for the edit form). */
function fuzzyToInput(date: FuzzyDate): string {
  if (date.precision === "day" && date.iso) return date.iso;
  if (date.precision === "month" && date.year && date.month) {
    return `${date.year}-${String(date.month).padStart(2, "0")}`;
  }
  if (date.precision === "year" && date.year) return String(date.year);
  if (date.precision === "circa" && date.year) return `circa ${date.year}`;
  return date.display;
}

function eventToInput(event: LifeEvent): LifeEventInput {
  return {
    kind: event.kind,
    title: event.title,
    dateInput: fuzzyToInput(event.date),
    locationId: event.locationId ?? undefined,
    description: event.description ?? undefined,
  };
}

export function LifeEventsTimeline({
  personId,
  events,
  locations,
}: {
  personId: string;
  events: LifeEvent[];
  locations: Location[];
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function done() {
    setAdding(false);
    setEditingId(null);
    router.refresh();
  }

  function remove(eventId: string) {
    if (!window.confirm("Remove this life event? The change is kept in the history.")) return;
    startTransition(async () => {
      await removeLifeEvent(personId, eventId);
      router.refresh();
    });
  }

  return (
    <section className="mt-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight text-walnut">
          <CalendarIcon className="size-5 text-brass" />
          Life events
        </h2>
        {!adding ? (
          <button
            type="button"
            onClick={() => {
              setEditingId(null);
              setAdding(true);
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium text-sepia ring-1 ring-hairline transition-colors hover:bg-cream hover:ring-sepia/40"
          >
            <PlusIcon className="size-4" />
            Add life event
          </button>
        ) : null}
      </div>

      {adding ? (
        <div className="mb-5">
          <LifeEventForm
            locations={locations}
            submitLabel="Add event"
            onSubmit={(input) => addLifeEvent(personId, input)}
            onDone={done}
            onCancel={() => setAdding(false)}
          />
        </div>
      ) : null}

      {events.length === 0 && !adding ? (
        <div className="rounded-xl bg-cream px-6 py-10 text-center ring-1 ring-hairline">
          <p className="font-display text-lg text-walnut">No life events yet</p>
          <p className="mt-1 text-sm text-ink-soft">
            Add births, marriages, moves, and milestones to build a timeline.
          </p>
        </div>
      ) : (
        <ol className="relative ml-1 border-l border-hairline">
          {events.map((event) =>
            editingId === event.id ? (
              <li key={event.id} className="ml-5 pb-6">
                <LifeEventForm
                  locations={locations}
                  initial={eventToInput(event)}
                  submitLabel="Save event"
                  onSubmit={(input) => editLifeEvent(personId, event.id, input)}
                  onDone={done}
                  onCancel={() => setEditingId(null)}
                />
              </li>
            ) : (
              <li key={event.id} className="group relative ml-5 pb-6 last:pb-0">
                <span className="absolute -left-[1.4rem] top-1.5 size-2.5 rounded-full bg-sepia ring-4 ring-parchment" />
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium uppercase tracking-wide text-ink-soft">
                        {formatDate(event.date)}
                      </span>
                      <Badge tone={KIND_TONE[event.kind]}>{KIND_LABEL[event.kind]}</Badge>
                    </div>
                    <p className="mt-1 text-[15px] font-medium text-ink">{event.title}</p>
                    {event.location ? (
                      <Link
                        href={`/locations/${event.location.id}`}
                        className="text-sm text-sepia underline decoration-hairline underline-offset-2 transition-colors hover:text-walnut"
                      >
                        {event.location.label}
                      </Link>
                    ) : null}
                    {event.description ? (
                      <p className="mt-1 text-sm leading-6 text-ink-soft">{event.description}</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      aria-label="Edit event"
                      onClick={() => {
                        setAdding(false);
                        setEditingId(event.id);
                      }}
                      className="inline-flex size-8 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-cream hover:text-sepia"
                    >
                      <PencilIcon className="size-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Delete event"
                      disabled={isPending}
                      onClick={() => remove(event.id)}
                      className="inline-flex size-8 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-cream hover:text-rosewood disabled:opacity-50"
                    >
                      <TrashIcon className="size-4" />
                    </button>
                  </div>
                </div>
              </li>
            ),
          )}
        </ol>
      )}
    </section>
  );
}
