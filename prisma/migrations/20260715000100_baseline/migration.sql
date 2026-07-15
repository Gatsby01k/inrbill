-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'COMPANY', 'PARTNER');

-- CreateEnum
CREATE TYPE "Direction" AS ENUM ('INR_TO_USDT', 'USDT_TO_INR', 'INR_PAYOUTS');

-- CreateEnum
CREATE TYPE "RequestType" AS ENUM ('INR_PAYOUTS', 'INR_LIQUIDITY', 'INR_TO_USDT', 'USDT_TO_INR', 'PARTNER_SOURCING', 'OTHER');

-- CreateEnum
CREATE TYPE "Urgency" AS ENUM ('STANDARD', 'URGENT', 'CRITICAL');

-- CreateEnum
CREATE TYPE "RevenueType" AS ENUM ('REVIEW_FEE', 'PARTNER_ACCESS', 'INTRO_FEE', 'SUCCESS_FEE', 'MONTHLY_RETAINER', 'CUSTOM');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('SUBMITTED', 'IN_REVIEW', 'MATCHING', 'INTRODUCED', 'CLOSED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PartnerStatus" AS ENUM ('APPLIED', 'UNDER_REVIEW', 'VERIFIED', 'LIMITED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('SUGGESTED', 'SHORTLISTED', 'INTRODUCED', 'ACCEPTED', 'DECLINED');

-- CreateEnum
CREATE TYPE "IntroductionStatus" AS ENUM ('PENDING', 'SENT', 'RESPONDED', 'SUCCESSFUL', 'FAILED');

-- CreateEnum
CREATE TYPE "RevenueStatus" AS ENUM ('POTENTIAL', 'QUOTED', 'AGREED', 'INVOICED', 'PAID', 'CANCELLED', 'LOST', 'WAIVED');

-- CreateEnum
CREATE TYPE "NoteVisibility" AS ENUM ('INTERNAL', 'COMPANY', 'PARTNER');

-- CreateEnum
CREATE TYPE "IntroChannel" AS ENUM ('EMAIL', 'TELEGRAM', 'CALL', 'OTHER');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('INR', 'USDT', 'USD');

-- CreateEnum
CREATE TYPE "ErrorSeverity" AS ENUM ('WARNING', 'ERROR', 'FATAL');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "telegramChatId" TEXT,
    "telegramLinkCode" TEXT,
    "totpSecret" TEXT,
    "totpEnabled" BOOLEAN NOT NULL DEFAULT false,
    "totpBackupCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TwoFactorChallenge" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "next" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TwoFactorChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "website" TEXT,
    "jurisdiction" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactRole" TEXT,
    "telegram" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retainerActive" BOOLEAN NOT NULL DEFAULT false,
    "retainerAmount" DECIMAL(18,2),
    "retainerCurrency" "Currency",
    "retainerDayOfMonth" INTEGER,
    "retainerNextRenewal" TIMESTAMP(3),
    "referralCode" TEXT,
    "referredByCode" TEXT,

    CONSTRAINT "CompanyProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiquidityRequest" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "direction" "Direction" NOT NULL,
    "requestType" "RequestType" NOT NULL DEFAULT 'INR_PAYOUTS',
    "dailyVolumeBand" TEXT NOT NULL,
    "monthlyVolumeBand" TEXT NOT NULL,
    "ticketSize" TEXT,
    "urgency" "Urgency" NOT NULL DEFAULT 'STANDARD',
    "countriesInvolved" TEXT,
    "banks" TEXT[],
    "methods" TEXT[],
    "requiredSpeed" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "kycReadiness" TEXT NOT NULL,
    "kycNotes" TEXT,
    "partnerRequirements" TEXT,
    "notes" TEXT,
    "status" "RequestStatus" NOT NULL DEFAULT 'SUBMITTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "aiTriageNote" TEXT,
    "aiFlagged" BOOLEAN,

    CONSTRAINT "LiquidityRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "legalName" TEXT,
    "contactName" TEXT NOT NULL,
    "telegram" TEXT,
    "phone" TEXT,
    "experienceBand" TEXT NOT NULL,
    "directions" "Direction"[],
    "banks" TEXT[],
    "methods" TEXT[],
    "dailyCapacityBand" TEXT NOT NULL,
    "monthlyCapacityBand" TEXT,
    "minTicket" TEXT,
    "maxTicket" TEXT,
    "settlementPreference" TEXT,
    "workingHours" TEXT NOT NULL,
    "reserveBand" TEXT NOT NULL,
    "jurisdictions" TEXT NOT NULL,
    "operatingCountry" TEXT,
    "complianceFlags" TEXT[],
    "complianceNotes" TEXT,
    "references" TEXT,
    "riskNotes" TEXT,
    "additionalComments" TEXT,
    "status" "PartnerStatus" NOT NULL DEFAULT 'APPLIED',
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "aiTriageNote" TEXT,
    "aiFlagged" BOOLEAN,
    "referralCode" TEXT,
    "referredByCode" TEXT,

    CONSTRAINT "PartnerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "status" "MatchStatus" NOT NULL DEFAULT 'SUGGESTED',
    "adminNote" TEXT,
    "confidenceScore" INTEGER,
    "nextAction" TEXT,
    "aiExplanation" TEXT,
    "releasedToCompany" BOOLEAN NOT NULL DEFAULT false,
    "releasedToPartner" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Introduction" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "status" "IntroductionStatus" NOT NULL DEFAULT 'PENDING',
    "channel" "IntroChannel" NOT NULL DEFAULT 'EMAIL',
    "summary" TEXT,
    "outcome" TEXT,
    "followUpDate" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "settledRate" DECIMAL(10,4),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Introduction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntroductionMessage" (
    "id" TEXT NOT NULL,
    "introductionId" TEXT NOT NULL,
    "authorId" TEXT,
    "authorLabel" TEXT NOT NULL,
    "authorSide" "NoteVisibility" NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntroductionMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevenueRecord" (
    "id" TEXT NOT NULL,
    "requestId" TEXT,
    "companyId" TEXT,
    "matchId" TEXT,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'INR',
    "type" "RevenueType" NOT NULL DEFAULT 'CUSTOM',
    "payerType" TEXT,
    "payerName" TEXT,
    "basis" TEXT,
    "status" "RevenueStatus" NOT NULL DEFAULT 'POTENTIAL',
    "dueDate" TIMESTAMP(3),
    "invoicedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "paymentLinkId" TEXT,
    "paymentLinkUrl" TEXT,
    "paymentRef" TEXT,
    "cryptoInvoiceId" TEXT,
    "cryptoInvoiceUrl" TEXT,
    "cryptoPaymentRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RevenueRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "visibility" "NoteVisibility" NOT NULL DEFAULT 'INTERNAL',
    "authorLabel" TEXT NOT NULL,
    "authorId" TEXT,
    "requestId" TEXT,
    "partnerId" TEXT,
    "matchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentRecord" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "note" TEXT,
    "visibility" "NoteVisibility" NOT NULL DEFAULT 'INTERNAL',
    "authorLabel" TEXT NOT NULL,
    "authorId" TEXT,
    "requestId" TEXT,
    "partnerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "actorId" TEXT,
    "actorLabel" TEXT NOT NULL,
    "requestId" TEXT,
    "partnerId" TEXT,
    "matchId" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ErrorLog" (
    "id" TEXT NOT NULL,
    "severity" "ErrorSeverity" NOT NULL DEFAULT 'ERROR',
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "source" TEXT NOT NULL,
    "url" TEXT,
    "userId" TEXT,
    "meta" JSONB,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErrorLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Counter" (
    "key" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Counter_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramLinkCode_key" ON "User"("telegramLinkCode");

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TwoFactorChallenge_token_key" ON "TwoFactorChallenge"("token");

-- CreateIndex
CREATE INDEX "TwoFactorChallenge_userId_idx" ON "TwoFactorChallenge"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyProfile_userId_key" ON "CompanyProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyProfile_referralCode_key" ON "CompanyProfile"("referralCode");

-- CreateIndex
CREATE UNIQUE INDEX "LiquidityRequest_reference_key" ON "LiquidityRequest"("reference");

-- CreateIndex
CREATE INDEX "LiquidityRequest_status_idx" ON "LiquidityRequest"("status");

-- CreateIndex
CREATE INDEX "LiquidityRequest_companyId_idx" ON "LiquidityRequest"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerProfile_userId_key" ON "PartnerProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerProfile_reference_key" ON "PartnerProfile"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerProfile_referralCode_key" ON "PartnerProfile"("referralCode");

-- CreateIndex
CREATE INDEX "PartnerProfile_status_idx" ON "PartnerProfile"("status");

-- CreateIndex
CREATE INDEX "Match_status_idx" ON "Match"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Match_requestId_partnerId_key" ON "Match"("requestId", "partnerId");

-- CreateIndex
CREATE INDEX "Introduction_matchId_idx" ON "Introduction"("matchId");

-- CreateIndex
CREATE INDEX "IntroductionMessage_introductionId_idx" ON "IntroductionMessage"("introductionId");

-- CreateIndex
CREATE UNIQUE INDEX "RevenueRecord_paymentLinkId_key" ON "RevenueRecord"("paymentLinkId");

-- CreateIndex
CREATE INDEX "RevenueRecord_status_idx" ON "RevenueRecord"("status");

-- CreateIndex
CREATE INDEX "Note_requestId_idx" ON "Note"("requestId");

-- CreateIndex
CREATE INDEX "Note_partnerId_idx" ON "Note"("partnerId");

-- CreateIndex
CREATE INDEX "DocumentRecord_requestId_idx" ON "DocumentRecord"("requestId");

-- CreateIndex
CREATE INDEX "DocumentRecord_partnerId_idx" ON "DocumentRecord"("partnerId");

-- CreateIndex
CREATE INDEX "AuditLog_requestId_idx" ON "AuditLog"("requestId");

-- CreateIndex
CREATE INDEX "AuditLog_partnerId_idx" ON "AuditLog"("partnerId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "ErrorLog_resolved_createdAt_idx" ON "ErrorLog"("resolved", "createdAt");

-- CreateIndex
CREATE INDEX "ErrorLog_severity_idx" ON "ErrorLog"("severity");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TwoFactorChallenge" ADD CONSTRAINT "TwoFactorChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyProfile" ADD CONSTRAINT "CompanyProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiquidityRequest" ADD CONSTRAINT "LiquidityRequest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CompanyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerProfile" ADD CONSTRAINT "PartnerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "LiquidityRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "PartnerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Introduction" ADD CONSTRAINT "Introduction_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntroductionMessage" ADD CONSTRAINT "IntroductionMessage_introductionId_fkey" FOREIGN KEY ("introductionId") REFERENCES "Introduction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenueRecord" ADD CONSTRAINT "RevenueRecord_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "LiquidityRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenueRecord" ADD CONSTRAINT "RevenueRecord_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CompanyProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenueRecord" ADD CONSTRAINT "RevenueRecord_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "LiquidityRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "PartnerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentRecord" ADD CONSTRAINT "DocumentRecord_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "LiquidityRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentRecord" ADD CONSTRAINT "DocumentRecord_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "PartnerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
