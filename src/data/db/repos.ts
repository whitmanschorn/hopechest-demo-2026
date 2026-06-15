/**
 * Repositories: turn normalized rows (load.ts) into hydrated domain objects and
 * answer the queries the app needs. Pages/components call these (re-exported by
 * src/data/index.ts) and never touch Prisma or join tables directly. Every
 * function is async (Postgres-backed); the hydration step is memoized per
 * request with React `cache()`.
 */
import { cache } from "react";

import { loadData } from "./load";
import type {
  Album,
  Changelog,
  Comment,
  CommentRow,
  FaceTag,
  FamilyDocument,
  LifeEvent,
  Location,
  Person,
  Photo,
  PhotoCapture,
  ReactionSummary,
} from "./schema";

interface Hydrated {
  locations: Location[];
  people: Person[];
  photos: Photo[];
  documents: FamilyDocument[];
  albums: Album[];
  photoById: Map<string, Photo>;
  albumById: Map<string, Album>;
  personById: Map<string, Person>;
  documentById: Map<string, FamilyDocument>;
  locationById: Map<string, Location>;
  /** Grouped reactions per target id, WITHOUT the `mine` flag (added per caller). */
  reactionsByTarget: Map<string, { emoji: string; count: number; byIds: string[] }[]>;
  commentRowsByPhoto: Map<string, { id: string; photoId: string; parentId: string | null; authorId: string; body: string; when: string }[]>;
}

const build = cache(async (): Promise<Hydrated> => {
  const d = await loadData();

  const faceTagsByPhoto = new Map<string, FaceTag[]>();
  for (const r of d.photoPersonRows) {
    const tag: FaceTag = { personId: r.personId, box: r.box, ...(r.confidence != null ? { confidence: r.confidence } : {}) };
    (faceTagsByPhoto.get(r.photoId) ?? faceTagsByPhoto.set(r.photoId, []).get(r.photoId)!).push(tag);
  }

  const capturesByPhoto = new Map<string, PhotoCapture[]>();
  for (const r of d.photoCaptureRows) {
    const cap: PhotoCapture = { id: r.id, capturedById: r.capturedById, capturedAt: r.capturedAt, device: r.device, framing: r.framing, ...(r.note != null ? { note: r.note } : {}) };
    (capturesByPhoto.get(r.photoId) ?? capturesByPhoto.set(r.photoId, []).get(r.photoId)!).push(cap);
  }

  const orderedAlbumPhotos = [...d.albumPhotoRows].sort((a, b) => a.position - b.position);
  const photoIdsByAlbum = new Map<string, string[]>();
  const albumIdsByPhoto = new Map<string, string[]>();
  for (const r of orderedAlbumPhotos) {
    (photoIdsByAlbum.get(r.albumId) ?? photoIdsByAlbum.set(r.albumId, []).get(r.albumId)!).push(r.photoId);
    (albumIdsByPhoto.get(r.photoId) ?? albumIdsByPhoto.set(r.photoId, []).get(r.photoId)!).push(r.albumId);
  }

  const photos: Photo[] = d.photoRows.map((row) => ({
    ...row,
    location: row.locationId ? d.locationById.get(row.locationId) : undefined,
    faceTags: faceTagsByPhoto.get(row.id) ?? [],
    captures: capturesByPhoto.get(row.id) ?? [],
    albumIds: albumIdsByPhoto.get(row.id) ?? [],
  }));
  const photoById = new Map(photos.map((p) => [p.id, p]));

  const albums: Album[] = d.albumRows.map((a) => {
    const photoIds = photoIdsByAlbum.get(a.id) ?? [];
    return { ...a, photoIds, photoCount: photoIds.length };
  });

  // group reactions by target id, then by emoji (no `mine` — added per caller)
  const reactionsByTarget = new Map<string, { emoji: string; count: number; byIds: string[] }[]>();
  {
    const byTarget = new Map<string, Map<string, string[]>>();
    for (const r of d.reactionRows) {
      const emojis = byTarget.get(r.targetId) ?? byTarget.set(r.targetId, new Map()).get(r.targetId)!;
      (emojis.get(r.emoji) ?? emojis.set(r.emoji, []).get(r.emoji)!).push(r.byId);
    }
    for (const [targetId, emojis] of byTarget) {
      reactionsByTarget.set(
        targetId,
        [...emojis.entries()].map(([emoji, byIds]) => ({ emoji, count: byIds.length, byIds })).sort((a, b) => b.count - a.count),
      );
    }
  }

  const commentRowsByPhoto = new Map<string, typeof d.commentRows>();
  for (const c of d.commentRows) {
    (commentRowsByPhoto.get(c.photoId) ?? commentRowsByPhoto.set(c.photoId, []).get(c.photoId)!).push(c);
  }

  return {
    locations: d.locationRows,
    people: d.personRows,
    photos,
    documents: d.documentRows,
    albums,
    photoById,
    albumById: new Map(albums.map((a) => [a.id, a])),
    personById: d.personById,
    documentById: d.documentById,
    locationById: d.locationById,
    reactionsByTarget,
    commentRowsByPhoto,
  };
});

// --- collections ------------------------------------------------------------
export async function getPhotos(): Promise<Photo[]> { return (await build()).photos; }
export async function getPeople(): Promise<Person[]> { return (await build()).people; }
export async function getAlbums(): Promise<Album[]> { return (await build()).albums; }
export async function getLocations(): Promise<Location[]> { return (await build()).locations; }
export async function getDocuments(): Promise<FamilyDocument[]> { return (await build()).documents; }

// --- getters ----------------------------------------------------------------
export async function getPhoto(id: string): Promise<Photo> {
  const p = (await build()).photoById.get(id);
  if (!p) throw new Error(`Unknown photo: ${id}`);
  return p;
}
export async function getPerson(id: string): Promise<Person> {
  const p = (await build()).personById.get(id);
  if (!p) throw new Error(`Unknown person: ${id}`);
  return p;
}
export async function getAlbum(id: string): Promise<Album> {
  const a = (await build()).albumById.get(id);
  if (!a) throw new Error(`Unknown album: ${id}`);
  return a;
}
export async function getDocument(id: string): Promise<FamilyDocument> {
  const dd = (await build()).documentById.get(id);
  if (!dd) throw new Error(`Unknown document: ${id}`);
  return dd;
}
export async function getLocation(id: string): Promise<Location> {
  const l = (await build()).locationById.get(id);
  if (!l) throw new Error(`Unknown location: ${id}`);
  return l;
}

// --- queries ----------------------------------------------------------------
export async function photosForAlbum(album: Album): Promise<Photo[]> {
  const h = await build();
  return album.photoIds.map((id) => h.photoById.get(id)).filter((p): p is Photo => Boolean(p));
}
export async function photosForPerson(personId: string): Promise<Photo[]> {
  return (await build()).photos.filter((p) => p.faceTags.some((t) => t.personId === personId));
}
export async function photosForLocation(locationId: string): Promise<Photo[]> {
  return (await build()).photos.filter((p) => p.locationId === locationId);
}
export async function albumsForPhoto(photo: Photo): Promise<Album[]> {
  const h = await build();
  return photo.albumIds.map((id) => h.albumById.get(id)).filter((a): a is Album => Boolean(a));
}

/** Locations that have at least one photo, with their photo counts (for maps). */
export async function locationsWithCounts(): Promise<{ location: Location; count: number; coverPhotoId?: string }[]> {
  const h = await build();
  return h.locations
    .map((location) => {
      const ps = h.photos.filter((p) => p.locationId === location.id);
      return { location, count: ps.length, coverPhotoId: ps[0]?.id };
    })
    .filter((x) => x.count > 0);
}

/** "On this day" — photos with a known calendar day matching month/day, newest first. */
export async function onThisDay(month: number, day: number): Promise<Photo[]> {
  return (await build()).photos
    .filter((p) => p.date.precision === "day" && p.date.month === month && p.date.day === day)
    .sort((a, b) => (b.date.year ?? 0) - (a.date.year ?? 0));
}

// --- comments & reactions ---------------------------------------------------
function withMine(groups: { emoji: string; count: number; byIds: string[] }[] | undefined, meId?: string): ReactionSummary[] {
  return (groups ?? []).map((g) => ({ ...g, mine: meId ? g.byIds.includes(meId) : false }));
}

/** Grouped emoji reactions on a photo. Pass the current member id to set `mine`. */
export async function reactionsForPhoto(photoId: string, meId?: string): Promise<ReactionSummary[]> {
  return withMine((await build()).reactionsByTarget.get(photoId), meId);
}

/** Threaded comments for a photo: top-level oldest-first, each with nested replies. */
export async function commentsForPhoto(photoId: string, meId?: string): Promise<Comment[]> {
  const h = await build();
  const rows = h.commentRowsByPhoto.get(photoId) ?? [];
  const all: Comment[] = rows.map((c) => ({
    id: c.id,
    photoId: c.photoId,
    parentId: c.parentId,
    author: h.personById.get(c.authorId)!,
    body: c.body,
    when: c.when,
    reactions: withMine(h.reactionsByTarget.get(c.id), meId),
    replies: [],
  }));
  const byId = new Map(all.map((c) => [c.id, c]));
  const repliesByParent = new Map<string, Comment[]>();
  const roots: Comment[] = [];
  for (const c of all) {
    if (c.parentId && byId.has(c.parentId)) {
      (repliesByParent.get(c.parentId) ?? repliesByParent.set(c.parentId, []).get(c.parentId)!).push(c);
    } else {
      roots.push(c);
    }
  }
  for (const c of all) c.replies = repliesByParent.get(c.id) ?? [];
  return roots;
}

/** Total comments (including replies) on a photo. */
export async function commentCount(photoId: string): Promise<number> {
  return ((await build()).commentRowsByPhoto.get(photoId) ?? []).length;
}

/** A single raw comment row (un-hydrated), or null. Used to validate a reply's
 * parent and attribute `comment-reply` feed events. */
export async function commentRowById(id: string): Promise<CommentRow | null> {
  return (await loadData()).commentById.get(id) ?? null;
}

// --- life events & change history -------------------------------------------

/** A person's life events, oldest-first, with locations resolved. */
export async function lifeEventsForPerson(personId: string): Promise<LifeEvent[]> {
  const d = await loadData();
  return d.lifeEventRows
    .filter((e) => e.personId === personId)
    .map((e) => ({ ...e, location: e.locationId ? d.locationById.get(e.locationId) : undefined }))
    .sort((a, b) => (a.date.year ?? 0) - (b.date.year ?? 0));
}

/** A single life event with its location resolved. */
export async function getLifeEvent(id: string): Promise<LifeEvent> {
  const d = await loadData();
  const e = d.lifeEventRows.find((x) => x.id === id);
  if (!e) throw new Error(`Unknown life event: ${id}`);
  return { ...e, location: e.locationId ? d.locationById.get(e.locationId) : undefined };
}

/** A person's change history, newest edit first. */
export async function changelogForPerson(personId: string): Promise<Changelog[]> {
  const d = await loadData();
  return d.changelogRows
    .filter((c) => c.personId === personId)
    .slice()
    .sort((a, b) => b.editedAt.localeCompare(a.editedAt));
}
