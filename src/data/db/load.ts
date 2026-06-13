/**
 * Loads the JSON "tables" once and exposes typed rows + id indexes. This is the
 * single seam where raw storage meets the app — swapping JSON for Postgres later
 * means reimplementing this file (and the repos) against a real driver; nothing
 * upstream changes.
 */
import albumPhotosJson from "../json/album_photos.json";
import albumsJson from "../json/albums.json";
import askScriptJson from "../json/ask_script.json";
import commentsJson from "../json/comments.json";
import configJson from "../json/config.json";
import documentsJson from "../json/documents.json";
import feedJson from "../json/feed.json";
import invitesJson from "../json/invites.json";
import reactionsJson from "../json/reactions.json";
import locationsJson from "../json/locations.json";
import membersJson from "../json/members.json";
import newsletterJson from "../json/newsletter.json";
import peopleJson from "../json/people.json";
import photoCapturesJson from "../json/photo_captures.json";
import photoPeopleJson from "../json/photo_people.json";
import photosJson from "../json/photos.json";
import relationshipsJson from "../json/relationships.json";
import {
  REACTION_EMOJI,
  type AlbumPhotoRow,
  type AlbumRow,
  type CommentRow,
  type DocumentRow,
  type FeedItem,
  type InviteRow,
  type LocationRow,
  type MemberRow,
  type NewsletterIssue,
  type PastIssue,
  type PersonRow,
  type PhotoCaptureRow,
  type PhotoPersonRow,
  type PhotoRow,
  type ReactionRow,
  type RelationshipRow,
  type ScriptedExchange,
} from "./schema";

// JSON imports infer wide types (e.g. string for our string unions), so cast
// each table through `unknown` to its row contract.
const as = <T>(v: unknown) => v as T;

export const personRows = as<PersonRow[]>(peopleJson);
export const relationshipRows = as<RelationshipRow[]>(relationshipsJson);
export const locationRows = as<LocationRow[]>(locationsJson);
export const photoRows = as<PhotoRow[]>(photosJson);
export const photoPersonRows = as<PhotoPersonRow[]>(photoPeopleJson);
export const photoCaptureRows = as<PhotoCaptureRow[]>(photoCapturesJson);
export const albumRows = as<AlbumRow[]>(albumsJson);
export const albumPhotoRows = as<AlbumPhotoRow[]>(albumPhotosJson);
export const documentRows = as<DocumentRow[]>(documentsJson);
export const feedRows = as<FeedItem[]>(feedJson);
export const memberRows = as<MemberRow[]>(membersJson);
export const inviteRows = as<InviteRow[]>(invitesJson);
export const commentRows = as<CommentRow[]>(commentsJson);
export const reactionRows = as<ReactionRow[]>(reactionsJson);

export const config = as<{ currentMemberId: string; chestName: string; demoToday: string }>(configJson);
export const newsletter = as<{ currentIssue: NewsletterIssue; pastIssues: PastIssue[] }>(newsletterJson);
export const askScript = as<{ exchanges: ScriptedExchange[]; fallbackExchange: ScriptedExchange }>(askScriptJson);

// --- id indexes (built once) ------------------------------------------------
export const personById = new Map(personRows.map((p) => [p.id, p]));
export const locationById = new Map(locationRows.map((l) => [l.id, l]));
export const photoById = new Map(photoRows.map((p) => [p.id, p]));
export const albumById = new Map(albumRows.map((a) => [a.id, a]));
export const documentById = new Map(documentRows.map((d) => [d.id, d]));
export const commentById = new Map(commentRows.map((c) => [c.id, c]));

/**
 * Validate every foreign key in the dataset. Cheap and pure — run from a Jest
 * test (and could gate a future Postgres import). Returns the list of problems;
 * empty means the dataset is internally consistent.
 */
export function checkIntegrity(): string[] {
  const errors: string[] = [];
  const personExists = (id: string) => personById.has(id);
  const photoExists = (id: string) => photoById.has(id);
  const has = (ok: boolean, msg: string) => { if (!ok) errors.push(msg); };

  for (const r of relationshipRows) {
    has(personExists(r.fromId), `relationship.fromId missing: ${r.fromId}`);
    has(personExists(r.toId), `relationship.toId missing: ${r.toId}`);
  }
  for (const p of photoRows) {
    has(personExists(p.contributedById), `photo ${p.id} contributedById missing: ${p.contributedById}`);
    if (p.locationId) has(locationById.has(p.locationId), `photo ${p.id} locationId missing: ${p.locationId}`);
  }
  for (const pp of photoPersonRows) {
    has(photoExists(pp.photoId), `photo_people photoId missing: ${pp.photoId}`);
    has(personExists(pp.personId), `photo_people personId missing: ${pp.personId}`);
  }
  for (const c of photoCaptureRows) {
    has(photoExists(c.photoId), `photo_captures photoId missing: ${c.photoId}`);
    has(personExists(c.capturedById), `photo_captures capturedById missing: ${c.capturedById}`);
  }
  for (const ap of albumPhotoRows) {
    has(albumById.has(ap.albumId), `album_photos albumId missing: ${ap.albumId}`);
    has(photoExists(ap.photoId), `album_photos photoId missing: ${ap.photoId}`);
  }
  for (const a of albumRows) {
    has(photoExists(a.coverPhotoId), `album ${a.id} coverPhotoId missing: ${a.coverPhotoId}`);
  }
  for (const d of documentRows) {
    has(personExists(d.uploadedById), `document ${d.id} uploadedById missing: ${d.uploadedById}`);
    if (d.locationId) has(locationById.has(d.locationId), `document ${d.id} locationId missing: ${d.locationId}`);
  }
  for (const p of personRows) {
    if (p.suggestedMatchPhotoId) has(photoExists(p.suggestedMatchPhotoId), `person ${p.id} suggestedMatchPhotoId missing: ${p.suggestedMatchPhotoId}`);
  }
  for (const m of memberRows) has(personExists(m.personId), `member personId missing: ${m.personId}`);
  has(personExists(config.currentMemberId), `config.currentMemberId missing: ${config.currentMemberId}`);

  for (const c of commentRows) {
    has(photoExists(c.photoId), `comment ${c.id} photoId missing: ${c.photoId}`);
    has(personExists(c.authorId), `comment ${c.id} authorId missing: ${c.authorId}`);
    if (c.parentId) {
      const parent = commentById.get(c.parentId);
      has(Boolean(parent), `comment ${c.id} parentId missing: ${c.parentId}`);
      if (parent) has(parent.photoId === c.photoId, `comment ${c.id} replies across photos`);
    }
  }
  const emojiSet = new Set<string>(REACTION_EMOJI);
  for (const r of reactionRows) {
    has(personExists(r.byId), `reaction ${r.id} byId missing: ${r.byId}`);
    has(emojiSet.has(r.emoji), `reaction ${r.id} emoji not in palette: ${r.emoji}`);
    const exists = r.targetType === "photo" ? photoExists(r.targetId) : commentById.has(r.targetId);
    has(exists, `reaction ${r.id} ${r.targetType} target missing: ${r.targetId}`);
  }

  return errors;
}
