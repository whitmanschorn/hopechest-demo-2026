import { buildGraph, type KinEdge, type KinNode } from "../kinship";

/**
 * A realistic four-generation family used by the resolver tests. It deliberately
 * includes spouses, multiple children (siblings), two married-in branches (for
 * cousins, aunts/uncles, nieces/nephews, and in-laws), and an unrelated person.
 *
 *   G1:  Ada  ═══ Bert
 *               │
 *        ┌──────┴───────┐
 *   G2: Carol ═ Ed     Dan ═ Fay
 *        │              │
 *    ┌───┴───┐          │
 *   G3: Hugo ═ Kay   Ivy        Jen
 *        │
 *   G4:  Leo
 *
 *   Zed: unrelated to everyone.
 */
export const nodes: KinNode[] = [
  { id: "ada", gender: "f" },
  { id: "bert", gender: "m" },
  { id: "carol", gender: "f" },
  { id: "ed", gender: "m" },
  { id: "dan", gender: "m" },
  { id: "fay", gender: "f" },
  { id: "hugo", gender: "m" },
  { id: "kay", gender: "f" },
  { id: "ivy", gender: "f" },
  { id: "jen", gender: "f" },
  { id: "leo", gender: "m" },
  { id: "mae", gender: "f" },
  { id: "zed", gender: "m" },
];

export const edges: KinEdge[] = [
  { fromId: "ada", toId: "carol", type: "parent" },
  { fromId: "bert", toId: "carol", type: "parent" },
  { fromId: "ada", toId: "dan", type: "parent" },
  { fromId: "bert", toId: "dan", type: "parent" },
  { fromId: "carol", toId: "hugo", type: "parent" },
  { fromId: "ed", toId: "hugo", type: "parent" },
  { fromId: "carol", toId: "ivy", type: "parent" },
  { fromId: "ed", toId: "ivy", type: "parent" },
  { fromId: "dan", toId: "jen", type: "parent" },
  { fromId: "fay", toId: "jen", type: "parent" },
  { fromId: "hugo", toId: "leo", type: "parent" },
  { fromId: "kay", toId: "leo", type: "parent" },
  { fromId: "mae", toId: "kay", type: "parent" },
  { fromId: "ada", toId: "bert", type: "spouse" },
  { fromId: "carol", toId: "ed", type: "spouse" },
  { fromId: "dan", toId: "fay", type: "spouse" },
  { fromId: "hugo", toId: "kay", type: "spouse" },
];

export const family = buildGraph(nodes, edges);
