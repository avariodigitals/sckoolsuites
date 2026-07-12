# Phase 3: Core Workflow E2E Test Plan

## Test mode strategy

**Recommended approach: Local fresh PostgreSQL test database (Docker)**

A dedicated, disposable Postgres container is started locally for each test run. The test runner owns the full lifecycle — schema creation, seeding, test execution, and teardown — so the production database is never touched.

- Container: `postgres:16` on port `5433`
- Database: `sckoolsuite_test`
- Connection: `DATABASE_URL=postgresql://sckool_test:sckool_test@localhost:5433/sckoolsuite_test`
- Test Next.js server: `http://localhost:3002` (separate from the dev server on `:3001`)

### Why not production or preview

- Workflow tests create and mutate sessions, terms, classes, students, fees, invoices, payments, results, and promotions.
- Running them against production would risk live data, notifications, and generated invoices.
- Vercel preview deployments can be pointed to an isolated test DB, but the local container is fastest, cheapest, and requires no external platform.

### Environment isolation

- `tests/e2e/.env.test.local` is loaded only by the test process and the test `next dev` server.
- `playwright.config.ts` will load `dotenv` from `tests/e2e/.env.test.local`.
- A separate `next dev` process is started with `DATABASE_URL` from that file and `PORT=3002`.
- The production `DATABASE_URL` in `.env.local` is never used by the workflow tests.

### Prerequisites

- Docker Desktop or Docker Engine is running locally.
- `npx playwright install` is already done.
- `prisma` CLI is available (`npx prisma`).

## Test environment

| Component | Value |
| --- | --- |
| Test runner | Playwright (`npx playwright test tests/e2e/workflows/`) |
| Test server | `next dev` on `http://localhost:3002` |
| Database | PostgreSQL 16 container on `localhost:5433` |
| Schema reset | `npx prisma db push --force-reset` against `DATABASE_URL` in `tests/e2e/.env.test.local` |
| Seed | `prisma/seed.ts` invoked via `npx prisma db seed` or by a `globalSetup` script |
| Cleanup | Global teardown resets the DB after each run or resets before each run |

## Seed data required

The test database must contain the minimum data that the real UI expects, otherwise the app will redirect to `/setup`.

- **Super Admin user** — `superadmin@sckoolsuite.com` / `TestAdmin123!` (password hashed with bcrypt)
- **School** — `id: "test-school"`, name: `Test School`
- **School branding** — a `SchoolBranding` row for `test-school`
- **School settings** — active session, active term, app icon, etc. if the UI expects them
- **Roles** — `SUPER_ADMIN`, `SCHOOL_ADMIN`, `TEACHER`, `PARENT`, `STUDENT` in `Role` table
- **Privileges** — the standard privilege rows from the `privileges` table
- **Role privileges** — mapping admin roles to all privileges so the test admin can access every page

### Seed strategy

- Seed script lives in `prisma/seed.ts`.
- It is idempotent and run once by `globalSetup` before the test suite starts.
- It does NOT seed students, teachers, parents, classes, subjects, fees, or invoices — those are created by the tests themselves.

## Core workflow tests

Each workflow below is a separate Playwright test file under `tests/e2e/workflows/`.

### 1. login

- **Pages**: `/login`, `/admin/dashboard`
- **APIs**: `POST /api/auth/[...nextauth]` (credentials), `GET /api/auth/session`
- **Data created**: auth session cookie only
- **Cleanup**: sign out via UI or delete session
- **Risk**: Low (read-only)

### 2. create session

- **Pages**: `/admin/academics`, setup/session forms
- **APIs**: `POST /api/admin/sessions`, `GET /api/admin/academic/sessions`, `POST /api/context/session-term`
- **Data created**: `Session` row with `schoolId = "test-school"`, `name`, `startDate`, `endDate`, `isCurrent = true`
- **Cleanup**: Delete session row in teardown or reset DB before each run
- **Risk**: Medium (mutates academic calendar)

### 3. create term

- **Pages**: `/admin/academics`, `/admin/setup`
- **APIs**: `POST /api/admin/terms`, `GET /api/admin/academic/terms`, `POST /api/context/session-term`
- **Data created**: `Term` row linked to the created session
- **Cleanup**: Delete term row or DB reset
- **Risk**: Medium

### 4. create class

- **Pages**: `/admin/classes`, `/admin/setup`
- **APIs**: `POST /api/admin/classes`, `GET /api/admin/classes`, `POST /api/admin/class-groups`, `POST /api/admin/class-arms`
- **Data created**: `ClassGroup` (optional), `Class`, `ClassArm` (optional)
- **Cleanup**: Delete class rows or DB reset
- **Risk**: Medium

### 5. create subject

- **Pages**: `/admin/subjects`
- **APIs**: `POST /api/admin/subjects`, `GET /api/admin/subjects`
- **Data created**: `Subject` row linked to school and optionally a class/teacher
- **Cleanup**: Delete subject rows or DB reset
- **Risk**: Medium

### 6. create teacher

- **Pages**: `/admin/teachers`
- **APIs**: `POST /api/admin/teachers`, `GET /api/admin/teachers`, `POST /api/admin/users`
- **Data created**: `User` (role TEACHER), `Teacher` row linked to `User`
- **Cleanup**: Delete teacher and user rows or DB reset
- **Risk**: Medium

### 7. create parent

- **Pages**: `/admin/parents`
- **APIs**: `POST /api/admin/parents`, `GET /api/admin/parents`, `POST /api/admin/users`
- **Data created**: `User` (role PARENT), `Parent` row
- **Cleanup**: Delete parent and user rows or DB reset
- **Risk**: Medium

### 8. create student

- **Pages**: `/admin/students`
- **APIs**: `POST /api/admin/students`, `GET /api/admin/students`, `POST /api/upload` (avatar upload, optional)
- **Data created**: `User` (role STUDENT), `Student` row linked to class and optionally parent
- **Cleanup**: Delete student and user rows or DB reset
- **Risk**: Medium

### 9. assign parent

- **Pages**: `/admin/students/[id]/guardians`, `/admin/students/[id]/detail`
- **APIs**: `POST /api/admin/students/[id]/guardians`, `GET /api/admin/students/[id]/guardians`
- **Data created**: `StudentParent` or `Parent` relationship row
- **Cleanup**: Remove guardian link or DB reset
- **Risk**: Medium

### 10. create fee group/item

- **Pages**: `/admin/fees`
- **APIs**: `POST /api/admin/fee-groups`, `POST /api/admin/fee-items`, `GET /api/admin/fee-groups`, `GET /api/admin/fee-items`
- **Data created**: `FeeGroup`, `FeeItem` (linked to class or globally)
- **Cleanup**: Delete fee group/item rows or DB reset
- **Risk**: Medium

### 11. generate invoice

- **Pages**: `/admin/invoices`, `/admin/finance`
- **APIs**: `POST /api/admin/bills`, `GET /api/admin/bills`, `POST /api/admin/invoices`
- **Data created**: `Invoice` and `InvoiceItem` rows for the created student
- **Cleanup**: Delete invoice rows or DB reset
- **Risk**: High (creates financial records)

### 12. parent payment proof upload

- **Pages**: `/parent/payments`
- **APIs**: `POST /api/parent/payments/notify`, `POST /api/upload` (payment proof image)
- **Data created**: `PaymentProof` row with `status = PENDING`
- **Cleanup**: Delete payment proof row or DB reset
- **Risk**: High (financial mutation)

### 13. admin payment approval

- **Pages**: `/admin/finance` or `/admin/payments`
- **APIs**: `POST /api/admin/payments/proofs/[paymentId]/review`, `POST /api/admin/payments`
- **Data created**: `Payment` row, `Receipt` row (if fully paid), invoice status updated
- **Cleanup**: Delete payment/receipt rows or DB reset
- **Risk**: High

### 14. teacher attendance

- **Pages**: `/teacher/attendance`, `/admin/attendance`
- **APIs**: `POST /api/teacher/attendance`, `GET /api/teacher/attendance`, `GET /api/admin/attendance`
- **Data created**: `Attendance` rows for the student
- **Cleanup**: Delete attendance rows or DB reset
- **Risk**: Medium

### 15. teacher score entry

- **Pages**: `/teacher/scores`, `/admin/scores`
- **APIs**: `POST /api/teacher/scores`, `GET /api/teacher/scores`, `GET /api/admin/scores`
- **Data created**: `Score` rows for the student in the active session/term
- **Cleanup**: Delete score rows or DB reset
- **Risk**: Medium

### 16. admin result approval

- **Pages**: `/admin/results`, `/admin/results/review`
- **APIs**: `POST /api/admin/results/review`, `GET /api/admin/results/review`
- **Data created**: `Result` row with `status = PENDING` → `APPROVED`
- **Cleanup**: Delete result rows or DB reset
- **Risk**: Medium

### 17. result publishing

- **Pages**: `/admin/results`, `/admin/results/review`
- **APIs**: `POST /api/admin/results/publish`, `GET /api/admin/results`
- **Data created**: `Result` rows marked `published = true`, `publishedAt` set
- **Cleanup**: Unpublish or delete result rows or DB reset
- **Risk**: Medium

### 18. student result view

- **Pages**: `/student/results`, `/student/dashboard`
- **APIs**: `GET /api/student/results`, `GET /api/student/dashboard`
- **Data created**: none (read-only)
- **Cleanup**: none
- **Risk**: Low

### 19. report card view

- **Pages**: `/reports/[studentId]`, `/student/report-card`
- **APIs**: `GET /api/reports/[studentId]`, `GET /api/student/report-card`
- **Data created**: none (read-only)
- **Cleanup**: none
- **Risk**: Low

### 20. student promotion

- **Pages**: `/admin/students/promote`
- **APIs**: `POST /api/admin/students/promote`, `GET /api/admin/students/promote`
- **Data created**: `StudentEnrollment` or `Student` class update for new session
- **Cleanup**: Revert student class/session or DB reset
- **Risk**: High (changes student academic record)

## Rollback / cleanup strategy

The preferred approach is **full DB reset per test run** rather than trying to delete every created row, because:

- Workflows create cascades (invoices, payments, receipts, results).
- Deleting rows in the correct order is fragile and slower than a fresh reset.
- A clean database guarantees no test state leaks between runs.

### Cleanup implementation

1. `globalSetup`:
   - Start Postgres container if not running.
   - `npx prisma db push --force-reset` to recreate the schema.
   - Run `prisma/seed.ts` to seed the admin user, school, roles, and privileges.
   - Start `next dev` on `PORT=3002` with `DATABASE_URL` from `.env.test.local`.
   - Wait for `/login` to return 200.

2. Per-test setup:
   - Tests are sequential (`workers: 1`) so they do not conflict.
   - Each test starts from the seeded state and creates the data it needs.

3. `globalTeardown`:
   - Stop the `next dev` process.
   - Drop the test database or stop the Docker container.

### Alternative: transaction rollback

If the suite needs to be faster later, we can run mutations in a single transaction and roll back. However, Prisma + Next.js `next dev` do not support nested transaction rollback across server actions easily. The full reset is the safest starting point.

## Risk level summary

| Workflow | Risk | Mitigation |
| --- | --- | --- |
| login | Low | Auth cookie only, no DB mutation |
| create session/term | Medium | Delete rows or reset DB |
| create class/subject | Medium | Delete rows or reset DB |
| create teacher/parent/student | Medium | Delete user + role rows or reset DB |
| assign parent | Medium | Delete relationship row or reset DB |
| create fee group/item | Medium | Delete rows or reset DB |
| generate invoice | High | Reset DB per run |
| parent payment proof upload | High | Reset DB per run |
| admin payment approval | High | Reset DB per run |
| teacher attendance | Medium | Delete attendance rows or reset DB |
| teacher score entry | Medium | Delete score rows or reset DB |
| admin result approval | Medium | Delete result rows or reset DB |
| result publishing | Medium | Unpublish or reset DB |
| student result view | Low | Read-only |
| report card view | Low | Read-only |
| student promotion | High | Reset DB per run |

## Files to be created/modified

### New files

- `tests/e2e/.env.test.local` — test-only environment variables
- `tests/e2e/global-setup.ts` — start DB, migrate, seed, start dev server
- `tests/e2e/global-teardown.ts` — stop dev server and reset DB
- `tests/e2e/workflows/` — one test file per workflow
- `prisma/seed.ts` — deterministic seed for the test environment
- `docker-compose.test.yml` — Postgres container definition (optional, can be done in global setup)

### Modified files

- `playwright.config.ts` — add `globalSetup`, `globalTeardown`, `projects` for workflow tests, and `.env.test.local` loading
- `package.json` — add `test:workflow` and `test:workflow:ui` scripts
- `tsconfig.json` — include `prisma/seed.ts` if needed

## Approval checklist

Before any mutation test is executed, the following must be confirmed:

1. `DATABASE_URL` in `tests/e2e/.env.test.local` points to `localhost:5433/sckoolsuite_test` and not to the production URL.
2. The production `.env.local` is not loaded by the workflow test runner.
3. The Postgres container is isolated to a non-standard port (`5433`) so it cannot conflict with the local dev DB on `5432`.
4. `globalSetup` performs `prisma db push --force-reset` before each run.
5. The `next dev` server for tests runs on `PORT=3002` and never on the production `PORT=3001`.

## Next step

Approve this plan. Once approved, I will implement the test environment first, then implement each workflow test one at a time, starting with `login` and `create session`.
