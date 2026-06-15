/**
 * Pure reaction rules — shared between the optimistic client UI and the server
 * write path so they agree exactly. One person has at most one reaction per
 * target: clicking your current emoji clears it; clicking a different emoji
 * replaces it. The write seam (mutations.toggleReaction) always deletes the
 * person's existing reaction first, then adds back whatever this returns.
 */
import { REACTION_EMOJI, type ReactionEmoji } from "./schema";

const PALETTE = new Set<string>(REACTION_EMOJI);

export function isReactionEmoji(s: string): s is ReactionEmoji {
  return PALETTE.has(s);
}

/**
 * Given the emoji this person currently has on a target (or null) and the one
 * they clicked, the emoji that should remain — `null` means "toggle off".
 */
export function nextReactionEmoji(current: string | null, clicked: string): string | null {
  return clicked === current ? null : clicked;
}
