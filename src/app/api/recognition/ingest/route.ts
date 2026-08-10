import { NextResponse } from "next/server";

import { ensureSyntheticPhoto, insertFaces } from "@/lib/recognition/db";
import { DIM } from "@/lib/recognition/types";
import type { IngestRequest, IngestResponse } from "@/lib/recognition/types";

// All vector work is browser-side; this is pure data movement. Node runtime
// (Prisma + pg adapter can't run on Edge).
export const runtime = "nodejs";

export async function POST(req: Request): Promise<NextResponse> {
  let body: IngestRequest;
  try {
    body = (await req.json()) as IngestRequest;
  } catch {
    return NextResponse.json({ ok: false, errors: ["invalid JSON body"] }, { status: 400 });
  }

  const faces = body?.faces;
  if (!Array.isArray(faces) || faces.length === 0) {
    return NextResponse.json({ ok: false, errors: ["faces must be a non-empty array"] }, { status: 400 });
  }

  // Validate every embedding up front; reject the whole batch on any failure.
  for (let i = 0; i < faces.length; i++) {
    const emb = faces[i]?.embedding;
    if (!Array.isArray(emb) || emb.length !== DIM) {
      return NextResponse.json(
        { ok: false, errors: [`faces[${i}].embedding must have length ${DIM}`] },
        { status: 400 },
      );
    }
  }

  // Faces without an explicit photo attach to a shared placeholder (synthetic).
  const dummyId = await ensureSyntheticPhoto();
  const faceIds = await insertFaces(
    faces.map((f) => ({
      photoId: f.photoId ?? dummyId,
      bbox: f.bbox ?? { x: 0, y: 0, width: 0, height: 0 },
      embedding: f.embedding,
      thumbUrl: f.thumbUrl ?? null,
      quality: f.quality ?? null,
    })),
  );

  const res: IngestResponse = { inserted: faceIds.length, faceIds };
  return NextResponse.json(res);
}
