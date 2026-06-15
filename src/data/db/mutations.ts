/**
 * The write seam. Every mutation in the app goes through here — the read repos
 * (repos.ts) stay pure. Postgres-backed (Prisma): INSERT/UPDATE/DELETE. Callers
 * (the person-edit server actions) don't care how it's stored.
 *
 * Single-writer demo: no locking, last-write-wins.
 */
import { prisma } from "@/lib/prisma";
import type { ChangelogRow, LifeEventRow, PersonRow } from "./schema";

/** Mutate a person's editable fields. `undefined` in the patch clears the field
 * (→ null for scalars, [] for the array columns). */
export async function applyPersonPatch(
  personId: string,
  patch: Partial<PersonRow>,
): Promise<void> {
  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (key === "nicknames" || key === "alternateNames") {
      data[key] = (value as string[] | undefined) ?? [];
    } else {
      data[key] = value === undefined ? null : value;
    }
  }
  await prisma.person.update({ where: { id: personId }, data });
}

/** Append a life event. */
export async function insertLifeEvent(row: LifeEventRow): Promise<void> {
  await prisma.lifeEvent.create({
    data: {
      id: row.id,
      personId: row.personId,
      kind: row.kind,
      title: row.title,
      date: row.date as unknown as object,
      locationId: row.locationId ?? null,
      description: row.description ?? null,
      createdById: row.createdById,
      createdAt: row.createdAt,
    },
  });
}

/** Patch a life event. Keys present in the patch are written (clearable to null). */
export async function updateLifeEvent(
  id: string,
  patch: Partial<LifeEventRow>,
): Promise<void> {
  const data: Record<string, unknown> = {};
  if (patch.kind !== undefined) data.kind = patch.kind;
  if (patch.title !== undefined) data.title = patch.title;
  if (patch.date !== undefined) data.date = patch.date as unknown as object;
  if ("locationId" in patch) data.locationId = patch.locationId ?? null;
  if ("description" in patch) data.description = patch.description ?? null;
  await prisma.lifeEvent.update({ where: { id }, data });
}

/** Remove a life event. No-op if already gone. */
export async function deleteLifeEvent(id: string): Promise<void> {
  await prisma.lifeEvent.deleteMany({ where: { id } });
}

/** Append a changelog entry. */
export async function insertChangelog(row: ChangelogRow): Promise<void> {
  await prisma.changelog.create({
    data: {
      id: row.id,
      entityType: row.entityType,
      entityId: row.entityId,
      personId: row.personId,
      field: row.field,
      before: row.before,
      after: row.after,
      editedById: row.editedById,
      editedAt: row.editedAt,
      summary: row.summary ?? null,
    },
  });
}
