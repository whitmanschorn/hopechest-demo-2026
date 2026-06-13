/**
 * The bridge between the pure kinship resolver and the app's people data:
 * builds the family graph once, then offers named relationship summaries and
 * the @mention suggestions used by Ask. The resolver stays data-free; all the
 * name/alias knowledge lives here.
 */
import {
  buildGraph,
  cousinPhrase,
  relationship,
  type KinGraph,
  type Relation,
  type RelationKind,
} from "../kinship";
import { personById, personRows, relationshipRows } from "./load";
import type { Person } from "./schema";

export const graph: KinGraph = buildGraph(
  personRows.map((p) => ({ id: p.id, gender: p.gender })),
  relationshipRows.map((r) => ({ fromId: r.fromId, toId: r.toId, type: r.type })),
);

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const parentsOf = (id: string) => [...(graph.parents.get(id) ?? [])].map((p) => personById.get(p)!).filter(Boolean);
const childrenOf = (id: string) => [...(graph.children.get(id) ?? [])].map((c) => personById.get(c)!).filter(Boolean);

/** Structured relationship of `toId` to `fromId`. */
export function relationshipTo(fromId: string, toId: string): Relation | null {
  return relationship(graph, fromId, toId);
}

const parentNoun = (g: Person["gender"]) => (g === "f" ? "mother" : "father");
const childNoun = (g: Person["gender"]) => (g === "f" ? "daughter" : "son");
const sibNoun = (g: Person["gender"]) => (g === "f" ? "sister" : "brother");

/** A short "through whom" hint, e.g. "Susan's mother", when one path is clear. */
function pathHint(fromId: string, toId: string, rel: Relation): string | null {
  const to = personById.get(toId)!;
  if (rel.kind === "grandparent") {
    const via = parentsOf(fromId).find((p) => parentsOf(p.id).some((gp) => gp.id === toId));
    return via ? `${via.shortName}'s ${parentNoun(to.gender)}` : null;
  }
  if (rel.kind === "aunt-uncle" && !rel.greats) {
    const via = parentsOf(fromId).find((p) => parentsOf(p.id).some((gp) => childrenOf(gp.id).some((c) => c.id === toId)));
    return via ? `${via.shortName}'s ${sibNoun(to.gender)}` : null;
  }
  if (rel.kind === "cousin") {
    const au = parentsOf(toId).find((p) => relationshipTo(fromId, p.id)?.kind === "aunt-uncle");
    return au ? `${au.shortName}'s ${childNoun(to.gender)}` : null;
  }
  if (rel.kind === "niece-nephew" && !rel.greats) {
    const sib = parentsOf(toId).find((p) => relationshipTo(fromId, p.id)?.kind === "sibling");
    return sib ? `${sib.shortName}'s ${childNoun(to.gender)}` : null;
  }
  return null;
}

/** Named summary like "Your grandmother — Susan's mother" (or null if unrelated). */
export function describeRelationshipTo(fromId: string, toId: string): string | null {
  const rel = relationshipTo(fromId, toId);
  if (!rel) return null;
  const noun = rel.kind === "cousin" ? cousinPhrase(rel) : rel.label;
  const base = `Your ${noun}${rel.byMarriage && rel.kind === "aunt-uncle" ? " by marriage" : ""}`;
  const hint = pathHint(fromId, toId, rel);
  return hint ? `${base} — ${hint}` : base;
}

// --- @mention suggestions ---------------------------------------------------
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
export function suggestMentions(query: string, fromId: string): MentionSuggestion[] {
  const q = query.toLowerCase().replace(/\s+/g, "");
  const out: MentionSuggestion[] = [];

  if (q.length > 0) {
    for (const rule of KIN_TERMS) {
      if (!rule.terms.some((t) => t.startsWith(q))) continue;
      for (const person of personRows) {
        if (person.id === fromId) continue;
        const rel = relationshipTo(fromId, person.id);
        if (rel && rule.match(rel)) {
          out.push({ person, why: describeRelationshipTo(fromId, person.id) ?? person.relation, viaKinship: true });
        }
      }
      if (out.length > 0) break; // one kinship interpretation at a time
    }
  }

  const have = new Set(out.map((s) => s.person.id));
  for (const person of personRows) {
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
