@AGENTS.md

## Git workflow

- **Always start from the latest `main`.** Before creating a branch or PR, `git fetch origin` and branch from (or rebase onto) `origin/main`. Resolve drift early while it's small — don't discover it at PR time.

## Local development

- **Node 24 is required** (Prisma 7 + Next 16 reject Node < 20). Use a version manager (`nvm use 24`) before any `npm`/`npx` command. Fresh git worktrees have **no `node_modules`** — run `npm install` first (`postinstall` runs `prisma generate`).
- **This app has no in-memory fallback — it needs a real Postgres for almost everything**, including `next build` (the landing page `/` is prerendered and queries the DB). With no reachable DB, `build` fails at prerender with `ECONNREFUSED` *after* compiling cleanly; `tsc`/`eslint`/`jest` still run fully offline.

### Database

- Local dev needs a Postgres — **any** instance (a native install is simplest; no container required). Create a database, then put its URL in a gitignored `.env.local` as both `POSTGRES_URL_NON_POOLING` (direct — migrate/seed) and `POSTGRES_PRISMA_URL` (pooled in prod, plain locally — runtime client). CI uses per-PR **Neon branches** (see `docs/e2e-ci.md`) — don't add a Postgres service to the workflow.
- Apply + seed: `npm run db:deploy` (migrations) → `npm run db:seed`. The Prisma CLI reads `.env.local` via `prisma.config.ts`.
- The data layer is seam-based: **reads** go through `src/data/db/repos.ts` (hydration memoized per request with React `cache()`), **writes** go through `src/data/db/mutations.ts`, and storage mapping lives in `src/data/db/load.ts`. Pages import from `@/data` and never touch Prisma directly. Keep that boundary.
- Server actions (`"use server"`) own validation + attribution (`requireCurrentPerson()`) + `revalidatePath()`; mirror the existing ones in `app/(app)/people/[personId]/actions.ts` and `app/(app)/photos/[photoId]/actions.ts`.

#### Face recognition subsystem

- Self-contained vector pipeline in `src/lib/recognition/` + `app/api/recognition/**`. Uses **pgvector** — the migration runs `CREATE EXTENSION vector`. Neon has it built in; a **local native Postgres needs the extension installed first** (e.g. `brew install pgvector`) or `db:deploy` fails. Full design + terminology + the eps-calibration harness in **`docs/recognition.md`**.
- Vector reads/writes do NOT go through the `@/data` seam (Prisma's pgvector support is weak; `embedding`/`centroid` are `Unsupported`). They use raw SQL in `src/lib/recognition/db.ts`. A face "identity" is **not** a Hope Chest `Person` — see the doc.

### Tests

- **Unit (Jest):** `npm test`. Pure logic only (date/edit/reaction helpers, kinship) — no DB. Put testable rules in a pure module and unit-test those rather than the Prisma write path.
- **E2E (Playwright):** `npm run test:e2e` — needs a seeded DB up (above). The config's `webServer` builds + `next start`s for you; set `PLAYWRIGHT_BASE_URL` to reuse an already-running server. CI runs the same suite against the PR's Neon branch.
- E2E conventions: sign in via the one-click demo path; seeded demo numbers are `+15550000001`…`5`, and **each signing-in test must use a distinct number** (the dev OTP matches the newest code per phone, so shared numbers race under `fullyParallel`). Select by `data-testid`/role, not styling. After a write (server action + `router.refresh()`), `await page.waitForLoadState("networkidle")` before reloading or acting on the result — a reload mid-action aborts the request, and the optimistic row keeps a temporary `local-` id until the refresh swaps in the persisted one.
