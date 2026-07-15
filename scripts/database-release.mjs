import { spawnSync } from "node:child_process";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  BASELINE_MIGRATION,
  NETWORK_MIGRATION,
  NETWORK_TABLES,
  databaseReleasePlan,
} from "./database-release-plan.mjs";

const mode = process.env.DATABASE_RELEASE_MODE;
if (!mode) {
  console.log("Database release guard: skipped.");
  process.exit(0);
}

if (!new Set(["inspect", "migrate"]).has(mode)) {
  throw new Error("DATABASE_RELEASE_MODE must be inspect or migrate.");
}

if (process.env.VERCEL_ENV !== "preview") {
  throw new Error("Database release guard only runs in a Vercel Preview deployment.");
}

if (process.env.VERCEL_GIT_COMMIT_REF !== "codex/inrp2p-v2") {
  throw new Error("Database release guard is restricted to codex/inrp2p-v2.");
}

const db = new PrismaClient();

async function snapshot() {
  const tableRows = await db.$queryRawUnsafe(
    "SELECT tablename FROM pg_tables WHERE schemaname = $1 ORDER BY tablename",
    "public",
  );
  const tables = tableRows.map((row) => row.tablename);
  let migrations = [];
  if (tables.includes("_prisma_migrations")) {
    const migrationRows = await db.$queryRawUnsafe(
      "SELECT migration_name FROM \"_prisma_migrations\" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY started_at",
    );
    migrations = migrationRows.map((row) => row.migration_name);
  }
  return { tables, migrations, plan: databaseReleasePlan(tables, migrations) };
}

function prisma(...args) {
  const executable = path.join(process.cwd(), "node_modules", ".bin", process.platform === "win32" ? "prisma.cmd" : "prisma");
  const result = spawnSync(executable, args, { env: process.env, stdio: "inherit" });
  if (result.status !== 0) throw new Error(`Prisma ${args.join(" ")} failed.`);
}

try {
  const before = await snapshot();
  console.log("Database release inspection:", JSON.stringify({
    tableCount: before.tables.length,
    migrationNames: before.migrations,
    plan: before.plan,
  }));

  if (mode === "inspect") process.exit(0);
  if (process.env.DATABASE_RELEASE_ACK !== NETWORK_MIGRATION) {
    throw new Error(`DATABASE_RELEASE_ACK must equal ${NETWORK_MIGRATION}.`);
  }

  if (before.plan.action.startsWith("blocked-")) {
    throw new Error(`Migration blocked by schema guard: ${before.plan.action}.`);
  }

  if (before.plan.action === "resolve-baseline-then-deploy") {
    prisma("migrate", "resolve", "--applied", BASELINE_MIGRATION);
    prisma("migrate", "deploy");
  } else if (["fresh-deploy", "deploy-network"].includes(before.plan.action)) {
    prisma("migrate", "deploy");
  }

  const after = await snapshot();
  const missingTables = NETWORK_TABLES.filter((name) => !after.tables.includes(name));
  if (missingTables.length || !after.migrations.includes(NETWORK_MIGRATION)) {
    throw new Error(`Post-migration verification failed; missing ${missingTables.join(", ") || "migration record"}.`);
  }
  console.log("Database release completed and verified:", JSON.stringify({ tableCount: after.tables.length, plan: after.plan }));
} finally {
  await db.$disconnect();
}
