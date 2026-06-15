import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

// Next.js loads .env.local at runtime, but the Prisma CLI only reads .env — so
// load .env.local explicitly here for migrate/seed/studio.
loadEnv({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // Run after `prisma migrate dev/reset` and via `prisma db seed`.
    seed: "tsx prisma/seed.ts",
  },
  // Migrations / introspection use the DIRECT (non-pooling) connection; the
  // runtime client uses the pooled URL via its driver adapter (src/lib/prisma.ts).
  // Read straight from env (undefined is fine) so `prisma generate` never throws
  // during builds where the DB URL isn't present.
  datasource: {
    // Neon–Vercel integration var, falling back to the plain name for local .env.local.
    url:
      process.env.HOPECHEST_STORAGE_POSTGRES_URL_NON_POOLING ??
      process.env.POSTGRES_URL_NON_POOLING,
  },
});
