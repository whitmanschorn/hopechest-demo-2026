import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { notFound } from "next/navigation";

import { calibrate, type CalibrationReport, type CalibrationSample } from "@/lib/recognition/calibration";
import { debugEnabled } from "@/lib/recognition/guard";
import { DEFAULT_CONFIG } from "@/lib/recognition/types";
import type { Scenario } from "@/lib/recognition/scenario";

import { RecognitionPanel } from "./RecognitionPanel";
import type { OceansSample } from "./OceansShowcase";

// Test surface for the recognition pipeline — the same endpoints Playwright
// drives. Reachable now that the whole deployment sits behind Vercel Auth
// (see debugEnabled); notFound() stays as a kill switch if that ever changes.
export const dynamic = "force-dynamic";

function loadFixtures(): Scenario[] {
  const dir = join(process.cwd(), "fixtures", "recognition");
  try {
    return readdirSync(dir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => {
        try {
          return JSON.parse(readFileSync(join(dir, f), "utf8")) as Scenario;
        } catch {
          return null;
        }
      })
      // Keep only scenario-shaped files; the descriptor references in this dir
      // (seed-descriptors.json, oceans11-descriptors.json) are not scenarios.
      .filter((s): s is Scenario => !!s && typeof s.name === "string" && Array.isArray(s.faces))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

// Calibrate the committed real-face descriptors (if present) at the default eps.
function loadCalibration(): CalibrationReport | null {
  const path = join(process.cwd(), "fixtures", "recognition", "seed-descriptors.json");
  try {
    const { samples } = JSON.parse(readFileSync(path, "utf8")) as { samples: CalibrationSample[] };
    if (!samples?.length) return null;
    return calibrate(samples, DEFAULT_CONFIG.eps);
  } catch {
    return null;
  }
}

// The Ocean's Eleven crew descriptors, for the live-clustering showcase. The
// clusterer reruns in the browser, so we just ship the raw vectors + the file
// each came from (images are served by /api/oceans11/<identity>/<file>).
function loadOceans(): OceansSample[] {
  const path = join(process.cwd(), "fixtures", "recognition", "oceans11-descriptors.json");
  try {
    const { samples } = JSON.parse(readFileSync(path, "utf8")) as {
      samples: { identity: string; file: string; embedding: number[] }[];
    };
    return (samples ?? []).map((s) => ({
      id: `${s.identity}/${s.file}`,
      identity: s.identity,
      file: s.file,
      embedding: s.embedding,
    }));
  } catch {
    return [];
  }
}

export default function RecognitionDebugPage() {
  if (!debugEnabled()) notFound();
  return (
    <RecognitionPanel
      fixtures={loadFixtures()}
      calibration={loadCalibration()}
      oceans={loadOceans()}
    />
  );
}
