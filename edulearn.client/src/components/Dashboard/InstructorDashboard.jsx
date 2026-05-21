import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { sectionService } from '../../services/sectionService';
import { assessmentService } from '../../services/assessmentService';
import { submissionService } from '../../services/submissionService';
import Loading from '../Loading';
import StatusBadge from '../StatusBadge';
import './RoleDashboard.css';

const TERM = '2026-Spring';

export default function InstructorDashboard() {
    const navigate = useNavigate();
    const { username, userId } = authService.getCurrentUser();

    const [mySections, setMySections] = useState([]);
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);
    const today = new Date();

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setLoading(true);
        const s = {};
        try {
            // Load sections assigned to this instructor
            const sections = userId
                ? await sectionService.getByInstructor(userId).catch(() => [])
                : [];

            setMySections(sections || []);
            s.sections = (sections || []).length;

            // Unique courseIDs across my sections
            const myCourseIds = [...new Set((sections || []).map(sec => sec.courseID))];
            s.courses = myCourseIds.length;

            // Total enrolled students across my sections
            s.students = (sections || []).reduce((sum, sec) => sum + (sec.enrolledCount || 0), 0);

            // Assessments for my courses only
            if (myCourseIds.length > 0) {
                const assessmentResults = await Promise.allSettled(
                    myCourseIds.map(cid => assessmentService.getByCourse(cid).catch(() => []))
                );
                const allAssessments = assessmentResults
                    .filter(r => r.status === 'fulfilled')
                    .flatMap(r => r.value || []);

                s.assessments = allAssessments.length;
                s.published = allAssessments.filter(a => a.status === 'Published').length;

                // Pending grading — only for my sections
                const mySectionIds = new Set((sections || []).map(sec => sec.sectionID));
                const myAssessments = allAssessments.filter(a => !a.sectionID || mySectionIds.has(a.sectionID));

                const subResults = await Promise.allSettled(
                    myAssessments.map(a => submissionService.getByAssessment(a.assessmentID).catch(() => []))
                );
                const allSubs = subResults.filter(r => r.status === 'fulfilled').flatMap(r => r.value || []);
                s.pendingGrading = allSubs.filter(sub => sub.status === 'Submitted').length;
            }
        } catch { }
        setStats(s);
        setLoading(false);
    };

    const parseSchedule = (json) => {
        if (!json) return null;
        try { return JSON.parse(json); } catch { return null; }
    };

    const STAT_CARDS = [
        { key: 'sections',      label: 'My Sections',     sub: () => TERM,                                    icon: 'bi-collection-fill',    accent: '#185FA5', iconBg: '#dbeafe', iconColor: '#185FA5' },
        { key: 'courses',       label: 'My Courses',      sub: () => 'unique courses',                         icon: 'bi-book-fill',          accent: '#3B6D11', iconBg: '#dcfce7', iconColor: '#3B6D11' },
        { key: 'students',      label: 'Total Students',  sub: () => 'across my sections',                    icon: 'bi-people-fill',        accent: '#534AB7', iconBg: '#ede9fe', iconColor: '#534AB7' },
        { key: 'assessments',   label: 'Assessments',     sub: (s) => `${s.published ?? 0} published`,        icon: 'bi-file-earmark-check', accent: '#0F6E56', iconBg: '#d1fae5', iconColor: '#0F6E56' },
        { key: 'pendingGrading',label: 'Pending Grading', sub: () => 'awaiting grade',                        icon: 'bi-hourglass-split',    accent: '#854F0B', iconBg: '#fef3c7', iconColor: '#854F0B' },
    ];

    if (loading) return <Loading message="Loading your dashboard..." />;

    return (
        <div className="role-dashboard">
            {/* Hero */}
            <div className="rd-hero">
                <div style={{ position: 'relative', zIndex: 1 }}>
                    <span className="rd-hero-badge">Instructor · {TERM}</span>
                    <div className="rd-hero-title">Welcome back, {username}! 👋</div>
                    <p className="rd-hero-sub">
                        {today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>
                <i className="bi bi-display rd-hero-icon"></i>
            </div>

            {/* Stat Cards */}
            <div className="row g-3 mb-4">
                {STAT_CARDS.map((card) => (
                    <div key={card.key} className="col">
                        <div className="rd-stat-card" style={{ '--rd-accent': card.accent }}>
                            <div>
                                <div className="rd-stat-label">{card.label}</div>
                                <div className="rd-stat-value" style={{ color: card.accent }}>
                                    {stats[card.key] ?? '—'}
                                </div>
                                <div className="rd-stat-sub">{card.sub(stats)}</div>
                            </div>
                            <div className="rd-stat-icon-wrap" style={{ background: card.iconBg, color: card.iconColor }}>
                                <i className={`bi ${card.icon}`}></i>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* My Sections Panel */}
            <div className="rd-card mb-4">
                <div className="rd-card-header">
                    <span className="rd-card-header-title">
                        <i className="bi bi-collection me-2"></i>My Sections — {TERM}
                    </span>
                    <button className="btn btn-sm btn-link p-0 text-decoration-none" style={{ color: '#185FA5', fontSize: '0.8rem' }} onClick={() => navigate('/sections')}>
                        Manage sections <i className="bi bi-arrow-right ms-1"></i>
                    </button>
                </div>

                {mySections.length === 0 ? (
                    <div className="text-center py-4 text-muted">
                        <i className="bi bi-collection display-5 d-block mb-2 opacity-25"></i>
                        <p className="mb-0 small">No sections assigned to you for {TERM}.</p>
                        <small>Contact the Registrar to be assigned to a section.</small>
                    </div>
                ) : (
                    <div className="row g-3 p-3">
                        {mySections.map(sec => {
                            const sched = parseSchedule(sec.scheduleJSON);
                            const isFull = sec.enrolledCount >= sec.capacity;
                            return (
                                <div key={sec.sectionID} className="col-md-6 col-lg-4">
                                    <div className="border rounded p-3 h-100" style={{ borderColor: '#e0e7ef' }}>
                                        {/* Course name + section ID */}
                                        <div className="d-flex align-items-start justify-content-between mb-2">
                                            <div>
                                                <div className="fw-bold" style={{ color: '#1a3c6e' }}>
                                                    {sec.courseName}
                                                </div>
                                                <small className="text-muted">Section #{sec.sectionID} · {sec.term}</small>
                                            </div>
                                            <StatusBadge status={sec.status} />
                                        </div>

                                        {/* Schedule */}
                                        {sched && (
                                            <div className="small text-muted mb-2">
                                                <i className="bi bi-calendar3 me-1"></i>
                                                {sched.days} · {sched.time}
                                            </div>
                                        )}

                                        {/* Enrolled count */}
                                        <div className="small mb-3">
                                            <i className="bi bi-people me-1 text-muted"></i>
                                            <span className={isFull ? 'text-danger fw-bold' : 'text-muted'}>
                                                {sec.enrolledCount}/{sec.capacity} students
                                                {isFull && ' (Full)'}
                                            </span>
                                        </div>

                                        {/* Quick action buttons */}
                                        <div className="d-flex gap-1 flex-wrap">
                                            <button
                                                className="btn btn-sm btn-outline-primary"
                                                onClick={() => navigate(`/assessments?courseId=${sec.courseID}&sectionId=${sec.sectionID}`)}
                                                title="Assessments for this section"
                                            >
                                                <i className="bi bi-file-earmark-check me-1"></i>Assessments
                                            </button>
                                            <button
                                                className="btn btn-sm btn-outline-secondary"
                                                onClick={() => navigate(`/contents?courseId=${sec.courseID}`)}
                                                title="Learning content for this course"
                                            >
                                                <i className="bi bi-collection-play me-1"></i>Content
                                            </button>
                                            <button
                                                className="btn btn-sm btn-outline-secondary"
                                                onClick={() => navigate(`/discussions?courseId=${sec.courseID}`)}
                                                title="Discussions for this course"
                                            >
                                                <i className="bi bi-chat-square-text me-1"></i>Discuss
                                            </button>
                                            <button
                                                className="btn btn-sm btn-outline-success"
                                                onClick={() => navigate(`/submissions?sectionId=${sec.sectionID}`)}
                                                title="Grade submissions for this section"
                                            >
                                                <i className="bi bi-star me-1"></i>Grade
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Quick Actions */}
            <div className="rd-card">
                <div className="rd-card-header">
                    <span className="rd-card-header-title"><i className="bi bi-lightning-fill me-2"></i>Quick Actions</span>
                </div>
                <div className="rd-qa-grid">
                    {[
                        { label: 'New Assessment',    icon: 'bi-file-plus',          path: '/assessments/new' },
                        { label: 'Grade Submissions', icon: 'bi-star',               path: '/submissions'     },
                        { label: 'Upload Content',    icon: 'bi-upload',             path: '/contents/new'    },
                        { label: 'Discussions',       icon: 'bi-chat-square-text',   path: '/discussions'     },
                        { label: 'Syllabus',          icon: 'bi-file-earmark-ruled', path: '/syllabi'         },
                        { label: 'Timetable',         icon: 'bi-calendar3',          path: '/timetable'       },
                        { label: 'Students',          icon: 'bi-people',             path: '/students'        },
                        { label: 'Notifications',     icon: 'bi-bell',               path: '/notifications'   },
                        { label: 'Support Ticket',    icon: 'bi-headset',            path: '/tickets'         },
                    ].map((a) => (
                        <button key={a.path} className="rd-qa-btn" onClick={() => navigate(a.path)}>
                            <i className={`bi ${a.icon}`}></i>{a.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
