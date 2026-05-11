# Page Spec — Users List

**Route:** `/admin/users`
**Component:** `src/pages/governance/UsersListPage.tsx`
**Persona:** Governance (ITAdmin write, Auditor read-only via UserViewPolicy — but Auditor cannot see this page per role-nav.md §5 which hides Users for Auditor)
**Effective access:** ITAdmin only
**Status:** Ready for implementation

---

## 1. Purpose

ITAdmin's user account management surface. Provision new accounts, change status (Active/Suspended/Locked), reset MFA. The "context-jumper" workflow: find a user fast, see their full state, act.

---

## 2. API

```
GET /api/users                          — paginated user list
GET /api/users/{id}                     — user detail (for Offcanvas)
PUT /api/users/{id}/status              — { status }
POST /api/users/{id}/mfa/reset          — reset MFA enrollment
POST /api/users                         — create user (navigate to create form)
```

---

## 3. Layout

```
h1 "Users"
312 accounts  ·  308 active  ·  4 suspended/locked

[+ New user]          ← action bar right

Role [All ▾]   Status [All ▾]   Search [___________________________]

Username        Full name        Role           Status       Created
──────────────────────────────────────────────────────────────────────
aarav.mehta     Aarav Mehta      Student        [Active]     Sep 1, 2026  →
anjali.iyer     Anjali Iyer      Instructor     [Active]     Aug 1, 2026  →
priya.sharma    Priya Sharma     Registrar      [Active]     Aug 1, 2026  →
rajan.mehta     Rajan Mehta      Finance        [Suspended]  Aug 1, 2026  →
```

Full-width table. Summary counts in subheader not a hero-metric — plain caption-tier text, neutral-600, tabular-nums.

---

## 4. Filters

- **Role filter:** `<Form.Select>` — All / Student / Instructor / Registrar / DeptAdmin / Finance / ITAdmin / Auditor
- **Status filter:** `<Form.Select>` — All / Active / Inactive / Suspended / Locked
- **Search:** debounced text input, searches against username and full name client-side on cached page

---

## 5. Status badges

| Status | Badge |
|---|---|
| Active | success-50 bg, success-500 text |
| Inactive | neutral-100, neutral-600 |
| Suspended | warn-50, warn-500 |
| Locked | danger-50, danger-500 |

---

## 6. User detail Offcanvas

Width 480px, `backdrop={false}`.

```
Aarav Mehta                          ×
aarav.mehta  ·  Student  ·  Active

Account details
──────────────────────────────────────
Username     aarav.mehta
Email        aarav.m@gmail.com
Phone        +91 98765 43210
Created      Sep 1, 2026
Last login   Nov 8, 2026 at 9:12 am

MFA
──────────────────────────────────────
Status       Enrolled
[Reset MFA]    ← ITAdmin only; POST /api/users/{id}/mfa/reset

Change status
──────────────────────────────────────
[Active ▾]     ← dropdown: Active / Inactive / Suspended
[Update status]

Audit trail (last 5 events)
──────────────────────────────────────
Nov 8  Login succeeded
Nov 5  Submission graded
Nov 4  Enrollment updated
[View full audit log →]   ← navigates to /admin/audit-log?userId={id}
```

**MFA Reset:** confirm inline (same `<Collapse>` pattern as assessment publish). Message: "Resetting MFA will require this user to re-enrol on next privileged login. Are you sure?" Buttons: "Reset MFA" (danger-500) / "Cancel".

---

## 7. Create user route

`[+ New user]` navigates to `/admin/users/new` — a simple form:

```
← Back to users

h1 "New user"

Full name  [_______________]
Username   [_______________]
Email      [_______________]
Phone      [_______________]
Role       [Student ▾]
Password   [_______________]  ← temporary; user must change on first login (v2 enforcement)

[Create user]
```

POST `/api/users`. On success: navigate to `/admin/users/{newId}` (Offcanvas pre-opened) + toast "User created."

---

## 8. States

| State | Render |
|---|---|
| Loading | Skeleton rows (8) |
| Empty (no users) | "No users found." — impossible in a seeded demo |
| Empty (filtered) | "No users match these filters." + "Clear filters" |
| MFA reset success | Toast "MFA reset. User will re-enrol on next login." |
| Status update success | Row badge updates inline, toast |
| Error | Stale banner |

---

## 9. A11y

- `<caption>` on table: "User accounts — EduLearn admin".
- Status badge in row: `aria-label="Status: Suspended"`.
- MFA reset button: `aria-label="Reset MFA for {fullName}"`.
- Search: `aria-label="Search users by username or full name"`.

---

## 10. Responsive

<768px: hide Created column. Show Username + Role + Status only.

---

## 11. Implementation notes

1. Audit trail in Offcanvas: `GET /api/audit-log?actorId={userId}&limit=5` — lightweight preview, not the full log.
2. "View full audit log" link: passes `?userId={id}` to the audit log page, pre-filters.
3. Password on create: backend should force reset on first login. For v1 UI, the field is a plain text input with `type="password"`. Note in implementation that production would use a temp-password + reset flow.
4. Status change to Suspended: immediately blocks login at backend (User.Status = Suspended → 401). Alert the ITAdmin before confirming: "Suspending this account will prevent {name} from logging in immediately."
