import { NextResponse } from "next/server";

import {
  assignIdentity,
  labelClusterFaces,
  resolveOrCreateIdentity,
  sweepNearCentroid,
} from "@/lib/recognition/db";
import { cfg } from "@/lib/recognition/types";
import type { LabelRequest, LabelResponse } from "@/lib/recognition/types";

export const runtime = "nodejs";

// Label propagation. Writes durable identity_id onto the cluster's faces, which
// removes them from all future rebuild pools. Optional sweep is the "is this
// also Grandma?" step — conservative by default (suggest, don't auto-assign).
export async function POST(req: Request): Promise<NextResponse> {
  let body: LabelRequest;
  try {
    body = (await req.json()) as LabelRequest;
  } catch {
    return NextResponse.json({ ok: false, errors: ["invalid JSON body"] }, { status: 400 });
  }

  if (!body?.clusterId) {
    return NextResponse.json({ ok: false, errors: ["clusterId is required"] }, { status: 400 });
  }
  if (!body.identityId && !body.newName) {
    return NextResponse.json(
      { ok: false, errors: ["provide identityId or newName"] },
      { status: 400 },
    );
  }

  const config = cfg(body.config);

  const identityId = await resolveOrCreateIdentity({
    identityId: body.identityId,
    newName: body.newName,
    appPersonId: body.appPersonId,
  });

  const facesLabeled = await labelClusterFaces(body.clusterId, identityId);

  let sweptIn = 0;
  let suggestions: string[] = [];
  if (body.sweep) {
    const near = await sweepNearCentroid(body.clusterId, config);
    if (body.autoAssign) {
      sweptIn = await assignIdentity(near, identityId);
    } else {
      suggestions = near;
    }
  }

  const res: LabelResponse = { identityId, facesLabeled, sweptIn, suggestions };
  return NextResponse.json(res);
}
