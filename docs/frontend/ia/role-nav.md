# Role-Nav — Per-Persona Sidebar Configuration

**Status:** Locked 2026-05-07.
**Driven by:** `project_frontend_persona_model.md` (memory) + the locked Shape Brief 01.

The left sidebar (`<AppSidebar>`) renders one of four nav profiles based on the user's resolved persona. ITAdmin sees the persona switcher in the top bar and can toggle between profiles at runtime.

---

## 1. Persona resolution

```typescript
// On login, after JWT decode:
function resolvePersona(role: UserRole): Persona {
  switch (role) {
    case 'Student':                       return 'Learner';
    case 'Instructor':
    case 'DeptAdmin':                     return 'Educator';
    case 'Registrar':
    case 'Finance':                       return 'Operations';
    case 'Auditor':                       return 'Governance';
    case 'ITAdmin':                       return getStoredItPersona() ?? 'Governance';
    default:                              throw new Error('Unknown role');
  }
}
```

ITAdmin's chosen persona persists in `sessionStorage.itPersona`. Default on first login: Governance.

---

## 2. Learner nav rail (Student)

```
EduLearn
─────────────
Dashboard            ← /                  (default route)
My Courses           ← /courses
Enrollment           ← /enrollment/browse
Assessments          ← /grades            (also "Grades" — see note)
Transcripts          ← /transcripts
Timetable            ← /timetable
Finance              ← /finance/invoices
Tickets              ← /tickets
─────────────
(spacer)
Notifications icon   ← /notifications     (also bell in top bar)
Help                 ← (deferred)
Profile              ← /profile
```

**Note on labels:** "Assessments" maps to `/grades` for the Learner persona because that's where they see their submission status + grades. There's no dedicated `/assessments` list for a Student — assessments are accessed inside the course detail. To avoid the confusion, the rail label is **"Grades"** (lifted to top-level for visibility), and the route is `/grades`.

Final Learner rail order:
1. Dashboard
2. My Courses
3. Enrollment
4. Grades
5. Transcripts
6. Timetable
7. Finance
8. Tickets

8 items. Fits comfortably in 240px-wide rail at 14px label.

---

## 3. Educator nav rail (Instructor + DeptAdmin)

```
EduLearn
─────────────
Dashboard            ← /                  (default route)
Courses              ← /teaching/courses  (mine, with all-link if DeptAdmin)
Sections             ← /teaching/sections
Gradebook            ← /teaching/sections (defaults to first section's gradebook)
Assessments          ← /teaching/assessments
Submissions          ← /teaching/assessments (filtered to ungraded)
Content              ← /teaching/content
Discussions          ← /teaching/discussions
Plagiarism           ← /teaching/plagiarism/queue
Tickets              ← /tickets
─────────────
(DeptAdmin only — separator)
Programs             ← /admin/programs    (DeptAdmin only)
Course Catalog       ← /admin/courses     (DeptAdmin only)
Rooms                ← /admin/rooms       (DeptAdmin only)
─────────────
(spacer)
Notifications icon
Profile
```

For Instructor: 10 items. For DeptAdmin: 13 items (3 admin items appear under a divider). DeptAdmin doesn't see Plagiarism / Submissions queues — those are Instructor-specific.

**Hidden vs disabled:** items below the role's permission threshold are HIDDEN (not disabled). DeptAdmin doesn't see "Submissions" in the rail because they don't grade. Cleaner mental model than dimmed-disabled items.

---

## 4. Operations nav rail (Registrar + Finance)

```
EduLearn
─────────────
Dashboard                   ← /                          (default route)
─── Admissions ─────
Applicants                  ← /admissions/applicants     (Registrar; Finance read-only)
─── Registry ─────
Students                    ← /registry/students
Transcripts                 ← /registry/transcripts/issue (Registrar; Finance hidden)
Enrollments                 ← /registry/enrollments      (Registrar)
─── Finance ─────
Invoices                    ← /finance/invoices
Payments                    ← /finance/payments
Fee Schedules               ← /finance/fees              (Finance only)
Scholarships                ← /finance/scholarships      (Finance only)
─── ─────
Tickets                     ← /tickets
─────────────
Notifications icon
Profile
```

This persona has the most rail items because it spans two roles with overlapping concerns. Section dividers (Admissions / Registry / Finance) provide visual grouping without making each role see a different rail.

**Visibility rules:**
- Registrar: sees Applicants (write), Students, Transcripts, Enrollments. Sees Invoices/Payments READ-ONLY (no write actions). Hides Fee Schedules + Scholarships entirely.
- Finance: sees Students READ-ONLY. Hides Applicants, Transcripts, Enrollments. Full write on Invoices, Payments, Fees, Scholarships.

So the actual rendered rail differs per role within the same persona. Same persona, different visible items — mirrors the backend policy split.

---

## 5. Governance nav rail (ITAdmin + Auditor)

```
EduLearn
─────────────
Dashboard            ← /                  (default route)
─── System ─────
Users                ← /admin/users       (ITAdmin write, Auditor read)
Audit Log            ← /admin/audit-log
─── Operations ─────
Tickets (all)        ← /admin/tickets     (ITAdmin assign/resolve, Auditor read)
Plagiarism Queue     ← /admin/plagiarism/queue (ITAdmin only)
─── Compliance ─────
Reports              ← /admin/reports
KPIs                 ← /admin/kpis
Audit Packages       ← /admin/audit-packages
─── ─────
Notifications icon
Profile
```

**Visibility rules:**
- ITAdmin: sees everything; persona switcher in top bar visible.
- Auditor: sees Audit Log, Reports, KPIs, Audit Packages. Hidden: Plagiarism, Tickets-write, User-create. Persona switcher hidden.

---

## 6. Persona switcher (ITAdmin only)

Top bar component, immediately right of the brand mark:

```
[EduLearn]  [▾ Governance]  ............  [bell]  [JD]
```

Click → dropdown with 4 personas:

```
+----------------------+
|  Switch view         |
|----------------------|
|  ✓  Governance       | ← currently active (radio dot)
|     Operations       |
|     Educator         |
|     Learner          |
+----------------------+
```

On select:
1. Update Redux `currentPersona` slice
2. Persist `sessionStorage.itPersona`
3. Re-render `<AppSidebar>` with new nav profile (300ms fade)
4. Navigate to that persona's default route

Hidden for all roles except ITAdmin.

---

## 7. Sidebar item visual spec

Per locked tokens:

```
Item height:        44px (touch target minimum)
Item padding:       12px 16px
Icon size:          16px (Bootstrap Icons)
Label font:         IBM Plex Sans, 14px (secondary), weight 400
Label color:        --text-secondary (neutral-600)
Gap (icon ↔ label): 12px
Section divider:    1px line in neutral-200, no label OR caption-tier label uppercase
Active item:
  background:       brand-100 at 100% opacity (which IS our 8% brand tint)
  border-inset:     2px solid brand-500 on left edge (via box-shadow inset)
  label color:      brand-700
  icon color:       brand-700
  font-weight:      500 (medium)
Hover:
  background:       neutral-100
  no border change
Focus-visible:
  outline:          2px solid brand-500, outline-offset 2px, no inset bar
```

NEVER full side-stripe `border-left: 4px solid green` — that's the impeccable AI-slop tell.

---

## 8. Mobile collapse pattern

| Breakpoint | Rail behavior |
|---|---|
| ≥1024px | 240px full rail (icon + label) |
| 768–1023px | 64px icon-only rail; labels show on hover/focus via popover |
| <768px | Rail hidden behind hamburger; tap → `<Offcanvas placement="start">` slides in with full nav |

In mobile drawer, section dividers from the Operations / Governance persona are preserved; the visual hierarchy is identical to the desktop rail.

---

## 9. Default routes per persona (for `/` redirect)

| Persona | Default route on `/` |
|---|---|
| Learner | `/` itself (LearnerDashboard) |
| Educator | `/` itself (EducatorDashboard) |
| Operations | `/` itself (OperationsDashboard) |
| Governance | `/` itself (GovernanceDashboard) |

The `/` path renders a different dashboard component based on `currentPersona`. No redirect — the route is the same, the rendered component changes.
