# Phase 5 — Frontend Resilience Report

**Sprint:** EduLearn v11.0 Audit Sprint  
**Branch:** `testing1/utkarsh-audit-sprint`  
**Date:** 2026-05-27

---

## Scope

Phase 5 adds basic frontend resilience: a React error boundary with a user-friendly fallback page, an offline connectivity banner, axios request timeout, and server-error/auth-expiry handling in the HTTP interceptor.

---

## Deliverables

### ErrorBoundary + ErrorFallbackPage

- **`src/components/ErrorBoundary.jsx`** — React class component wrapping the entire app. Catches render-phase exceptions via `componentDidCatch`, logs to `console.error`, renders `ErrorFallbackPage`.
- **`src/components/ErrorFallbackPage.jsx`** — Bootstrap fallback UI: "Something went wrong. Please try again later." with collapsible technical details and Reload / Try Again buttons.
- **`src/main.jsx`** — `<App />` wrapped in `<ErrorBoundary>` inside `<StrictMode>`.

### ConnectivityBanner + useNetworkStatus

- **`src/hooks/useNetworkStatus.js`** — Subscribes to `online`/`offline` window events; returns `{ online, since }`.
- **`src/components/ConnectivityBanner.jsx`** — Full-width Bootstrap warning banner when offline. Returns null when online.
- **`src/components/Layout/AppLayout.jsx`** — `<ConnectivityBanner />` mounted after `<Navbar />`, visible across all authenticated pages.

### axiosClient.js — timeout + error handling

- `timeout: 15000` — requests fail after 15 seconds instead of hanging.
- `ECONNABORTED`/`ERR_NETWORK` — sets `_userMessage` for UI display.
- `status >= 500` — logged via `console.error`.
- `status === 401` (non-auth endpoints) — clears storage, redirects to `/login`.

### GlobalExceptionMiddleware (pre-existing)

Unchanged from its original implementation. Catches unhandled backend exceptions and returns structured JSON. The Phase 5 hook into error-logging infrastructure was removed during scope cleanup — the middleware retains its original `ILogger`-based logging only.

---

## Files

```
edulearn.client/src/components/ErrorBoundary.jsx          (new)
edulearn.client/src/components/ErrorFallbackPage.jsx      (new)
edulearn.client/src/components/ConnectivityBanner.jsx     (new)
edulearn.client/src/hooks/useNetworkStatus.js             (new)
edulearn.client/src/main.jsx                              (modified)
edulearn.client/src/components/Layout/AppLayout.jsx       (modified)
edulearn.client/src/api/axiosClient.js                    (modified — timeout + interceptor)
```
