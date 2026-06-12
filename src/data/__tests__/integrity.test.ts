import {
  albums,
  checkIntegrity,
  describeRelationshipTo,
  onThisDay,
  people,
  photos,
  suggestMentions,
} from "@/data";

describe("dataset integrity", () => {
  test("every foreign key resolves", () => {
    const errors = checkIntegrity();
    expect(errors).toEqual([]);
  });

  test("every photo has the required provenance fields", () => {
    for (const p of photos) {
      expect(p.date.display).toBeTruthy();
      expect(p.date.precision).toBeTruthy();
      expect(p.contributedById).toBeTruthy();
      expect(p.locationId).toBeTruthy();
    }
  });

  test("albums expose ordered membership and counts", () => {
    for (const a of albums) {
      expect(a.photoCount).toBe(a.photoIds.length);
      expect(a.createdAt).toBeTruthy();
      expect(a.updatedAt).toBeTruthy();
    }
  });
});

describe("kinship wired to real data", () => {
  test("Margaret's relationships read correctly", () => {
    expect(describeRelationshipTo("margaret", "klara")).toMatch(/great-grandmother/);
    expect(describeRelationshipTo("margaret", "sarah")).toMatch(/grandmother/);
    expect(describeRelationshipTo("margaret", "susan")).toMatch(/mother/);
    expect(describeRelationshipTo("margaret", "eleanor")).toMatch(/aunt/);
    expect(describeRelationshipTo("margaret", "david")).toMatch(/cousin/);
    expect(describeRelationshipTo("margaret", "james")).toMatch(/brother/);
  });

  test("@grandma resolves to the actual grandmother via kinship", () => {
    const hits = suggestMentions("grandma", "margaret");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((h) => h.viaKinship)).toBe(true);
    expect(hits.map((h) => h.person.id)).toContain("sarah");
  });

  test("aliases resolve by name (maiden / alternate)", () => {
    const byMaiden = suggestMentions("kowalski", "margaret");
    expect(byMaiden.map((h) => h.person.id)).toContain("sarah");
  });
});

describe("on this day", () => {
  test("the pinned demo day surfaces photos across years", () => {
    const memories = onThisDay(6, 12);
    expect(memories.length).toBeGreaterThanOrEqual(2);
    const years = memories.map((p) => p.date.year);
    expect(new Set(years).size).toBe(years.length); // distinct years
  });
});

test("everyone is in the people table", () => {
  expect(people.length).toBeGreaterThanOrEqual(10);
});
