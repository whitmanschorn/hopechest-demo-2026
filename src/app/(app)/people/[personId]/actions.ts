"use server";

import { revalidatePath } from "next/cache";

import {
  applyPersonPatch,
  deleteLifeEvent,
  insertChangelog,
  insertLifeEvent,
  updateLifeEvent,
} from "@/data/db/mutations";
import {
  buildPersonEdit,
  FIELD_LABELS,
  type FieldUpdate,
} from "@/data/db/personEdits";
import { parseFuzzyDate } from "@/data/db/fuzzyDate";
import {
  currentMemberId,
  getLifeEvent,
  getPerson,
  locations,
} from "@/data";
import type {
  ChangelogRow,
  LifeEventKind,
  LifeEventRow,
} from "@/data/db/schema";

export interface ActionResult {
  ok: boolean;
  errors?: string[];
}

const LIFE_EVENT_KINDS: LifeEventKind[] = [
  "birth",
  "death",
  "marriage",
  "immigration",
  "residence",
  "military",
  "education",
  "work",
  "other",
];

function genId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** Real wall-clock time: edits are "when you made them", and it keeps history ordered. */
function nowIso(): string {
  return new Date().toISOString();
}

function locationExists(id: string): boolean {
  return locations.some((l) => l.id === id);
}

function revalidatePerson(personId: string): void {
  revalidatePath(`/people/${personId}`);
  revalidatePath(`/people/${personId}/history`);
}

/** Edit one or more person fields. Logs a changelog entry per real change. */
export async function updatePersonFields(
  personId: string,
  updates: FieldUpdate[],
): Promise<ActionResult> {
  let person;
  try {
    person = getPerson(personId);
  } catch {
    return { ok: false, errors: ["That person no longer exists."] };
  }

  const { patch, changes, errors } = buildPersonEdit(person, updates);
  if (errors.length > 0) return { ok: false, errors };
  if (changes.length === 0) return { ok: true };

  await applyPersonPatch(personId, patch);

  const editedAt = nowIso();
  const summary =
    changes.length === 1
      ? `Edited ${FIELD_LABELS[changes[0].field].toLowerCase()}`
      : `Edited ${changes.length} fields`;
  for (const change of changes) {
    await insertChangelog({
      id: genId("cl"),
      entityType: "person",
      entityId: personId,
      personId,
      field: change.field,
      before: change.before,
      after: change.after,
      editedById: currentMemberId,
      editedAt,
      summary,
    });
  }

  revalidatePerson(personId);
  return { ok: true };
}

export interface LifeEventInput {
  kind: string;
  title: string;
  dateInput: string;
  locationId?: string;
  description?: string;
}

function validateLifeEvent(input: LifeEventInput): string[] {
  const errors: string[] = [];
  if (!input.title.trim()) errors.push("Title is required.");
  if (!input.dateInput.trim()) errors.push("Date is required.");
  if (!LIFE_EVENT_KINDS.includes(input.kind as LifeEventKind)) errors.push("Pick a valid event type.");
  if (input.locationId && !locationExists(input.locationId)) errors.push("That place is not in the chest.");
  return errors;
}

function lifeEventFieldsFromInput(input: LifeEventInput): Omit<LifeEventRow, "id" | "personId" | "createdById" | "createdAt"> {
  const fields: Omit<LifeEventRow, "id" | "personId" | "createdById" | "createdAt"> = {
    kind: input.kind as LifeEventKind,
    title: input.title.trim(),
    date: parseFuzzyDate(input.dateInput),
  };
  if (input.locationId) fields.locationId = input.locationId;
  const description = input.description?.trim();
  if (description) fields.description = description;
  return fields;
}

/** Add a life event to a person's timeline and log it in the history. */
export async function addLifeEvent(
  personId: string,
  input: LifeEventInput,
): Promise<ActionResult> {
  try {
    getPerson(personId);
  } catch {
    return { ok: false, errors: ["That person no longer exists."] };
  }
  const errors = validateLifeEvent(input);
  if (errors.length > 0) return { ok: false, errors };

  const id = genId("le");
  const createdAt = nowIso();
  const fields = lifeEventFieldsFromInput(input);
  await insertLifeEvent({ id, personId, createdById: currentMemberId, createdAt, ...fields });

  await insertChangelog({
    id: genId("cl"),
    entityType: "life_event",
    entityId: id,
    personId,
    field: "(created)",
    before: null,
    after: fields.title,
    editedById: currentMemberId,
    editedAt: createdAt,
    summary: "Added a life event",
  });

  revalidatePerson(personId);
  return { ok: true };
}

/** Edit an existing life event. */
export async function editLifeEvent(
  personId: string,
  eventId: string,
  input: LifeEventInput,
): Promise<ActionResult> {
  let existing;
  try {
    existing = getLifeEvent(eventId);
  } catch {
    return { ok: false, errors: ["That life event no longer exists."] };
  }
  const errors = validateLifeEvent(input);
  if (errors.length > 0) return { ok: false, errors };

  const fields = lifeEventFieldsFromInput(input);
  // Clear locationId/description if the edit removed them.
  await updateLifeEvent(eventId, {
    ...fields,
    locationId: fields.locationId ?? null,
    description: fields.description,
  });

  await insertChangelog({
    id: genId("cl"),
    entityType: "life_event",
    entityId: eventId,
    personId,
    field: "(edited)",
    before: existing.title,
    after: fields.title,
    editedById: currentMemberId,
    editedAt: nowIso(),
    summary: "Edited a life event",
  });

  revalidatePerson(personId);
  return { ok: true };
}

/** Remove a life event; the history keeps a record of the removal. */
export async function removeLifeEvent(
  personId: string,
  eventId: string,
): Promise<ActionResult> {
  let existing;
  try {
    existing = getLifeEvent(eventId);
  } catch {
    return { ok: true };
  }
  await deleteLifeEvent(eventId);

  await insertChangelog({
    id: genId("cl"),
    entityType: "life_event",
    entityId: eventId,
    personId,
    field: "(deleted)",
    before: existing.title,
    after: null,
    editedById: currentMemberId,
    editedAt: nowIso(),
    summary: "Removed a life event",
  } satisfies ChangelogRow);

  revalidatePerson(personId);
  return { ok: true };
}
