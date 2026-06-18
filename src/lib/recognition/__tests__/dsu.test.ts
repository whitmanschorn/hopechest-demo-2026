import { DSU } from "../dsu";

describe("DSU", () => {
  test("disjoint by default", () => {
    const d = new DSU(4);
    expect(d.find(0)).not.toBe(d.find(1));
  });

  test("union merges components transitively", () => {
    const d = new DSU(5);
    d.union(0, 1);
    d.union(1, 2);
    expect(d.find(0)).toBe(d.find(2));
    expect(d.find(0)).not.toBe(d.find(3));
    d.union(3, 4);
    d.union(2, 4);
    expect(d.find(0)).toBe(d.find(3));
  });

  test("union is idempotent", () => {
    const d = new DSU(3);
    d.union(0, 1);
    d.union(0, 1);
    expect(d.find(0)).toBe(d.find(1));
  });
});
