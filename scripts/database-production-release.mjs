import { spawnSync } from "node:child_process";
import path from "node:path";

if (process.env.VERCEL_ENV !== "production") {
  console.log("Production database release: skipped outside Vercel Production.");
  process.exit(0);
}

if (process.env.VERCEL_GIT_COMMIT_REF !== "main") {
  throw new Error("Production database release is restricted to the main branch.");
}

if (!process.env.DATABASE_URL || !process.env.DATABASE_URL_UNPOOLED) {
  throw new Error("Production database release requires DATABASE_URL and DATABASE_URL_UNPOOLED.");
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
