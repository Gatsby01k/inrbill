# Deploying INRP2P

The app is a standard Next.js App Router project with PostgreSQL via Prisma —
it deploys anywhere Next.js runs. Two proven paths below.

## Option A — Vercel + managed Postgres (fastest)

1. **Database.** Create a PostgreSQL instance (Neon, Supabase, Vercel Postgres,
   RDS). Copy the connection string. For serverless, prefer a pooled connection
   string (Neon's `-pooler` host, or Supabase's pgBouncer port 6543 with
   `?pgbouncer=true`).
2. **Import the repo** into Vercel (push to GitHub/GitLab first).
3. **Environment variables** (Vercel → Project → Settings → Environment Variables):
   - `DATABASE_URL` — the pooled connection string
   - `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`
   - `NEXT_PUBLIC_CONTACT_EMAIL`, `NEXT_PUBLIC_CONTACT_TELEGRAM`
4. **Schema + seed** (run locally against the production `DATABASE_URL`, once):
   ```bash
   DATABASE_URL="postgres://…" npx prisma migrate deploy   # or: npx prisma db push
   DATABASE_URL="postgres://…" ADMIN_EMAIL=… ADMIN_PASSWORD=… npm run db:seed
   ```
5. **Deploy.** Vercel runs `next build` (which runs `prisma generate` via
   dependency postinstall). If generate is ever skipped by caching, set the
   project's build command to `prisma generate && next build`.
6. Attach your domain, force HTTPS (default on Vercel).

## Option B — Single VPS (full control)

```bash
# Ubuntu 22+, as a non-root user
sudo apt install -y nodejs npm postgresql nginx     # or install Node 20 via nodesource
sudo -u postgres createuser inrp2p -P && sudo -u postgres createdb inrp2p -O inrp2p

git clone <your-repo> && cd inrp2p
cp .env.example .env                                 # set real values
npm ci
npx prisma migrate deploy                            # or db push
npm run db:seed
npm run build
```

Run under a process manager and reverse-proxy:

```bash
npm i -g pm2
pm2 start "npm run start" --name inrp2p             # listens on :3000
pm2 save && pm2 startup
```

Point nginx at `localhost:3000` with TLS (certbot). Set
`NODE_ENV=production` (npm start does this) so session cookies are `Secure`.

## Post-deploy checklist

- [ ] Log in at `/login` with the seeded admin account — then change the
      password (update `.env`, re-run seed) and store it in a password manager.
- [ ] Set real `NEXT_PUBLIC_CONTACT_EMAIL` / `NEXT_PUBLIC_CONTACT_TELEGRAM` and redeploy.
- [ ] Submit a real test request and application end-to-end; process them in
      admin; delete nothing — this is your first audit history.
- [ ] Configure automated Postgres backups (Neon/Supabase have point-in-time
      recovery; on a VPS schedule `pg_dump`).
- [ ] Add uptime monitoring on `/` and `/login`.
- [ ] Have counsel review the public copy and disclaimer for your jurisdictions.

## Notes

- Every workspace page is rendered dynamically per-request (session cookie), so
  no data is ever baked into static HTML at build time; `next build` does not
  need database access.
- Sessions live in PostgreSQL — restarting the app never logs users out, and
  revoking a session is a row delete.
- Scale-up path: the schema already separates matches, introductions and
  revenue, so reporting can grow without remodeling. Add read replicas or
  connection pooling (pgBouncer) before anything else.
