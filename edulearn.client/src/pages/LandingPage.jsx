import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

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

// Each bullet has its own contextual Bootstrap icon (matches what it describes)
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
    const isAuth = authService.isAuthenticated();

    const goToLogin = () => navigate('/login');
    const goToDashboard = () => navigate('/dashboard');

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
                        {isAuth ? (
                            <button
                                className="btn fw-bold px-4"
                                style={{ backgroundColor: C.primary, color: 'white' }}
                                onClick={goToDashboard}
                            >
                                Go to dashboard
                            </button>
                        ) : (
                            <button
                                className="btn fw-bold px-4"
                                style={{ backgroundColor: C.primary, color: 'white' }}
                                onClick={goToLogin}
                            >
                                <i className="bi bi-box-arrow-in-right me-2"></i>Sign in
                            </button>
                        )}
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
                                    onClick={isAuth ? goToDashboard : goToLogin}
                                >
                                    <i className="bi bi-box-arrow-in-right me-2"></i>
                                    {isAuth ? 'Open dashboard' : 'Sign in'}
                                    <i className="bi bi-arrow-right ms-2"></i>
                                </button>
                                <a
                                    href="#features"
                                    className="btn btn-lg"
                                    style={{ color: 'white', border: '1px solid rgba(255,255,255,0.35)', padding: '12px 28px' }}
                                >
                                    <i className="bi bi-arrow-down ms-1 me-2"></i>Explore platform
                                </a>
                            </div>
                        </div>

                        {/* Right-side info card */}
                        <div className="col-lg-5 lp-hero-card">
                            <div
                                className="p-4 rounded-3 h-100 d-flex flex-column"
                                style={{
                                    backgroundColor: 'rgba(255,255,255,0.06)',
                                    border: '1px solid rgba(255,255,255,0.12)',
                                    backdropFilter: 'blur(10px)',
                                }}
                            >
                                <div
                                    className="text-uppercase mb-4"
                                    style={{
                                        letterSpacing: '0.15em',
                                        opacity: 0.85,
                                        fontSize: 15,
                                        fontWeight: 600,
                                        color: C.accent,
                                    }}
                                >
                                    Everything you need
                                </div>
                                <ul className="list-unstyled mb-0 flex-grow-1 d-flex flex-column justify-content-around">
                                    {HERO_BULLETS.map((b, idx) => (
                                        <li
                                            key={b.text}
                                            className="d-flex align-items-center gap-3 py-2"
                                            style={{
                                                fontSize: 18,
                                                fontWeight: 400,
                                                borderBottom: idx === HERO_BULLETS.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.1)',
                                            }}
                                        >
                                            <span
                                                style={{
                                                    width: 36,
                                                    height: 36,
                                                    borderRadius: 8,
                                                    backgroundColor: 'rgba(226, 169, 75, 0.18)',
                                                    color: C.accent,
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexShrink: 0,
                                                    fontSize: 18,
                                                }}
                                            >
                                                <i className={`bi bi-${b.icon}`}></i>
                                            </span>
                                            <span>{b.text}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── 01 ABOUT ────────────────────────────────────────── */}
            <section id="about" className="py-5 lp-section" style={{ paddingTop: '80px !important', paddingBottom: '80px !important' }}>
                <div className="container py-5">
                    <div className="row g-5">
                        <div className="col-lg-6">
                            <div className="text-uppercase small mb-2" style={{ color: C.textMuted, letterSpacing: '0.15em' }}>
                                01 — About EduLearn
                            </div>
                            <h2 style={{ fontFamily: serifFont, fontSize: '2.5rem', color: C.primary, fontWeight: 600, lineHeight: 1.15 }}>
                                Your academic life,<br />all in one place.
                            </h2>
                            <p className="mt-3" style={{ fontSize: 17, color: C.textMuted, lineHeight: 1.6 }}>
                                EduLearn is a university management platform built for students,
                                faculty, and staff. It replaces the fragmented portals and email
                                chains that slow down every institution with a single, calm, trusted system.
                            </p>
                            <p style={{ fontSize: 17, color: C.textMuted, lineHeight: 1.6 }}>
                                Whether you're a student checking a deadline, an instructor posting
                                grades, or a registrar issuing a transcript — everything happens here,
                                securely, with a full record of every action.
                            </p>
                            <div className="d-flex gap-2 mt-4">
                                <button
                                    className="btn fw-bold"
                                    style={{ backgroundColor: C.primary, color: 'white', padding: '10px 24px' }}
                                    onClick={isAuth ? goToDashboard : goToLogin}
                                >
                                    Get started
                                </button>
                                <a
                                    href="#features"
                                    className="btn"
                                    style={{ color: C.primary, border: `1px solid ${C.border}`, padding: '10px 24px' }}
                                >
                                    See what's included
                                </a>
                            </div>
                        </div>

                        {/* Four feature pills */}
                        <div className="col-lg-6">
                            <div className="row g-3">
                                {[
                                    { icon: 'shield-lock', title: 'Secure login', desc: 'Multi-factor authentication keeps student and staff accounts safe.' },
                                    { icon: 'clipboard-check', title: 'Complete history', desc: 'Every grade, payment, and transcript action is permanently recorded.' },
                                    { icon: 'file-earmark-pdf', title: 'Official documents', desc: 'Download verified PDF transcripts instantly, whenever you need them.' },
                                    { icon: 'life-preserver', title: 'Always supported', desc: 'Raise a support ticket any time and track its progress to resolution.' },
                                ].map(item => (
                                    <div key={item.title} className="col-md-6">
                                        <div className="p-3 rounded-3 h-100" style={{ backgroundColor: C.sand }}>
                                            <div
                                                style={{
                                                    width: 36, height: 36, borderRadius: 8,
                                                    backgroundColor: 'white',
                                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                    marginBottom: 10,
                                                }}
                                            >
                                                <i className={`bi bi-${item.icon}`} style={{ color: C.accent }}></i>
                                            </div>
                                            <div className="fw-bold" style={{ color: C.primary }}>{item.title}</div>
                                            <small style={{ color: C.textMuted }}>{item.desc}</small>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── 02 FEATURES ─────────────────────────────────────── */}
            <section id="features" className="lp-section" style={{ backgroundColor: C.sand, padding: '80px 0' }}>
                <div className="container">
                    <div className="text-center mb-5">
                        <div className="text-uppercase small mb-2" style={{ color: C.textMuted, letterSpacing: '0.15em' }}>
                            02 — What we offer
                        </div>
                        <h2 style={{ fontFamily: serifFont, fontSize: '2.5rem', color: C.primary, fontWeight: 600 }}>
                            Everything your university needs
                        </h2>
                        <p className="mt-2" style={{ color: C.textMuted, maxWidth: 600, margin: '0 auto', fontSize: 17 }}>
                            Nine tightly integrated areas covering every aspect of university life —
                            all connected, all consistent, all in one login.
                        </p>
                    </div>

                    <div className="row g-3">
                        {FEATURES.map(f => (
                            <div key={f.title} className="col-md-6 col-lg-4">
                                <div
                                    className="p-4 rounded-3 h-100"
                                    style={{ backgroundColor: 'white', border: `1px solid ${C.border}` }}
                                >
                                    <div
                                        style={{
                                            width: 44, height: 44, borderRadius: 10,
                                            backgroundColor: f.tint,
                                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                            marginBottom: 16,
                                        }}
                                    >
                                        <i className={`bi bi-${f.icon}`} style={{ color: C.primary, fontSize: '1.25rem' }}></i>
                                    </div>
                                    <h5 className="fw-bold" style={{ color: C.primary, fontSize: '1.05rem' }}>{f.title}</h5>
                                    <p className="mb-0" style={{ color: C.textMuted, fontSize: 14, lineHeight: 1.6 }}>
                                        {f.description}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── 03 FOR YOUR ROLE ────────────────────────────────── */}
            <section id="personas" className="lp-section" style={{ padding: '80px 0' }}>
                <div className="container">
                    <div className="row mb-5">
                        <div className="col-lg-7">
                            <div className="text-uppercase small mb-2" style={{ color: C.textMuted, letterSpacing: '0.15em' }}>
                                03 — For your role
                            </div>
                            <h2 style={{ fontFamily: serifFont, fontSize: '2.5rem', color: C.primary, fontWeight: 600, lineHeight: 1.15 }}>
                                Built for everyone<br />in your institution
                            </h2>
                        </div>
                        <div className="col-lg-5 d-flex align-items-end">
                            <p style={{ color: C.textMuted, fontSize: 17, lineHeight: 1.6 }}>
                                From students to senior administrators, every role gets a
                                workspace designed around what they actually do each day.
                            </p>
                        </div>
                    </div>

                    <div className="row g-3">
                        {PERSONAS.map(p => (
                            <div key={p.title} className="col-md-6 col-lg-3">
                                <div
                                    className="p-4 rounded-3 h-100"
                                    style={{ backgroundColor: 'white', border: `1px solid ${C.border}` }}
                                >
                                    <div
                                        style={{
                                            width: 44, height: 44, borderRadius: 10,
                                            backgroundColor: p.tint,
                                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                            marginBottom: 16,
                                        }}
                                    >
                                        <i className={`bi bi-${p.icon}`} style={{ color: C.primary, fontSize: '1.25rem' }}></i>
                                    </div>
                                    <h5 className="fw-bold mb-1" style={{ color: C.primary, fontSize: '1.05rem' }}>{p.title}</h5>
                                    <div className="small mb-3" style={{ color: C.accent, fontWeight: 600 }}>{p.subtitle}</div>
                                    <p className="mb-0" style={{ color: C.textMuted, fontSize: 14, lineHeight: 1.6 }}>
                                        {p.description}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── 04 FOR STUDENTS ─────────────────────────────────── */}
            <section id="students" className="lp-section" style={{ backgroundColor: C.sand, padding: '80px 0' }}>
                <div className="container">
                    <div className="text-center mb-5">
                        <div className="text-uppercase small mb-2" style={{ color: C.textMuted, letterSpacing: '0.15em' }}>
                            04 — For students
                        </div>
                        <h2 style={{ fontFamily: serifFont, fontSize: '2.5rem', color: C.primary, fontWeight: 600, lineHeight: 1.15 }}>
                            Everything you need,<br />from day one
                        </h2>
                        <p className="mt-2" style={{ color: C.textMuted, maxWidth: 600, margin: '0 auto', fontSize: 17 }}>
                            No more chasing emails or switching between five different portals.
                            Your whole student life is here.
                        </p>
                    </div>

                    <div className="row g-3">
                        {STUDENT_FEATURES.map(f => (
                            <div key={f.title} className="col-md-6 col-lg-4">
                                <div
                                    className="p-3 rounded-3 d-flex gap-3 align-items-start h-100"
                                    style={{ backgroundColor: 'white' }}
                                >
                                    <div
                                        style={{
                                            width: 36, height: 36, borderRadius: 8,
                                            backgroundColor: C.sand,
                                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                            flexShrink: 0,
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
                                        onClick={isAuth ? goToDashboard : goToLogin}
                                    >
                                        <i className="bi bi-box-arrow-in-right me-2"></i>
                                        {isAuth ? 'Open dashboard' : 'Sign in to continue'}
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
