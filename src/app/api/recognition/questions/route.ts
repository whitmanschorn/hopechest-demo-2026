import { NextResponse } from "next/server";

import { getQuestionRows } from "@/lib/recognition/db";
import type { ClusterQuestion, QuestionsResponse } from "@/lib/recognition/types";

export const runtime = "nodejs";

// The asking queue. Biggest cluster first = most-photographed person first.
// Tie-break by id keeps CI deterministic.
export async function GET(): Promise<NextResponse> {
  const rows = await getQuestionRows();
  const questions: ClusterQuestion[] = rows.map((r) => ({
    clusterId: r.clusterId,
    size: r.size,
    representativeFaceId: r.representativeFaceId,
    representativeThumbUrl: r.representativeThumbUrl,
    sampleFaceIds: r.sampleFaceIds,
  }));
  const res: QuestionsResponse = { questions };
  return NextResponse.json(res);
}
