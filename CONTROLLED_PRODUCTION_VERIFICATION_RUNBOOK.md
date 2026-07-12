# Controlled Production Verification Runbook

**Use this only for a supervised, manual production verification session.** Do not automate these steps.

## Pre-flight constants you must set

Replace the placeholders below and use them in every command.

```text
PRODUCTION_URL=https://<your-production-domain>
SCHOOL_ID=<your-production-school-id>
DATABASE_URL=<your-production-database-url>
ADMIN_SMOKE_EMAIL=<existing-production-admin-email-for-smoke-test>
ADMIN_SMOKE_PASSWORD=<existing-production-admin-password-for-smoke-test>
```

Set the controlled test domain to a non-existent domain so no real user receives an email if SMTP fires:

```bash
export CONTROLLED_TEST_DOMAIN="sckoolsuite-test.invalid"
```

---

## 1. Exact command sequence (in order)

### 1.1 Verify production backup is restorable
*(Perform this in your hosting/Railway/Supabase dashboard before running any script.)*

### 1.2 Dry-run create

```bash
DRY_RUN=true \
CONTROLLED_TEST_ENV=production \
CONTROLLED_TEST_SCHOOL_ID="$SCHOOL_ID" \
CONTROLLED_TEST_PASSWORD="$(openssl rand -base64 24)" \
CONTROLLED_TEST_DOMAIN="sckoolsuite-test.invalid" \
DATABASE_URL="$DATABASE_URL" \
node scripts/create-controlled-test-set.js
```

### 1.3 Live create (only after dry-run review)

```bash
export CONTROLLED_TEST_PASSWORD="$(openssl rand -base64 24)"
# Save the password in your password manager now.

CONTROLLED_TEST_ENV=production \
CONTROLLED_TEST_SCHOOL_ID="$SCHOOL_ID" \
CONTROLLED_TEST_PASSWORD="$CONTROLLED_TEST_PASSWORD" \
CONTROLLED_TEST_DOMAIN="sckoolsuite-test.invalid" \
DATABASE_URL="$DATABASE_URL" \
node scripts/create-controlled-test-set.js
```

### 1.4 Copy the `CONTROLLED_TEST_PREFIX`

From the live create output, copy the line that looks like:

```text
CONTROLLED_TEST_PREFIX: SCKOOLSUITE TEST 2026-07-10T22:30:00.000Z-1a2b3c
```

Set it as an environment variable:

```bash
export CONTROLLED_TEST_PREFIX="SCKOOLSUITE TEST <paste-here>"
```

### 1.5 Manual workflow verification (browser)

Open `$PRODUCTION_URL/login` and run the manual test script in Section 7.

### 1.6 Dry-run cleanup

```bash
DRY_RUN=true \
CONTROLLED_TEST_ENV=production \
CONTROLLED_TEST_SCHOOL_ID="$SCHOOL_ID" \
CONTROLLED_TEST_PREFIX="$CONTROLLED_TEST_PREFIX" \
DATABASE_URL="$DATABASE_URL" \
node scripts/cleanup-controlled-test-set.js
```

### 1.7 Live cleanup (only after dry-run review)

```bash
CONTROLLED_TEST_ENV=production \
CONTROLLED_TEST_SCHOOL_ID="$SCHOOL_ID" \
CONTROLLED_TEST_PREFIX="$CONTROLLED_TEST_PREFIX" \
DATABASE_URL="$DATABASE_URL" \
node scripts/cleanup-controlled-test-set.js
```

### 1.8 Non-destructive production smoke test

```bash
TEST_BASE_URL="$PRODUCTION_URL" \
TEST_ADMIN_EMAIL="$ADMIN_SMOKE_EMAIL" \
TEST_ADMIN_PASSWORD="$ADMIN_SMOKE_PASSWORD" \
npx playwright test -c playwright.config.ts
```

---

## 2. Checklist after each command

### After dry-run create

- [ ] Command exits with code `0`.
- [ ] Target database URL is masked (shows `****` for credentials).
- [ ] Target school name matches the intended production school.
- [ ] `Unique prefix` contains a timestamp and hex suffix.
- [ ] `Dry run: YES` is printed.
- [ ] Record list shows exactly: 1 session, 1 term, 1 class group, 1 class, 1 arm, 1 subject, 4 users, 4 profiles, teacher assignments, and setup_wizard_status.
- [ ] Password line shows asterisks, not the real password.
- [ ] No errors, no stack traces.

### After live create

- [ ] Command exits with code `0`.
- [ ] `CONTROLLED_TEST_PREFIX` is printed and copied.
- [ ] IDs are returned for session, term, class, arm, subject, and all four users.
- [ ] Emails shown use the `sckoolsuite-test.invalid` domain.
- [ ] You can log in as admin, teacher, parent, and student.
- [ ] School settings load without errors.
- [ ] No unrelated production records were modified.

### After manual workflow verification

- [ ] Admin can create/list session, term, class, arm, subject, teacher, parent, student.
- [ ] Teacher views only assigned class/arm/subject.
- [ ] Teacher enters scores and submits result OR uploads a result PDF.
- [ ] Admin reviews, approves, and publishes result (including uploaded PDFs without computed scores).
- [ ] Parent sees linked child and views published report or uploaded PDF.
- [ ] Parent cannot view another student's report.
- [ ] Student previews own result.
- [ ] Student cannot access another student's result.
- [ ] Emails (if enabled) delivered only to controlled addresses.
- [ ] PDF downloads and contains correct branding, session, term, scores.

### After dry-run cleanup

- [ ] Command exits with code `0`.
- [ ] Target database URL is masked.
- [ ] `Unique prefix` matches the value copied from live create.
- [ ] `Dry run: YES` is printed.
- [ ] Record counts match the records created in live create.
- [ ] Counts do **not** include unrelated production records.
- [ ] No errors.

### After live cleanup

- [ ] Command exits with code `0`.
- [ ] Each controlled record type reports the same count as live create.
- [ ] Re-logging in as the controlled admin/teacher/parent/student fails (records removed).
- [ ] Production users/classes/sessions unrelated to the test prefix still exist.

### After smoke test

- [ ] All assertions pass.
- [ ] No screenshots in `test-results/` unless there were failures.
- [ ] `/login` and `/admin/dashboard` load without 500/runtime errors.

---

## 3. Expected output

### Dry-run create (excerpt)

```text
🔒 Controlled Production Test Set
================================

DRY-RUN SUMMARY
---------------
Target database: postgresql://****@****:5432/****
Target school:   <school-id> (Your School Name)
Environment:     production
Unique prefix:   SCKOOLSUITE TEST 2026-07-10T22:30:00.000Z-1a2b3c
Records to create/update:
  - Session: SCKOOLSUITE TEST 2026-07-10T22:30:00.000Z-1a2b3c Session
  - Term: SCKOOLSUITE TEST 2026-07-10T22:30:00.000Z-1a2b3c Term
  ...
Password:        ******** (not logged)
Dry run:         YES — no mutations will be made

✅ Dry run complete. No records were created.
Set CONTROLLED_TEST_PREFIX=SCKOOLSUITE TEST 2026-07-10T22:30:00.000Z-1a2b3c when running cleanup.
```

### Live create (excerpt)

```text
🔒 Controlled Production Test Set
================================

✅ Controlled production test set created/updated.

CONTROLLED_TEST_PREFIX: SCKOOLSUITE TEST 2026-07-10T22:30:00.000Z-1a2b3c
CONTROLLED_TEST_SCHOOL_ID: <school-id>
Session: SCKOOLSUITE TEST 2026-07-10T22:30:00.000Z-1a2b3c Session (id: 123)
Term:    SCKOOLSUITE TEST 2026-07-10T22:30:00.000Z-1a2b3c Term (id: 124)
Class:   SCKOOLSUITE TEST 2026-07-10T22:30:00.000Z-1a2b3c Class (id: 125)
Arm:     SCKOOLSUITE TEST 2026-07-10T22:30:00.000Z-1a2b3c Arm (id: 126)
Subject: SCKOOLSUITE TEST 2026-07-10T22:30:00.000Z-1a2b3c Subject (id: 127)
Admin user:    controlled-test-2026-07-10t22-30-00-000z-1a2b3c-admin@sckoolsuite-test.invalid (id: 1001)
Teacher user:  controlled-test-2026-07-10t22-30-00-000z-1a2b3c-teacher@sckoolsuite-test.invalid (id: 1002)
Parent user:   controlled-test-2026-07-10t22-30-00-000z-1a2b3c-parent@sckoolsuite-test.invalid (id: 1003)
Student user:  controlled-test-2026-07-10t22-30-00-000z-1a2b3c-student@sckoolsuite-test.invalid (id: 1004)

Password is available only from the environment that ran this script.
Run cleanup with:
  CONTROLLED_TEST_PREFIX=SCKOOLSUITE TEST 2026-07-10T22:30:00.000Z-1a2b3c CONTROLLED_TEST_SCHOOL_ID=<school-id> node scripts/cleanup-controlled-test-set.js
```

### Dry-run cleanup (excerpt)

```text
🧹 Controlled Production Test Set Cleanup
========================================

DRY-RUN SUMMARY
---------------
Target database: postgresql://****@****:5432/****
Target school:   <school-id> (Your School Name)
Environment:     production
Unique prefix:   SCKOOLSUITE TEST 2026-07-10T22:30:00.000Z-1a2b3c
Records to remove:
  - users: 4
  - sessions: 1
  - terms: 1
  - groups: 1
  - classes: 1
  - arms: 1
  - subjects: 1
Dry run:         YES — no deletions will be made

✅ Dry run complete. No records were deleted.
```

### Live cleanup (excerpt)

```text
🧹 Controlled Production Test Set Cleanup
========================================

✅ Controlled test set cleanup complete.

users removed: 4
sessions removed: 1
terms removed: 1
groups removed: 1
classes removed: 1
arms removed: 1
subjects removed: 1
```

---

## 4. Where to find `CONTROLLED_TEST_PREFIX`

Look for this exact line in the create-script output:

```text
CONTROLLED_TEST_PREFIX: SCKOOLSUITE TEST 2026-07-10T22:30:00.000Z-1a2b3c
```

Copy everything after `CONTROLLED_TEST_PREFIX: `, including the literal spaces.

---

## 5. Controlled account emails

After live create, the four emails will follow this pattern:

```text
controlled-test-<timestamp>-<hex>-admin@sckoolsuite-test.invalid
controlled-test-<timestamp>-<hex>-teacher@sckoolsuite-test.invalid
controlled-test-<timestamp>-<hex>-parent@sckoolsuite-test.invalid
controlled-test-<timestamp>-<hex>-student@sckoolsuite-test.invalid
```

Example:

```text
controlled-test-2026-07-10t22-30-00-000z-1a2b3c-admin@sckoolsuite-test.invalid
controlled-test-2026-07-10t22-30-00-000z-1a2b3c-teacher@sckoolsuite-test.invalid
controlled-test-2026-07-10t22-30-00-000z-1a2b3c-parent@sckoolsuite-test.invalid
controlled-test-2026-07-10t22-30-00-000z-1a2b3c-student@sckoolsuite-test.invalid
```

These will be printed in the live create output. Use the printed emails exactly.

---

## 6. Production URLs / pages to open

Replace `https://<your-production-domain>` with your actual production URL.

| Actor | Action | URL |
|---|---|---|
| Admin | Login | `https://<your-production-domain>/login` |
| Admin | Dashboard (after login) | `https://<your-production-domain>/admin/dashboard` |
| Admin | School settings | `https://<your-production-domain>/admin/settings` |
| Admin | Academic setup (sessions/terms) | `https://<your-production-domain>/admin/academics` |
| Admin | Class builder | `https://<your-production-domain>/admin/classes` |
| Admin | Subject manager | `https://<your-production-domain>/admin/subjects` |
| Admin | Teachers | `https://<your-production-domain>/admin/teachers` |
| Admin | Parents | `https://<your-production-domain>/admin/parents` |
| Admin | Students | `https://<your-production-domain>/admin/students` |
| Admin | Result review/approval | `https://<your-production-domain>/admin/results` |
| Teacher | Login | `https://<your-production-domain>/login` |
| Teacher | My classes | `https://<your-production-domain>/teacher/my-classes` |
| Teacher | Score entry | `https://<your-production-domain>/teacher/score-entry` |
| Teacher | Student reports | `https://<your-production-domain>/teacher/student-reports` |
| Parent | Login | `https://<your-production-domain>/login` |
| Parent | Linked children | `https://<your-production-domain>/parent/children` |
| Parent | Results | `https://<your-production-domain>/parent/results` |
| Parent | Report cards (PDF) | `https://<your-production-domain>/parent/report-cards` |
| Student | Login | `https://<your-production-domain>/login` |
| Student | Results | `https://<your-production-domain>/student/results` |
| Student | Report card | `https://<your-production-domain>/student/report-card` |

---

## 7. Concise manual test script

### 7.1 Admin setup

1. Open `$PRODUCTION_URL/login`.
2. Sign in with the controlled admin email and password from the create-script output.
3. Confirm the URL lands on `/admin/dashboard` with no 500 error.
4. Go to `/admin/settings`.
   - Confirm school name and branding load.
   - Capture screenshot.
5. Go to `/admin/academics`.
   - Confirm the controlled session and term are listed.
   - If they are not visible, create a session and term named exactly as the controlled prefix shows.
6. Go to `/admin/classes`.
   - Confirm the controlled class and arm are listed.
   - Confirm the controlled subject appears under subject assignment.
7. Go to `/admin/teachers`.
   - Confirm the controlled teacher is listed.
8. Go to `/admin/parents`.
   - Confirm the controlled parent is listed.
9. Go to `/admin/students`.
   - Confirm the controlled student is listed.
   - Confirm the student shows the controlled class, arm, and parent link.
10. Verify the controlled class/arm/subject all show the controlled teacher assigned.

### 7.2 Teacher result delivery (choose one or test both)

#### Option A — Manual score entry (computed report)

1. Open a fresh browser/incognito window to `$PRODUCTION_URL/login`.
2. Sign in with the controlled teacher email.
3. Confirm landing on teacher dashboard.
4. Go to `/teacher/my-classes`.
   - Confirm only the controlled class/arm is visible.
   - Confirm no other production classes are shown.
5. Go to `/teacher/score-entry`.
   - Select the controlled session, term, class, arm, and subject.
   - Confirm the controlled student appears in the list.
   - Confirm no unrelated students appear.
6. Enter a valid score (e.g., CA 30, Exam 50) for the controlled student.
7. Submit the result.
8. Capture screenshot of the success message.

#### Option B — Upload externally-created result PDF

1. While signed in as the controlled teacher, go to `/teacher/score-entry`.
2. Scroll to the **Upload Result PDF** section.
3. Select the controlled student from the dropdown.
4. Choose a small test PDF file from your laptop.
5. Click **Upload Result PDF**.
6. Confirm the success message: "Result PDF uploaded. It is now pending admin review and publishing."
7. Confirm the uploaded file appears in the **Your uploaded reports** list.
8. Capture screenshot.

### 7.3 Admin result review and publish

1. Return to the admin browser session.
2. Go to `/admin/results`.
   - Confirm the submitted result appears with status `DRAFT`.
   - For uploaded PDFs, confirm the row shows "Uploaded PDF" and a link to the file.
3. Open the result row.
   - Add an approval note if required.
   - Click **Approve**.
   - Confirm status changes to `APPROVED`.
   - For uploaded PDFs, confirm approval succeeds even though there are no computed score rows.
4. Click **Publish**.
   - Confirm status changes to `PUBLISHED`.
5. Capture screenshots of each status.

### 7.4 Parent verification

1. Open a fresh browser/incognito window to `$PRODUCTION_URL/login`.
2. Sign in with the controlled parent email.
3. Go to `/parent/children`.
   - Confirm the controlled child is listed.
   - Capture screenshot.
4. Go to `/parent/results`.
   - Confirm the published result appears for the controlled child.
5. Go to `/parent/report-cards`.
   - For computed reports: open the report card / PDF and confirm it contains controlled student name, school branding, session, term, and scores.
   - For uploaded PDFs: confirm the card is labeled "Uploaded PDF" and opens/downloads the exact PDF the teacher uploaded.
   - Download the PDF.
6. Try to access another student's report by manipulating the URL or selecting another child.
   - Confirm access is denied or the unrelated child is not listed.
7. Capture screenshots.

### 7.5 Student verification

1. Open a fresh browser/incognito window to `$PRODUCTION_URL/login`.
2. Sign in with the controlled student email.
3. Go to `/student/results`.
   - For computed reports: confirm subject performance is visible.
   - For uploaded PDFs: confirm a "Download Result PDF" button is shown and the PDF downloads.
4. Go to `/student/report-card`.
   - Confirm the report card / PDF opens.
5. Try to access `/student/results?studentId=<other-student-id>` or any URL that implies another student.
   - Confirm the app still shows only the logged-in student's data (no authorization bypass).
6. Capture screenshots.

### 7.6 Authorization isolation spot-checks

1. While logged in as teacher, try to open `/admin/results`.
   - Expect redirect/access denied.
2. While logged in as parent, try to open `/admin/dashboard`.
   - Expect redirect/access denied.
3. While logged in as student, try to open `/teacher/score-entry`.
   - Expect redirect/access denied.

---

## 8. Screenshots / evidence to capture

Capture and attach these to the final release report:

1. **Admin login success** — URL shows `/admin/dashboard`, no 500.
2. **School settings page** — school name and branding visible.
3. **Academic setup list** — controlled session/term visible.
4. **Class builder** — controlled class, arm, and subject visible.
5. **Teacher directory** — controlled teacher listed.
6. **Parent directory** — controlled parent listed.
7. **Student directory** — controlled student listed with class/arm/parent link.
8. **Teacher "My Classes"** — only controlled class shown.
9. **Teacher score entry** — controlled student shown, score entered.
9b. **Teacher result PDF upload** — student selected, file chosen, success message, file in uploaded-reports list.
10. **Result status sequence** — DRAFT → APPROVED → PUBLISHED.
10b. **Admin uploaded-PDF review** — result row shows "Uploaded PDF" and file link.
11. **Parent children list** — controlled child linked.
12. **Parent results page** — published result visible.
13. **Parent report-card PDF** — downloaded file + opened PDF showing student name, school, session, term, scores.
14. **Student results page** — own result visible.
15. **Access-denied evidence** — one screenshot of a role trying to access an unauthorized page.
16. **Email delivery evidence** — screenshots from your controlled inbox/SMTP logs showing sender, recipient, school name, login URL.
17. **Create-script output** — showing `CONTROLLED_TEST_PREFIX` and controlled emails.
18. **Cleanup-script output** — showing counts of removed records.
19. **Smoke test output** — final pass summary from `npx playwright test -c playwright.config.ts`.

---

## 9. Non-destructive smoke test command (post-cleanup)

Run this after cleanup to confirm production is still healthy:

```bash
TEST_BASE_URL="$PRODUCTION_URL" \
TEST_ADMIN_EMAIL="$ADMIN_SMOKE_EMAIL" \
TEST_ADMIN_PASSWORD="$ADMIN_SMOKE_PASSWORD" \
npx playwright test -c playwright.config.ts
```

Expected output:

```text
Running 1 test using 1 worker
  ✓ 1 smoke.spec.ts:14:1 › smoke: admin login and dashboard load (6.2s)

  1 passed (7.0s)
```

If it fails, **do not** proceed to release approval. Investigate the failure first.

---

## 10. GO / CONDITIONAL GO / NO-GO decision framework

### GO

Select **GO** only if **all** of the following are true:

- Controlled create succeeded with no errors.
- All manual workflow checks in Section 7 passed (manual score entry or uploaded PDF result).
- Emails (if SMTP is enabled) delivered only to controlled addresses with correct school name and login URL.
- PDF opens, downloads, and contains correct student name, school branding, session, term, and scores.
- Authorization isolation held — no role accessed another role's data.
- Cleanup removed only controlled records; unrelated production data is intact.
- Post-cleanup smoke test passes.
- No P0/P1 defects remain open.

### CONDITIONAL GO

Select **CONDITIONAL GO** if:

- The controlled workflow passed end-to-end, but there are minor, non-blocking issues (e.g., UI copy, non-critical edge cases, styling).
- Each issue has an owner, a fix plan, and an SLA before general availability.
- No issue affects data integrity, authorization, email delivery, or PDF generation.
- Stakeholders accept the residual risk in writing.

### NO-GO

Select **NO-GO** if **any** of the following occur:

- Any step in Section 7 fails or cannot be completed.
- Emails are sent to real/non-controlled addresses.
- PDF is inaccessible, blank, or contains wrong school/student/session/term/scores.
- A role can view or modify another role's data.
- Cleanup deletes or appears to delete unrelated records.
- Post-cleanup smoke test fails.
- Create or cleanup script errors out against production.
- Any P0/P1 blocker remains unresolved.

---

## Completion sign-off

| Role | Name | Date | Decision |
|---|---|---|---|
| Engineering Lead | | | |
| QA Lead | | | |
| Product Owner | | | |

