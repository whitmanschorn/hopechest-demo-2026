/**
 * Pure helpers for editing a person: which fields are editable, how raw form
 * strings map onto typed `PersonRow` values, and how to diff an edit into a
 * patch + changelog entries. Kept free of any "use server"/IO so it can be unit
 * tested directly; the server action (actions.ts) is a thin wrapper over this.
 */
import type { Person, PersonRow } from "./schema";

/** The only fields the person editor may touch (id/photoCount/etc. are off-limits). */
export const EDITABLE_PERSON_FIELDS = [
  "name",
  "shortName",
  "fullName",
  "maidenName",
  "nicknames",
  "alternateNames",
  "relation",
  "lifespan",
] as const;

export type EditablePersonField = (typeof EDITABLE_PERSON_FIELDS)[number];

/** Fields stored as `string[]`, entered as a comma-separated list. */
const ARRAY_FIELDS = new Set<EditablePersonField>(["nicknames", "alternateNames"]);
/** Fields that must not be blank. */
const REQUIRED_FIELDS = new Set<EditablePersonField>(["name", "shortName", "fullName"]);

/** Human label for a field, used in changelog summaries and the history page. */
export const FIELD_LABELS: Record<EditablePersonField, string> = {
  name: "Name",
  shortName: "Short name",
  fullName: "Full name",
  maidenName: "Maiden name",
  nicknames: "Nicknames",
  alternateNames: "Also recorded as",
  relation: "Relation",
  lifespan: "Lifespan",
};

export function isEditablePersonField(field: string): field is EditablePersonField {
  return (EDITABLE_PERSON_FIELDS as readonly string[]).includes(field);
}

export function isArrayField(field: EditablePersonField): boolean {
  return ARRAY_FIELDS.has(field);
}

/** Split a comma-separated input into trimmed, de-duplicated, non-empty values. */
export function parseArrayInput(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(",")) {
    const v = part.trim();
    if (v && !seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  }
  return out;
}

/** Normalize any field value to the string the changelog stores / compares on. */
export function displayValue(value: string | string[] | undefined): string {
  if (value === undefined) return "";
  return Array.isArray(value) ? value.join(", ") : value;
}

export interface FieldUpdate {
  field: string;
  /** Raw text from the form (comma-separated for array fields). */
  value: string;
}

export interface PersonFieldChange {
  field: EditablePersonField;
  before: string | null;
  after: string | null;
}

export interface PersonEditResult {
  patch: Partial<PersonRow>;
  changes: PersonFieldChange[];
  errors: string[];
}

/**
 * Turn raw form updates into a minimal patch + the list of real changes.
 * Skips no-ops, validates required fields, and ignores any non-editable field.
 */
export function buildPersonEdit(person: Person, updates: FieldUpdate[]): PersonEditResult {
  const patch: Partial<PersonRow> = {};
  const changes: PersonFieldChange[] = [];
  const errors: string[] = [];

  for (const { field, value } of updates) {
    if (!isEditablePersonField(field)) continue;

    const beforeRaw = person[field] as string | string[] | undefined;
    let afterRaw: string | string[] | undefined;

    if (isArrayField(field)) {
      const arr = parseArrayInput(value);
      afterRaw = arr.length > 0 ? arr : undefined;
    } else {
      const trimmed = value.trim();
      afterRaw = trimmed === "" ? undefined : trimmed;
    }

    if (REQUIRED_FIELDS.has(field) && afterRaw === undefined) {
      errors.push(`${FIELD_LABELS[field]} is required.`);
      continue;
    }

    // No-op? Compare on the normalized string form.
    if (displayValue(beforeRaw) === displayValue(afterRaw)) continue;

    (patch as Record<string, unknown>)[field] = afterRaw;
    changes.push({
      field,
      before: beforeRaw === undefined ? null : displayValue(beforeRaw),
      after: afterRaw === undefined ? null : displayValue(afterRaw),
    });
  }

  return { patch, changes, errors };
}
