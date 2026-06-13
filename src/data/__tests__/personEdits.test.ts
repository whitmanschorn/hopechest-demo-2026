import { buildPersonEdit, parseArrayInput } from "@/data/db/personEdits";
import type { Person } from "@/data";

const base: Person = {
  id: "test",
  name: "Klara Kowalski",
  shortName: "Klara",
  fullName: "Klara Maria Kowalski",
  maidenName: "Wiśniewska",
  nicknames: ["Babcia"],
  relation: "Great-grandmother",
  gender: "f",
  photoCount: 0,
};

describe("parseArrayInput", () => {
  test("splits, trims, drops empties, dedupes", () => {
    expect(parseArrayInput(" Babcia , Klara ,, Babcia ")).toEqual(["Babcia", "Klara"]);
  });
  test("empty input yields an empty array", () => {
    expect(parseArrayInput("   ")).toEqual([]);
  });
});

describe("buildPersonEdit", () => {
  test("no-op edits produce no changes and an empty patch", () => {
    const { patch, changes, errors } = buildPersonEdit(base, [
      { field: "name", value: "Klara Kowalski" },
      { field: "nicknames", value: "Babcia" },
    ]);
    expect(errors).toEqual([]);
    expect(changes).toEqual([]);
    expect(patch).toEqual({});
  });

  test("changing a field yields a patch and a change with before/after", () => {
    const { patch, changes } = buildPersonEdit(base, [
      { field: "maidenName", value: "Nowak" },
    ]);
    expect(patch).toEqual({ maidenName: "Nowak" });
    expect(changes).toEqual([
      { field: "maidenName", before: "Wiśniewska", after: "Nowak" },
    ]);
  });

  test("clearing an optional field sets undefined and records 'before → null'", () => {
    const { patch, changes } = buildPersonEdit(base, [
      { field: "maidenName", value: "  " },
    ]);
    expect(patch).toHaveProperty("maidenName", undefined);
    expect(changes).toEqual([{ field: "maidenName", before: "Wiśniewska", after: null }]);
  });

  test("array fields normalize and diff on the joined string", () => {
    const { patch, changes } = buildPersonEdit(base, [
      { field: "nicknames", value: "Babcia, Grandma" },
    ]);
    expect(patch).toEqual({ nicknames: ["Babcia", "Grandma"] });
    expect(changes[0]).toMatchObject({ before: "Babcia", after: "Babcia, Grandma" });
  });

  test("required fields cannot be blanked", () => {
    const { errors, changes } = buildPersonEdit(base, [{ field: "name", value: "  " }]);
    expect(errors.length).toBe(1);
    expect(errors[0]).toMatch(/required/i);
    expect(changes).toEqual([]);
  });

  test("non-editable fields are ignored", () => {
    const { patch, changes } = buildPersonEdit(base, [
      { field: "id", value: "hacked" },
      { field: "photoCount", value: "999" },
    ]);
    expect(patch).toEqual({});
    expect(changes).toEqual([]);
  });
});
