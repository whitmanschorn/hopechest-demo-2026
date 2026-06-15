"use server";

import { revalidatePath } from "next/cache";

import { commentRowById, getPhoto } from "@/data";
import { insertComment, insertFeedItem, toggleReaction } from "@/data/db/mutations";
import { isReactionEmoji } from "@/data/db/reactions";
import type { CommentRow, FeedItem } from "@/data/db/schema";
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
