import { defineConfig, devices } from "@playwright/test";

/**
 * E2E config. The app needs a seeded Postgres (Neon branch in CI, a local
 * Postgres in dev) — see .github/workflows/e2e.yml and docs/e2e-ci.md.
 *
 * `PORT` lets CI/dev pin the server port; `PLAYWRIGHT_BASE_URL` overrides the
 * base entirely (e.g. to point at an already-running server). Locally the
 * webServer builds+starts the app for you; in CI we build/migrate/seed as
 * explicit steps and let webServer just `next start`.
 */
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run start -- -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // The recognition E2E drives /api/recognition/debug/* (reset + seed). Those
    // are gated; enable them for the test server. Harmless for the rest of the
    // suite. (VERCEL_ENV is unset locally/CI, so the prod guard still holds.)
    env: { ENABLE_DEBUG_ENDPOINTS: "true" },
  },
});
