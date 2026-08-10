// Pure eps-calibration math over real labeled descriptors. Shared by the CLI
// harness (scripts/calibrate-eps.ts) and the debug page. No DB, no ML.
//
// The question it answers: do same-person ("intra") distances sit below eps and
// different-person ("inter") distances sit above it? If intra p95 < eps < inter
// p5 the threshold separates cleanly; otherwise the distributions overlap (the
// "smear" the eps slider exists to fix).

import { l2 } from "./distance";
import type { Embedding } from "./types";

export interface CalibrationSample {
  identity: string;
  embedding: Embedding;
}

export interface CalibrationReport {
  nSamples: number;
  nIdentities: number;
  nMultiShot: number; // identities with >1 photo (the ones contributing intra pairs)
  eps: number;
  intra: { count: number; median: number; p90: number; p95: number; max: number; overEps: number };
  inter: { count: number; min: number; p1: number; p5: number; median: number; underEps: number };
  minError: { eps: number; falseSplits: number; falseMerges: number };
  clean: boolean; // intra p95 < eps < inter p5
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return NaN;
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

export function calibrate(samples: CalibrationSample[], eps: number): CalibrationReport {
  const intra: number[] = [];
  const inter: number[] = [];
  for (let i = 0; i < samples.length; i++) {
    for (let j = i + 1; j < samples.length; j++) {
      const d = l2(samples[i].embedding, samples[j].embedding);
      (samples[i].identity === samples[j].identity ? intra : inter).push(d);
    }
  }
  intra.sort((a, b) => a - b);
  inter.sort((a, b) => a - b);

  // operating point that minimizes false splits + false merges on this sample
  let best = { eps, err: Infinity, fs: 0, fm: 0 };
  for (let e = 0.4; e <= 0.85 + 1e-9; e += 0.01) {
    const fs = intra.filter((d) => d > e).length;
    const fm = inter.filter((d) => d <= e).length;
    if (fs + fm < best.err) best = { eps: Math.round(e * 100) / 100, err: fs + fm, fs, fm };
  }

  const counts = new Map<string, number>();
  for (const s of samples) counts.set(s.identity, (counts.get(s.identity) ?? 0) + 1);

  const intraP95 = percentile(intra, 95);
  const interP5 = percentile(inter, 5);

  return {
    nSamples: samples.length,
    nIdentities: counts.size,
    nMultiShot: [...counts.values()].filter((c) => c > 1).length,
    eps,
    intra: {
      count: intra.length,
      median: percentile(intra, 50),
      p90: percentile(intra, 90),
      p95: intraP95,
      max: intra.length ? intra[intra.length - 1] : NaN,
      overEps: intra.filter((d) => d > eps).length,
    },
    inter: {
      count: inter.length,
      min: inter.length ? inter[0] : NaN,
      p1: percentile(inter, 1),
      p5: interP5,
      median: percentile(inter, 50),
      underEps: inter.filter((d) => d <= eps).length,
    },
    minError: { eps: best.eps, falseSplits: best.fs, falseMerges: best.fm },
    clean: intraP95 < eps && eps < interP5,
  };
}
