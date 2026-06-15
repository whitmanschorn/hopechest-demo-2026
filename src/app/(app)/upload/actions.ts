"use server";

import { revalidatePath } from "next/cache";

import { getLocations } from "@/data";
import { parseFuzzyDate } from "@/data/db/fuzzyDate";
import { insertFeedItem, insertPhoto } from "@/data/db/mutations";
import type { FuzzyDate } from "@/data/db/schema";
import { requireCurrentPerson } from "@/lib/auth/session";
import { getStorageProvider, isAllowedImage, MAX_UPLOAD_BYTES } from "@/lib/storage/storage-provider";

export interface UploadResult {
  ok: boolean;
  photoId?: string;
  errors?: string[];
}

function genId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "Added" timestamp, month-grained like the seeded photos (e.g. "June 2026"). */
function contributedWhenNow(): string {
  const d = new Date();
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Add a photo to the chest: store the image, persist the row, announce it. */
export async function uploadPhoto(formData: FormData): Promise<UploadResult> {
  const file = formData.get("file");
  const title = String(formData.get("title") ?? "").trim();
  const dateInput = String(formData.get("dateInput") ?? "").trim();
  const locationId = String(formData.get("locationId") ?? "").trim();
  const width = Number(formData.get("width"));
  const height = Number(formData.get("height"));

  const errors: string[] = [];
  if (!(file instanceof File) || file.size === 0) errors.push("Choose a photo to upload.");
  else if (!isAllowedImage(file.type)) errors.push("That file type isn't supported — use a JPEG, PNG, WebP, or GIF.");
  else if (file.size > MAX_UPLOAD_BYTES) errors.push("That image is too large (8MB max).");
  if (!title) errors.push("Give the photo a title.");
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    errors.push("Couldn't read the image's dimensions — try a different file.");
  }
  if (locationId && !(await getLocations()).some((l) => l.id === locationId)) {
    errors.push("That place isn't in the chest.");
  }
  if (errors.length > 0) return { ok: false, errors };

  const me = await requireCurrentPerson();
  const { url } = await getStorageProvider().put(file as File);

  const date: FuzzyDate = dateInput
    ? parseFuzzyDate(dateInput)
    : { precision: "circa", display: "Date unknown", deduced: true };

  const id = genId("photo");
  await insertPhoto({
    id,
    title,
    src: url,
    width,
    height,
    contributedById: me.id,
    contributedWhen: contributedWhenNow(),
    date,
    ...(locationId ? { locationId } : {}),
  });

  await insertFeedItem({
    kind: "photo-added",
    id: genId("f"),
    photoId: id,
    byId: me.id,
    when: "Just now",
    blurb: title,
  });

  revalidatePath("/home");
  revalidatePath("/albums");
  return { ok: true, photoId: id };
}
