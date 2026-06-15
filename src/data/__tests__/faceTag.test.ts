import { centeredBox, DEFAULT_TAG_BOX, isValidBox } from "@/data/db/faceTag";

describe("centeredBox", () => {
  test("centers a default-size box on the click point", () => {
    const box = centeredBox(50, 50);
    expect(box).toEqual({
      x: 50 - DEFAULT_TAG_BOX.w / 2,
      y: 50 - DEFAULT_TAG_BOX.h / 2,
      w: DEFAULT_TAG_BOX.w,
      h: DEFAULT_TAG_BOX.h,
    });
  });
  test("clamps to the top-left corner", () => {
    expect(centeredBox(0, 0)).toEqual({ x: 0, y: 0, w: DEFAULT_TAG_BOX.w, h: DEFAULT_TAG_BOX.h });
  });
  test("clamps to the bottom-right corner", () => {
    const box = centeredBox(100, 100);
    expect(box.x).toBe(100 - DEFAULT_TAG_BOX.w);
    expect(box.y).toBe(100 - DEFAULT_TAG_BOX.h);
    expect(isValidBox(box)).toBe(true);
  });
  test("always produces an in-bounds box", () => {
    for (const [x, y] of [[50, 50], [0, 0], [100, 100], [3, 97], [97, 3]]) {
      expect(isValidBox(centeredBox(x, y))).toBe(true);
    }
  });
});

describe("isValidBox", () => {
  test("accepts an in-bounds box", () => {
    expect(isValidBox({ x: 10, y: 10, w: 20, h: 20 })).toBe(true);
  });
  test("rejects boxes that spill past the edges", () => {
    expect(isValidBox({ x: 90, y: 10, w: 20, h: 20 })).toBe(false);
    expect(isValidBox({ x: 10, y: 90, w: 20, h: 20 })).toBe(false);
  });
  test("rejects negative origin and non-positive size", () => {
    expect(isValidBox({ x: -1, y: 10, w: 20, h: 20 })).toBe(false);
    expect(isValidBox({ x: 10, y: 10, w: 0, h: 20 })).toBe(false);
  });
  test("rejects non-finite numbers", () => {
    expect(isValidBox({ x: NaN, y: 10, w: 20, h: 20 })).toBe(false);
  });
});
