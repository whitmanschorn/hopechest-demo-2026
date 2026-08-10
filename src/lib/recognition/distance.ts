// Pure distance helpers. face-api descriptors are dlib-lineage and raw (NOT
// L2-normalized), so the same-person threshold is Euclidean L2 < ~0.6. We never
// normalize at rest — that would invalidate the 0.6 constant. `normalize` is
// only used in-memory when `normalizeForClustering` is on.

import type { Embedding } from "./types";

/** Squared Euclidean distance — cheaper than l2 when you only need ordering. */
export function l2sq(a: Embedding, b: Embedding): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    s += d * d;
  }
  return s;
}

/** Euclidean (L2) distance. */
export function l2(a: Embedding, b: Embedding): number {
  return Math.sqrt(l2sq(a, b));
}

/** Cosine distance in [0, 2]: 1 - cosine similarity. */
export function cosine(a: Embedding, b: Embedding): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  if (denom === 0) return 1;
  return 1 - dot / denom;
}

/** L2-normalize to a unit vector (zero vector returned unchanged). */
export function normalize(a: Embedding): Embedding {
  let n = 0;
  for (const x of a) n += x * x;
  n = Math.sqrt(n);
  if (n === 0) return a.slice();
  return a.map((x) => x / n);
}

export type Metric = "l2" | "cosine";

/** Pick the distance function for a metric. */
export function distanceFn(metric: Metric): (a: Embedding, b: Embedding) => number {
  return metric === "cosine" ? cosine : l2;
}

/** Element-wise mean of a non-empty list of equal-length vectors (centroid). */
export function mean(vectors: Embedding[]): Embedding {
  const n = vectors.length;
  const dim = vectors[0].length;
  const out = new Array(dim).fill(0);
  for (const v of vectors) {
    for (let i = 0; i < dim; i++) out[i] += v[i];
  }
  for (let i = 0; i < dim; i++) out[i] /= n;
  return out;
}
