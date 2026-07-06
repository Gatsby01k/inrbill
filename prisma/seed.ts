/**
 * INRP2P seed — intentionally minimal.
 *
 * Creates exactly ONE record: the operator (admin) account, from env vars.
 * No fake companies. No fake partners. No fake volume. No fake deals.
 * Real data enters only through the public request/application flows.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? "admin@inrp2p.local").toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "inrp2p-admin-2026";
  const name = process.env.ADMIN_NAME ?? "Network Operator";

  const passwordHash = await bcrypt.hash(password, 12);

  await db.user.upsert({
    where: { email },
    update: { passwordHash, name, role: "ADMIN" },
    create: { email, passwordHash, name, role: "ADMIN" },
  });

  const line = "─".repeat(60);
  console.log(line);
  console.log("INRP2P seed complete — one operator account, nothing else.");
  console.log(`  Admin login:  ${email}`);
  console.log(`  Password:     ${password}`);
  console.log("");
  console.log("  Re-running the seed resets these credentials from .env.");
  console.log("  CHANGE ADMIN_EMAIL / ADMIN_PASSWORD before going live.");
  console.log("  No fake companies, partners, requests or deals are seeded.");
  console.log(line);
}

main()
  .then(async () => {
    await db.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
