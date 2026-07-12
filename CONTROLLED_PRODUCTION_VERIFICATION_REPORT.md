# Controlled Production Verification Report

**Production URL tested:** `_____________________________`

**Target school ID:** `_____________________________`

**Controlled test prefix:** `_____________________________`

**Run date / time:** `_____________________________`

**Operator:** `_____________________________`

---

## Requirement Matrix

| Requirement | Local | Isolated E2E | Production | Status |
|---|---:|---:|---:|---|
| Admin login | | | | |
| School settings | | | | |
| Academic setup | | | | |
| Teacher creation/login | | | | |
| Parent creation/login | | | | |
| Student creation/login | | | | |
| Teacher assignment | | | | |
| Score submission | | | | |
| Result approval | | | | |
| Result publishing | | | | |
| Parent report access | | | | |
| PDF download | | | | |
| Student result preview | | | | |
| Authorization isolation | | | | |
| User creation emails | | | | |
| Result notification emails | | | | |

*Status values: PASS / FAIL / BLOCKED / NOT TESTED*

---

## 1. Pre-Run Safety Checklist

- [ ] Production database backup created and restorable.
- [ ] Target school ID recorded.
- [ ] Controlled test prefix recorded.
- [ ] No existing records share the same prefix.
- [ ] Email domain is controlled/non-existent (`sckoolsuite-test.invalid` recommended).
- [ ] Real parent/student/teacher/admin emails will NOT be used.
- [ ] `DRY_RUN=true` executed against production first.
- [ ] Dry-run summary reviewed and approved.

---

## 2. Controlled Records Created

| Entity | Name / Email | ID |
|---|---|---|
| Session | | |
| Term | | |
| ClassGroup | | |
| Class | | |
| Arm | | |
| Subject | | |
| Admin | | |
| Teacher | | |
| Parent | | |
| Student | | |

Passwords/secrets: **Not recorded here.** Store in a one-time secrets manager only.

---

## 3. Workflow Verification Notes

### 3.1 Admin flows
- Admin login result:
- School settings load result:
- Session creation/listing result:
- Term creation/listing result:
- Class creation/listing result:
- Arm creation/listing result:
- Subject creation/listing result:
- Teacher creation result:
- Parent creation result:
- Student creation result:

### 3.2 Teacher flows
- Teacher login result:
- Views only assigned students/classes result:
- Enters valid scores result:
- Submits result result:

### 3.3 Admin result review
- Reviews result result:
- Approves result result:
- Publishes result result:

### 3.4 Parent flows
- Parent login result:
- Sees linked child result:
- Views published report result:
- Downloads PDF result:
- Cannot access unrelated student report result:

### 3.5 Student flows
- Student login result:
- Previews own result result:
- Cannot access another student's result result:

---

## 4. Email Verification

| Email | Expected Recipient | Delivered | School Name Correct | Login URL Correct | No Secret in Logs |
|---|---|---|---|---|---|
| Teacher creation | | | | | |
| Parent creation | | | | | |
| Student creation | | | | | |
| Result submission alert | | | | | |
| Result publication alert | | | | | |

Email delivery evidence: `_____________________________`

---

## 5. PDF Verification

- [ ] PDF opens successfully.
- [ ] PDF downloads successfully.
- [ ] Contains correct student name.
- [ ] Contains correct school branding.
- [ ] Contains session and term.
- [ ] Contains scores/results.
- [ ] Cannot be accessed without authorization.
- [ ] Works on desktop viewport.
- [ ] Works on mobile viewport.

PDF sample file: `_____________________________`

---

## 6. Cleanup Verification

- [ ] Cleanup script executed.
- [ ] Only controlled-test records removed.
- [ ] Unrelated production records remain untouched.
- [ ] No orphan records remain.
- [ ] Non-destructive production smoke test re-run.

Controlled records removed: `_____________________________`

---

## 7. Issues & Blockers

| # | Description | Severity | Blocking Release? | Tracking Link/Owner |
|---|---|---|---|---|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |

---

## 8. Release Recommendation

**Select one:**

- [ ] **GO** — Controlled workflow passed in production, cleanup verified, no blockers.
- [ ] **CONDITIONAL GO** — Minor non-blocking issues documented with owners and SLAs.
- [ ] **NO-GO** — One or more blockers remain. Production release must wait.

**Justification:**

`_____________________________`

---

## 9. Sign-Off

| Role | Name | Signature / Date |
|---|---|---|
| Engineering Lead | | |
| QA Lead | | |
| Product Owner | | |

