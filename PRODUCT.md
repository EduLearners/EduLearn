# Product

## Register

product

## Users

EduLearn serves seven roles, each with a distinct shape of day:

- **Student (18–22, mobile-first, anxious-by-default).** Arrives at three moments: late-night submissions, mid-day deadline checks, and after-class grade peeks. Always under emotional load. The product's job is to reduce anxiety, not entertain. Primary surfaces: deadline list, course view, gradebook (own grades), invoice, transcript download, ticket.

- **Instructor (laptop-only, time-bankrupt, batch-oriented).** Opens EduLearn for sessions of focused work: grade 40 submissions, post one announcement, post one assessment. Every click multiplies by N students. Primary surfaces: gradebook, submissions queue, assessment editor, content uploader.

- **Registrar (workflow power user).** Lives in queues and filtered tables: applications to triage, transcripts to issue, enrollment disputes to resolve. Primary surfaces: applicant queue, student detail, transcript editor, enrollment manager.

- **Finance (audit-conscious, term-batch worker).** Term-start = bulk invoice generation. Mid-term = payment reconciliation. Print culture, exports on every list. Primary surfaces: invoice list, payment ledger, fee schedule editor, scholarship roster.

- **DeptAdmin (calendar/capacity planner).** Allocates rooms, assigns instructors, builds programs and curricula. Primary surfaces: program editor, course catalog, section/room scheduler.

- **ITAdmin (context-jumper).** Opens a ticket → finds the user → sees their audit trail → fixes → documents. Cmd+K global search across entities is essential, not optional. Primary surfaces: user roster, ticket queue, audit log, plagiarism queue.

- **Auditor (read-only, defensive).** Date-range queries, evidence exports. Primary surfaces: audit log, reports, KPIs, audit-package generator.

## Product Purpose

EduLearn is a university Learning Management & Student Information System for a modern Indian liberal-arts institution. It replaces the marquee-laden, table-soup ERP portals that students and faculty endure with a calm, dense, trust-by-restraint product. Success = students can find "am I about to fail something?" in under 5 seconds; instructors can grade a 40-student section in under 30 minutes; auditors can prove a grade-change happened on a specific date in under 3 clicks.

## Brand Personality

Modern, thoughtful, editorial. Three words: **calm, confident, considered.**

Tone: speaks like a competent academic advisor — direct, precise, not chummy. Never humorous when the user is frustrated. Never celebratory about a missed deadline. The voice of the institution should feel like a sunlit reading room at a liberal-arts campus: quiet, deliberate, uncluttered.

Anchor references (institutional voice, not visual copy): **Ashoka University, Krea University, Plaksha University.** Modern Indian liberal-arts. Deep green or muted teal as a brand thread, cream neutrals, generous whitespace, content-led.

Product references for craft (lift principles, not aesthetics):
- **Linear** — restrained palette, density done right, motion that earns its place
- **Notion** — content-first hierarchy, type as the primary visual driver
- **Stripe Dashboard** — institutional trust through minimal chrome, dense data, tabular numerals

## Anti-references

EduLearn must NOT look like:
- **Moodle** — stacked block widgets, default-Bootstrap chrome, decade-old sidebar
- **Ellucian Banner / SAP Campus** — 1990s enterprise SIS, harsh table borders, system-default fonts, forms that wrap awkwardly
- **Typical Indian school ERP portals** — marquee text, bright yellow/red palettes, embedded WordArt, inline `<font>` tags, "Welcome <UserName>!" hero strips
- **Blackboard / Canvas** — status-overloaded tiles, every-pixel-occupied dashboards, color-badge soup

## Design Principles

1. **Calm under load.** Students arrive anxious; the UI should reduce — not add to — emotional load. No celebratory micro-interactions on missed deadlines. No flashy animation. Reassurance through predictability.

2. **Information density without crowding.** Institutional users need data, not stat tiles. Tables beat cards when the content is data. The default container is a row, not a tile.

3. **Workflow first, dashboard second.** Registrar/Finance/Auditor live in queues, not dashboards. The IA accommodates four navigation grammars (deadline-shaped, course-shaped, queue-shaped, query-shaped) — not one.

4. **Read-only is first-class.** Auditor + AuditLog + GradeChange aren't second-class views. Their immutability is communicated explicitly, never implicitly.

5. **Trust through restraint.** Institutional products earn trust by being calm, predictable, low-decoration. Resisting AI-slop IS the brand.

## Accessibility & Inclusion

- WCAG 2.1 AA baseline across the entire product. 4.5:1 body contrast, 3:1 component contrast.
- Keyboard-only path validated on every primary action.
- `prefers-reduced-motion` honored on every animation; only functional motion (loading, focus feedback) preserved when reduced.
- Visible `:focus-visible` ring (2px brand-accent, 2px offset) on every interactive element.
- Color-only signaling banned — every status uses icon + label, not just hue.
- 16px minimum body type. Touch targets ≥44px.
- English-only UI for v1. Layout reserves localization slack (Hindi/Devanagari support is a v2 decision; today's design must not foreclose it).
