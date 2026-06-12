/**
 * Repositories: turn normalized rows (load.ts) into hydrated domain objects and
 * answer the queries the app needs. Pages/components call these (re-exported by
 * src/data/index.ts) and never touch JSON or join tables directly. A Postgres
 * port reimplements these function bodies; their signatures stay the same.
 */
import {
  albumPhotoRows,
  albumRows,
  documentRows,
  locationById,
  locationRows,
  personById,
  personRows,
  photoCaptureRows,
  photoPersonRows,
  photoRows,
} from "./load";
import type {
  Album,
  FaceTag,
  FamilyDocument,
  Location,
  Person,
  Photo,
  PhotoCapture,
} from "./schema";

// --- join indexes -----------------------------------------------------------
const faceTagsByPhoto = new Map<string, FaceTag[]>();
for (const r of photoPersonRows) {
  const tag: FaceTag = { personId: r.personId, box: r.box, ...(r.confidence != null ? { confidence: r.confidence } : {}) };
  (faceTagsByPhoto.get(r.photoId) ?? faceTagsByPhoto.set(r.photoId, []).get(r.photoId)!).push(tag);
}

const capturesByPhoto = new Map<string, PhotoCapture[]>();
for (const r of photoCaptureRows) {
  const cap: PhotoCapture = { id: r.id, capturedById: r.capturedById, capturedAt: r.capturedAt, device: r.device, framing: r.framing, ...(r.note != null ? { note: r.note } : {}) };
  (capturesByPhoto.get(r.photoId) ?? capturesByPhoto.set(r.photoId, []).get(r.photoId)!).push(cap);
}

const orderedAlbumPhotos = [...albumPhotoRows].sort((a, b) => a.position - b.position);
const photoIdsByAlbum = new Map<string, string[]>();
const albumIdsByPhoto = new Map<string, string[]>();
for (const r of orderedAlbumPhotos) {
  (photoIdsByAlbum.get(r.albumId) ?? photoIdsByAlbum.set(r.albumId, []).get(r.albumId)!).push(r.photoId);
  (albumIdsByPhoto.get(r.photoId) ?? albumIdsByPhoto.set(r.photoId, []).get(r.photoId)!).push(r.albumId);
}

// --- hydration (done once; data is static) ----------------------------------
function hydratePhoto(id: string): Photo {
  const row = photoRows.find((p) => p.id === id)!;
  const location = row.locationId ? locationById.get(row.locationId) : undefined;
  return {
    ...row,
    location,
    faceTags: faceTagsByPhoto.get(id) ?? [],
    captures: capturesByPhoto.get(id) ?? [],
    albumIds: albumIdsByPhoto.get(id) ?? [],
  };
}

export const locations: Location[] = locationRows;
export const people: Person[] = personRows;
export const photos: Photo[] = photoRows.map((p) => hydratePhoto(p.id));
export const documents: FamilyDocument[] = documentRows;

const photoByIdHydrated = new Map(photos.map((p) => [p.id, p]));

export const albums: Album[] = albumRows.map((a) => {
  const photoIds = photoIdsByAlbum.get(a.id) ?? [];
  return { ...a, photoIds, photoCount: photoIds.length };
});
const albumByIdHydrated = new Map(albums.map((a) => [a.id, a]));

// --- getters ----------------------------------------------------------------
export function getPhoto(id: string): Photo {
  const p = photoByIdHydrated.get(id);
  if (!p) throw new Error(`Unknown photo: ${id}`);
  return p;
}
export function getPerson(id: string): Person {
  const p = personById.get(id);
  if (!p) throw new Error(`Unknown person: ${id}`);
  return p;
}
export function getAlbum(id: string): Album {
  const a = albumByIdHydrated.get(id);
  if (!a) throw new Error(`Unknown album: ${id}`);
  return a;
}
export function getDocument(id: string): FamilyDocument {
  const d = documentRows.find((x) => x.id === id);
  if (!d) throw new Error(`Unknown document: ${id}`);
  return d;
}
export function getLocation(id: string): Location {
  const l = locationById.get(id);
  if (!l) throw new Error(`Unknown location: ${id}`);
  return l;
}

// --- queries ----------------------------------------------------------------
export function photosForAlbum(album: Album): Photo[] {
  return album.photoIds.map(getPhoto);
}
export function photosForPerson(personId: string): Photo[] {
  return photos.filter((p) => p.faceTags.some((t) => t.personId === personId));
}
export function photosForLocation(locationId: string): Photo[] {
  return photos.filter((p) => p.locationId === locationId);
}
export function albumsForPhoto(photo: Photo): Album[] {
  return photo.albumIds.map(getAlbum);
}

/** Locations that have at least one photo, with their photo counts (for maps). */
export function locationsWithCounts(): { location: Location; count: number; coverPhotoId?: string }[] {
  return locations
    .map((location) => {
      const ps = photosForLocation(location.id);
      return { location, count: ps.length, coverPhotoId: ps[0]?.id };
    })
    .filter((x) => x.count > 0);
}

/**
 * "On this day" — photos with a known calendar day matching month/day, across
 * years, newest first. Defaults to the demo's pinned today.
 */
export function onThisDay(month: number, day: number): Photo[] {
  return photos
    .filter((p) => p.date.precision === "day" && p.date.month === month && p.date.day === day)
    .sort((a, b) => (b.date.year ?? 0) - (a.date.year ?? 0));
}
