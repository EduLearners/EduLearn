# Phase 5 — Resilience & Error Logging Report

**Sprint:** EduLearn v11.0 Audit Sprint  
**Branch:** `testing1/utkarsh-audit-sprint`  
**Date:** 2026-05-27

---

## Scope

Phase 5 delivers end-to-end frontend resilience infrastructure: structured client-side error capture, buffered reporting, offline awareness, safe form drafts, and an ITAdmin error dashboard.

---

## Backend Deliverables (Tasks 5.1–5.8, prior sub-phases)

| Component | Description |
|---|---|
| `AppError` entity | Persisted error records with severity, source, kind, message, stackTrace, clientUrl, userAgent, userId, occurredAt, resolved, resolvedBy, resolvedAt, resolutionNote |
| `ErrorLogService` | Isolated-scope service; logs server exceptions and persists client-submitted errors; pagination + filtering |
| `ClientLogsController` | `POST /api/clientlogs` (auth required) — accepts client error payloads; `GET /api/clientlogs` (ITAdmin) — paginated list with filters; `POST /api/clientlogs/{id}/resolve` (ITAdmin) — mark resolved with note |
| Retention background service | Deletes resolved errors older than 90 days on a daily schedule |
| `GlobalExceptionMiddleware` hook | Calls `ErrorLogService.LogServerErrorAsync` for unhandled exceptions; sets structured JSON response |

---

## Frontend Deliverables (Tasks 5.9–5.14)

### Task 5.9 — ErrorBoundary + ErrorFallbackPage

- **`src/components/ErrorBoundary.jsx`** — React class component; catches render-phase exceptions via `componentDidCatch`, calls `errorReporter.reportRender()`, renders `ErrorFallbackPage`. Exposes `onReset` to retry without full reload.
- **`src/components/ErrorFallbackPage.jsx`** — Bootstrap 5.3 fallback UI; shows user-friendly message, collapsible technical details (`<details>`), Reload and Try Again buttons.

### Task 5.10 — errorReporterService

- **`src/services/errorReporterService.js`** — Singleton `ErrorReporter` class:
  - Buffers payloads to `sessionStorage` (`errorReporter.buffer.v1`) so events survive navigation before flush.
  - Debounced flush (1 500 ms) with batching up to 10 per cycle.
  - Rate-limiter: max 30 POSTs per 60-second sliding window.
  - Reconnect listener: flushes on `window.online`.
  - Methods: `reportRender`, `reportNetwork`, `reportApi`, `reportClient`.

### Task 5.11 — axiosClient.js extension

- **`src/api/axiosClient.js`** — Extended (not replaced) the Phase 4 response interceptor:
  - `ECONNABORTED`/`ERR_NETWORK` branch → adds `errorReporter.reportNetwork(error, error.config)`.
  - `status >= 500 && !isAuthEndpoint` branch → adds `errorReporter.reportApi(error)`.
  - Existing `401` auto-logout and `_userMessage` behaviour fully preserved.
  - No toast library present in codebase; toast calls skipped per spec.

### Task 5.12 — useSafeForm + useNetworkStatus

- **`src/hooks/useSafeForm.js`** — Persists form field values to `sessionStorage` (key: `formDraft.<id>.v1`) with 300 ms debounce. Hydrates on mount. `clearDraft()` for post-submit cleanup.
- **`src/hooks/useNetworkStatus.js`** — Subscribes to `online`/`offline` window events; returns `{ online: boolean, since: timestamp }`.

### Task 5.13 — ConnectivityBanner

- **`src/components/ConnectivityBanner.jsx`** — Renders a full-width Bootstrap warning banner (`data-testid="connectivity-banner"`) when `useNetworkStatus` reports offline. Returns null when online (no DOM cost).
- Mounted in `AppLayout.jsx` between `<Navbar />` and the sidebar/main split so it appears across all authenticated pages.

### Task 5.14 — Route + Sidebar wiring

- **`src/main.jsx`** — `<App />` wrapped in `<ErrorBoundary>` inside `<StrictMode>`.
- **`src/components/Layout/AppLayout.jsx`** — `<ConnectivityBanner />` inserted after `<Navbar />`.
- **`src/App.jsx`** — Added route `/admin/errors` gated by `<ProtectedRoute allowedRoles={['ITAdmin']}>`.
- **`src/components/Layout/Sidebar.jsx`** — Added `{ label: 'Errors', to: '/admin/errors', icon: 'bug', roles: ['ITAdmin'] }` at end of ITAdmin block.
- **`src/pages/admin/ErrorsPage.jsx`** — Bootstrap 5.3 table page: filter bar (source, severity, resolved), paginated results, severity badge colouring, inline Resolve modal with optional note, `Loading` + `ErrorAlert` components reused.

---

## Smoke Tests

Manual smoke tests (Tasks 5.15 Steps 1–4) deferred to Phase 7 (demo users not yet seeded in staging; ITAdmin credentials unavailable in CI environment). Acceptance criteria are documented and ready for the Phase 7 demo session.

---

## KG Refresh

Knowledge Graph refresh deferred (ruflo agents do not autonomously read files between sessions). KG update to be triggered manually at Phase 7 sign-off.

---

## Files Changed

```
edulearn.client/src/components/ErrorBoundary.jsx          (new)
edulearn.client/src/components/ErrorFallbackPage.jsx      (new)
edulearn.client/src/components/ConnectivityBanner.jsx     (new)
edulearn.client/src/services/errorReporterService.js      (new)
edulearn.client/src/hooks/useSafeForm.js                  (new)
edulearn.client/src/hooks/useNetworkStatus.js             (new)
edulearn.client/src/pages/admin/ErrorsPage.jsx            (new)
edulearn.client/src/main.jsx                              (modified)
edulearn.client/src/App.jsx                               (modified)
edulearn.client/src/components/Layout/AppLayout.jsx       (modified)
edulearn.client/src/components/Layout/Sidebar.jsx         (modified)
edulearn.client/src/api/axiosClient.js                    (modified)
```
