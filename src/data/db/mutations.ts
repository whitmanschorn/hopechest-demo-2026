/**
 * The write seam. Every mutation in the app goes through here — the read repos
 * (repos.ts) stay pure. Postgres-backed (Prisma): INSERT/UPDATE/DELETE. Callers
 * (the person-edit server actions) don't care how it's stored.
 *
 * Single-writer demo: no locking, last-write-wins.
 */
import { prisma } from "@/lib/prisma";
import { fuzzyDateToColumns } from "./fuzzyDate";
import { nextReactionEmoji } from "./reactions";
import type { AlbumPhotoRow, AlbumRow, ChangelogRow, CommentRow, FeedItem, LifeEventRow, PersonRow, PhotoRow } from "./schema";

/** Mutate a person's editable fields. `undefined` in the patch clears the field
 * (→ null for scalars, [] for the array columns). */
export async function applyPersonPatch(
  personId: string,
  patch: Partial<PersonRow>,
): Promise<void> {
  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (key === "nicknames" || key === "alternateNames") {
      data[key] = (value as string[] | undefined) ?? [];
    } else {
      data[key] = value === undefined ? null : value;
    }
  }
  await prisma.person.update({ where: { id: personId }, data });
}

/** Append a life event. */
export async function insertLifeEvent(row: LifeEventRow): Promise<void> {
  await prisma.lifeEvent.create({
    data: {
      id: row.id,
      personId: row.personId,
      kind: row.kind,
      title: row.title,
      date: row.date as unknown as object,
      locationId: row.locationId ?? null,
      description: row.description ?? null,
      createdById: row.createdById,
      createdAt: row.createdAt,
    },
  });
}

/** Patch a life event. Keys present in the patch are written (clearable to null). */
export async function updateLifeEvent(
  id: string,
  patch: Partial<LifeEventRow>,
): Promise<void> {
  const data: Record<string, unknown> = {};
  if (patch.kind !== undefined) data.kind = patch.kind;
  if (patch.title !== undefined) data.title = patch.title;
  if (patch.date !== undefined) data.date = patch.date as unknown as object;
  if ("locationId" in patch) data.locationId = patch.locationId ?? null;
  if ("description" in patch) data.description = patch.description ?? null;
  await prisma.lifeEvent.update({ where: { id }, data });
}

/** Remove a life event. No-op if already gone. */
export async function deleteLifeEvent(id: string): Promise<void> {
  await prisma.lifeEvent.deleteMany({ where: { id } });
}

// --- photos & albums --------------------------------------------------------

/** Insert a newly-uploaded photo. The FuzzyDate is flattened into date* columns;
 * the variant blobs (photographer/takenWhere/restoration) are JSON or null. */
export async function insertPhoto(row: PhotoRow): Promise<void> {
  await prisma.photo.create({
    data: {
      id: row.id,
      title: row.title,
      src: row.src,
      width: row.width,
      height: row.height,
      description: row.description ?? null,
      contributedById: row.contributedById,
      contributedWhen: row.contributedWhen,
      photographer: (row.photographer as unknown as object) ?? undefined,
      takenWhere: (row.takenWhere as unknown as object) ?? undefined,
      locationId: row.locationId ?? null,
      restoration: (row.restoration as unknown as object) ?? undefined,
      ...fuzzyDateToColumns(row.date),
    },
  });
}

/** Create an album (standard or smart). */
export async function insertAlbum(row: AlbumRow): Promise<void> {
  await prisma.album.create({
    data: {
      id: row.id,
      title: row.title,
      kind: row.kind,
      coverPhotoId: row.coverPhotoId,
      rule: row.rule ?? null,
      subtitle: row.subtitle ?? null,
      smartQuery: (row.smartQuery as unknown as object) ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    },
  });
}

/** Add photos to an album (ordered by `position`). */
export async function insertAlbumPhotos(rows: AlbumPhotoRow[]): Promise<void> {
  await prisma.albumPhoto.createMany({ data: rows });
}

// --- comments & reactions ---------------------------------------------------

/** Append a comment (top-level or reply). */
export async function insertComment(row: CommentRow): Promise<void> {
  await prisma.comment.create({
    data: {
      id: row.id,
      photoId: row.photoId,
      parentId: row.parentId,
      authorId: row.authorId,
      body: row.body,
      when: row.when,
    },
  });
}

/**
 * Toggle one person's reaction on a photo or comment. A person has at most one
 * reaction per target (see reactions.ts): we read their current one inside the
 * transaction, clear it, and add back the next emoji — `null` clears it for good
 * (clicked the same emoji again). `newId` is used only when a row is created.
 */
export async function toggleReaction(
  target: { photoId: string } | { commentId: string },
  byId: string,
  clicked: string,
  newId: string,
): Promise<void> {
  const where = "photoId" in target ? { photoId: target.photoId } : { commentId: target.commentId };
  await prisma.$transaction(async (tx) => {
    const existing = await tx.reaction.findFirst({ where: { ...where, byId } });
    const next = nextReactionEmoji(existing?.emoji ?? null, clicked);
    await tx.reaction.deleteMany({ where: { ...where, byId } });
    if (next) {
      await tx.reaction.create({ data: { id: newId, ...where, emoji: next, byId } });
    }
  });
}

const UI_TO_FEED_KIND: Record<FeedItem["kind"], string> = {
  "photo-added": "photo_added",
  restoration: "restoration",
  "new-copy-linked": "new_copy_linked",
  "person-milestone": "person_milestone",
  "ask-highlight": "ask_highlight",
  "comment-added": "comment_added",
  "comment-reply": "comment_reply",
};

/** Append a home-feed event. Maps the UI kind back to the stored enum form. */
export async function insertFeedItem(item: FeedItem): Promise<void> {
  const optional = item as Partial<Record<"photoId" | "byId" | "personId" | "commentId" | "parentAuthorId" | "blurb" | "question" | "excerpt", string>>;
  await prisma.feedItem.create({
    data: {
      id: item.id,
      kind: UI_TO_FEED_KIND[item.kind] as never,
      when: item.when,
      photoId: optional.photoId ?? null,
      byId: optional.byId ?? null,
      personId: optional.personId ?? null,
      commentId: optional.commentId ?? null,
      parentAuthorId: optional.parentAuthorId ?? null,
      blurb: optional.blurb ?? null,
      question: optional.question ?? null,
      excerpt: optional.excerpt ?? null,
    },
  });
}

/** Append a changelog entry. */
export async function insertChangelog(row: ChangelogRow): Promise<void> {
  await prisma.changelog.create({
    data: {
      id: row.id,
      entityType: row.entityType,
      entityId: row.entityId,
      personId: row.personId,
      field: row.field,
      before: row.before,
      after: row.after,
      editedById: row.editedById,
      editedAt: row.editedAt,
      summary: row.summary ?? null,
    },
  });
}
