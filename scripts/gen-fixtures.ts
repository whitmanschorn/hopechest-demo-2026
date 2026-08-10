// Generate committed recognition fixtures: `npm run gen:fixtures`.
//
// These JSON files are version-controlled and pin CI determinism — Playwright
// seeds them (never the `generate` branch). When you find a config you like in
// the debug panel, "freeze" it here and re-run. The fixtures are engineered for
// clean separation (see src/lib/recognition/scenario.ts), so CI asserts hard
// equality on cluster counts/sizes/noise.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { along, makeCentroid, makeScenario, unit, type Scenario } from "../src/lib/recognition/scenario";

const OUT_DIR = join(process.cwd(), "fixtures", "recognition");

function write(s: Scenario): void {
  const path = join(OUT_DIR, `${s.name}.json`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(s, null, 2) + "\n");
  console.log(`wrote ${path}  (clusters=${s.expected.clusters} noise=${s.expected.noise} sizes=${s.expected.sizesDesc.join(",")})`);
}

// 3 clean clusters, ordered 12 > 7 > 3
write(makeScenario("basic", [12, 7, 3]));

// one cluster; both probes still valid
write(makeScenario("single", [9]));

// clusters [10, 4]; the size-2 and size-1 groups fall below minPts -> noise
write(makeScenario("with-noise", [10, 4, 2, 1]));

// boundary: two centroids a COMFORTABLE 0.9 apart -> must stay separate.
// (A sub-eps gap would be genuinely noise-dependent; 0.9 makes the assertion stable.)
{
  const a = makeCentroid();
  const b = along(a, unit(), 0.9);
  write(makeScenario("boundary", [6, 6], { centroids: [a, b] }));
}
