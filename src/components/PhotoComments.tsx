"use client";

import { useRef, useState } from "react";

import { InitialsAvatar } from "./InitialsAvatar";
import { CommentIcon, ReplyIcon, SmileIcon } from "./icons";
// Import from the prisma-free schema module so this client component doesn't
// pull the server data layer (Prisma/pg) into the browser bundle.
import { REACTION_EMOJI, type Comment, type Person, type ReactionSummary } from "@/data/db/schema";

// --- pure helpers (optimistic, client-only — nothing persists) --------------
function applyReaction(summaries: ReactionSummary[], emoji: string, meId: string): ReactionSummary[] {
  const next = summaries.map((s) => ({ ...s, byIds: [...s.byIds] }));
  const removeMe = (s: ReactionSummary) => {
    s.byIds = s.byIds.filter((id) => id !== meId);
    s.count = s.byIds.length;
    s.mine = false;
  };
  const mineSummary = next.find((s) => s.byIds.includes(meId));
  if (mineSummary && mineSummary.emoji === emoji) {
    removeMe(mineSummary);
  } else {
    if (mineSummary) removeMe(mineSummary);
    let target = next.find((s) => s.emoji === emoji);
    if (!target) {
      target = { emoji, byIds: [], count: 0, mine: false };
      next.push(target);
    }
    target.byIds.push(meId);
    target.count = target.byIds.length;
    target.mine = true;
  }
  return next.filter((s) => s.count > 0).sort((a, b) => b.count - a.count);
}

function mapTree(list: Comment[], id: string, fn: (c: Comment) => Comment): Comment[] {
  return list.map((c) => (c.id === id ? fn(c) : { ...c, replies: mapTree(c.replies, id, fn) }));
}
function addReply(list: Comment[], parentId: string, reply: Comment): Comment[] {
  return list.map((c) =>
    c.id === parentId ? { ...c, replies: [...c.replies, reply] } : { ...c, replies: addReply(c.replies, parentId, reply) },
  );
}
function countAll(list: Comment[]): number {
  return list.reduce((n, c) => n + 1 + countAll(c.replies), 0);
}

// --- reaction bar (shared by photo + each comment) --------------------------
function ReactionBar({
  reactions,
  onReact,
  size = "md",
}: {
  reactions: ReactionSummary[];
  onReact: (emoji: string) => void;
  size?: "sm" | "md";
}) {
  const [open, setOpen] = useState(false);
  const pill = size === "sm" ? "h-6 px-1.5 text-xs" : "h-7 px-2 text-sm";
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {reactions.map((r) => (
        <button
          key={r.emoji}
          type="button"
          onClick={() => onReact(r.emoji)}
          className={`inline-flex items-center gap-1 rounded-full ring-1 transition-colors ${pill} ${
            r.mine ? "bg-sepia/15 ring-sepia/40" : "bg-parchment ring-hairline hover:ring-sepia/30"
          }`}
        >
          <span>{r.emoji}</span>
          <span className="font-medium text-ink-soft">{r.count}</span>
        </button>
      ))}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label="Add reaction"
          className={`inline-flex items-center justify-center rounded-full bg-parchment text-ink-soft ring-1 ring-hairline transition-colors hover:text-sepia hover:ring-sepia/30 ${
            size === "sm" ? "size-6" : "size-7"
          }`}
        >
          <SmileIcon className="size-4" />
        </button>
        {open ? (
          <div className="absolute bottom-full left-0 z-20 mb-1.5 flex gap-0.5 rounded-full bg-cream p-1 shadow-lg shadow-walnut/15 ring-1 ring-hairline">
            {REACTION_EMOJI.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  onReact(emoji);
                  setOpen(false);
                }}
                className="flex size-7 items-center justify-center rounded-full text-base transition-transform hover:scale-125"
              >
                {emoji}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// --- composer ---------------------------------------------------------------
function Composer({
  me,
  placeholder,
  autoFocus,
  onSubmit,
  onCancel,
}: {
  me: Person;
  placeholder: string;
  autoFocus?: boolean;
  onSubmit: (body: string) => void;
  onCancel?: () => void;
}) {
  const [body, setBody] = useState("");
  return (
    <form
      className="flex items-start gap-2.5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!body.trim()) return;
        onSubmit(body.trim());
        setBody("");
      }}
    >
      <InitialsAvatar person={me} size="sm" className="mt-1" />
      <div className="min-w-0 flex-1">
        <textarea
          value={body}
          autoFocus={autoFocus}
          onChange={(e) => setBody(e.target.value)}
          placeholder={placeholder}
          rows={2}
          className="w-full resize-none rounded-xl border border-hairline bg-parchment px-3.5 py-2.5 text-[15px] text-ink placeholder:text-ink-soft/50 focus:border-sepia focus:outline-none focus:ring-2 focus:ring-sepia/20"
        />
        <div className="mt-1.5 flex gap-2">
          <button
            type="submit"
            disabled={!body.trim()}
            className="inline-flex h-9 items-center rounded-full bg-sepia px-4 text-sm font-medium text-cream transition-colors hover:bg-walnut disabled:opacity-50"
          >
            {onCancel ? "Reply" : "Post comment"}
          </button>
          {onCancel ? (
            <button type="button" onClick={onCancel} className="inline-flex h-9 items-center rounded-full px-3 text-sm text-ink-soft hover:text-sepia">
              Cancel
            </button>
          ) : null}
        </div>
      </div>
    </form>
  );
}

// --- one comment (recursive) ------------------------------------------------
function CommentNode({
  comment,
  me,
  depth,
  onReact,
  onReply,
}: {
  comment: Comment;
  me: Person;
  depth: number;
  onReact: (commentId: string, emoji: string) => void;
  onReply: (parentId: string, body: string) => void;
}) {
  const [replying, setReplying] = useState(false);
  return (
    <div className={depth > 0 ? "border-l border-hairline pl-3 sm:pl-4" : ""}>
      <div className="flex items-start gap-2.5">
        <InitialsAvatar person={comment.author} size="sm" className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <div className="rounded-2xl rounded-tl-sm bg-parchment px-3.5 py-2 ring-1 ring-hairline">
            <p className="text-sm font-medium text-ink">
              {comment.author.shortName}
              <span className="ml-2 text-xs font-normal text-ink-soft">{comment.when}</span>
            </p>
            <p className="mt-0.5 text-[15px] leading-6 text-ink">{comment.body}</p>
          </div>
          <div className="mt-1.5 flex items-center gap-3">
            <ReactionBar reactions={comment.reactions} onReact={(emoji) => onReact(comment.id, emoji)} size="sm" />
            <button
              type="button"
              onClick={() => setReplying((r) => !r)}
              className="inline-flex items-center gap-1 text-xs font-medium text-ink-soft transition-colors hover:text-sepia"
            >
              <ReplyIcon className="size-3.5" />
              Reply
            </button>
          </div>
          {replying ? (
            <div className="mt-2.5">
              <Composer
                me={me}
                autoFocus
                placeholder={`Reply to ${comment.author.shortName}…`}
                onSubmit={(body) => {
                  onReply(comment.id, body);
                  setReplying(false);
                }}
                onCancel={() => setReplying(false)}
              />
            </div>
          ) : null}
          {comment.replies.length > 0 ? (
            <div className="mt-3 flex flex-col gap-3">
              {comment.replies.map((reply) => (
                <CommentNode key={reply.id} comment={reply} me={me} depth={depth + 1} onReact={onReact} onReply={onReply} />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// --- the whole social block -------------------------------------------------
export function PhotoComments({
  photoId,
  me,
  initialReactions,
  initialComments,
}: {
  photoId: string;
  me: Person;
  initialReactions: ReactionSummary[];
  initialComments: Comment[];
}) {
  const [photoReactions, setPhotoReactions] = useState(initialReactions);
  const [comments, setComments] = useState(initialComments);
  const nextId = useRef(1);

  const newComment = (body: string, parentId: string | null): Comment => ({
    id: `local-${nextId.current++}`,
    photoId,
    parentId,
    author: me,
    body,
    when: "Just now",
    reactions: [],
    replies: [],
  });

  const reactToComment = (commentId: string, emoji: string) =>
    setComments((cs) => mapTree(cs, commentId, (c) => ({ ...c, reactions: applyReaction(c.reactions, emoji, me.id) })));

  return (
    <section className="rounded-xl bg-cream p-5 ring-1 ring-hairline">
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight text-walnut">
        <CommentIcon className="size-5 text-brass" />
        Comments
        <span className="text-sm font-normal text-ink-soft">({countAll(comments)})</span>
      </h2>

      {/* photo-level reactions */}
      <div className="mt-3 flex items-center gap-2 border-b border-hairline pb-4">
        <span className="text-sm text-ink-soft">React to this photo:</span>
        <ReactionBar
          reactions={photoReactions}
          onReact={(emoji) => setPhotoReactions((rs) => applyReaction(rs, emoji, me.id))}
        />
      </div>

      {/* new top-level comment */}
      <div className="mt-4">
        <Composer me={me} placeholder="Add a comment…" onSubmit={(body) => setComments((cs) => [...cs, newComment(body, null)])} />
      </div>

      {/* thread */}
      {comments.length > 0 ? (
        <div className="mt-5 flex flex-col gap-4">
          {comments.map((c) => (
            <CommentNode
              key={c.id}
              comment={c}
              me={me}
              depth={0}
              onReact={reactToComment}
              onReply={(parentId, body) => setComments((cs) => addReply(cs, parentId, newComment(body, parentId)))}
            />
          ))}
        </div>
      ) : (
        <p className="mt-5 text-sm text-ink-soft">No comments yet — be the first to say something.</p>
      )}
    </section>
  );
}
