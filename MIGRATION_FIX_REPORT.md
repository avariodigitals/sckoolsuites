# Database Migration Fix — Final Report

## Objective

Make the repository fresh-install safe, upgrade safe, and free of runtime schema mutation. All database provisioning must be versioned through Prisma Migrate, with an idempotent seed and a hardened, atomic setup wizard.

## Audit findings

- `prisma/schema.prisma` was missing models and columns created at runtime by the old `/api/admin/migrate` endpoint (`payment_method`, `school_bank_account`, `school_template`, `paymentMethod` columns on `income`/`expense`, result file columns, and a few admission/guardian columns).
- Multiple old incremental migrations existed alongside a partial baseline, making `migrate deploy` unreliable.
- `prisma/seed.ts` created demo schools and admin users, which conflicted with the setup wizard.
- The setup wizard called separate `/api/setup/school`, `/api/setup/session`, `/api/setup/term` endpoints, allowing partial/corrupt installations.
- A runtime schema mutation endpoint (`/api/admin/migrate/route.ts`) existed and could alter the schema outside versioned migrations.
- `package.json` used the legacy `"prisma": { "seed": ... }` key, which is ignored by Prisma 7; `prisma.config.ts` was missing the seed command.
- `scripts/schema.sql` and `scripts/init-db.js` were still the documented provisioning path.
- No `.env.example`, no environment safety guide, and no verification tooling existed.

## Changes made

### Schema and migrations

- Completed `prisma/schema.prisma` with all missing models and columns identified in the audit.
- Generated a single baseline migration: `prisma/migrations/20260711110000_initial_baseline/migration.sql`.
- Created `prisma/migrations/migration_lock.toml` locking the provider to PostgreSQL.
- Archived all old incremental migrations under `prisma/migrations-archived/` with a `README.md` explaining the archival.

### Runtime schema mutation removal

- Removed `src/app/api/admin/migrate/route.ts`.
- Deprecated `scripts/init-db.js` (now exits with instructions).
- Added a deprecation header to `scripts/schema.sql`.

### Seed

- Rewrote `prisma/seed.ts` to idempotently seed only system `Role`, `Privilege`, and `RolePrivilege` rows.
- Removed school, admin user, and demo data creation from the seed.
- Configured the seed command in `prisma.config.ts` as `tsx prisma/seed.ts`.
- Removed the obsolete `prisma.seed` block from `package.json`.

### Setup wizard hardening

- Refactored `src/app/setup/setup-wizard.tsx` and its step components to collect all data client-side.
- Created `src/app/api/setup/activate/route.ts` as a single atomic transaction that creates:
  - school and school branding
  - academic session and term
  - first admin user (with secure password hashing and explicit `schoolId`)
  - required `schoolSetting` rows
- The activation route rejects re-activation, verifies seeded roles, and avoids trusting arbitrary client tenant IDs.
- Removed the old partial setup routes (`/api/setup/school`, `/api/setup/session`, `/api/setup/term`, `/api/setup/auto`) and `src/app/setup-auto/page.tsx`.
- Marked `src/app/setup/page.tsx` as `force-dynamic` so it checks database state and redirects to `/login` after setup is complete.

### Package scripts and environment

- Updated `package.json` scripts:
  - `db:generate`: `prisma generate`
  - `db:migrate`: `prisma migrate deploy`
  - `db:seed`: `prisma db seed`
  - `db:setup`: `prisma generate && prisma migrate deploy && prisma db seed`
- Deprecated the old `db:init` script.
- Added `.env.example` with all required and optional variables.
- Updated `.gitignore` to allow `.env.example` while keeping `.env.local` ignored.
- Added `PG_SSL_DISABLED` support to `src/lib/db.ts` for local builds/tests only.
- Created `docs/ENVIRONMENT_SAFETY.md` with prohibited commands and safe workflows.

### Verification tooling

- Created `scripts/verify-existing-db.ts`, a read-only script that checks:
  - required tables and columns
  - required roles and duplicate roles
  - Prisma migration table state
  - schema drift via `prisma migrate diff`

## Verification performed

### Fresh-install verification

1. Dropped and recreated an empty PostgreSQL database `sckoolsuite_fresh_test`.
2. Ran `PG_SSL_DISABLED=true DATABASE_URL="postgresql://ralphmore@localhost:5432/sckoolsuite_fresh_test" npm run db:setup`.
   - Client generated successfully.
   - Baseline migration applied successfully.
   - Seed created system roles, privileges, and role-privilege associations.
3. Ran `PG_SSL_DISABLED=true DATABASE_URL="..." NODE_ENV=production npm run build`.
   - Build completed with 110 static pages and a valid `BUILD_ID`.
4. Started the production server on port 3002.
5. Confirmed `GET /setup` returned HTTP 200 (wizard available) before activation.
6. POSTed complete setup data to `/api/setup/activate`.
   - Response: `success: true`, admin user created.
7. Confirmed `GET /setup` returned HTTP 307 redirect to `/login` after activation.
8. Confirmed re-activation returned `409 Already active`.
9. Confirmed the database contained the school, admin user, session, term, and settings.
10. Ran `scripts/verify-existing-db.ts` against the fresh database — all checks passed, no schema drift.

### Existing-database verification

- The read-only `scripts/verify-existing-db.ts` script was tested against the fresh database (after migration and seed) and reported all green.

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

Do not run `migrate resolve` when the database is missing any part of the baseline schema. Marking an incomplete schema as applied may cause future migrations and application code to fail.

## Files changed

- `prisma/schema.prisma`
- `prisma/migrations/20260711110000_initial_baseline/migration.sql`
- `prisma/migrations/migration_lock.toml`
- `prisma/migrations-archived/README.md`
- `prisma/seed.ts`
- `prisma.config.ts`
- `prisma/seed.js` (archived)
- `package.json`
- `.env.example`
- `.gitignore`
- `src/lib/db.ts`
- `src/app/setup/setup-wizard.tsx`
- `src/app/setup/page.tsx`
- `src/app/setup/steps/session-step.tsx`
- `src/app/setup/steps/term-step.tsx`
- `src/app/setup/steps/review-step.tsx`
- `src/app/api/setup/activate/route.ts`
- `src/app/api/setup/school/route.ts` (removed)
- `src/app/api/setup/session/route.ts` (removed)
- `src/app/api/setup/term/route.ts` (removed)
- `src/app/api/setup/auto/route.ts` (removed)
- `src/app/setup-auto/page.tsx` (removed)
- `src/app/api/admin/migrate/route.ts` (removed)
- `src/app/api/admin/students/route.ts`
- `src/app/admin/[section]/role-manager.tsx`
- `scripts/init-db.js`
- `scripts/schema.sql`
- `scripts/verify-existing-db.ts`
- `docs/ENVIRONMENT_SAFETY.md`

## Remaining risks and recommendations

1. **Production baseline resolution**: If the production database already contains the full schema but `_prisma_migrations` is empty, the operator must manually run `prisma migrate resolve --applied 20260711110000_initial_baseline` once. This was intentionally left manual to avoid accidental state changes.
2. **SSL configuration**: Managed PostgreSQL providers require SSL; `src/lib/db.ts` now uses `rejectUnauthorized: false` in production. Ensure this matches your provider’s requirements.
3. **NextAuth host trust**: For local verification, `AUTH_TRUST_HOST=true` may be needed. In production, use a real domain and do not set this.
4. **Deprecated scripts**: Any CI/CD or documentation still referencing `scripts/schema.sql`, `scripts/init-db.js`, or `npm run db:init` should be updated to use `npm run db:setup`.

## Readiness

The repository is now:

- Fresh-install safe: `npm run db:setup` provisions an empty PostgreSQL database end-to-end.
- Upgrade safe: `npm run db:migrate` applies only versioned migrations.
- Free of runtime schema mutation: the old migrate endpoint and SQL installer are removed or deprecated.
- Build-verified: production build passes against a migrated database.
- Setup-verified: the atomic setup wizard creates a school, session, term, and admin user in a single transaction and redirects to login afterward.

No destructive commands were run against any production or existing database during this work.
