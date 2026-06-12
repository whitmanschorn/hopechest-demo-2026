import { people } from "./people";
import type { Person } from "./types";

/**
 * Kinship-aware mention resolution. "@grandma" is not a name — it's a walk
 * on the family tree from the signed-in member.
 */

export interface MentionSuggestion {
  person: Person;
  /** Why this person matches, e.g. "Your grandmother — Susan's mother". */
  why: string;
  /** True when matched through a kinship term rather than their name. */
  viaKinship: boolean;
}

const byId = new Map(people.map((p) => [p.id, p]));

function parentsOf(id: string): Person[] {
  return (byId.get(id)?.parentIds ?? [])
    .map((pid) => byId.get(pid))
    .filter((p): p is Person => Boolean(p));
}

function childrenOf(id: string): Person[] {
  return people.filter((p) => p.parentIds?.includes(id));
}

interface Hit {
  person: Person;
  why: string;
}

const parentWord = (p: Person) => (p.gender === "f" ? "mother" : "father");
const childWord = (p: Person) => (p.gender === "f" ? "daughter" : "son");
const siblingWord = (p: Person) => (p.gender === "f" ? "sister" : "brother");

function parents(fromId: string, gender?: Person["gender"]): Hit[] {
  return parentsOf(fromId)
    .filter((p) => !gender || p.gender === gender)
    .map((p) => ({ person: p, why: `Your ${parentWord(p)}` }));
}

function grandparents(fromId: string, gender?: Person["gender"]): Hit[] {
  return parentsOf(fromId).flatMap((parent) =>
    parentsOf(parent.id)
      .filter((gp) => !gender || gp.gender === gender)
      .map((gp) => ({
        person: gp,
        why: `Your grand${gender === "m" ? "father" : "mother"} — ${parent.shortName}'s ${parentWord(gp)}`,
      })),
  );
}

function greatGrandparents(fromId: string, gender?: Person["gender"]): Hit[] {
  return parentsOf(fromId).flatMap((parent) =>
    parentsOf(parent.id).flatMap((gp) =>
      parentsOf(gp.id)
        .filter((ggp) => !gender || ggp.gender === gender)
        .map((ggp) => ({
          person: ggp,
          why: `Your great-grandmother — ${gp.shortName}'s ${parentWord(ggp)}`,
        })),
    ),
  );
}

function auntsUncles(fromId: string, gender?: Person["gender"]): Hit[] {
  const parentIds = new Set(parentsOf(fromId).map((p) => p.id));
  return parentsOf(fromId).flatMap((parent) =>
    parentsOf(parent.id).flatMap((gp) =>
      childrenOf(gp.id)
        .filter(
          (c) =>
            !parentIds.has(c.id) && (!gender || c.gender === gender),
        )
        .map((c) => ({
          person: c,
          why: `Your ${c.gender === "f" ? "aunt" : "uncle"} — ${parent.shortName}'s ${siblingWord(c)}`,
        })),
    ),
  );
}

function cousins(fromId: string): Hit[] {
  return auntsUncles(fromId).flatMap((au) =>
    childrenOf(au.person.id).map((c) => ({
      person: c,
      why: `Your cousin — ${au.person.shortName}'s ${childWord(c)}`,
    })),
  );
}

interface KinshipRule {
  terms: string[];
  resolve: (fromId: string) => Hit[];
}

const RULES: KinshipRule[] = [
  { terms: ["mom", "mother", "mum", "mama"], resolve: (id) => parents(id, "f") },
  { terms: ["dad", "father", "papa"], resolve: (id) => parents(id, "m") },
  {
    terms: ["grandma", "grandmother", "granny", "nana"],
    resolve: (id) => grandparents(id, "f"),
  },
  {
    terms: ["grandpa", "grandfather", "gramps"],
    resolve: (id) => grandparents(id, "m"),
  },
  {
    terms: ["greatgrandma", "greatgrandmother", "great-grandma", "great-grandmother"],
    resolve: (id) => greatGrandparents(id, "f"),
  },
  { terms: ["aunt", "auntie"], resolve: (id) => auntsUncles(id, "f") },
  { terms: ["uncle"], resolve: (id) => auntsUncles(id, "m") },
  { terms: ["cousin"], resolve: cousins },
];

function dedupe(hits: Hit[]): Hit[] {
  const seen = new Set<string>();
  return hits.filter((h) => {
    if (seen.has(h.person.id)) return false;
    seen.add(h.person.id);
    return true;
  });
}

/**
 * Suggestions for an @mention query: kinship terms first ("@grandma" →
 * the asker's two actual grandmothers, with the tree path explained),
 * then plain name matches.
 */
export function suggestMentions(
  query: string,
  fromId: string,
): MentionSuggestion[] {
  const q = query.toLowerCase().replace(/\s+/g, "");
  const out: MentionSuggestion[] = [];

  if (q.length > 0) {
    for (const rule of RULES) {
      if (!rule.terms.some((t) => t.startsWith(q))) continue;
      for (const hit of dedupe(rule.resolve(fromId))) {
        out.push({ person: hit.person, why: hit.why, viaKinship: true });
      }
      if (out.length > 0) break; // one kinship interpretation at a time
    }
  }

  // name matches — display, full, and maiden names plus nicknames
  // (skip anyone already suggested, and yourself)
  const have = new Set(out.map((s) => s.person.id));
  for (const person of people) {
    if (have.has(person.id) || person.id === fromId) continue;
    if (q.length === 0) continue;
    const tokens = [
      ...person.name.toLowerCase().split(/\s+/),
      ...person.fullName.toLowerCase().split(/\s+/),
      person.name.toLowerCase().replace(/\s+/g, ""),
      ...(person.maidenName ? [person.maidenName.toLowerCase()] : []),
      ...(person.nicknames ?? []).flatMap((n) => [
        n.toLowerCase(),
        ...n.toLowerCase().split(/\s+/),
      ]),
    ];
    if (tokens.some((t) => t.startsWith(q))) {
      const viaNickname = (person.nicknames ?? []).some((n) =>
        n.toLowerCase().split(/\s+/).some((t) => t.startsWith(q)),
      );
      const viaMaiden = person.maidenName?.toLowerCase().startsWith(q);
      const why = viaMaiden
        ? `${person.relation} — née ${person.maidenName}`
        : viaNickname
          ? `${person.relation} — “${person.nicknames!.join("”, “")}”`
          : person.relation;
      out.push({ person, why, viaKinship: false });
    }
  }
  return out.slice(0, 5);
}
