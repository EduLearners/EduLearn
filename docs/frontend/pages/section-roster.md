# Page Spec — Section Roster

**Route:** `/teaching/sections/:id/roster`
**Component:** `src/pages/educator/SectionRosterPage.tsx`
**Persona:** Educator (also accessible to Registrar via RosterViewPolicy)
**Status:** Ready for implementation

---

## 1. Purpose

Full list of enrolled students in a section. Instructor reference view — who's enrolled, their enrollment status, and a link to their profile.

---

## 2. API

```
GET /api/sections/{id}              — section + course metadata
GET /api/enrollments/section/{id}   — all enrollments with student details
```

---

## 3. Layout

```
← Back to CS-301 sec A

CS-301 sec A — Roster               ← h1
Fall 2026  ·  25 enrolled  ·  0 waitlisted   ← secondary

Filter: [All ▾]   Search [________________]

Name              MRN         Status        Enrolled
────────────────────────────────────────────────────────
Aarav Mehta       2024-0042   [Enrolled]    Oct 1, 2026   →
Diya Bhat         2024-0071   [Enrolled]    Oct 1, 2026   →
Karan Joshi       2024-0055   [Waitlisted]  Oct 1, 2026   →
```

Full-width DataTable. No max-width constraint — roster should use available space.

---

## 4. Table columns

| Column | Notes |
|---|---|
| Name | Plex Sans 500. Clickable → student detail (Registrar/ITAdmin) or non-link (Instructor) |
| MRN | Plex Mono, tabular |
| Status | Badge: Enrolled (brand-100/brand-700), Waitlisted (warn-50/warn-500), Dropped (neutral-100/neutral-600) |
| Enrolled | Date, Plex Mono tabular |
| → | Icon link to student detail. Registrar/ITAdmin only — hidden for Instructor |

---

## 5. Filter + search

- Status filter: "All", "Enrolled", "Waitlisted", "Dropped" — `<Form.Select>`
- Search: text input, filters by name client-side on each keystroke. `aria-label="Search by student name"`.

---

## 6. States

| State | Render |
|---|---|
| Loading | Skeleton rows (5) |
| Empty section | "No students enrolled in this section yet." |
| No results (search) | "No students match '{query}'." with clear filter link |
| Error | Stale banner |

---

## 7. A11y

- Table `<caption>`: "Roster for CS-301 Algorithms, Section A, Fall 2026"
- Status badge: `aria-label="Status: Enrolled"` — not just color
- Name column: if non-link for Instructor, render as plain text `<td>`, not a `<button>` or `<a>` (no false affordance)

---

## 8. Responsive

<768px: hide MRN and Enrolled date columns. Show Name + Status only. Full-width search.

---

## 9. Implementation notes

1. Student name link: conditional on `role === 'Registrar' || role === 'ITAdmin'`. Instructor sees name as plain text.
2. Client-side search: `enrollments.filter(e => e.student.name.toLowerCase().includes(query.toLowerCase()))`.
3. Waitlist position: if `enrollment.waitlistPosition > 0`, show position number in the status badge tooltip: "Waitlisted (#3)".
