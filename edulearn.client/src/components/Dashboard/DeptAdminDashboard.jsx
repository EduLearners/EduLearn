import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { programService } from '../../services/programService';
import { courseService } from '../../services/courseService';
import { roomService } from '../../services/roomService';
import { userService } from '../../services/userService';
import { sectionService } from '../../services/sectionService';
import Loading from '../Loading';
import './RoleDashboard.css';

const TERM = '2026-Spring';

const QUICK_ACTIONS = [
    { label: 'New Program',    icon: 'bi-plus-circle',        path: '/programs/new'  },
    { label: 'Courses',        icon: 'bi-book',               path: '/courses'       },
    { label: 'Sections',       icon: 'bi-collection',         path: '/sections'      },
    { label: 'Rooms',          icon: 'bi-door-closed',        path: '/rooms'         },
    { label: 'Syllabus',       icon: 'bi-file-earmark-ruled', path: '/syllabi'       },
    { label: 'Discussions',    icon: 'bi-chat-square-text',   path: '/discussions'   },
    { label: 'Timetable',      icon: 'bi-calendar3',          path: '/timetable'     },
    { label: 'Notifications',  icon: 'bi-bell',               path: '/notifications' },
    { label: 'Support Ticket', icon: 'bi-headset',            path: '/tickets'       },
];

const STAT_CARDS = [
    { key: 'programs',    label: 'Programs',    sub: () => 'active',                              icon: 'bi-mortarboard-fill', accent: '#854F0B', iconBg: '#fef3c7', iconColor: '#854F0B', path: '/programs'  },
    { key: 'courses',     label: 'Courses',     sub: () => 'this dept',                           icon: 'bi-book-fill',        accent: '#185FA5', iconBg: '#dbeafe', iconColor: '#185FA5', path: '/courses'   },
    { key: 'sections',    label: 'Sections',    sub: () => 'view sections',                       icon: 'bi-collection-fill',  accent: '#3B6D11', iconBg: '#dcfce7', iconColor: '#3B6D11', path: '/sections'  },
    { key: 'rooms',       label: 'Rooms',       sub: (s) => `${s.availableRooms ?? 0} available`, icon: 'bi-door-closed-fill', accent: '#534AB7', iconBg: '#ede9fe', iconColor: '#534AB7', path: '/rooms'     },
    { key: 'instructors', label: 'Instructors', sub: () => 'active',                              icon: 'bi-person-video3',    accent: '#0F6E56', iconBg: '#d1fae5', iconColor: '#0F6E56', path: '/sections'  },
];

export default function DeptAdminDashboard() {
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
            const [programs, courses, sections, rooms, instructors] = await Promise.allSettled([
                programService.getAll(),
                courseService.getAll(),
                sectionService.getAll(),
                roomService.getAll(),
                userService.getByRole('Instructor'),
            ]);
            if (programs.status === 'fulfilled') s.programs = (programs.value || []).filter(p => p.status === 'Active').length;
            if (courses.status === 'fulfilled') s.courses = (courses.value || []).length;
            if (sections.status === 'fulfilled') s.sections = (sections.value || []).length;
            if (rooms.status === 'fulfilled') {
                const d = rooms.value || [];
                s.rooms = d.length;
                s.availableRooms = d.filter(r => r.status === 'Available').length;
            }
            if (instructors.status === 'fulfilled') s.instructors = (instructors.value || []).length;
        } catch { }
        setStats(s);
        setLoading(false);
    };

    if (loading) return <Loading message="Loading your dashboard..." />;

    return (
        <div className="role-dashboard">
            <div className="rd-hero">
                <div style={{ position: 'relative', zIndex: 1 }}>
                    <span className="rd-hero-badge">DeptAdmin · {TERM}</span>
                    <div className="rd-hero-title">Welcome back, {username}! 👋</div>
                    <p className="rd-hero-sub">
                        {today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>
                <i className="bi bi-building rd-hero-icon"></i>
            </div>

            <div className="row g-3 mb-4">
                {STAT_CARDS.map((card) => (
                    <div key={card.key} className="col">
                        <div className="rd-stat-card" style={{ '--rd-accent': card.accent }} onClick={() => navigate(card.path)}>
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
