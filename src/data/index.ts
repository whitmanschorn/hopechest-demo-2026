/**
 * Public data API. Everything the app needs comes from here; pages and
 * components import from "@/data" and never reach into db/ or Prisma directly.
 * Backed by Postgres (Neon) via Prisma — see src/data/db. All reads are async.
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

// repositories: collections, getters, and queries (all async)
export {
  albumsForPhoto,
  changelogForPerson,
  commentCount,
  commentsForPhoto,
  getAlbum,
  getAlbums,
  getDocument,
  getDocuments,
  getLifeEvent,
  getLocation,
  getLocations,
  getPeople,
  getPerson,
  getPhoto,
  getPhotos,
  lifeEventsForPerson,
  locationsWithCounts,
  onThisDay,
  photosForAlbum,
  photosForLocation,
  photosForPerson,
  reactionsForPhoto,
} from "./db/repos";

// fuzzy-date helpers (prisma-free, safe for client components)
export { formatDate, parseFuzzyDate } from "./db/fuzzyDate";

// kinship: resolver-backed relationships and @mention suggestions
export {
  describeRelationshipTo,
  familyGraph,
  relationshipTo,
  suggestMentions,
  type MentionSuggestion,
} from "./db/mentions";
export type { Relation, RelationKind } from "./kinship";

// loose singletons / lists (async getters)
import { loadData } from "./db/load";
import type { FeedItem, Invite, Member, NewsletterIssue, PastIssue, ScriptedExchange } from "./db/schema";

export async function getFeed(): Promise<FeedItem[]> { return (await loadData()).feedRows; }
export async function getMembers(): Promise<Member[]> { return (await loadData()).memberRows; }
export async function getInvites(): Promise<Invite[]> { return (await loadData()).inviteRows; }
export async function getChestName(): Promise<string> { return (await loadData()).config.chestName; }
/** Pinned "today" so date-relative UI (On This Day) is deterministic in the demo. */
export async function getDemoToday(): Promise<string> { return (await loadData()).config.demoToday; }

export async function getCurrentIssue(): Promise<NewsletterIssue> { return (await loadData()).newsletter.currentIssue; }
export async function getPastIssues(): Promise<PastIssue[]> { return (await loadData()).newsletter.pastIssues; }
export async function getExchanges(): Promise<ScriptedExchange[]> { return (await loadData()).askScript.exchanges; }
export async function getFallbackExchange(): Promise<ScriptedExchange> { return (await loadData()).askScript.fallbackExchange; }
