import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export async function consumeRateLimit(scope: string, identity: string, limit: number, windowMs: number) {
  const id = crypto.createHash("sha256").update(`${scope}:${identity}`).digest("hex");
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await db.$transaction(async (tx) => {
        const now = new Date();
        const current = await tx.rateLimitState.findUnique({ where: { id } });
        if (!current || current.expiresAt <= now) {
          await tx.rateLimitState.upsert({ where: { id }, update: { count: 1, windowStart: now, expiresAt: new Date(now.getTime() + windowMs) }, create: { id, count: 1, windowStart: now, expiresAt: new Date(now.getTime() + windowMs) } });
          return true;
        }
        if (current.count >= limit) return false;
        await tx.rateLimitState.update({ where: { id }, data: { count: { increment: 1 } } });
        return true;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || !["P2034", "P2002"].includes(error.code)) throw error;
    }
  }
  return false;
}
