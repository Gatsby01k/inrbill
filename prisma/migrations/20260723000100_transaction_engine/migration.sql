-- CreateEnum
CREATE TYPE "AdminPermission" AS ENUM ('ORDER_OPERATIONS', 'SETTLEMENT_RELEASE', 'RISK_OVERRIDE');

-- CreateEnum
CREATE TYPE "CustomerComplianceStatus" AS ENUM ('NOT_STARTED', 'PENDING', 'VERIFIED', 'NEEDS_REVIEW', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PaymentMethodType" AS ENUM ('BANK_ACCOUNT', 'UPI_HANDLE', 'USDT_WALLET');

-- CreateEnum
CREATE TYPE "PaymentMethodPurpose" AS ENUM ('SEND', 'RECEIVE', 'BOTH');

-- CreateEnum
CREATE TYPE "PaymentMethodStatus" AS ENUM ('UNVERIFIED', 'FORMAT_VALIDATED', 'OWNERSHIP_VERIFIED', 'REJECTED', 'DISABLED');

-- CreateEnum
CREATE TYPE "WalletNetwork" AS ENUM ('TRC20', 'ERC20', 'POLYGON');

-- CreateEnum
CREATE TYPE "PaymentRail" AS ENUM ('UPI', 'IMPS', 'BANK_TRANSFER', 'BLOCKCHAIN');

-- CreateEnum
CREATE TYPE "QuoteExactSide" AS ENUM ('SEND', 'RECEIVE');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CONSUMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('DRAFT', 'QUOTED', 'QUOTE_EXPIRED', 'AWAITING_AUTH', 'AWAITING_SETUP', 'AWAITING_CONFIRMATION', 'AWAITING_PAYMENT', 'PAYMENT_SUBMITTED', 'PAYMENT_DETECTED', 'PAYMENT_CONFIRMED', 'SETTLEMENT_PENDING', 'SETTLEMENT_IN_PROGRESS', 'SETTLEMENT_SENT', 'CONFIRMING', 'COMPLETED', 'NEEDS_REVIEW', 'DISPUTED', 'CANCELLED', 'EXPIRED', 'FAILED');

-- CreateEnum
CREATE TYPE "OrderLegStatus" AS ENUM ('PENDING', 'ASSIGNED', 'AWAITING_PAYMENT', 'PAYMENT_CONFIRMED', 'SETTLEMENT_PENDING', 'SETTLEMENT_IN_PROGRESS', 'SETTLEMENT_SENT', 'CONFIRMING', 'COMPLETED', 'FROZEN', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "PaymentAttemptStatus" AS ENUM ('CREATED', 'INSTRUCTIONS_ISSUED', 'SUBMITTED', 'DETECTED', 'CONFIRMED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "SettlementAttemptStatus" AS ENUM ('CREATED', 'PENDING', 'IN_PROGRESS', 'SENT', 'DETECTED', 'CONFIRMED', 'BLOCKED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('ACTIVE', 'FROZEN', 'RELEASED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LiquidityCapacityStatus" AS ENUM ('AVAILABLE', 'PAUSED', 'OFFLINE');

-- CreateEnum
CREATE TYPE "ReconciliationStatus" AS ENUM ('PENDING', 'MATCHED', 'EXCEPTION', 'RESOLVED');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'INVESTIGATING', 'RESOLVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TransactionEvidenceKind" AS ENUM ('PAYMENT_PROOF', 'SETTLEMENT_PROOF', 'BANK_CONFIRMATION', 'PROVIDER_RESPONSE', 'OTHER');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'CUSTOMER';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "adminPermissions" "AdminPermission"[] DEFAULT ARRAY[]::"AdminPermission"[];

-- Existing operators keep routine order permissions after the upgrade.
-- RISK_OVERRIDE is deliberately not granted by migration.
UPDATE "User"
SET "adminPermissions" = ARRAY['ORDER_OPERATIONS', 'SETTLEMENT_RELEASE']::"AdminPermission"[]
WHERE "role" = 'ADMIN';

-- AlterTable
ALTER TABLE "VerificationCase" ADD COLUMN     "customerId" TEXT;

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "orderId" TEXT;

-- CreateTable
CREATE TABLE "CustomerOtpChallenge" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "quoteId" TEXT,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerOtpChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phoneEncrypted" TEXT,
    "phoneLast4" TEXT,
    "phoneVerifiedAt" TIMESTAMP(3),
    "complianceStatus" "CustomerComplianceStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "complianceReviewedAt" TIMESTAMP(3),
    "inrp2pId" TEXT,
    "publicReceiveEnabled" BOOLEAN NOT NULL DEFAULT false,
    "inrPerOrderLimit" DECIMAL(18,2),
    "usdtPerOrderLimit" DECIMAL(18,6),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentMethod" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "type" "PaymentMethodType" NOT NULL,
    "purpose" "PaymentMethodPurpose" NOT NULL DEFAULT 'BOTH',
    "status" "PaymentMethodStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "label" TEXT NOT NULL,
    "maskedLabel" TEXT NOT NULL,
    "isDefaultSend" BOOLEAN NOT NULL DEFAULT false,
    "isDefaultReceive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankAccount" (
    "id" TEXT NOT NULL,
    "paymentMethodId" TEXT NOT NULL,
    "accountHolderEncrypted" TEXT NOT NULL,
    "accountNumberEncrypted" TEXT NOT NULL,
    "accountNumberHash" TEXT NOT NULL,
    "accountLast4" TEXT NOT NULL,
    "ifscEncrypted" TEXT NOT NULL,
    "ifscMasked" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "ownershipVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UPIHandle" (
    "id" TEXT NOT NULL,
    "paymentMethodId" TEXT NOT NULL,
    "handleEncrypted" TEXT NOT NULL,
    "handleHash" TEXT NOT NULL,
    "handleMasked" TEXT NOT NULL,
    "ownershipVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UPIHandle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "paymentMethodId" TEXT NOT NULL,
    "network" "WalletNetwork" NOT NULL,
    "addressEncrypted" TEXT NOT NULL,
    "addressHash" TEXT NOT NULL,
    "addressLast4" TEXT NOT NULL,
    "formatValidatedAt" TIMESTAMP(3),
    "ownershipVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReceiveProfile" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "primaryMethodId" TEXT,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReceiveProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReceiveProfileFallback" (
    "id" TEXT NOT NULL,
    "receiveProfileId" TEXT NOT NULL,
    "paymentMethodId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "ReceiveProfileFallback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReceiveLink" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "amount" DECIMAL(18,6),
    "currency" "Currency",
    "memo" TEXT,
    "expiresAt" TIMESTAMP(3),
    "maxUses" INTEGER,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReceiveLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "customerId" TEXT,
    "recipientCustomerId" TEXT,
    "receiveLinkId" TEXT,
    "clientTokenHash" TEXT NOT NULL,
    "direction" "Direction" NOT NULL,
    "exactSide" "QuoteExactSide" NOT NULL,
    "inputAmount" DECIMAL(18,6) NOT NULL,
    "sendCurrency" "Currency" NOT NULL,
    "receiveCurrency" "Currency" NOT NULL,
    "sendAmount" DECIMAL(18,6) NOT NULL,
    "receiveAmount" DECIMAL(18,6) NOT NULL,
    "rate" DECIMAL(18,8) NOT NULL,
    "feeAmount" DECIMAL(18,6) NOT NULL,
    "feeCurrency" "Currency" NOT NULL,
    "feeBps" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "providerReference" TEXT,
    "sourceMethodHintId" TEXT,
    "destinationMethodHintId" TEXT,
    "status" "QuoteStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "recipientCustomerId" TEXT,
    "quoteId" TEXT NOT NULL,
    "sourcePaymentMethodId" TEXT NOT NULL,
    "destinationPaymentMethodId" TEXT NOT NULL,
    "direction" "Direction" NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'AWAITING_PAYMENT',
    "sendCurrency" "Currency" NOT NULL,
    "receiveCurrency" "Currency" NOT NULL,
    "sendAmount" DECIMAL(18,6) NOT NULL,
    "receiveAmount" DECIMAL(18,6) NOT NULL,
    "rate" DECIMAL(18,8) NOT NULL,
    "feeAmount" DECIMAL(18,6) NOT NULL,
    "feeCurrency" "Currency" NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "attentionReason" TEXT,
    "paymentDeadline" TIMESTAMP(3),
    "paymentSubmittedAt" TIMESTAMP(3),
    "paymentConfirmedAt" TIMESTAMP(3),
    "paymentConfirmedById" TEXT,
    "settlementReleasedById" TEXT,
    "settlementSentAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderLeg" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "status" "OrderLegStatus" NOT NULL DEFAULT 'PENDING',
    "sendAmount" DECIMAL(18,6) NOT NULL,
    "receiveAmount" DECIMAL(18,6) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderLeg_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiquidityCapacity" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "direction" "Direction" NOT NULL,
    "status" "LiquidityCapacityStatus" NOT NULL DEFAULT 'AVAILABLE',
    "declaredInr" DECIMAL(18,2) NOT NULL,
    "reservedInr" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "availableInr" DECIMAL(18,2) NOT NULL,
    "pendingInr" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "settledInr" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "declaredUsdt" DECIMAL(18,6) NOT NULL,
    "reservedUsdt" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "availableUsdt" DECIMAL(18,6) NOT NULL,
    "pendingUsdt" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "settledUsdt" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "minInr" DECIMAL(18,2),
    "maxInr" DECIMAL(18,2),
    "minUsdt" DECIMAL(18,6),
    "maxUsdt" DECIMAL(18,6),
    "rails" "PaymentRail"[],
    "networks" "WalletNetwork"[],
    "banks" TEXT[],
    "collectionDetailsEncrypted" TEXT NOT NULL,
    "collectionDetailsMasked" TEXT NOT NULL,
    "workingHours" JSONB,
    "lastConfirmedAt" TIMESTAMP(3) NOT NULL,
    "availableUntil" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiquidityCapacity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assignment" (
    "id" TEXT NOT NULL,
    "orderLegId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "liquidityCapacityId" TEXT NOT NULL,
    "previousAssignmentId" TEXT,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "reservedInr" DECIMAL(18,2) NOT NULL,
    "reservedUsdt" DECIMAL(18,6) NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "frozenAt" TIMESTAMP(3),
    "frozenReason" TEXT,
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentAttempt" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderLegId" TEXT,
    "status" "PaymentAttemptStatus" NOT NULL DEFAULT 'CREATED',
    "rail" "PaymentRail" NOT NULL,
    "amount" DECIMAL(18,6) NOT NULL,
    "currency" "Currency" NOT NULL,
    "instructionsEncrypted" TEXT NOT NULL,
    "instructionsMasked" TEXT NOT NULL,
    "provider" TEXT,
    "providerReference" TEXT,
    "utrEncrypted" TEXT,
    "utrHash" TEXT,
    "utrMasked" TEXT,
    "txid" TEXT,
    "expiresAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "detectedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SettlementAttempt" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderLegId" TEXT,
    "status" "SettlementAttemptStatus" NOT NULL DEFAULT 'CREATED',
    "amount" DECIMAL(18,6) NOT NULL,
    "currency" "Currency" NOT NULL,
    "network" "WalletNetwork",
    "provider" TEXT,
    "providerReference" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "destinationMasked" TEXT NOT NULL,
    "payoutReferenceEncrypted" TEXT,
    "payoutReferenceHash" TEXT,
    "payoutReferenceMasked" TEXT,
    "txid" TEXT,
    "failureReason" TEXT,
    "startedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "detectedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SettlementAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionEvidence" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderLegId" TEXT,
    "assignmentId" TEXT,
    "paymentAttemptId" TEXT,
    "settlementAttemptId" TEXT,
    "kind" "TransactionEvidenceKind" NOT NULL,
    "title" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "checksumSha256" TEXT NOT NULL,
    "classification" "DataClassification" NOT NULL DEFAULT 'RESTRICTED',
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransactionEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dispute" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "openedById" TEXT NOT NULL,
    "resolvedById" TEXT,
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reconciliation" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" "ReconciliationStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMatched" BOOLEAN NOT NULL DEFAULT false,
    "settlementMatched" BOOLEAN NOT NULL DEFAULT false,
    "expectedSendAmount" DECIMAL(18,6) NOT NULL,
    "observedSendAmount" DECIMAL(18,6),
    "expectedReceiveAmount" DECIMAL(18,6) NOT NULL,
    "observedReceiveAmount" DECIMAL(18,6),
    "exceptionReason" TEXT,
    "reconciledById" TEXT,
    "reconciledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reconciliation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomerOtpChallenge_tokenHash_key" ON "CustomerOtpChallenge"("tokenHash");

-- CreateIndex
CREATE INDEX "CustomerOtpChallenge_email_expiresAt_idx" ON "CustomerOtpChallenge"("email", "expiresAt");

-- CreateIndex
CREATE INDEX "CustomerOtpChallenge_quoteId_idx" ON "CustomerOtpChallenge"("quoteId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerProfile_userId_key" ON "CustomerProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerProfile_inrp2pId_key" ON "CustomerProfile"("inrp2pId");

-- CreateIndex
CREATE INDEX "CustomerProfile_complianceStatus_idx" ON "CustomerProfile"("complianceStatus");

-- CreateIndex
CREATE INDEX "PaymentMethod_customerId_type_status_idx" ON "PaymentMethod"("customerId", "type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "BankAccount_paymentMethodId_key" ON "BankAccount"("paymentMethodId");

-- CreateIndex
CREATE UNIQUE INDEX "BankAccount_accountNumberHash_key" ON "BankAccount"("accountNumberHash");

-- CreateIndex
CREATE UNIQUE INDEX "UPIHandle_paymentMethodId_key" ON "UPIHandle"("paymentMethodId");

-- CreateIndex
CREATE UNIQUE INDEX "UPIHandle_handleHash_key" ON "UPIHandle"("handleHash");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_paymentMethodId_key" ON "Wallet"("paymentMethodId");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_addressHash_key" ON "Wallet"("addressHash");

-- CreateIndex
CREATE UNIQUE INDEX "ReceiveProfile_customerId_key" ON "ReceiveProfile"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "ReceiveProfile_primaryMethodId_key" ON "ReceiveProfile"("primaryMethodId");

-- CreateIndex
CREATE UNIQUE INDEX "ReceiveProfileFallback_receiveProfileId_paymentMethodId_key" ON "ReceiveProfileFallback"("receiveProfileId", "paymentMethodId");

-- CreateIndex
CREATE UNIQUE INDEX "ReceiveProfileFallback_receiveProfileId_position_key" ON "ReceiveProfileFallback"("receiveProfileId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "ReceiveLink_tokenHash_key" ON "ReceiveLink"("tokenHash");

-- CreateIndex
CREATE INDEX "ReceiveLink_customerId_active_idx" ON "ReceiveLink"("customerId", "active");

-- CreateIndex
CREATE INDEX "ReceiveLink_expiresAt_idx" ON "ReceiveLink"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_clientTokenHash_key" ON "Quote"("clientTokenHash");

-- CreateIndex
CREATE INDEX "Quote_customerId_createdAt_idx" ON "Quote"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "Quote_recipientCustomerId_createdAt_idx" ON "Quote"("recipientCustomerId", "createdAt");

-- CreateIndex
CREATE INDEX "Quote_receiveLinkId_idx" ON "Quote"("receiveLinkId");

-- CreateIndex
CREATE INDEX "Quote_status_expiresAt_idx" ON "Quote"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Order_reference_key" ON "Order"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Order_quoteId_key" ON "Order"("quoteId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_idempotencyKey_key" ON "Order"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Order_customerId_createdAt_idx" ON "Order"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_status_updatedAt_idx" ON "Order"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "OrderLeg_orderId_status_idx" ON "OrderLeg"("orderId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "OrderLeg_orderId_sequence_key" ON "OrderLeg"("orderId", "sequence");

-- CreateIndex
CREATE INDEX "LiquidityCapacity_direction_status_availableUntil_idx" ON "LiquidityCapacity"("direction", "status", "availableUntil");

-- CreateIndex
CREATE INDEX "LiquidityCapacity_partnerId_updatedAt_idx" ON "LiquidityCapacity"("partnerId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Assignment_idempotencyKey_key" ON "Assignment"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Assignment_orderLegId_status_idx" ON "Assignment"("orderLegId", "status");

-- CreateIndex
CREATE INDEX "Assignment_partnerId_status_idx" ON "Assignment"("partnerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentAttempt_utrHash_key" ON "PaymentAttempt"("utrHash");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentAttempt_txid_key" ON "PaymentAttempt"("txid");

-- CreateIndex
CREATE INDEX "PaymentAttempt_orderId_status_idx" ON "PaymentAttempt"("orderId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentAttempt_provider_providerReference_key" ON "PaymentAttempt"("provider", "providerReference");

-- CreateIndex
CREATE UNIQUE INDEX "SettlementAttempt_idempotencyKey_key" ON "SettlementAttempt"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "SettlementAttempt_payoutReferenceHash_key" ON "SettlementAttempt"("payoutReferenceHash");

-- CreateIndex
CREATE UNIQUE INDEX "SettlementAttempt_txid_key" ON "SettlementAttempt"("txid");

-- CreateIndex
CREATE INDEX "SettlementAttempt_orderId_status_idx" ON "SettlementAttempt"("orderId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SettlementAttempt_provider_providerReference_key" ON "SettlementAttempt"("provider", "providerReference");

-- CreateIndex
CREATE UNIQUE INDEX "TransactionEvidence_storageKey_key" ON "TransactionEvidence"("storageKey");

-- CreateIndex
CREATE INDEX "TransactionEvidence_orderId_createdAt_idx" ON "TransactionEvidence"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "TransactionEvidence_assignmentId_idx" ON "TransactionEvidence"("assignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Dispute_reference_key" ON "Dispute"("reference");

-- CreateIndex
CREATE INDEX "Dispute_orderId_status_idx" ON "Dispute"("orderId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Reconciliation_orderId_key" ON "Reconciliation"("orderId");

-- CreateIndex
CREATE INDEX "VerificationCase_customerId_idx" ON "VerificationCase"("customerId");

-- CreateIndex
CREATE INDEX "AuditLog_orderId_idx" ON "AuditLog"("orderId");

-- AddForeignKey
ALTER TABLE "VerificationCase" ADD CONSTRAINT "VerificationCase_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CustomerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerProfile" ADD CONSTRAINT "CustomerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMethod" ADD CONSTRAINT "PaymentMethod_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CustomerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UPIHandle" ADD CONSTRAINT "UPIHandle_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiveProfile" ADD CONSTRAINT "ReceiveProfile_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CustomerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiveProfile" ADD CONSTRAINT "ReceiveProfile_primaryMethodId_fkey" FOREIGN KEY ("primaryMethodId") REFERENCES "PaymentMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiveProfileFallback" ADD CONSTRAINT "ReceiveProfileFallback_receiveProfileId_fkey" FOREIGN KEY ("receiveProfileId") REFERENCES "ReceiveProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiveProfileFallback" ADD CONSTRAINT "ReceiveProfileFallback_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiveLink" ADD CONSTRAINT "ReceiveLink_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CustomerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CustomerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_recipientCustomerId_fkey" FOREIGN KEY ("recipientCustomerId") REFERENCES "CustomerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_receiveLinkId_fkey" FOREIGN KEY ("receiveLinkId") REFERENCES "ReceiveLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_sourceMethodHintId_fkey" FOREIGN KEY ("sourceMethodHintId") REFERENCES "PaymentMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_destinationMethodHintId_fkey" FOREIGN KEY ("destinationMethodHintId") REFERENCES "PaymentMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CustomerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_recipientCustomerId_fkey" FOREIGN KEY ("recipientCustomerId") REFERENCES "CustomerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_sourcePaymentMethodId_fkey" FOREIGN KEY ("sourcePaymentMethodId") REFERENCES "PaymentMethod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_destinationPaymentMethodId_fkey" FOREIGN KEY ("destinationPaymentMethodId") REFERENCES "PaymentMethod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLeg" ADD CONSTRAINT "OrderLeg_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiquidityCapacity" ADD CONSTRAINT "LiquidityCapacity_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "PartnerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_orderLegId_fkey" FOREIGN KEY ("orderLegId") REFERENCES "OrderLeg"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "PartnerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_liquidityCapacityId_fkey" FOREIGN KEY ("liquidityCapacityId") REFERENCES "LiquidityCapacity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_previousAssignmentId_fkey" FOREIGN KEY ("previousAssignmentId") REFERENCES "Assignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_orderLegId_fkey" FOREIGN KEY ("orderLegId") REFERENCES "OrderLeg"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SettlementAttempt" ADD CONSTRAINT "SettlementAttempt_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SettlementAttempt" ADD CONSTRAINT "SettlementAttempt_orderLegId_fkey" FOREIGN KEY ("orderLegId") REFERENCES "OrderLeg"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionEvidence" ADD CONSTRAINT "TransactionEvidence_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionEvidence" ADD CONSTRAINT "TransactionEvidence_orderLegId_fkey" FOREIGN KEY ("orderLegId") REFERENCES "OrderLeg"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionEvidence" ADD CONSTRAINT "TransactionEvidence_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionEvidence" ADD CONSTRAINT "TransactionEvidence_paymentAttemptId_fkey" FOREIGN KEY ("paymentAttemptId") REFERENCES "PaymentAttempt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionEvidence" ADD CONSTRAINT "TransactionEvidence_settlementAttemptId_fkey" FOREIGN KEY ("settlementAttemptId") REFERENCES "SettlementAttempt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reconciliation" ADD CONSTRAINT "Reconciliation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Fail closed on malformed lifecycle records even when a write bypasses Prisma.
ALTER TABLE "VerificationCase"
  ADD CONSTRAINT "VerificationCase_single_subject_check"
  CHECK (num_nonnulls("organizationId", "partnerId", "customerId") = 1);

ALTER TABLE "LiquidityCapacity"
  ADD CONSTRAINT "LiquidityCapacity_nonnegative_check"
  CHECK (
    "declaredInr" >= 0 AND "reservedInr" >= 0 AND "availableInr" >= 0 AND
    "pendingInr" >= 0 AND "settledInr" >= 0 AND "declaredUsdt" >= 0 AND
    "reservedUsdt" >= 0 AND "availableUsdt" >= 0 AND "pendingUsdt" >= 0 AND
    "settledUsdt" >= 0
  );

ALTER TABLE "LiquidityCapacity"
  ADD CONSTRAINT "LiquidityCapacity_exposure_check"
  CHECK (
    "availableInr" + "reservedInr" + "pendingInr" <= "declaredInr" AND
    "availableUsdt" + "reservedUsdt" + "pendingUsdt" <= "declaredUsdt" AND
    ("minInr" IS NULL OR "minInr" >= 0) AND
    ("maxInr" IS NULL OR "maxInr" >= COALESCE("minInr", 0)) AND
    ("minUsdt" IS NULL OR "minUsdt" >= 0) AND
    ("maxUsdt" IS NULL OR "maxUsdt" >= COALESCE("minUsdt", 0))
  );

ALTER TABLE "Order"
  ADD CONSTRAINT "Order_positive_amounts_check"
  CHECK ("sendAmount" > 0 AND "receiveAmount" > 0 AND "feeAmount" >= 0);

ALTER TABLE "Quote"
  ADD CONSTRAINT "Quote_positive_amounts_check"
  CHECK (
    "inputAmount" > 0 AND "sendAmount" > 0 AND "receiveAmount" > 0 AND
    "rate" > 0 AND "feeAmount" >= 0 AND "feeBps" >= 0
  );

ALTER TABLE "OrderLeg"
  ADD CONSTRAINT "OrderLeg_positive_amounts_check"
  CHECK ("sendAmount" > 0 AND "receiveAmount" > 0);

ALTER TABLE "Assignment"
  ADD CONSTRAINT "Assignment_positive_reservation_check"
  CHECK ("reservedInr" > 0 AND "reservedUsdt" > 0);

ALTER TABLE "PaymentAttempt"
  ADD CONSTRAINT "PaymentAttempt_positive_amount_check"
  CHECK ("amount" > 0);

ALTER TABLE "SettlementAttempt"
  ADD CONSTRAINT "SettlementAttempt_positive_amount_check"
  CHECK ("amount" > 0);

ALTER TABLE "ReceiveLink"
  ADD CONSTRAINT "ReceiveLink_usage_check"
  CHECK (
    ("amount" IS NULL OR "amount" > 0) AND
    "useCount" >= 0 AND
    ("maxUses" IS NULL OR "maxUses" > 0) AND
    ("maxUses" IS NULL OR "useCount" <= "maxUses")
  );
