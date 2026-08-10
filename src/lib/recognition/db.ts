// Raw-SQL seam for the recognition vector path.
//
// The family graph goes through @/data; recognition's vector reads/writes can't
// (Prisma's pgvector support is weak and the embedding/centroid columns are
// Unsupported, so excluded from the client). We keep Prisma for the non-vector
// tables and use $queryRawUnsafe/$executeRawUnsafe for everything touching a
// vector. Vectors are passed as their text form ('[a,b,...]') bound to a
// parameter and cast `::vector` in SQL — never string-concatenated.

import { randomUUID } from "node:crypto";

import { prisma } from "@/lib/prisma";

import { DIM } from "./types";
import type { BuiltCluster, ClusterResult } from "./cluster";
import type { Embedding, PipelineConfig } from "./types";

const SYNTHETIC_PHOTO_ID = "synthetic-dummy";
const CHUNK = 500; // keep well under Postgres' 65535 bound-param ceiling

/** Validate + format an embedding as a pgvector text literal. Throws on bad input. */
export function vectorLiteral(emb: Embedding): string {
  if (!Array.isArray(emb) || emb.length !== DIM) {
    throw new Error(`embedding must have length ${DIM}, got ${Array.isArray(emb) ? emb.length : typeof emb}`);
  }
  for (const x of emb) {
    if (typeof x !== "number" || !Number.isFinite(x)) {
      throw new Error("embedding contains a non-finite value");
    }
  }
  return `[${emb.join(",")}]`;
}

/** Parse a pgvector text value ('[a,b,...]') back into numbers. */
function parseVector(text: string): Embedding {
  return JSON.parse(text) as Embedding;
}

function chunk<T>(arr: T[], size = CHUNK): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

const opFor = (metric: PipelineConfig["metric"]) => (metric === "cosine" ? "<=>" : "<->");

// --- photos -----------------------------------------------------------------

/** A shared placeholder photo so synthetic faces satisfy the photo_id FK. */
export async function ensureSyntheticPhoto(): Promise<string> {
  await prisma.facePhoto.upsert({
    where: { id: SYNTHETIC_PHOTO_ID },
    update: {},
    create: { id: SYNTHETIC_PHOTO_ID, blobUrl: "synthetic://placeholder" },
  });
  return SYNTHETIC_PHOTO_ID;
}

// --- ingest -----------------------------------------------------------------

export interface InsertFace {
  photoId: string;
  bbox: unknown;
  embedding: Embedding;
  thumbUrl?: string | null;
  quality?: number | null;
}

/** Bulk-insert faces. Ids are generated here so we can return them in order. */
export async function insertFaces(faces: InsertFace[]): Promise<string[]> {
  const ids: string[] = [];
  for (const batch of chunk(faces)) {
    const values: unknown[] = [];
    const rows: string[] = [];
    batch.forEach((f, i) => {
      const id = randomUUID();
      ids.push(id);
      const b = i * 6;
      rows.push(`($${b + 1}, $${b + 2}, $${b + 3}::jsonb, $${b + 4}::vector, $${b + 5}, $${b + 6})`);
      values.push(
        id,
        f.photoId,
        JSON.stringify(f.bbox ?? { x: 0, y: 0, width: 0, height: 0 }),
        vectorLiteral(f.embedding),
        f.thumbUrl ?? null,
        f.quality ?? null,
      );
    });
    await prisma.$executeRawUnsafe(
      `INSERT INTO faces (id, photo_id, bbox, embedding, thumb_url, quality) VALUES ${rows.join(", ")}`,
      ...values,
    );
  }
  return ids;
}

// --- rebuild ----------------------------------------------------------------

export interface UnlabeledFace {
  id: string;
  embedding: Embedding;
  quality: number | null;
}

export async function loadUnlabeledFaces(): Promise<UnlabeledFace[]> {
  const rows = await prisma.$queryRawUnsafe<{ id: string; embedding: string; quality: number | null }[]>(
    `SELECT id, embedding::text AS embedding, quality FROM faces WHERE identity_id IS NULL`,
  );
  return rows.map((r) => ({ id: r.id, embedding: parseVector(r.embedding), quality: r.quality }));
}

/**
 * Persist a rebuild in one transaction: clear stale clusters, write the new
 * cluster rows (with centroids), and stamp cluster_id onto member faces.
 */
export async function applyRebuild(result: ClusterResult): Promise<void> {
  const assignments: Array<[faceId: string, clusterId: string]> = [];
  const clusterRows: Array<{ id: string; cluster: BuiltCluster }> = result.clusters.map((c) => {
    const id = randomUUID();
    for (const fid of c.memberIds) assignments.push([fid, id]);
    return { id, cluster: c };
  });

  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`TRUNCATE TABLE face_clusters`);
    // clear ephemeral cluster_id on every still-unlabeled face (handles noise too)
    await tx.$executeRawUnsafe(`UPDATE faces SET cluster_id = NULL WHERE identity_id IS NULL`);

    for (const batch of chunk(clusterRows)) {
      const values: unknown[] = [];
      const rows: string[] = [];
      batch.forEach(({ id, cluster }, i) => {
        const b = i * 4;
        rows.push(`($${b + 1}, $${b + 2}::vector, $${b + 3}, $${b + 4})`);
        values.push(id, vectorLiteral(cluster.centroid), cluster.size, cluster.representativeFaceId);
      });
      await tx.$executeRawUnsafe(
        `INSERT INTO face_clusters (id, centroid, size, representative_face_id) VALUES ${rows.join(", ")}`,
        ...values,
      );
    }

    for (const batch of chunk(assignments)) {
      const values: unknown[] = [];
      const tuples: string[] = [];
      batch.forEach(([faceId, clusterId], i) => {
        const b = i * 2;
        tuples.push(`($${b + 1}, $${b + 2})`);
        values.push(faceId, clusterId);
      });
      await tx.$executeRawUnsafe(
        `UPDATE faces AS f SET cluster_id = v.cid
         FROM (VALUES ${tuples.join(", ")}) AS v(fid, cid)
         WHERE f.id = v.fid`,
        ...values,
      );
    }
  });
}

// --- questions (no vectors -> plain Prisma) ---------------------------------

export interface QuestionRow {
  clusterId: string;
  size: number;
  representativeFaceId: string | null;
  representativeThumbUrl: string | null;
  sampleFaceIds: string[];
}

export async function getQuestionRows(sampleCount = 4): Promise<QuestionRow[]> {
  const clusters = await prisma.faceCluster.findMany({
    orderBy: [{ size: "desc" }, { id: "asc" }],
  });
  const out: QuestionRow[] = [];
  for (const c of clusters) {
    const members = await prisma.face.findMany({
      where: { clusterId: c.id },
      select: { id: true },
      orderBy: { id: "asc" },
      take: sampleCount,
    });
    let thumb: string | null = null;
    if (c.representativeFaceId) {
      const rep = await prisma.face.findUnique({
        where: { id: c.representativeFaceId },
        select: { thumbUrl: true },
      });
      thumb = rep?.thumbUrl ?? null;
    }
    out.push({
      clusterId: c.id,
      size: c.size,
      representativeFaceId: c.representativeFaceId,
      representativeThumbUrl: thumb,
      sampleFaceIds: members.map((m) => m.id),
    });
  }
  return out;
}

// --- label + sweep ----------------------------------------------------------

export async function resolveOrCreateIdentity(opts: {
  identityId?: string;
  newName?: string;
  appPersonId?: string;
}): Promise<string> {
  if (opts.identityId) return opts.identityId;
  const name = opts.newName?.trim();
  if (!name) throw new Error("label requires identityId or newName");
  const created = await prisma.faceIdentity.create({
    data: { name, appPersonId: opts.appPersonId ?? null },
  });
  return created.id;
}

export async function labelClusterFaces(clusterId: string, identityId: string): Promise<number> {
  const res = await prisma.face.updateMany({
    where: { clusterId },
    data: { identityId },
  });
  return res.count;
}

async function clusterCentroidLiteral(clusterId: string): Promise<string | null> {
  const rows = await prisma.$queryRawUnsafe<{ centroid: string }[]>(
    `SELECT centroid::text AS centroid FROM face_clusters WHERE id = $1`,
    clusterId,
  );
  return rows[0]?.centroid ?? null;
}

/** Unlabeled faces within `eps` of the cluster centroid (excludes just-labeled members). */
export async function sweepNearCentroid(
  clusterId: string,
  cfg: PipelineConfig,
  limit = 100,
): Promise<string[]> {
  const centroid = await clusterCentroidLiteral(clusterId);
  if (!centroid) return [];
  const op = opFor(cfg.metric);
  const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT id FROM faces
     WHERE identity_id IS NULL AND (embedding ${op} $1::vector) <= $2
     ORDER BY embedding ${op} $1::vector
     LIMIT $3`,
    centroid,
    cfg.eps,
    limit,
  );
  return rows.map((r) => r.id);
}

export async function assignIdentity(faceIds: string[], identityId: string): Promise<number> {
  if (faceIds.length === 0) return 0;
  const res = await prisma.face.updateMany({
    where: { id: { in: faceIds } },
    data: { identityId },
  });
  return res.count;
}

// --- recognize --------------------------------------------------------------

export interface NeighborRow {
  faceId: string;
  identityId: string | null;
  name: string | null;
  distance: number;
}

export async function getFaceEmbedding(faceId: string): Promise<Embedding | null> {
  const rows = await prisma.$queryRawUnsafe<{ embedding: string }[]>(
    `SELECT embedding::text AS embedding FROM faces WHERE id = $1`,
    faceId,
  );
  return rows[0] ? parseVector(rows[0].embedding) : null;
}

/** kNN against labeled faces only (partial HNSW index). */
export async function recognizeNeighbors(
  embedding: Embedding,
  cfg: PipelineConfig,
): Promise<NeighborRow[]> {
  const op = opFor(cfg.metric);
  const lit = vectorLiteral(embedding);
  const rows = await prisma.$queryRawUnsafe<
    { id: string; identity_id: string | null; name: string | null; dist: number }[]
  >(
    `SELECT f.id, f.identity_id, p.name, (f.embedding ${op} $1::vector) AS dist
     FROM faces f JOIN face_identities p ON f.identity_id = p.id
     WHERE f.identity_id IS NOT NULL
     ORDER BY f.embedding ${op} $1::vector
     LIMIT $2`,
    lit,
    cfg.recognizeK,
  );
  return rows.map((r) => ({
    faceId: r.id,
    identityId: r.identity_id,
    name: r.name,
    distance: Number(r.dist),
  }));
}

// --- debug ------------------------------------------------------------------

export async function resetAll(): Promise<void> {
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE faces, face_clusters, face_identities, face_photos RESTART IDENTITY CASCADE`,
  );
}
