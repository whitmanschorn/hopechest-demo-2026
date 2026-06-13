"use client";

import { useState, useTransition } from "react";

import type { LifeEventKind, Location } from "@/data";
import type { ActionResult, LifeEventInput } from "@/app/(app)/people/[personId]/actions";

const KIND_OPTIONS: { value: LifeEventKind; label: string }[] = [
  { value: "birth", label: "Birth" },
  { value: "death", label: "Death" },
  { value: "marriage", label: "Marriage" },
  { value: "immigration", label: "Immigration" },
  { value: "residence", label: "Residence" },
  { value: "military", label: "Military" },
  { value: "education", label: "Education" },
  { value: "work", label: "Work" },
  { value: "other", label: "Other" },
];

const fieldClass =
  "h-10 w-full rounded-lg border border-hairline bg-cream px-3 text-[15px] text-ink placeholder:text-ink-soft/50 focus:border-sepia focus:outline-none focus:ring-2 focus:ring-sepia/20";

export function LifeEventForm({
  locations,
  initial,
  submitLabel,
  onSubmit,
  onDone,
  onCancel,
}: {
  locations: Location[];
  initial?: Partial<LifeEventInput>;
  submitLabel: string;
  onSubmit: (input: LifeEventInput) => Promise<ActionResult>;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [kind, setKind] = useState<string>(initial?.kind ?? "other");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [dateInput, setDateInput] = useState(initial?.dateInput ?? "");
  const [locationId, setLocationId] = useState(initial?.locationId ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [errors, setErrors] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const result = await onSubmit({
        kind,
        title,
        dateInput,
        locationId: locationId || undefined,
        description: description || undefined,
      });
      if (result.ok) {
        onDone();
      } else {
        setErrors(result.errors ?? ["Something went wrong."]);
      }
    });
  }

  return (
    <div className="rounded-xl bg-cream p-4 ring-1 ring-hairline">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-ink-soft">Type</span>
          <select className={fieldClass} value={kind} onChange={(e) => setKind(e.target.value)}>
            {KIND_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-ink-soft">Date</span>
          <input
            className={fieldClass}
            value={dateInput}
            placeholder="1950, 1950-06, or circa 1950"
            onChange={(e) => setDateInput(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-xs uppercase tracking-wide text-ink-soft">Title</span>
          <input
            className={fieldClass}
            value={title}
            placeholder="e.g. Married at St. Mary's"
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-xs uppercase tracking-wide text-ink-soft">Place (optional)</span>
          <select className={fieldClass} value={locationId} onChange={(e) => setLocationId(e.target.value)}>
            <option value="">— none —</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-xs uppercase tracking-wide text-ink-soft">Description (optional)</span>
          <textarea
            className="min-h-20 w-full resize-y rounded-lg border border-hairline bg-cream px-3 py-2 text-[15px] text-ink placeholder:text-ink-soft/50 focus:border-sepia focus:outline-none focus:ring-2 focus:ring-sepia/20"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
      </div>
      {errors.length > 0 ? (
        <ul className="mt-3 space-y-1 rounded-lg bg-rosewood/10 px-3.5 py-2.5 text-sm text-rosewood ring-1 ring-rosewood/25">
          {errors.map((err) => (
            <li key={err}>{err}</li>
          ))}
        </ul>
      ) : null}
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={isPending}
          className="inline-flex h-9 items-center rounded-full bg-sepia px-4 text-sm font-medium text-cream transition-colors hover:bg-walnut disabled:opacity-50"
        >
          {isPending ? "Saving…" : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="inline-flex h-9 items-center rounded-full px-3.5 text-sm text-ink-soft transition-colors hover:text-sepia disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
