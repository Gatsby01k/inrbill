import { Prisma } from "@prisma/client";
import { db } from "./db";

export type AuditInput = {
  action: string;
  entityType: string;
  entityId: string;
  actorId?: string | null;
  actorLabel: string;
  requestId?: string | null;
  partnerId?: string | null;
  matchId?: string | null;
  orderId?: string | null;
  meta?: Record<string, unknown>;
};

type AuditClient = Pick<typeof db, "auditLog">;

export async function auditWith(client: AuditClient, input: AuditInput) {
  await client.auditLog.create({
    data: {
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      actorId: input.actorId ?? null,
      actorLabel: input.actorLabel,
      requestId: input.requestId ?? null,
      partnerId: input.partnerId ?? null,
      matchId: input.matchId ?? null,
      orderId: input.orderId ?? null,
      meta:
        input.meta === undefined ? undefined : (input.meta as Prisma.InputJsonValue),
    },
  });
}

export async function audit(input: AuditInput) {
  await auditWith(db, input);
}

/** Sequential human references: REQ-0001, PTR-0001. */
export async function nextReference(key: "request" | "partner") {
  const counter = await db.counter.upsert({
    where: { key },
    update: { value: { increment: 1 } },
    create: { key, value: 1 },
  });
  const prefix = key === "request" ? "REQ" : "PTR";
  return `${prefix}-${String(counter.value).padStart(4, "0")}`;
}
