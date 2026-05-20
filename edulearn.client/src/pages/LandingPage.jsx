import { useNavigate } from 'react-router-dom';

// ── Brand tokens (refined navy + gold combination) ───────────────
const C = {
    primary: '#1a3c6e',         // navy (existing brand)
    primaryLight: '#2c5aa0',    // lighter navy for gradient depth
    primaryDark: '#0f2447',     // deeper navy for footer
    accent: '#e2a94b',          // gold accent (existing brand)
    accentSoft: '#f0c878',      // soft gold for hover/highlight
    cream: '#fdfbf7',           // warm off-white page background
    sand: '#f5efe4',            // section alt background (warmer)
    sandLight: '#faf5eb',       // even softer sand for cards
    border: '#e8e2d3',          // soft border
    textMuted: '#6b665d',       // body text
    textDark: '#2a2a2a',        // deep text
};

// Serif font for elegant display headings (matches reference aesthetic)
const serifFont = '"Playfair Display", "Georgia", serif';

// ── Content data ─────────────────────────────────────────────────
const FEATURES = [
    {
        icon: 'shield-lock',
        title: 'Identity & Access',
        description: 'Secure login with multi-factor authentication. Every account protected, every action accounted for.',
        tint: '#e8eef5',
    },
    {
        icon: 'mortarboard',
        title: 'Student Registry',
        description: 'Applications, student records, official documents, and transcripts — all managed in one place.',
        tint: '#f0e8dc',
    },
    {
        icon: 'collection',
        title: 'Course Catalog',
        description: 'Browse programs, explore courses, check prerequisites, and access up-to-date syllabi.',
        tint: '#e3ecf4',
    },
    {
        icon: 'calendar3',
        title: 'Enrollment & Timetable',
        description: 'Enroll in sections, manage your schedule, avoid conflicts, and see your weekly timetable.',
        tint: '#ede4d3',
    },
    {
        icon: 'lightbulb',
        title: 'Learning Content',
        description: 'Access lecture materials, course resources, and join discussion threads with your peers.',
        tint: '#f5ecd9',
    },
    {
        icon: 'file-earmark-text',
        title: 'Assessment & Grading',
        description: 'Submit assignments, receive feedback, view grades, and track your academic progress.',
        tint: '#e8eef5',
    },
    {
        icon: 'credit-card',
        title: 'Student Finance',
        description: 'View fee schedules, receive invoices, apply scholarships, and make payments online.',
        tint: '#ede4d3',
    },
    {
        icon: 'bar-chart',
        title: 'Reports & Insights',
        description: 'Institutional reports and dashboards that help leadership make informed decisions.',
        tint: '#e3ecf4',
    },
    {
        icon: 'bell',
        title: 'Notifications & Support',
        description: 'Stay informed with real-time alerts and get help from staff through a built-in ticket system.',
        tint: '#f0e8dc',
    },
];

const PERSONAS = [
    {
        icon: 'backpack',
        title: 'Students',
        subtitle: 'Enrolled learners',
        description: 'Manage your courses, track deadlines, view grades, pay fees, and download transcripts — all in one dashboard.',
        tint: '#f0e8dc',
    },
    {
        icon: 'pencil',
        title: 'Faculty',
        subtitle: 'Instructors & Dept Heads',
        description: 'Post content, grade submissions, manage course sections, and communicate with your students.',
        tint: '#e8eef5',
    },
    {
        icon: 'briefcase',
        title: 'Operations',
        subtitle: 'Registrars & Finance',
        description: 'Process applications, issue official documents, generate invoices, and reconcile payments.',
        tint: '#ede4d3',
    },
    {
        icon: 'shield-check',
        title: 'Leadership',
        subtitle: 'Administrators & Auditors',
        description: 'Oversee all users, review audit records, resolve support tickets, and access compliance reports.',
        tint: '#e3ecf4',
    },
];

const STUDENT_FEATURES = [
    {
        icon: 'search',
        title: 'Browse the course catalog',
        description: 'Find courses by department, term, or instructor. Check what you need before enrolling.',
    },
    {
        icon: 'upload',
        title: 'Submit your assignments',
        description: 'Upload work directly, receive instructor feedback, and see your grade the moment it is posted.',
    },
    {
        icon: 'download',
        title: 'Download your transcript',
        description: 'Get an official, verified PDF transcript on demand — no waiting, no email queue.',
    },
    {
        icon: 'credit-card',
        title: 'Manage fees and payments',
        description: 'View your invoice, check scholarship status, and pay your tuition securely online.',
    },
    {
        icon: 'bell',
        title: 'Never miss a deadline',
        description: 'One notification feed covers assignment due dates, fee reminders, and important announcements.',
    },
    {
        icon: 'life-preserver',
        title: 'Get support when you need it',
        description: 'File a support ticket directly to the right team and track it through to resolution.',
    },
];

const HERO_BULLETS = [
    { icon: 'book', text: 'Browse & enroll in courses' },
    { icon: 'cloud-upload', text: 'Submit work and view grades' },
    { icon: 'credit-card-2-front', text: 'Pay fees and track invoices' },
    { icon: 'file-earmark-arrow-down', text: 'Download official transcripts' },
    { icon: 'bell', text: 'Stay on top of every deadline' },
    { icon: 'headset', text: 'Get help from support staff' },
];

// ── Component ────────────────────────────────────────────────────
export default function LandingPage() {
    const navigate = useNavigate();

    // Always navigate to /login — never skip to dashboard from the landing page.
    // Even if a JWT exists in localStorage, we force re-authentication so that
    // credentials and MFA are always verified before accessing the system.
    const goToLogin = () => navigate('/login');

    return (
        <div style={{ backgroundColor: C.cream, fontFamily: '-apple-system, "Segoe UI", Roboto, sans-serif', paddingTop: '64px' }}>
            <style>{`
                @keyframes lpFadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes lpSlideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes lpSlideRight { from { opacity: 0; transform: translateX(-30px); } to { opacity: 1; transform: translateX(0); } }
                @keyframes lpSlideLeft { from { opacity: 0; transform: translateX(30px); } to { opacity: 1; transform: translateX(0); } }
                @keyframes lpScale { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
                .lp-fade { animation: lpFadeIn 0.6s ease both; }
                .lp-hero-text { animation: lpSlideRight 0.7s ease 0.1s both; }
                .lp-hero-card { animation: lpSlideLeft 0.7s ease 0.3s both; }
                .lp-hero-badge { animation: lpSlideUp 0.5s ease 0.05s both; }
                .lp-hero-title { animation: lpSlideUp 0.6s ease 0.15s both; }
                .lp-hero-desc { animation: lpSlideUp 0.6s ease 0.25s both; }
                .lp-hero-btns { animation: lpSlideUp 0.6s ease 0.35s both; }
                .lp-section { animation: lpSlideUp 0.6s ease both; }
                .lp-card-anim { animation: lpScale 0.5s ease both; }
            `}</style>
            {/* Inject Playfair Display from Google Fonts for display headings */}
            <link
                href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&display=swap"
                rel="stylesheet"
            />

            {/* ── TOP NAVIGATION ─────────────────────────────────── */}
            <nav
                className="navbar fixed-top"
                style={{ backgroundColor: C.cream, borderBottom: `1px solid ${C.border}`, padding: '0.75rem 0' }}
            >
                <div className="container d-flex align-items-center">
                    <span
                        className="navbar-brand fw-bold mb-0 d-flex align-items-center gap-2"
                        style={{ color: C.primary, cursor: 'pointer' }}
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    >
                        <span
                            style={{
                                width: 28, height: 28, borderRadius: 6,
                                backgroundColor: C.primary, color: 'white',
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 14,
                            }}
                        >
                            <i className="bi bi-mortarboard-fill"></i>
                        </span>
                        EduLearn
                    </span>

                    {/* Anchor links — hidden on mobile */}
                    <ul className="nav d-none d-lg-flex ms-4 gap-2">
                        <li><a href="#about" className="nav-link" style={{ color: C.primary }}>About</a></li>
                        <li><a href="#features" className="nav-link" style={{ color: C.primary }}>What we offer</a></li>
                        <li><a href="#personas" className="nav-link" style={{ color: C.primary }}>For your role</a></li>
                        <li><a href="#students" className="nav-link" style={{ color: C.primary }}>For students</a></li>
                    </ul>

                    <div className="ms-auto d-flex gap-2">
                        <button
                            className="btn fw-bold px-4"
                            style={{ backgroundColor: C.primary, color: 'white' }}
                            onClick={goToLogin}
                        >
                            <i className="bi bi-box-arrow-in-right me-2"></i>Sign in
                        </button>
                    </div>
                </div>
            </nav>

            {/* ── HERO ───────────────────────────────────────────── */}
            <section
                style={{
                    background: `linear-gradient(180deg, ${C.primary} 0%, #234a82 100%)`,
                    color: 'white',
                    paddingTop: 64, paddingBottom: 96,
                    borderBottomLeftRadius: '50% 30px',
                    borderBottomRightRadius: '50% 30px',
                }}
            >
                <div className="container">
                    <div className="row align-items-start g-5">
                        <div className="col-lg-7 lp-hero-text">
                            <div
                                className="d-inline-flex align-items-center gap-2 px-3 py-1 rounded-pill mb-3 lp-hero-badge"
                                style={{ backgroundColor: 'rgba(226, 169, 75, 0.18)', color: C.accent, fontSize: 13 }}
                            >
                                <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: C.accent }}></span>
                                Admissions open — 2026–27
                            </div>

                            <h1
                                className="lp-hero-title"
                                style={{
                                    fontFamily: serifFont,
                                    fontSize: 'clamp(2.5rem, 5vw, 4.5rem)',
                                    lineHeight: 1.05,
                                    letterSpacing: '-0.02em',
                                    fontWeight: 600,
                                    marginBottom: 24,
                                }}
                            >
                                One platform.<br />
                                Every student.<br />
                                Every journey.
                            </h1>

                            <p className="mb-4 lp-hero-desc" style={{ fontSize: 18, opacity: 0.85, maxWidth: 560 }}>
                                EduLearn brings your entire academic life into one calm, trusted space —
                                from the day you apply to the day you graduate. Courses, grades, fees,
                                transcripts, and support, all in one place.
                            </p>

                            <div className="d-flex gap-3 flex-wrap lp-hero-btns">
                                <button
                                    className="btn btn-lg fw-bold"
                                    style={{ backgroundColor: C.accent, color: C.primary, padding: '12px 32px' }}
                                    onClick={goToLogin}
                                >
                                    <i className="bi bi-box-arrow-in-right me-2"></i>
                                    Sign in
                                    <i className="bi bi-arrow-right ms-2"></i>
                                </button>
                                <a
                                    href="#features"
                                    className="btn btn-lg"
                                    style={{ color: 'white', border: '1px solid rgba(255,255,255,0.35)', padding: '12px 28px' }}
                                >
                                    Explore features
                                </a>
                            </div>
                        </div>

<<<<<<< HEAD
                        {/* Hero bullet list */}
                        <div className="col-lg-5 d-none d-lg-block">
=======
                        {/* Right-side info card */}
                        <div className="col-lg-5 lp-hero-card">
>>>>>>> UI/ashish
                            <div
                                className="rounded-4 p-4"
                                style={{ backgroundColor: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(6px)' }}
                            >
                                <div className="text-uppercase small mb-3" style={{ color: C.accent, letterSpacing: '0.15em' }}>
                                    Everything in one place
                                </div>
                                <ul className="list-unstyled mb-0">
                                    {HERO_BULLETS.map((b, i) => (
                                        <li key={i} className="d-flex align-items-center gap-3 mb-3">
                                            <span
                                                style={{
                                                    width: 36, height: 36, borderRadius: 8,
                                                    backgroundColor: 'rgba(226,169,75,0.15)',
                                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                    flexShrink: 0,
                                                }}
                                            >
                                                <i className={`bi bi-${b.icon}`} style={{ color: C.accent }}></i>
                                            </span>
                                            <span style={{ fontSize: 15, opacity: 0.9 }}>{b.text}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

<<<<<<< HEAD
            {/* ── ABOUT ──────────────────────────────────────────── */}
            <section id="about" style={{ backgroundColor: C.sand, padding: '80px 0' }}>
                <div className="container">
                    <div className="row align-items-center g-5">
=======
            {/* ── 01 ABOUT ────────────────────────────────────────── */}
            <section id="about" className="py-5 lp-section" style={{ paddingTop: '80px !important', paddingBottom: '80px !important' }}>
                <div className="container py-5">
                    <div className="row g-5">
>>>>>>> UI/ashish
                        <div className="col-lg-6">
                            <div className="text-uppercase small mb-2" style={{ color: C.accent, letterSpacing: '0.15em' }}>
                                About EduLearn
                            </div>
                            <h2
                                style={{ fontFamily: serifFont, fontSize: 'clamp(2rem, 3.5vw, 3rem)', fontWeight: 600, color: C.primary, lineHeight: 1.2, marginBottom: 20 }}
                            >
                                Built for every corner of campus life.
                            </h2>
                            <p style={{ color: C.textMuted, fontSize: 16, lineHeight: 1.8, marginBottom: 16 }}>
                                EduLearn is a university management system designed to eliminate the friction
                                between students, faculty, and administration. No more scattered spreadsheets,
                                lost emails, or manual processes.
                            </p>
                            <p style={{ color: C.textMuted, fontSize: 16, lineHeight: 1.8 }}>
                                From the moment a student applies, through graduation and beyond, every record,
                                grade, payment, and document lives in one secure, auditable place.
                            </p>
                        </div>
                        <div className="col-lg-6">
                            <div className="row g-3">
                                {[
                                    { num: '7', label: 'User roles', sub: 'from student to auditor' },
                                    { num: '29', label: 'API endpoints', sub: 'covering every workflow' },
                                    { num: '100%', label: 'Audit-logged', sub: 'every action recorded' },
                                    { num: 'MFA', label: 'Protected', sub: 'for all privileged roles' },
                                ].map((s, i) => (
                                    <div key={i} className="col-6">
                                        <div
                                            className="rounded-3 p-4 text-center"
                                            style={{ backgroundColor: C.sandLight, border: `1px solid ${C.border}` }}
                                        >
                                            <div style={{ fontFamily: serifFont, fontSize: '2.2rem', fontWeight: 700, color: C.primary }}>
                                                {s.num}
                                            </div>
                                            <div className="fw-bold" style={{ color: C.primary, fontSize: 14 }}>{s.label}</div>
                                            <div style={{ color: C.textMuted, fontSize: 12 }}>{s.sub}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

<<<<<<< HEAD
            {/* ── FEATURES ───────────────────────────────────────── */}
            <section id="features" style={{ backgroundColor: C.cream, padding: '80px 0' }}>
=======
            {/* ── 02 FEATURES ─────────────────────────────────────── */}
            <section id="features" className="lp-section" style={{ backgroundColor: C.sand, padding: '80px 0' }}>
>>>>>>> UI/ashish
                <div className="container">
                    <div className="text-center mb-5">
                        <div className="text-uppercase small mb-2" style={{ color: C.accent, letterSpacing: '0.15em' }}>
                            What we offer
                        </div>
                        <h2 style={{ fontFamily: serifFont, fontSize: 'clamp(2rem, 3.5vw, 3rem)', fontWeight: 600, color: C.primary, lineHeight: 1.2 }}>
                            Everything your institution needs.
                        </h2>
                        <p className="mt-3 mx-auto" style={{ maxWidth: 600, color: C.textMuted, fontSize: 16, lineHeight: 1.8 }}>
                            Nine integrated modules, one coherent system. Built by people who understand
                            how universities actually work.
                        </p>
                    </div>

                    <div className="row g-3">
                        {FEATURES.map((f, i) => (
                            <div key={i} className="col-md-6 col-lg-4">
                                <div
                                    className="rounded-3 p-4 h-100"
                                    style={{ backgroundColor: f.tint, border: `1px solid ${C.border}` }}
                                >
                                    <div
                                        className="mb-3"
                                        style={{
                                            width: 44, height: 44, borderRadius: 10,
                                            backgroundColor: C.cream,
                                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                        }}
                                    >
                                        <i className={`bi bi-${f.icon}`} style={{ fontSize: 20, color: C.primary }}></i>
                                    </div>
                                    <h5 className="fw-bold mb-2" style={{ color: C.primary }}>{f.title}</h5>
                                    <p className="mb-0" style={{ color: C.textMuted, fontSize: 14, lineHeight: 1.7 }}>{f.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

<<<<<<< HEAD
            {/* ── PERSONAS ───────────────────────────────────────── */}
            <section id="personas" style={{ backgroundColor: C.sand, padding: '80px 0' }}>
=======
            {/* ── 03 FOR YOUR ROLE ────────────────────────────────── */}
            <section id="personas" className="lp-section" style={{ padding: '80px 0' }}>
>>>>>>> UI/ashish
                <div className="container">
                    <div className="text-center mb-5">
                        <div className="text-uppercase small mb-2" style={{ color: C.accent, letterSpacing: '0.15em' }}>
                            For your role
                        </div>
                        <h2 style={{ fontFamily: serifFont, fontSize: 'clamp(2rem, 3.5vw, 3rem)', fontWeight: 600, color: C.primary, lineHeight: 1.2 }}>
                            Designed around how you work.
                        </h2>
                    </div>

                    <div className="row g-4">
                        {PERSONAS.map((p, i) => (
                            <div key={i} className="col-md-6 col-lg-3">
                                <div
                                    className="rounded-3 p-4 h-100 d-flex flex-column"
                                    style={{ backgroundColor: p.tint, border: `1px solid ${C.border}` }}
                                >
                                    <div
                                        className="mb-3"
                                        style={{
                                            width: 52, height: 52, borderRadius: 12,
                                            backgroundColor: C.cream,
                                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                        }}
                                    >
                                        <i className={`bi bi-${p.icon}`} style={{ fontSize: 24, color: C.primary }}></i>
                                    </div>
                                    <div className="mb-1">
                                        <div className="fw-bold" style={{ color: C.primary, fontSize: 16 }}>{p.title}</div>
                                        <div style={{ color: C.accent, fontSize: 12, fontWeight: 500 }}>{p.subtitle}</div>
                                    </div>
                                    <p className="mb-3 mt-2 flex-grow-1" style={{ color: C.textMuted, fontSize: 14, lineHeight: 1.7 }}>
                                        {p.description}
                                    </p>
                                    <button
                                        className="btn btn-sm fw-bold"
                                        style={{ backgroundColor: C.primary, color: 'white' }}
                                        onClick={goToLogin}
                                    >
                                        Sign in <i className="bi bi-arrow-right ms-1"></i>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

<<<<<<< HEAD
            {/* ── STUDENT FEATURES ───────────────────────────────── */}
            <section id="students" style={{ backgroundColor: C.cream, padding: '80px 0' }}>
=======
            {/* ── 04 FOR STUDENTS ─────────────────────────────────── */}
            <section id="students" className="lp-section" style={{ backgroundColor: C.sand, padding: '80px 0' }}>
>>>>>>> UI/ashish
                <div className="container">
                    <div className="row align-items-start g-5">
                        <div className="col-lg-5">
                            <div className="text-uppercase small mb-2" style={{ color: C.accent, letterSpacing: '0.15em' }}>
                                For students
                            </div>
                            <h2 style={{ fontFamily: serifFont, fontSize: 'clamp(2rem, 3.5vw, 3rem)', fontWeight: 600, color: C.primary, lineHeight: 1.2, marginBottom: 20 }}>
                                Your academic life, all in one place.
                            </h2>
                            <p style={{ color: C.textMuted, fontSize: 16, lineHeight: 1.8, marginBottom: 32 }}>
                                No app-switching, no chasing emails. Everything you need to stay
                                on top of your studies, fees, and progress — right here.
                            </p>
                            <button
                                className="btn btn-lg fw-bold"
                                style={{ backgroundColor: C.accent, color: C.primary, padding: '12px 32px' }}
                                onClick={goToLogin}
                            >
                                <i className="bi bi-box-arrow-in-right me-2"></i>Sign in
                                <i className="bi bi-arrow-right ms-2"></i>
                            </button>
                        </div>
                        <div className="col-lg-7">
                            <div className="row g-3">
                                {STUDENT_FEATURES.map((f, i) => (
                                    <div key={i} className="col-md-6">
                                        <div
                                            className="d-flex align-items-start gap-3 rounded-3 p-3"
                                            style={{
                                                backgroundColor: C.sandLight,
                                                border: `1px solid ${C.border}`,
                                            }}
                                        >
                                            <div
                                                style={{
                                                    width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                                                    backgroundColor: C.sand,
                                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                }}
                                            >
                                                <i className={`bi bi-${f.icon}`} style={{ color: C.accent }}></i>
                                            </div>
                                            <div>
                                                <div className="fw-bold" style={{ color: C.primary }}>{f.title}</div>
                                                <small style={{ color: C.textMuted, lineHeight: 1.5 }}>{f.description}</small>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── QUOTE ───────────────────────────────────────────── */}
            <section style={{ backgroundColor: C.primary, color: 'white', padding: '80px 0' }}>
                <div className="container text-center">
                    <i className="bi bi-quote" style={{ fontSize: '2.5rem', color: C.accent }}></i>
                    <blockquote
                        style={{
                            fontFamily: serifFont,
                            fontSize: 'clamp(1.4rem, 2.5vw, 2rem)',
                            fontWeight: 500,
                            lineHeight: 1.4,
                            maxWidth: 900,
                            margin: '20px auto 30px',
                            fontStyle: 'italic',
                        }}
                    >
                        "The highest education is that which does not merely give us
                        information, but makes our life in harmony with all existence."
                    </blockquote>
                    <div style={{ color: C.accent, fontSize: 14, letterSpacing: '0.15em' }}>
                        — RABINDRANATH TAGORE
                    </div>
                </div>
            </section>

            {/* ── FINAL CTA ───────────────────────────────────────── */}
            <section style={{ backgroundColor: C.cream, padding: '60px 0' }}>
                <div className="container">
                    <div
                        className="rounded-3 p-5 text-white"
                        style={{ backgroundColor: C.primaryDark }}
                    >
                        <div className="row align-items-center g-3">
                            <div className="col-md-7">
                                <div className="text-uppercase small mb-2" style={{ color: C.accent, letterSpacing: '0.15em' }}>
                                    Get started today
                                </div>
                                <h3 style={{ fontFamily: serifFont, fontSize: '2rem', fontWeight: 600, lineHeight: 1.2 }}>
                                Ready to step into your dashboard?
                                </h3>
                                <p className="mb-0 mt-2" style={{ opacity: 0.75 }}>
                                Sign in with your EduLearn credentials to access your courses,
                                grades, transcripts, and support — all in one place.
                                </p>
                            </div>
                            <div className="col-md-5 text-md-end">
                                <div className="d-flex gap-2 flex-wrap justify-content-md-end">
                                    <button
                                        className="btn btn-lg fw-bold"
                                        style={{ backgroundColor: C.accent, color: C.primary, padding: '12px 32px' }}
                                        onClick={goToLogin}
                                    >
                                        <i className="bi bi-box-arrow-in-right me-2"></i>
                                        Sign in to continue
                                        <i className="bi bi-arrow-right ms-2"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── FOOTER ──────────────────────────────────────────── */}
            <footer style={{ backgroundColor: C.cream, paddingTop: 60, paddingBottom: 30 }}>
                <div className="container">
                    <div className="row g-4">
                        <div className="col-md-5">
                            <div className="d-flex align-items-center gap-2 mb-3">
                                <span
                                    style={{
                                        width: 28, height: 28, borderRadius: 6,
                                        backgroundColor: C.primary, color: 'white',
                                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                    }}
                                >
                                    <i className="bi bi-mortarboard-fill" style={{ fontSize: 14 }}></i>
                                </span>
                                <span className="fw-bold" style={{ color: C.primary }}>EduLearn</span>
                            </div>
                            <p style={{ color: C.textMuted, maxWidth: 360, fontSize: 14 }}>
                                A university management platform for students, faculty, and staff —
                                all in one place.
                            </p>
                        </div>

                        <div className="col-md-2">
                            <h6 className="text-uppercase small mb-3" style={{ color: C.textMuted, letterSpacing: '0.1em' }}>
                                Platform
                            </h6>
                            <ul className="list-unstyled" style={{ color: C.primary }}>
                                <li className="mb-2"><a href="#about" className="text-decoration-none" style={{ color: C.primary }}>About</a></li>
                                <li className="mb-2"><a href="#features" className="text-decoration-none" style={{ color: C.primary }}>What we offer</a></li>
                                <li className="mb-2"><a href="#personas" className="text-decoration-none" style={{ color: C.primary }}>For your role</a></li>
                                <li className="mb-2"><a href="#students" className="text-decoration-none" style={{ color: C.primary }}>For students</a></li>
                            </ul>
                        </div>

                        <div className="col-md-2">
                            <h6 className="text-uppercase small mb-3" style={{ color: C.textMuted, letterSpacing: '0.1em' }}>
                                Access
                            </h6>
                            <ul className="list-unstyled" style={{ color: C.primary }}>
                                <li className="mb-2">
                                    <button className="btn btn-link p-0 text-decoration-none" style={{ color: C.primary }} onClick={goToLogin}>
                                        <i className="bi bi-box-arrow-in-right me-1"></i>Sign in
                                    </button>
                                </li>
                                <li className="mb-2">
                                    <a href="#about" className="text-decoration-none" style={{ color: C.primary }}>
                                        <i className="bi bi-info-circle me-1"></i>Learn more
                                    </a>
                                </li>
                            </ul>
                        </div>

                        <div className="col-md-3">
                            <h6 className="text-uppercase small mb-3" style={{ color: C.textMuted, letterSpacing: '0.1em' }}>
                                Contact
                            </h6>
                            <div style={{ color: C.primary, fontSize: 14 }}>
                                <div className="fw-bold">Registrar's office</div>
                                <div style={{ color: C.textMuted }}>registrar@edulearn.example</div>
                                <div style={{ color: C.textMuted }}>+91 80 0000 0000</div>
                            </div>
                        </div>
                    </div>

                    <hr style={{ borderColor: C.border, marginTop: 40 }} />

                    <div className="d-flex justify-content-between flex-wrap gap-2 small" style={{ color: C.textMuted }}>
                        <span>© {new Date().getFullYear()} EduLearn. All rights reserved.</span>
                        <div className="d-flex gap-3">
                            <a href="#" className="text-decoration-none" style={{ color: C.textMuted }}>Privacy</a>
                            <a href="#" className="text-decoration-none" style={{ color: C.textMuted }}>Terms</a>
                            <a href="#" className="text-decoration-none" style={{ color: C.textMuted }}>Accessibility</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
