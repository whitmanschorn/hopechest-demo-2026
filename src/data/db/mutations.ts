/**
 * The write seam. Every mutation in the app goes through here — the read repos
 * (repos.ts) stay pure. Two halves, mirroring load.ts:
 *
 *   1. In-memory: edits are applied to the *same* row objects/arrays the repos
 *      already hold, so reads reflect them immediately within the process.
 *      Person rows are mutated in place (personById holds the same object as
 *      personRows, so one Object.assign updates every alias); the life-event and
 *      changelog tables are appended/spliced in place.
 *   2. Disk: the affected table is written back to src/data/json/<table>.json on
 *      a best-effort basis so edits survive a restart. On a read-only host
 *      (serverless) the write throws and is swallowed — the in-memory store is
 *      still authoritative for the running server.
 *
 * A Postgres port replaces these bodies with INSERT/UPDATE; callers don't change.
 * Single-writer demo: no locking, last-write-wins.
 */
import { promises as fs } from "node:fs";
import path from "node:path";

import {
  changelogRows,
  getLifeEventRows,
  lifeEventRows,
  personById,
  personRows,
} from "./load";
import type { ChangelogRow, LifeEventRow, PersonRow } from "./schema";

const JSON_DIR = path.join(process.cwd(), "src", "data", "json");

/** Write a table back to disk. Best-effort: read-only hosts just log and move on. */
async function persistTable(file: string, rows: unknown): Promise<void> {
  try {
    await fs.writeFile(path.join(JSON_DIR, file), JSON.stringify(rows, null, 2) + "\n", "utf8");
  } catch (err) {
    console.warn(`[mutations] could not persist ${file}; keeping in-memory only`, err);
  }
}

/** Mutate a person's fields in place and persist people.json. Throws if unknown. */
export async function applyPersonPatch(
  personId: string,
  patch: Partial<PersonRow>,
): Promise<PersonRow> {
  const row = personById.get(personId);
  if (!row) throw new Error(`Unknown person: ${personId}`);
  Object.assign(row, patch);
  // Drop keys explicitly cleared to undefined so the JSON stays tidy.
  for (const key of Object.keys(patch) as (keyof PersonRow)[]) {
    if (patch[key] === undefined) delete row[key];
  }
  await persistTable("people.json", personRows);
  return row;
}

/** Append a life event and persist life_events.json. */
export async function insertLifeEvent(row: LifeEventRow): Promise<LifeEventRow> {
  lifeEventRows.push(row);
  await persistTable("life_events.json", lifeEventRows);
  return row;
}

/** Patch a life event in place and persist. Throws if unknown. */
export async function updateLifeEvent(
  id: string,
  patch: Partial<LifeEventRow>,
): Promise<LifeEventRow> {
  const row = getLifeEventRows().find((e) => e.id === id);
  if (!row) throw new Error(`Unknown life event: ${id}`);
  Object.assign(row, patch);
  for (const key of Object.keys(patch) as (keyof LifeEventRow)[]) {
    if (patch[key] === undefined) delete row[key];
  }
  await persistTable("life_events.json", lifeEventRows);
  return row;
}

/** Remove a life event and persist. No-op if already gone. */
export async function deleteLifeEvent(id: string): Promise<void> {
  const idx = lifeEventRows.findIndex((e) => e.id === id);
  if (idx === -1) return;
  lifeEventRows.splice(idx, 1);
  await persistTable("life_events.json", lifeEventRows);
}

/** Append a changelog entry and persist changelog.json. */
export async function insertChangelog(row: ChangelogRow): Promise<ChangelogRow> {
  changelogRows.push(row);
  await persistTable("changelog.json", changelogRows);
  return row;
}
