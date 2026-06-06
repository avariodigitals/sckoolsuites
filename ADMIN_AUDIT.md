# Admin Audit Report

**Date:** 2026-06-06
**Auditor:** Cascade (AI Coding Assistant)
**Scope:** `src/app/admin/*` and `src/app/api/admin/*`
**Build Status:** `Compiled successfully` (no TypeScript errors)
**Runtime Status:** Multiple critical failures

---

## Executive Summary

The admin area **builds successfully** but has **extensive runtime failures** caused by the Prisma-to-raw-SQL migration shim in `src/lib/db.ts`. The shim silently ignores `include` relations, does not support most Prisma operators (`not`, `in`, `OR`, `lt`/`gt`, `startsWith`), and cannot handle nested writes (`create` inside `data`) or composite-key `upsert` clauses. There are **397 Prisma API calls** across admin code, of which **~80% are at risk of runtime errors or silent data corruption**.

**Bottom line:** Many admin pages render blank or crash at runtime. Core finance, billing, and setup flows are broken.

---

## What's Working

| Area | Status | Notes |
|------|--------|-------|
| **Build / TypeScript** | Working | `npm run build` succeeds with zero errors. |
| **Authentication** | Working | `auth.ts` uses raw SQL correctly. Login and `requireRole` function. |
| **Setup Wizard Entry** | Working | `/setup/page.tsx` uses raw SQL queries directly. Redirects and step detection work. |
| **Simple CRUD** | Partially working | `findMany`, `findFirst`, `create`, `update`, `delete` with simple equality `where` clauses work (e.g., `prisma.school.findMany({ where: { id: "default" } })`). |
| **Admin Section Router** | Structurally sound | `/admin/[section]/page.tsx` correctly maps 19 allowed sections. |

---

## Critical Issues

### 1. `include` Relations Are Silently Ignored (114 occurrences)

**Severity:** CRITICAL  
**Impact:** All nested data comes back `undefined`, causing blank screens and runtime crashes when UI code accesses `item.user.name`, `item.class.name`, etc.

The Prisma shim (`src/lib/db.ts:106`, `:131`, `:161`) accepts the `include` parameter for API compatibility but explicitly ignores it with `void include;`. This means no JOINs are executed.

**Affected areas:**
- `src/lib/data.ts:getCurrentSchoolByUser` — `profile.school` and `profile.role` are always `undefined`.
- `src/lib/data.ts:getCoreSchoolDataByContext` — Every nested relation (`student.user`, `parent.user`, `teacher.user`, `invoice.student`, `invoice.items`, etc.) is empty.
- `src/app/api/admin/setup/route.ts` (GET) — `teachers`, `parents`, `students`, `subjects`, `feeItems` all lack nested objects. The response mapping code (`item.user.name`, `item.class.name`) will throw or return empty values.
- `src/app/api/admin/bills/route.ts` (GET) — `inv.student.user.name`, `inv.parent.user.name`, `inv.items.feeItem.name` are all `undefined`.
- `src/app/api/admin/invoices/generate/route.ts` — `invoice.student.user.name`, `invoice.items.feeItem.name`, etc.
- `src/app/api/admin/dashboard/analytics/route.ts` — `payment.invoice` is missing.
- `src/app/api/admin/class-arms/[id]/route.ts` (DELETE) — `arm.class.students` check is bypassed because `include` is ignored. Arms may be deleted even when they have enrolled students.
- `src/components/role-dashboard.tsx` — Super Admin dashboard `school.users`, `school.students`, `school.teachers`, `school.payments` are all empty arrays.

**Example crash:**
```ts
// src/lib/data.ts:11-17
const user = await prisma.user.findUnique({
  where: { id: userId },
  include: { school: { include: { branding: true } }, role: true },
});
```
Returns a plain user row with no `school` or `role` property.

---

### 2. `buildWhere` Only Supports Equality (`=`) (8+ operator types broken)

**Severity:** CRITICAL  
**Impact:** Complex queries generate invalid SQL and crash at runtime.

The shim's `buildWhere` (`src/lib/db.ts:79-92`) only handles `column = $1`. Any object value (e.g., `{ not: "PAID" }`, `{ gte: date }`) is passed directly to the query, producing invalid SQL like `status = [object Object]`.

**Broken operators and examples:**

| Operator | Example in code | Error |
|----------|-----------------|-------|
| `not` | `id: { not: id }` (`class-arms/[id]/route.ts:41`, `setup/route.ts:158`) | Tries to bind object as value |
| `in` | `feeItemId: { in: [...] }` (`invoices/generate/route.ts:89`) | Same |
| `lt` / `lte` | `dueDate: { lt: new Date() }` (`bills/route.ts:88`) | Same |
| `gte` / `lte` | `createdAt: { gte: startDate, lte: endDate }` (`analytics/route.ts:50-53`) | Same |
| `startsWith` | `key: { startsWith: "expense_" }` (`analytics/route.ts:66`) | Same |
| `OR` | `OR: [{ classId: ... }, { classId: null }]` (`invoices/generate/route.ts:69`) | Same |
| Nested filter | `feeGroup: { isActive: true }` (`invoices/generate/route.ts:66`) | Same |

---

### 3. Composite-Key `upsert` Is Broken (34 occurrences)

**Severity:** CRITICAL  
**Impact:** Any `upsert` using a composite `where` key will fail with a SQL error.

The shim's `upsert` calls `findUnique` with the `where` object. `findUnique` passes that object to `buildWhere`, which only supports simple `column = value`. Composite keys like `{ schoolId_key: { schoolId, key } }` produce invalid SQL.

**Affected areas:**
- `src/app/api/admin/school/activate/route.ts` — All `schoolSetting.upsert` calls (active session, active term, user context).
- `src/app/api/admin/setup/route.ts` — All `schoolSetting.upsert`, `schoolBranding.upsert`, `session.upsert`, `term.upsert`, `classGroup.upsert`, `user.upsert`, `teacher.upsert`, `parent.upsert`, `student.upsert`.
- `src/app/api/admin/school/route.ts` — School creation/update.

**Example crash:**
```ts
await prisma.schoolSetting.upsert({
  where: { schoolId_key: { schoolId: "default", key: "active_session_id" } },
  ...
});
// Produces: SELECT * FROM school_setting WHERE school_id_key = $1 LIMIT 1
// Value bound: [object Object] — SQL error.
```

---

### 4. Nested `create` / Relational Writes Not Supported

**Severity:** CRITICAL  
**Impact:** Creating records with related data fails because the shim treats nested objects as literal column values.

**Examples:**
- `src/app/api/admin/school/route.ts:38` — `prisma.school.create({ data: { branding: { create: {} } } })` tries to insert `{ create: {} }` into the `branding` column.
- `src/app/api/admin/invoices/generate/route.ts:125-130` — `prisma.invoice.create({ data: { items: { create: [...] } } })` tries to insert a nested object into the `items` column.

---

### 5. `user.schoolId` Column Does Not Exist

**Severity:** CRITICAL  
**Impact:** Any code that reads or writes `schoolId` on the `user` table crashes.

The `user` table schema (`scripts/schema.sql:103-113`) does **not** contain a `school_id` column. It was removed for single-school deployment.

**Broken code:**
- `src/app/admin/actions.ts:10-13` — `prisma.user.update({ data: { schoolId } })` → "column school_id does not exist"
- `src/app/admin/[section]/page.tsx:179` — `if (!profile?.schoolId || !profile.school) return null;` — Always returns `null`, rendering a blank page for ALL admin sections because `profile` has no `schoolId` and no `school` (from `include` issue).
- `src/app/admin/reception/page.tsx:33` — `VisitorClient schoolId={profile.schoolId}` — passes `undefined`.
- `src/app/api/admin/setup/route.ts` (users-roles step) — Creates users with `schoolId` field.
- `src/app/api/admin/school/route.ts:45-48` — `prisma.user.update({ data: { schoolId: school.id } })`.

---

### 6. `/admin/[section]` Page Returns Blank

**Severity:** CRITICAL  
**Impact:** The main admin hub (`/admin/dashboard`, `/admin/students`, etc.) renders `null`.

Caused by the intersection of Issues 1 and 5:
```ts
// src/app/admin/[section]/page.tsx:179
if (!profile?.schoolId || !profile.school) {
  return null;
}
```
`getCurrentSchoolByUser` returns a user without `schoolId` (column removed) and without `school` (`include` ignored). The page bails out and renders nothing.

---

### 7. Analytics API Route (`/api/admin/dashboard/analytics`) Crashes

**Severity:** HIGH  
**Impact:** Admin dashboard chart data never loads.

- `createdAt: { gte: ..., lte: ... }` → invalid SQL (date range operator not supported).
- `key: { startsWith: "expense_" }` → invalid SQL.
- `include: { invoice: true }` → silently ignored (invoice data missing from payment records).

---

### 8. Bill Generation Route (`/api/admin/invoices/generate`) Crashes

**Severity:** HIGH  
**Impact:** Cannot generate student bills/invoices.

- `feeGroup: { isActive: true }` nested filter → invalid SQL.
- `OR: [...]` operator → invalid SQL.
- `feeItemId: { in: [...] }` → invalid SQL.
- `items: { create: [...] }` nested create → tries to insert object as column value.
- `include: { items: ..., student: ..., term: ..., session: ... }` → silently ignored; response mapping will reference missing nested objects.

---

### 9. Bill Listing Route (`/api/admin/bills`) Crashes or Returns Corrupt Data

**Severity:** HIGH  
**Impact:** Admin cannot view or search bills.

- `status: { not: "PAID" }` and `dueDate: { lt: new Date() }` → invalid SQL.
- Extensive `include` usage → all related data (`student`, `class`, `term`, `items`, `payments`) missing.
- Client-side filter accesses `inv.student.user.name` → `TypeError: Cannot read properties of undefined`.

---

### 10. Admin Settings / School Page Shows "Setup"

**Severity:** MEDIUM  
**Impact:** School name and branding never display correctly.

`src/app/admin/settings/school/page.tsx` uses `profile?.school?.name` and `profile?.school?.branding?.logoUrl`. Both are `undefined` because `getCurrentSchoolByUser` ignores `include`.

---

### 11. Reception Dashboard Data Missing

**Severity:** MEDIUM  
**Impact:** Reception metrics show zeros or crash.

`admin/reception/dashboard/dashboard-client.tsx` fetches aggregated stats. The underlying API routes (not fully audited here but implied by pattern) likely use `prisma` with unsupported operators or `include`, causing incomplete data.

---

### 12. Super Admin Dashboard Logic Bug

**Severity:** MEDIUM  
**Impact:** Super Admin flow may behave unexpectedly.

`src/components/role-dashboard.tsx:35`:
```ts
const superAdminWithSchool = roleScope === "superadmin" && "default";
```
This evaluates to the string `"default"` (truthy), so the `!superAdminWithSchool` guard at line 38 is **always false**. The Super Admin "no school" redirect to `/setup` never triggers.

---

## Issue Summary by Severity

| Severity | Count | Description |
|----------|-------|-------------|
| **CRITICAL** | 6 | Blank admin pages, runtime crashes on core flows (setup, billing, user management) |
| **HIGH** | 3 | Finance/analytics APIs crash; invoice generation fails |
| **MEDIUM** | 2 | Branding display incorrect; Super Admin logic edge case |
| **LOW** | 0 | — |

---

## Files Requiring Immediate Rewrite

| File | Issue |
|------|-------|
| `src/lib/data.ts` | `getCurrentSchoolByUser` and `getCoreSchoolDataByContext` rely entirely on `include`. |
| `src/app/admin/[section]/page.tsx` | Checks `profile.schoolId` (removed) and `profile.school` (missing due to `include`). |
| `src/app/api/admin/setup/route.ts` | 50+ Prisma calls with `include`, composite `upsert`, nested `create`. |
| `src/app/api/admin/school/route.ts` | Nested `create` for branding; `user.schoolId` update. |
| `src/app/api/admin/school/activate/route.ts` | Composite-key `schoolSetting.upsert`. |
| `src/app/api/admin/bills/route.ts` | `not`, `lt`, extensive `include`. |
| `src/app/api/admin/invoices/generate/route.ts` | `OR`, `in`, nested `create`, extensive `include`. |
| `src/app/api/admin/dashboard/analytics/route.ts` | `gte`/`lte`, `startsWith`, `include`. |
| `src/app/api/admin/class-arms/[id]/route.ts` | `not` operator, `include` for student count check. |
| `src/app/admin/actions.ts` | `user.schoolId` update on non-existent column. |

---

## Recommended Fix Strategy

1. **Fix the shim or abandon it.** Either:
   - Rewrite `src/lib/db.ts` `createModelClient` to properly support `include` with JOINs, composite keys, and common operators (`not`, `in`, `lt`/`gt`, `OR`), **or**
   - Replace all `prisma.` calls in admin code with raw SQL queries that match the actual schema.

2. **Rewrite `getCurrentSchoolByUser`** to use raw SQL:
   ```ts
   const user = await queryOne(`SELECT u.*, r.name as role_name FROM "user" u JOIN role r ON u.role_id = r.id WHERE u.id = $1`, [userId]);
   const school = await queryOne(`SELECT * FROM school WHERE id = 'default'`);
   const branding = await queryOne(`SELECT * FROM school_branding WHERE school_id = 'default'`);
   ```

3. **Remove all `schoolId` references from `user` table operations.** The `user` table has no `school_id` column.

4. **Replace composite-key `upsert` calls** with explicit `SELECT → UPDATE or INSERT` raw SQL sequences.

5. **Replace nested `create` calls** with separate INSERT statements in a transaction.

6. **Audit all admin API routes** for unsupported operators and `include` usage, rewriting to raw SQL where needed.

---

## Conclusion

The admin area is **structurally present but functionally impaired**. The build succeeds because the Prisma shim provides TypeScript-level API compatibility, but it does not provide SQL-level compatibility for anything beyond the simplest equality-based CRUD. **A concerted rewrite of the admin data layer from Prisma shim calls to raw SQL is required before the admin area can be considered production-ready.**
