import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { enrollmentService } from '../../services/enrollmentService';
import { sectionService } from '../../services/sectionService';
import { assessmentService } from '../../services/assessmentService';
import { notificationService } from '../../services/notificationService';
import { transcriptService } from '../../services/transcriptService';
import Loading from '../Loading';
import StatusBadge from '../StatusBadge';
import axiosClient from '../../api/axiosClient';
import './RoleDashboard.css';

const TERM = '2026-Spring';

export default function StudentDashboard() {
    const navigate = useNavigate();
    const { username } = authService.getCurrentUser();

    const [enrolledSections, setEnrolledSections] = useState([]);
    const [upcomingAssessments, setUpcomingAssessments] = useState([]);
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);
    const today = new Date();

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setLoading(true);
        const s = {};
        try {
            // Resolve student record from JWT
            const studentRecord = await axiosClient.get('/students/me').then(r => r.data).catch(() => null);
            const sid = studentRecord?.studentID;

            if (sid) {
                const [enrollments, transcripts, notifications] = await Promise.allSettled([
                    enrollmentService.getByStudent(sid),
                    transcriptService.getByStudent(sid),
                    notificationService.getAll({ unreadOnly: true }),
                ]);

                // Enrollments
                const enrollList = enrollments.status === 'fulfilled' ? (enrollments.value || []) : [];
                s.enrolled = enrollList.filter(e => e.status === 'Enrolled').length;
                s.waitlisted = enrollList.filter(e => e.status === 'Waitlisted').length;

                // Enrich active enrollments with full section details
                const activeEnrollments = enrollList.filter(e => e.status === 'Enrolled');
                const sectionDetails = await Promise.allSettled(
                    activeEnrollments.map(e => sectionService.getById(e.sectionID).catch(() => null))
                );
                const enriched = activeEnrollments.map((e, idx) => ({
                    ...e,
                    sectionDetail: sectionDetails[idx].status === 'fulfilled' ? sectionDetails[idx].value : null,
                }));
                setEnrolledSections(enriched);

                // Upcoming assessments (due within 14 days) for enrolled courses
                const myCourseIds = [...new Set(activeEnrollments.map(e => e.courseID).filter(Boolean))];
                if (myCourseIds.length > 0) {
                    const assessmentResults = await Promise.allSettled(
                        myCourseIds.map(cid => assessmentService.getByCourse(cid).catch(() => []))
                    );
                    const allAssessments = assessmentResults
                        .filter(r => r.status === 'fulfilled')
                        .flatMap(r => r.value || []);

                    const now = new Date();
                    const fourteenDays = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
                    const upcoming = allAssessments
                        .filter(a => {
                            if (!a.dueAt) return false;
                            const due = new Date(a.dueAt);
                            return due >= now && due <= fourteenDays && a.status === 'Published';
                        })
                        .sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt))
                        .slice(0, 5);
                    setUpcomingAssessments(upcoming);
                    s.upcoming = upcoming.length;
                }

                // CGPA
                if (transcripts.status === 'fulfilled') {
                    const issued = (transcripts.value || []).filter(t => t.status === 'Issued');
                    s.cgpa = issued.length > 0 ? issued[0].gpa : null;
                }

                // Unread notifications
                if (notifications.status === 'fulfilled') {
                    const d = notifications.value;
                    s.unread = d?.items?.length ?? (Array.isArray(d) ? d.length : 0);
                }
            }
        } catch { }
        setStats(s);
        setLoading(false);
    };

    const parseSchedule = (json) => {
        if (!json) return null;
        try { return JSON.parse(json); } catch { return null; }
    };

    const getDaysUntilDue = (dueAt) => {
        const diff = Math.ceil((new Date(dueAt) - new Date()) / (1000 * 60 * 60 * 24));
        if (diff === 0) return { label: 'Due today', color: 'danger' };
        if (diff === 1) return { label: 'Due tomorrow', color: 'danger' };
        if (diff <= 3) return { label: `Due in ${diff} days`, color: 'warning' };
        return { label: `Due in ${diff} days`, color: 'secondary' };
    };

    const STAT_CARDS = [
        { key: 'enrolled',   label: 'Enrolled Courses', sub: (s) => `${s.waitlisted ?? 0} waitlisted`,   icon: 'bi-mortarboard-fill', accent: '#185FA5', iconBg: '#dbeafe', iconColor: '#185FA5', path: '/enrollment'    },
        { key: 'upcoming',   label: 'Due Soon',         sub: () => 'next 14 days',                         icon: 'bi-alarm-fill',       accent: '#854F0B', iconBg: '#fef3c7', iconColor: '#854F0B', path: '/assessments'   },
        { key: 'cgpa',       label: 'Latest CGPA',      sub: () => 'out of 10.00',                         icon: 'bi-award-fill',       accent: '#3B6D11', iconBg: '#dcfce7', iconColor: '#3B6D11', path: '/transcripts'   },
        { key: 'unread',     label: 'Notifications',    sub: () => 'unread',                               icon: 'bi-bell-fill',        accent: '#534AB7', iconBg: '#ede9fe', iconColor: '#534AB7', path: '/notifications' },
    ];

    if (loading) return <Loading message="Loading your dashboard..." />;

    return (
        <div className="role-dashboard">
            {/* Hero */}
            <div className="rd-hero">
                <div style={{ position: 'relative', zIndex: 1 }}>
                    <span className="rd-hero-badge">Student · {TERM}</span>
                    <div className="rd-hero-title">Welcome back, {username}! 👋</div>
                    <p className="rd-hero-sub">
                        {today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>
                <i className="bi bi-mortarboard-fill rd-hero-icon"></i>
            </div>

            {/* Stat Cards */}
            <div className="row g-3 mb-4">
                {STAT_CARDS.map((card) => (
                    <div key={card.key} className="col">
                        <div
                            className="rd-stat-card"
                            style={{ '--rd-accent': card.accent, cursor: 'pointer' }}
                            onClick={() => card.path && navigate(card.path)}
                        >
                            <div>
                                <div className="rd-stat-label">{card.label}</div>
                                <div className="rd-stat-value" style={{ color: card.accent }}>
                                    {card.key === 'cgpa'
                                        ? (stats.cgpa != null ? Number(stats.cgpa).toFixed(2) : '—')
                                        : (stats[card.key] ?? '—')}
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

            <div className="row g-3 mb-4">
                {/* My Enrolled Sections */}
                <div className="col-lg-7">
                    <div className="rd-card h-100">
                        <div className="rd-card-header">
                            <span className="rd-card-header-title">
                                <i className="bi bi-mortarboard me-2"></i>My Enrolled Sections
                            </span>
                            <button className="btn btn-sm btn-link p-0 text-decoration-none" style={{ color: '#185FA5', fontSize: '0.8rem' }} onClick={() => navigate('/enrollment')}>
                                View all <i className="bi bi-arrow-right ms-1"></i>
                            </button>
                        </div>

                        {enrolledSections.length === 0 ? (
                            <div className="text-center py-4 text-muted">
                                <i className="bi bi-mortarboard display-5 d-block mb-2 opacity-25"></i>
                                <p className="mb-0 small">You are not enrolled in any sections yet.</p>
                                <button className="btn btn-sm btn-primary-edulearn mt-3" onClick={() => navigate('/enrollment')}>
                                    Browse & Enroll
                                </button>
                            </div>
                        ) : (
                            <div>
                                {enrolledSections.map(e => {
                                    const sec = e.sectionDetail;
                                    const sched = sec ? parseSchedule(sec.scheduleJSON) : null;
                                    return (
                                        <div key={e.enrollID} className="rd-list-row">
                                            <div className="flex-grow-1">
                                                <div className="rd-list-title">{e.courseName}</div>
                                                <div className="rd-list-meta">
                                                    {sec && (
                                                        <>
                                                            <i className="bi bi-person-badge me-1"></i>{sec.instructorName}
                                                            {sched && (
                                                                <> · <i className="bi bi-calendar3 me-1"></i>{sched.days} {sched.time}</>
                                                            )}
                                                        </>
                                                    )}
                                                    {!sec && <>Section #{e.sectionID}</>}
                                                </div>
                                            </div>
                                            <div className="d-flex gap-1 align-items-center ms-2">
                                                <button
                                                    className="btn btn-sm btn-outline-primary"
                                                    onClick={() => navigate(`/assessments?courseId=${e.courseID}&sectionId=${e.sectionID}`)}
                                                    title="Assessments"
                                                >
                                                    <i className="bi bi-file-earmark-check"></i>
                                                </button>
                                                <button
                                                    className="btn btn-sm btn-outline-secondary"
                                                    onClick={() => navigate(`/contents?courseId=${e.courseID}`)}
                                                    title="Course Content"
                                                >
                                                    <i className="bi bi-collection-play"></i>
                                                </button>
                                                <button
                                                    className="btn btn-sm btn-outline-secondary"
                                                    onClick={() => navigate(`/discussions?courseId=${e.courseID}`)}
                                                    title="Discussions"
                                                >
                                                    <i className="bi bi-chat-square-text"></i>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Upcoming Deadlines */}
                <div className="col-lg-5">
                    <div className="rd-card h-100">
                        <div className="rd-card-header">
                            <span className="rd-card-header-title">
                                <i className="bi bi-alarm me-2"></i>Upcoming Deadlines
                            </span>
                            <button className="btn btn-sm btn-link p-0 text-decoration-none" style={{ color: '#185FA5', fontSize: '0.8rem' }} onClick={() => navigate('/assessments')}>
                                All assessments <i className="bi bi-arrow-right ms-1"></i>
                            </button>
                        </div>

                        {upcomingAssessments.length === 0 ? (
                            <div className="text-center py-4 text-muted">
                                <i className="bi bi-check2-circle display-5 d-block mb-2 opacity-25" style={{ color: '#3B6D11' }}></i>
                                <p className="mb-0 small">No deadlines in the next 14 days.</p>
                            </div>
                        ) : (
                            <div>
                                {upcomingAssessments.map(a => {
                                    const due = getDaysUntilDue(a.dueAt);
                                    return (
                                        <div
                                            key={a.assessmentID}
                                            className="rd-list-row"
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => navigate(`/assessments/${a.assessmentID}`)}
                                        >
                                            <div className="flex-grow-1">
                                                <div className="rd-list-title">{a.title}</div>
                                                <div className="rd-list-meta">
                                                    <i className="bi bi-book me-1"></i>{a.courseName}
                                                    <span className="mx-1">·</span>
                                                    <span className="badge bg-secondary">{a.type}</span>
                                                </div>
                                            </div>
                                            <span className={`badge bg-${due.color} text-nowrap ms-2`}>
                                                {due.label}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="rd-card">
                <div className="rd-card-header">
                    <span className="rd-card-header-title"><i className="bi bi-lightning-fill me-2"></i>Quick Actions</span>
                </div>
                <div className="rd-qa-grid">
                    {[
                        { label: 'Enrollment',      icon: 'bi-card-checklist',     path: '/enrollment'    },
                        { label: 'Timetable',       icon: 'bi-calendar3',          path: '/timetable'     },
                        { label: 'Assessments',     icon: 'bi-file-earmark-check', path: '/assessments'   },
                        { label: 'Submissions',     icon: 'bi-cloud-upload',       path: '/submissions'   },
                        { label: 'Course Contents', icon: 'bi-collection-play',    path: '/contents'      },
                        { label: 'Discussions',     icon: 'bi-chat-square-text',   path: '/discussions'   },
                        { label: 'Transcripts',     icon: 'bi-file-earmark-text',  path: '/transcripts'   },
                        { label: 'Invoices',        icon: 'bi-receipt',            path: '/invoices'      },
                        { label: 'Notifications',   icon: 'bi-bell',               path: '/notifications' },
                        { label: 'Support Ticket',  icon: 'bi-headset',            path: '/tickets'       },
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
