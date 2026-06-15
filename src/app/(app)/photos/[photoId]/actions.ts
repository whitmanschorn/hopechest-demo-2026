"use server";

import { revalidatePath } from "next/cache";

import { commentRowById, getPerson, getPhoto } from "@/data";
import { deletePhotoPersonTag, insertComment, insertFeedItem, insertPhotoPersonTag, toggleReaction } from "@/data/db/mutations";
import { isValidBox } from "@/data/db/faceTag";
import { isReactionEmoji } from "@/data/db/reactions";
import type { CommentRow, FaceBox, FeedItem } from "@/data/db/schema";
import { requireCurrentPerson } from "@/lib/auth/session";

export interface ActionResult {
  ok: boolean;
  errors?: string[];
}

function genId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

async function photoExists(photoId: string): Promise<boolean> {
  try {
    await getPhoto(photoId);
    return true;
  } catch {
    return false;
  }
}

/** Post a comment or reply on a photo, and surface it on the home feed. */
export async function postComment(
  photoId: string,
  parentId: string | null,
  body: string,
): Promise<ActionResult> {
  const text = body.trim();
  if (!text) return { ok: false, errors: ["Write something first."] };
  if (!(await photoExists(photoId))) return { ok: false, errors: ["That photo no longer exists."] };

  // A reply's parent must exist and live on the same photo.
  let parent: CommentRow | null = null;
  if (parentId) {
    parent = await commentRowById(parentId);
    if (!parent || parent.photoId !== photoId) {
      return { ok: false, errors: ["The comment you're replying to is gone."] };
    }
  }

  const me = await requireCurrentPerson();
  const id = genId("c");
  await insertComment({ id, photoId, parentId, authorId: me.id, body: text, when: "Just now" });

  const excerpt = text.length > 80 ? `${text.slice(0, 80)}…` : text;
  const feedItem: FeedItem = parent
    ? { kind: "comment-reply", id: genId("f"), photoId, byId: me.id, parentAuthorId: parent.authorId, commentId: id, excerpt, when: "Just now" }
    : { kind: "comment-added", id: genId("f"), photoId, byId: me.id, commentId: id, excerpt, when: "Just now" };
  await insertFeedItem(feedItem);

  revalidatePath(`/photos/${photoId}`);
  revalidatePath("/home");
  return { ok: true };
}

async function react(target: { photoId: string } | { commentId: string }, emoji: string, photoId: string): Promise<ActionResult> {
  if (!isReactionEmoji(emoji)) return { ok: false, errors: ["That's not a reaction we offer."] };
  const me = await requireCurrentPerson();
  await toggleReaction(target, me.id, emoji, genId("r"));
  revalidatePath(`/photos/${photoId}`);
  return { ok: true };
}

/** Toggle the current person's reaction on a photo. */
export async function togglePhotoReaction(photoId: string, emoji: string): Promise<ActionResult> {
  if (!(await photoExists(photoId))) return { ok: false, errors: ["That photo no longer exists."] };
  return react({ photoId }, emoji, photoId);
}

/** Toggle the current person's reaction on a comment. */
export async function toggleCommentReaction(commentId: string, emoji: string): Promise<ActionResult> {
  const comment = await commentRowById(commentId);
  if (!comment) return { ok: false, errors: ["That comment is gone."] };
  return react({ commentId }, emoji, comment.photoId);
}

/** Manually tag a person in a photo at the given box (percent coords). */
export async function tagPerson(photoId: string, personId: string, box: FaceBox): Promise<ActionResult> {
  let photo;
  try {
    photo = await getPhoto(photoId);
  } catch {
    return { ok: false, errors: ["That photo no longer exists."] };
  }
  try {
    await getPerson(personId);
  } catch {
    return { ok: false, errors: ["That person isn't in the chest."] };
  }
  if (!isValidBox(box)) return { ok: false, errors: ["That tag falls outside the photo."] };
  if (photo.faceTags.some((t) => t.personId === personId)) return { ok: true }; // already tagged

  await requireCurrentPerson();
  await insertPhotoPersonTag({ photoId, personId, box, confidence: null });
  revalidatePath(`/photos/${photoId}`);
  return { ok: true };
}

/** Remove a person's tag from a photo. */
export async function untagPerson(photoId: string, personId: string): Promise<ActionResult> {
  await requireCurrentPerson();
  await deletePhotoPersonTag(photoId, personId);
  revalidatePath(`/photos/${photoId}`);
  return { ok: true };
}
