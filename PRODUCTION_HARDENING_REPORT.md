# Production Hardening Report

**Date:** 2026-06-06
**Scope:** DB Shim Production Hardening (No Prisma Migration)
**Status:** Complete

---

## 1. Connection Pool Tuning

**File:** `src/lib/db.ts`

| Setting | Before | After | Rationale |
|---------|--------|-------|-----------|
| SSL | `false` (always) | `false` dev / `rejectUnauthorized: false` prod | Neon/Vercel require SSL in production |
| Max connections | Default (10) | 20 prod / 10 dev | Handles concurrent school users |
| Idle timeout | Default | 30,000ms | Prevents stale connections |
| Connection timeout | Default | 5,000ms | Fails fast on DB issues |
| Error handling | None | Pool error listener | Logs unexpected disconnects |

---

## 2. Query Error Handling

**File:** `src/lib/db.ts`

All query helpers now wrapped in try/catch with SQL logging:
- `query()` — logs failed SQL with first 120 chars
- `queryOne()` — same
- `queryMany()` — same
- `withTransaction()` — logs rollback reason

This means production errors are traceable in Vercel logs.

---

## 3. TypeScript Types Added

**File:** `src/lib/db-types.ts`

Added 24 model interfaces with proper camelCase fields:
- `School`, `SchoolBranding`, `Role`, `User`, `Parent`, `Teacher`
- `Student`, `Class`, `ClassGroup`, `ClassArm`, `Subject`
- `Session`, `Term`, `FeeGroup`, `FeeItem`
- `Invoice`, `InvoiceItem`, `Payment`, `Receipt`
- `Score`, `Result`, `Attendance`, `Announcement`
- `SchoolSetting`, `SchoolConfigVersion`

These are importable anywhere for type safety:
```ts
import type { User, Session } from "@/lib/db-types";
```

---

## 4. Existing Fixes Still Active

From earlier in this session:
- **camelCase mapping** on all DB results (`mapRow`)
- **`take` limits** on heavy `findMany` queries
- **`count` queries** for accurate dashboard stats
- **`school_id` columns** on 35+ tables
- **Setup wizard auto-complete** via `school.is_setup` fallback

---

## 5. Build Verification

```
npm run build        -> Compiled successfully in ~6s
npx tsc --noEmit     -> 0 errors
```

---

## 6. Vercel Deployment Checklist

Before deploying, ensure in Vercel dashboard:

1. **Environment variables set:**
   - `DATABASE_URL` (Neon connection string)
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL`
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`

2. **Build command:** Default (`next build`) — no custom scripts needed

3. **Framework preset:** Next.js

4. **No `vercel.json` overrides** — the file was cleaned earlier

---

## 7. What's Still Needed Before Real Schools

| Item | Priority | Effort |
|------|----------|--------|
| Add indexes on `school_id`, `user_id`, `session_id`, `term_id` | High | 15 min |
| Add DB backup strategy (Neon auto-backups help) | High | Configure in Neon |
| Rate limiting on API routes | Medium | 1 hour |
| Input sanitization audit | Medium | 2 hours |
| Add Redis or similar for session cache | Low | 2 hours |
| Write proper migrations instead of ad-hoc scripts | Low | Ongoing |

---

## 8. Do NOT Commit/Push Yet

Test locally first:
1. `npm run dev`
2. Log in
3. Verify dashboard loads with correct stats
4. Verify no "setup incomplete" banner
5. Navigate to Settings > Users & Roles
6. Verify users and roles display correctly

Once verified, then commit and push for Vercel deployment.

---

**Next recommended action:** Add PostgreSQL indexes for `school_id` on the heavy tables (invoice, payment, attendance, score, student) before first school goes live. This is a 15-minute change that prevents query slowdown at scale.
