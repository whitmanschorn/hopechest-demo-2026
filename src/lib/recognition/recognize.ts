// Pure recognition decision: given the k nearest labeled neighbors, decide the
// match. Two modes via config (spec §7):
//   - recognizeVote false (default): nearest-within-threshold.
//   - recognizeVote true: majority among the sub-threshold k neighbors — a cheap
//     robustness upgrade against a single mislabeled outlier.
// Confidence is a heuristic linear map (1 - dist/threshold), a placeholder for a
// calibrated map if confidence is ever surfaced in product UI.

import type { NeighborRow } from "./db";
import type { PipelineConfig, RecognizeMatch } from "./types";

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

export function pickMatch(neighbors: NeighborRow[], cfg: PipelineConfig): RecognizeMatch | null {
  const nearest = neighbors[0];
  if (!nearest || nearest.identityId == null || nearest.distance > cfg.recognizeThreshold) {
    return null;
  }

  let identityId = nearest.identityId;
  let name = nearest.name ?? "";
  let distance = nearest.distance;

  if (cfg.recognizeVote) {
    // majority among neighbors within threshold; nearest distance per winner.
    const within = neighbors.filter((n) => n.identityId != null && n.distance <= cfg.recognizeThreshold);
    const tally = new Map<string, { count: number; best: NeighborRow }>();
    for (const n of within) {
      const e = tally.get(n.identityId!);
      if (!e) tally.set(n.identityId!, { count: 1, best: n });
      else {
        e.count++;
        if (n.distance < e.best.distance) e.best = n;
      }
    }
    let winner: { id: string; count: number; best: NeighborRow } | null = null;
    for (const [id, e] of tally) {
      if (
        !winner ||
        e.count > winner.count ||
        (e.count === winner.count && e.best.distance < winner.best.distance)
      ) {
        winner = { id, count: e.count, best: e.best };
      }
    }
    if (!winner) return null;
    identityId = winner.id;
    name = winner.best.name ?? "";
    distance = winner.best.distance;
  }

  const confidence = clamp01(1 - distance / cfg.recognizeThreshold);
  return { identityId, name, distance, confidence };
}
