/**
 * The storage seam. Loads every "table" from Postgres (via Prisma) and maps the
 * rows back to the app's Row/value shapes (see schema.ts) — reconstructing the
 * FuzzyDate object from its flattened columns, casting Json columns, and mapping
 * the FeedKind enum back to its hyphenated UI form. Memoized per request with
 * React `cache()` so a single render loads the dataset once.
 *
 * Swapping storage means changing this file (and repos.ts); nothing upstream of
 * src/data/index.ts cares.
 */
import { cache } from "react";

import { prisma } from "@/lib/prisma";
import type {
  AlbumPhotoRow,
  AlbumRow,
  ChangelogRow,
  CommentRow,
  DocumentRow,
  FaceBox,
  FeedItem,
  FuzzyDate,
  InviteRow,
  LifeEventRow,
  LocationRow,
  MemberRow,
  NewsletterIssue,
  PastIssue,
  PersonRow,
  PhotoCaptureRow,
  PhotoFact,
  PhotoPersonRow,
  PhotoRow,
  ReactionRow,
  RelationshipRow,
  ScriptedExchange,
} from "./schema";

const FEED_KIND_TO_UI: Record<string, FeedItem["kind"]> = {
  photo_added: "photo-added",
  restoration: "restoration",
  new_copy_linked: "new-copy-linked",
  person_milestone: "person-milestone",
  ask_highlight: "ask-highlight",
  comment_added: "comment-added",
  comment_reply: "comment-reply",
};

function toFuzzyDate(p: {
  dateIso: string | null;
  dateYear: number | null;
  dateMonth: number | null;
  dateDay: number | null;
  datePrecision: string;
  dateDisplay: string;
  dateDeduced: boolean;
  dateClue: string | null;
}): FuzzyDate {
  return {
    ...(p.dateIso != null ? { iso: p.dateIso } : {}),
    ...(p.dateYear != null ? { year: p.dateYear } : {}),
    ...(p.dateMonth != null ? { month: p.dateMonth } : {}),
    ...(p.dateDay != null ? { day: p.dateDay } : {}),
    precision: p.datePrecision as FuzzyDate["precision"],
    display: p.dateDisplay,
    ...(p.dateDeduced ? { deduced: true } : {}),
    ...(p.dateClue != null ? { clue: p.dateClue } : {}),
  };
}

const opt = <T>(v: T | null): T | undefined => (v == null ? undefined : v);

export interface DataSet {
  personRows: PersonRow[];
  relationshipRows: RelationshipRow[];
  locationRows: LocationRow[];
  photoRows: PhotoRow[];
  photoPersonRows: PhotoPersonRow[];
  photoCaptureRows: PhotoCaptureRow[];
  albumRows: AlbumRow[];
  albumPhotoRows: AlbumPhotoRow[];
  documentRows: DocumentRow[];
  feedRows: FeedItem[];
  memberRows: MemberRow[];
  inviteRows: InviteRow[];
  commentRows: CommentRow[];
  reactionRows: ReactionRow[];
  lifeEventRows: LifeEventRow[];
  changelogRows: ChangelogRow[];
  config: { chestName: string; demoToday: string };
  newsletter: { currentIssue: NewsletterIssue; pastIssues: PastIssue[] };
  askScript: { exchanges: ScriptedExchange[]; fallbackExchange: ScriptedExchange };
  personById: Map<string, PersonRow>;
  locationById: Map<string, LocationRow>;
  photoById: Map<string, PhotoRow>;
  albumById: Map<string, AlbumRow>;
  documentById: Map<string, DocumentRow>;
  commentById: Map<string, CommentRow>;
}

export const loadData = cache(async (): Promise<DataSet> => {
  const [
    people,
    relationships,
    locations,
    photos,
    photoPeople,
    captures,
    albums,
    albumPhotos,
    documents,
    feed,
    members,
    invites,
    comments,
    reactions,
    chestConfig,
    newsletterIssues,
    exchanges,
    lifeEvents,
    changelog,
  ] = await Promise.all([
    prisma.person.findMany(),
    prisma.relationship.findMany(),
    prisma.location.findMany(),
    prisma.photo.findMany(),
    prisma.photoPerson.findMany(),
    prisma.photoCapture.findMany(),
    prisma.album.findMany(),
    prisma.albumPhoto.findMany(),
    prisma.document.findMany(),
    prisma.feedItem.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.member.findMany(),
    prisma.invite.findMany(),
    prisma.comment.findMany({ where: { deletedAt: null }, orderBy: { createdAt: "asc" } }),
    prisma.reaction.findMany(),
    prisma.chestConfig.findFirst(),
    prisma.newsletterIssue.findMany({ orderBy: { sortIndex: "asc" } }),
    prisma.scriptedExchange.findMany({ orderBy: { sortIndex: "asc" } }),
    prisma.lifeEvent.findMany(),
    prisma.changelog.findMany(),
  ]);

  const personRows: PersonRow[] = people.map((p) => ({
    id: p.id,
    name: p.name,
    shortName: p.shortName,
    fullName: p.fullName,
    maidenName: opt(p.maidenName),
    nicknames: p.nicknames,
    alternateNames: p.alternateNames,
    relation: p.relation,
    gender: p.gender,
    lifespan: opt(p.lifespan),
    avatarSrc: opt(p.avatarSrc),
    photoCount: p.photoCount,
    suggestedMatchPhotoId: opt(p.suggestedMatchPhotoId),
  }));

  const relationshipRows: RelationshipRow[] = relationships.map((r) => ({
    fromId: r.fromId,
    toId: r.toId,
    type: r.type,
  }));

  const locationRows: LocationRow[] = locations.map((l) => ({
    id: l.id,
    label: l.label,
    street: opt(l.street),
    city: opt(l.city),
    state: opt(l.state),
    country: opt(l.country),
    lat: l.lat,
    lng: l.lng,
  }));

  const photoRows: PhotoRow[] = photos.map((p) => ({
    id: p.id,
    title: p.title,
    src: p.src,
    width: p.width,
    height: p.height,
    description: opt(p.description),
    contributedById: p.contributedById,
    contributedWhen: p.contributedWhen,
    photographer: (p.photographer as unknown as PhotoFact | null) ?? undefined,
    takenWhere: (p.takenWhere as unknown as PhotoFact | null) ?? undefined,
    date: toFuzzyDate(p),
    locationId: p.locationId,
    restoration: (p.restoration as unknown as { restoredSrc: string; summary: string } | null) ?? undefined,
  }));

  const photoPersonRows: PhotoPersonRow[] = photoPeople.map((r) => ({
    photoId: r.photoId,
    personId: r.personId,
    box: r.box as unknown as FaceBox,
    confidence: r.confidence,
  }));

  const photoCaptureRows: PhotoCaptureRow[] = captures.map((c) => ({
    id: c.id,
    photoId: c.photoId,
    capturedById: c.capturedById,
    capturedAt: c.capturedAt,
    device: c.device,
    framing: c.framing as PhotoCaptureRow["framing"],
    note: c.note,
  }));

  const albumRows: AlbumRow[] = albums.map((a) => ({
    id: a.id,
    title: a.title,
    kind: a.kind,
    coverPhotoId: a.coverPhotoId,
    rule: opt(a.rule),
    subtitle: opt(a.subtitle),
    smartQuery: (a.smartQuery as unknown as AlbumRow["smartQuery"]) ?? undefined,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  }));

  const albumPhotoRows: AlbumPhotoRow[] = albumPhotos.map((r) => ({
    albumId: r.albumId,
    photoId: r.photoId,
    position: r.position,
  }));

  const documentRows: DocumentRow[] = documents.map((d) => ({
    id: d.id,
    title: d.title,
    kind: d.kind,
    scanSrc: opt(d.scanSrc),
    excerpt: d.excerpt,
    year: opt(d.year),
    uploadedById: d.uploadedById,
    locationId: d.locationId,
  }));

  const feedRows: FeedItem[] = feed.map((f) => {
    const base: Record<string, unknown> = { id: f.id, kind: FEED_KIND_TO_UI[f.kind], when: f.when };
    for (const [k, v] of Object.entries({
      photoId: f.photoId,
      byId: f.byId,
      personId: f.personId,
      commentId: f.commentId,
      parentAuthorId: f.parentAuthorId,
      blurb: f.blurb,
      question: f.question,
      excerpt: f.excerpt,
    })) {
      if (v != null) base[k] = v;
    }
    return base as unknown as FeedItem;
  });

  const memberRows: MemberRow[] = members.map((m) => ({ personId: m.personId, role: m.role, joined: m.joined }));
  const inviteRows: InviteRow[] = invites.map((i) => ({ id: i.id, name: i.name, email: i.email, sent: i.sent }));

  const commentRows: CommentRow[] = comments.map((c) => ({
    id: c.id,
    photoId: c.photoId,
    parentId: c.parentId,
    authorId: c.authorId,
    body: c.body,
    when: c.when,
  }));

  const reactionRows: ReactionRow[] = reactions.map((r) => ({
    id: r.id,
    targetType: r.commentId ? "comment" : "photo",
    targetId: (r.commentId ?? r.photoId)!,
    emoji: r.emoji,
    byId: r.byId,
  }));

  const lifeEventRows: LifeEventRow[] = lifeEvents.map((e) => ({
    id: e.id,
    personId: e.personId,
    kind: e.kind,
    title: e.title,
    date: e.date as unknown as FuzzyDate,
    locationId: e.locationId,
    description: opt(e.description),
    createdById: e.createdById,
    createdAt: e.createdAt,
  }));

  const changelogRows: ChangelogRow[] = changelog.map((c) => ({
    id: c.id,
    entityType: c.entityType,
    entityId: c.entityId,
    personId: c.personId,
    field: c.field,
    before: c.before,
    after: c.after,
    editedById: c.editedById,
    editedAt: c.editedAt,
    summary: opt(c.summary),
  }));

  const fallbackRaw = exchanges.find((e) => e.isFallback);
  const fallbackExchange: ScriptedExchange = fallbackRaw
    ? {
        id: fallbackRaw.id,
        prompt: fallbackRaw.prompt,
        keywords: fallbackRaw.keywords,
        thinkingLabel: fallbackRaw.thinkingLabel,
        answer: fallbackRaw.answer as unknown as ScriptedExchange["answer"],
      }
    : { id: "fallback", prompt: "", keywords: [], thinkingLabel: "Searching…", answer: [] };
  const exchangeRows: ScriptedExchange[] = exchanges
    .filter((e) => !e.isFallback)
    .map((e) => ({
      id: e.id,
      prompt: e.prompt,
      keywords: e.keywords,
      thinkingLabel: e.thinkingLabel,
      answer: e.answer as unknown as ScriptedExchange["answer"],
    }));

  const currentRaw = newsletterIssues.find((n) => !n.published) ?? newsletterIssues[0];
  const currentIssue: NewsletterIssue = {
    id: currentRaw?.id ?? "issue",
    title: currentRaw?.title ?? "",
    month: currentRaw?.month ?? "",
    intro: currentRaw?.intro ?? "",
    photoIds: currentRaw?.photoIds ?? [],
    highlights: (currentRaw?.highlights as unknown as NewsletterIssue["highlights"]) ?? [],
    recipients: currentRaw?.recipients ?? 0,
  };
  const pastIssues: PastIssue[] = newsletterIssues
    .filter((n) => n.published)
    .map((n) => ({ id: n.id, month: n.month, headline: n.headline ?? "" }));

  return {
    personRows,
    relationshipRows,
    locationRows,
    photoRows,
    photoPersonRows,
    photoCaptureRows,
    albumRows,
    albumPhotoRows,
    documentRows,
    feedRows,
    memberRows,
    inviteRows,
    commentRows,
    reactionRows,
    lifeEventRows,
    changelogRows,
    config: { chestName: chestConfig?.chestName ?? "Hope Chest", demoToday: chestConfig?.demoToday ?? "" },
    newsletter: { currentIssue, pastIssues },
    askScript: { exchanges: exchangeRows, fallbackExchange },
    personById: new Map(personRows.map((p) => [p.id, p])),
    locationById: new Map(locationRows.map((l) => [l.id, l])),
    photoById: new Map(photoRows.map((p) => [p.id, p])),
    albumById: new Map(albumRows.map((a) => [a.id, a])),
    documentById: new Map(documentRows.map((d) => [d.id, d])),
    commentById: new Map(commentRows.map((c) => [c.id, c])),
  };
});
