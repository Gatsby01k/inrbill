import { spawnSync } from "node:child_process";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

if (process.env.VERCEL_ENV !== "production") {
  console.log("Production database release: skipped outside Vercel Production.");
  process.exit(0);
}

if (process.env.VERCEL_GIT_COMMIT_REF !== "main") {
  throw new Error("Production database release is restricted to the main branch.");
}

if (!process.env.DATABASE_URL) {
  throw new Error("Production database release requires DATABASE_URL.");
}

// Keep the database used by this exact runtime compatible even when a duplicate
// Vercel project has no unpooled migration URL. These statements are additive,
// idempotent, and do not modify existing evidence records.
const runtimeDatabase = new PrismaClient();
try {
  await runtimeDatabase.$executeRawUnsafe(
    `ALTER TYPE "EvidenceKind" ADD VALUE IF NOT EXISTS 'IDENTITY_DOCUMENT'`,
  );
  await runtimeDatabase.$executeRawUnsafe(
    `ALTER TYPE "EvidenceKind" ADD VALUE IF NOT EXISTS 'VIDEO_VERIFICATION'`,
  );
  const values = await runtimeDatabase.$queryRawUnsafe(
    `SELECT enumlabel FROM pg_enum WHERE enumtypid = '"EvidenceKind"'::regtype`,
  );
  const labels = new Set(values.map((row) => row.enumlabel));
  if (!labels.has("IDENTITY_DOCUMENT") || !labels.has("VIDEO_VERIFICATION")) {
    throw new Error("Runtime EvidenceKind compatibility verification failed.");
  }
  console.log("Production runtime EvidenceKind values verified.");
} finally {
  await runtimeDatabase.$disconnect();
}

if (!process.env.DATABASE_URL_UNPOOLED) {
  console.log("Prisma migration deploy skipped: DATABASE_URL_UNPOOLED is not configured for this Vercel project.");
  process.exit(0);
}

const executable = path.join(
  process.cwd(),
  "node_modules",
  ".bin",
  process.platform === "win32" ? "prisma.cmd" : "prisma",
);
const result = spawnSync(executable, ["migrate", "deploy"], {
  env: process.env,
  stdio: "inherit",
});

if (result.status !== 0) {
  throw new Error("Production database migration failed.");
}

console.log("Production database release completed.");
