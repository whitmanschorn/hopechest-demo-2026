/**
 * Public data API. Everything the app needs comes from here; pages and
 * components import from "@/data" and never reach into json/ or db/ directly.
 * Today this is backed by JSON files + in-memory repositories (src/data/db);
 * swapping in Postgres later means changing db/, not this surface.
 */

// types
export type {
  Album,
  AnswerBlock,
  Changelog,
  ChangelogEntityType,
  Comment,
  FamilyDocument,
  FaceTag,
  FeedItem,
  FuzzyDate,
  Gender,
  Invite,
  LifeEvent,
  LifeEventKind,
  LifeEventRow,
  Location,
  Member,
  NewsletterIssue,
  PastIssue,
  Person,
  Photo,
  PhotoCapture,
  PhotoFact,
  ReactionSummary,
  Role,
  ScriptedExchange,
  SmartQuery,
} from "./db/schema";
export { REACTION_EMOJI } from "./db/schema";

// repositories: collections, getters, and queries
export {
  albums,
  albumsForPhoto,
  changelogForPerson,
  commentCount,
  commentsForPhoto,
  documents,
  getAlbum,
  getDocument,
  getLifeEvent,
  getLocation,
  getPerson,
  getPhoto,
  lifeEventsForPerson,
  locations,
  locationsWithCounts,
  onThisDay,
  people,
  photos,
  photosForAlbum,
  photosForLocation,
  photosForPerson,
  reactionsForPhoto,
} from "./db/repos";

// kinship: resolver-backed relationships and @mention suggestions
export {
  describeRelationshipTo,
  graph as familyGraph,
  relationshipTo,
  suggestMentions,
  type MentionSuggestion,
} from "./db/mentions";
export type { Relation, RelationKind } from "./kinship";

// integrity check (used by tests; could gate a future Postgres import)
export { checkIntegrity } from "./db/load";

// fuzzy-date parsing (shared by the add-event form preview and server actions)
export { parseFuzzyDate } from "./db/fuzzyDate";

// loose singletons / lists
import { askScript, config, feedRows, inviteRows, memberRows, newsletter } from "./db/load";
import type { FeedItem, Invite, Member, NewsletterIssue, PastIssue, ScriptedExchange } from "./db/schema";

export const feed: FeedItem[] = feedRows;
export const members: Member[] = memberRows;
export const invites: Invite[] = inviteRows;
export const currentMemberId: string = config.currentMemberId;
export const chestName: string = config.chestName;
/** Pinned "today" so date-relative UI (On This Day) is deterministic in the demo. */
export const demoToday: string = config.demoToday;

export const currentIssue: NewsletterIssue = newsletter.currentIssue;
export const pastIssues: PastIssue[] = newsletter.pastIssues;
export const exchanges: ScriptedExchange[] = askScript.exchanges;
export const fallbackExchange: ScriptedExchange = askScript.fallbackExchange;

/** Format a fuzzy date for display (the row already carries a `display` string). */
export function formatDate(date: { display: string }): string {
  return date.display;
}
