# Face recognition pipeline

Browser-side face detection + embedding; **server-side cheap vector math only**.
All neural-net work (`@vladmandic/face-api`, 128-d descriptors) happens in the
browser. Once a face is a 128-float vector the server only clusters, asks
"who is this?", propagates labels, and recognizes — no ML, no GPU, no model
downloads.

## The core principle: the embedding is the seam

The expensive per-face work happens once, browser-side. Everything server-side is
cheap vector math on the resulting 128-float vector. Two consequences:

1. The "asking" device never loads the album — it loads cluster thumbnails.
2. **CI mocks above the seam.** Playwright never runs TensorFlow.js. It POSTs
   synthetic 128-d vectors with known ground truth and asserts deterministic
   facts about clustering, asking order, propagation, and recognition.

## Terminology — a face "person" is NOT a Hope Chest `Person`

The recognition subsystem is self-contained and uses deliberately different words
so it never gets confused with the real family graph (`people`):

| Term            | Meaning |
|-----------------|---------|
| **face**        | one detected face + its 128-d embedding (`faces`) |
| **face cluster**| *ephemeral, system-proposed* grouping — "we think these are the same person." Truncated + regenerated every rebuild (`face_clusters`) |
| **face identity** | *durable, human-confirmed* identity — "we decided this shared face is someone." Survives rebuilds (`face_identities`) |
| **face photo**  | the source image a face came from (`face_photos`) |

### Durability rule (the most important design rule)

- `faces.identity_id` is **durable truth**. Once set (by labeling or confident
  recognition) it persists across rebuilds.
- `faces.cluster_id` is **ephemeral scratch** from the last rebuild — meaningful
  only for unlabeled faces. `face_clusters` is truncated and regenerated each
  rebuild (hence `cluster_id` carries no FK).
- `rebuild` only clusters faces where `identity_id IS NULL`. Labeled faces have
  left the pool; relabeling never undoes prior work. This keeps the asking
  workflow stable as new photos arrive.

## Bridge to Hope Chest + back-propagation

Two nullable bridge columns wire the self-contained subsystem to the real app
for future integration:

- `face_identities.app_person_id → people.id`
- `face_photos.app_photo_id → photos.id`

**Back-propagation**: Hope Chest's manual photo tags (`photo_people`) are
high-confidence ground truth. `src/lib/recognition/backprop.ts#applyManualTag`
turns a manual tag into a durable `faces.identity_id` (resolving/creating an
identity bridged to that `Person`), which both removes the face from future
rebuild pools and makes it a labeled neighbor for `/recognize`.

> Status: the schema hooks + `applyManualTag` (and its unit-tested box matcher)
> ship now. The live trigger that calls it from the tagging UI is a **fast-follow**
> — it depends on that UI's final shape.

## Layout

```
src/lib/recognition/
  types.ts      PipelineConfig + DEFAULT_CONFIG + cfg() merge + DTOs (DIM=128)
  distance.ts   l2 / cosine / normalize / mean      (pure)
  dsu.ts        union-find                            (pure)
  cluster.ts    DBSCAN-via-DSU rebuild()             (pure)
  recognize.ts  pickMatch() threshold/vote/confidence (pure)
  scenario.ts   makeScenario() synthetic generator   (pure, shared w/ fixtures + panel)
  box.ts        bbox iou / bestFaceForBox            (pure)
  backprop.ts   applyManualTag() back-prop seam      (DB)
  db.ts         raw-SQL vector seam ($queryRawUnsafe) (DB)
  guard.ts      debugEnabled() env gate
src/app/api/recognition/**/route.ts   ingest, rebuild, questions, label, recognize, debug/*
src/app/debug/recognition/            test surface (gated)
scripts/gen-fixtures.ts               -> fixtures/recognition/*.json  (committed)
scripts/calibrate-eps.ts              real-descriptor calibration harness
```

The family graph still goes through `@/data`. Recognition's vector reads/writes
can't (Prisma's pgvector support is weak; `embedding`/`centroid` are
`Unsupported` and excluded from the client), so they use `$queryRawUnsafe` /
`$executeRawUnsafe` in `db.ts`. Vectors are bound as their text form and cast
`::vector` — never string-concatenated. **Vectors are stored raw (not
L2-normalized)** so the dlib/face-api 0.6 threshold stays valid.

## Endpoints

All under `/api/recognition/`, Node runtime, none run ML. The tunable stages
(`rebuild`, `recognize`, the sweep in `label`) merge `config?: Partial<PipelineConfig>`
over `DEFAULT_CONFIG` via `cfg()`.

| Route | What |
|-------|------|
| `POST ingest` | validate every `embedding.length === 128`, bulk insert |
| `POST rebuild` | load unlabeled vectors → cluster in JS → write clusters + cluster_id in one txn |
| `GET questions` | clusters ordered `size DESC, id ASC` (biggest person first) |
| `POST label` | set durable `identity_id`; optional proximity sweep (suggest vs auto-assign) |
| `POST recognize` | kNN vs labeled partial index, threshold + optional vote |
| `POST debug/seed-scenario` | **gated**; seed a fixture or `{generate}` |
| `POST debug/reset` | **gated**; TRUNCATE all recognition tables |

Debug endpoints are gated by `debugEnabled()` (`ENABLE_DEBUG_ENDPOINTS === "true"`
**and** `VERCEL_ENV !== "production"`) and return **404** (not 403) when disabled,
so the surface is invisible in prod.

## Tiers: what's live vs what needs a migration

- **Tier 1 — live sliders (no migration):** `eps`, `minPts`, `metric`,
  `normalizeForClustering` (clustering reads vectors into memory, so distance is
  just JS), plus `recognizeK / recognizeThreshold / recognizeVote`, plus every
  generator param. These flow through `PipelineConfig` / `GenParams` per request.
- **Tier 2 — structural:** the embedding **dimension** (`vector(128)` + both HNSW
  indexes), and the recognize-path **metric** (HNSW opclass is fixed at index
  creation; L2 only unless a second cosine index is built). Swapping the face-api
  model is fine as long as it stays 128-d — then re-tune the Tier-1 `eps` slider.

## Local development

Needs Postgres **with pgvector**:

- **Neon** (CI uses per-PR branches) has pgvector built in — nothing to install.
- **Local native Postgres** needs the extension installed first, e.g.
  `brew install pgvector` (or your platform's package), then the migration's
  `CREATE EXTENSION IF NOT EXISTS vector;` succeeds.

```bash
nvm use 24 && npm install
npm run db:deploy && npm run db:seed     # applies prisma/migrations/*_add_recognition
npm test                                 # pure recognition unit suites (offline)
npm run gen:fixtures                     # regenerate fixtures/recognition/*.json
ENABLE_DEBUG_ENDPOINTS=true npm run dev   # then open /debug/recognition
npm run test:e2e                         # recognition.spec.ts (needs seeded DB + flag)
```

## Test data: synthetic fixtures vs real-face calibration

Two **different** questions, two different tools — don't conflate them:

1. **Is the algorithm correct?** → the committed synthetic fixtures
   (`fixtures/recognition/*.json`). Gaussian blobs engineered for clean
   separation (σ=0.022 → intra ≈ 0.35; κ=0.10 → inter ≈ 1.6; both comfortably
   off eps 0.6). Deterministic, ML-free, fast — perfect for CI. They prove the
   DBSCAN-via-DSU plumbing, asking order, propagation, and recognition logic.
   They **do not** prove the eps constant is right for real faces.

2. **Is `eps = 0.6` calibrated to reality?** → `npm run calibrate:eps`. 0.6 is
   the documented dlib/face-api default for 128-d `faceRecognitionNet`, but Hope
   Chest's photos are old/scanned/restored and real distances may smear across
   the threshold. The committed `fixtures/recognition/seed-descriptors.json` is a
   real-face sample to check against:

   ```json
   { "samples": [ { "identity": "abraham-lincoln", "embedding": [/* 128 floats */] } ] }
   ```

   - `wikimedia-pd`: public-domain identities (pre-1929 portraits) with several
     genuine photos each → real **intra-person** pairs.
   - `hopechest-seed`: distinct faces detected in the app's own public-domain
     seed photos → **inter-person** breadth, in the actual old/scanned-photo domain.

   **Descriptors only — no images are committed** (they're derived 128-float
   vectors, not reconstructable to a face, so no image licensing/privacy travels
   into the repo). Regenerate with `scripts/gen-seed-descriptors.cjs` (pure-WASM
   face-api; deps installed `--no-save`, see its header). Then
   `npm run calibrate:eps -- fixtures/recognition/seed-descriptors.json`.

   **What it found (this is the point):** on this hard historical-photo sample
   the distributions **smear across 0.6** — intra-person median 0.44 but a tail
   to ~0.70 (3/24 same-person pairs split), and inter-person dipping to 0.23 with
   p5 ≈ 0.55 (181/1806 different-person pairs merge). There is no clean threshold;
   the min-error operating point still leaves ~28 errors. The synthetic σ=0.022
   (intra ≈ 0.35) was far too optimistic for scanned archives.

   Caveats (honest): the PD figures are a near-worst case — same era, B&W,
   similar demographics, formal poses, low-res scans — which compresses
   inter-person separation; the intra sample is small (24 pairs / 6 identities);
   and low-confidence detections add noise. A production deployment on the real
   (likely color, modern + scanned) family mix should **re-calibrate**, probably
   quality-gate low-confidence faces, and pick its own eps. The takeaway isn't a
   magic number — it's that **0.6 cannot be assumed on this domain**, which is
   exactly why eps is a live slider and this harness exists.

   This calibration is intentionally **offline, not in CI** (the core principle
   keeps CI above the seam: no images, no GPU, no model download). The debug page
   surfaces the committed fixture's calibration readout at `/debug/recognition`.
```
