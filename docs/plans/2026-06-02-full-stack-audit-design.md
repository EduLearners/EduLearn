# Design: EduLearn Final Full-Stack Audit (2026-06-02)

## Purpose

A single, self-contained audit plan that a **fresh Claude session with zero prior context** can execute to perform the most thorough end-to-end audit of EduLearn to date — backend + frontend, all 7 roles, deep + edge + chaos + form-validation testing, driven live in Chrome so the user watches every step.

## Locked decisions (from brainstorming)

| Decision | Choice | Rationale |
|---|---|---|
| On finding a bug | **Report-only** | Log everything; fix nothing mid-run. Keeps audit clean; fixes are a separate approved pass. |
| Primary axis | **Role-first** | 7 sequential passes (Student → Instructor → Registrar → DeptAdmin → Finance → ITAdmin → Auditor). Mirrors real usage. |
| Chaos depth | **Full kill/restart** | Actually stop the dotnet backend mid-submission, observe frontend, restart. Plus network-offline simulation. |
| Seed scale | **Rich multi-record** | High volume across every entity to surface pagination/capacity/sorting/edge bugs. |
| Browser | **Chrome DevTools MCP, live visible instance** | User reviews each step in real time. Prefer `take_snapshot`; `evaluate_script` for cheap factual reads. |
| Deliverable | **Executable plan/prompt** | The plan is run in a NEW session — must be specific, no vagueness, exact tools + commands. |

## 5-Phase architecture

1. **Phase 0 — Setup & Seed**: rich data, confirm backend (:5001/:5000) + frontend (:5173) up, baseline state.
2. **Phase 1 — Backend Contract sweep**: every endpoint reachable, authz matrix, status codes via direct API calls.
3. **Phase 2 — Role Journeys**: 7 passes; per page run the fixed 7-point checklist (happy / validation / UI inventory / messages / notifications / edge data / authz).
4. **Phase 3 — Chaos/Resilience**: backend kill/restart mid-submit, DevTools offline, toast auto-dismiss, spinner-forever, double-submit.
5. **Phase 4 — Wiring audit**: bidirectional endpoint↔frontend-call compatibility matrix (orphan endpoints, 404 calls, DTO mismatches).
6. **Phase 5 — Synthesis**: master report `docs/AUDIT-2026-06-FINAL.md`, appended per finding, with metrics tables.

## Per-page fixed checklist (Phase 2)

1. Happy path (load, render, primary action, data correctness)
2. Form validation (empty, whitespace, max+1, negative, invalid email/date, unicode/emoji, SQLi/XSS, boundaries)
3. UI/UX inventory (button class `btn-primary-edulearn`, ModalPortal + not clipped, narrow viewport, empty/loading states, read-only locks)
4. Messages (success toast appears + auto-dismisses; errors friendly, no leaked status/stack/route)
5. Notifications (fire when expected, bell badge live update, mark-read)
6. Edge data vs rich seed (pagination, sorting, full sections, overdue invoices, archived items)
7. Authz / IDOR probe for that page's resources

## Output format

Master report, appended per finding (survives crash/compaction):
`ID | Severity (🔴🟠🟡🔵) | Role | Page | Repro steps | Expected vs Actual | File:line | Screenshot ref`
Plus coverage-progression and bug-count metrics tables.

## Known reference points (carried into the plan)

- Live copy: `C:\Users\2487421\OneDrive - Cognizant\Desktop\Vikash\EduLearn`, branch `Transh_fixing`.
- Seed script: `tests/seed-sample-data.ps1 -Reset`; 7 seed accounts (see HANDOFF-2026-06-02.md §2).
- Existing known bugs to re-verify: A1-02 (grade IDOR), A1-03 (read IDOR), A1-10 (dead status dropdown), A1-01 (unlinked student), A1-06 (no pagination).
- Conventions to enforce in UI checks: `btn-primary-edulearn`, ModalPortal, no JSON inputs, read-only field pattern, bfcache guard.

## Next step

Invoke `superpowers:writing-plans` to expand this into the full executable audit plan.
