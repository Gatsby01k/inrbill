import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const EMAIL = "info@inrp2p.com";
const prisma = new PrismaClient();

async function main() {
  if (process.env.VERCEL_ENV !== "production" || process.env.VERCEL_GIT_COMMIT_REF !== "main") {
    console.log("[operator-bootstrap] skipped outside production main");
    return;
  }

  const target = await prisma.user.findUnique({
    where: { email: EMAIL },
    select: { role: true },
  });

  if (target?.role === "ADMIN") {
    console.log("[operator-bootstrap] target administrator verified; no changes");
    return;
  }
  if (target) {
    throw new Error("[operator-bootstrap] target email belongs to a non-admin account");
  }

  const passwordHash = await bcrypt.hash(randomBytes(48).toString("base64url"), 12);
  await prisma.user.create({
    data: {
      email: EMAIL,
      passwordHash,
      name: "INRP2P Operator",
      role: "ADMIN",
      emailVerifiedAt: new Date(),
      mustSetPassword: true,
    },
  });

  console.log("[operator-bootstrap] target production administrator created");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "[operator-bootstrap] failed");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
