import type { Metadata } from "next";
import Link from "next/link";

import { ChevronLeftIcon, HistoryIcon } from "@/components/icons";
import { changelogForPerson, getPerson, people } from "@/data";
import { FIELD_LABELS, isEditablePersonField } from "@/data/db/personEdits";
import type { Changelog } from "@/data";

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
  return { title: `History · ${getPerson(personId).name}` };
}

const SPECIAL_FIELD_LABELS: Record<string, string> = {
  "(created)": "Added life event",
  "(edited)": "Edited life event",
  "(deleted)": "Removed life event",
};

function fieldLabel(field: string): string {
  if (isEditablePersonField(field)) return FIELD_LABELS[field];
  return SPECIAL_FIELD_LABELS[field] ?? field;
}

const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function formatEditedAt(iso: string): string {
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? iso : dateFormat.format(parsed);
}

function editorName(editedById: string): string {
  try {
    return getPerson(editedById).name;
  } catch {
    return "Someone";
  }
}

function RevisionRow({ entry }: { entry: Changelog }) {
  return (
    <li className="flex flex-col gap-1 rounded-xl bg-cream px-5 py-4 ring-1 ring-hairline">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-[15px] text-ink">
          <span className="font-medium text-walnut">{editorName(entry.editedById)}</span>{" "}
          <span className="text-ink-soft">{entry.summary ?? `changed ${fieldLabel(entry.field).toLowerCase()}`}</span>
        </p>
        <time className="text-xs text-ink-soft" dateTime={entry.editedAt}>
          {formatEditedAt(entry.editedAt)}
        </time>
      </div>
      <p className="text-sm">
        <span className="font-medium text-ink-soft">{fieldLabel(entry.field)}:</span>{" "}
        {entry.before ? (
          <span className="text-rosewood line-through decoration-rosewood/50">{entry.before}</span>
        ) : (
          <span className="text-ink-soft/70 italic">empty</span>
        )}
        <span className="mx-1.5 text-ink-soft">→</span>
        {entry.after ? (
          <span className="text-ink">{entry.after}</span>
        ) : (
          <span className="text-ink-soft/70 italic">empty</span>
        )}
      </p>
    </li>
  );
}

export default async function PersonHistory({
  params,
}: {
  params: Promise<{ personId: string }>;
}) {
  const { personId } = await params;
  const person = getPerson(personId);
  const revisions = changelogForPerson(personId);

  return (
    <>
      <Link
        href={`/people/${person.id}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-ink-soft transition-colors hover:text-sepia"
      >
        <ChevronLeftIcon className="size-4" />
        Back to {person.shortName}
      </Link>

      <h1 className="flex items-center gap-2 font-display text-3xl font-semibold tracking-tight text-walnut">
        <HistoryIcon className="size-6 text-brass" />
        Revision history
      </h1>
      <p className="mt-1 text-[15px] text-ink-soft">
        Every change to {person.name}&rsquo;s details and life events, newest first.
      </p>

      {revisions.length > 0 ? (
        <ol className="mt-6 flex flex-col gap-2.5">
          {revisions.map((entry) => (
            <RevisionRow key={entry.id} entry={entry} />
          ))}
        </ol>
      ) : (
        <div className="mt-6 rounded-xl bg-cream px-6 py-12 text-center ring-1 ring-hairline">
          <p className="font-display text-lg text-walnut">No changes yet</p>
          <p className="mt-1 text-sm text-ink-soft">
            Edits to {person.shortName}&rsquo;s details will show up here.
          </p>
        </div>
      )}
    </>
  );
}
