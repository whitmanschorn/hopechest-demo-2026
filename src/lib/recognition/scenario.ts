// Synthetic fixture generator. Backs two paths from one function:
//   - committed fixtures (reproducible, version-controlled, for CI) via
//     scripts/gen-fixtures.ts
//   - the debug panel's live generation (drag a sigma slider, re-seed) via
//     POST /api/recognition/debug/seed-scenario { generate }
//
// The math (d=128): for x = c + e1, y = c + e2 with e ~ N(0, sigma^2 I),
// expected intra-person pair distance ~ sigma*sqrt(2d) = 16*sigma, and
// sample-to-centroid ~ sigma*sqrt(d) = 11.3*sigma. Centroids with per-component
// std kappa sit ~ kappa*sqrt(2d) = 16*kappa apart.
//   sigma 0.022 -> intra pairs ~0.35 (well under eps 0.6)
//   kappa 0.10  -> inter-person ~1.6 (well over eps)
// Comfortable separation both ways — the clusterer recovers ground truth exactly.

import { DIM } from "./types";

const DEFAULT_MIN_PTS = 3;

// Box-Muller standard normal.
function randn(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const vec = (f: () => number, dim = DIM) => Array.from({ length: dim }, f);
const add = (a: number[], b: number[]) => a.map((x, i) => x + b[i]);
const scale = (a: number[], s: number) => a.map((x) => x * s);

/** A random unit-length direction (shared by probes; exported for fixtures). */
export function unit(dim = DIM): number[] {
  const v = vec(randn, dim);
  const n = Math.hypot(...v);
  return v.map((x) => x / n);
}

/** A random per-person centroid with per-component std `centroidStd`. */
export const makeCentroid = (centroidStd = 0.1, dim = DIM) => vec(() => randn() * centroidStd, dim);

/** v + s*direction — small helper for placing centroids a known gap apart. */
export const along = (c: number[], dir: number[], s: number) => c.map((x, i) => x + dir[i] * s);
const makeFace = (c: number[], noiseStd: number) => add(c, c.map(() => randn() * noiseStd));

export interface Scenario {
  name: string;
  faces: { embedding: number[]; truthPerson: number }[];
  probes: { embedding: number[]; expectPerson: number | null; note: string }[];
  expected: { clusters: number; noise: number; sizesDesc: number[] };
}

// The debug panel's knobs. All optional except personSizes.
export interface GenParams {
  name?: string;
  dim?: number;
  noiseStd?: number; // sigma
  centroidStd?: number; // kappa
  minPts?: number;
  personSizes: number[];
  probeAccept?: number;
  probeReject?: number;
  centroids?: number[][];
}

export function makeScenario(name: string, personSizes: number[], opts?: Omit<GenParams, "name" | "personSizes">): Scenario {
  const dim = opts?.dim ?? DIM;
  const noiseStd = opts?.noiseStd ?? 0.022;
  const centroidStd = opts?.centroidStd ?? 0.1;
  const minPts = opts?.minPts ?? DEFAULT_MIN_PTS;

  const centroids = opts?.centroids ?? personSizes.map(() => makeCentroid(centroidStd, dim));

  const faces: Scenario["faces"] = [];
  centroids.forEach((c, p) => {
    for (let i = 0; i < personSizes[p]; i++) {
      faces.push({ embedding: makeFace(c, noiseStd), truthPerson: p });
    }
  });

  const u = unit(dim); // shared direction so probe distances are exact
  const acc = opts?.probeAccept ?? 0.45;
  const rej = opts?.probeReject ?? 0.75;
  const probes: Scenario["probes"] = [
    { embedding: add(centroids[0], scale(u, acc)), expectPerson: 0, note: `~${acc} from person 0 -> match` },
    { embedding: add(centroids[0], scale(u, rej)), expectPerson: null, note: `~${rej} out -> unknown` },
  ];

  // a person needs >= minPts faces to survive as a cluster; smaller groups -> noise
  const big = personSizes.filter((s) => s >= minPts);
  const expected = {
    clusters: big.length,
    noise: personSizes.filter((s) => s < minPts).reduce((a, s) => a + s, 0),
    sizesDesc: [...big].sort((a, b) => b - a),
  };

  return { name, faces, probes, expected };
}

/** Build a Scenario from the panel's GenParams shape. */
export function scenarioFromParams(params: GenParams): Scenario {
  const { name = "generated", personSizes, ...opts } = params;
  return makeScenario(name, personSizes, opts);
}
