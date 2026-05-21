import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { courseService } from '../../services/courseService';
import { assessmentService } from '../../services/assessmentService';
import { submissionService } from '../../services/submissionService';
import { studentService } from '../../services/studentService';
import Loading from '../Loading';
import './RoleDashboard.css';

const TERM = '2026-Spring';

const QUICK_ACTIONS = [
    { label: 'New Course',        icon: 'bi-plus-circle',        path: '/courses/new'     },
    { label: 'New Assessment',    icon: 'bi-file-plus',          path: '/assessments/new' },
    { label: 'Grade Submissions', icon: 'bi-star',               path: '/submissions'     },
    { label: 'Upload Content',    icon: 'bi-upload',             path: '/contents/new'    },
    { label: 'Syllabus',          icon: 'bi-file-earmark-ruled', path: '/syllabi'         },
    { label: 'Discussions',       icon: 'bi-chat-square-text',   path: '/discussions'     },
    { label: 'Grade Changes',     icon: 'bi-arrow-left-right',   path: '/grade-changes'   },
    { label: 'Students',          icon: 'bi-people',             path: '/students'        },
    { label: 'Timetable',         icon: 'bi-calendar3',          path: '/timetable'       },
    { label: 'Notifications',     icon: 'bi-bell',               path: '/notifications'   },
    { label: 'Support Ticket',    icon: 'bi-headset',            path: '/tickets'         },
];

const STAT_CARDS = [
    { key: 'courses',        label: 'My Courses',      sub: () => 'this term',              icon: 'bi-book-fill',          accent: '#3B6D11', iconBg: '#dcfce7', iconColor: '#3B6D11', path: '/courses'     },
    { key: 'students',       label: 'Total Students',  sub: () => 'across sections',        icon: 'bi-people-fill',        accent: '#185FA5', iconBg: '#dbeafe', iconColor: '#185FA5', path: '/students'    },
    { key: 'assessments',    label: 'Assessments',     sub: (s) => `${s.published ?? 0} published`, icon: 'bi-file-earmark-check', accent: '#534AB7', iconBg: '#ede9fe', iconColor: '#534AB7', path: '/assessments' },
    { key: 'pendingGrading', label: 'Pending Grading', sub: () => 'submissions',            icon: 'bi-hourglass-split',    accent: '#854F0B', iconBg: '#fef3c7', iconColor: '#854F0B', path: '/submissions' },
    { key: 'discussions',    label: 'Discussions',     sub: () => 'open threads',           icon: 'bi-chat-square-text',   accent: '#0F6E56', iconBg: '#d1fae5', iconColor: '#0F6E56', path: '/discussions' },
];

export default function InstructorDashboard() {
    const navigate = useNavigate();
    const { username } = authService.getCurrentUser();
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);
    const today = new Date();

    useEffect(() => { loadStats(); }, []);

    const loadStats = async () => {
        setLoading(true);
        const s = {};
        try {
            const [courses, students, assessments] = await Promise.allSettled([
                courseService.getAll(),
                studentService.getAll(),
                assessmentService.getAll(),
            ]);
            if (courses.status === 'fulfilled') s.courses = (courses.value || []).length;
            if (students.status === 'fulfilled') s.students = (students.value || []).length;
            if (assessments.status === 'fulfilled') {
                const all = assessments.value || [];
                s.assessments = all.length;
                s.published = all.filter(a => a.status === 'Published').length;
                const subResults = await Promise.allSettled(
                    all.map(a => submissionService.getByAssessment(a.assessmentID).catch(() => []))
                );
                const allSubs = subResults.filter(r => r.status === 'fulfilled').flatMap(r => r.value || []);
                s.pendingGrading = allSubs.filter(sub => sub.status === 'Submitted').length;
            }
        } catch { }
        setStats(s);
        setLoading(false);
    };

    if (loading) return <Loading message="Loading your dashboard..." />;

    return (
        <div className="role-dashboard">
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

            <div className="row g-3 mb-4">
                {STAT_CARDS.map((card) => (
                    <div key={card.key} className="col">
                        <div className="rd-stat-card" style={{ '--rd-accent': card.accent }} onClick={() => navigate(card.path)}>
                            <div>
                                <div className="rd-stat-label">{card.label}</div>
                                <div className="rd-stat-value" style={{ color: card.accent }}>
                                    {card.key === 'discussions' ? '—' : (stats[card.key] ?? '—')}
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

            <div className="rd-card">
                <div className="rd-card-header">
                    <span className="rd-card-header-title"><i className="bi bi-lightning-fill me-2"></i>Quick Actions</span>
                </div>
                <div className="rd-qa-grid">
                    {QUICK_ACTIONS.map((a) => (
                        <button key={a.path + a.label} className="rd-qa-btn" onClick={() => navigate(a.path)}>
                            <i className={`bi ${a.icon}`}></i>{a.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
