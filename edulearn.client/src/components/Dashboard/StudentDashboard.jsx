import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { enrollmentService } from '../../services/enrollmentService';
import { submissionService } from '../../services/submissionService';
import { notificationService } from '../../services/notificationService';
import { transcriptService } from '../../services/transcriptService';
import Loading from '../Loading';
import axiosClient from '../../api/axiosClient';
import './RoleDashboard.css';

const TERM = '2026-Spring';

const QUICK_ACTIONS = [
    { label: 'Enrollment',      icon: 'bi-card-checklist',     path: '/enrollment'    },
    { label: 'Timetable',       icon: 'bi-calendar3',          path: '/timetable'     },
    { label: 'Assessments',     icon: 'bi-file-earmark-check', path: '/assessments'   },
    { label: 'Submissions',     icon: 'bi-cloud-upload',       path: '/submissions'   },
    { label: 'Course Contents', icon: 'bi-collection-play',    path: '/contents'      },
    { label: 'Syllabus',        icon: 'bi-file-earmark-ruled', path: '/syllabi'       },
    { label: 'Discussions',     icon: 'bi-chat-square-text',   path: '/discussions'   },
    { label: 'Transcripts',     icon: 'bi-file-earmark-text',  path: '/transcripts'   },
    { label: 'Invoices',        icon: 'bi-receipt',            path: '/invoices'      },
    { label: 'Notifications',   icon: 'bi-bell',               path: '/notifications' },
    { label: 'Support Ticket',  icon: 'bi-headset',            path: '/tickets'       },
];

const STAT_CARDS = [
    { key: 'enrolled',           label: 'Enrolled Courses',    sub: (s) => `${s.waitlisted ?? 0} waitlisted`, icon: 'bi-mortarboard-fill', accent: '#185FA5', iconBg: '#dbeafe', iconColor: '#185FA5', path: '/enrollment'    },
    { key: 'pendingSubmissions', label: 'Pending Submissions', sub: () => 'awaiting grade',                   icon: 'bi-cloud-upload',     accent: '#854F0B', iconBg: '#fef3c7', iconColor: '#854F0B', path: '/submissions'   },
    { key: 'cgpa',               label: 'Latest CGPA',         sub: () => 'out of 10.00',                     icon: 'bi-award-fill',       accent: '#3B6D11', iconBg: '#dcfce7', iconColor: '#3B6D11', path: '/transcripts'   },
    { key: 'unread',             label: 'Notifications',       sub: () => 'unread',                           icon: 'bi-bell-fill',        accent: '#534AB7', iconBg: '#ede9fe', iconColor: '#534AB7', path: '/notifications' },
    { key: 'invoice',            label: 'Pending Invoice',     sub: () => 'check invoices',                   icon: 'bi-receipt',          accent: '#A32D2D', iconBg: '#fee2e2', iconColor: '#A32D2D', path: '/invoices'      },
];

export default function StudentDashboard() {
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
            const studentRecord = await axiosClient.get('/students/me').then(r => r.data).catch(() => null);
            const sid = studentRecord?.studentID;
            if (sid) {
                const [enrollments, transcripts, notifications, submissions] = await Promise.allSettled([
                    enrollmentService.getByStudent(sid),
                    transcriptService.getByStudent(sid),
                    notificationService.getAll({ unreadOnly: true }),
                    submissionService.getByStudent(sid),
                ]);
                if (enrollments.status === 'fulfilled') {
                    const d = enrollments.value || [];
                    s.enrolled = d.filter(e => e.status === 'Enrolled').length;
                    s.waitlisted = d.filter(e => e.status === 'Waitlisted').length;
                }
                if (transcripts.status === 'fulfilled') {
                    const d = transcripts.value || [];
                    s.cgpa = d.length > 0 ? d[0].gpa : null;
                }
                if (notifications.status === 'fulfilled') {
                    const d = notifications.value;
                    s.unread = d?.items?.length ?? (Array.isArray(d) ? d.length : 0);
                }
                if (submissions.status === 'fulfilled') {
                    const d = submissions.value || [];
                    s.pendingSubmissions = d.filter(sub => sub.status === 'Submitted').length;
                }
            }
        } catch { }
        setStats(s);
        setLoading(false);
    };

    const getStatValue = (card) => {
        if (card.key === 'cgpa') return stats.cgpa != null ? Number(stats.cgpa).toFixed(2) : '—';
        if (card.key === 'invoice') return '—';
        return stats[card.key] ?? '—';
    };

    if (loading) return <Loading message="Loading your dashboard..." />;

    return (
        <div className="role-dashboard">
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

            <div className="row g-3 mb-4">
                {STAT_CARDS.map((card) => (
                    <div key={card.key} className="col">
                        <div className="rd-stat-card" style={{ '--rd-accent': card.accent }} onClick={() => navigate(card.path)}>
                            <div>
                                <div className="rd-stat-label">{card.label}</div>
                                <div className="rd-stat-value" style={{ color: card.accent }}>{getStatValue(card)}</div>
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
                        <button key={a.path} className="rd-qa-btn" onClick={() => navigate(a.path)}>
                            <i className={`bi ${a.icon}`}></i>{a.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
