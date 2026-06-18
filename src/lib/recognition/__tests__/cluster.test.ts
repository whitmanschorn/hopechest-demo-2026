import { readFileSync } from "node:fs";
import { join } from "node:path";

import { rebuild, type ClusterFace } from "../cluster";
import type { Scenario } from "../scenario";
import { cfg, DEFAULT_CONFIG } from "../types";

function loadFixture(name: string): Scenario {
  const path = join(process.cwd(), "fixtures", "recognition", `${name}.json`);
  return JSON.parse(readFileSync(path, "utf8")) as Scenario;
}

function facesOf(s: Scenario): ClusterFace[] {
  return s.faces.map((f, i) => ({ id: `f${String(i).padStart(4, "0")}`, embedding: f.embedding }));
}

describe("rebuild against committed fixtures", () => {
  test.each(["basic", "single", "with-noise", "boundary"])(
    "%s recovers its engineered ground truth",
    (name) => {
      const s = loadFixture(name);
      const res = rebuild(facesOf(s), DEFAULT_CONFIG);
      expect(res.clusters.length).toBe(s.expected.clusters);
      expect(res.noise.length).toBe(s.expected.noise);
      expect(res.clusters.map((c) => c.size)).toEqual(s.expected.sizesDesc);
    },
  );

  test("boundary stays two clusters (no chaining merge)", () => {
    const s = loadFixture("boundary");
    const res = rebuild(facesOf(s), DEFAULT_CONFIG);
    expect(res.clusters.length).toBe(2);
  });

  test("deterministic: identical input -> identical output", () => {
    const faces = facesOf(loadFixture("basic"));
    const a = rebuild(faces, DEFAULT_CONFIG);
    const b = rebuild(faces, DEFAULT_CONFIG);
    expect(b).toEqual(a);
  });

  test("each cluster's representative is one of its members", () => {
    const s = loadFixture("basic");
    const res = rebuild(facesOf(s), DEFAULT_CONFIG);
    for (const c of res.clusters) {
      expect(c.memberIds).toContain(c.representativeFaceId);
    }
  });
});

describe("chaining guard: a single border point never bridges two cores", () => {
  // 1-D embeddings. Two tight blobs; M sits between, within eps of exactly one
  // core from each blob -> non-core (minPts 4), so it cannot union the blobs.
  // Single-linkage would merge into one cluster; DBSCAN-via-DSU keeps two.
  const blobA = [0, 0.05, 0.1, 0.15];
  const blobB = [1.0, 1.05, 1.1, 1.15];
  const bridge = 0.575;
  const faces: ClusterFace[] = [...blobA, ...blobB, bridge].map((x, i) => ({
    id: `f${i}`,
    embedding: [x],
  }));

  test("two clusters, no merge", () => {
    const res = rebuild(faces, cfg({ eps: 0.45, minPts: 4 }));
    expect(res.clusters.length).toBe(2);
  });
});

describe("minPts noise behavior", () => {
  test("groups smaller than minPts become noise", () => {
    // sizes [4, 2]: the 2-group falls below minPts 3 -> noise.
    const faces: ClusterFace[] = [
      ...[0, 0.02, 0.04, 0.06].map((x, i) => ({ id: `a${i}`, embedding: [x] })),
      ...[5.0, 5.02].map((x, i) => ({ id: `b${i}`, embedding: [x] })),
    ];
    const res = rebuild(faces, DEFAULT_CONFIG);
    expect(res.clusters.length).toBe(1);
    expect(res.clusters[0].size).toBe(4);
    expect(res.noise.length).toBe(2);
  });
});
