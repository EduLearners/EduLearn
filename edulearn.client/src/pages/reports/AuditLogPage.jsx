import { useState, useEffect } from 'react';
import { auditLogService } from '../../services/auditLogService';
import Loading from '../../components/Loading';
import ErrorAlert from '../../components/ErrorAlert';

export default function AuditLogPage() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    const handleFilter = (e) => {
        e.preventDefault();
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

            {/* Table */}
            {!loading && logs.length > 0 && (
                <div className="card shadow-sm">
                    <div className="card-header bg-light d-flex align-items-center justify-content-between">
                        <strong>
                            <i className="bi bi-table me-2"></i>Audit Logs
                        </strong>
                        <small className="text-muted">{logs.length} result(s)</small>
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
                                {logs.map((log, idx) => (
                                    <tr key={log.auditLogID || idx}>
                                        <td><code>#{log.auditLogID}</code></td>
                                        <td>
                                            {log.userName || log.userFullName
                                                ? <span>{log.userName || log.userFullName}</span>
                                                : <code>#{log.userID}</code>
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
                                                ? <code>#{log.resourceID}</code>
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
                    <div className="card-footer text-muted small">
                        Showing {logs.length} log(s)
                    </div>
                </div>
            )}
        </div>
    );
}