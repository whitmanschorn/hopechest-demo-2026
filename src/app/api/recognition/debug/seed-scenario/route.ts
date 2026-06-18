import { NextResponse } from "next/server";

import { ensureSyntheticPhoto, insertFaces } from "@/lib/recognition/db";
import { debugEnabled } from "@/lib/recognition/guard";
import { scenarioFromParams } from "@/lib/recognition/scenario";
import type { GenParams, Scenario } from "@/lib/recognition/scenario";

export const runtime = "nodejs";

interface SeedBody {
  scenario?: Scenario; // a committed fixture (reproducible) ...
  generate?: GenParams; // ... or synthesize on the fly (panel knobs)
}

// Gated: seeds synthetic faces with known ground truth. Returns inserted face
// ids and a truthPerson -> faceIds map so tests can reference ground truth.
// Disabled -> 404 (invisible in prod), never 403.
export async function POST(req: Request): Promise<NextResponse> {
  if (!debugEnabled()) return new NextResponse("Not found", { status: 404 });

  let body: SeedBody;
  try {
    body = (await req.json()) as SeedBody;
  } catch {
    return NextResponse.json({ ok: false, errors: ["invalid JSON body"] }, { status: 400 });
  }

  const scenario = body.scenario ?? (body.generate ? scenarioFromParams(body.generate) : null);
  if (!scenario || !Array.isArray(scenario.faces) || scenario.faces.length === 0) {
    return NextResponse.json(
      { ok: false, errors: ["provide { scenario } or { generate }"] },
      { status: 400 },
    );
  }

  const photoId = await ensureSyntheticPhoto();
  const faceIds = await insertFaces(
    scenario.faces.map((f) => ({
      photoId,
      bbox: { x: 0, y: 0, width: 0, height: 0 },
      embedding: f.embedding,
      thumbUrl: null,
      quality: null,
    })),
  );

  // ground-truth map: truthPerson -> the face ids we just inserted (same order)
  const truthPersonToFaceIds: Record<number, string[]> = {};
  scenario.faces.forEach((f, i) => {
    (truthPersonToFaceIds[f.truthPerson] ??= []).push(faceIds[i]);
  });

  return NextResponse.json({
    inserted: faceIds.length,
    faceIds,
    truthPersonToFaceIds,
    expected: scenario.expected,
    // echo the resolved fixture so the panel can offer "freeze to fixtures/"
    scenario: body.generate ? scenario : undefined,
  });
}
