# Phase 2 — Browser Chaos Test Findings (Wave 1)

**Date:** 2026-05-29
**Harness:** `tests/browser-chaos/chaos-harness.js` (Wave1-2026-05-29)
**Execution:** Claude preview browser (frontend :5173 → API :5001), live running app + seeded data.
**Scope:** Backend API authorization matrix, frontend route-access, auth chaos, Phase 1 re-verification.

---

## Summary

| Layer | Checks | Pass | Fail | Notes |
|-------|--------|------|------|-------|
| A — Backend API authz (7 roles × 19 endpoints) | 133 | 133 | 0 | Fully PRD-aligned |
| B — Frontend route-access | 27 routes + live spot-checks | all | 0 | Map complete, guard verified |
| Auth chaos (cross-role back) | 1 | 1 | 0 | Reported bug fixed |
| Phase 1 re-verification | 3 | 3 | 0 | All claimed fixes hold |

**No product bugs found in Wave 1.** Every initial "failure" was a defect in the *test harness*, not the application. The two originally-reported bugs are verified fixed against the live app.

---

## Harness defects found and fixed (not product bugs)

These were caught because the harness's first run produced 24 "failures." Investigation against the **PRD (`docs/EduLearn-PRD-v1.0_2.docx` §6), `docs/PRD-DISCREPANCIES.md`, the actual controller `[Authorize]` attributes, and the policies in `Program.cs`** showed the application was correct and the harness expectations were wrong.

| # | Harness defect | Cause | Fix |
|---|----------------|-------|-----|
| H-1 | `GET /users` expected ITAdmin-only | Real policy `UserViewPolicy` = ITAdmin, Registrar, DeptAdmin | Corrected matrix |
| H-2 | `POST /rooms` expected ITAdmin-only | PRD ETS-02 + `DeptAdminPolicy` = DeptAdmin, ITAdmin | Corrected matrix |
| H-3 | `POST /sections` expected ITAdmin-only | PRD ETS-02 + Roles `Registrar,DeptAdmin,ITAdmin` | Corrected matrix |
| H-4 | `POST /submissions` expected to allow ITAdmin | Real attribute Roles=`Student` only | Corrected matrix |
| H-5 | All GET-expecting-403 returned `HTTP 0` | Harness sent a JSON body on GET requests; the fetch spec forbids it, so `fetch` threw. This also *masked* allowed-GET results (HTTP 0 ≠ 403 passed for the wrong reason). | `api()` no longer attaches a body to GET/HEAD |
| H-6 | ITAdmin login intermittently failed; GET clusters flaky | 133 fetches fired as a tight burst → dev server dropped connections | Added 1 retry on transient (status 0) + 20 ms throttle |

After fixes: **133/133 pass**, verified with real status codes (403 for unauthorized, 200 for authorized) on the previously-failing GET endpoints.

---

## Backend API authorization (Layer A) — PASS

All 19 representative endpoints enforce the correct roles for all 7 roles (133 checks). Source of truth: controller `[Authorize]` + `Program.cs` policies, cross-checked with PRD §6. Policy expansions documented in the harness `API_ACCESS` comments.

---

## Frontend route authorization (Layer B) — PASS

- **Route-map completeness:** all 27 protected route segments in `App.jsx` have a matching entry in `config/routeRoles.js` `SECTION_ROLES`. No route silently defaults to `'*'` → no hidden access holes.
- **Live guard checks (`RoleGuardedOutlet`):**
  - Student → `/users` → **Access Denied** ✓ (the originally-reported cross-role page bleed)
  - Finance → `/reports` → **Access Denied** ✓
  - Auditor → `/reports` → **renders** ✓ (positive control)

---

## Auth chaos — PASS

**Cross-role back-button bleed (originally-reported bug #2):**
Reproduced the exact scenario — Auditor renders `/reports`, navigate to `/dashboard`, switch session to Student, press browser **Back** to `/reports`. Result: **Access Denied, no Reports content leaked.** The `pageshow`/bfcache reload + `RoleGuardedOutlet` re-evaluation correctly catch the role change. Fixed.

---

## Phase 1 re-verification — PASS

| Claim | Result |
|-------|--------|
| Case-sensitive username login | `Registrar` (caps) → 401; `registrar` → 200 ✓ |
| Generic auth errors (no stack/route leak) | 401 body = `{"error":"You need to sign in to continue.","code":"AUTH_REQUIRED"}` — no stack trace/route ✓ |
| Student form Gender includes "Prefer not to say" | Options: Male, Female, Other, Prefer not to say ✓ |
| Backend API authorization (Phase 1 hardening) | 133/133 enforced ✓ |
| Frontend route authorization | Complete + live-verified ✓ |
| Back/forward + bfcache cross-role bypass | Fixed + live-verified ✓ |

---

## Conclusion

Wave 1 found **zero product defects**. The application's authorization (backend and frontend) is PRD-aligned and the two originally-reported security bugs are confirmed fixed on the live app. The only defects were in the test harness itself (wrong expectations + a GET-body bug + burst flakiness), now corrected so the matrix is trustworthy and re-runnable.

**Next:** Wave 2 (per-role navigation + all 7 dashboards: render, metrics, empty/error states, console errors).
