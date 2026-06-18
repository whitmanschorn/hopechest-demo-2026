import { NextResponse } from "next/server";

import { rebuild } from "@/lib/recognition/cluster";
import { applyRebuild, loadUnlabeledFaces } from "@/lib/recognition/db";
import { cfg } from "@/lib/recognition/types";
import type { RebuildRequest, RebuildResponse } from "@/lib/recognition/types";

export const runtime = "nodejs";

// The batch job. Pulls every unlabeled vector into memory (a few MB at
// thousands of faces), clusters in JS, then writes clusters + cluster_id in one
// transaction. No per-face pgvector round-trips here — that would blow the
// function timeout. Only faces with identity_id IS NULL are clustered; labeled
// faces have permanently left the pool (durability rule).
export async function POST(req: Request): Promise<NextResponse> {
  let body: RebuildRequest = {};
  try {
    body = (await req.json()) as RebuildRequest;
  } catch {
    // empty body is fine — use defaults
  }
  const config = cfg(body?.config);

  const start = Date.now();
  const faces = await loadUnlabeledFaces();
  const result = rebuild(faces, config);
  await applyRebuild(result);

  const res: RebuildResponse = {
    clusters: result.clusters.length,
    facesClustered: result.facesClustered,
    noise: result.noise.length,
    tookMs: Date.now() - start,
  };
  return NextResponse.json(res);
}
