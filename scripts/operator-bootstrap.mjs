import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const EMAIL = "info@inrp2p.com";
const prisma = new PrismaClient();

async function main() {
  const isProduction = process.env.VERCEL_ENV === "production";
  const isMain = process.env.VERCEL_GIT_COMMIT_REF === "main";

  if (!isProduction || !isMain) {
    console.log("[operator-bootstrap] skipped outside production main");
    return;
  }

  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    select: { id: true },
  });
  if (admin) {
    console.log("[operator-bootstrap] administrator already exists; no changes");
    return;
  }

  const collision = await prisma.user.findUnique({
    where: { email: EMAIL },
    select: { id: true },
  });
  if (collision) {
    throw new Error("[operator-bootstrap] target email already belongs to a non-admin account");
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

  console.log("[operator-bootstrap] production administrator created");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "[operator-bootstrap] failed");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
