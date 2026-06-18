import { readFileSync } from "node:fs";
import { join } from "node:path";

import { expect, test, type APIRequestContext } from "@playwright/test";

// Recognition pipeline E2E. No browser ML: we POST synthetic 128-d vectors with
// known ground truth and assert deterministic facts about clustering, asking
// order, propagation, and recognition.
//
// These tests reset + seed GLOBAL recognition tables, so they must NOT run in
// parallel with each other (the suite as a whole is fullyParallel). Serial mode
// keeps them from clobbering each other's seed.
//
// CI pins config explicitly rather than relying on DEFAULT_CONFIG, so a future
// panel-default tweak can't silently break the suite.

test.describe.configure({ mode: "serial" });

const PINNED = { eps: 0.6, minPts: 3, metric: "l2" as const };
const API = "/api/recognition";

interface Scenario {
  name: string;
  faces: { embedding: number[]; truthPerson: number }[];
  probes: { embedding: number[]; expectPerson: number | null; note: string }[];
  expected: { clusters: number; noise: number; sizesDesc: number[] };
}

function fixture(name: string): Scenario {
  const path = join(process.cwd(), "fixtures", "recognition", `${name}.json`);
  return JSON.parse(readFileSync(path, "utf8")) as Scenario;
}

async function seed(request: APIRequestContext, name: string): Promise<Scenario> {
  const scenario = fixture(name);
  const reset = await request.post(`${API}/debug/reset`);
  expect(reset.ok(), "debug endpoints must be enabled (ENABLE_DEBUG_ENDPOINTS=true)").toBeTruthy();
  const res = await request.post(`${API}/debug/seed-scenario`, { data: { scenario } });
  expect(res.ok()).toBeTruthy();
  return scenario;
}

async function rebuild(request: APIRequestContext) {
  const res = await request.post(`${API}/rebuild`, { data: { config: PINNED } });
  expect(res.ok()).toBeTruthy();
  return res.json();
}

async function questions(request: APIRequestContext) {
  const res = await request.get(`${API}/questions`);
  expect(res.ok()).toBeTruthy();
  return (await res.json()).questions as { clusterId: string; size: number }[];
}

test("rebuild count — basic yields 3 clusters, 0 noise", async ({ request }) => {
  await seed(request, "basic");
  const r = await rebuild(request);
  expect(r.clusters).toBe(3);
  expect(r.noise).toBe(0);
});

test("asking order — biggest cluster first [12,7,3]", async ({ request }) => {
  await seed(request, "basic");
  await rebuild(request);
  const q = await questions(request);
  expect(q.map((c) => c.size)).toEqual([12, 7, 3]);
});

test("propagation — labeling the size-12 cluster removes it and recognizes its probe", async ({
  request,
}) => {
  const scenario = await seed(request, "basic");
  await rebuild(request);
  const q = await questions(request);
  const top = q[0];
  expect(top.size).toBe(12);

  const labelRes = await request.post(`${API}/label`, {
    data: { clusterId: top.clusterId, newName: "Alice", config: PINNED },
  });
  expect(labelRes.ok()).toBeTruthy();
  const label = await labelRes.json();
  expect(label.facesLabeled).toBe(12);

  // labeled faces leave the asking queue
  const remaining = await questions(request);
  expect(remaining.find((c) => c.clusterId === top.clusterId)).toBeUndefined();

  // the accept probe now recognizes Alice
  const rec = await request.post(`${API}/recognize`, {
    data: { embedding: scenario.probes[0].embedding, config: PINNED },
  });
  const body = await rec.json();
  expect(body.match).not.toBeNull();
  expect(body.match.identityId).toBe(label.identityId);
  expect(body.match.name).toBe("Alice");
});

test("recognize accept — the ~0.45 probe matches a labeled person", async ({ request }) => {
  const scenario = await seed(request, "basic");
  await rebuild(request);
  const q = await questions(request);
  await request.post(`${API}/label`, {
    data: { clusterId: q[0].clusterId, newName: "Alice", config: PINNED },
  });
  const rec = await request.post(`${API}/recognize`, {
    data: { embedding: scenario.probes[0].embedding, config: PINNED },
  });
  const body = await rec.json();
  expect(body.match?.name).toBe("Alice");
});

test("recognize reject — the ~0.75 probe is unknown", async ({ request }) => {
  const scenario = await seed(request, "basic");
  await rebuild(request);
  const q = await questions(request);
  await request.post(`${API}/label`, {
    data: { clusterId: q[0].clusterId, newName: "Alice", config: PINNED },
  });
  const rec = await request.post(`${API}/recognize`, {
    data: { embedding: scenario.probes[1].embedding, config: PINNED },
  });
  const body = await rec.json();
  expect(body.match).toBeNull();
});

test("noise — with-noise yields 2 clusters, 3 noise", async ({ request }) => {
  await seed(request, "with-noise");
  const r = await rebuild(request);
  expect(r.clusters).toBe(2);
  expect(r.noise).toBe(3);
});

test("boundary — two centroids 0.9 apart stay separate (no merge)", async ({ request }) => {
  await seed(request, "boundary");
  const r = await rebuild(request);
  expect(r.clusters).toBe(2);
});
