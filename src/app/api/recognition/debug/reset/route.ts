import { NextResponse } from "next/server";

import { resetAll } from "@/lib/recognition/db";
import { debugEnabled } from "@/lib/recognition/guard";

export const runtime = "nodejs";

// Gated: TRUNCATEs all recognition tables. Disabled -> 404 (invisible in prod).
export async function POST(): Promise<NextResponse> {
  if (!debugEnabled()) return new NextResponse("Not found", { status: 404 });
  await resetAll();
  return NextResponse.json({ ok: true });
}
