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
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME ?? "Network Operator";
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw new Error("ADMIN_EMAIL must be a valid production address.");
  if (!password || password.length < 16) throw new Error("ADMIN_PASSWORD must contain at least 16 characters.");

  const passwordHash = await bcrypt.hash(password, 12);

  await db.user.upsert({
    where: { email },
    update: { passwordHash, name, role: "ADMIN", emailVerifiedAt: new Date() },
    create: { email, passwordHash, name, role: "ADMIN", emailVerifiedAt: new Date() },
  });

  const line = "─".repeat(60);
  console.log(line);
  console.log("INRP2P seed complete — one operator account, nothing else.");
  console.log(`  Admin login:  ${email}`);
  console.log("  Credentials were read from the environment and are never printed.");
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
