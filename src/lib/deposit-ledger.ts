import "server-only";

import { db } from "@/lib/db";

type LedgerSchemaState = {
  tableReady: boolean;
  columnsReady: boolean;
};

const REQUIRED_COLUMNS = [
  "id",
  "reference",
  "partnerId",
  "amount",
  "actualAmount",
  "currency",
  "network",
  "status",
  "provider",
  "destinationAddress",
  "providerInvoiceId",
  "providerInvoiceUrl",
  "providerPaymentId",
  "providerStatus",
  "transactionHash",
  "refundTransactionHash",
  "reviewedById",
  "reviewNote",
  "submittedAt",
  "confirmedAt",
  "refundedAt",
  "expiresAt",
  "createdAt",
  "updatedAt",
] as const;

const globalForLedger = globalThis as unknown as { partnerDepositLedgerReady?: Promise<void> };

async function schemaState(): Promise<LedgerSchemaState> {
  const columns = REQUIRED_COLUMNS.map((column) => `'${column}'`).join(", ");
  const rows = await db.$queryRawUnsafe<LedgerSchemaState[]>(`
    SELECT
      to_regclass('public."PartnerDeposit"') IS NOT NULL AS "tableReady",
      (
        SELECT COUNT(DISTINCT column_name)::int = ${REQUIRED_COLUMNS.length}
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'PartnerDeposit'
          AND column_name IN (${columns})
      ) AS "columnsReady"
  `);
  return rows[0] ?? { tableReady: false, columnsReady: false };
}

async function repairLedgerSchema() {
  await db.$transaction(async (tx) => {
    // The lock function returns PostgreSQL `void`, which Prisma cannot
    // deserialize. Select a supported scalar while still invoking the
    // transaction-scoped lock in the FROM clause.
    await tx.$queryRawUnsafe(
      'SELECT 1::int AS "lockAcquired" FROM pg_advisory_xact_lock(492020260719)',
    );
    await tx.$executeRawUnsafe(`
      DO $block$
      BEGIN
        CREATE TYPE "DepositStatus" AS ENUM (
          'AWAITING_PAYMENT', 'CONFIRMING', 'CONFIRMED',
          'REJECTED', 'REFUNDED', 'EXPIRED'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $block$
    `);
    await tx.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PartnerDeposit" (
        "id" TEXT NOT NULL,
        "reference" TEXT NOT NULL,
        "partnerId" TEXT NOT NULL,
        "amount" DECIMAL(18,6) NOT NULL,
        "actualAmount" DECIMAL(18,6),
        "currency" "Currency" NOT NULL DEFAULT 'USDT',
        "network" TEXT NOT NULL DEFAULT 'TRC20',
        "status" "DepositStatus" NOT NULL DEFAULT 'AWAITING_PAYMENT',
        "provider" TEXT NOT NULL DEFAULT 'DIRECT_TRC20',
        "destinationAddress" TEXT,
        "providerInvoiceId" TEXT,
        "providerInvoiceUrl" TEXT,
        "providerPaymentId" TEXT,
        "providerStatus" TEXT,
        "transactionHash" TEXT,
        "refundTransactionHash" TEXT,
        "reviewedById" TEXT,
        "reviewNote" TEXT,
        "submittedAt" TIMESTAMP(3),
        "confirmedAt" TIMESTAMP(3),
        "refundedAt" TIMESTAMP(3),
        "expiresAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PartnerDeposit_pkey" PRIMARY KEY ("id")
      )
    `);
    await tx.$executeRawUnsafe('ALTER TABLE "PartnerDeposit" ADD COLUMN IF NOT EXISTS "destinationAddress" TEXT');
    await tx.$executeRawUnsafe('ALTER TABLE "PartnerDeposit" ALTER COLUMN "provider" SET DEFAULT \'DIRECT_TRC20\'');
    await tx.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "PartnerDeposit_reference_key" ON "PartnerDeposit"("reference")');
    await tx.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "PartnerDeposit_providerInvoiceId_key" ON "PartnerDeposit"("providerInvoiceId")');
    await tx.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "PartnerDeposit_transactionHash_key" ON "PartnerDeposit"("transactionHash")');
    await tx.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "PartnerDeposit_refundTransactionHash_key" ON "PartnerDeposit"("refundTransactionHash")');
    await tx.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "PartnerDeposit_partnerId_createdAt_idx" ON "PartnerDeposit"("partnerId", "createdAt")');
    await tx.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "PartnerDeposit_status_createdAt_idx" ON "PartnerDeposit"("status", "createdAt")');
    await tx.$executeRawUnsafe(`
      DO $block$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'PartnerDeposit_partnerId_fkey'
            AND conrelid = '"PartnerDeposit"'::regclass
        ) THEN
          ALTER TABLE "PartnerDeposit"
            ADD CONSTRAINT "PartnerDeposit_partnerId_fkey"
            FOREIGN KEY ("partnerId") REFERENCES "PartnerProfile"("id")
            ON DELETE RESTRICT ON UPDATE CASCADE;
        END IF;
      END $block$
    `);
  });
}

async function verifyOrRepairLedger() {
  const before = await schemaState();
  if (!before.tableReady || !before.columnsReady) await repairLedgerSchema();
  const after = await schemaState();
  if (!after.tableReady || !after.columnsReady) {
    throw new Error("Partner deposit ledger schema is unavailable after repair.");
  }
}

export function ensurePartnerDepositLedger() {
  globalForLedger.partnerDepositLedgerReady ??= verifyOrRepairLedger().catch((error) => {
    delete globalForLedger.partnerDepositLedgerReady;
    throw error;
  });
  return globalForLedger.partnerDepositLedgerReady;
}
