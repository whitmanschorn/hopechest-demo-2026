// Mock disk writes so the tests never touch the committed JSON files.
jest.mock("node:fs", () => ({
  promises: { writeFile: jest.fn().mockResolvedValue(undefined) },
}));

import { promises as fs } from "node:fs";

import {
  applyPersonPatch,
  deleteLifeEvent,
  insertChangelog,
  insertLifeEvent,
  updateLifeEvent,
} from "@/data/db/mutations";
import { changelogRows, lifeEventRows } from "@/data/db/load";
import {
  changelogForPerson,
  getPerson,
  lifeEventsForPerson,
} from "@/data";
import type { LifeEventRow } from "@/data";

const writeFile = fs.writeFile as jest.Mock;

const PERSON = "david";
const sampleEvent = (id: string, year: number): LifeEventRow => ({
  id,
  personId: PERSON,
  kind: "other",
  title: `Event ${id}`,
  date: { year, precision: "year", display: String(year) },
  createdById: "margaret",
  createdAt: "2026-06-13T00:00:00.000Z",
});

afterEach(() => {
  // Remove any rows a test appended, leaving the shared stores pristine.
  for (let i = lifeEventRows.length - 1; i >= 0; i--) {
    if (lifeEventRows[i].id.startsWith("le_test")) lifeEventRows.splice(i, 1);
  }
  for (let i = changelogRows.length - 1; i >= 0; i--) {
    if (changelogRows[i].id.startsWith("cl_test")) changelogRows.splice(i, 1);
  }
  writeFile.mockClear();
});

describe("applyPersonPatch", () => {
  test("edits are visible through getPerson and persisted", async () => {
    const original = getPerson(PERSON).lifespan;
    await applyPersonPatch(PERSON, { lifespan: "1950–2020" });
    expect(getPerson(PERSON).lifespan).toBe("1950–2020");
    expect(writeFile).toHaveBeenCalledWith(
      expect.stringContaining("people.json"),
      expect.any(String),
      "utf8",
    );
    // restore (original was undefined → key is removed)
    await applyPersonPatch(PERSON, { lifespan: original });
    expect(getPerson(PERSON).lifespan).toBe(original);
  });

  test("clearing a field to undefined removes the key", async () => {
    await applyPersonPatch(PERSON, { lifespan: "x" });
    await applyPersonPatch(PERSON, { lifespan: undefined });
    expect(getPerson(PERSON).lifespan).toBeUndefined();
    expect("lifespan" in getPerson(PERSON)).toBe(false);
  });
});

describe("life events", () => {
  test("insert is visible and sorted oldest-first", async () => {
    await insertLifeEvent(sampleEvent("le_test_b", 1980));
    await insertLifeEvent(sampleEvent("le_test_a", 1940));
    const mine = lifeEventsForPerson(PERSON).filter((e) => e.id.startsWith("le_test"));
    expect(mine.map((e) => e.id)).toEqual(["le_test_a", "le_test_b"]);
  });

  test("update patches in place", async () => {
    await insertLifeEvent(sampleEvent("le_test_u", 1960));
    await updateLifeEvent("le_test_u", { title: "Renamed" });
    const found = lifeEventsForPerson(PERSON).find((e) => e.id === "le_test_u");
    expect(found?.title).toBe("Renamed");
  });

  test("delete removes the event", async () => {
    await insertLifeEvent(sampleEvent("le_test_d", 1970));
    expect(lifeEventsForPerson(PERSON).some((e) => e.id === "le_test_d")).toBe(true);
    await deleteLifeEvent("le_test_d");
    expect(lifeEventsForPerson(PERSON).some((e) => e.id === "le_test_d")).toBe(false);
  });
});

describe("changelog", () => {
  test("entries surface for the person, newest-first", async () => {
    await insertChangelog({
      id: "cl_test_new",
      entityType: "person",
      entityId: PERSON,
      personId: PERSON,
      field: "lifespan",
      before: null,
      after: "x",
      editedById: "margaret",
      editedAt: "2999-01-01T00:00:00.000Z",
    });
    expect(changelogForPerson(PERSON)[0].id).toBe("cl_test_new");
  });
});
