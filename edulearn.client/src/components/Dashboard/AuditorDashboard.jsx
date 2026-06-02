import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { reportService } from '../../services/reportService';
import { kpiService } from '../../services/kpiService';
import { auditLogService } from '../../services/auditLogService';
import { ticketService } from '../../services/ticketService';
import Loading from '../Loading';
import { CURRENT_TERM } from '../../config/academic';
import './RoleDashboard.css';

const TERM = CURRENT_TERM;

const QUICK_ACTIONS = [
    { label: 'Audit Log',      icon: 'bi-journal-text',           path: '/audit-log'     },
    { label: 'KPIs',           icon: 'bi-bar-chart-line',         path: '/kpis'          },
    { label: 'Reports',        icon: 'bi-file-earmark-bar-graph', path: '/reports'       },
    { label: 'Grade Changes',  icon: 'bi-arrow-left-right',       path: '/grade-changes' },
    { label: 'Notifications',  icon: 'bi-bell',                   path: '/notifications' },
    { label: 'Support Ticket', icon: 'bi-headset',                path: '/tickets'       },
];

const STAT_CARDS = [
    { key: 'auditLogs',       label: 'Audit Logs',       sub: () => 'last 30 days', icon: 'bi-journal-text',           accent: '#0F6E56', iconBg: '#d1fae5', iconColor: '#0F6E56', path: '/audit-log'     },
    { key: 'reports',         label: 'Reports',          sub: () => 'generated',    icon: 'bi-file-earmark-bar-graph', accent: '#185FA5', iconBg: '#dbeafe', iconColor: '#185FA5', path: '/reports'       },
    { key: 'kpis',            label: 'KPIs Tracked',     sub: () => 'all active',   icon: 'bi-bar-chart-line',         accent: '#534AB7', iconBg: '#ede9fe', iconColor: '#534AB7', path: '/kpis'          },
    { key: 'gradeChanges',    label: 'Grade Changes',    sub: () => 'this term',    icon: 'bi-arrow-left-right',       accent: '#854F0B', iconBg: '#fef3c7', iconColor: '#854F0B', path: '/grade-changes' },
    { key: 'resolvedTickets', label: 'Tickets Resolved', sub: () => 'this month',   icon: 'bi-check-circle-fill',      accent: '#3B6D11', iconBg: '#dcfce7', iconColor: '#3B6D11', path: '/tickets'       },
];

export default function AuditorDashboard() {
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
            const [reports, kpis, auditLogs, tickets] = await Promise.allSettled([
                reportService.getAll(),
                kpiService.getAll(),
                auditLogService.getAll({ limit: 100 }),
                ticketService.getAll(),
            ]);
            if (reports.status === 'fulfilled') s.reports = (reports.value || []).length;
            if (kpis.status === 'fulfilled') s.kpis = (kpis.value || []).length;
            if (auditLogs.status === 'fulfilled') s.auditLogs = (auditLogs.value || []).length;
            if (tickets.status === 'fulfilled') {
                const d = tickets.value || [];
                s.resolvedTickets = d.filter(t => t.status === 'Resolved').length;
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
                    <span className="rd-hero-badge">Auditor · Read Only · {TERM}</span>
                    <div className="rd-hero-title">Welcome back, {username}! 👋</div>
                    <p className="rd-hero-sub">
                        {today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>
                <i className="bi bi-eye rd-hero-icon"></i>
            </div>

            <div className="row g-3 mb-4">
                {STAT_CARDS.map((card) => (
                    <div key={card.key} className="col">
                        <div className="rd-stat-card" style={{ '--rd-accent': card.accent }} onClick={() => navigate(card.path)}>
                            <div>
                                <div className="rd-stat-label">{card.label}</div>
                                <div className="rd-stat-value" style={{ color: card.accent }}>
                                    {card.key === 'gradeChanges' ? '—' : (stats[card.key] ?? '—')}
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
                        <button key={a.path} className="rd-qa-btn" onClick={() => navigate(a.path)}>
                            <i className={`bi ${a.icon}`}></i>{a.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
