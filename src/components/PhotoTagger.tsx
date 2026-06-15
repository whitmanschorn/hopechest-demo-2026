"use client";

import { useMemo, useState } from "react";

import { InitialsAvatar } from "./InitialsAvatar";
import { Img } from "./Img";
import { centeredBox } from "@/data/db/faceTag";
import type { FaceBox, Person } from "@/data/db/schema";

export interface DraftTag {
  personId: string;
  box: FaceBox;
}

/**
 * Click-to-tag interaction, reused by the photo-view modal and the upload
 * preview. Click a point on the image → a default-size box drops there → pick
 * the person from a filterable list. The parent owns persistence (props
 * onAdd/onRemove); this component is otherwise stateless about storage.
 */
export function PhotoTagger({
  src,
  width,
  height,
  people,
  tags,
  onAdd,
  onRemove,
  onCreatePerson,
  busy = false,
}: {
  src: string;
  width: number;
  height: number;
  people: Person[];
  tags: DraftTag[];
  onAdd: (personId: string, box: FaceBox) => void;
  onRemove: (personId: string) => void;
  /** Create a family member not yet in the chest, then tag them. Returns the
   * new person, or null if creation failed. */
  onCreatePerson: (input: { name: string; gender: string; relation?: string }) => Promise<Person | null>;
  busy?: boolean;
}) {
  const [pending, setPending] = useState<FaceBox | null>(null);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [newGender, setNewGender] = useState<"" | "f" | "m">("");
  const [createBusy, setCreateBusy] = useState(false);

  function resetPicker() {
    setPending(null);
    setQuery("");
    setCreating(false);
    setNewGender("");
  }

  async function createAndPick() {
    if (!pending || !query.trim() || !newGender || createBusy) return;
    setCreateBusy(true);
    const person = await onCreatePerson({ name: query.trim(), gender: newGender });
    setCreateBusy(false);
    if (person) {
      onAdd(person.id, pending);
      resetPicker();
    }
  }

  const peopleById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const taggedIds = useMemo(() => new Set(tags.map((t) => t.personId)), [tags]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return people
      .filter((p) => !taggedIds.has(p.id))
      .filter((p) =>
        !q ||
        [p.name, p.shortName, ...(p.nicknames ?? [])].some((n) => n.toLowerCase().includes(q)),
      )
      .slice(0, 8);
  }, [people, taggedIds, query]);

  function placeAt(e: React.MouseEvent<HTMLElement>) {
    if (busy) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;
    setPending(centeredBox(xPct, yPct));
    setQuery("");
  }

  function pick(personId: string) {
    if (!pending) return;
    onAdd(personId, pending);
    resetPicker();
  }

  const boxes: { box: FaceBox; label: string; pending?: boolean }[] = [
    ...tags.map((t) => ({ box: t.box, label: peopleById.get(t.personId)?.shortName ?? "?" })),
    ...(pending ? [{ box: pending, label: "New tag", pending: true }] : []),
  ];

  return (
    <div>
      <div
        data-testid="tagger-image"
        onClick={placeAt}
        className="relative cursor-crosshair overflow-hidden rounded-xl ring-1 ring-hairline"
      >
        <Img src={src} alt="" width={width} height={height} className="block w-full select-none" />
        {boxes.map((b, i) => (
          <span
            key={i}
            className={`absolute rounded-md border-2 ${b.pending ? "border-dashed border-brass" : "border-cream/90"}`}
            style={{ left: `${b.box.x}%`, top: `${b.box.y}%`, width: `${b.box.w}%`, height: `${b.box.h}%` }}
          >
            <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-walnut/90 px-2 py-0.5 text-xs font-medium text-cream shadow">
              {b.label}
            </span>
          </span>
        ))}
      </div>

      {/* existing tags + remove */}
      {tags.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tags.map((t) => {
            const person = peopleById.get(t.personId);
            return (
              <span key={t.personId} className="inline-flex items-center gap-1.5 rounded-full bg-cream py-1 pl-1 pr-2 ring-1 ring-hairline">
                {person ? <InitialsAvatar person={person} size="sm" /> : null}
                <span className="text-sm font-medium text-ink">{person?.shortName ?? t.personId}</span>
                <button
                  type="button"
                  data-testid="tagger-remove"
                  aria-label={`Remove ${person?.shortName ?? "tag"}`}
                  onClick={() => onRemove(t.personId)}
                  disabled={busy}
                  className="flex size-5 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-rosewood/15 hover:text-rosewood disabled:opacity-50"
                >
                  ✕
                </button>
              </span>
            );
          })}
        </div>
      ) : null}

      {/* person picker (after a click places a box) */}
      {pending ? (
        <div className="mt-3 rounded-xl bg-parchment p-3 ring-1 ring-hairline">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-ink">{creating ? "Add a new person" : "Who is this?"}</span>
            <button type="button" onClick={resetPicker} className="text-sm text-ink-soft hover:text-sepia">
              Cancel
            </button>
          </div>
          <input
            data-testid="tagger-search"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={creating ? "Full name" : "Search people…"}
            className="mb-2 h-10 w-full rounded-lg border border-hairline bg-cream px-3 text-[15px] text-ink placeholder:text-ink-soft/50 focus:border-sepia focus:outline-none focus:ring-2 focus:ring-sepia/20"
          />

          {creating ? (
            // New-person mini-form: the search box above is the name; capture the
            // gender the schema/kinship require (relation defaults, editable later).
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                {(["f", "m"] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    data-testid={`tagger-gender-${g}`}
                    aria-pressed={newGender === g}
                    onClick={() => setNewGender(g)}
                    className={`h-9 flex-1 rounded-lg text-sm ring-1 transition-colors ${
                      newGender === g ? "bg-sepia/15 ring-sepia/40 text-ink" : "bg-cream ring-hairline text-ink-soft hover:ring-sepia/30"
                    }`}
                  >
                    {g === "f" ? "Female" : "Male"}
                  </button>
                ))}
              </div>
              <button
                type="button"
                data-testid="tagger-create"
                onClick={createAndPick}
                disabled={!query.trim() || !newGender || createBusy}
                className="inline-flex h-10 items-center justify-center rounded-full bg-sepia px-5 text-sm font-medium text-cream transition-colors hover:bg-walnut disabled:opacity-50"
              >
                {createBusy ? "Adding…" : "Add & tag"}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {matches.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  data-testid="tagger-person"
                  onClick={() => pick(p.id)}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-sepia/10"
                >
                  <InitialsAvatar person={p} size="sm" />
                  <span className="text-sm text-ink">{p.name}</span>
                  <span className="ml-auto text-xs text-ink-soft">{p.relation}</span>
                </button>
              ))}
              <button
                type="button"
                data-testid="tagger-add-new"
                onClick={() => setCreating(true)}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm font-medium text-sepia transition-colors hover:bg-sepia/10"
              >
                <span className="flex size-7 items-center justify-center rounded-full bg-sepia/10">＋</span>
                {query.trim() ? `Add “${query.trim()}” as a new person` : "Add someone new"}
              </button>
            </div>
          )}
        </div>
      ) : (
        <p className="mt-2 text-sm text-ink-soft">Click a face on the photo to tag who it is.</p>
      )}
    </div>
  );
}
