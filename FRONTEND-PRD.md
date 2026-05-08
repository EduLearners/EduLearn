# EduLearn v11.0 — Frontend PRD

**Start here.** Read this before opening any page spec or writing any code.

---

## What We're Building

A production-quality university LMS/SIS frontend for EduLearn v11.0. The backend is 100% complete (18 controllers, 60+ endpoints, 7 roles, JWT + TOTP MFA). This frontend connects to it.

The evaluator (internship assessor) will spend 10–15 minutes on a laptop. The interface must demonstrate: role-based access, data density, institutional polish, and clean UX interactions. It is not a toy. It is not a SaaS template. It is an institutional product.

---

## Hard Tech Scope (no exceptions)

| Allowed | Not allowed |
|---|---|
| React 18 (create-react-app) | Next.js, Vite, Remix |
| TypeScript | — |
| Bootstrap 5 + Bootstrap Icons + Sass | Tailwind CSS |
| react-bootstrap | shadcn/ui as installed package, Material UI, Chakra, Ant, Mantine |
| React Router v6 | — |
| Redux + react-redux | Zustand, Jotai, Recoil |
| React Query | — |
| Formik or React Hook Form + Zod | — |
| Axios + interceptor | — |
| IBM Plex Sans + IBM Plex Mono (self-hosted) | Inter as primary font |

**shadcn/ui:** visual reference only — lift JSX patterns, re-skin with Bootstrap. Do NOT `npm install shadcn`.

---

## The 4 Personas

| Persona | Roles | Primary surface |
|---|---|---|
| **Learner** | Student | Dashboard, Courses, Grades, Finance, Transcripts, Tickets |
| **Educator** | Instructor, DeptAdmin | Gradebook, Assessments, Content, Sections |
| **Operations** | Registrar, Finance | Applicants, Enrollments, Invoices, Payments |
| **Governance** | ITAdmin, Auditor | Audit Log, KPIs, Reports, Plagiarism Queue |

ITAdmin has a persona switcher in the top bar — can cross to any persona.

---

## The Design System (do not invent your own)

All design decisions are already made and documented. Read them:

| Doc | What it covers |
|---|---|
| `docs/frontend/design-language/tokens.md` | Colors (OKLCH → hex), type scale, spacing, motion |
| `docs/frontend/design-language/_tokens.scss` | Bootstrap Sass override variables — import before Bootstrap |
| `docs/frontend/design-language/component-map.md` | Every component: Bootstrap native vs custom, interaction states |
| `docs/frontend/design-language/error-messages.md` | Every error/empty/confirm message — exact copy, use verbatim |
| `docs/frontend/ia/routes.md` | All routes, route guards, ITAdmin cross-persona behavior |
| `docs/frontend/ia/role-nav.md` | Per-persona sidebar nav items, active state spec |
| `docs/frontend/research/04-anti-ai-slop-checklist.md` | 18 banned patterns — match-and-refuse |

---

## Ownership Matrix

See `docs/frontend/MODULE-OWNERSHIP.md` — exact route ↔ teammate map.

---

## Phase Plan

**Phase 0 — Shared Shell (owned by Utkarsh):**
Build AppShell + tokens + base components before anyone starts pages. No page work starts until Phase 0 merges to `feature/frontend-impl`. See `docs/frontend/PHASE-0-SHARED-SHELL.md`.

**Phase 1 — Dashboards + Auth:**
All 4 persona dashboards + login + MFA. Each member builds their persona's dashboard.

**Phase 2 — Feature Pages:**
Each member builds their owned pages in priority order from the ownership matrix.

---

## Definition of Done

Every page must pass all items in `docs/frontend/DEFINITION-OF-DONE.md` before it can be merged.

---

## Code Review Gate

Every PR reviewer must complete `docs/frontend/CODE-REVIEW-GATE.md` before approving.

---

## Absolute Bans (from design system)

Never write these — see anti-slop checklist for full list:

- `border-left` or `border-right` > 1px as a colored accent on rows/cards (side-stripe)
- `background-clip: text` with gradient (gradient text)
- Glassmorphism (`backdrop-filter: blur`) used decoratively
- Big number + gradient accent background (hero-metric template)
- Hardcoded color values (`#1f4d2c` → use `var(--brand-500)` or Sass variable)
- Em dashes in user-facing copy (use comma, colon, or period)
- `font-family: Inter` as primary (use IBM Plex Sans per tokens)

---

## Git Conventions

Branch: `feature/frontend-<page-or-module>`
Commits: Conventional Commits (`feat:`, `fix:`, `style:`, `refactor:`)
Base branch: `Development`
Never push directly to `main`. Never force-push.
PR must reference the page spec: `Implements docs/frontend/pages/<page>.md`
