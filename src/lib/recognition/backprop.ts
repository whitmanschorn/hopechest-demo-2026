// Back-propagation seam: turn a Hope Chest *manual* photo tag into durable
// recognition ground truth.
//
// When a user manually tags Person P in app photo PH (the photo_people table,
// added in the manual-tagging work), that's a high-confidence label we want the
// recognizer to learn from. This module resolves/creates a face_identity bridged
// to P, finds the face in PH that the tag's box covers, and sets the durable
// faces.identity_id — which removes that face from all future rebuild pools and
// makes it a labeled neighbor for /recognize.
//
// STATUS: the schema hooks (FaceIdentity.appPersonId, FacePhoto.appPhotoId) and
// this function ship now; the live trigger that calls applyManualTag() from the
// tagging UI is a fast-follow (it depends on that UI's final shape). The pure
// box matcher below is unit-tested.

import { prisma } from "@/lib/prisma";

import { bestFaceForBox } from "./box";
import type { BBox } from "./types";

export interface ManualTag {
  appPhotoId: string; // photos.id that was tagged
  appPersonId: string; // people.id the tag points at
  name: string; // identity display name (usually the Person's name)
  box?: BBox; // tag box; if omitted, all faces in the photo are labeled
}

export interface ManualTagResult {
  identityId: string;
  facesLabeled: number;
}

/**
 * Apply a manual tag as durable recognition truth. Idempotent: re-tagging the
 * same person reuses the bridged identity.
 */
export async function applyManualTag(tag: ManualTag): Promise<ManualTagResult> {
  // one identity per (bridged) Person
  const identity =
    (await prisma.faceIdentity.findFirst({ where: { appPersonId: tag.appPersonId } })) ??
    (await prisma.faceIdentity.create({ data: { name: tag.name, appPersonId: tag.appPersonId } }));

  const photoFaces = await prisma.face.findMany({
    where: { photo: { appPhotoId: tag.appPhotoId } },
    select: { id: true, bbox: true },
  });

  let targetIds: string[];
  if (tag.box) {
    const match = bestFaceForBox(
      photoFaces.map((f) => ({ id: f.id, bbox: f.bbox as unknown as BBox })),
      tag.box,
    );
    targetIds = match ? [match] : [];
  } else {
    targetIds = photoFaces.map((f) => f.id);
  }

  if (targetIds.length === 0) return { identityId: identity.id, facesLabeled: 0 };

  const res = await prisma.face.updateMany({
    where: { id: { in: targetIds } },
    data: { identityId: identity.id },
  });
  return { identityId: identity.id, facesLabeled: res.count };
}
