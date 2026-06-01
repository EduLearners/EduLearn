import { useState, useEffect } from 'react';
import { notificationService } from '../../services/notificationService';
import { authService } from '../../services/authService';
import { validatePositiveId, validateNotWhitespace } from '../../utils/validators';
import Loading from '../../components/Loading';
import ErrorAlert from '../../components/ErrorAlert';
import StatusBadge from '../../components/StatusBadge';
import ModalPortal from '../../components/ModalPortal';

const CATEGORIES = ['Enrollment', 'Assessment', 'Finance', 'IT', 'System'];
const SEVERITIES = ['Info', 'Warning', 'Critical'];

export default function NotificationsPage() {
    const { role } = authService.getCurrentUser();

    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState('');
    const [unreadOnly, setUnreadOnly] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [markingAll, setMarkingAll] = useState(false);
    const [showTestForm, setShowTestForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});

    const [testForm, setTestForm] = useState({
        userID: '',
        category: 'System',
        severity: 'Info',
        message: '',
        entityID: '',
    });

    const isITAdmin = role === 'ITAdmin';

    useEffect(() => {
        loadNotifications();
        loadUnreadCount();
    }, [page, unreadOnly]);

    const loadNotifications = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await notificationService.getAll({
                page,
                pageSize: 20,
                unreadOnly,
            });
            setNotifications(data.items || data || []);
            if (data.totalPages) setTotalPages(data.totalPages);
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    const loadUnreadCount = async () => {
        try {
            const data = await notificationService.getUnreadCount();
            setUnreadCount(data.unreadCount || 0);
        } catch {
            // silent
        }
    };

    const handleMarkRead = async (id) => {
        try {
            await notificationService.markRead(id);
            setNotifications(prev =>
                prev.map(n => n.notificationID === id
                    ? { ...n, readAt: new Date().toISOString() }
                    : n
                )
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            setError(err);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            setMarkingAll(true);
            await notificationService.markAllRead();
            setNotifications(prev =>
                prev.map(n => ({ ...n, readAt: new Date().toISOString() }))
            );
            setUnreadCount(0);
            setSuccess('All notifications marked as read.');
        } catch (err) {
            setError(err);
        } finally {
            setMarkingAll(false);
        }
    };

    const handleTestNotification = async (e) => {
        e.preventDefault();
        const next = {
            userId: validatePositiveId(testForm.userID),
            message: validateNotWhitespace(testForm.message, 'Message'),
        };
        if (Object.values(next).some(Boolean)) { setErrors(next); return; }
        setError(null);
        setSaving(true);
        try {
            await notificationService.createTest({
                userID: Number(testForm.userID),
                category: testForm.category,
                severity: testForm.severity,
                message: testForm.message,
                entityID: testForm.entityID ? Number(testForm.entityID) : null,
            });
            setSuccess('Test notification created successfully.');
            setShowTestForm(false);
            loadNotifications();
            loadUnreadCount();
        } catch (err) {
            setError(err);
        } finally {
            setSaving(false);
        }
    };

    const getSeverityVariant = (severity) => {
        const map = { Info: 'primary', Warning: 'warning', Critical: 'danger' };
        return map[severity] || 'secondary';
    };

    const getCategoryIcon = (category) => {
        const map = {
            Enrollment: 'card-checklist',
            Assessment: 'file-earmark-check',
            Finance: 'cash-stack',
            IT: 'gear',
            System: 'bell',
        };
        return map[category] || 'bell';
    };

    return (
        <div>
            {/* Page Header */}
            <div className="d-flex align-items-center justify-content-between mb-4">
                <h2 className="text-primary-edulearn mb-0">
                    <i className="bi bi-bell me-2"></i>
                    Notifications
                    {unreadCount > 0 && (
                        <span className="badge bg-danger ms-2">{unreadCount}</span>
                    )}
                </h2>
                <div className="d-flex gap-2">
                    {isITAdmin && (
                        <button
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() => setShowTestForm(true)}
                        >
                            <i className="bi bi-send me-1"></i>Test Notification
                        </button>
                    )}
                    {unreadCount > 0 && (
                        <button
                            className="btn btn-outline-primary btn-sm"
                            onClick={handleMarkAllRead}
                            disabled={markingAll}
                        >
                            {markingAll
                                ? <span className="spinner-border spinner-border-sm"></span>
                                : <><i className="bi bi-check-all me-1"></i>Mark All Read</>
                            }
                        </button>
                    )}
                </div>
            </div>

            {/* Filter Bar */}
            <div className="card shadow-sm mb-4">
                <div className="card-body py-2">
                    <div className="d-flex align-items-center gap-3">
                        <div className="form-check form-switch mb-0">
                            <input
                                className="form-check-input"
                                type="checkbox"
                                id="unreadOnly"
                                checked={unreadOnly}
                                onChange={e => {
                                    setUnreadOnly(e.target.checked);
                                    setPage(1);
                                }}
                            />
                            <label className="form-check-label" htmlFor="unreadOnly">
                                Unread only
                            </label>
                        </div>
                        <small className="text-muted">
                            {unreadCount} unread notification(s)
                        </small>
                    </div>
                </div>
            </div>

            <ErrorAlert error={error} onDismiss={() => setError(null)} />

            {success && (
                <div className="alert alert-success">
                    <i className="bi bi-check-circle me-2"></i>{success}
                </div>
            )}

            {loading && <Loading message="Loading notifications..." />}

            {/* Empty State */}
            {!loading && notifications.length === 0 && (
                <div className="text-center py-5 text-muted">
                    <i className="bi bi-bell-slash display-4 d-block mb-3"></i>
                    <p className="mb-0">
                        {unreadOnly ? 'No unread notifications.' : 'No notifications yet.'}
                    </p>
                </div>
            )}

            {/* Notifications List */}
            {!loading && notifications.length > 0 && (
                <div className="card shadow-sm">
                    <div className="card-header bg-light d-flex align-items-center justify-content-between">
                        <strong>
                            <i className="bi bi-bell me-2"></i>
                            Notifications
                        </strong>
                        <small className="text-muted">
                            {notifications.length} shown
                        </small>
                    </div>
                    <div className="list-group list-group-flush">
                        {notifications.map(n => (
                            <div
                                key={n.notificationID}
                                className={`list-group-item list-group-item-action ${!n.readAt ? 'border-start border-primary border-3 bg-light' : ''}`}
                            >
                                <div className="d-flex align-items-start justify-content-between gap-3">
                                    <div className="d-flex align-items-start gap-3">
                                        <div className={`mt-1 text-${getSeverityVariant(n.severity)}`}>
                                            <i className={`bi bi-${getCategoryIcon(n.category)} fs-5`}></i>
                                        </div>
                                        <div>
                                            <div className="d-flex align-items-center gap-2 mb-1">
                                                <span className={`badge bg-${getSeverityVariant(n.severity)}`}>
                                                    {n.severity}
                                                </span>
                                                <span className="badge bg-light text-dark">
                                                    {n.category}
                                                </span>
                                                {!n.readAt && (
                                                    <span className="badge bg-primary">New</span>
                                                )}
                                            </div>
                                            <p className="mb-1">{n.message}</p>
                                            <small className="text-muted">
                                                {n.createdAt
                                                    ? new Date(n.createdAt).toLocaleString()
                                                    : '—'}
                                                {n.readAt && (
                                                    <span className="ms-2 text-success">
                                                        <i className="bi bi-check2 me-1"></i>
                                                        Read {new Date(n.readAt).toLocaleString()}
                                                    </span>
                                                )}
                                            </small>
                                        </div>
                                    </div>
                                    {!n.readAt && (
                                        <button
                                            className="btn btn-sm btn-outline-primary flex-shrink-0"
                                            onClick={() => handleMarkRead(n.notificationID)}
                                            title="Mark as read"
                                        >
                                            <i className="bi bi-check2"></i>
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="card-footer d-flex align-items-center justify-content-between">
                            <button
                                className="btn btn-sm btn-outline-secondary"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                            >
                                <i className="bi bi-chevron-left me-1"></i>Previous
                            </button>
                            <small className="text-muted">
                                Page {page} of {totalPages}
                            </small>
                            <button
                                className="btn btn-sm btn-outline-secondary"
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                            >
                                Next<i className="bi bi-chevron-right ms-1"></i>
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Test Notification Modal — rendered through a portal so it is
                positioned relative to the viewport, not the page-root div
                (which carries an animation transform that would otherwise
                become the containing block and clip the modal). */}
            {showTestForm && (
                <ModalPortal>
                    <div className="modal-backdrop fade show"></div>
                    <div className="modal fade show d-block" tabIndex="-1">
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content">
                                <div className="modal-header bg-primary-edulearn text-white">
                                    <h5 className="modal-title">
                                        <i className="bi bi-send me-2"></i>
                                        Send Test Notification
                                    </h5>
                                    <button
                                        type="button"
                                        className="btn-close btn-close-white"
                                        onClick={() => setShowTestForm(false)}
                                        disabled={saving}
                                    />
                                </div>
                                <form onSubmit={handleTestNotification}>
                                    <div className="modal-body">
                                        <div className="row g-3">
                                            <div className="col-12">
                                                <label className="form-label fw-bold">
                                                    User ID <span className="text-danger">*</span>
                                                </label>
                                                <input
                                                    type="number"
                                                    className={`form-control${errors.userId ? ' is-invalid' : ''}`}
                                                    value={testForm.userID}
                                                    onChange={e => setTestForm({ ...testForm, userID: e.target.value })}
                                                    onBlur={e => setErrors(prev => ({ ...prev, userId: validatePositiveId(e.target.value) }))}
                                                    required
                                                />
                                                {errors.userId && <div className="invalid-feedback">{errors.userId}</div>}
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label fw-bold">Category</label>
                                                <select
                                                    className="form-select"
                                                    value={testForm.category}
                                                    onChange={e => setTestForm({ ...testForm, category: e.target.value })}
                                                >
                                                    {CATEGORIES.map(c => (
                                                        <option key={c} value={c}>{c}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label fw-bold">Severity</label>
                                                <select
                                                    className="form-select"
                                                    value={testForm.severity}
                                                    onChange={e => setTestForm({ ...testForm, severity: e.target.value })}
                                                >
                                                    {SEVERITIES.map(s => (
                                                        <option key={s} value={s}>{s}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="col-12">
                                                <label className="form-label fw-bold">
                                                    Message <span className="text-danger">*</span>
                                                </label>
                                                <textarea
                                                    className={`form-control${errors.message ? ' is-invalid' : ''}`}
                                                    value={testForm.message}
                                                    onChange={e => setTestForm({ ...testForm, message: e.target.value })}
                                                    onBlur={e => setErrors(prev => ({ ...prev, message: validateNotWhitespace(e.target.value, 'Message') }))}
                                                    rows={3}
                                                    maxLength={500}
                                                    required
                                                />
                                                {errors.message && <div className="invalid-feedback">{errors.message}</div>}
                                            </div>
                                            <div className="col-12">
                                                <label className="form-label fw-bold">
                                                    Entity ID
                                                    <small className="text-muted fw-normal ms-2">(optional)</small>
                                                </label>
                                                <input
                                                    type="number"
                                                    className="form-control"
                                                    value={testForm.entityID}
                                                    onChange={e => setTestForm({ ...testForm, entityID: e.target.value })}
                                                    placeholder="e.g. invoice or ticket ID"
                                                />
                                            </div>
                                        </div>
                                        <ErrorAlert error={error} onDismiss={() => setError(null)} />
                                    </div>
                                    <div className="modal-footer">
                                        <button
                                            type="button"
                                            className="btn btn-outline-secondary"
                                            onClick={() => setShowTestForm(false)}
                                            disabled={saving}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="btn btn-primary-edulearn"
                                            disabled={saving}
                                        >
                                            {saving ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-2"></span>
                                                    Sending...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="bi bi-send me-2"></i>
                                                    Send
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}
        </div>
    );
}