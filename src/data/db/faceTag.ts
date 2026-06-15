/**
 * Pure face-tag geometry — shared by the client tagger (click → box) and the
 * server validators. Boxes are percentages of the image (0–100), matching the
 * coordinate system FaceTagOverlay renders and the seed generates. Prisma-free
 * so client components can import it.
 */
import type { FaceBox } from "./schema";

/** Default manual-tag box size (percent of the image). Detection will later
 * supply real per-face boxes; a click drops one of these. */
export const DEFAULT_TAG_BOX = { w: 18, h: 22 } as const;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** A default-size box centered on a click at (xPct, yPct), clamped to stay
 * fully within the image. */
export function centeredBox(xPct: number, yPct: number): FaceBox {
  const { w, h } = DEFAULT_TAG_BOX;
  return {
    x: clamp(xPct - w / 2, 0, 100 - w),
    y: clamp(yPct - h / 2, 0, 100 - h),
    w,
    h,
  };
}

/** True when a box is finite and fully inside the 0–100 image bounds. */
export function isValidBox(box: FaceBox): boolean {
  const { x, y, w, h } = box;
  if (![x, y, w, h].every((n) => Number.isFinite(n))) return false;
  if (w <= 0 || h <= 0 || x < 0 || y < 0) return false;
  // Small epsilon for floating-point clicks landing right at the edge.
  return x + w <= 100.001 && y + h <= 100.001;
}
