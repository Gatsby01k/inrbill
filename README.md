# INRP2P — Private INR Liquidity Network

INRP2P is the coordination layer for a private INR liquidity network. Qualified
companies submit INR liquidity requests (INR → USDT, USDT → INR, INR payouts);
liquidity partners apply to join; the operator reviews both sides manually,
creates matches, and releases qualified introductions. Every state change is
audited, and introduction fees are tracked from potential to paid.

**INRP2P never touches funds.** No custody, no wallets, no execution, no
settlement rails. It is not an exchange, OTC desk, wallet or payment gateway.
Counterparties transact directly, under their own agreements and their own
regulatory and compliance obligations. The product enforces this positioning
throughout its copy and its data model — there is deliberately no money-movement
code anywhere in this repository.

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

# 5. Run
npm run dev                  # http://localhost:3000
```

Verification toolchain:

```bash
npm run db:validate   # prisma validate
npm run db:generate   # prisma generate
npm run lint          # next lint
npm run typecheck     # tsc --noEmit
npm run build         # next build
```

## Demo login credentials

The seed creates a single operator account from `.env`
(defaults shown — **change both before going live**):

| Role     | Email               | Password            |
| -------- | ------------------- | ------------------- |
| Operator | `admin@inrp2p.local` | `inrp2p-admin-2026` |

There are **no** seeded companies or partners — that would be fake data. To try
the full loop, create real accounts through the product itself:

1. Open `/request` in a private window → submit a company request (this creates
   a company account + workspace).
2. Open `/apply` in another private window → submit a partner application.
3. Log in as the operator at `/login` → process both.

Re-running `npm run db:seed` resets the admin credentials from `.env`.

## The workspaces

**Public site** (`/`) — positioning, how it works, network standards, the
no-custody disclaimer, contact, and the two intake flows (`/request`, `/apply`),
each ending in a confirmation page with next steps.

**Admin** (`/admin`) — the operating system:

- Pipeline dashboard: requests / partners / matches / introductions by status, revenue by stage, latest activity.
- Requests: filterable table → detail page with full requirement, company contact, status control, match creation against eligible (Verified/Limited, direction-matching) partners, per-match release toggles (company / partner side), introduction records with channel + status, revenue records, notes (internal or shared), documents, full timeline.
- Partners: applications and network → detail page with operating profile, compliance readiness checklist, verification status control, matches, notes/documents, timeline.
- Matches: cross-pipeline view of all pairings and release states.
- Revenue: ledger with totals by status (Potential / Invoiced / Paid / Waived) per currency.
- Audit log: append-only history of every state change.

**Company** (`/company`) — submitted requests with live status, a progress
tracker (Submitted → In Review → Matching → Introduced → Closed), introduced
partners once the admin releases them, shared notes/documents, and a sanitized
timeline. Companies can submit further requests from inside the workspace.

**Partner** (`/partner`) — verification status with plain-language explanation,
matched requests once released (company identity stays private until the
introduction), self-service capacity/coverage updates (audited), shared
notes/documents.

## Statuses

| Entity       | Flow                                                                 |
| ------------ | -------------------------------------------------------------------- |
| Request      | Submitted → In Review → Matching → Introduced → Closed / Rejected    |
| Partner      | Applied → Under Review → Verified / Limited / Rejected / Suspended   |
| Match        | Suggested → Shortlisted → Introduced → Accepted / Declined           |
| Introduction | Pending → Sent → Responded → Successful / Failed                     |
| Revenue      | Potential → Invoiced → Paid / Waived                                 |

## Operating playbook — "Alex submits a request"

1. Alex submits at `/request` → request `REQ-0001` appears on your dashboard as **Submitted**; Alex gets a workspace and a confirmation page.
2. Open **Admin → Requests → REQ-0001**. Review requirement + KYB posture. Set status **In Review** (Alex sees this instantly in his timeline).
3. Check available partners in the *Add partner match* selector — it lists only Verified/Limited partners supporting the request's direction, with capacity and bank counts.
4. Create matches → they start as **Suggested**. Shortlist the strong ones (**Shortlisted**), set the request to **Matching**.
5. Make the actual introduction by email/Telegram, then record it on the match (channel + summary). Introduction starts **Pending**; mark **Sent** when made.
6. Release the match to the company (and to the partner) — Alex now sees the partner's coverage card in his workspace; the partner sees the requirement.
7. Record the fee on the request (e.g. "25 bps on first-month volume") as **Potential** revenue; move it to **Invoiced** → **Paid** as it lands.
8. Update introduction to **Responded / Successful**, match to **Accepted**, request to **Introduced** and later **Closed**. The audit log has kept every step.

## Security notes

- Passwords: bcrypt (cost 12). Sessions: 30-day random 256-bit tokens stored in
  PostgreSQL, httpOnly/SameSite=Lax cookies, secure in production.
- Middleware gates all workspace routes; every layout re-checks the role
  server-side; every server action re-authorizes independently.
- All input crosses a Zod schema before touching the database.
- Public forms carry a honeypot field; account enumeration is limited to a
  generic "account exists" message.
- The audit log is append-only by design — nothing in the UI edits or deletes it.

## Project structure

```
prisma/schema.prisma        data model: users, sessions, companies, requests,
                            partners, matches, introductions, revenue, notes,
                            documents, audit log
prisma/seed.ts              admin-only seed
src/middleware.ts           session-cookie gate for /admin /company /partner
src/lib/                    db, auth/sessions, audit, zod schemas, options, format
src/components/             ui kit, site chrome, forms, workspace shell/records
src/app/                    public pages + /admin /company /partner + server actions
```

## Configuration to review before launch

- `ADMIN_EMAIL` / `ADMIN_PASSWORD` — rotate, then re-run seed.
- `NEXT_PUBLIC_CONTACT_EMAIL` / `NEXT_PUBLIC_CONTACT_TELEGRAM` — your real
  channels (shown on the public site).
- Deployment specifics — see `DEPLOYMENT.md`.

## Legal note

This repository ships positioning copy and disclaimers, not legal advice.
Introduction/finder models touching INR corridors and digital assets carry real
regulatory nuance across jurisdictions — have counsel review your setup before
outreach.
