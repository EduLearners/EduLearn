import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { invoiceService } from '../../services/invoiceService';
import { feeService } from '../../services/feeService';
import { scholarshipService } from '../../services/scholarshipService';
import Loading from '../Loading';
import './RoleDashboard.css';

const TERM = '2026-Spring';

const QUICK_ACTIONS = [
    { label: 'Fee Schedules',    icon: 'bi-cash-stack',    path: '/fees'          },
    { label: 'Generate Invoice', icon: 'bi-receipt',       path: '/invoices'      },
    { label: 'Record Payment',   icon: 'bi-credit-card',   path: '/payments'      },
    { label: 'Scholarships',     icon: 'bi-award',         path: '/scholarships'  },
    { label: 'Notifications',    icon: 'bi-bell',          path: '/notifications' },
    { label: 'Support Ticket',   icon: 'bi-headset',       path: '/tickets'       },
];

const STAT_CARDS = [
    { key: 'totalInvoices',   label: 'Total Invoices',   sub: () => 'this term',        icon: 'bi-receipt',         accent: '#185FA5', iconBg: '#dbeafe', iconColor: '#185FA5', path: '/invoices'     },
    { key: 'pendingInvoices', label: 'Pending Payment',  sub: () => 'invoices due',     icon: 'bi-hourglass',       accent: '#A32D2D', iconBg: '#fee2e2', iconColor: '#A32D2D', path: '/invoices'     },
    { key: 'paidInvoices',    label: 'Paid',             sub: () => 'invoices settled', icon: 'bi-check-circle',    accent: '#3B6D11', iconBg: '#dcfce7', iconColor: '#3B6D11', path: '/invoices'     },
    { key: 'scholarships',    label: 'Scholarships',     sub: () => 'active awards',    icon: 'bi-award-fill',      accent: '#534AB7', iconBg: '#ede9fe', iconColor: '#534AB7', path: '/scholarships' },
    { key: 'feeSchedules',    label: 'Fee Schedules',    sub: () => 'configured',       icon: 'bi-cash-stack',      accent: '#854F0B', iconBg: '#fef3c7', iconColor: '#854F0B', path: '/fees'         },
];

export default function FinanceDashboard() {
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
            const [invoices, fees, scholarships] = await Promise.allSettled([
                invoiceService.getAll(),
                feeService.getAll(),
                scholarshipService.getAll(),
            ]);

            if (invoices.status === 'fulfilled') {
                const all = invoices.value || [];
                s.totalInvoices   = all.length;
                s.pendingInvoices = all.filter(i => i.status === 'Pending' || i.status === 'Overdue').length;
                s.paidInvoices    = all.filter(i => i.status === 'Paid').length;
            }

            if (fees.status === 'fulfilled') {
                s.feeSchedules = (fees.value || []).length;
            }

            if (scholarships.status === 'fulfilled') {
                s.scholarships = (scholarships.value || []).filter(sc => sc.status === 'Active').length;
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
                    <span className="rd-hero-badge">Finance · {TERM}</span>
                    <div className="rd-hero-title">Welcome back, {username}! 👋</div>
                    <p className="rd-hero-sub">
                        {today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>
                <i className="bi bi-cash-stack rd-hero-icon"></i>
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
