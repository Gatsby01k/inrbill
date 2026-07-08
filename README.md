# INRP2P — Private INR Liquidity Network

## Overview

INRP2P is the coordination layer for a private INR liquidity network. Qualified
companies submit INR liquidity requests (INR → USDT, USDT → INR, INR payouts,
or partner sourcing); liquidity partners apply to join; the operator reviews
both sides manually, creates matches, and releases qualified introductions.
Every state change is audited, and revenue (review, access, introduction,
success and retainer fees) is tracked from potential to paid.

## Business positioning

**"Stop searching for INR payout and liquidity partners in random chats."**
INRP2P positions itself as a private, reviewed network for INR payout and
liquidity partner introductions — the opposite of sourcing counterparties
through cold brokers and public Telegram groups. The product is the review,
matching and introduction layer; it is explicitly not a place where deals
execute.

### What the platform does

- Structured intake for company requests and partner applications.
- Manual review of every submission — no automated approvals, no paid listings.
- Requirements-based matching (direction, volume, banks, speed, jurisdiction).
- Qualified introductions, made directly by network operations.
- An append-only audit trail across every status change.
- Internal revenue tracking from potential fee through to paid.

### What the platform does **not** do

- **No custody.** INRP2P never holds, transmits or converts funds.
- **No execution.** It does not execute payments, payouts, or settlement.
- **No exchange.** It is not an exchange, OTC desk, or trading venue.
- **No guaranteed liquidity.** Partner capacity is declared and reviewed, not guaranteed.
- **No guaranteed completion.** An introduction is a qualified start, not a promise of a deal.
- **No guaranteed introduction.** Every request/application is reviewed manually and may be declined.

Counterparties are solely responsible for their own licensing, KYC, AML, tax
and legal obligations. This positioning is enforced throughout the product's
copy, its data model, and its public legal pages (see below) — there is
deliberately no money-movement code anywhere in this repository.

---

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · Prisma · PostgreSQL ·
cookie-based DB sessions · role-based access (ADMIN / COMPANY / PARTNER) ·
Zod validation · server actions · append-only audit log.

## Getting started

Prerequisites: Node 20+, a PostgreSQL database (local, Neon, Supabase, RDS…).

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env        # set DATABASE_URL + admin credentials

# 3. Database schema
npx prisma migrate dev --name init   # dev (creates migration + applies)
#   — or, for a quick start without migration files:
# npx prisma db push

# 4. Seed (creates ONE admin user, nothing else)
npm run db:seed

# 4b. Optional — populate a full demo pipeline (see "Demo mode" below)
npm run db:seed:demo

# 5. Run
npm run dev                  # http://localhost:3000
```

### Env vars

| Var | Purpose |
| --- | --- |
| `DATABASE_URL` | Pooled Postgres connection string (app runtime). |
| `DATABASE_URL_UNPOOLED` | Direct connection, used by `prisma migrate` / `db push`. |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` | Operator account created/reset by `npm run db:seed`. |
| `NEXT_PUBLIC_SITE_URL` | Canonical production URL — sitemap, canonical tags, Open Graph. |
| `NEXT_PUBLIC_CONTACT_EMAIL`, `NEXT_PUBLIC_CONTACT_TELEGRAM` | Shown on the public site and legal pages. |
| `NEXT_PUBLIC_APP_VERSION` *(optional)* | Human-readable build tag shown in the operator sidebar. Falls back to the platform commit SHA, then `dev`. |

See `.env.example` for the full, copy-pasteable list.

### Prisma / database commands

```bash
npm run db:validate   # prisma validate — checks schema.prisma is well-formed
npm run db:generate   # prisma generate — regenerates the typed client
npm run db:push       # prisma db push — sync schema to DB without migration files
npm run db:deploy     # prisma migrate deploy — apply committed migrations
npm run db:seed       # real seed — one operator account, nothing else
npm run db:seed:demo  # demo seed — full walkable pipeline (see below)
```

### Build / verification commands

```bash
npm run lint          # next lint
npm run typecheck     # tsc --noEmit
npm run build         # prisma generate && next build
```

## Demo mode

`npm run db:seed:demo` (script: `prisma/seed-demo.ts`) populates a fully
walkable pipeline on top of whatever is already in the database:

- 3 demo companies, 5 demo partners (mixed `VERIFIED` / `LIMITED` /
  `UNDER_REVIEW` / `REJECTED` statuses), each with a login.
- 3 realistic company requests across all three corridors.
- 5 matches with decision-support notes (confidence score, next action).
- 3 introductions, including 1 marked `SUCCESSFUL`.
- 4 revenue records spanning `POTENTIAL`, `AGREED`, `INVOICED` and `PAID`.
- Matching audit log entries for every record created above.

Every demo record's display name is prefixed **`[DEMO]`** and uses an
`@inrp2p.demo` email — it can never be mistaken for real traction in the
admin UI or shown externally as evidence of real volume. The script is
**idempotent**: every write is keyed on a fixed id or a unique field, so
re-running it updates the same rows instead of duplicating data. It never
touches the real seed's operator account credentials.

Demo company/partner logins: `demo-company-1@inrp2p.demo` …
`demo-partner-5@inrp2p.demo`, password `inrp2p-demo-2026` (see the script for
the full list). Change or remove demo data before a real launch — it's meant
for internal walkthroughs and screenshots, not production.

## The workspaces

**Public site** (`/`) — premium dark-accented fintech landing page: hero with
dual CTAs, problem framing (random brokers, Telegram noise, no review trail),
what INRP2P does / does not do, company flow, partner flow, network standards,
a private-beta callout, FAQ, and the two intake flows (`/request`, `/apply`),
each ending in a confirmation page that explains manual review and sets
expectations honestly (no guaranteed introduction, no guaranteed liquidity).

**Legal / trust pages** — `/terms`, `/privacy`, `/disclaimer`, `/how-it-works`,
`/partner-review`, `/fees`, `/prohibited-use`. Linked from the footer on every
page. All copy is calm and premium, not alarming, and consistently states the
no-custody / no-execution / no-exchange / no-guarantee positioning. **This is
product copy, not legal advice — see "Legal note" below.**

**Admin** (`/admin`) — the operating system:

- Pipeline dashboard: requests / partners by status, an **operator queue**
  (pending matches, follow-ups due, successful introductions, high-risk
  items, revenue pipeline vs. paid), matches/introductions/revenue by status,
  latest activity.
- Requests: filterable table → detail page with full requirement (type,
  volume, ticket size, urgency, countries involved, compliance notes,
  preferred partner requirements), status control, match creation with
  decision-support fields (confidence score, next action), introduction
  records (channel, status, outcome, follow-up date), revenue records (type,
  payer, due date), notes, documents, full timeline.
- Partners: applications and network → detail page with operating profile
  (capacity, ticket range, settlement preference, operating country),
  compliance checklist, risk notes, verification status control, matches,
  notes/documents, timeline.
- Matches: cross-pipeline view with confidence score and next action columns.
- Revenue: ledger with type, payer, due/paid dates, totals by status per currency.
- Audit log: append-only history of every state change.

**Company** (`/company`) — submitted requests with live status, a progress
tracker (Submitted → In Review → Matching → Introduced → Closed), introduced
partners once the admin releases them, shared notes/documents, a sanitized
timeline, and a plain-language "what INRP2P does / does not do" panel.

**Partner** (`/partner`) — verification status with plain-language explanation,
matched requests once released (company identity stays private until the
introduction), self-service capacity/ticket/settlement updates (audited),
shared notes/documents, and a "clear rules" panel (no public order book, no
guaranteed volume, no endorsement).

## Statuses

| Entity       | Flow                                                                 |
| ------------ | --------------------------------------------------------------------- |
| Request      | Submitted → In Review → Matching → Introduced → Closed / Rejected     |
| Partner      | Applied → Under Review → Verified / Limited / Rejected / Suspended    |
| Match        | Suggested → Shortlisted → Introduced → Accepted / Declined            |
| Introduction | Pending → Sent → Responded → Successful / Failed                      |
| Revenue      | Potential → Quoted → Agreed → Invoiced → Paid / Cancelled / Lost / Waived |

Matches also carry a `confidenceScore` (0–100) and free-text `nextAction` —
**decision-support only**, never used to automate a financial decision.
Introductions carry `followUpDate` and `outcome` for follow-up tracking.
Revenue records carry a `type` (`REVIEW_FEE`, `PARTNER_ACCESS`, `INTRO_FEE`,
`SUCCESS_FEE`, `MONTHLY_RETAINER`, `CUSTOM`) plus `payerType`/`payerName`.

## Operating playbook — "Alex submits a request"

1. Alex submits at `/request` → request `REQ-0001` appears on your dashboard as **Submitted**; Alex gets a workspace and a confirmation page that explains manual review and that an introduction is not guaranteed.
2. Open **Admin → Requests → REQ-0001**. Review requirement + KYB posture. Set status **In Review**.
3. Check the *Add partner match* selector — Verified/Limited partners supporting the request's direction, with capacity and bank counts.
4. Create matches → set a confidence score and next action for each. Move the request to **Matching**.
5. Make the actual introduction by email/Telegram, record it on the match (channel + summary), set a follow-up date.
6. Release the match to the company (and to the partner) — Alex sees the partner's coverage card; the partner sees the requirement.
7. Record the fee on the request (type + amount + payer) as **Potential** → **Agreed** → **Invoiced** → **Paid**.
8. Update introduction outcome, match to **Accepted**, request to **Introduced** and later **Closed**. The audit log has kept every step.

## Security notes

- Passwords: bcrypt (cost 12). Sessions: 30-day random 256-bit tokens stored in
  PostgreSQL, httpOnly/SameSite=Lax cookies, secure in production.
- Middleware gates all workspace routes; every layout re-checks the role
  server-side; every server action re-authorizes independently.
- All input crosses a Zod schema before touching the database.
- Public forms carry a honeypot field; account enumeration is limited to a
  generic "account exists" message.
- The audit log is append-only by design in the running app (the `audit()`
  helper only ever creates rows) — nothing in the UI edits or deletes it. The
  demo seed script is the one deliberate exception (it upserts fixed-id demo
  audit rows so it stays idempotent on re-run).
- Error boundaries (`error.tsx`, `global-error.tsx`) log only the error
  message and Next.js's error digest — never request bodies, credentials, or
  other PII.

## Ops readiness / runbook

- **Version marker.** The operator sidebar shows `Build <version>` —
  set `NEXT_PUBLIC_APP_VERSION` in your deploy pipeline to a release tag
  (falls back to the platform commit SHA, then `dev`).
- **Error / loading / not-found states.** `error.tsx` and `global-error.tsx`
  catch route and root-layout failures with a calm retry screen;
  `not-found.tsx` handles missing records; `admin/company/partner` each have
  a `loading.tsx` skeleton for slower navigations.
- **Backups.** Use your Postgres provider's point-in-time recovery (Neon,
  Supabase) or schedule `pg_dump` on a VPS. Test a restore before launch —
  an untested backup is not a backup.
- **Incident response (starting point).**
  1. Confirm scope (is it the DB, the app, or a specific integration?).
  2. If data-affecting, freeze writes by pausing admin status-change actions
     (redeploy with maintenance banner, or revoke DB write role temporarily).
  3. Check the audit log first — it is the fastest way to see exactly what
     changed and when.
  4. Communicate status to affected companies/partners directly — do not
     rely on the public site to convey incident status.
  5. Restore from backup only as a last resort; prefer forward-fixing from
     the audit trail where possible.
- **Production env checklist** — see below.

## Private beta launch checklist

- [ ] Rotate `ADMIN_EMAIL` / `ADMIN_PASSWORD`, re-run `npm run db:seed`, store
      the password in a password manager.
- [ ] Set real `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_CONTACT_EMAIL`,
      `NEXT_PUBLIC_CONTACT_TELEGRAM` and redeploy.
- [ ] Set `NEXT_PUBLIC_APP_VERSION` in CI to a release tag.
- [ ] Run `npm run typecheck && npm run lint && npm run build` clean.
- [ ] Run `npx prisma validate && npx prisma generate` clean, then apply the
      schema to production (`prisma migrate deploy` or `db push`).
- [ ] Decide whether to run `npm run db:seed:demo` on the production database
      at all — for a real private beta, prefer leaving it empty and only
      using demo data on a staging environment.
- [ ] Submit one real request and one real application end-to-end; process
      them fully in admin (review → match → introduce → revenue) to confirm
      the whole loop and the audit trail.
- [ ] Configure automated Postgres backups and confirm a test restore.
- [ ] Add uptime monitoring on `/` and `/login`.
- [ ] Have counsel review `/terms`, `/privacy`, `/disclaimer`,
      `/prohibited-use` and `/fees` for your operating jurisdictions before
      taking real submissions.
- [ ] Confirm mobile layout on the landing page, both intake forms, and all
      three workspaces.

See `DEPLOYMENT.md` for platform-specific deploy steps (Vercel + managed
Postgres, or a single VPS).

## Project structure

```
prisma/schema.prisma        data model: users, sessions, companies, requests,
                            partners, matches, introductions, revenue, notes,
                            documents, audit log
prisma/seed.ts              real seed — admin account only
prisma/seed-demo.ts         demo seed — full walkable pipeline, idempotent
src/middleware.ts           session-cookie gate for /admin /company /partner
src/lib/                    db, auth/sessions, audit, zod schemas, options, format
src/components/             ui kit, site chrome, legal-page shell, forms,
                            workspace shell/records
src/app/                    public pages, legal pages, /admin /company /partner,
                            server actions, error/loading/not-found boundaries
```

## Legal note

This repository ships positioning copy, disclaimers and legal-style page
templates (`/terms`, `/privacy`, `/disclaimer`, `/fees`, `/prohibited-use`,
`/partner-review`, `/how-it-works`) — **not legal advice.** Introduction/finder
models touching INR corridors and digital assets carry real regulatory nuance
across jurisdictions. Have counsel review the legal pages, the fee structure,
and your operating model for every jurisdiction you plan to operate in before
taking real submissions or public traffic.
