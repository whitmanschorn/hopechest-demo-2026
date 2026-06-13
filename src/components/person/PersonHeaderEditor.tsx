"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { InitialsAvatar } from "@/components/InitialsAvatar";
import { PencilIcon } from "@/components/icons";
import { updatePersonFields } from "@/app/(app)/people/[personId]/actions";
import {
  EDITABLE_PERSON_FIELDS,
  FIELD_LABELS,
  isArrayField,
  type EditablePersonField,
} from "@/data/db/personEdits";
import type { Person } from "@/data";

const inputClass =
  "h-10 w-full rounded-lg border border-hairline bg-cream px-3 text-[15px] text-ink placeholder:text-ink-soft/50 focus:border-sepia focus:outline-none focus:ring-2 focus:ring-sepia/20";

/** The order fields appear in the edit form. */
const FORM_FIELDS: EditablePersonField[] = [...EDITABLE_PERSON_FIELDS];

function fieldToInputValue(person: Person, field: EditablePersonField): string {
  const value = person[field];
  if (Array.isArray(value)) return value.join(", ");
  return (value as string | undefined) ?? "";
}

export function PersonHeaderEditor({
  person,
  relationship,
  isMe,
  taggedCount,
  years,
}: {
  person: Person;
  relationship: string | null;
  isMe: boolean;
  taggedCount: number;
  years: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  function startEditing() {
    const seed: Record<string, string> = {};
    for (const field of FORM_FIELDS) seed[field] = fieldToInputValue(person, field);
    setValues(seed);
    setErrors([]);
    setEditing(true);
  }

  function save() {
    const updates = FORM_FIELDS.map((field) => ({ field, value: values[field] ?? "" }));
    startTransition(async () => {
      const result = await updatePersonFields(person.id, updates);
      if (result.ok) {
        setEditing(false);
        router.refresh();
      } else {
        setErrors(result.errors ?? ["Something went wrong."]);
      }
    });
  }

  // Identity history: every name the family knows them by.
  const aka: { label: string; value: string }[] = [];
  if (person.fullName !== person.name) aka.push({ label: "Full name", value: person.fullName });
  if (person.maidenName) aka.push({ label: "Born", value: `${person.name.split(" ")[0]} ${person.maidenName}` });
  if (person.nicknames?.length) aka.push({ label: "Nicknames", value: person.nicknames.join(", ") });
  if (person.alternateNames?.length) aka.push({ label: "Also recorded as", value: person.alternateNames.join(", ") });

  if (editing) {
    return (
      <div className="mb-6 rounded-xl bg-cream p-5 ring-1 ring-hairline">
        <h2 className="mb-4 font-display text-lg font-semibold tracking-tight text-walnut">
          Editing {person.shortName}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {FORM_FIELDS.map((field) => (
            <label key={field} className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-ink-soft">
                {FIELD_LABELS[field]}
                {isArrayField(field) ? (
                  <span className="ml-1 normal-case tracking-normal text-ink-soft/70">(comma-separated)</span>
                ) : null}
              </span>
              <input
                className={inputClass}
                value={values[field] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [field]: e.target.value }))}
              />
            </label>
          ))}
        </div>
        {errors.length > 0 ? (
          <ul className="mt-4 space-y-1 rounded-lg bg-rosewood/10 px-3.5 py-2.5 text-sm text-rosewood ring-1 ring-rosewood/25">
            {errors.map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        ) : null}
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={save}
            disabled={isPending}
            className="inline-flex h-10 items-center rounded-full bg-sepia px-5 text-sm font-medium text-cream transition-colors hover:bg-walnut disabled:opacity-50"
          >
            {isPending ? "Saving…" : "Save changes"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            disabled={isPending}
            className="inline-flex h-10 items-center rounded-full px-4 text-sm text-ink-soft transition-colors hover:text-sepia disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="flex items-start gap-5">
        <InitialsAvatar person={person} size="xl" />
        <div className="flex-1">
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
            {taggedCount > 0 ? ` · tagged in ${taggedCount} photo${taggedCount > 1 ? "s" : ""}` : ""}
            {years ? ` spanning ${years}` : ""}
          </p>
          {relationship ? (
            <p className="mt-1 text-[15px] font-medium text-sepia">{relationship}.</p>
          ) : isMe ? (
            <p className="mt-1 text-[15px] font-medium text-sepia">This is you.</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={startEditing}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium text-sepia ring-1 ring-hairline transition-colors hover:bg-cream hover:ring-sepia/40"
        >
          <PencilIcon className="size-4" />
          Edit
        </button>
      </div>

      {aka.length > 0 ? (
        <dl className="mt-5 grid gap-x-6 gap-y-2 rounded-xl bg-cream px-5 py-4 ring-1 ring-hairline sm:grid-cols-2">
          {aka.map((row) => (
            <div key={row.label} className="flex flex-col">
              <dt className="text-xs uppercase tracking-wide text-ink-soft">{row.label}</dt>
              <dd className="text-[15px] text-ink">{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}
