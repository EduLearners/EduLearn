# Page Spec — Applicants Queue

**Route:** `/admissions/applicants`
**Component:** `src/pages/operations/ApplicantsQueuePage.tsx`
**Persona:** Operations (Registrar write, Finance read-only)
**Status:** Ready for implementation

---

## 1. Purpose

Registrar's triage surface for admission applications. Queue-shaped: process one at a time, move through status pipeline. The Offcanvas keeps context without full-page navigation.

---

## 2. API

```
GET /api/applicants?status={filter}&limit=50    — paginated applicant list
PUT /api/applicants/{id}                        — { applicationStatus }
```

---

## 3. Layout

```
h1 "Applicants"
Fall 2026 admission cycle  ·  12 pending review

Status filter: [All ▾] [Submitted] [Under Review] [Accepted] [Rejected] [Waitlisted]
Search: [___________________________]

Name              Program         Status           Submitted
────────────────────────────────────────────────────────────
Aarav Mehta       BSc CS          [Under Review]   Oct 1, 2026   →
Diya Bhat         BA Philosophy   [Submitted]      Oct 3, 2026   →
Karan Joshi       BSc Economics   [Under Review]   Oct 2, 2026   →
Priya Sharma      BSc CS          [Accepted]       Sep 28, 2026  →
Rohit Gupta       BA English      [Rejected]       Oct 4, 2026   →
```

Full-width table. Status filter chips rendered as Bootstrap nav-pills above the table (not a dropdown) — visual count per status is valuable for a Registrar. Each chip shows count badge.

---

## 4. Status filter chips

```jsx
<nav aria-label="Filter by application status" className="d-flex gap-2 flex-wrap mb-4">
  {STATUS_OPTIONS.map(s => (
    <button
      key={s.value}
      className={`btn btn-sm ${activeFilter === s.value ? 'btn-primary' : 'btn-outline-secondary'}`}
      onClick={() => setActiveFilter(s.value)}
      aria-pressed={activeFilter === s.value}
    >
      {s.label}
      <Badge bg={activeFilter === s.value ? 'light' : 'secondary'} className="ms-2 tabular">
        {counts[s.value]}
      </Badge>
    </button>
  ))}
</nav>
```

Status options: All · Submitted · Under Review · Accepted · Rejected · Waitlisted.

Active filter: brand-500 bg white text. Inactive: outline, neutral border.

---

## 5. Table columns + row actions

| Column | Notes |
|---|---|
| Name | Plex Sans 500, clickable (opens Offcanvas) |
| Program applied | Plex Sans 400 neutral-700 |
| Status | Badge (see status colors below) |
| Submitted | Date Plex Mono tabular |
| → | `bi-chevron-right`, neutral-400. Entire row is clickable. |

**Status badge colors:**

| Status | Bg | Text |
|---|---|---|
| Submitted | `neutral-100` | `neutral-700` |
| UnderReview | `brand-100` | `brand-700` |
| Accepted | `success-50` | `success-500` |
| Rejected | `danger-50` | `danger-500` |
| Waitlisted | `warn-50` | `warn-500` |

---

## 6. Applicant detail Offcanvas

Bootstrap `<Offcanvas placement="end">` width 480px, `backdrop={false}`.

```
Aarav Mehta                          ×
BSc Computer Science · Applied Oct 1

Personal details
─────────────────────────────────────
Date of birth     Jan 5, 2004
National ID       XXXX-XXXX-1234 (masked)
Phone             +91 98765 43210
Email             aarav.m@gmail.com

Application
─────────────────────────────────────
Program           BSc Computer Science
Submitted         Oct 1, 2026 at 11:23 am
Status            [Under Review]

Documents
─────────────────────────────────────
[Class 12 marksheet.pdf ↗]
[Recommendation letter.pdf ↗]

─────────────────────────────────────
Change status
[Accept]  [Reject]  [Move to Under Review]  [Waitlist]

Note (optional)
[_________________________________]
[Update status]
```

Documents from `DocumentsURIJSON`: each as a link opening in new tab. If no documents: "No documents uploaded."

**Status buttons shown conditionally:** "Accept" and "Reject" hidden if already Accepted/Rejected. "Under Review" shown only if status = Submitted.

**Note field:** optional text sent as part of the status update. Not a backend field in the current API spec — prepend note to a future `notes` field or omit from POST for v1. Render the field but note it's display-only until backend supports it.

---

## 7. States

| State | Render |
|---|---|
| Loading | Skeleton table rows (5) |
| Empty (no applications) | "No applications for this cycle." |
| Empty (filter result) | "No {status} applications." with "Clear filter" link |
| Status update submitting | Offcanvas action buttons disabled, spinner |
| Status update success | Status badge in table row updates, Offcanvas stays open, toast "Status updated to Accepted." |
| Error | Stale banner on table. Offcanvas error: from error-messages.md §7 |

---

## 8. A11y

- Filter chips: `aria-pressed` on each, `aria-label="Filter by status: Under Review (4 results)"`.
- Table: `<caption>` "Admission applications, Fall 2026". `aria-label` on → cell: "View application for {name}".
- Offcanvas: focus moves to first interactive element on open. Returns to row on close.
- Status change buttons: `aria-label="Accept application for Aarav Mehta"` — disambiguates multiple Offcanvas panels if user opens quickly.

---

## 9. Responsive

<768px: hide "Submitted" column. Show Name + Status only. Filter chips scroll horizontally. Offcanvas width 100%.

---

## 10. Implementation notes

1. Count badges per status: compute from full unfiltered API response. Cache separately from filtered view.
2. National ID masking: show last 4 digits only (`XXXX-XXXX-${id.slice(-4)}`). Never show full ID.
3. `backdrop={false}`: table rows remain clickable behind Offcanvas. Clicking a different row closes current Offcanvas and opens for new applicant.
4. Note field: for v1, if backend doesn't support a `notes` field, hide the note textarea and just send `{ applicationStatus }`. Document as v2 enhancement.
