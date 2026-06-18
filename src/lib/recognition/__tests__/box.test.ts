import { bestFaceForBox, iou } from "../box";

const box = (x: number, y: number, width: number, height: number) => ({ x, y, width, height });

describe("iou", () => {
  test("identical boxes -> 1", () => {
    expect(iou(box(0, 0, 10, 10), box(0, 0, 10, 10))).toBe(1);
  });
  test("disjoint boxes -> 0", () => {
    expect(iou(box(0, 0, 10, 10), box(100, 100, 10, 10))).toBe(0);
  });
  test("half overlap", () => {
    // two 10x10 boxes overlapping in a 5x10 strip: inter 50, union 150.
    expect(iou(box(0, 0, 10, 10), box(5, 0, 10, 10))).toBeCloseTo(50 / 150);
  });
});

describe("bestFaceForBox", () => {
  const faces = [
    { id: "a", bbox: box(0, 0, 10, 10) },
    { id: "b", bbox: box(100, 100, 10, 10) },
  ];
  test("returns the best-overlapping face", () => {
    expect(bestFaceForBox(faces, box(1, 1, 10, 10))).toBe("a");
  });
  test("returns null when nothing clears minIou", () => {
    expect(bestFaceForBox(faces, box(500, 500, 5, 5))).toBeNull();
  });
});
