import { readFileSync } from "node:fs";
import { join, normalize } from "node:path";

// Serves the committed Ocean's Eleven demo photos (fixtures/oceans11/<actor>/
// <file>) to the recognition showcase. Same process.cwd()+fs pattern the debug
// page already uses to read fixtures, so it works in the Vercel bundle. The
// whole site is behind Vercel Auth; these are public demo stills anyway.

export const runtime = "nodejs"; // need fs

const ROOT = join(process.cwd(), "fixtures", "oceans11");

const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ actor: string; file: string }> },
) {
  const { actor, file } = await params;

  // Path-traversal guard: single path segments only, and the resolved path
  // must stay under ROOT.
  if (/[/\\]/.test(actor) || /[/\\]/.test(file) || actor.includes("..") || file.includes("..")) {
    return new Response("bad request", { status: 400 });
  }
  const path = normalize(join(ROOT, actor, file));
  if (!path.startsWith(ROOT)) return new Response("forbidden", { status: 403 });

  const ext = file.split(".").pop()?.toLowerCase() ?? "";
  const type = MIME[ext] ?? "application/octet-stream";

  try {
    const buf = readFileSync(path);
    return new Response(buf, {
      headers: {
        "content-type": type,
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("not found", { status: 404 });
  }
}
