# DATABASE DRIFT CLASSIFICATION REPORT

SckoolSuite Neon production database — focused migration `20260711230000_focused_reconciliation` applied.

**Source files inspected:**
- `prisma/schema.prisma`
- `prisma/migrations/20260711110000_initial_baseline/migration.sql`
- `prisma/migrations/20260711210000_add_missing_columns/migration.sql`
- `prisma/migrations/20260711230000_focused_reconciliation/migration.sql`
- `scripts/verify-existing-db.ts`
- `post-migration-drift.txt` (the current Prisma `migrate diff` output; `remaining-drift.sql` was not found in the workspace)

**Note:** Live Neon queries were attempted but could not be executed in this environment due to command-execution timeouts. The conclusions below are derived from the applied migrations and the saved `post-migration-drift.txt` diff output, which represents the current state of the Neon schema compared to `prisma/schema.prisma`.

---

## 1. Focused migration verification

The focused migration added the following objects. None of them appear as missing in the current drift output, so they are confirmed resolved.

| Object | Current database definition | Prisma definition | Application usage | Risk | Recommended authority | Required action | Migration required |
|---|---|---|---|---|---|---|---|
| `payment_method` table | Exists per `20260711230000_focused_reconciliation`; matches baseline `CREATE TABLE` (serial id, school_id, name, code, is_active, sort_order, created_at, updated_at, unique on school_id+code) | `model PaymentMethod` with FK to `school` on `schoolId` | Application reads/writes payment methods; required by finance flows | Resolved | n/a | None | no |
| `school_bank_account` table | Exists per focused migration; matches baseline (serial id, school_id, account_name, bank_name, account_number, branch, instructions, is_active, is_default, created_at, updated_at) | `model SchoolBankAccount` with FK to `school` on `schoolId` | Application stores bank details for receipts/invoices | Resolved | n/a | None | no |
| `parent` identity columns (`occupation`, `employer_name`, `work_address`, `work_phone`, `home_address`, `id_document_type`, `id_document_number`, `id_document_url`, `photo_url`) | All columns exist per focused migration and `add_missing_columns` migration | `model Parent` fields are nullable `String?` | Parent profile UI and reports | Resolved | n/a | None | no |
| `admission_guardian` identity columns (same set as parent) | All columns exist per focused migration | `model AdmissionGuardian` fields are nullable `String?` | Admission guardian forms | Resolved | n/a | None | no |
| `admission_guardian.is_primary` | Exists per focused migration; `BOOLEAN NOT NULL DEFAULT false` | `Boolean @default(false)` | Admission guardian primary/secondary flag | Resolved | n/a | None | no |
| `parent` FKs (`parent_user_id_fkey`, `parent_school_id_fkey`) | Exist per focused migration | `Parent.user` and `Parent.school` relations | Referential integrity for parent records | Resolved | n/a | None | no |
| `admission_guardian.application_id` FK (`admission_guardian_application_id_fkey`) | Exists per focused migration | `AdmissionGuardian.application` relation | Referential integrity for admission guardians | Resolved | n/a | None | no |

**Verdict:** The focused migration achieved its stated goals. The verification script (`scripts/verify-existing-db.ts`) has been updated to report these checks in a separate "Focused Migration Verification" section before the broad drift check.

---

## 2. Remaining drift summary

The current `post-migration-drift.txt` diff output contains ~580 individual drift items across 60 tables. They group into the following categories:

| Category | Count | Notes |
|---|---|---|
| Naming-only index/constraint differences | ~60 | `Renamed index ...` lines |
| Nullability differences | ~120 | `changed from Required to Nullable` / `changed from Nullable to Required` |
| Default-value differences | ~10 | `default changed` including generated default on `admission_application.name` |
| Column type / enum differences | ~80 | `type changed` on dates, numerics, booleans, strings |
| Foreign-key / referential-action differences | ~95 | `Removed foreign key` |
| Generated-column difference | 1 | `admission_application.name` |
| Missing application-critical object | 0 | Focused migration resolved all known missing critical objects |
| Extra legacy database object | 2 | `route_stop.school_id`, composite index on `school_config_version(school_id, is_active)` |
| Prisma schema inaccuracy | 1 | `route_stop` model does not include `school_id` but the database has it |

**Broad drift check:** Material differences remain, so the verification script will continue to report `FAIL` for broad drift until the safe-forward migration is applied. Naming-only drift is reported as `WARNING` if it is the only remaining drift.

---

## 3. Naming-only differences

All of the following are safe index/constraint renames. The database uses the older Prisma-generated names (`<table>_<column>_idx`) while the schema uses the newer `idx_<table>_<column>` convention. No data or semantics change.

Representative list (full list is in `post-migration-drift.txt`):

- `admission_application_school_id_idx` → `idx_admission_school`
- `admission_application_status_idx` → `idx_admission_status`
- `admission_application_session_id_idx` → `idx_admission_session`
- `admission_document_application_id_idx` → `idx_admission_document_app`
- `admission_guardian_application_id_idx` → `idx_admission_guardian_app`
- `announcement_session_id_idx` → `idx_announcement_session_id`
- `announcement_term_id_idx` → `idx_announcement_term_id`
- `assignment_teacher_id_idx` → `idx_assignment_teacher`
- `attendance_session_id_idx` → `idx_attendance_session_id`
- `attendance_term_id_idx` → `idx_attendance_term_id`
- `attendance_student_id_idx` → `idx_attendance_student`
- `attendance_date_idx` → `idx_attendance_date`
- `audit_log_created_at_idx` → `idx_audit_log_created`
- `enquiry_stage_idx` → `idx_enquiry_stage`
- `expense_school_id_idx` → `idx_expense_school_id`
- `expense_date_idx` → `idx_expense_date`
- `income_school_id_idx` → `idx_income_school_id`
- `income_date_idx` → `idx_income_date`
- `invoice_student_id_idx` → `idx_invoice_student`
- `invoice_term_id_idx` → `idx_invoice_term`
- `invoice_session_id_idx` → `idx_invoice_session_id`
- `lesson_teacher_id_idx` → `idx_lesson_teacher`
- `parent_user_id_idx` → `idx_parent_user`
- `payment_invoice_id_idx` → `idx_payment_invoice`
- `privilege_code_idx` → `idx_privilege_code`
- `privilege_category_idx` → `idx_privilege_category`
- `role_privilege_role_id_idx` → `idx_role_privilege_role_id`
- `score_student_id_idx` → `idx_score_student`
- `score_subject_id_idx` → `idx_score_subject`
- `score_term_id_idx` → `idx_score_term_id`
- `score_session_id_idx` → `idx_score_session_id`
- `student_user_id_idx` → `idx_student_user`
- `student_parent_id_idx` → `idx_student_parent`
- `student_class_id_idx` → `idx_student_class`
- `teacher_user_id_idx` → `idx_teacher_user`
- `user_email_idx` → `idx_user_email`
- `user_role_id_idx` → `idx_user_role`
- `visitor_status_idx` → `idx_visitor_status`

**Risk:** None. These are purely naming conventions.

**Recommended action:** Accept these as intentional naming drift, or include safe `ALTER INDEX ... RENAME TO ...` statements in a forward migration if you want `prisma migrate diff` to report zero drift.

---

## 4. Prisma schema inaccuracies

### 4.1 `route_stop.school_id`

- **Object:** `route_stop.school_id`
- **Current database definition:** Column exists (added at some point in the live database; drift reports `[+] Added column school_id`).
- **Prisma definition:** `model RouteStop` does not contain `schoolId`; the route-stop relationship is modeled only through `routeId` → `Route`.
- **Application usage:** Unknown. If any legacy code or reports read `route_stop.school_id`, dropping it would break them. If unused, it is dead legacy data.
- **Risk:** Medium if the column is used; low if it is dead.
- **Recommended authority:** Engineering + data review.
- **Required action:** Query `route_stop` to determine whether `school_id` is populated or referenced. If unused, either (a) add it to the Prisma schema with a default/nullable field to match reality, or (b) drop it in a controlled migration. If used, update the schema to include it and add the appropriate relation.
- **Migration required:** yes (after usage is confirmed).

### 4.2 `school_config_version` composite index

- **Object:** Index on `school_config_version(school_id, is_active)`
- **Current database definition:** Composite index exists; the schema only defines `@@index([isActive])` and `@@index([schoolId])` separately.
- **Prisma definition:** Separate indexes on `school_id` and `is_active`.
- **Application usage:** Unknown. The composite index may have been added for a specific query.
- **Risk:** Low. Dropping a composite index could degrade performance if used.
- **Recommended authority:** DBA / engineering.
- **Required action:** Verify query usage. If the composite index is valuable, add `@@index([schoolId, isActive])` to the Prisma schema. If not, drop the extra index safely.
- **Migration required:** yes (after usage is confirmed).

---

## 5. Safe forward migrations

The following changes can be applied in a new migration without destroying data or changing application behavior. They restore Prisma schema semantics on the live database.

### 5.1 Add missing foreign keys

The drift reports `Removed foreign key` on ~95 relationships. This means the schema declares the relation but the live database does not enforce it. Safe forward SQL: `ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY ...`.

Representative critical FKs to add:

- `admission_application` → `school`, `session`, `applying_for_class_id`, `converted_student_id`
- `admission_document` → `admission_application`
- `admission_qualification` → `admission_application`
- `announcement` → `school`, `session`, `term`
- `assignment` → `school`, `lesson`, `class`, `subject`, `teacher`, `student`
- `attendance` → `school`, `session`, `term`, `student`, `class`, `teacher`
- `class` → `school`, `class_group`, `teacher`
- `class_arm` → `school`, `class`, `teacher`
- `expense` → `school`, `expense_category`
- `fee_group` → `school`
- `fee_item` → `school`, `fee_group`, `class`, `arm`, `session`, `term`
- `income` → `school`, `income_category`, `payment`
- `invoice` → `school`, `student`, `parent`, `class`, `term`, `session`, `created_by`
- `invoice_item` → `invoice`, `fee_item`
- `payment` → `school`, `invoice`, `student`, `received_by`
- `payment_proof` → `school`, `payment`, `reviewed_by`
- `receipt` → `school`, `invoice`, `student`, `parent`
- `result` → `school`, `student`, `term`, `session`, `uploaded_by`, `approved_by`, `published_by`
- `score` → `school`, `student`, `subject`, `teacher`, `term`, `session`
- `student` → `user`, `school`, `parent`, `teacher`, `class`, `arm`, `route`
- `student_enrollment` → `student`, `session`, `term`, `class`
- `student_guardian` → `student`, `parent`
- `subject` → `school`, `class`, `class_group`, `teacher`
- `teacher` → `user`, `school`
- `term` → `school`, `session`
- `user` → `role`, `school`
- `vehicle` → `school`, `driver`

**Risk:** Low. Adding FKs improves referential integrity. Verify that orphan rows do not exist before adding each FK, or use `ON DELETE` actions matching the Prisma schema to avoid failing on existing orphans.

**Migration required:** yes.

### 5.2 Add missing indexes and unique constraints

The drift reports `Removed index` / `Removed unique` on ~80 constraints. Add them back via `CREATE INDEX` / `CREATE UNIQUE INDEX` to match the baseline and schema.

Representative items:
- `school_id` indexes on most tables
- `class_id`, `teacher_id`, `student_id` indexes on relevant tables
- Unique constraints such as `class(school_id, name)`, `class_arm(class_id, name)`, `fee_group(school_id, name)`, `session(school_id, name)`, `term(session_id, name)`, `student_guardian(student_id, parent_id)`, `student_enrollment(student_id, session_id, term_id)`, `school_config_version(school_id, is_active)` (if chosen to keep)

**Risk:** Low. Index creation is non-blocking in Neon; plan for hot tables during low-traffic windows.

**Migration required:** yes.

### 5.3 Set correct column defaults

The drift reports default-value mismatches on a small number of columns. These can be aligned with `ALTER TABLE ... ALTER COLUMN ... SET DEFAULT ...`.

Representative items:
- `attendance.status` → set default to `PRESENT` (current drift says DB has no default, schema has `@default(PRESENT)` via enum)
- `school_branding.school_id` → review; schema has no default, drift says DB has default `'default'`
- `school_setting.school_id` → review; schema has no default, drift says DB has default `'default'`
- `assessment.school_id` → drift says DB had default `'default'`, schema has `@default("default")`
- `admission_application.present_address` / `permanent_address` → drift says DB has default `'{}'`, schema has no default; review whether JSON empty-object default is required

**Risk:** Low for future inserts; existing rows are unaffected.

**Migration required:** yes.

---

## 6. Backfill-required changes

These changes alter column nullability. They are safe only after verifying that no existing rows violate the stricter constraint or after backfilling nulls.

### 6.1 `school_id` NOT NULL across many tables

- **Tables affected:** `announcement`, `assessment`, `assignment`, `attendance`, `audit_log`, `call_log`, `class`, `class_arm`, `class_group`, `correspondence`, `driver`, `enquiry`, `expense`, `fee_group`, `fee_item`, `fee_profile`, `gate_pass`, `income`, `invoice`, `lesson`, `online_class`, `parent`, `parent_complaint`, `parent_message`, `payment`, `payment_proof`, `quiz`, `receipt`, `reception_complaint`, `result`, `route`, `school`, `school_branding`, `school_setting`, `school_template`, `score`, `session`, `student`, `subject`, `teacher`, `user`, `vehicle`, `visitor`, and others.
- **Current database definition:** `school_id` is nullable.
- **Prisma definition:** `schoolId String @default("default")` (NOT NULL) on most models.
- **Risk:** Medium. If any row has `NULL` `school_id`, making it NOT NULL will fail or require a default.
- **Required action:** Backfill `school_id` to `'default'` or the correct school id for every `NULL` row before applying `ALTER TABLE ... ALTER COLUMN school_id SET NOT NULL`. Do not apply without a backfill query.
- **Migration required:** yes (with backfill).

### 6.2 Boolean flag columns NOT NULL

- **Columns affected:** `is_active`, `is_setup`, `is_current`, `is_optional`, `sort_order`, `is_primary`, `is_granted`, `is_default`, `is_from_payment`, `status` (boolean/string enums), etc.
- **Current database definition:** Many are nullable in the live database.
- **Prisma definition:** These are generally required with `@default(...)`.
- **Risk:** Low to medium depending on usage.
- **Required action:** Backfill `NULL` values with the appropriate default, then apply `SET NOT NULL` and `SET DEFAULT`.
- **Migration required:** yes (with backfill).

### 6.3 Score computed/result columns

- **Columns affected:** `score.ca_score`, `score.exam_score`, `score.total`, `score.grade`, `score.gpa` (schema nullable, drift says DB required); `result.attendance_present`, `result.attendance_total` (schema required with default 0, drift says DB required but check default).
- **Current database definition:** Mixed. `score` columns appear to have changed from nullable to required in DB, which is opposite of the schema.
- **Prisma definition:** `score.ca_score Float?`, `score.exam_score Float?`, `score.total Float?`, `score.grade String?`, `score.gpa Float?`.
- **Risk:** Medium. Aligning `score` to the schema may require backfilling or accepting that the DB is stricter.
- **Required action:** Determine the correct source of truth. If scores can legitimately be null during entry, update the DB to nullable. If the DB is intentionally stricter, update the schema.
- **Migration required:** yes (after authority decision).

### 6.4 Date columns required vs nullable

- **Columns affected:** `visitor.check_in_time`, `gate_pass.exit_time`, `assignment.due_date`, `online_class.start_time`, `quiz.total_marks`, etc.
- **Current database definition:** Some are nullable while schema requires them.
- **Prisma definition:** Required with or without defaults.
- **Required action:** Backfill sensible defaults or fix application code to ensure values are provided before making NOT NULL.
- **Migration required:** yes (with backfill).

---

## 7. Dangerous or destructive changes

These changes must **not** be applied to the production database without explicit engineering/DBA sign-off and a backup. They are listed because the drift output identifies them, but they should be excluded from any forward migration.

### 7.1 DROP `route_stop.school_id`

- **Object:** `route_stop.school_id`
- **Why dangerous:** If the column contains data or is referenced by any legacy query/report, dropping it is destructive and irreversible.
- **Required action:** Do not drop until usage is confirmed to be zero (see section 4.1).
- **Migration required:** no (until confirmed dead).

### 7.2 DROP composite index on `school_config_version(school_id, is_active)`

- **Object:** Composite index `school_config_version(school_id, is_active)`
- **Why dangerous:** Dropping an index can cause performance regressions if the composite index is used by hot queries.
- **Required action:** Do not drop until query usage is confirmed to be zero (see section 4.2).
- **Migration required:** no (until confirmed unused).

### 7.3 DROP any legacy table or column not present in the schema

- **Why dangerous:** Unilateral drops risk application failures.
- **Required action:** Any drop must be preceded by a usage audit, feature-flag removal, and a restorable backup.
- **Migration required:** no (without explicit approval).

---

## 8. Intentional accepted drift

The following differences are accepted as intentional because they represent application-level behavior that the Prisma schema does not (or cannot) express, or because changing them would alter product behavior.

### 8.1 `admission_application.name` generated column

- **Object:** `admission_application.name`
- **Current database definition:** Generated column `((first_name || ' '::text) || last_name)`.
- **Prisma definition:** Required `String` with no default.
- **Application usage:** The database auto-computes the full name from `first_name` and `last_name`.
- **Risk:** Low if accepted. Changing to match schema would require application code to always populate `name`.
- **Recommended action:** Accept as intentional drift. If you want schema accuracy, add a comment/migration note and consider Prisma's generated-column support if available.
- **Migration required:** no.

### 8.2 `admission_application.date_of_registration` default

- **Object:** `admission_application.date_of_registration`
- **Current database definition:** Default `CURRENT_DATE` (date only).
- **Prisma definition:** `@default(now())` (timestamp with time).
- **Application usage:** Date of registration typically stored as date only.
- **Risk:** Low. Behavior is semantically equivalent for most use cases.
- **Recommended action:** Accept as intentional drift, or change the schema to `@default(dbgenerated("CURRENT_DATE"))` if Prisma supports it.
- **Migration required:** no.

### 8.3 Date/time precision differences

- **Object:** Many `DateTime` columns (`created_at`, `updated_at`, `start_date`, `end_date`, `due_date`, `payment_date`, etc.)
- **Current database definition:** Various PostgreSQL date/timestamp types.
- **Prisma definition:** `TIMESTAMP(3)`.
- **Risk:** Low if the application does not depend on sub-second precision. Changing types can be safe but requires verification.
- **Recommended action:** Accept as acceptable precision drift for now, or batch-convert in a dedicated type-alignment migration after testing.
- **Migration required:** optional / low priority.

---

## 9. Recommended next migration scope

The next migration should be a **safe, non-destructive forward migration** that does **not** modify the already-applied baseline migration. It should include only the items from sections 5 and 6 (where backfills are completed first).

### Proposed migration name: `20260712000000_safe_forward_reconciliation`

### In scope:

1. **Rename indexes** (section 3) — optional, low risk, but adds many DDL statements. Consider doing this in the same migration or accepting the naming drift.
2. **Add missing foreign keys** (section 5.1) — high value for data integrity. Generate SQL by matching each Prisma `@relation` to the live database. Pre-check for orphan rows.
3. **Add missing indexes and unique constraints** (section 5.2) — performance and integrity. Generate SQL from the baseline migration indexes that are absent in the live database.
4. **Set correct defaults** (section 5.3) — low risk, do after FK/index work.

### Out of scope (until backfills are done):

- Nullability changes (section 6). Do these in a follow-up migration after backfilling `school_id` and boolean flags.
- DROP of `route_stop.school_id` or the composite index (section 7). Wait for usage confirmation.
- Generated-column changes (section 8). Accept as intentional.

### Process:

1. Run the updated `scripts/verify-existing-db.ts` to confirm focused checks pass.
2. Generate the forward migration SQL from `prisma migrate diff --from-url <neon> --to-schema prisma/schema.prisma` (or manually from the classification above), excluding destructive drops.
3. Review the generated SQL against sections 7 and 8 of this report. Remove any `DROP COLUMN`, `DROP INDEX`, or `DROP TABLE` statements unless explicitly approved.
4. Apply in a transaction on a restored copy of the database first.
5. Re-run the verification script. Broad drift should be reduced to naming-only or accepted drift.

---

## 10. Ready for TypeScript pass: YES / NO

**YES** — with caveats.

The focused migration resolved the missing tables, columns, and foreign keys that were the most likely cause of Prisma client / TypeScript failures. The Prisma schema is now complete for the application code paths that rely on:

- `PaymentMethod` and `SchoolBankAccount` models
- `Parent` identity/profile fields
- `AdmissionGuardian` identity/profile fields and `isPrimary`
- Required parent and admission-guardian relations
- `Result` file fields, `Income.paymentMethod`, `Expense.paymentMethod`, `SchoolTemplate.termName`, and `AdmissionApplication.testScore`

**Caveats:**

- The remaining broad drift (missing FKs, indexes, nullability mismatches) is a runtime data-integrity and performance concern, not a TypeScript-compile concern. It will not block `tsc` or `prisma generate`.
- Some nullable columns in the database may allow `NULL` where the schema expects a value. TypeScript will not catch these, but runtime code should defensively handle `NULL` until the backfill migration is applied.
- `route_stop.school_id` is in the database but not in the schema. If any code reads this column outside Prisma, it must be accounted for separately.

**Recommendation:** Proceed with the TypeScript pass, but run the verification script before any production deploy and keep the broad-drift remediation migration on the critical path for the next release.
