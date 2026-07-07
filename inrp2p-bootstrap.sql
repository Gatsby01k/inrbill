-- ============================================================
-- INRP2P — bootstrap SQL (schema + admin user)
-- Run once in the Neon SQL Editor (or any psql) on an empty DB.
-- Matches prisma/schema.prisma exactly. Safe to re-run.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Enums ────────────────────────────────────────────────────
DO $$ BEGIN CREATE TYPE "Role" AS ENUM ('ADMIN','COMPANY','PARTNER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "Direction" AS ENUM ('INR_TO_USDT','USDT_TO_INR','INR_PAYOUTS'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "RequestStatus" AS ENUM ('SUBMITTED','IN_REVIEW','MATCHING','INTRODUCED','CLOSED','REJECTED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "PartnerStatus" AS ENUM ('APPLIED','UNDER_REVIEW','VERIFIED','LIMITED','REJECTED','SUSPENDED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "MatchStatus" AS ENUM ('SUGGESTED','SHORTLISTED','INTRODUCED','ACCEPTED','DECLINED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "IntroductionStatus" AS ENUM ('PENDING','SENT','RESPONDED','SUCCESSFUL','FAILED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "RevenueStatus" AS ENUM ('POTENTIAL','INVOICED','PAID','WAIVED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "NoteVisibility" AS ENUM ('INTERNAL','COMPANY','PARTNER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "IntroChannel" AS ENUM ('EMAIL','TELEGRAM','CALL','OTHER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "Currency" AS ENUM ('INR','USDT','USD'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Tables ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "role" "Role" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

CREATE TABLE IF NOT EXISTS "Session" (
  "id" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Session_token_key" ON "Session"("token");
CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");

CREATE TABLE IF NOT EXISTS "CompanyProfile" (
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
  CONSTRAINT "CompanyProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CompanyProfile_userId_key" ON "CompanyProfile"("userId");

CREATE TABLE IF NOT EXISTS "LiquidityRequest" (
  "id" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "direction" "Direction" NOT NULL,
  "dailyVolumeBand" TEXT NOT NULL,
  "monthlyVolumeBand" TEXT NOT NULL,
  "banks" TEXT[],
  "methods" TEXT[],
  "requiredSpeed" TEXT NOT NULL,
  "jurisdiction" TEXT NOT NULL,
  "kycReadiness" TEXT NOT NULL,
  "kycNotes" TEXT,
  "notes" TEXT,
  "status" "RequestStatus" NOT NULL DEFAULT 'SUBMITTED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LiquidityRequest_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "LiquidityRequest_reference_key" ON "LiquidityRequest"("reference");
CREATE INDEX IF NOT EXISTS "LiquidityRequest_status_idx" ON "LiquidityRequest"("status");
CREATE INDEX IF NOT EXISTS "LiquidityRequest_companyId_idx" ON "LiquidityRequest"("companyId");

CREATE TABLE IF NOT EXISTS "PartnerProfile" (
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
  "workingHours" TEXT NOT NULL,
  "reserveBand" TEXT NOT NULL,
  "jurisdictions" TEXT NOT NULL,
  "complianceFlags" TEXT[],
  "complianceNotes" TEXT,
  "status" "PartnerStatus" NOT NULL DEFAULT 'APPLIED',
  "verifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PartnerProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "PartnerProfile_userId_key" ON "PartnerProfile"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "PartnerProfile_reference_key" ON "PartnerProfile"("reference");
CREATE INDEX IF NOT EXISTS "PartnerProfile_status_idx" ON "PartnerProfile"("status");

CREATE TABLE IF NOT EXISTS "Match" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "partnerId" TEXT NOT NULL,
  "status" "MatchStatus" NOT NULL DEFAULT 'SUGGESTED',
  "adminNote" TEXT,
  "releasedToCompany" BOOLEAN NOT NULL DEFAULT false,
  "releasedToPartner" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Match_requestId_partnerId_key" ON "Match"("requestId","partnerId");
CREATE INDEX IF NOT EXISTS "Match_status_idx" ON "Match"("status");

CREATE TABLE IF NOT EXISTS "Introduction" (
  "id" TEXT NOT NULL,
  "matchId" TEXT NOT NULL,
  "status" "IntroductionStatus" NOT NULL DEFAULT 'PENDING',
  "channel" "IntroChannel" NOT NULL DEFAULT 'EMAIL',
  "summary" TEXT,
  "sentAt" TIMESTAMP(3),
  "respondedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Introduction_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Introduction_matchId_idx" ON "Introduction"("matchId");

CREATE TABLE IF NOT EXISTS "RevenueRecord" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "matchId" TEXT,
  "amount" DECIMAL(18,2) NOT NULL,
  "currency" "Currency" NOT NULL DEFAULT 'INR',
  "basis" TEXT,
  "status" "RevenueStatus" NOT NULL DEFAULT 'POTENTIAL',
  "invoicedAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RevenueRecord_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "RevenueRecord_status_idx" ON "RevenueRecord"("status");

CREATE TABLE IF NOT EXISTS "Note" (
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
CREATE INDEX IF NOT EXISTS "Note_requestId_idx" ON "Note"("requestId");
CREATE INDEX IF NOT EXISTS "Note_partnerId_idx" ON "Note"("partnerId");

CREATE TABLE IF NOT EXISTS "DocumentRecord" (
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
CREATE INDEX IF NOT EXISTS "DocumentRecord_requestId_idx" ON "DocumentRecord"("requestId");
CREATE INDEX IF NOT EXISTS "DocumentRecord_partnerId_idx" ON "DocumentRecord"("partnerId");

CREATE TABLE IF NOT EXISTS "AuditLog" (
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
CREATE INDEX IF NOT EXISTS "AuditLog_requestId_idx" ON "AuditLog"("requestId");
CREATE INDEX IF NOT EXISTS "AuditLog_partnerId_idx" ON "AuditLog"("partnerId");
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

CREATE TABLE IF NOT EXISTS "Counter" (
  "key" TEXT NOT NULL,
  "value" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "Counter_pkey" PRIMARY KEY ("key")
);

-- ── Foreign keys (skip if already present) ───────────────────
DO $$ BEGIN
  ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "CompanyProfile" ADD CONSTRAINT "CompanyProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "PartnerProfile" ADD CONSTRAINT "PartnerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "LiquidityRequest" ADD CONSTRAINT "LiquidityRequest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CompanyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "Match" ADD CONSTRAINT "Match_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "LiquidityRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "Match" ADD CONSTRAINT "Match_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "PartnerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "Introduction" ADD CONSTRAINT "Introduction_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "RevenueRecord" ADD CONSTRAINT "RevenueRecord_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "LiquidityRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "RevenueRecord" ADD CONSTRAINT "RevenueRecord_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "Note" ADD CONSTRAINT "Note_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "LiquidityRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "Note" ADD CONSTRAINT "Note_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "PartnerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "Note" ADD CONSTRAINT "Note_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "DocumentRecord" ADD CONSTRAINT "DocumentRecord_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "LiquidityRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "DocumentRecord" ADD CONSTRAINT "DocumentRecord_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "PartnerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Admin user (bcrypt via pgcrypto) ─────────────────────────
-- Login:    admin@inrp2p.local
-- Password: inrp2p-admin-2026        ← CHANGE AFTER FIRST LOGIN
INSERT INTO "User" ("id","email","passwordHash","name","role")
VALUES (
  'seed_admin_0000000000000',
  'admin@inrp2p.local',
  crypt('inrp2p-admin-2026', gen_salt('bf', 12)),
  'Network Operator',
  'ADMIN'
)
ON CONFLICT ("email") DO UPDATE
  SET "passwordHash" = EXCLUDED."passwordHash",
      "role" = 'ADMIN';

-- Done. Open /login and sign in.
