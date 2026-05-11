# Variant.ai Prompts — EduLearn UI Ideation

Paste each prompt into https://variant.ai. Generate → scroll to get 5+ visual directions → pick one → port the visual language to Bootstrap 5. Discard all generated code.

**Before using:** these prompts encode all locked design decisions. Do not change color strategy, font, or layout topology without re-running the shape process.

---

## Prompt 1 — Learner Dashboard

> Design a calm, institutional university LMS student dashboard called EduLearn.
>
> Product: A university Learning Management and Student Information System for a modern Indian liberal-arts institution. Register is product, not marketing. Design serves the user.
>
> Brand: Anchored in Krea / Ashoka / Plaksha University tradition. Modern Indian liberal-arts. Sunlit reading room. Calm, confident, considered. Closest product references: Linear for restraint, Notion for content-first hierarchy, Stripe Dashboard for institutional trust through minimal chrome.
>
> Color: Restrained strategy. Deep forest green OKLCH(42%, 0.10, 145) approximately #1f4d2c as the sole accent. Warm cream neutrals tinted toward brand hue at chroma 0.005 to 0.015. 90% of pixels are tinted neutral. 10% accent maximum. No gradients. No glassmorphism. No colored panels.
>
> Typography: IBM Plex Sans for all text. IBM Plex Mono for course codes, scores, GPAs, currency, and all numbers. Tabular numerals on every number.
>
> Layout at 1440x900 desktop:
> Left: 240px persistent navigation rail with icon and label. Items: Dashboard, My Courses, Enrollment, Grades, Transcripts, Timetable, Finance, Tickets. Active item has a 2px forest-green left inset bar and 8% brand tint background. No full side-stripe border.
> Top: 56px top bar with EduLearn wordmark left, notification bell with badge (3 unread) and user avatar right.
> Main canvas: max-width 1200px, centered.
>
> Dashboard content top to bottom:
> 1. Welcome heading "Welcome back, Aarav" in large IBM Plex Sans. Below it one caption line: "Fall 2026 · GPA 3.4 · 9 / 16 credits · Attendance 92%" with Plex Mono on all numbers.
> 2. Action required block (3 items, severity-bucketed). Critical bucket: academic-integrity review with red octagon icon and "Open case" button. Action needed bucket: tuition invoice 3 days overdue with "Pay Rs 52,000" button and feedback ready with "View feedback" button. Each item is a horizontal row with icon, title, meta, and outcome-named button on the right. Dividers between rows. No card borders. No side-stripe borders.
> 3. Up next section: dense list of 4 upcoming items (Tue Quiz CS-301, Wed Essay PHIL-220, Fri Reading HIST-205, Sat Drop deadline). Each row: abbreviated day, type icon, course code in Plex Mono, assessment title, right-aligned time. Dividers between rows.
> 4. My courses: 3-column card grid. Each card shows course code in large Plex Mono, course title, instructor name, grade pill (B+/A-/B). Cards use neutral-50 background and subtle shadow. No card border. No cover images.
> 5. Recent feedback: 3 rows (PSet 4 graded 24/25, Discussion reply, Plagiarism review opened).
>
> Banned: gradient text, glassmorphism, side-stripe borders, hero-metric template, identical card grids, rounded-square icon tiles above headings, italic serif fonts, eyebrow chips, bounce animations, dark glow shadows, em dashes in copy.
>
> Generate at 1440x900. After generating, scroll for 5 alternative visual directions of the same layout. Vary only color warmth, type weight treatment, surface density, and spacing rhythm. Do not change the layout structure.

---

## Prompt 2 — Login Page

> Design a university login page for EduLearn, a modern Indian liberal-arts university LMS.
>
> Brand: Krea / Ashoka / Plaksha institutional voice. Calm, confident, considered. Not a SaaS landing page. Not an ERP. A library card that says "you belong here."
>
> Color: Split-panel. Left half uses deep forest green OKLCH(42%, 0.10, 145) approximately #1f4d2c as a solid, flat background. White text on the left. Right half uses warm cream neutral-0 approximately #fdfcfa as background. Form elements in forest green accent. No gradients on either side. No glassmorphism.
>
> Layout at 1440x900:
> Left half (50%): Flat forest-green background. No image. No pattern. No texture. Top-left: "EduLearn" wordmark in white IBM Plex Sans 28px weight 700. Below with generous whitespace: "The modern university platform." in white IBM Plex Sans 18px weight 400, max 22 characters wide. Bottom-left corner: "© EduLearn 2026" in white opacity 75% caption size.
> Right half (50%): Warm cream background. Centered vertically and horizontally. Form max-width 360px. Contents: "Sign in" heading IBM Plex Sans 1.5rem weight 600. Username label and input field. Password label and input field with show/hide toggle. Forest green primary "Sign in" button full-width 44px height. "Forgot your password?" text link below. Horizontal divider. "New student? Apply now" link.
>
> Mobile below 640px: left panel hidden. Form centered on warm cream background. EduLearn wordmark in forest green at top.
>
> Banned: gradient backgrounds, glassmorphism, split panels with photos or illustrations, decorative icons above the form, gradient text, em dashes.
>
> Generate at 1440x900. Scroll for 5 visual directions. Vary the warmth of the cream, the depth of the green, and the weight contrast of the typography. Keep the split-panel topology fixed.

---

## Prompt 3 — Instructor Gradebook

> Design a university instructor gradebook for EduLearn, a modern Indian liberal-arts university LMS.
>
> Context: Prof. Anjali Iyer is grading 25 student submissions for CS-301 Algorithms. She has been doing this for 30 minutes. The design must make the grading loop as fast and frictionless as possible. Data density is a feature, not a problem.
>
> Color: Restrained. Warm cream surfaces. Forest green OKLCH(42%, 0.10, 145) accent used only for interactive focus states, primary buttons, and active row indicators. Score cells show subtle brand tint on hover. No gradients. No colored column headers.
>
> Typography: IBM Plex Sans for labels and names. IBM Plex Mono for all scores, course codes, section labels. Tabular numerals on every numeric value.
>
> Layout at 1440x900:
> Full-width table inside AppShell (240px sidebar + 56px top bar). No max-width constraint on the table itself. Table has:
> - Sticky header row: Student name column (200px, frozen left with position sticky), then one column per assessment (PSet 4 /25, Quiz 3 /20, Midterm /100). Column headers in IBM Plex Mono.
> - Each row: student name as first cell (sticky left, slightly bolder), then score cells. Score cells show the numeric score in IBM Plex Mono (24, 18, 82). Ungraded cells show a hourglass icon in brand-50 background. Late submissions show a warning icon. Hover state: 4% brand-tint background.
> - Sticky footer row: Class averages (23.1, 18.8, 83.2) in Plex Mono.
> - Clicking a score cell opens a right-side panel (400px): student name, assessment name, submission date, View submission link, score NumberField input (pre-filled), Save grade button. Below: immutable grade history (2 entries) in Plex Mono.
>
> Page header above the table: course section title (CS-301 sec A), term (Fall 2026), student count (25), assessment filter dropdown, ungraded filter toggle.
>
> Banned: identical card grids, gradient column headers, colored sticky headers, large colored stat tiles above the table, gradient text, glassmorphism, em dashes.
>
> Generate at 1440x900 showing the table with the right-side grading panel open for Aarav Mehta. Show realistic data: some cells scored, some ungraded, one late indicator. Scroll for 5 visual directions varying density, type sizing, and surface warmth.

---

## Prompt 4 — Governance Dashboard (ITAdmin)

> Design the ITAdmin governance dashboard for EduLearn, a modern Indian liberal-arts university LMS.
>
> Context: Vikash Arora is the IT Admin. He context-jumps constantly: a ticket arrives, he finds the user, checks their audit trail, resolves the issue. The dashboard is a launching pad for those jumps, not a destination. Query-shaped design.
>
> Color: Restrained. Warm cream surfaces. Forest green OKLCH(42%, 0.10, 145) accent only. The surface should feel authoritative and minimal, not surveillance-dark or corporate-blue. No dark mode. No deep navy backgrounds.
>
> Typography: IBM Plex Sans, same 5-tier scale. IBM Plex Mono on all counts, IDs, percentages, timestamps.
>
> Layout at 1440x900 inside AppShell (240px sidebar + 56px top bar):
>
> Top bar includes a "Governance" dropdown immediately right of the EduLearn wordmark (persona switcher). It reads "Governance" with a small down-chevron. This is the architectural flex that distinguishes ITAdmin from all other roles.
>
> Sidebar (Governance persona): Dashboard, Users, Audit Log, Tickets (all), Plagiarism Queue, Reports, KPIs, Audit Packages.
>
> Main canvas sections top to bottom:
> 1. "Governance - Admin" as h1. Below it one caption line: "Fall 2026 · 312 users · 5 open tickets · 2 plagiarism flags" in Plex Mono.
> 2. Open tickets compact table block (bordered, neutral-50 background, shadow-sm, border-radius 8px): 3 rows visible. Columns: student name, subject, priority badge (High in warn, Medium in neutral), date. "View all" link top-right.
> 3. Recent audit events: 4 rows as a dense list. Each row: timestamp (Plex Mono), user name, action verb (Graded submission, Dropped enrollment), resource. "View full audit log" link at bottom.
> 4. Plagiarism queue: 2 rows. Similarity percentage in danger-500 if >=80%, warn-500 if >=60%. Course, assessment, similarity, date.
> 5. KPI 2x2 stat grid: Enrollment rate 92%, Average GPA 3.2, Invoice collection 78%, Plagiarism flags 2. Small up/down arrows for trend. IBM Plex Mono on values. No hero-metric template. No gradient backgrounds behind the stats.
> 6. Quick access row: [Reports] [Audit Packages] [User Roster] as secondary buttons.
>
> Banned: dark mode, navy backgrounds, gradient text, hero-metric template (big number + gradient accent), identical card grids, side-stripe borders, glassmorphism, em dashes.
>
> Generate at 1440x900. The persona switcher dropdown in the top bar is the visual focus — make it clearly interactive. Scroll for 5 directions varying how the KPI stats are rendered and how the queue blocks are bordered. Keep the layout structure fixed.
