# Runbook

## Environments

| | Database | App |
|---|---|---|
| Local | Postgres.app 18, `postgresql://localhost:5432/finance_tracker` (+ `finance_tracker_test`) | `pnpm dev` |
| Production | Neon (eu-west-2), pooled URL as `DATABASE_URL` on Vercel; locally kept as `DATABASE_URL_PROD` | Vercel hobby |

Optional email (password resets, invite emails): set `RESEND_API_KEY` (and `EMAIL_FROM` once you verify a domain in Resend); without it, reset links land in the server log and invite links are copy-paste. Secrets live in `.env.local` locally and in Vercel env vars in production: `DATABASE_URL`, `BETTER_AUTH_SECRET` (32+ random bytes; a different one from local), `BETTER_AUTH_URL` (the public origin). Never set `FIXED_TODAY` in production.

### Local vs production

| | Local | Production |
|---|---|---|
| App reads | `DATABASE_URL` (Postgres.app) via `pnpm dev` | `DATABASE_URL` (Neon pooled) set in Vercel |
| Migrate | `pnpm db:migrate` | `pnpm db:migrate:prod` from your machine (uses `DATABASE_URL_PROD`, direct endpoint) |
| Seed | `pnpm db:seed` / `pnpm db:reset` | `pnpm db:seed:prod` with real `SEED_USER*` values, or sign up in the deployed app and import the workbook in onboarding. `--reset` is refused for prod. |
| Inspect | `pnpm db:studio` | `pnpm db:studio:prod` |
| Tests | `pnpm test` (uses `DATABASE_URL_TEST`), `pnpm test:e2e` | never against prod |

`DB_TARGET=prod` is the only switch; the app code never reads `DATABASE_URL_PROD`.

### Deploying to Vercel

1. `pnpm db:migrate:prod` (creates the tables on Neon; re-run after every new migration).
2. In Vercel: import the project (GitHub) or `pnpm dlx vercel` from this folder; framework Next.js, Node 22, build `pnpm build`.
3. Env vars: `DATABASE_URL` = Neon pooled URL, `BETTER_AUTH_SECRET` = fresh `openssl rand -base64 32`. `BETTER_AUTH_URL` is optional on Vercel: the auth origin is derived from each request (production URL, preview URLs and `*.vercel.app` are all trusted). Set it to `https://yourdomain` when you attach a custom domain, then redeploy. Env var changes apply on the next deployment.
4. First visit `/register` creates the household; upload the workbook in onboarding; invite your partner from Settings.

## Migrations

```bash
pnpm db:generate   # after editing src/server/db/schema/*.ts -> drizzle/NNNN_*.sql
pnpm db:migrate    # applies pending migrations to DATABASE_URL
```

Migrations are plain SQL under `drizzle/` and are applied by `drizzle-kit migrate` (locally, in CI, and as a Vercel build step: `pnpm db:migrate && pnpm build`).

## Seed / reset (development only)

```bash
pnpm db:seed             # empty DB -> two accounts + the workbook imported
pnpm db:reset            # wipes every table first
```

Accounts come from `SEED_USER1_EMAIL` / `SEED_USER1_PASSWORD` and `SEED_USER2_*` (defaults in `.env.example`). The seed reads `data/Ade_P_Finance_Tracker_v2.xlsx` (`SEED_WORKBOOK` to override).

## Backups

`.github/workflows/backup.yml` runs `pg_dump --format=custom` nightly at 02:15 UTC, gzips it, uploads to the bucket in `BACKUP_BUCKET`, deletes objects older than 30 days, and also attaches the dump as a 30-day workflow artifact.

## Restore

1. Fetch the dump: `aws s3 cp s3://<bucket>/<prefix>/finance-tracker-<stamp>.dump.gz .` (or download the workflow artifact).
2. `gunzip finance-tracker-<stamp>.dump.gz`
3. Point at an **empty** database (a fresh Neon branch or `createdb finance_tracker_restore`):
   ```bash
   pg_restore --no-owner --no-privileges --clean --if-exists -d "$TARGET_URL" finance-tracker-<stamp>.dump
   ```
4. Sanity check: `psql "$TARGET_URL" -c "select count(*) from transactions; select email from auth_user;"`
5. Swap `DATABASE_URL` in Vercel to the restored database and redeploy. Sessions survive (they live in `auth_session`); users do not need to sign in again unless the dump predates their session.

Time to restore is minutes; the schema is small and every table carries `household_id`, so a partial restore of one household is a filtered `pg_dump -t` if ever needed.

## Local Postgres.app

- Binaries: `/Applications/Postgres.app/Contents/Versions/latest/bin/{psql,pg_dump,pg_restore,createdb}`
- Data: `~/Library/Application Support/Postgres/var-18`
- Local dump: `pg_dump postgresql://localhost:5432/finance_tracker --format=custom --file local.dump`

### Postgres.app client permissions

Postgres.app 18 asks once per client executable before it may connect (`FATAL: You did not confirm the permission dialog`). Each Node binary counts separately: the nvm `node v22.21.1` used by `pnpm dev` / `next start` needs to be allowed in **Postgres.app > Settings > Client Applications** (or by clicking Allow when the dialog appears). The current allow-list is visible with `defaults read com.postgresapp.Postgres2 ClientApplicationPermissions`.
