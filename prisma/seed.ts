/**
 * Deterministic demo seed for Hope Chest.
 *
 * Generates a roughly-equivalent dataset to the old JSON demo using
 * @faker-js/faker (fixed seed → identical output every run), while reusing the
 * real public-domain blob image URLs from scripts/image-manifest.json for
 * photos and avatars. Postgres FK constraints replace the old hand-rolled
 * integrity checker. Runs via `npm run db:seed` (and after `db:reset`).
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- seed builds loose row arrays before bulk insert */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { faker } from "@faker-js/faker";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });

// Use the direct (non-pooling) connection for bulk inserts. Prefer the
// Neon–Vercel integration vars; fall back to plain names for local .env.local.
const connectionString =
  process.env.HOPECHEST_STORAGE_POSTGRES_URL_NON_POOLING ??
  process.env.POSTGRES_URL_NON_POOLING ??
  process.env.HOPECHEST_STORAGE_POSTGRES_PRISMA_URL ??
  process.env.POSTGRES_PRISMA_URL;
const prisma = new PrismaClient({ adapter: new PrismaPg(connectionString!) });

faker.seed(20260614);

const DEMO_TODAY = "2026-06-14";
const REACTION_EMOJI = ["❤️", "😂", "😮", "🥲", "👍", "🙏", "😢", "🎉"];

type Img = { slug: string; src: string; width: number; height: number; title: string; date?: string };
const manifest: Img[] = JSON.parse(
  readFileSync(join(process.cwd(), "scripts/image-manifest.json"), "utf8"),
);

// --- small helpers ----------------------------------------------------------
const pick = <T>(arr: T[]): T => arr[faker.number.int({ min: 0, max: arr.length - 1 })];
const chance = (p: number) => faker.number.float({ min: 0, max: 1 }) < p;
const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 48);

function fuzzyDate(year: number, month?: number, day?: number) {
  if (month && day) {
    const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const display = new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric", timeZone: "UTC",
    });
    return { dateIso: iso, dateYear: year, dateMonth: month, dateDay: day, datePrecision: "day", dateDisplay: display };
  }
  if (month) {
    const display = new Date(`${year}-${String(month).padStart(2, "0")}-01T00:00:00Z`)
      .toLocaleDateString("en-US", { year: "numeric", month: "long", timeZone: "UTC" });
    return { dateYear: year, dateMonth: month, datePrecision: "month", dateDisplay: display };
  }
  if (chance(0.5)) return { dateYear: year, datePrecision: "year", dateDisplay: String(year) };
  return { dateYear: year, datePrecision: "circa", dateDisplay: `c. ${year}` };
}

// ---------------------------------------------------------------------------
async function main() {
  console.log("Seeding Hope Chest demo data…");

  // Wipe (reverse FK order) so the seed is idempotent on its own.
  await prisma.$transaction([
    prisma.session.deleteMany(),
    prisma.user.deleteMany(),
    prisma.verificationCode.deleteMany(),
    prisma.changelog.deleteMany(),
    prisma.lifeEvent.deleteMany(),
    prisma.reaction.deleteMany(),
    prisma.comment.deleteMany(),
    prisma.feedItem.deleteMany(),
    prisma.albumPhoto.deleteMany(),
    prisma.album.deleteMany(),
    prisma.photoCapture.deleteMany(),
    prisma.photoPerson.deleteMany(),
    prisma.document.deleteMany(),
    prisma.photo.deleteMany(),
    prisma.invite.deleteMany(),
    prisma.member.deleteMany(),
    prisma.relationship.deleteMany(),
    prisma.person.deleteMany(),
    prisma.location.deleteMany(),
    prisma.newsletterIssue.deleteMany(),
    prisma.scriptedExchange.deleteMany(),
    prisma.chestConfig.deleteMany(),
  ]);

  // --- locations ------------------------------------------------------------
  const locations = Array.from({ length: 12 }).map((_, i) => {
    const city = faker.location.city();
    const state = faker.location.state();
    return {
      id: `loc-${i + 1}-${slug(city)}`,
      label: `${city}, ${state}`,
      street: faker.location.streetAddress(),
      city,
      state,
      country: "USA",
      lat: faker.location.latitude({ min: 25, max: 49 }),
      lng: faker.location.longitude({ min: -124, max: -67 }),
    };
  });
  await prisma.location.createMany({ data: locations });

  // --- people + family tree -------------------------------------------------
  type P = { id: string; gender: "f" | "m"; generation: number };
  const people: any[] = [];
  const placed: P[] = [];
  const relationships: { fromId: string; toId: string; type: "parent" | "spouse" }[] = [];
  const avatarImgs = faker.helpers.shuffle([...manifest]).slice(0, 30);
  let avatarCursor = 0;

  function makePerson(gender: "f" | "m", generation: number, relation: string): P {
    const sex = gender === "f" ? "female" : "male";
    const first = faker.person.firstName(sex);
    const last = faker.person.lastName();
    const id = `${slug(first)}-${slug(last)}-${people.length + 1}`;
    const birth = 1880 + generation * 28 + faker.number.int({ min: -4, max: 6 });
    const alive = generation >= 2 && chance(0.7);
    people.push({
      id,
      name: `${first} ${last}`,
      shortName: first,
      fullName: `${first} ${faker.person.middleName(sex)} ${last}`,
      maidenName: gender === "f" && chance(0.4) ? faker.person.lastName() : undefined,
      nicknames: chance(0.3) ? [faker.person.firstName(sex)] : [],
      alternateNames: [],
      relation,
      gender,
      lifespan: alive ? `b. ${birth}` : `${birth}–${birth + faker.number.int({ min: 60, max: 92 })}`,
      avatarSrc: chance(0.55) ? avatarImgs[avatarCursor++ % avatarImgs.length].src : undefined,
      photoCount: 0,
    });
    const p = { id, gender, generation };
    placed.push(p);
    return p;
  }

  function marry(a: P, b: P) {
    relationships.push({ fromId: a.id, toId: b.id, type: "spouse" });
  }
  function parentChild(parent: P, child: P) {
    relationships.push({ fromId: parent.id, toId: child.id, type: "parent" });
  }

  // Three generations branching out to ~40 people.
  const genLabels = ["Great-grandparent", "Grandparent", "Parent", "Cousin"];
  const founders: [P, P][] = [];
  for (let c = 0; c < 2; c++) {
    const h = makePerson("m", 0, genLabels[0]);
    const w = makePerson("f", 0, genLabels[0]);
    marry(h, w);
    founders.push([h, w]);
  }

  let frontier: [P, P][] = founders;
  for (let gen = 1; gen <= 2; gen++) {
    const nextCouples: [P, P][] = [];
    for (const [h, w] of frontier) {
      const kids = faker.number.int({ min: 2, max: 3 });
      for (let k = 0; k < kids; k++) {
        const g = chance(0.5) ? "f" : "m";
        const child = makePerson(g, gen, genLabels[Math.min(gen, genLabels.length - 1)]);
        parentChild(h, child);
        parentChild(w, child);
        if (gen < 2 && chance(0.8)) {
          const spouse = makePerson(g === "f" ? "m" : "f", gen, "In-law");
          marry(child, spouse);
          nextCouples.push(g === "f" ? [spouse, child] : [child, spouse]);
        }
      }
    }
    frontier = nextCouples;
  }

  await prisma.person.createMany({ data: people });
  await prisma.relationship.createMany({ data: relationships, skipDuplicates: true });
  const personIds = people.map((p) => p.id);

  // --- photos (from blob manifest) -----------------------------------------
  const photos: any[] = [];
  const usable = manifest.slice(0, 140);
  usable.forEach((img, i) => {
    const year = img.date ? Number(img.date.slice(0, 4)) : faker.number.int({ min: 1900, max: 1985 });
    // Force a handful onto demoToday's calendar day so "On This Day" has content.
    const forceToday = i < 4;
    const month = forceToday ? 6 : faker.number.int({ min: 1, max: 12 });
    const day = forceToday ? 14 : chance(0.7) ? faker.number.int({ min: 1, max: 28 }) : undefined;
    const d = fuzzyDate(year, day ? month : chance(0.6) ? month : undefined, day);
    const deduced = chance(0.25);
    photos.push({
      id: `${slug(img.title) || "photo"}-${i + 1}`,
      title: img.title,
      src: img.src,
      width: img.width,
      height: img.height,
      description: chance(0.6) ? faker.lorem.sentence() : undefined,
      contributedById: pick(personIds),
      contributedWhen: faker.date.past({ years: 3 }).toLocaleDateString("en-US", { year: "numeric", month: "long" }),
      photographer: chance(0.4) ? { value: faker.person.fullName(), deduced, ...(deduced ? { clue: faker.lorem.sentence() } : {}) } : undefined,
      takenWhere: chance(0.3) ? { value: faker.location.city() } : undefined,
      restoration: chance(0.12) ? { restoredSrc: img.src, summary: faker.lorem.sentence() } : undefined,
      locationId: chance(0.7) ? pick(locations).id : undefined,
      ...d,
      dateDeduced: !!d && chance(0.2),
      dateClue: chance(0.15) ? faker.lorem.sentence() : undefined,
    });
  });
  await prisma.photo.createMany({ data: photos });
  const photoIds = photos.map((p) => p.id);

  // --- face tags ------------------------------------------------------------
  const faceTags: any[] = [];
  const photoCountById = new Map<string, number>();
  for (const ph of photos) {
    const n = faker.number.int({ min: 0, max: 3 });
    const tagged = faker.helpers.arrayElements(personIds, n);
    for (const personId of tagged) {
      faceTags.push({
        photoId: ph.id,
        personId,
        box: { x: faker.number.float({ min: 5, max: 60 }), y: faker.number.float({ min: 5, max: 50 }), w: faker.number.float({ min: 12, max: 30 }), h: faker.number.float({ min: 12, max: 30 }) },
        confidence: chance(0.7) ? faker.number.float({ min: 0.6, max: 0.99 }) : null,
      });
      photoCountById.set(personId, (photoCountById.get(personId) ?? 0) + 1);
    }
  }
  await prisma.photoPerson.createMany({ data: faceTags, skipDuplicates: true });

  // update per-person photoCount
  for (const [personId, count] of photoCountById) {
    await prisma.person.update({ where: { id: personId }, data: { photoCount: count } });
  }

  // --- captures (copies of prints) -----------------------------------------
  const captures: any[] = [];
  photos.forEach((ph, i) => {
    if (!chance(0.2)) return;
    const n = faker.number.int({ min: 1, max: 2 });
    for (let k = 0; k < n; k++) {
      captures.push({
        id: `cap-${i}-${k}`,
        photoId: ph.id,
        capturedById: pick(personIds),
        capturedAt: faker.date.past({ years: 4 }).toLocaleDateString("en-US", { year: "numeric", month: "long" }),
        device: `${pick(["Pixel 8", "iPhone 15", "Galaxy S24"])} · ${faker.person.firstName()}'s album`,
        framing: chance(0.5) ? "table-warm" : "album-page",
        note: chance(0.4) ? faker.lorem.sentence() : null,
      });
    }
  });
  await prisma.photoCapture.createMany({ data: captures });

  // --- albums ---------------------------------------------------------------
  const albums: any[] = [];
  const albumPhotos: any[] = [];
  for (let i = 0; i < 6; i++) {
    const smart = i >= 4;
    const id = `album-${i + 1}`;
    const members = faker.helpers.arrayElements(photoIds, faker.number.int({ min: 6, max: 16 }));
    albums.push({
      id,
      title: faker.helpers.fake("{{word.adjective}} {{word.noun}}").replace(/\b\w/g, (c) => c.toUpperCase()),
      kind: smart ? "smart" : "standard",
      coverPhotoId: members[0] ?? pick(photoIds),
      rule: smart ? `Everyone tagged: ${pick(people).shortName}` : undefined,
      subtitle: chance(0.6) ? faker.lorem.sentence(4) : undefined,
      smartQuery: smart ? { taggedPersonId: pick(personIds), sort: chance(0.5) ? "oldest" : "newest" } : undefined,
      createdAt: faker.date.past({ years: 1 }).toISOString().slice(0, 10),
      updatedAt: faker.date.recent({ days: 60 }).toISOString().slice(0, 10),
    });
    members.forEach((photoId, position) => albumPhotos.push({ albumId: id, photoId, position }));
  }
  await prisma.album.createMany({ data: albums });
  await prisma.albumPhoto.createMany({ data: albumPhotos, skipDuplicates: true });

  // --- documents ------------------------------------------------------------
  const kinds = ["letter", "record", "recipe", "telegram"] as const;
  const documents = Array.from({ length: 12 }).map((_, i) => ({
    id: `doc-${i + 1}`,
    title: faker.lorem.words(3).replace(/\b\w/g, (c) => c.toUpperCase()),
    kind: pick([...kinds]),
    scanSrc: chance(0.6) ? pick(manifest).src : undefined,
    excerpt: `“${faker.lorem.sentence()}”`,
    year: String(faker.number.int({ min: 1900, max: 1980 })),
    uploadedById: pick(personIds),
    locationId: chance(0.5) ? pick(locations).id : undefined,
  }));
  await prisma.document.createMany({ data: documents });

  // --- members + invites + users -------------------------------------------
  const roles = ["Admin", "Contributor", "Viewer"] as const;
  const memberPersonIds = faker.helpers.arrayElements(personIds, 5);
  const members = memberPersonIds.map((personId, i) => ({
    personId,
    role: i === 0 ? "Admin" : pick([...roles]),
    joined: faker.date.past({ years: 1 }).toLocaleDateString("en-US", { year: "numeric", month: "long" }),
  }));
  await prisma.member.createMany({ data: members });

  await prisma.invite.createMany({
    data: Array.from({ length: 3 }).map((_, i) => ({
      id: `invite-${i + 1}`,
      name: faker.person.fullName(),
      email: faker.internet.email().toLowerCase(),
      sent: pick(["Last week", "2 days ago", "Yesterday"]),
    })),
  });

  // Demo users: phone + on-screen OTP login. memberId === member.personId.
  const demoUsers = members.map((m, i) => ({
    phone: `+1555000000${i + 1}`,
    displayName: people.find((p) => p.id === m.personId)?.shortName,
    status: "ACTIVE" as const,
    onboardingComplete: true,
    memberId: m.personId,
  }));
  await prisma.user.createMany({ data: demoUsers });

  // --- life events (manually-entered milestones) ----------------------------
  const lifeEventKinds = ["birth", "marriage", "immigration", "residence", "military", "education", "work", "other"] as const;
  const lifeEvents: any[] = [];
  for (const personId of faker.helpers.arrayElements(personIds, 12)) {
    const n = faker.number.int({ min: 1, max: 2 });
    for (let k = 0; k < n; k++) {
      const year = faker.number.int({ min: 1900, max: 1985 });
      const month = faker.number.int({ min: 1, max: 12 });
      const display = new Date(`${year}-${String(month).padStart(2, "0")}-01T00:00:00Z`).toLocaleDateString("en-US", { year: "numeric", month: "long", timeZone: "UTC" });
      lifeEvents.push({
        id: `le-${lifeEvents.length}`,
        personId,
        kind: pick([...lifeEventKinds]),
        title: faker.lorem.words(3).replace(/\b\w/g, (c) => c.toUpperCase()),
        date: { year, month, precision: "month", display },
        locationId: chance(0.5) ? pick(locations).id : null,
        description: chance(0.5) ? faker.lorem.sentence() : null,
        createdById: pick(personIds),
        createdAt: faker.date.recent({ days: 90 }).toISOString(),
      });
    }
  }
  await prisma.lifeEvent.createMany({ data: lifeEvents });
  // Changelog starts empty — it fills in as members edit people/events in the app.

  // --- comments (roots then replies) + reactions ---------------------------
  const rootComments: any[] = [];
  const replyComments: any[] = [];
  const commentablePhotos = faker.helpers.arrayElements(photoIds, 40);
  let cId = 0;
  for (const photoId of commentablePhotos) {
    const roots = faker.number.int({ min: 1, max: 3 });
    for (let r = 0; r < roots; r++) {
      const id = `c-${cId++}`;
      rootComments.push({ id, photoId, parentId: null, authorId: pick(personIds), body: faker.lorem.sentence(), when: pick(["2 days ago", "last week", "3 hours ago", "yesterday"]) });
      const replies = faker.number.int({ min: 0, max: 2 });
      for (let rr = 0; rr < replies; rr++) {
        replyComments.push({ id: `c-${cId++}`, photoId, parentId: id, authorId: pick(personIds), body: faker.lorem.sentence(), when: pick(["1 day ago", "6 hours ago", "just now"]) });
      }
    }
  }
  await prisma.comment.createMany({ data: rootComments });
  await prisma.comment.createMany({ data: replyComments });
  const allComments = [...rootComments, ...replyComments];

  // reactions on photos and comments (deduped on the [target, by, emoji] uniques)
  const reactions: any[] = [];
  const seen = new Set<string>();
  let rId = 0;
  const addReaction = (key: "photoId" | "commentId", targetId: string) => {
    const emoji = pick(REACTION_EMOJI);
    const byId = pick(personIds);
    const dedupe = `${targetId}:${byId}:${emoji}`;
    if (seen.has(dedupe)) return;
    seen.add(dedupe);
    reactions.push({ id: `r-${rId++}`, [key]: targetId, emoji, byId });
  };
  for (const photoId of faker.helpers.arrayElements(photoIds, 60)) {
    for (let k = 0; k < faker.number.int({ min: 1, max: 5 }); k++) addReaction("photoId", photoId);
  }
  for (const c of faker.helpers.arrayElements(allComments, 25)) {
    for (let k = 0; k < faker.number.int({ min: 1, max: 3 }); k++) addReaction("commentId", c.id);
  }
  await prisma.reaction.createMany({ data: reactions });

  // --- feed -----------------------------------------------------------------
  const feed: any[] = [];
  let fId = 0;
  const when = () => pick(["just now", "2 hours ago", "yesterday", "3 days ago", "last week"]);
  for (let i = 0; i < 6; i++) feed.push({ id: `f-${fId++}`, kind: "photo_added", when: when(), photoId: pick(photoIds), byId: pick(personIds), blurb: faker.lorem.sentence() });
  for (let i = 0; i < 2; i++) feed.push({ id: `f-${fId++}`, kind: "restoration", when: when(), photoId: pick(photoIds) });
  for (let i = 0; i < 2; i++) feed.push({ id: `f-${fId++}`, kind: "new_copy_linked", when: when(), photoId: pick(photoIds), byId: pick(personIds) });
  for (let i = 0; i < 2; i++) feed.push({ id: `f-${fId++}`, kind: "person_milestone", when: when(), personId: pick(personIds), blurb: faker.lorem.sentence() });
  feed.push({ id: `f-${fId++}`, kind: "ask_highlight", when: when(), photoId: pick(photoIds), question: "Who is in this photo?" });
  for (const c of faker.helpers.arrayElements(rootComments, 2)) feed.push({ id: `f-${fId++}`, kind: "comment_added", when: when(), photoId: c.photoId, byId: c.authorId, commentId: c.id, excerpt: c.body.slice(0, 60) });
  for (const c of faker.helpers.arrayElements(replyComments, 1)) feed.push({ id: `f-${fId++}`, kind: "comment_reply", when: when(), photoId: c.photoId, byId: c.authorId, parentAuthorId: pick(personIds), commentId: c.id, excerpt: c.body.slice(0, 60) });
  await prisma.feedItem.createMany({ data: feed });

  // --- newsletter -----------------------------------------------------------
  await prisma.newsletterIssue.create({
    data: {
      id: "issue-current",
      title: "This Month in the Chest",
      month: "June 2026",
      intro: faker.lorem.paragraph(),
      photoIds: faker.helpers.arrayElements(photoIds, 4),
      highlights: Array.from({ length: 3 }).map(() => ({ heading: faker.lorem.words(3), body: faker.lorem.sentence(), photoId: pick(photoIds) })),
      recipients: members.length,
      published: false,
      sortIndex: 0,
    },
  });
  await prisma.newsletterIssue.createMany({
    data: Array.from({ length: 3 }).map((_, i) => ({
      id: `issue-past-${i + 1}`,
      month: pick(["May 2026", "April 2026", "March 2026"]),
      headline: faker.lorem.words(4).replace(/\b\w/g, (c) => c.toUpperCase()),
      photoIds: [],
      published: true,
      sortIndex: i + 1,
    })),
  });

  // --- ask script -----------------------------------------------------------
  const exchanges = [
    {
      id: "ex-1",
      prompt: "What's the oldest photo in the chest?",
      keywords: ["oldest", "first", "earliest"],
      thinkingLabel: `Searching ${photos.length} photos…`,
      answer: [
        { kind: "text", text: faker.lorem.sentence() },
        { kind: "photo", photoId: photoIds[0], caption: photos[0].title },
        { kind: "people", personIds: faker.helpers.arrayElements(personIds, 2) },
      ],
      isFallback: false,
      sortIndex: 0,
    },
    {
      id: "ex-2",
      prompt: "Tell me about a family recipe",
      keywords: ["recipe", "food", "cook"],
      thinkingLabel: `Searching ${documents.length} documents…`,
      answer: [
        { kind: "text", text: faker.lorem.sentence() },
        { kind: "source", documentId: documents[0].id },
      ],
      isFallback: false,
      sortIndex: 1,
    },
  ];
  await prisma.scriptedExchange.createMany({
    data: [
      ...exchanges,
      {
        id: "ex-fallback",
        prompt: "",
        keywords: [],
        thinkingLabel: "Searching the chest…",
        answer: [{ kind: "text", text: "I couldn't find that yet — try asking about a person, place, or year." }],
        isFallback: true,
        sortIndex: 99,
      },
    ],
  });

  // --- config singleton -----------------------------------------------------
  await prisma.chestConfig.create({
    data: { id: "singleton", chestName: "The Demo Family Chest", demoToday: DEMO_TODAY },
  });

  console.log(`Seeded: ${people.length} people, ${photos.length} photos, ${albums.length} albums, ${allComments.length} comments, ${reactions.length} reactions, ${feed.length} feed items.`);
  console.log("\nDemo logins (enter the phone, then read the on-screen code):");
  for (const u of demoUsers) console.log(`  ${u.phone}  →  ${u.displayName} (${members.find((m) => m.personId === u.memberId)?.role})`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
