# Phase 0 — Shared Shell

**Owner:** Utkarsh  
**Must merge before:** any teammate starts Phase 1 (dashboards)  
**Branch:** `feature/frontend-phase0-shell`

---

## What Phase 0 Is

Phase 0 is the foundation every page sits on. If Phase 0 is wrong, every page built on top of it inherits the problem. One person owns it, one PR merges it, everyone else waits.

---

## Deliverables (in order)

### 1. Project scaffold

```bash
npx create-react-app edulearn-frontend --template typescript
cd edulearn-frontend
npm install react-bootstrap bootstrap react-router-dom @reduxjs/toolkit react-redux @tanstack/react-query axios formik zod bootstrap-icons
```

Directory structure:
```
src/
├── api/              axiosInstance.ts, queryClient.ts, endpoints.ts
├── auth/             AuthContext.tsx, useAuth.ts, parseJwt.ts
├── components/
│   ├── shell/        AppShell.tsx, AppSidebar.tsx, TopBar.tsx
│   ├── auth/         RequireAuth.tsx, RequirePersona.tsx, RequireRole.tsx
│   └── shared/       DataTable.tsx, SlidePanel.tsx, EmptyState.tsx,
│                     SkeletonRows.tsx, ToastQueue.tsx, StatusBadge.tsx
├── pages/            (empty dirs per persona — teammates fill these)
├── store/            index.ts, authSlice.ts, personaSlice.ts
├── styles/           _tokens.scss, main.scss (imports Bootstrap)
├── utils/            time.ts, format.ts, constants.ts
└── App.tsx           (route tree + shell wrapper)
```

### 2. Sass tokens

`src/styles/_tokens.scss` — import this BEFORE Bootstrap in `main.scss`:

```scss
@import 'tokens';       // EduLearn overrides
@import '~bootstrap/scss/bootstrap';
```

All values live in `docs/frontend/design-language/_tokens.scss`. Copy verbatim. Do not modify without updating the spec.

**Critical rule:** No hardcoded hex values anywhere in component files. Use `$brand-500`, `var(--brand-500)`, or Bootstrap semantic names that map to our tokens.

### 3. AppShell

`src/components/shell/AppShell.tsx` — the root layout component all pages render inside:

```tsx
<AppShell>
  <AppSidebar />       // 240px persistent rail, collapses to 64px at <1024px
  <div className="app-content">
    <TopBar />         // 56px
    <main>
      <Outlet />       // React Router child route renders here
    </main>
  </div>
</AppShell>
```

**Sidebar active state spec:**
- Learner / Operations / Governance personas: `neutral-0` background sidebar, active item = `brand-100` tint + `box-shadow: inset 2px 0 0 var(--brand-500)` (2px left inset — NOT a side-stripe border)
- Educator persona: `brand-500` (#1f4d2c) background sidebar, active item = `background: rgba(255,255,255,0.10)` + `box-shadow: inset 2px 0 0 #fdfcfa`

The sidebar reads `currentPersona` from Redux store to select the correct item set. See `docs/frontend/ia/role-nav.md` for per-persona nav items.

**Top bar spec:**
- Learner / Operations / Governance: `neutral-0` background, brand-500 wordmark
- Educator: `brand-700` (#142d1c) background, `neutral-0` wordmark
- Notification bell (`bi-bell`) + unread badge (React Query, `/api/notifications/unread-count`, refetch every 30s)
- User avatar + dropdown (profile / logout)
- Persona switcher (ITAdmin only — see `docs/frontend/ia/role-nav.md` §3)

### 4. Route tree

`src/App.tsx` — all routes registered here. Each route is wrapped in the appropriate guard:

```tsx
<RequireAuth>           // blocks if no valid JWT in sessionStorage
  <RequirePersona persona="Learner">   // blocks + auto-switches if wrong persona
    <Route path="/student/courses" element={<CoursesPage />} />
  </RequirePersona>
</RequireAuth>
```

ITAdmin cross-persona auto-switch behavior: documented in `docs/frontend/ia/routes.md` §4.

### 5. Auth

`src/auth/`:
- `parseJwt(token)` — decode JWT claims (UserID, Role, FullName) without a library
- `useAuth()` — hook returning `{ user, role, isAuthenticated, logout }`
- `sessionStorage` for JWT (clears on tab close — per mentor-approved approach)
- Axios interceptor: inject `Authorization: Bearer {token}` on every request, redirect to `/login` on 401

### 6. Redux slices

```ts
// authSlice: { user: { userId, role, fullName } | null, token: string | null }
// personaSlice: { currentPersona: 'Learner'|'Educator'|'Operations'|'Governance' }
```

`currentPersona` initialized from `sessionStorage.getItem('itPersona')` on store hydration.

### 7. React Query client

`src/api/queryClient.ts`:
```ts
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,       // 1 minute default
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})
```

### 8. Shared components (build once, use everywhere)

| Component | Props | Notes |
|---|---|---|
| `<DataTable>` | `columns`, `rows`, `loading`, `emptyMessage` | Bootstrap `.table`, sticky thead, sortable headers, skeleton rows on loading |
| `<SlidePanel>` | `show`, `onHide`, `title`, `width=400` | Bootstrap Offcanvas, `backdrop={false}` for gradebook use case |
| `<EmptyState>` | `icon`, `message`, `action?` | Centered, neutral-500 icon, body text, optional CTA button |
| `<SkeletonRows>` | `rows=5`, `cols=3` | Bootstrap placeholder-glow rows inside a table |
| `<ToastQueue>` | (context, no props) | Bootstrap Toast stack, bottom-right, 4s auto-dismiss |
| `<StatusBadge>` | `status`, `variant` | Maps string status to Bootstrap badge variant |

### 9. Utility functions

`src/utils/time.ts`:
```ts
export function formatRelative(isoDate: string): string  // "5 min ago", "Nov 8 10:34 am"
export function formatDateTime(isoDate: string): string  // "Nov 8, 2026 at 10:34 am IST"
```

`src/utils/format.ts`:
```ts
export function formatCurrency(amount: number): string   // "₹52,000" (en-IN locale)
export function formatTabularNum(n: number): string      // toLocaleString('en-IN')
```

`src/utils/constants.ts`:
```ts
export const METRIC_LABELS: Record<string, string>      // KPI key → display name
export const ACTION_LABELS: Record<string, string>      // Audit action → verb
```

### 10. IBM Plex fonts

Download IBM Plex Sans + IBM Plex Mono from Google Fonts or IBM's GitHub (OFL license). Place in `public/fonts/`. Self-host — do not use Google Fonts CDN link in production (latency + privacy).

```css
@font-face {
  font-family: 'IBM Plex Sans';
  src: url('/fonts/IBMPlexSans-Regular.woff2') format('woff2');
  font-weight: 400;
  font-display: swap;
}
/* ... weight 500, 600, 700 */

@font-face {
  font-family: 'IBM Plex Mono';
  src: url('/fonts/IBMPlexMono-Regular.woff2') format('woff2');
  font-weight: 400;
  font-display: swap;
}
```

---

## Phase 0 Definition of Done

- [ ] `npm start` runs without errors
- [ ] `npm run build` produces a clean build
- [ ] AppShell renders with correct sidebar + top bar for each persona
- [ ] Switching persona (ITAdmin) updates nav rail and top bar in 300ms
- [ ] Login flow: POST `/api/auth/login` → sessionStorage → redirect to `/`
- [ ] 401 response → cleared sessionStorage → redirect to `/login`
- [ ] All Sass tokens compile; no hardcoded hex in any component file
- [ ] IBM Plex Sans + Mono render correctly on Chrome + Edge
- [ ] DataTable renders skeleton rows during loading
- [ ] Toast queue shows + auto-dismisses
- [ ] Route guards block unauthorized access correctly

**No teammate starts Phase 1 until this checklist is complete and the PR is merged.**
