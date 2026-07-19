-- Move new partner-reserve intents from hosted invoices to the company's
-- configured USDT-TRC20 address. Existing provider records stay intact.
ALTER TABLE "PartnerDeposit"
  ADD COLUMN "destinationAddress" TEXT;

ALTER TABLE "PartnerDeposit"
  ALTER COLUMN "provider" SET DEFAULT 'DIRECT_TRC20';
