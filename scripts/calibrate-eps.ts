// Calibrate eps against REAL descriptors: `npm run calibrate:eps <descriptors.json>`
//
// Why this exists (and is separate from CI): the committed synthetic fixtures are
// Gaussian blobs engineered for clean separation. They prove the *clustering
// algorithm* is correct and deterministic — they do NOT prove the eps=0.6
// *constant* is right for real face-api descriptors on Hope Chest's actual photos
// (old, scanned, restored — distances may smear across 0.6).
//
// This harness consumes real 128-d descriptors with ground-truth identity labels
// and reports intra-person vs inter-person distance distributions, the operating
// point that minimizes error, and whether the default eps separates cleanly. It
// is ML-free: producing the descriptors is the browser/face-api step (run face-api
// over multi-photo-per-identity faces). Input shape:
//
//   { "samples": [ { "identity": "abraham-lincoln", "embedding": [128 floats] }, ... ] }
//
// fixtures/recognition/seed-descriptors.json is one such file (see docs/recognition.md).

import { readFileSync } from "node:fs";

import { calibrate, type CalibrationSample } from "../src/lib/recognition/calibration";
import { rebuild, type ClusterFace } from "../src/lib/recognition/cluster";
import { DEFAULT_CONFIG, DIM } from "../src/lib/recognition/types";

function main() {
  const path = process.argv[2];
  if (!path) {
    console.error("usage: npm run calibrate:eps -- <descriptors.json>");
    process.exit(1);
  }
  const { samples } = JSON.parse(readFileSync(path, "utf8")) as { samples: CalibrationSample[] };
  const bad = samples.find((s) => s.embedding.length !== DIM);
  if (bad) throw new Error(`embedding for ${bad.identity} is not length ${DIM}`);

  const eps = DEFAULT_CONFIG.eps;
  const r = calibrate(samples, eps);

  console.log(`samples: ${r.nSamples} | identities: ${r.nIdentities} (${r.nMultiShot} with >1 photo -> intra pairs)`);
  console.log(`\nintra-person L2  (want well UNDER eps ${eps}) — ${r.intra.count} pairs`);
  console.log(`  median ${r.intra.median.toFixed(3)}  p90 ${r.intra.p90.toFixed(3)}  p95 ${r.intra.p95.toFixed(3)}  max ${r.intra.max.toFixed(3)}`);
  console.log(`  ${r.intra.overEps}/${r.intra.count} same-person pairs are OVER eps (false splits)`);
  console.log(`\ninter-person L2  (want well OVER eps ${eps}) — ${r.inter.count} pairs`);
  console.log(`  min ${r.inter.min.toFixed(3)}  p1 ${r.inter.p1.toFixed(3)}  p5 ${r.inter.p5.toFixed(3)}  median ${r.inter.median.toFixed(3)}`);
  console.log(`  ${r.inter.underEps}/${r.inter.count} different-person pairs are UNDER eps (false merges)`);

  const faces: ClusterFace[] = samples.map((s, i) => ({ id: `f${i}`, embedding: s.embedding }));
  const res = rebuild(faces, DEFAULT_CONFIG);
  console.log(`\nclusterer @ eps ${eps}, minPts ${DEFAULT_CONFIG.minPts}: ${res.clusters.length} clusters, ${res.noise.length} noise`);
  console.log(`min-error eps on this sample: ${r.minError.eps} (false-splits ${r.minError.falseSplits} + false-merges ${r.minError.falseMerges})`);

  console.log(
    r.clean
      ? `\nCLEAN: intra p95 ${r.intra.p95.toFixed(3)} < eps ${eps} < inter p5 ${r.inter.p5.toFixed(3)} — the default holds.`
      : `\nSMEAR: intra p95 ${r.intra.p95.toFixed(3)} and inter p5 ${r.inter.p5.toFixed(3)} straddle eps ${eps} — the distributions overlap. ` +
          `Tune eps in the debug panel, quality-gate low-confidence faces, and re-calibrate on your real photo mix.`,
  );
}

main();
