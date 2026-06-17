"use server";

import { revalidatePath } from "next/cache";

import { getAlbums, getLocations, getPeople } from "@/data";
import { isValidBox } from "@/data/db/faceTag";
import { parseFuzzyDate } from "@/data/db/fuzzyDate";
import {
  insertAlbum,
  insertAlbumPhotos,
  insertFeedItem,
  insertLocation,
  insertPhoto,
  insertPhotoPersonTags,
} from "@/data/db/mutations";
import type { FaceBox, FuzzyDate } from "@/data/db/schema";
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

// Every uploaded photo lands in an album. With nothing chosen, it goes to this
// shared catch-all (created the first time a photo needs it).
const DEFAULT_ALBUM_ID = "album_uploads";
const DEFAULT_ALBUM_TITLE = "Recently added";

/** Resolve the typed-in place to a location id: match an existing place by
 * label (case-insensitive), otherwise create a new one (coordinates unknown). */
async function resolveLocationId(name: string): Promise<string | undefined> {
  if (!name) return undefined;
  const existing = (await getLocations()).find(
    (l) => l.label.toLowerCase() === name.toLowerCase(),
  );
  if (existing) return existing.id;
  const id = genId("loc");
  await insertLocation({ id, label: name });
  return id;
}

/** Make sure the new photo belongs to an album: the one the uploader picked, a
 * brand-new album they named, or the shared default (find-or-create). */
async function assignToAlbum(
  photoId: string,
  choice: { albumId: string; newAlbumTitle: string },
): Promise<void> {
  const albums = await getAlbums();

  // 1. An existing standard album was chosen.
  const chosen = choice.albumId
    ? albums.find((a) => a.id === choice.albumId && a.kind === "standard")
    : undefined;
  if (chosen) {
    await insertAlbumPhotos([{ albumId: chosen.id, photoId, position: chosen.photoCount }]);
    return;
  }

  // 2. A new album was named.
  const now = new Date().toISOString();
  if (choice.newAlbumTitle) {
    const id = genId("album");
    await insertAlbum({ id, title: choice.newAlbumTitle, kind: "standard", coverPhotoId: photoId, createdAt: now, updatedAt: now });
    await insertAlbumPhotos([{ albumId: id, photoId, position: 0 }]);
    return;
  }

  // 3. Fall back to the shared "Recently added" album.
  const def = albums.find((a) => a.id === DEFAULT_ALBUM_ID);
  if (def) {
    await insertAlbumPhotos([{ albumId: def.id, photoId, position: def.photoCount }]);
  } else {
    await insertAlbum({ id: DEFAULT_ALBUM_ID, title: DEFAULT_ALBUM_TITLE, kind: "standard", coverPhotoId: photoId, createdAt: now, updatedAt: now });
    await insertAlbumPhotos([{ albumId: DEFAULT_ALBUM_ID, photoId, position: 0 }]);
  }
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "Added" timestamp, month-grained like the seeded photos (e.g. "June 2026"). */
function contributedWhenNow(): string {
  const d = new Date();
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Parse the client's tag payload into valid {personId, box} entries, dropping
 * anything malformed or pointing at an unknown person (best-effort — a bad tag
 * shouldn't sink the whole upload). */
function parseTags(raw: string, knownPersonIds: Set<string>): { personId: string; box: FaceBox }[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw || "[]");
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const seen = new Set<string>();
  const tags: { personId: string; box: FaceBox }[] = [];
  for (const t of parsed) {
    const personId = (t as { personId?: unknown })?.personId;
    const box = (t as { box?: unknown })?.box as FaceBox | undefined;
    if (typeof personId !== "string" || !knownPersonIds.has(personId) || seen.has(personId)) continue;
    if (!box || !isValidBox(box)) continue;
    seen.add(personId);
    tags.push({ personId, box });
  }
  return tags;
}

/** Add a photo to the chest: store the image, persist the row, announce it. */
export async function uploadPhoto(formData: FormData): Promise<UploadResult> {
  const file = formData.get("file");
  const title = String(formData.get("title") ?? "").trim();
  const dateInput = String(formData.get("dateInput") ?? "").trim();
  const locationName = String(formData.get("locationName") ?? "").trim();
  const albumId = String(formData.get("albumId") ?? "").trim();
  const newAlbumTitle = String(formData.get("newAlbumTitle") ?? "").trim();
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
  if (errors.length > 0) return { ok: false, errors };

  const me = await requireCurrentPerson();
  const { url } = await getStorageProvider().put(file as File);
  const locationId = await resolveLocationId(locationName);

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

  const knownPersonIds = new Set((await getPeople()).map((p) => p.id));
  const tags = parseTags(String(formData.get("tags") ?? "[]"), knownPersonIds);
  await insertPhotoPersonTags(tags.map((t) => ({ photoId: id, personId: t.personId, box: t.box, confidence: null })));

  await assignToAlbum(id, { albumId, newAlbumTitle });

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
  revalidatePath("/map");
  return { ok: true, photoId: id };
}
