/**
 * The bridge between the pure kinship resolver and the app's people data:
 * builds the family graph (memoized per request) then offers named relationship
 * summaries and the @mention suggestions used by Ask. The resolver stays
 * data-free; all the name/alias knowledge lives here.
 */
import { cache } from "react";

import {
  buildGraph,
  cousinPhrase,
  relationship,
  type KinGraph,
  type Relation,
  type RelationKind,
} from "../kinship";
import { loadData } from "./load";
import type { Person } from "./schema";

interface Kin {
  graph: KinGraph;
  personById: Map<string, Person>;
  personRows: Person[];
}

const getKin = cache(async (): Promise<Kin> => {
  const d = await loadData();
  const graph = buildGraph(
    d.personRows.map((p) => ({ id: p.id, gender: p.gender })),
    d.relationshipRows.map((r) => ({ fromId: r.fromId, toId: r.toId, type: r.type })),
  );
  return { graph, personById: d.personById, personRows: d.personRows };
});

/** The family graph (nodes + parent/spouse edges), for callers that need it raw. */
export async function familyGraph(): Promise<KinGraph> {
  return (await getKin()).graph;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// --- pure helpers operating on a loaded Kin context -------------------------
const parentsOf = (k: Kin, id: string) => [...(k.graph.parents.get(id) ?? [])].map((p) => k.personById.get(p)!).filter(Boolean);
const childrenOf = (k: Kin, id: string) => [...(k.graph.children.get(id) ?? [])].map((c) => k.personById.get(c)!).filter(Boolean);

const relTo = (k: Kin, fromId: string, toId: string): Relation | null => relationship(k.graph, fromId, toId);

const parentNoun = (g: Person["gender"]) => (g === "f" ? "mother" : "father");
const childNoun = (g: Person["gender"]) => (g === "f" ? "daughter" : "son");
const sibNoun = (g: Person["gender"]) => (g === "f" ? "sister" : "brother");

function pathHint(k: Kin, fromId: string, toId: string, rel: Relation): string | null {
  const to = k.personById.get(toId)!;
  if (rel.kind === "grandparent") {
    const via = parentsOf(k, fromId).find((p) => parentsOf(k, p.id).some((gp) => gp.id === toId));
    return via ? `${via.shortName}'s ${parentNoun(to.gender)}` : null;
  }
  if (rel.kind === "aunt-uncle" && !rel.greats) {
    const via = parentsOf(k, fromId).find((p) => parentsOf(k, p.id).some((gp) => childrenOf(k, gp.id).some((c) => c.id === toId)));
    return via ? `${via.shortName}'s ${sibNoun(to.gender)}` : null;
  }
  if (rel.kind === "cousin") {
    const au = parentsOf(k, toId).find((p) => relTo(k, fromId, p.id)?.kind === "aunt-uncle");
    return au ? `${au.shortName}'s ${childNoun(to.gender)}` : null;
  }
  if (rel.kind === "niece-nephew" && !rel.greats) {
    const sib = parentsOf(k, toId).find((p) => relTo(k, fromId, p.id)?.kind === "sibling");
    return sib ? `${sib.shortName}'s ${childNoun(to.gender)}` : null;
  }
  return null;
}

function describe(k: Kin, fromId: string, toId: string): string | null {
  const rel = relTo(k, fromId, toId);
  if (!rel) return null;
  const noun = rel.kind === "cousin" ? cousinPhrase(rel) : rel.label;
  const base = `Your ${noun}${rel.byMarriage && rel.kind === "aunt-uncle" ? " by marriage" : ""}`;
  const hint = pathHint(k, fromId, toId, rel);
  return hint ? `${base} — ${hint}` : base;
}

// --- public (async) API -----------------------------------------------------

/** Structured relationship of `toId` to `fromId`. */
export async function relationshipTo(fromId: string, toId: string): Promise<Relation | null> {
  return relTo(await getKin(), fromId, toId);
}

/** Named summary like "Your grandmother — Susan's mother" (or null if unrelated). */
export async function describeRelationshipTo(fromId: string, toId: string): Promise<string | null> {
  return describe(await getKin(), fromId, toId);
}

export interface MentionSuggestion {
  person: Person;
  /** Why this person matches, e.g. "Your grandmother — Susan's mother". */
  why: string;
  /** True when matched through a kinship term rather than their name. */
  viaKinship: boolean;
}

interface KinTerm {
  terms: string[];
  match: (r: Relation) => boolean;
}

const KIN_TERMS: KinTerm[] = [
  { terms: ["mom", "mother", "mum", "mama"], match: (r) => r.kind === "parent" && r.label === "mother" },
  { terms: ["dad", "father", "papa"], match: (r) => r.kind === "parent" && r.label === "father" },
  { terms: ["grandma", "grandmother", "granny", "nana"], match: (r) => r.kind === "grandparent" && r.label === "grandmother" },
  { terms: ["grandpa", "grandfather", "gramps"], match: (r) => r.kind === "grandparent" && r.label === "grandfather" },
  { terms: ["greatgrandma", "greatgrandmother", "great-grandma", "great-grandmother"], match: (r) => r.kind === "great-grandparent" && r.label.endsWith("grandmother") },
  { terms: ["greatgrandpa", "greatgrandfather", "great-grandpa", "great-grandfather"], match: (r) => r.kind === "great-grandparent" && r.label.endsWith("grandfather") },
  { terms: ["aunt", "auntie"], match: (r) => r.kind === "aunt-uncle" && r.label.endsWith("aunt") },
  { terms: ["uncle"], match: (r) => r.kind === "aunt-uncle" && r.label.endsWith("uncle") },
  { terms: ["niece"], match: (r) => r.kind === "niece-nephew" && r.label.endsWith("niece") },
  { terms: ["nephew"], match: (r) => r.kind === "niece-nephew" && r.label.endsWith("nephew") },
  { terms: ["sister"], match: (r) => r.kind === "sibling" && r.label === "sister" },
  { terms: ["brother"], match: (r) => r.kind === "sibling" && r.label === "brother" },
  { terms: ["wife"], match: (r) => r.kind === "spouse" && r.label === "wife" },
  { terms: ["husband"], match: (r) => r.kind === "spouse" && r.label === "husband" },
  { terms: ["cousin"], match: (r) => r.kind === "cousin" },
];

function nameTokens(person: Person): string[] {
  return [
    ...person.name.toLowerCase().split(/\s+/),
    ...person.fullName.toLowerCase().split(/\s+/),
    person.name.toLowerCase().replace(/\s+/g, ""),
    ...(person.maidenName ? [person.maidenName.toLowerCase()] : []),
    ...(person.nicknames ?? []).flatMap((n) => [n.toLowerCase(), ...n.toLowerCase().split(/\s+/)]),
    ...(person.alternateNames ?? []).flatMap((n) => [n.toLowerCase(), ...n.toLowerCase().split(/\s+/)]),
  ];
}

/**
 * Suggestions for an @mention query: kinship terms first ("@grandma" → the
 * asker's actual grandmothers, with the tree path explained), then name/alias
 * matches (display, full, maiden, nicknames, alternate names).
 */
export async function suggestMentions(query: string, fromId: string): Promise<MentionSuggestion[]> {
  const k = await getKin();
  const q = query.toLowerCase().replace(/\s+/g, "");
  const out: MentionSuggestion[] = [];

  if (q.length > 0) {
    for (const rule of KIN_TERMS) {
      if (!rule.terms.some((t) => t.startsWith(q))) continue;
      for (const person of k.personRows) {
        if (person.id === fromId) continue;
        const rel = relTo(k, fromId, person.id);
        if (rel && rule.match(rel)) {
          out.push({ person, why: describe(k, fromId, person.id) ?? person.relation, viaKinship: true });
        }
      }
      if (out.length > 0) break;
    }
  }

  const have = new Set(out.map((s) => s.person.id));
  for (const person of k.personRows) {
    if (have.has(person.id) || person.id === fromId || q.length === 0) continue;
    const tokens = nameTokens(person);
    if (!tokens.some((t) => t.startsWith(q))) continue;
    const viaNickname = (person.nicknames ?? []).some((n) => n.toLowerCase().split(/\s+/).some((t) => t.startsWith(q)));
    const viaMaiden = person.maidenName?.toLowerCase().startsWith(q);
    const viaAlt = (person.alternateNames ?? []).some((n) => n.toLowerCase().split(/\s+/).some((t) => t.startsWith(q)));
    const why = viaMaiden
      ? `${person.relation} — née ${person.maidenName}`
      : viaNickname
        ? `${person.relation} — “${person.nicknames!.join("”, “")}”`
        : viaAlt
          ? `${person.relation} — also ${person.alternateNames!.find((n) => n.toLowerCase().split(/\s+/).some((t) => t.startsWith(q)))}`
          : person.relation;
    out.push({ person, why, viaKinship: false });
  }
  return out.slice(0, 5);
}

export { cap as capitalize, type RelationKind };
