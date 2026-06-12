/**
 * Pure kinship resolver. Knows nothing about the app's data layer — you hand it
 * a graph of nodes (id + gender) and edges (parent / spouse), and it computes
 * how any two people are related, in both directions. This isolation is what
 * makes it unit-testable to high coverage (see __tests__/kinship.test.ts).
 *
 *   const g = buildGraph(nodes, edges);
 *   relationship(g, "margaret", "klara");   // { kind: "great-grandparent", label: "great-grandmother", ... }
 *   relationship(g, "klara", "margaret");   // { kind: "great-grandchild", label: "great-granddaughter" }
 */

export type Gender = "f" | "m";

export interface KinNode {
  id: string;
  gender: Gender;
}

export interface KinEdge {
  fromId: string;
  toId: string;
  /** "parent": fromId is the parent of toId. "spouse": order-agnostic. */
  type: "parent" | "spouse";
}

export interface KinGraph {
  nodes: Map<string, KinNode>;
  /** child id -> set of parent ids */
  parents: Map<string, Set<string>>;
  /** parent id -> set of child ids */
  children: Map<string, Set<string>>;
  /** person id -> set of spouse ids */
  spouses: Map<string, Set<string>>;
}

export type RelationKind =
  | "spouse"
  | "parent"
  | "child"
  | "sibling"
  | "grandparent"
  | "grandchild"
  | "great-grandparent"
  | "great-grandchild"
  | "aunt-uncle"
  | "niece-nephew"
  | "cousin"
  | "parent-in-law"
  | "child-in-law"
  | "sibling-in-law";

export interface Relation {
  kind: RelationKind;
  /** Gendered noun for how `toId` relates to `fromId`, e.g. "grandmother". */
  label: string;
  /** Extra "great-" steps for deep ancestor/descendant/aunt chains (0 by default). */
  greats?: number;
  /** Cousin degree (1 = first cousin) and removal (generation gap). */
  degree?: number;
  removal?: number;
  /** True when the tie is through marriage rather than blood. */
  byMarriage?: boolean;
}

function addEdge(map: Map<string, Set<string>>, a: string, b: string) {
  if (!map.has(a)) map.set(a, new Set());
  map.get(a)!.add(b);
}

export function buildGraph(nodes: KinNode[], edges: KinEdge[]): KinGraph {
  const g: KinGraph = {
    nodes: new Map(nodes.map((n) => [n.id, n])),
    parents: new Map(),
    children: new Map(),
    spouses: new Map(),
  };
  for (const e of edges) {
    if (e.type === "parent") {
      addEdge(g.children, e.fromId, e.toId);
      addEdge(g.parents, e.toId, e.fromId);
    } else {
      addEdge(g.spouses, e.fromId, e.toId);
      addEdge(g.spouses, e.toId, e.fromId);
    }
  }
  return g;
}

const genderWord = (g: Gender, f: string, m: string) => (g === "f" ? f : m);
const greatPrefix = (n: number) => "great-".repeat(Math.max(0, n));

/** Strict ancestors of `id` (distance ≥ 1), by shortest distance. Cycle-safe. */
function ancestorDistances(g: KinGraph, id: string): Map<string, number> {
  const dist = new Map<string, number>();
  let frontier = [id];
  let d = 0;
  const seen = new Set([id]);
  while (frontier.length) {
    d += 1;
    const next: string[] = [];
    for (const cur of frontier) {
      for (const p of g.parents.get(cur) ?? []) {
        if (seen.has(p)) continue;
        seen.add(p);
        dist.set(p, d);
        next.push(p);
      }
    }
    frontier = next;
  }
  return dist;
}

/** Strict descendants of `id` (distance ≥ 1), by shortest distance. Cycle-safe. */
function descendantDistances(g: KinGraph, id: string): Map<string, number> {
  const dist = new Map<string, number>();
  let frontier = [id];
  let d = 0;
  const seen = new Set([id]);
  while (frontier.length) {
    d += 1;
    const next: string[] = [];
    for (const cur of frontier) {
      for (const c of g.children.get(cur) ?? []) {
        if (seen.has(c)) continue;
        seen.add(c);
        dist.set(c, d);
        next.push(c);
      }
    }
    frontier = next;
  }
  return dist;
}

function sharesParent(g: KinGraph, a: string, b: string): boolean {
  const pa = g.parents.get(a);
  const pb = g.parents.get(b);
  if (!pa || !pb) return false;
  for (const p of pa) if (pb.has(p)) return true;
  return false;
}

/** Nearest common ancestor of a and b, with each one's distance up to it. */
function nearestCommonAncestor(
  g: KinGraph,
  a: string,
  b: string,
): { distA: number; distB: number } | null {
  const ancA = ancestorDistances(g, a);
  const ancB = ancestorDistances(g, b);
  let best: { distA: number; distB: number } | null = null;
  for (const [id, da] of ancA) {
    const db = ancB.get(id);
    if (db === undefined) continue;
    if (
      !best ||
      da + db < best.distA + best.distB ||
      (da + db === best.distA + best.distB && Math.max(da, db) < Math.max(best.distA, best.distB))
    ) {
      best = { distA: da, distB: db };
    }
  }
  return best;
}

/** Blood-only relationship of `toId` to `fromId` (ignores marriage). */
function bloodRelationship(g: KinGraph, fromId: string, toId: string): Relation | null {
  const to = g.nodes.get(toId);
  const from = g.nodes.get(fromId);
  if (!to || !from || fromId === toId) return null;

  // direct ancestor
  const ancestors = ancestorDistances(g, fromId);
  const upd = ancestors.get(toId);
  if (upd !== undefined) {
    if (upd === 1) return { kind: "parent", label: genderWord(to.gender, "mother", "father") };
    if (upd === 2) return { kind: "grandparent", label: genderWord(to.gender, "grandmother", "grandfather") };
    const greats = upd - 2;
    return { kind: "great-grandparent", greats, label: greatPrefix(greats) + genderWord(to.gender, "grandmother", "grandfather") };
  }

  // direct descendant
  const descendants = descendantDistances(g, fromId);
  const downd = descendants.get(toId);
  if (downd !== undefined) {
    if (downd === 1) return { kind: "child", label: genderWord(to.gender, "daughter", "son") };
    if (downd === 2) return { kind: "grandchild", label: genderWord(to.gender, "granddaughter", "grandson") };
    const greats = downd - 2;
    return { kind: "great-grandchild", greats, label: greatPrefix(greats) + genderWord(to.gender, "granddaughter", "grandson") };
  }

  // sibling
  if (sharesParent(g, fromId, toId)) {
    return { kind: "sibling", label: genderWord(to.gender, "sister", "brother") };
  }

  // collateral via nearest common ancestor
  const nca = nearestCommonAncestor(g, fromId, toId);
  if (nca) {
    const { distA: dF, distB: dT } = nca;
    // aunt/uncle: to is a sibling of one of from's ancestors (to is a child of the NCA)
    if (dT === 1 && dF >= 2) {
      const greats = dF - 2;
      return { kind: "aunt-uncle", greats, label: greatPrefix(greats) + genderWord(to.gender, "aunt", "uncle") };
    }
    // niece/nephew: from is aunt/uncle of to
    if (dF === 1 && dT >= 2) {
      const greats = dT - 2;
      return { kind: "niece-nephew", greats, label: greatPrefix(greats) + genderWord(to.gender, "niece", "nephew") };
    }
    // cousins
    if (dF >= 2 && dT >= 2) {
      const degree = Math.min(dF, dT) - 1;
      const removal = Math.abs(dF - dT);
      return { kind: "cousin", degree, removal, label: "cousin" };
    }
  }
  return null;
}

/**
 * How `toId` is related to `fromId` (read: "toId is from's <label>"), or null if
 * unrelated / same person / unknown id. Considers blood ties first, then the
 * direct spouse, then a single marriage hop (in-laws, aunt/uncle by marriage).
 */
export function relationship(g: KinGraph, fromId: string, toId: string): Relation | null {
  const to = g.nodes.get(toId);
  const from = g.nodes.get(fromId);
  if (!to || !from || fromId === toId) return null;

  // direct spouse
  if (g.spouses.get(fromId)?.has(toId)) {
    return { kind: "spouse", label: genderWord(to.gender, "wife", "husband") };
  }

  const blood = bloodRelationship(g, fromId, toId);
  if (blood) return blood;

  // one marriage hop: to is the spouse of one of from's blood relatives,
  // or to is a blood relative of from's spouse.
  for (const spouseOfTo of g.spouses.get(toId) ?? []) {
    const r = bloodRelationship(g, fromId, spouseOfTo);
    if (r) {
      const inlaw = inLawFrom(r, to.gender);
      if (inlaw) return inlaw;
    }
  }
  for (const mySpouse of g.spouses.get(fromId) ?? []) {
    const r = bloodRelationship(g, mySpouse, toId);
    if (r) {
      const inlaw = inLawFrom(r, to.gender);
      if (inlaw) return inlaw;
    }
  }
  return null;
}

/** Translate a blood relation of a spouse-linked person into an in-law label. */
function inLawFrom(r: Relation, toGender: Gender): Relation | null {
  switch (r.kind) {
    case "aunt-uncle":
      return { kind: "aunt-uncle", greats: r.greats, byMarriage: true, label: greatPrefix(r.greats ?? 0) + genderWord(toGender, "aunt", "uncle") };
    case "sibling":
      return { kind: "sibling-in-law", byMarriage: true, label: genderWord(toGender, "sister-in-law", "brother-in-law") };
    case "parent":
      return { kind: "parent-in-law", byMarriage: true, label: genderWord(toGender, "mother-in-law", "father-in-law") };
    case "child":
      return { kind: "child-in-law", byMarriage: true, label: genderWord(toGender, "daughter-in-law", "son-in-law") };
    default:
      return null;
  }
}

/** A short phrase like "first cousin once removed" for cousin relations. */
export function cousinPhrase(r: Relation): string {
  const ord = ["", "first", "second", "third", "fourth", "fifth"];
  const degree = r.degree ?? 1;
  const base = `${ord[degree] ?? `${degree}th`} cousin`;
  if (!r.removal) return base;
  const rem = r.removal === 1 ? "once" : r.removal === 2 ? "twice" : `${r.removal} times`;
  return `${base} ${rem} removed`;
}

/** "your grandmother" / "your first cousin once removed" — no names (pure). */
export function describe(g: KinGraph, fromId: string, toId: string): string | null {
  const r = relationship(g, fromId, toId);
  if (!r) return null;
  const noun = r.kind === "cousin" ? cousinPhrase(r) : r.label;
  return r.byMarriage && r.kind === "aunt-uncle" ? `your ${noun} (by marriage)` : `your ${noun}`;
}
