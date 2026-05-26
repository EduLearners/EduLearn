# Phase 3 — Chaos Engineering Report

## Analysis method

All scenarios evaluated by reading source code (axiosClient.js, form components, App.jsx, ProtectedRoute.jsx, authService). No live execution.

---

## Backend Chaos

| ID | Scenario | Observed Behavior | Severity | Fix Required | Fix Hint |
|----|----------|-------------------|----------|--------------|----------|
| BE-1 | Backend completely offline | Axios throws a Network Error (no `error.response`). `ErrorAlert` receives the error object; `error.response?.data?.error` is undefined, `error.message` is "Network Error" — so the alert reads "Network Error". No white screen. Forms show the ErrorAlert component with "Network Error". Auth pages show the inline alert div. **No timeout — request hangs until browser TCP timeout (~2 min).** | High | Partial | Add a global `axiosClient` timeout (e.g. `timeout: 15000`). Add a user-visible "Connection timed out — please check your network" message distinct from API errors. Evidence: `axiosClient.js:4` — no `timeout` property set. |
| BE-2 | Invalid / expired JWT token | The response interceptor (`axiosClient.js:39-43`) detects `status === 401` and `!isAuthEndpoint`, then calls `localStorage.clear()`, `sessionStorage.clear()`, and `window.location.href = '/login'`. User is redirected to login. Correct behavior. | Low | No | — |
| BE-3 | 500 from any endpoint | Axios rejects with `error.response.status === 500`. The error propagates to the calling component's `catch` block, which calls `setError(err)`. `ErrorAlert` extracts `error.response?.data?.error` (the API's `error` field) or falls back to `error.message`. In development mode the API also returns `detail` and `exceptionType` which are shown in a monospace block (`ErrorAlert.jsx:21-33`). No global toast system exists — each page/component handles its own error display. Pages without an `ErrorAlert` render (e.g. dashboard data-load errors are silently caught) would show no feedback. | Medium | Yes | Add a global error boundary or a toast notification system for unhandled 5xx responses in the axios response interceptor. Evidence: `axiosClient.js:31-46` — no global 5xx handler. |
| BE-4 | Slow network / no timeout configured | No timeout is set on the `axiosClient` instance (`axiosClient.js:4-7`). Requests hang indefinitely until the browser TCP timeout (~2 min). During this time, the loading spinner is shown and the submit button is disabled — the UI does not freeze. However, the user has no indication a timeout occurred vs. a normal delay, and no way to cancel. | Medium | Yes | Add `timeout: 15000` (15 s) to `axios.create()`. Handle `error.code === 'ECONNABORTED'` in the response interceptor to show a specific "Request timed out" message. Evidence: `axiosClient.js:4`. |

---

## UI Chaos

| ID | Scenario | Observed Behavior | Severity | Fix Required | Fix Hint |
|----|----------|-------------------|----------|--------------|----------|
| UI-1 | Double-click submit | All audited form submit buttons have `disabled={loading}` or `disabled={saving}` set, and the flag is set synchronously before the async call. A second click before the state update settles is mitigated by React batching. **All 11 audited forms pass this check.** Evidence: `LoginPage.jsx:102`, `NewStudentPage.jsx:321`, `UsersPage.jsx:574`, etc. | Low | No | — |
| UI-2 | Navigate away mid-form | No `beforeunload` handler or React Router `<Prompt>` / `useBlocker` is implemented in any form component. A user who has partially filled a form can navigate away (click sidebar, browser back) without any "You have unsaved changes" warning. Data is silently discarded. | Medium | Yes | Implement `useBlocker` (React Router v6) or a `beforeunload` event listener in multi-field forms (NewStudentPage, CourseFormPage, ProgramFormPage, AssessmentFormPage) to warn on dirty state. Note: this applies only to full-page forms, not modal forms which overlay existing content. |
| UI-3 | Network loss during form fill / draft survival | No draft auto-save or `localStorage` persistence is implemented for any form. If the browser loses connectivity mid-fill and the user reloads, all entered data is lost. | Low | No | Acceptable for v11.0. Future enhancement: `localStorage` draft persistence with opt-in restore. |
| UI-5 | `localStorage.clear()` — forced session wipe | Calling `localStorage.clear()` removes the `jwt`, `role`, and `username` keys. On the next navigation or API call: (a) The axios request interceptor attaches no `Authorization` header (`axiosClient.js:23-27`). (b) The backend returns 401. (c) The response interceptor fires `window.location.href = '/login'`. If the user is on a static page (no API call), `ProtectedRoute` checks `authService.isAuthenticated()` which reads `localStorage.getItem('jwt')` — returns null — and redirects to `/login`. **User is correctly redirected to login.** | Low | No | — |

---

## Summary of new findings (not in Phase 2)

| Finding | ID | Severity | File:Line |
|---------|----|----------|-----------|
| No request timeout on axiosClient — hangs indefinitely on offline backend | BE-4 | Medium | `axiosClient.js:4` |
| No global 5xx handler — page-level errors miss dashboard silent catch | BE-3 | Medium | `axiosClient.js:31` |
| No unsaved-changes warning on navigate-away from multi-field forms | UI-2 | Medium | `NewStudentPage.jsx`, `CourseFormPage.jsx`, `ProgramFormPage.jsx`, `AssessmentFormPage.jsx` |

---

## Phase 4 fix candidates (medium+ severity, fix-required=true)

The following chaos findings are new (not already in Phase 2) and warrant Phase 4 fixes:

| Fix candidate | Area | Evidence | Severity |
|---------------|------|----------|----------|
| Add `timeout: 15000` to axiosClient + handle ECONNABORTED | network-resilience | `axiosClient.js:4` | Medium |
| Add global 5xx toast in axios response interceptor | error-handling | `axiosClient.js:31-46` | Medium |
| Implement unsaved-changes `useBlocker` on full-page forms | ux-safety | `NewStudentPage.jsx`, `CourseFormPage.jsx`, `ProgramFormPage.jsx`, `AssessmentFormPage.jsx` | Medium |
