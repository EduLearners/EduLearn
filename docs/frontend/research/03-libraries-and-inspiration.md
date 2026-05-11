# Libraries & LMS Inspiration Research — EduLearn Frontend

Generated 2026-05-07.

---

## Stack Decision (final)

| Layer | Choice | Reason |
|---|---|---|
| Framework | React 18, create-react-app | PRD-mandated |
| Type | TypeScript (basics) | PRD-mandated |
| UI base | Bootstrap 5 + react-bootstrap | PRD-mandated; Tailwind disallowed |
| Styling | Bootstrap Sass customization + custom CSS variables | Token system on top of Bootstrap |
| Routing | React Router v6 | PRD-mandated |
| Global state | Redux + react-redux | PRD-mandated |
| Server state | React Query | PRD-mandated |
| Forms | React Hook Form + Zod | PRD-mandated (Formik or RHF) |
| HTTP | Axios + sessionStorage JWT | Mentor-approved; fetch for simple calls |
| Icons | Bootstrap Icons (`bootstrap-icons`) | PRD-mandated |
| Charts | Recharts (or Chart.js) | For RKA module KPIs/reports |
| Testing | Jest + React Testing Library + Cypress | PRD-mandated |

---

## shadcn/ui — Use as Visual Reference Only

**Do NOT install.** shadcn/ui requires Tailwind — disallowed.

**Use it as a reference for:**
- Component JSX structure (lift the tree, port classNames to Bootstrap utilities)
- UX behavior patterns (Sheet/Offcanvas, Command palette, DataTable column config)
- Accessible ARIA wiring (copy the Radix-derived roles/attributes verbatim)
- Visual density and spacing decisions

**Key shadcn components to port:**
| shadcn | Bootstrap equivalent | Notes |
|---|---|---|
| Button (variants) | `.btn .btn-{variant}` | Direct equivalent |
| Card | `.card .card-body` | Direct equivalent |
| Input / Field | `form-control` + `<label>` | Add error/help wrapper |
| Select | `form-select` | Direct |
| Tabs | `nav-tabs` + react-bootstrap Tabs | Direct |
| Dialog | react-bootstrap `<Modal>` | Direct |
| Sheet (slide-out) | react-bootstrap `<Offcanvas>` | Direct |
| Toast | react-bootstrap `<Toast>` + context queue | Near-equivalent |
| Sidebar (nav) | Custom — no Bootstrap equivalent | Build from scratch; lift shadcn composition |
| DataTable | Bootstrap `.table` + manual sort/filter | Lift shadcn column-def pattern; skip TanStack |
| Command (cmd+k) | Custom | Later milestone; build with react-bootstrap Dropdown + keyboard handling |
| Empty State | Custom component | Bootstrap utility classes |

---

## React Aria — Lift Patterns, Don't Install as Dep

React Aria is out of PRD scope as a direct dependency. However its ARIA patterns, keyboard behavior specs, and focus management are the gold standard. Port these three:

1. **ComboBox pattern** — for async student/course pickers. Copy the ARIA roles (`combobox`, `listbox`, `option`), keyboard handler (ArrowDown/Up to navigate, Enter to select, Escape to close), and focus management from their open-source code. Build as a custom `<AsyncComboBox>` component using Bootstrap's dropdown structure.

2. **Calendar pattern** — for timetable view (ETS-03). Lift grid navigation (ArrowKey cell focus, Enter to select), `role="grid"`, column headers as `role="columnheader"`. Build as `<TimetableGrid>` with CSS Grid layout.

3. **NumberField pattern** — for fee amounts, scores, scholarships. Increment/decrement buttons, locale-aware parsing. Wrap Bootstrap's `<input type="number">` with this behavior.

---

## reactbits.dev — Unauthenticated Marketing Pages Only

- Contains 110+ animated React components (Aurora, Ballpit, MagneticButton, TiltCard, etc.)
- Uses Framer Motion, GSAP, optional Three.js
- **Use only on the public-facing landing/login pages** — Aurora background on `/login` splash is acceptable.
- **Hard limit:** zero reactbits components inside authenticated app chrome, dashboards, or any data-heavy screen.

---

## Variant.ai — Week-1 Visual Ideation Only

- Generates infinite scroll of visual directions from a text prompt
- Output is HTML/React snippets — NOT production ready
- **Use:** paste the Variant prompt (in `docs/frontend/prompts/`) to harvest 3-5 visual directions (palette, type pairing, density). Pick one direction. Discard all code.
- **v0.app (Vercel)** is the superior tool for drafting actual React components; use for component scaffolding during implementation phase.

---

## 8 LMS Inspiration Patterns (Cross-Platform)

Source: Canvas (Instructure), Banner (Ellucian), Workday Student, Blackboard Ultra, Moodle 4.x, PowerSchool Schoology.

### 1. Persistent Left Global Nav Rail

All major LMS platforms use a left rail with icon+label, collapsible to icon-only at medium breakpoints. Help and notifications anchor at the bottom. Active item: 2px left-edge accent bar + subtle tint background (NOT a full-width side-stripe).

### 2. Role/Persona-Based Dashboard with Cards

Banner Experience cards are explicitly role-based. Workday home is persona-driven. Dashboard widgets vary per role — not a single template. Each role sees its highest-priority actions on load.

### 3. Course Card Grid as Primary Entry Point

Canvas Dashboard, Moodle "My Courses," PowerSchool tiles: course code prominent (monospace), title, term, instructor avatar, last-update timestamp. No cover image needed (avoid AI-slop stock art). Card grid is 3-col on lg, 2-col on md, 1-col on sm.

### 4. Secondary Course Navigation Rail

Inside a course route: Moodle Course Index, Canvas Modules, Blackboard Ultra course view. Independent scroll rail with collapsible sections and completion indicators. Maps to our: Syllabus, Content, Assessments, Discussions, Gradebook.

### 5. Dense Data Table Gradebook with Frozen Columns

Canvas Gradebook has frozen student name column, sortable assessment columns, inline-editable score cells. SpeedGrader = submission detail panel (our Offcanvas equivalent). Non-negotiable for Instructor UX.

### 6. Timeline Widget (Not Full Calendar)

Moodle 4's redesigned timeline shows due dates as a dense list with activity-type icons and color-coded urgency. Canvas "Coming Up" is similar. A full monthly calendar is too sparse for the primary dashboard widget -- a sorted upcoming-items list is more actionable.

### 7. Separate Self-Service vs Admin UI (Same Shell)

Banner separates student self-service from admin UI. Canvas has "View as student" toggle. EduLearn: one app shell, role-gated routes, with role-switch affordance for ITAdmin.

### 8. Action Bar at Page Top

Moodle 4 moved all page-level action buttons to a top action bar above the content, reducing hunting. Every detail page (Student, Course, Invoice) gets: Edit, Status change, and contextual action buttons in a sticky top bar, never buried in the body.
