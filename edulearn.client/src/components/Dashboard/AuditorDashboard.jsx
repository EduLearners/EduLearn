import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { reportService } from '../../services/reportService';
import { kpiService } from '../../services/kpiService';
import { auditLogService } from '../../services/auditLogService';
import { ticketService } from '../../services/ticketService';
import Loading from '../Loading';

const TERM = '2026-Spring';

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
        <div>
            <div className="d-flex align-items-center justify-content-between mb-4">
                <div className="d-flex align-items-center gap-3">
                    <span className="badge" style={{ background: '#E1F5EE', color: '#085041', fontSize: 13 }}>Auditor</span>
                    <h2 className="mb-0 text-primary-edulearn">Auditor Dashboard</h2>
                </div>
                <small className="text-muted">{today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</small>
            </div>

            <div className="card shadow-sm mb-4 border-0 bg-light">
                <div className="card-body d-flex align-items-center justify-content-between">
                    <div>
                        <h4 className="mb-1">Welcome back, {username}! 👋</h4>
                        <p className="mb-0 text-muted">Term: {TERM} &nbsp;·&nbsp; Role: Auditor &nbsp;·&nbsp; Read only</p>
                    </div>
                    <i className="bi bi-eye text-muted" style={{ fontSize: '2.5rem', opacity: 0.3 }}></i>
                </div>
            </div>

            <div className="row g-3 mb-4">
                <div className="col-md-3 col-sm-6">
                    <div className="card shadow-sm h-100 border-0 bg-light" style={{ cursor: 'pointer' }} onClick={() => navigate('/audit-log')}>
                        <div className="card-body">
                            <div className="text-muted small text-uppercase mb-1">Audit Logs</div>
                            <div className="display-5 fw-bold" style={{ color: '#0F6E56' }}>{stats.auditLogs ?? '—'}</div>
                            <small className="text-muted">last 30 days</small>
                        </div>
                    </div>
                </div>
                <div className="col-md-3 col-sm-6">
                    <div className="card shadow-sm h-100 border-0 bg-light" style={{ cursor: 'pointer' }} onClick={() => navigate('/reports')}>
                        <div className="card-body">
                            <div className="text-muted small text-uppercase mb-1">Reports</div>
                            <div className="display-5 fw-bold" style={{ color: '#185FA5' }}>{stats.reports ?? '—'}</div>
                            <small className="text-muted">generated</small>
                        </div>
                    </div>
                </div>
                <div className="col-md-3 col-sm-6">
                    <div className="card shadow-sm h-100 border-0 bg-light" style={{ cursor: 'pointer' }} onClick={() => navigate('/kpis')}>
                        <div className="card-body">
                            <div className="text-muted small text-uppercase mb-1">KPIs Tracked</div>
                            <div className="display-5 fw-bold" style={{ color: '#534AB7' }}>{stats.kpis ?? '—'}</div>
                            <small className="text-muted">all active</small>
                        </div>
                    </div>
                </div>
                <div className="col-md-3 col-sm-6">
                    <div className="card shadow-sm h-100 border-0 bg-light" style={{ cursor: 'pointer' }} onClick={() => navigate('/grade-changes')}>
                        <div className="card-body">
                            <div className="text-muted small text-uppercase mb-1">Grade Changes</div>
                            <div className="display-5 fw-bold" style={{ color: '#854F0B' }}>—</div>
                            <small className="text-muted">this term</small>
                        </div>
                    </div>
                </div>
                <div className="col-md-3 col-sm-6">
                    <div className="card shadow-sm h-100 border-0 bg-light" style={{ cursor: 'pointer' }} onClick={() => navigate('/tickets')}>
                        <div className="card-body">
                            <div className="text-muted small text-uppercase mb-1">Tickets Resolved</div>
                            <div className="display-5 fw-bold" style={{ color: '#3B6D11' }}>{stats.resolvedTickets ?? '—'}</div>
                            <small className="text-muted">this month</small>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card shadow-sm">
                <div className="card-header bg-light"><strong><i className="bi bi-lightning me-2"></i>Quick Actions</strong></div>
                <div className="card-body">
                    <div className="d-flex flex-wrap gap-2">
                        <button className="btn btn-outline-primary btn-sm" onClick={() => navigate('/audit-log')}><i className="bi bi-journal-text me-2"></i>Audit Log</button>
                        <button className="btn btn-outline-primary btn-sm" onClick={() => navigate('/kpis')}><i className="bi bi-bar-chart-line me-2"></i>KPIs</button>
                        <button className="btn btn-outline-primary btn-sm" onClick={() => navigate('/reports')}><i className="bi bi-file-earmark-bar-graph me-2"></i>Reports</button>
                        <button className="btn btn-outline-primary btn-sm" onClick={() => navigate('/grade-changes')}><i className="bi bi-arrow-left-right me-2"></i>Grade Changes</button>
                        <button className="btn btn-outline-primary btn-sm" onClick={() => navigate('/notifications')}><i className="bi bi-bell me-2"></i>Notifications</button>
                        <button className="btn btn-outline-primary btn-sm" onClick={() => navigate('/tickets')}><i className="bi bi-headset me-2"></i>Support Ticket</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
