import {
  buildGraph,
  cousinPhrase,
  describe as describeRelation,
  relationship,
  type Relation,
} from "../kinship";
import { family } from "./kinship.fixture";

/** Convenience: the label of how `to` relates to `from`. */
const label = (from: string, to: string) => relationship(family, from, to)?.label ?? null;
const kind = (from: string, to: string) => relationship(family, from, to)?.kind ?? null;

describe("direct relationships", () => {
  test("parent / child", () => {
    expect(relationship(family, "hugo", "carol")).toMatchObject({ kind: "parent", label: "mother" });
    expect(relationship(family, "hugo", "ed")).toMatchObject({ kind: "parent", label: "father" });
    // inverse
    expect(relationship(family, "carol", "hugo")).toMatchObject({ kind: "child", label: "son" });
    expect(relationship(family, "carol", "ivy")).toMatchObject({ kind: "child", label: "daughter" });
  });

  test("siblings (and inverse)", () => {
    expect(relationship(family, "hugo", "ivy")).toMatchObject({ kind: "sibling", label: "sister" });
    expect(relationship(family, "ivy", "hugo")).toMatchObject({ kind: "sibling", label: "brother" });
  });

  test("spouses are symmetric and gendered", () => {
    expect(relationship(family, "carol", "ed")).toMatchObject({ kind: "spouse", label: "husband" });
    expect(relationship(family, "ed", "carol")).toMatchObject({ kind: "spouse", label: "wife" });
  });
});

describe("vertical relationships", () => {
  test("grandparent / grandchild", () => {
    expect(relationship(family, "hugo", "ada")).toMatchObject({ kind: "grandparent", label: "grandmother" });
    expect(relationship(family, "hugo", "bert")).toMatchObject({ kind: "grandparent", label: "grandfather" });
    expect(relationship(family, "ada", "hugo")).toMatchObject({ kind: "grandchild", label: "grandson" });
    expect(relationship(family, "ada", "ivy")).toMatchObject({ kind: "grandchild", label: "granddaughter" });
  });

  test("great-grandparent / great-grandchild", () => {
    expect(relationship(family, "leo", "ada")).toMatchObject({ kind: "great-grandparent", label: "great-grandmother", greats: 1 });
    expect(relationship(family, "leo", "bert")).toMatchObject({ kind: "great-grandparent", label: "great-grandfather" });
    expect(relationship(family, "ada", "leo")).toMatchObject({ kind: "great-grandchild", label: "great-grandson", greats: 1 });
  });
});

describe("collateral relationships", () => {
  test("aunt / uncle (and inverse niece / nephew)", () => {
    expect(relationship(family, "hugo", "dan")).toMatchObject({ kind: "aunt-uncle", label: "uncle" });
    expect(relationship(family, "jen", "carol")).toMatchObject({ kind: "aunt-uncle", label: "aunt" });
    expect(relationship(family, "dan", "hugo")).toMatchObject({ kind: "niece-nephew", label: "nephew" });
    expect(relationship(family, "carol", "jen")).toMatchObject({ kind: "niece-nephew", label: "niece" });
  });

  test("great-aunt/uncle and great-niece/nephew", () => {
    expect(relationship(family, "leo", "dan")).toMatchObject({ kind: "aunt-uncle", label: "great-uncle", greats: 1 });
    expect(relationship(family, "dan", "leo")).toMatchObject({ kind: "niece-nephew", label: "great-nephew", greats: 1 });
  });

  test("first cousins (and inverse)", () => {
    expect(relationship(family, "hugo", "jen")).toMatchObject({ kind: "cousin", degree: 1, removal: 0 });
    expect(relationship(family, "jen", "hugo")).toMatchObject({ kind: "cousin", degree: 1, removal: 0 });
  });

  test("cousins once removed across generations", () => {
    expect(relationship(family, "leo", "jen")).toMatchObject({ kind: "cousin", degree: 1, removal: 1 });
    expect(relationship(family, "jen", "leo")).toMatchObject({ kind: "cousin", degree: 1, removal: 1 });
  });
});

describe("in-law relationships (one marriage hop)", () => {
  test("aunt / uncle by marriage", () => {
    expect(relationship(family, "hugo", "fay")).toMatchObject({ kind: "aunt-uncle", label: "aunt", byMarriage: true });
  });
  test("sibling-in-law", () => {
    expect(relationship(family, "carol", "fay")).toMatchObject({ kind: "sibling-in-law", label: "sister-in-law", byMarriage: true });
  });
  test("parent-in-law / child-in-law", () => {
    expect(relationship(family, "hugo", "mae")).toMatchObject({ kind: "parent-in-law", label: "mother-in-law" });
    expect(relationship(family, "mae", "hugo")).toMatchObject({ kind: "child-in-law", label: "son-in-law" });
  });
});

describe("every relation has a working inverse", () => {
  const pairs: [string, string][] = [
    ["hugo", "carol"], ["hugo", "ivy"], ["carol", "ed"], ["hugo", "ada"],
    ["leo", "ada"], ["hugo", "dan"], ["leo", "dan"], ["hugo", "jen"], ["leo", "jen"],
  ];
  test.each(pairs)("%s <-> %s both resolve", (a, b) => {
    expect(relationship(family, a, b)).not.toBeNull();
    expect(relationship(family, b, a)).not.toBeNull();
  });
});

describe("edge cases & invalid input", () => {
  test("self is not a relation", () => {
    expect(relationship(family, "hugo", "hugo")).toBeNull();
  });
  test("unknown ids return null", () => {
    expect(relationship(family, "hugo", "nobody")).toBeNull();
    expect(relationship(family, "nobody", "hugo")).toBeNull();
  });
  test("unrelated people return null", () => {
    expect(label("hugo", "zed")).toBeNull();
    expect(kind("zed", "leo")).toBeNull();
  });

  test("cyclic and duplicate edges do not hang or crash", () => {
    const cyclic = buildGraph(
      [
        { id: "a", gender: "f" },
        { id: "b", gender: "m" },
      ],
      [
        { fromId: "a", toId: "b", type: "parent" },
        { fromId: "b", toId: "a", type: "parent" }, // cycle
        { fromId: "a", toId: "b", type: "parent" }, // duplicate
      ],
    );
    // Resolves without infinite recursion; a is b's parent.
    expect(relationship(cyclic, "b", "a")).toMatchObject({ kind: "parent" });
  });

  test("empty graph", () => {
    const empty = buildGraph([], []);
    expect(relationship(empty, "x", "y")).toBeNull();
  });
});

describe("describe() and cousinPhrase()", () => {
  test("named-free descriptions", () => {
    expect(describeRelation(family, "hugo", "ada")).toBe("your grandmother");
    expect(describeRelation(family, "hugo", "jen")).toBe("your first cousin");
    expect(describeRelation(family, "leo", "jen")).toBe("your first cousin once removed");
    expect(describeRelation(family, "leo", "dan")).toBe("your great-uncle");
    expect(describeRelation(family, "hugo", "fay")).toBe("your aunt (by marriage)");
    expect(describeRelation(family, "hugo", "zed")).toBeNull();
  });

  test("cousinPhrase covers degrees and removals", () => {
    const c = (degree: number, removal: number): Relation => ({ kind: "cousin", label: "cousin", degree, removal });
    expect(cousinPhrase(c(1, 0))).toBe("first cousin");
    expect(cousinPhrase(c(2, 1))).toBe("second cousin once removed");
    expect(cousinPhrase(c(3, 2))).toBe("third cousin twice removed");
    expect(cousinPhrase(c(6, 3))).toBe("6th cousin 3 times removed");
  });
});
