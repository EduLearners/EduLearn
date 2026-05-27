import { useState, useEffect, useRef } from 'react';
import { auditLogService } from '../../services/auditLogService';
import Loading from '../../components/Loading';
import ErrorAlert from '../../components/ErrorAlert';

// How many rows to show before the "Show more" button
const INITIAL_ROWS = 7;

// ── Tiny line chart drawn on a <canvas> ──────────────────────────
// Buckets logs by hour and draws activity over time.
function ActivityChart({ logs }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        if (!logs.length || !canvasRef.current) return;

        // Build hourly buckets from the last 24 hours
        const now = Date.now();
        const HOURS = 24;
        const buckets = Array(HOURS).fill(0);

        logs.forEach(log => {
            const ts = log.timestamp || log.createdAt;
            if (!ts) return;
            const t = new Date(ts + 'Z').getTime();
            const hoursAgo = Math.floor((now - t) / (1000 * 60 * 60));
            if (hoursAgo >= 0 && hoursAgo < HOURS) {
                buckets[HOURS - 1 - hoursAgo]++;
            }
        });

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const W = canvas.width;
        const H = canvas.height;
        const PAD = { top: 16, right: 16, bottom: 28, left: 32 };
        const chartW = W - PAD.left - PAD.right;
        const chartH = H - PAD.top - PAD.bottom;
        const maxVal = Math.max(...buckets, 1);

        ctx.clearRect(0, 0, W, H);

        // Grid lines
        ctx.strokeStyle = '#e9ecef';
        ctx.lineWidth = 1;
        [0.25, 0.5, 0.75, 1].forEach(frac => {
            const y = PAD.top + chartH * (1 - frac);
            ctx.beginPath();
            ctx.moveTo(PAD.left, y);
            ctx.lineTo(PAD.left + chartW, y);
            ctx.stroke();
            ctx.fillStyle = '#adb5bd';
            ctx.font = '10px system-ui';
            ctx.textAlign = 'right';
            ctx.fillText(Math.round(maxVal * frac), PAD.left - 4, y + 3);
        });

        // X-axis labels (every 6 hours)
        ctx.fillStyle = '#adb5bd';
        ctx.font = '10px system-ui';
        ctx.textAlign = 'center';
        [0, 6, 12, 18, 23].forEach(i => {
            const x = PAD.left + (i / (HOURS - 1)) * chartW;
            const label = `${HOURS - 1 - i}h`;
            ctx.fillText(label, x, H - 6);
        });

        // Gradient fill
        const grad = ctx.createLinearGradient(0, PAD.top, 0, PAD.top + chartH);
        grad.addColorStop(0, 'rgba(24, 95, 165, 0.25)');
        grad.addColorStop(1, 'rgba(24, 95, 165, 0.02)');

        ctx.beginPath();
        buckets.forEach((v, i) => {
            const x = PAD.left + (i / (HOURS - 1)) * chartW;
            const y = PAD.top + chartH * (1 - v / maxVal);
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        // Close fill path
        ctx.lineTo(PAD.left + chartW, PAD.top + chartH);
        ctx.lineTo(PAD.left, PAD.top + chartH);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();

        // Line
        ctx.beginPath();
        ctx.strokeStyle = '#185FA5';
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        buckets.forEach((v, i) => {
            const x = PAD.left + (i / (HOURS - 1)) * chartW;
            const y = PAD.top + chartH * (1 - v / maxVal);
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Dots on non-zero points
        buckets.forEach((v, i) => {
            if (!v) return;
            const x = PAD.left + (i / (HOURS - 1)) * chartW;
            const y = PAD.top + chartH * (1 - v / maxVal);
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fillStyle = '#185FA5';
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        });
    }, [logs]);

    return (
        <canvas
            ref={canvasRef}
            width={700}
            height={120}
            style={{ width: '100%', height: 120, display: 'block' }}
        />
    );
}

export default function AuditLogPage() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expanded, setExpanded] = useState(false);

    const [filters, setFilters] = useState({
        userId: '',
        action: '',
        resourceType: '',
        resourceId: '',
        from: '',
        to: '',
        limit: 100,
    });

    useEffect(() => {
        loadLogs();
    }, []);

    const loadLogs = async (customFilters) => {
        try {
            setLoading(true);
            setError(null);
            const active = customFilters || filters;
            const params = {};
            if (active.userId) params.userId = active.userId;
            if (active.action) params.action = active.action;
            if (active.resourceType) params.resourceType = active.resourceType;
            if (active.resourceId) params.resourceId = active.resourceId;
            if (active.from) params.from = active.from;
            if (active.to) params.to = active.to;
            if (active.limit) params.limit = active.limit;

            const data = await auditLogService.getAll(params);
            setLogs(data || []);
            setExpanded(false);
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    const handleFilter = (e) => {
        e.preventDefault();
        if (filters.from && filters.to && new Date(filters.from) > new Date(filters.to)) {
            setError({ message: '"From" date must be before "To" date.' });
            return;
        }
        loadLogs(filters);
    };

    const handleClear = () => {
        const cleared = {
            userId: '', action: '', resourceType: '',
            resourceId: '', from: '', to: '', limit: 100,
        };
        setFilters(cleared);
        loadLogs(cleared);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    // Rows shown in table — capped at INITIAL_ROWS until expanded
    const visibleLogs = expanded ? logs : logs.slice(0, INITIAL_ROWS);
    const hasMore = logs.length > INITIAL_ROWS;

    // Quick stats derived from logs
    const uniqueUsers = new Set(logs.map(l => l.userID)).size;
    const uniqueActions = new Set(logs.map(l => l.action).filter(Boolean)).size;

    return (
        <div>
            {/* Page Header */}
            <div className="d-flex align-items-center justify-content-between mb-4">
                <h2 className="text-primary-edulearn mb-0">
                    <i className="bi bi-journal-text me-2"></i>Audit Log
                </h2>
                <small className="text-muted">Read-only trail</small>
            </div>

            {/* Filters */}
            <div className="card shadow-sm mb-4">
                <div className="card-header bg-light">
                    <strong>
                        <i className="bi bi-funnel me-2"></i>Filters
                    </strong>
                </div>
                <div className="card-body">
                    <form onSubmit={handleFilter}>
                        <div className="row g-3">
                            <div className="col-md-3">
                                <label className="form-label fw-bold">User ID</label>
                                <input
                                    type="number"
                                    className="form-control"
                                    name="userId"
                                    value={filters.userId}
                                    onChange={handleChange}
                                    placeholder="e.g. 1"
                                />
                            </div>
                            <div className="col-md-3">
                                <label className="form-label fw-bold">Action</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    name="action"
                                    value={filters.action}
                                    onChange={handleChange}
                                    placeholder="e.g. LoginSuccess"
                                />
                            </div>
                            <div className="col-md-3">
                                <label className="form-label fw-bold">Resource Type</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    name="resourceType"
                                    value={filters.resourceType}
                                    onChange={handleChange}
                                    placeholder="e.g. Enrollment"
                                />
                            </div>
                            <div className="col-md-3">
                                <label className="form-label fw-bold">Resource ID</label>
                                <input
                                    type="number"
                                    className="form-control"
                                    name="resourceId"
                                    value={filters.resourceId}
                                    onChange={handleChange}
                                    placeholder="e.g. 5"
                                />
                            </div>
                            <div className="col-md-3">
                                <label className="form-label fw-bold">From</label>
                                <input
                                    type="datetime-local"
                                    className="form-control"
                                    name="from"
                                    value={filters.from}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="col-md-3">
                                <label className="form-label fw-bold">To</label>
                                <input
                                    type="datetime-local"
                                    className="form-control"
                                    name="to"
                                    value={filters.to}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="col-md-2">
                                <label className="form-label fw-bold">Limit</label>
                                <input
                                    type="number"
                                    className="form-control"
                                    name="limit"
                                    value={filters.limit}
                                    onChange={handleChange}
                                    min={1}
                                    max={1000}
                                />
                            </div>
                            <div className="col-md-4 d-flex align-items-end gap-2">
                                <button type="submit" className="btn btn-primary-edulearn">
                                    <i className="bi bi-search me-1"></i>Search
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary"
                                    onClick={handleClear}
                                >
                                    <i className="bi bi-x-lg me-1"></i>Clear
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>

            <ErrorAlert error={error} onDismiss={() => setError(null)} />
            {loading && <Loading message="Loading audit logs..." />}

            {/* Empty State */}
            {!loading && !error && logs.length === 0 && (
                <div className="text-center py-5 text-muted">
                    <i className="bi bi-journal-x display-4 d-block mb-3"></i>
                    <p className="mb-0">No audit logs found for the given filters.</p>
                </div>
            )}

            {!loading && logs.length > 0 && (
                <>
                    {/* ── Activity Chart ── */}
                    <div className="card shadow-sm mb-4">
                        <div className="card-header bg-light d-flex align-items-center justify-content-between">
                            <strong>
                                <i className="bi bi-activity me-2"></i>Activity — Last 24 Hours
                            </strong>
                            <div className="d-flex gap-3">
                                <small className="text-muted">
                                    <i className="bi bi-people me-1"></i>{uniqueUsers} user{uniqueUsers !== 1 ? 's' : ''}
                                </small>
                                <small className="text-muted">
                                    <i className="bi bi-lightning me-1"></i>{uniqueActions} action type{uniqueActions !== 1 ? 's' : ''}
                                </small>
                                <small className="text-muted">
                                    <i className="bi bi-list-ul me-1"></i>{logs.length} total event{logs.length !== 1 ? 's' : ''}
                                </small>
                            </div>
                        </div>
                        <div className="card-body pb-2 pt-3 px-3">
                            <ActivityChart logs={logs} />
                            <div className="d-flex justify-content-between mt-1">
                                <small className="text-muted">← 24h ago</small>
                                <small className="text-muted">Now →</small>
                            </div>
                        </div>
                    </div>

                    {/* ── Table ── */}
                    <div className="card shadow-sm">
                        <div className="card-header bg-light d-flex align-items-center justify-content-between">
                            <strong>
                                <i className="bi bi-table me-2"></i>Audit Logs
                            </strong>
                            <small className="text-muted">
                                Showing {visibleLogs.length} of {logs.length} result(s)
                            </small>
                        </div>
                        <div className="table-responsive">
                            <table className="table table-hover align-middle mb-0 small">
                                <thead className="table-light">
                                    <tr>
                                        <th>ID</th>
                                        <th>User</th>
                                        <th>Action</th>
                                        <th>Resource Type</th>
                                        <th>Resource ID</th>
                                        <th>Timestamp</th>
                                        <th>Details</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {visibleLogs.map((log, idx) => (
                                        <tr key={log.auditLogID || idx}>
                                            <td><code>{log.auditLogID}</code></td>
                                            <td>
                                                {log.userName || log.userFullName
                                                    ? <span>{log.userName || log.userFullName}</span>
                                                    : <code>{log.userID}</code>
                                                }
                                            </td>
                                            <td>
                                                <span className="badge bg-primary">
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td>{log.resourceType || '—'}</td>
                                            <td>
                                                {log.resourceID
                                                    ? <code>{log.resourceID}</code>
                                                    : '—'}
                                            </td>
                                            <td>
                                                {log.timestamp || log.createdAt
                                                    ? new Date((log.timestamp || log.createdAt) + 'Z')
                                                        .toLocaleString('en-IN', {
                                                            day: 'numeric',
                                                            month: 'short',
                                                            year: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                            second: '2-digit',
                                                            hour12: true
                                                        })
                                                    : '—'}
                                            </td>
                                            <td>
                                                {log.detailsJSON ? (
                                                    <code className="text-muted small">
                                                        {log.detailsJSON.length > 50
                                                            ? log.detailsJSON.substring(0, 50) + '...'
                                                            : log.detailsJSON}
                                                    </code>
                                                ) : '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Expand / Collapse footer */}
                        {hasMore && (
                            <div
                                className="card-footer text-center py-2"
                                style={{ borderTop: '1px solid #f1f3f5', background: '#fafbfc' }}
                            >
                                <button
                                    className="btn btn-sm btn-outline-primary"
                                    onClick={() => setExpanded(prev => !prev)}
                                    style={{ minWidth: 180 }}
                                >
                                    {expanded ? (
                                        <><i className="bi bi-chevron-up me-2"></i>Show less</>
                                    ) : (
                                        <><i className="bi bi-chevron-down me-2"></i>Show all {logs.length} entries</>
                                    )}
                                </button>
                            </div>
                        )}

                        {/* Footer when fully expanded or no more rows */}
                        {(!hasMore || expanded) && (
                            <div className="card-footer text-muted small">
                                {expanded
                                    ? `Showing all ${logs.length} log(s)`
                                    : `Showing ${logs.length} log(s)`}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
