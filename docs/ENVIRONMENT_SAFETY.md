# Environment & Database Safety Guide

This document explains how to configure, deploy, and upgrade SckoolSuite without risking production data.

## Required environment variables

Copy `.env.example` to `.env.local` and provide real values for at least:

- `DATABASE_URL` — PostgreSQL connection string.
- `NEXTAUTH_URL` — Canonical application URL.
- `NEXTAUTH_SECRET` — Strong random secret (`openssl rand -base64 32`).
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` — File uploads.

Optional variables:

- `PG_POOL_MAX` — Connection pool size.
- `PG_SSL_DISABLED=true` — Disable SSL for local PostgreSQL only.
- `RESEND_API_KEY`, `FROM_EMAIL` — Email notifications.
- `NEXT_PUBLIC_APP_URL` — Public app URL used in email links.

## Environment file handling

- `.env.local` contains secrets and is ignored by Git.
- `.env.example` is a committed template with placeholder values.
- Never commit files containing passwords, API keys, or `NEXTAUTH_SECRET`.

## Local SSL for PostgreSQL

Managed PostgreSQL providers require SSL. The pool automatically uses `rejectUnauthorized: false` in production.

Local PostgreSQL usually does not support SSL. If your local build or test fails with `The server does not support SSL connections`, set one of:

```bash
PG_SSL_DISABLED=true
# or add ?sslmode=disable to DATABASE_URL
DATABASE_URL="postgresql://user@localhost:5432/db?sslmode=disable"
```

Do **not** use `PG_SSL_DISABLED=true` or `sslmode=disable` in production.

## Prohibited commands

The following commands are destructive and must never be run against a production database:

- `prisma migrate reset` — drops and recreates the database.
- `prisma db push` — applies schema changes outside versioned migrations.
- Manual `DROP TABLE`, `TRUNCATE`, or DDL against production.
- Any custom "runtime migration" endpoint or SQL runner.

## Safe provisioning workflow

For a new (empty) database:

```bash
npm install
npm run db:setup
npm run build
npm start
```

`db:setup` runs `prisma generate && prisma migrate deploy && prisma db seed`. It is idempotent: re-running it is safe on an already-provisioned database.

## Safe upgrade workflow

For an existing production database:

1. Review the migration diff:
   ```bash
   npx prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma
   ```
2. Back up the database.
3. Run the deploy:
   ```bash
   npm run db:migrate
   ```

### Existing database baseline adoption

For an existing database whose schema has been verified to match the current `prisma/schema.prisma`, but whose `_prisma_migrations` table does not contain the new baseline migration, the operator may mark the baseline as already applied.

Before running the command:

1. Create and verify a current database backup.
2. Run the read-only verification script:
   ```bash
   DATABASE_URL="postgresql://..." npx tsx scripts/verify-existing-db.ts
   ```
3. Confirm there is no material schema drift.
4. Confirm all required baseline tables, columns, enums, indexes, and constraints already exist.
5. Obtain explicit deployment approval.

Then run once:

```bash
npx prisma migrate resolve --applied 20260711110000_initial_baseline
npx prisma migrate deploy
```

Do **not** run `migrate resolve` when the database is missing any part of the baseline schema. Marking an incomplete schema as applied may cause future migrations and application code to fail.

## Verification

- Fresh install: drop the test DB, recreate it, run `npm run db:setup`, then `npm run build`.
- Existing database: run the read-only verification script:
  ```bash
  DATABASE_URL="postgresql://..." npx tsx scripts/verify-existing-db.ts
  ```
