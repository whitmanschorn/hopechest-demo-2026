import type { NeighborRow } from "../db";
import { pickMatch } from "../recognize";
import { cfg } from "../types";

const n = (id: string, dist: number, name = id): NeighborRow => ({
  faceId: `face-${id}`,
  identityId: id,
  name,
  distance: dist,
});

describe("pickMatch", () => {
  test("nearest within threshold matches", () => {
    const m = pickMatch([n("alice", 0.3), n("bob", 0.9)], cfg());
    expect(m?.identityId).toBe("alice");
    expect(m?.confidence).toBeCloseTo(1 - 0.3 / 0.6);
  });

  test("nearest beyond threshold -> null", () => {
    expect(pickMatch([n("alice", 0.75)], cfg())).toBeNull();
  });

  test("empty / unlabeled nearest -> null", () => {
    expect(pickMatch([], cfg())).toBeNull();
    expect(pickMatch([{ faceId: "x", identityId: null, name: null, distance: 0.1 }], cfg())).toBeNull();
  });

  test("vote: majority overrides a single closer outlier", () => {
    // nearest is a lone 'bob'; 'alice' has the majority within threshold.
    const neighbors = [n("bob", 0.20), n("alice", 0.25), n("alice", 0.30)];
    const nearest = pickMatch(neighbors, cfg({ recognizeVote: false }));
    expect(nearest?.identityId).toBe("bob");
    const voted = pickMatch(neighbors, cfg({ recognizeVote: true, recognizeK: 3 }));
    expect(voted?.identityId).toBe("alice");
  });

  test("confidence clamps to [0,1]", () => {
    const m = pickMatch([n("alice", 0.0)], cfg());
    expect(m?.confidence).toBe(1);
  });
});
