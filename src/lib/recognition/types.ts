// Shared recognition types. Imported by both client (debug page) and the
// route handlers. Every tunable knob lives in PipelineConfig; nothing in the
// pipeline reads a bare constant — it reads merged config (see `cfg`). That's
// what lets the debug panel's sliders and CI's pinned values work without code
// changes or a redeploy.
//
// Terminology note: a recognition "identity" is NOT a Hope Chest `Person`.
//   - cluster  = ephemeral, system-proposed grouping ("a shared face").
//   - identity = durable, human-confirmed identity, optionally bridged to a
//                real Person via appPersonId.

export const DIM = 128; // STRUCTURAL: baked into the vector(128) column + HNSW indexes.

export interface PipelineConfig {
  eps: number; // same-person L2 threshold (dlib/face-api default 0.6)
  minPts: number; // DBSCAN core test, includes the point itself
  metric: "l2" | "cosine"; // distance for clustering AND which recognize index to hit
  normalizeForClustering: boolean; // L2-normalize in memory before clustering only
  recognizeK: number; // neighbors the recognize path considers
  recognizeThreshold: number; // accept cutoff for recognize (usually = eps, but separable)
  recognizeVote: boolean; // false = nearest-within-threshold; true = majority among sub-threshold k
}

export const DEFAULT_CONFIG: PipelineConfig = {
  eps: 0.6,
  minPts: 3,
  metric: "l2",
  normalizeForClustering: false,
  recognizeK: 3,
  recognizeThreshold: 0.6,
  recognizeVote: false,
};

// Merge helper used by every tunable pipeline endpoint.
export const cfg = (o?: Partial<PipelineConfig>): PipelineConfig => ({
  ...DEFAULT_CONFIG,
  ...o,
});

export type Embedding = number[]; // length DIM, raw (NOT normalized at rest)

export interface BBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FaceInput {
  photoId?: string | null; // resolves to an existing face_photo; null -> shared dummy
  bbox?: BBox;
  embedding: Embedding;
  thumbUrl?: string | null;
  quality?: number | null;
}

export interface IngestRequest {
  faces: FaceInput[];
}
export interface IngestResponse {
  inserted: number;
  faceIds: string[];
}

export interface RebuildRequest {
  config?: Partial<PipelineConfig>;
}
export interface RebuildResponse {
  clusters: number; // clusters produced (groups with >= minPts core support)
  facesClustered: number;
  noise: number; // unlabeled faces left unclustered
  tookMs: number;
}

export interface ClusterQuestion {
  clusterId: string;
  size: number;
  representativeFaceId: string | null;
  representativeThumbUrl: string | null;
  sampleFaceIds: string[]; // a few extra members for the card UI
}
export interface QuestionsResponse {
  questions: ClusterQuestion[];
}

export interface LabelRequest {
  clusterId: string;
  identityId?: string; // label as an existing identity...
  newName?: string; // ...or create a new identity
  appPersonId?: string; // optionally bridge a NEW identity to a Hope Chest Person
  sweep?: boolean; // also consider nearby unlabeled faces
  autoAssign?: boolean; // if sweep: true=assign immediately, false=return as suggestions
  config?: Partial<PipelineConfig>;
}
export interface LabelResponse {
  identityId: string;
  facesLabeled: number; // members of the cluster
  sweptIn: number; // extra faces auto-assigned by proximity (autoAssign)
  suggestions: string[]; // faceIds near centroid awaiting confirm (!autoAssign)
}

export interface RecognizeRequest {
  embedding?: Embedding; // provide this...
  faceId?: string; // ...or this (server looks up the stored embedding)
  config?: Partial<PipelineConfig>;
}
export interface RecognizeMatch {
  identityId: string;
  name: string;
  distance: number; // L2 to nearest labeled neighbor
  confidence: number; // heuristic linear map, see recognize.ts
}
export interface RecognizeNeighbor {
  faceId: string;
  identityId: string | null;
  name: string | null;
  distance: number;
}
export interface RecognizeResponse {
  match: RecognizeMatch | null; // null = unknown / below confidence
  neighbors: RecognizeNeighbor[];
}
