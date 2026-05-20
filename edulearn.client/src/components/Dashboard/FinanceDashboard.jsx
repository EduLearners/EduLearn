import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import Loading from '../Loading';

const TERM = '2026-Spring';

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
        // Note: backend has no list-all endpoints for invoices or fees
        // GET /api/invoices/student/:id and GET /api/fees/program/:id/term/:term are the only endpoints
        // Dashboard shows placeholder values — real data available on the Invoices/Fees pages
        s.totalInvoices = null;
        s.pendingInvoices = null;
        s.paidInvoices = null;
        s.feeSchedules = null;
        s.activeFees = null;
        setStats(s);
        setLoading(false);
    };

    if (loading) return <Loading message="Loading your dashboard..." />;

    return (
        <div>
            <div className="d-flex align-items-center justify-content-between mb-4">
                <div className="d-flex align-items-center gap-3">
                    <span className="badge" style={{ background: '#EAF3DE', color: '#27500A', fontSize: 13 }}>Finance</span>
                    <h2 className="mb-0 text-primary-edulearn">Finance Dashboard</h2>
                </div>
                <small className="text-muted">{today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</small>
            </div>

            <div className="card shadow-sm mb-4 border-0 bg-light">
                <div className="card-body d-flex align-items-center justify-content-between">
                    <div>
                        <h4 className="mb-1">Welcome back, {username}! 👋</h4>
                        <p className="mb-0 text-muted">Term: {TERM} &nbsp;·&nbsp; Role: Finance</p>
                    </div>
                    <i className="bi bi-cash-stack text-muted" style={{ fontSize: '2.5rem', opacity: 0.3 }}></i>
                </div>
            </div>

            <div className="row g-3 mb-4">
                <div className="col-md-3 col-sm-6">
                    <div className="card shadow-sm h-100 border-0 bg-light" style={{ cursor: 'pointer' }} onClick={() => navigate('/finance/invoices')}>
                        <div className="card-body">
                            <div className="text-muted small text-uppercase mb-1">Total Invoices</div>
                            <div className="display-5 fw-bold" style={{ color: '#185FA5' }}>{stats.totalInvoices ?? '—'}</div>
                            <small className="text-muted">this term</small>
                        </div>
                    </div>
                </div>
                <div className="col-md-3 col-sm-6">
                    <div className="card shadow-sm h-100 border-0 bg-light" style={{ cursor: 'pointer' }} onClick={() => navigate('/finance/invoices')}>
                        <div className="card-body">
                            <div className="text-muted small text-uppercase mb-1">Pending Payment</div>
                            <div className="display-5 fw-bold" style={{ color: '#A32D2D' }}>{stats.pendingInvoices ?? '—'}</div>
                            <small className="text-muted">invoices due</small>
                        </div>
                    </div>
                </div>
                <div className="col-md-3 col-sm-6">
                    <div className="card shadow-sm h-100 border-0 bg-light" style={{ cursor: 'pointer' }} onClick={() => navigate('/finance/invoices')}>
                        <div className="card-body">
                            <div className="text-muted small text-uppercase mb-1">Paid</div>
                            <div className="display-5 fw-bold" style={{ color: '#3B6D11' }}>{stats.paidInvoices ?? '—'}</div>
                            <small className="text-muted">invoices settled</small>
                        </div>
                    </div>
                </div>
                <div className="col-md-3 col-sm-6">
                    <div className="card shadow-sm h-100 border-0 bg-light" style={{ cursor: 'pointer' }} onClick={() => navigate('/finance/scholarships')}>
                        <div className="card-body">
                            <div className="text-muted small text-uppercase mb-1">Scholarships</div>
                            <div className="display-5 fw-bold" style={{ color: '#534AB7' }}>—</div>
                            <small className="text-muted">active awards</small>
                        </div>
                    </div>
                </div>
                <div className="col-md-3 col-sm-6">
                    <div className="card shadow-sm h-100 border-0 bg-light" style={{ cursor: 'pointer' }} onClick={() => navigate('/finance/fees')}>
                        <div className="card-body">
                            <div className="text-muted small text-uppercase mb-1">Fee Schedules</div>
                            <div className="display-5 fw-bold" style={{ color: '#854F0B' }}>{stats.feeSchedules ?? '—'}</div>
                            <small className="text-muted">{stats.activeFees ?? 0} active</small>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card shadow-sm">
                <div className="card-header bg-light"><strong><i className="bi bi-lightning me-2"></i>Quick Actions</strong></div>
                <div className="card-body">
                    <div className="d-flex flex-wrap gap-2">
                        <button className="btn btn-outline-primary btn-sm" onClick={() => navigate('/finance/fees')}><i className="bi bi-cash-stack me-2"></i>Fee Schedules</button>
                        <button className="btn btn-outline-primary btn-sm" onClick={() => navigate('/finance/invoices')}><i className="bi bi-receipt me-2"></i>Generate Invoice</button>
                        <button className="btn btn-outline-primary btn-sm" onClick={() => navigate('/finance/payments')}><i className="bi bi-credit-card me-2"></i>Record Payment</button>
                        <button className="btn btn-outline-primary btn-sm" onClick={() => navigate('/finance/scholarships')}><i className="bi bi-award me-2"></i>Scholarships</button>
                        <button className="btn btn-outline-primary btn-sm" onClick={() => navigate('/notifications')}><i className="bi bi-bell me-2"></i>Notifications</button>
                        <button className="btn btn-outline-primary btn-sm" onClick={() => navigate('/tickets')}><i className="bi bi-headset me-2"></i>Support Ticket</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
