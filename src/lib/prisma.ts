import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

// Prisma 7 connects through a driver adapter. We use node-postgres against the
// pooled Neon endpoint; migrations use the direct URL (prisma.config.ts).
// Prefer the Neon–Vercel integration var; fall back to the plain name for local
// .env.local. (Don't duplicate these in Vercel — the integration owns them.)
const connectionString =
  process.env.HOPECHEST_STORAGE_POSTGRES_PRISMA_URL ?? process.env.POSTGRES_PRISMA_URL;

// Reuse a single PrismaClient across hot reloads in dev (avoids exhausting the
// connection pool).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ adapter: new PrismaPg(connectionString!) });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
