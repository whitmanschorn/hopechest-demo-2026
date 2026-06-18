import { cosine, distanceFn, l2, l2sq, mean, normalize } from "../distance";

describe("distance helpers", () => {
  test("l2 / l2sq", () => {
    expect(l2sq([0, 0], [3, 4])).toBe(25);
    expect(l2([0, 0], [3, 4])).toBe(5);
    expect(l2([1, 2, 3], [1, 2, 3])).toBe(0);
  });

  test("cosine: identical direction -> 0, opposite -> 2, orthogonal -> 1", () => {
    expect(cosine([1, 0], [2, 0])).toBeCloseTo(0);
    expect(cosine([1, 0], [-1, 0])).toBeCloseTo(2);
    expect(cosine([1, 0], [0, 1])).toBeCloseTo(1);
    expect(cosine([0, 0], [1, 1])).toBe(1); // zero vector guarded
  });

  test("normalize yields unit length and preserves direction", () => {
    const u = normalize([3, 4]);
    expect(Math.hypot(...u)).toBeCloseTo(1);
    expect(u[0] / u[1]).toBeCloseTo(3 / 4);
    expect(normalize([0, 0])).toEqual([0, 0]); // zero guarded
  });

  test("distanceFn selects by metric", () => {
    expect(distanceFn("l2")).toBe(l2);
    expect(distanceFn("cosine")).toBe(cosine);
  });

  test("mean is the element-wise centroid", () => {
    expect(mean([[0, 0], [2, 4], [4, 8]])).toEqual([2, 4]);
  });
});
