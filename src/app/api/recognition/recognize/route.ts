import { NextResponse } from "next/server";

import { getFaceEmbedding, recognizeNeighbors } from "@/lib/recognition/db";
import { pickMatch } from "@/lib/recognition/recognize";
import { cfg, DIM } from "@/lib/recognition/types";
import type { RecognizeRequest, RecognizeResponse } from "@/lib/recognition/types";

export const runtime = "nodejs";

// Indexed kNN against labeled faces only (partial index), threshold + optional
// vote. Returns the match or null plus the raw neighbors for debugging.
export async function POST(req: Request): Promise<NextResponse> {
  let body: RecognizeRequest;
  try {
    body = (await req.json()) as RecognizeRequest;
  } catch {
    return NextResponse.json({ ok: false, errors: ["invalid JSON body"] }, { status: 400 });
  }

  const config = cfg(body?.config);

  let embedding = body?.embedding;
  if (!embedding && body?.faceId) {
    const looked = await getFaceEmbedding(body.faceId);
    if (!looked) {
      return NextResponse.json({ ok: false, errors: ["faceId not found"] }, { status: 404 });
    }
    embedding = looked;
  }
  if (!Array.isArray(embedding) || embedding.length !== DIM) {
    return NextResponse.json(
      { ok: false, errors: [`provide embedding (length ${DIM}) or a valid faceId`] },
      { status: 400 },
    );
  }

  const neighbors = await recognizeNeighbors(embedding, config);
  const match = pickMatch(neighbors, config);

  const res: RecognizeResponse = {
    match,
    neighbors: neighbors.map((n) => ({
      faceId: n.faceId,
      identityId: n.identityId,
      name: n.name,
      distance: n.distance,
    })),
  };
  return NextResponse.json(res);
}
