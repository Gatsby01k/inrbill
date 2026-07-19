-- Add the audited USDT reserve ledger used by partner deposits.
CREATE TYPE "DepositStatus" AS ENUM (
  'AWAITING_PAYMENT',
  'CONFIRMING',
  'CONFIRMED',
  'REJECTED',
  'REFUNDED',
  'EXPIRED'
);

CREATE TABLE "PartnerDeposit" (
  "id" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "partnerId" TEXT NOT NULL,
  "amount" DECIMAL(18,6) NOT NULL,
  "actualAmount" DECIMAL(18,6),
  "currency" "Currency" NOT NULL DEFAULT 'USDT',
  "network" TEXT NOT NULL DEFAULT 'TRC20',
  "status" "DepositStatus" NOT NULL DEFAULT 'AWAITING_PAYMENT',
  "provider" TEXT NOT NULL DEFAULT 'NOWPAYMENTS',
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
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PartnerDeposit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PartnerDeposit_reference_key" ON "PartnerDeposit"("reference");
CREATE UNIQUE INDEX "PartnerDeposit_providerInvoiceId_key" ON "PartnerDeposit"("providerInvoiceId");
CREATE UNIQUE INDEX "PartnerDeposit_transactionHash_key" ON "PartnerDeposit"("transactionHash");
CREATE UNIQUE INDEX "PartnerDeposit_refundTransactionHash_key" ON "PartnerDeposit"("refundTransactionHash");
CREATE INDEX "PartnerDeposit_partnerId_createdAt_idx" ON "PartnerDeposit"("partnerId", "createdAt");
CREATE INDEX "PartnerDeposit_status_createdAt_idx" ON "PartnerDeposit"("status", "createdAt");

ALTER TABLE "PartnerDeposit"
  ADD CONSTRAINT "PartnerDeposit_partnerId_fkey"
  FOREIGN KEY ("partnerId") REFERENCES "PartnerProfile"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
