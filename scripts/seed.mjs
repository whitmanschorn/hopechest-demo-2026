#!/usr/bin/env node
/**
 * Seeds the JSON mock database (src/data/json) from:
 *   - curated anchors in src/data/seed/*.json (the demo's narrative core), and
 *   - the fetched image manifest in scripts/staging/manifest.json (200+ real
 *     public-domain photos),
 * generating a consistent ~5x family dataset around the anchors.
 *
 * Deterministic (seeded PRNG) and idempotent: same inputs -> identical output.
 * All data is read with fs inside this process; nothing is hand-transcribed.
 *
 *   node scripts/seed.mjs
 *
 * The integrity test (src/data/__tests__/integrity.test.ts) is the acceptance
 * gate — every foreign key it writes must resolve.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const SEED = path.join(ROOT, "src", "data", "seed");
const OUT = path.join(ROOT, "src", "data", "json");
const MANIFEST = path.join(ROOT, "scripts", "staging", "manifest.json");

const read = (dir, name) => JSON.parse(readFileSync(path.join(dir, name), "utf8"));
const anchor = (name) => structuredClone(read(SEED, `${name}.json`));

// --- deterministic PRNG -----------------------------------------------------
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260612);
const int = (a, b) => a + Math.floor(rand() * (b - a + 1));
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const chance = (p) => rand() < p;
const pad = (n) => String(n).padStart(2, "0");
const MONTH = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// --- name pools -------------------------------------------------------------
const FIRST_F = ["Helen", "Dorothy", "Mildred", "Frances", "Evelyn", "Alice", "Florence", "Lillian", "Edith", "Clara", "Grace", "Esther", "Agnes", "Irene", "Marie", "Anna", "Hazel", "Lucille", "Betty", "Joan", "Shirley", "Barbara", "Nancy", "Carol", "Linda", "Karen", "Patricia", "Sandra", "Donna", "Janet", "Bonnie", "Diane", "Ruth", "Eleanor", "Vivian", "Gloria"];
const FIRST_M = ["Walter", "Harold", "Howard", "Raymond", "Earl", "Clarence", "Leroy", "Albert", "Arthur", "Frank", "George", "Edward", "Henry", "Carl", "Roy", "Ralph", "Eugene", "Floyd", "Vernon", "Donald", "Robert", "Richard", "William", "Charles", "Joseph", "Paul", "Kenneth", "Larry", "Gary", "Wayne", "Dennis", "Roger", "Bruce", "Allen", "Bradley", "Theodore"];
const MIDDLE = ["Lee", "Anne", "Mae", "James", "Rose", "Grace", "Allen", "Marie", "John", "Ruth", "Edward", "Jean", "Frank", "Louise", "Paul", "Claire", "Henry", "Faye", "Dean", "Joy"];
const SURNAMES = ["Andersen", "Pierson", "Bauer", "Novak", "Lindqvist", "Hoffman", "Becker", "Olson", "Carlson", "Larsen", "Brandt", "Kessler", "Vogel", "Meyer", "Brenner", "Holt", "Quinn", "Sorenson", "Dahl", "Lewandowski", "Zielinski", "Okonkwo", "Adeyemi", "Obi", "Nwosu", "Schmidt", "Hansen", "Beck"];

// --- towns / coordinate clusters for generated locations --------------------
const TOWNS = ["Brussels", "Forestville", "Algoma", "Casco", "Luxemburg", "Kewaunee", "Ephraim", "Fish Creek", "Sister Bay", "Egg Harbor", "Jacksonport", "Carlsville", "Institute", "Namur", "Maplewood", "Sevastopol", "Valmy", "Baileys Harbor", "Gills Rock", "Ellison Bay"];
const CLUSTERS = [
  { city: null, state: "WI", lat: 44.92, lng: -87.3 }, // Door County
  { city: "Green Bay", state: "WI", lat: 44.513, lng: -88.013 },
  { city: "Milwaukee", state: "WI", lat: 43.04, lng: -87.91 },
  { city: "Madison", state: "WI", lat: 43.07, lng: -89.4 },
  { city: "Chicago", state: "IL", lat: 41.881, lng: -87.63 },
  { city: "Minneapolis", state: "MN", lat: 44.98, lng: -93.27 },
];
const PLACE_KINDS = ["church", "schoolhouse", "depot", "park", "homestead", "main street", "town hall", "fairgrounds", "general store", "cemetery", "lake landing", "orchard"];

const MEMBERS = ["eleanor", "susan", "margaret", "david"];

// ===========================================================================
//  Load anchors
// ===========================================================================
const people = anchor("people");
const relationships = anchor("relationships");
const locations = anchor("locations");
const photos = anchor("photos");
const photoPeople = anchor("photo_people");
const photoCaptures = anchor("photo_captures");
const albums = anchor("albums");
const albumPhotos = anchor("album_photos");
const documents = anchor("documents");

if (!existsSync(MANIFEST)) {
  console.error(`Missing ${MANIFEST}. Run fetch-archive.py + process-archive.py first.`);
  process.exit(1);
}
const manifest = read(path.dirname(MANIFEST), "manifest.json");

// person metadata: gender, birth/death years, surname
const meta = new Map();
const ANCHOR_META = {
  klara: [1898, 1972], jozef: [1895, 1969], sarah: [1931, null], ruth: [1934, null],
  tom: [1928, 2009], eleanor: [1953, null], "mark-hayes": [1950, null], susan: [1956, null],
  daniel: [1955, null], margaret: [1992, null], james: [1994, null], david: [1980, null],
};
for (const p of people) {
  const [by, dy] = ANCHOR_META[p.id] ?? [1950, null];
  meta.set(p.id, { gender: p.gender, birthYear: by, deathYear: dy, surname: p.name.split(" ").slice(-1)[0] });
}

// ===========================================================================
//  People + relationships
// ===========================================================================
let kinN = 0;
const parentEdge = (parentId, childId) => relationships.push({ fromId: parentId, toId: childId, type: "parent" });
const marry = (a, b) => relationships.push({ fromId: a, toId: b, type: "spouse" });

function lifespanOf(by, dy) {
  return dy ? `${by}–${dy}` : `b. ${by}`;
}
function relationLabel(by) {
  const gap = Math.round((1992 - by) / 29);
  if (gap <= -2) return "Grand-niece / nephew";
  if (gap === -1) return "Niece / Nephew";
  if (gap === 0) return "Cousin";
  if (gap === 1) return "Aunt / Uncle";
  if (gap === 2) return "Great-aunt / uncle";
  return "Relative";
}

function addPerson({ id, gender, birthYear, deathYear = null, surname, first, middle, relation, nicknames = [], alternateNames = [] }) {
  const name = `${first} ${surname}`;
  people.push({
    id, name, shortName: first, fullName: `${first} ${middle} ${surname}`,
    nicknames, alternateNames, relation: relation ?? relationLabel(birthYear),
    gender, lifespan: lifespanOf(birthYear, deathYear), photoCount: 0,
  });
  meta.set(id, { gender, birthYear, deathYear, surname });
  return id;
}

const usedFirst = new Set();
function freshFirst(gender) {
  const pool = gender === "f" ? FIRST_F : FIRST_M;
  for (let i = 0; i < 20; i++) {
    const f = pick(pool);
    if (!usedFirst.has(f)) { usedFirst.add(f); return f; }
  }
  return pick(pool);
}
function genPerson(gender, birthYear, surname, relation) {
  const deathYear = birthYear < 1945 ? birthYear + int(70, 88) : null;
  return addPerson({
    id: `kin-${++kinN}`, gender, birthYear, deathYear, surname,
    first: freshFirst(gender), middle: pick(MIDDLE), relation,
  });
}

// --- lore-true relatives (tie to existing names/feed) ----------------------
addPerson({ id: "jozef", gender: "m", birthYear: 1895, deathYear: 1969, surname: "Kowalski", first: "Józef", middle: "Antoni", relation: "Great-grandfather", nicknames: ["Dziadek"], alternateNames: ["Joseph Kowalski"] });
marry("klara", "jozef"); parentEdge("jozef", "sarah");

addPerson({ id: "walter-whitfield", gender: "m", birthYear: 1900, deathYear: 1974, surname: "Whitfield", first: "Walter", middle: "James", relation: "Great-grandfather" });
addPerson({ id: "edith-whitfield", gender: "f", birthYear: 1903, deathYear: 1981, surname: "Whitfield", first: "Edith", middle: "Mae", relation: "Great-grandmother", nicknames: ["Nana Edith"] });
marry("walter-whitfield", "edith-whitfield");
parentEdge("walter-whitfield", "tom"); parentEdge("edith-whitfield", "tom");
addPerson({ id: "rose-whitfield", gender: "f", birthYear: 1925, deathYear: 2012, surname: "Whitfield", first: "Rose", middle: "Eleanor", relation: "Great-aunt", nicknames: ["Aunt Rose"] });
parentEdge("walter-whitfield", "rose-whitfield"); parentEdge("edith-whitfield", "rose-whitfield");

addPerson({ id: "emeka-okafor", gender: "m", birthYear: 1930, deathYear: 2008, surname: "Okafor", first: "Emeka", middle: "Chukwu", relation: "Grandfather", alternateNames: ["Michael Okafor"] });
marry("ruth", "emeka-okafor"); parentEdge("emeka-okafor", "daniel");
addPerson({ id: "ada-okafor", gender: "f", birthYear: 1960, surname: "Okafor", first: "Ada", middle: "Ngozi", relation: "Aunt" });
addPerson({ id: "chidi-okafor", gender: "m", birthYear: 1963, surname: "Okafor", first: "Chidi", middle: "Emmanuel", relation: "Uncle" });
for (const c of ["ada-okafor", "chidi-okafor"]) { parentEdge("ruth", c); parentEdge("emeka-okafor", c); }

addPerson({ id: "grace-hayes", gender: "f", birthYear: 1983, surname: "Hayes", first: "Grace", middle: "Eleanor", relation: "Cousin" });
parentEdge("eleanor", "grace-hayes"); parentEdge("mark-hayes", "grace-hayes");

addPerson({ id: "lauren-hayes", gender: "f", birthYear: 1982, surname: "Bauer", first: "Lauren", middle: "Kate", relation: "Cousin's wife" });
marry("david", "lauren-hayes");
addPerson({ id: "noah-hayes", gender: "m", birthYear: 2010, surname: "Hayes", first: "Noah", middle: "David", relation: "First cousin once removed" });
addPerson({ id: "ella-hayes", gender: "f", birthYear: 2013, surname: "Hayes", first: "Ella", middle: "Rose", relation: "First cousin once removed" });
for (const c of ["noah-hayes", "ella-hayes"]) { parentEdge("david", c); parentEdge("lauren-hayes", c); }

// --- procedural fill: spawn descendants from younger couples ----------------
const couples = [];
function enqueueCouple(a, b, fatherSurname, baseYear) {
  couples.push({ a, b, surname: fatherSurname, baseYear });
}
// give the lore aunts/uncles spouses and enqueue them as parents
for (const [pid, by] of [["ada-okafor", 1960], ["chidi-okafor", 1963], ["grace-hayes", 1983], ["rose-whitfield", 1925]]) {
  const m = meta.get(pid);
  const spouseGender = m.gender === "f" ? "m" : "f";
  const spouse = genPerson(spouseGender, by + int(-3, 3), pick(SURNAMES), "Relative by marriage");
  marry(pid, spouse);
  const fatherSurname = m.gender === "m" ? m.surname : meta.get(spouse).surname;
  enqueueCouple(pid, spouse, fatherSurname, by + int(25, 30));
}

const TARGET_PEOPLE = 58;
while (people.length < TARGET_PEOPLE && couples.length) {
  const c = couples.shift();
  const kids = int(1, 3);
  for (let k = 0; k < kids && people.length < TARGET_PEOPLE; k++) {
    const by = c.baseYear + int(0, 4) + k * 2;
    if (by > 2014) continue;
    const g = chance(0.5) ? "f" : "m";
    const child = genPerson(g, by, c.surname);
    parentEdge(c.a, child); parentEdge(c.b, child);
    if (by <= 1996 && chance(0.75)) {
      const sp = genPerson(g === "f" ? "m" : "f", by + int(-3, 3), pick(SURNAMES), "Relative by marriage");
      marry(child, sp);
      const fatherSurname = g === "m" ? meta.get(child).surname : meta.get(sp).surname;
      enqueueCouple(child, sp, fatherSurname, by + int(25, 31));
    }
  }
}

// ===========================================================================
//  Locations
// ===========================================================================
let locN = 0;
const TARGET_LOCATIONS = 40;
const usedPlace = new Set(locations.map((l) => l.label));
while (locations.length < TARGET_LOCATIONS) {
  const cl = pick(CLUSTERS);
  const town = cl.city ?? pick(TOWNS);
  const kind = pick(PLACE_KINDS);
  const label = `${town} ${kind}`;
  if (usedPlace.has(label)) continue;
  usedPlace.add(label);
  locations.push({
    id: `gen-loc-${++locN}`,
    label,
    city: town,
    state: cl.state,
    country: "USA",
    lat: +(cl.lat + (rand() - 0.5) * 0.08).toFixed(4),
    lng: +(cl.lng + (rand() - 0.5) * 0.08).toFixed(4),
  });
}

// ===========================================================================
//  Photos (one per fetched image) + face tags
// ===========================================================================
const adults = people.filter((p) => meta.get(p.id).birthYear <= 2006);
const VERBS = ["turned up", "surfaced", "was rediscovered", "came to light", "was scanned"];

function aliveIn(year) {
  return people.filter((p) => {
    const m = meta.get(p.id);
    return m.birthYear <= year && (m.deathYear == null || year <= m.deathYear) && year <= 2016;
  });
}
function faceBox() {
  return { x: int(8, 55), y: int(8, 45), w: int(12, 26), h: int(12, 22) };
}
function fuzzyDate(year) {
  const r = rand();
  if (r < 0.12) {
    const mo = int(1, 12);
    let d = int(1, 28);
    if (mo === 6 && d === 12) d = 13; // keep On-This-Day anchors' years distinct
    return { year, month: mo, day: d, iso: `${year}-${pad(mo)}-${pad(d)}`, precision: "day", display: `${MONTH[mo - 1]} ${d}, ${year}` };
  }
  if (r < 0.4) { const mo = int(1, 12); return { year, month: mo, precision: "month", display: `${MONTH[mo - 1]} ${year}` }; }
  if (r < 0.55) return { year, precision: "circa", display: `c. ${year}` };
  return { year, precision: "year", display: `${year}` };
}

manifest.forEach((img, i) => {
  const primary = adults[i % adults.length];
  const pm = meta.get(primary.id);
  const maxY = Math.min(pm.deathYear ?? 2016, 2016);
  const minY = Math.max(1905, pm.birthYear);
  const year = maxY <= minY ? minY : minY + int(0, Math.min(78, maxY - minY));
  const loc = pick(locations);
  const date = fuzzyDate(year);

  const photographer = chance(0.5)
    ? { value: pick(["Unknown", "A travelling studio", "Family snapshot"]) }
    : { value: `Likely ${pick(["a relative", primary.shortName, "the photographer next door"])}`, deduced: true, clue: "Framing and film stock match other prints from the same roll" };

  photos.push({
    id: img.slug,
    title: pick([
      `${primary.shortName} at ${loc.label}`,
      `${primary.shortName}, ${date.display}`,
      `The family at ${loc.label}`,
      `${primary.shortName} — ${img.query ?? "a keepsake"}`,
    ]),
    src: img.src,
    width: img.width,
    height: img.height,
    locationId: loc.id,
    ...(chance(0.45) ? { description: `${primary.shortName} ${pick(VERBS)} — one of ${getShort(pick(MEMBERS))}'s finds for the chest.` } : {}),
    contributedById: pick(MEMBERS),
    contributedWhen: `${pick(MONTH)} ${pick([2024, 2025, 2026])}`,
    photographer,
    takenWhere: { value: loc.label, ...(chance(0.5) ? { deduced: true, clue: "Background matches another print placed here" } : {}) },
    date,
  });

  // tags: primary + up to 2 contemporaries
  const taggedIds = new Set([primary.id]);
  const contemporaries = aliveIn(year).filter((p) => p.id !== primary.id);
  for (let t = 0; t < int(0, 2) && contemporaries.length; t++) taggedIds.add(pick(contemporaries).id);
  for (const personId of taggedIds) {
    photoPeople.push({ photoId: img.slug, personId, box: faceBox(), confidence: int(72, 99) / 100 });
  }
});

function getShort(id) {
  return people.find((p) => p.id === id)?.shortName ?? "the family";
}

// ===========================================================================
//  Albums (smart by person / location / decade + a few standard)
// ===========================================================================
let albumN = 0;
const isoDate = (y) => `${y}-${pad(int(1, 12))}-${pad(int(1, 28))}`;
function addAlbum({ title, kind, subtitle, rule, smartQuery, photoIds }) {
  if (photoIds.length < 3) return;
  const id = `gen-album-${++albumN}`;
  albums.push({ id, title, kind, ...(subtitle ? { subtitle } : {}), ...(rule ? { rule } : {}), ...(smartQuery ? { smartQuery } : {}), coverPhotoId: photoIds[0], createdAt: isoDate(2026), updatedAt: isoDate(2026) });
  photoIds.slice(0, 14).forEach((photoId, position) => albumPhotos.push({ albumId: id, photoId, position }));
}

// person albums (most-tagged people)
const tagCount = new Map();
for (const t of photoPeople) tagCount.set(t.personId, (tagCount.get(t.personId) ?? 0) + 1);
[...tagCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).forEach(([personId, n]) => {
  if (n < 4) return;
  const person = people.find((p) => p.id === personId);
  const photoIds = photoPeople.filter((t) => t.personId === personId).map((t) => t.photoId);
  addAlbum({ title: `${person.shortName} through the years`, kind: "smart", rule: `Everyone tagged: ${person.name}`, smartQuery: { taggedPersonId: personId, sort: "oldest" }, photoIds: [...new Set(photoIds)] });
});

// location albums
locations.map((l) => ({ l, ids: photos.filter((ph) => ph.locationId === l.id).map((ph) => ph.id) }))
  .filter((x) => x.ids.length >= 5).sort((a, b) => b.ids.length - a.ids.length).slice(0, 6)
  .forEach(({ l, ids }) => addAlbum({ title: l.label, kind: "smart", rule: `Taken at ${l.label}`, smartQuery: { locationId: l.id }, photoIds: ids }));

// decade albums
const byDecade = new Map();
for (const ph of photos) { if (!ph.date.year) continue; const d = Math.floor(ph.date.year / 10) * 10; (byDecade.get(d) ?? byDecade.set(d, []).get(d)).push(ph.id); }
[...byDecade.entries()].sort((a, b) => a[0] - b[0]).filter(([, ids]) => ids.length >= 6).slice(0, 5)
  .forEach(([d, ids]) => addAlbum({ title: `The ${d}s`, kind: "smart", subtitle: `Everything from the ${d}s`, rule: `Taken in the ${d}s`, smartQuery: {}, photoIds: ids }));

// standard themed albums by image query keyword
const themed = [
  { title: "Weddings & courtships", subtitle: "The matches that made the family", words: ["wedding", "couple", "dance"] },
  { title: "The little ones", subtitle: "Babies, school days, and play", words: ["child", "children", "baby", "school", "doll", "dog", "playing"] },
  { title: "Life on the land", subtitle: "Farms, harvests, and chores", words: ["farm", "harvest", "tractor", "barn", "hay", "garden", "cotton", "tobacco", "livestock"] },
  { title: "Town & travel", subtitle: "Main streets, depots, and stores", words: ["main street", "store", "depot", "train", "automobile", "parade"] },
];
const photoQuery = new Map(manifest.map((m) => [m.slug, (m.query ?? "").toLowerCase()]));
for (const th of themed) {
  const ids = photos.filter((ph) => { const q = photoQuery.get(ph.id); return q && th.words.some((w) => q.includes(w)); }).map((ph) => ph.id).slice(0, 14);
  addAlbum({ title: th.title, kind: "standard", subtitle: th.subtitle, photoIds: ids });
}

// ===========================================================================
//  Documents
// ===========================================================================
let docN = 0;
const DOC_KINDS = ["letter", "record", "recipe", "telegram"];
const DOC_TEMPLATES = {
  letter: (p) => `"Dearest ${p.shortName}, the winter has been long but the stove keeps us warm. Write when you can…"`,
  record: (p) => `${p.fullName} — recorded in the parish register, ${p.lifespan.replace("b. ", "b. ")}.`,
  recipe: () => `"Two cups flour, a knob of butter, and patience. ${pick(["Bake till golden.", "Let it rest overnight.", "Never rush the dough."])}"`,
  telegram: (p) => `ARRIVING SATURDAY STOP TELL ${p.shortName.toUpperCase()} STOP ALL WELL STOP`,
};
const TARGET_DOCS = 18;
const docPeople = people.filter((p) => meta.get(p.id).birthYear <= 1990);
while (documents.length < TARGET_DOCS) {
  const kind = DOC_KINDS[docN % DOC_KINDS.length];
  const p = pick(docPeople);
  const loc = pick(locations);
  documents.push({
    id: `gen-doc-${++docN}`,
    title: pick([`${p.shortName}'s ${kind}`, `${kind[0].toUpperCase() + kind.slice(1)} — ${p.name}`, `A ${kind} from ${loc.city ?? loc.label}`]),
    kind,
    excerpt: DOC_TEMPLATES[kind](p),
    year: `${int(Math.max(1905, meta.get(p.id).birthYear), 1995)}`,
    uploadedById: pick(MEMBERS),
    locationId: loc.id,
  });
}

// ===========================================================================
//  Recompute photoCount per person
// ===========================================================================
const counts = new Map();
for (const t of photoPeople) counts.set(t.personId, (counts.get(t.personId) ?? 0) + 1);
for (const p of people) p.photoCount = counts.get(p.id) ?? 0;

// ===========================================================================
//  Write tables (narrative/config tables pass through unchanged)
// ===========================================================================
const tables = {
  people, relationships, locations,
  photos, photo_people: photoPeople, photo_captures: photoCaptures,
  albums, album_photos: albumPhotos, documents,
  feed: anchor("feed"), newsletter: anchor("newsletter"), ask_script: anchor("ask_script"),
  members: anchor("members"), invites: anchor("invites"), config: anchor("config"),
};
for (const [name, value] of Object.entries(tables)) {
  writeFileSync(path.join(OUT, `${name}.json`), JSON.stringify(value, null, 2) + "\n");
}

console.log("Seeded JSON database:");
console.log(`  people        ${people.length}`);
console.log(`  relationships ${relationships.length}`);
console.log(`  locations     ${locations.length}`);
console.log(`  photos        ${photos.length}`);
console.log(`  photo_people  ${photoPeople.length}`);
console.log(`  albums        ${albums.length}`);
console.log(`  album_photos  ${albumPhotos.length}`);
console.log(`  documents     ${documents.length}`);
