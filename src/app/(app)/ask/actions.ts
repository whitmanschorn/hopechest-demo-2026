"use server";

import { suggestMentions, type MentionSuggestion } from "@/data";

/** Server action so the client AskChat can run kinship-aware @mention search
 * (which needs the family graph) without shipping the whole graph to the browser. */
export async function suggestMentionsAction(
  query: string,
  fromId: string,
): Promise<MentionSuggestion[]> {
  return suggestMentions(query, fromId);
}
