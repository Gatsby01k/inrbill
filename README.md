# INRP2P

INRP2P is a controlled INR ↔ USDT transaction system. A customer enters one
amount, sees executable final terms, authenticates, adds only the required
payment source and destination, confirms, pays, and tracks one server-enforced
order.

It is not a public exchange, order book, trader marketplace, or self-custody
wallet. Pricing and settlement fail closed when real providers or
operator-controlled execution terms are unavailable. The preserved private
network workspaces handle verification, exact liquidity capacity, evidence,
operations, reconciliation, and audit behind the customer interface. The
application never requests a bank password, private key, or seed phrase.

## What is implemented

- A public, server-priced INR ↔ USDT quote with Indian shorthand amount input.
- Passwordless customer email OTP after quote, with quote context preserved.
- Progressive customer verification and encrypted bank, UPI, and wallet methods.
- One explicit order state machine; no arbitrary status update endpoint.
- Transactional, idempotent liquidity reservation with separate declared,
  available, reserved, pending, and settled balances.
- UPI deep links and local QR, bank/IMPS instructions, USDT network validation,
  payment submission, live order progress, receipts, and fresh-quote repeat.
- Signed payment-matching and settlement webhooks with replay protection,
  exact-amount checks, unique UTR/TXID/payout references, and conflict review.
- Operator action queue, TOTP step-up, granular permissions, maker-checker
  support, double-payment shield, safe reassignment, and immutable audit events.
- Receive Profiles, ordered fallbacks, user-controlled INRP2P IDs, and
  rate-limited payment-request pages with amount, memo, expiry, and usage limits.
- Preserved role-separated operator, company, and liquidity-partner workspaces.
- Email ownership verification, single-use password recovery and session revocation.
- Database-backed abuse limiting plus Cloudflare Turnstile on public intake.
- Private company-to-partner invitations with explicit acceptance and pause states.
- Partner verification cases, normalized provider checks and accountable manual review.
- Evidence uploads to a private S3-compatible vault using short-lived signed URLs,
  mandatory KMS encryption headers and forced-attachment downloads.
- Time-bounded capacity declarations by direction and deterministic eligibility/ranking.
- Match offers with accept/decline/expiry flow; no automated financial decision.
- Incident tracking and audit events across material network operations.
- Signed, replay-resistant inbound webhook handling for notification integrations.
- Health endpoint, scheduled maintenance hook, security headers and CI quality gate.
- An immediate quote interface on the logged-out landing route.

## Stack

Next.js 15 App Router, React 19, TypeScript, Prisma 6, PostgreSQL, Tailwind CSS,
Zod and database-backed opaque sessions.

Use Node.js 20 or newer.

## Local setup

```bash
npm ci
cp .env.example .env
# Set both database URLs and strong seed credentials.
npm run db:deploy
npm run db:seed
npm run dev
```

Open `http://localhost:3000`. Customer OTP requires working email delivery, or
`CUSTOMER_OTP_DEV_CODE` outside production. A quote requires a configured
execution provider or operator-controlled execution rate; unavailable services
are shown as unavailable rather than simulated.

Do not run the demo seed against production. For an isolated staging database:

```bash
DEMO_PASSWORD='a-unique-staging-password' npm run db:seed:demo
```

## Quality gate

```bash
DATABASE_URL='postgresql://user:pass@localhost:5432/inrp2p' \
DATABASE_URL_UNPOOLED='postgresql://user:pass@localhost:5432/inrp2p' \
npm run check
```

The same validation runs in `.github/workflows/quality.yml`: schema validation,
lint, static types, deterministic unit tests and a production Next.js build.

## Database migrations

Fresh databases can run `npm run db:deploy` directly. The repository contains a
complete baseline, private-network migrations, and the transaction-engine
migration `20260723000100_transaction_engine`.

For a database created by an older version of this application, first take a
verified backup and compare its schema with the baseline. Mark the baseline as
applied only if the database already contains that exact baseline:

```bash
npx prisma migrate resolve --applied 20260715000100_baseline
npm run db:deploy
```

Never use `prisma db push` for a production upgrade. Review the generated SQL and
perform the first upgrade in staging before the live database.

## Production requirements

The application fails closed when a required financial integration or encryption
key is missing. Email must be configured for customer OTP and member account
ownership. Evidence uploads stay disabled until the encrypted object vault is
configured.

The minimum launch configuration is:

- PostgreSQL with automated backups and point-in-time recovery.
- `NEXT_PUBLIC_SITE_URL`, contact details and a release version.
- Resend credentials and a verified sending domain.
- A 32-byte financial-data encryption key and separate HMAC key.
- An executable quote provider or a deliberately managed execution rate and fee.
- A real payment-matching provider and/or controlled manual verification process.
- A real settlement provider, or an operator process that records only transfers
  that actually occurred externally.
- Signed payment and settlement webhook secrets; a production blockchain
  confirmation threshold.
- Cloudflare Turnstile public and secret keys.
- A high-entropy `CRON_SECRET` if the scheduled maintenance route is enabled.
- Private S3 + KMS credentials before collecting verification evidence.
- A checksum-valid public `USDT_TRC20_DEPOSIT_ADDRESS` before enabling partner reserves.
- Real operator credentials stored in a password manager, not in source control.

See `.env.example` for every supported integration and [DEPLOYMENT.md](DEPLOYMENT.md)
for the release runbook.

## Core transaction flow

1. The server returns executable final terms for the amount and direction.
2. The customer authenticates without losing the pending quote.
3. Only corridor-required verification and payment methods are requested.
4. Hold-to-confirm reruns quote, limit, method, compliance, and exact-capacity checks.
5. One transaction reserves capacity and creates the order, leg, assignment,
   payment instruction, reconciliation record, and audit event.
6. A customer payment signal never confirms funds by itself. A signed provider
   event or authorised operator confirms payment.
7. Settlement release requires permission, TOTP, valid state, idempotency,
   double-payment checks, and optional maker-checker separation.
8. Final network or payout confirmation settles capacity, completes
   reconciliation, and produces one customer receipt.

## Security boundary

- Passwords are bcrypt hashes; opaque session and recovery tokens are stored as hashes.
- All private reads and writes are re-authorized on the server.
- State transitions are allow-listed; approval cannot be skipped by changing form data.
- Sensitive financial fields use AES-256-GCM; equality checks use keyed HMAC
  fingerprints and UI values are masked outside owner/operator views.
- Capacity mutation, order creation, link use, and audit writes are transactional.
- Webhooks validate the raw-body HMAC, exact amount/currency, unique references,
  and immutable replay records before changing state.
- Public automation is deterministic and eligibility-based. AI is optional operator
  assistance and never approves a party, routes money or makes a financial decision.
- Object evidence is never proxied through a public route or rendered inline.
- Integration secrets, production evidence and identity documents must never be added
  to this repository.

## Legal and commercial readiness

The included terms, privacy and disclaimer pages are product templates, not legal
advice. Before accepting live Indian counterparties or charging transaction-linked
fees, obtain jurisdiction-specific advice on the exact operating model, virtual-asset
exposure, AML/KYB obligations, data retention, privacy and marketing claims.

Code readiness does not create liquidity. Launch as a controlled private beta with a
small number of reviewed partners, published response-time standards and no claims of
guaranteed volume, guaranteed safety or guaranteed completion.
