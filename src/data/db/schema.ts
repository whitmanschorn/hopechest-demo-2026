/**
 * The schema contract for the JSON-backed mock database.
 *
 * Two layers:
 *   - **Row types** (`*Row`) mirror the JSON "tables" 1:1 — flat, normalized,
 *     foreign-key ids, join tables. This is the shape a Postgres migration
 *     would produce (each Row ≈ a table; each join table ≈ a join table).
 *   - **Domain types** are the hydrated objects the UI consumes (a `Photo` with
 *     its face tags, copies, albums, and resolved location attached). Repos in
 *     this folder are the only code that turns Rows into Domain objects.
 */

export type Gender = "f" | "m";

/** A date known to varying precision — exact day down to a fuzzy "circa year". */
export interface FuzzyDate {
  /** ISO `YYYY-MM-DD`, present only when precision is "day". */
  iso?: string;
  year?: number;
  /** 1–12 */
  month?: number;
  /** 1–31 */
  day?: number;
  precision: "day" | "month" | "year" | "circa";
  /** Human caption, e.g. "June 10, 1950" or "Summer 1933". */
  display: string;
  /** True when Hopechest inferred the date rather than reading it off a record. */
  deduced?: boolean;
  clue?: string;
}

/** A provenance fact about a photo (who/where), possibly deduced. */
export interface PhotoFact {
  value: string;
  deduced?: boolean;
  clue?: string;
}

// --- Row types (the JSON tables) --------------------------------------------

export interface PersonRow {
  id: string;
  name: string;
  shortName: string;
  fullName: string;
  maidenName?: string;
  nicknames?: string[];
  alternateNames?: string[];
  relation: string;
  gender: Gender;
  lifespan?: string;
  avatarSrc?: string;
  photoCount: number;
  /** A photo Hopechest thinks might also be this person, awaiting confirmation. */
  suggestedMatchPhotoId?: string;
}

export type RelationshipType = "parent" | "spouse";

/** Directed for "parent" (from = parent, to = child); order-agnostic for "spouse". */
export interface RelationshipRow {
  fromId: string;
  toId: string;
  type: RelationshipType;
}

export interface LocationRow {
  id: string;
  label: string;
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  lat: number;
  lng: number;
}

export interface PhotoRow {
  id: string;
  title: string;
  src: string;
  width: number;
  height: number;
  description?: string;
  contributedById: string;
  contributedWhen: string;
  photographer?: PhotoFact;
  takenWhere?: PhotoFact;
  date: FuzzyDate;
  locationId?: string | null;
  restoration?: { restoredSrc: string; summary: string };
}

export interface FaceBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PhotoPersonRow {
  photoId: string;
  personId: string;
  box: FaceBox;
  confidence?: number | null;
}

export type CaptureFraming = "table-warm" | "album-page";

export interface PhotoCaptureRow {
  id: string;
  photoId: string;
  capturedById: string;
  capturedAt: string;
  device: string;
  framing: CaptureFraming;
  note?: string | null;
}

export type AlbumKind = "standard" | "smart";

export interface SmartQuery {
  taggedPersonId?: string;
  locationId?: string;
  sort?: "oldest" | "newest";
}

export interface AlbumRow {
  id: string;
  title: string;
  kind: AlbumKind;
  coverPhotoId: string;
  rule?: string;
  subtitle?: string;
  smartQuery?: SmartQuery;
  createdAt: string;
  updatedAt: string;
}

export interface AlbumPhotoRow {
  albumId: string;
  photoId: string;
  position: number;
}

export type DocumentKind = "letter" | "record" | "recipe" | "telegram";

export interface DocumentRow {
  id: string;
  title: string;
  kind: DocumentKind;
  scanSrc?: string;
  excerpt: string;
  year?: string;
  uploadedById: string;
  locationId?: string | null;
}

export type Role = "Admin" | "Contributor" | "Viewer";

export interface MemberRow {
  personId: string;
  role: Role;
  joined: string;
}

export interface InviteRow {
  id: string;
  name: string;
  email: string;
  sent: string;
}

export type FeedItem =
  | { kind: "photo-added"; id: string; photoId: string; byId: string; when: string; blurb?: string }
  | { kind: "restoration"; id: string; photoId: string; when: string }
  | { kind: "new-copy-linked"; id: string; photoId: string; byId: string; when: string }
  | { kind: "person-milestone"; id: string; personId: string; when: string; blurb: string }
  | { kind: "ask-highlight"; id: string; question: string; photoId: string; when: string };

export interface NewsletterIssue {
  id: string;
  title: string;
  month: string;
  intro: string;
  photoIds: string[];
  highlights: { heading: string; body: string; photoId?: string }[];
  recipients: number;
}

export interface PastIssue {
  id: string;
  month: string;
  headline: string;
}

export type AnswerBlock =
  | { kind: "text"; text: string }
  | { kind: "photo"; photoId: string; caption: string }
  | { kind: "source"; documentId: string }
  | { kind: "people"; personIds: string[] };

export interface ScriptedExchange {
  id: string;
  prompt: string;
  keywords: string[];
  thinkingLabel: string;
  answer: AnswerBlock[];
}

// --- Domain types (hydrated, what the UI consumes) --------------------------

/** People need no hydration; the row is the domain object. */
export type Person = PersonRow;
export type Location = LocationRow;
export type Member = MemberRow;
export type Invite = InviteRow;

/** A face tag as the UI uses it (photoId dropped — it's implied by context). */
export interface FaceTag {
  personId: string;
  box: FaceBox;
  confidence?: number;
}

/** A copy of a print, hydrated. */
export interface PhotoCapture {
  id: string;
  capturedById: string;
  capturedAt: string;
  device: string;
  framing: CaptureFraming;
  note?: string;
}

export interface Photo {
  id: string;
  title: string;
  src: string;
  width: number;
  height: number;
  description?: string;
  contributedById: string;
  contributedWhen: string;
  photographer?: PhotoFact;
  takenWhere?: PhotoFact;
  date: FuzzyDate;
  locationId?: string | null;
  /** Resolved from `locationId`. */
  location?: Location;
  faceTags: FaceTag[];
  captures: PhotoCapture[];
  albumIds: string[];
  restoration?: { restoredSrc: string; summary: string };
}

export interface Album {
  id: string;
  title: string;
  kind: AlbumKind;
  coverPhotoId: string;
  rule?: string;
  subtitle?: string;
  smartQuery?: SmartQuery;
  createdAt: string;
  updatedAt: string;
  /** Ordered, resolved from the album_photos join. */
  photoIds: string[];
  photoCount: number;
}

export type FamilyDocument = DocumentRow;
