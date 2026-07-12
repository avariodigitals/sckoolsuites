# Archived Incremental Migrations

These four migrations were active before the `20260711110000_initial_baseline` migration was introduced. They are preserved for historical reference only and **must not be returned to the active `prisma/migrations/` directory**.

## Why they were archived

- They are purely incremental `ALTER TABLE` migrations that assumed the base tables already existed.
- The repository had no baseline migration that could create the database from empty.
- Running them after the new baseline would cause duplicate table, column, enum, and constraint errors.
- The new baseline at `prisma/migrations/20260711110000_initial_baseline/migration.sql` already contains all schema changes represented by these archived migrations, plus the missing runtime-managed tables (`payment_method`, `school_bank_account`, `school_template`).

## Existing database adoption

For an existing database that already applied these migrations, the correct path is to mark the new baseline as already applied without running it:

```bash
npx prisma migrate resolve --applied 20260711110000_initial_baseline
npx prisma migrate deploy
```

This must only be done after a verified backup, a read-only schema comparison, and explicit human approval.

## Archived migrations

- `20260710150000_add_missing_enums` — created PostgreSQL enum types and converted existing text columns.
- `20260710225000_add_result_file_fields` — added `file_url`, `file_name`, `uploaded_by_id` to `result`.
- `20260711095100_add_admission_test_score` — added `test_score` to `admission_application`.
- `20260711101900_add_guardian_details` — added guardian detail columns to `admission_guardian` and `parent`.
