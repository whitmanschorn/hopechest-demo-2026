// In-memory clusterer: DBSCAN expressed via disjoint-set union.
//
// Why DSU and not single-linkage: gating cluster growth on *core points* and
// unioning core-to-core only avoids the chaining problem (A~B~C transitively
// merging distinct people). Border (non-core) points attach to their nearest
// core neighbor but never bridge two clusters.
//
// O(n^2) — fine to ~10k faces. Beyond that, switch to pgvector-for-candidate-
// neighbors and cluster the sparse graph instead (see docs/recognition.md).
//
// Determinism is mandatory for CI: every tie (border assignment, medoid choice,
// cluster ordering) breaks on a stable key — distance, then quality DESC, then
// id. Same input -> identical clusters every run.

import { distanceFn, mean, normalize } from "./distance";
import { DSU } from "./dsu";
import type { Embedding, PipelineConfig } from "./types";

export interface ClusterFace {
  id: string;
  embedding: Embedding;
  quality?: number | null;
}

export interface BuiltCluster {
  centroid: Embedding; // mean of members in RAW space (used for the sweep kNN)
  size: number;
  representativeFaceId: string; // medoid; for the UI thumbnail
  memberIds: string[]; // sorted ascending for determinism
}

export interface ClusterResult {
  clusters: BuiltCluster[]; // ordered size DESC, then smallest memberId ASC
  noise: string[]; // ids left unclustered (cluster_id = NULL), sorted
  facesClustered: number;
}

export function rebuild(faces: ClusterFace[], config: PipelineConfig): ClusterResult {
  const n = faces.length;
  const { eps, minPts, metric, normalizeForClustering } = config;
  const dist = distanceFn(metric);

  if (n === 0) return { clusters: [], noise: [], facesClustered: 0 };

  // raw embeddings drive the stored centroid + the sweep; the clustering graph
  // may run on normalized copies (cheap, reversible, decoupled from the index).
  const raw = faces.map((f) => f.embedding);
  const pts = normalizeForClustering ? raw.map(normalize) : raw;
  const quality = faces.map((f) => f.quality ?? 0);

  // 1. neighbors within eps (O(n^2), symmetric; includes i itself)
  const neighbors: number[][] = Array.from({ length: n }, () => []);
  for (let i = 0; i < n; i++) {
    neighbors[i].push(i);
    for (let j = i + 1; j < n; j++) {
      if (dist(pts[i], pts[j]) <= eps) {
        neighbors[i].push(j);
        neighbors[j].push(i);
      }
    }
  }

  // 2. core points
  const isCore = neighbors.map((nb) => nb.length >= minPts);

  // 3. union core-to-core only (the chaining guard)
  const dsu = new DSU(n);
  for (let i = 0; i < n; i++) {
    if (!isCore[i]) continue;
    for (const j of neighbors[i]) {
      if (isCore[j]) dsu.union(i, j);
    }
  }

  // 4. attach each border point to its NEAREST core neighbor's cluster.
  //    Never union border-to-border. Tie-break: distance, then face id.
  const assignedRoot = new Array<number | null>(n).fill(null);
  for (let i = 0; i < n; i++) {
    if (isCore[i]) {
      assignedRoot[i] = dsu.find(i);
      continue;
    }
    let best = -1;
    let bestDist = Infinity;
    for (const j of neighbors[i]) {
      if (!isCore[j]) continue;
      const d = dist(pts[i], pts[j]);
      if (d < bestDist || (d === bestDist && (best === -1 || faces[j].id < faces[best].id))) {
        bestDist = d;
        best = j;
      }
    }
    assignedRoot[i] = best === -1 ? null : dsu.find(best); // null -> NOISE
  }

  // 5. materialize clusters (each root group has >= 1 core member by construction)
  const groups = new Map<number, number[]>();
  const noise: string[] = [];
  for (let i = 0; i < n; i++) {
    const root = assignedRoot[i];
    if (root === null) {
      noise.push(faces[i].id);
      continue;
    }
    const g = groups.get(root) ?? [];
    g.push(i);
    groups.set(root, g);
  }

  const clusters: BuiltCluster[] = [];
  for (const idxs of groups.values()) {
    const centroid = mean(idxs.map((i) => raw[i]));
    // medoid: nearest member to centroid; tie-break quality DESC, then id ASC.
    let medoid = idxs[0];
    let medoidDist = Infinity;
    for (const i of idxs) {
      const d = dist(raw[i], centroid);
      if (
        d < medoidDist ||
        (d === medoidDist &&
          (quality[i] > quality[medoid] ||
            (quality[i] === quality[medoid] && faces[i].id < faces[medoid].id)))
      ) {
        medoidDist = d;
        medoid = i;
      }
    }
    const memberIds = idxs.map((i) => faces[i].id).sort();
    clusters.push({
      centroid,
      size: memberIds.length,
      representativeFaceId: faces[medoid].id,
      memberIds,
    });
  }

  // deterministic output order: size DESC, then smallest memberId ASC
  clusters.sort((a, b) => b.size - a.size || (a.memberIds[0] < b.memberIds[0] ? -1 : 1));
  noise.sort();

  const facesClustered = clusters.reduce((s, c) => s + c.size, 0);
  return { clusters, noise, facesClustered };
}
