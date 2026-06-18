// Pure bbox geometry — kept free of any DB import so it's trivially unit-tested
// and reusable by the back-propagation seam (backprop.ts).

import type { BBox } from "./types";

/** Intersection-over-union of two axis-aligned boxes (0 when disjoint). */
export function iou(a: BBox, b: BBox): number {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  if (inter === 0) return 0;
  const union = a.width * a.height + b.width * b.height - inter;
  return union <= 0 ? 0 : inter / union;
}

/** Pick the face whose bbox best overlaps `box` (>= minIou). Deterministic ties by id. */
export function bestFaceForBox(
  faces: Array<{ id: string; bbox: BBox }>,
  box: BBox,
  minIou = 0.3,
): string | null {
  let bestId: string | null = null;
  let bestIou = minIou;
  for (const f of faces) {
    const score = iou(f.bbox, box);
    if (score > bestIou || (score === bestIou && bestId !== null && f.id < bestId)) {
      bestIou = score;
      bestId = f.id;
    }
  }
  return bestId;
}
