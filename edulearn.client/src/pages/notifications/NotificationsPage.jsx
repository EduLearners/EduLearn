// NotificationsPage.jsx
// Route: /notifications  — all roles
// Migrated to React Query pattern:
//   useQuery  for fetching notifications + unread count
//   useMutation for markRead, markAllRead, createTest
// This is the reference pattern for the team.

import { useState }        from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelector }     from 'react-redux';
import { selectRole }      from '../../store/authSlice';
import { notificationService } from '../../services/notificationService';
import Loading             from '../../components/Loading';
import ErrorAlert          from '../../components/ErrorAlert';
import EmptyState          from '../../components/shared/EmptyState';
import { useToast }        from '../../components/shared/ToastQueue';

const CATEGORIES = ['Enrollment', 'Assessment', 'Finance', 'IT', 'System'];
const SEVERITIES = ['Info', 'Warning', 'Critical'];

const SEVERITY_VARIANT  = { Info: 'primary', Warning: 'warning', Critical: 'danger' };
const CATEGORY_ICON     = { Enrollment: 'card-checklist', Assessment: 'file-earmark-check', Finance: 'cash-stack', IT: 'gear', System: 'bell' };

const emptyTestForm = { userID: '', category: 'System', severity: 'Info', message: '', entityID: '' };

export default function NotificationsPage() {
    const role      = useSelector(selectRole);
    const toast     = useToast();
    const qc        = useQueryClient();
    const isITAdmin = role === 'ITAdmin';

    const [unreadOnly,   setUnreadOnly]   = useState(false);
    const [page,         setPage]         = useState(1);
    const [showTestForm, setShowTestForm] = useState(false);
    const [testForm,     setTestForm]     = useState(emptyTestForm);

    // ── Queries ──────────────────────────────────────────────────────────────
    const { data: notifData, isLoading, error } = useQuery({
        queryKey: ['notifications', page, unreadOnly],
        queryFn:  () => notificationService.getAll({ page, pageSize: 20, unreadOnly }),
    });

    const { data: countData } = useQuery({
        queryKey: ['notifications-unread-count'],
        queryFn:  notificationService.getUnreadCount,
        refetchInterval: 60_000,   // re-poll every 60s
    });

    const notifications = notifData?.items ?? (Array.isArray(notifData) ? notifData : []);
    const totalPages    = notifData?.totalPages ?? 1;
    const unreadCount   = countData?.unreadCount ?? 0;

    // ── Mutations ─────────────────────────────────────────────────────────────
    const markReadMutation = useMutation({
        mutationFn: (id) => notificationService.markRead(id),
        onSuccess: (_, id) => {
            qc.setQueryData(['notifications', page, unreadOnly], old => {
                if (!old) return old;
                const items = (old.items ?? old).map(n =>
                    n.notificationID === id
                        ? { ...n, readAt: new Date().toISOString() }
                        : n
                );
                return old.items ? { ...old, items } : items;
            });
            qc.invalidateQueries({ queryKey: ['notifications-unread-count'] });
        },
        onError: () => toast.error('Failed to mark notification as read.'),
    });

    const markAllMutation = useMutation({
        mutationFn: notificationService.markAllRead,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['notifications'] });
            qc.invalidateQueries({ queryKey: ['notifications-unread-count'] });
            toast.success('All notifications marked as read.');
        },
        onError: () => toast.error('Failed to mark all notifications as read.'),
    });

    const createTestMutation = useMutation({
        mutationFn: (payload) => notificationService.createTest(payload),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['notifications'] });
            qc.invalidateQueries({ queryKey: ['notifications-unread-count'] });
            toast.success('Test notification sent.');
            setShowTestForm(false);
            setTestForm(emptyTestForm);
        },
        onError: () => toast.error('Failed to send test notification.'),
    });

    const handleTestSubmit = (e) => {
        e.preventDefault();
        createTestMutation.mutate({
            userID:   Number(testForm.userID),
            category: testForm.category,
            severity: testForm.severity,
            message:  testForm.message,
            entityID: testForm.entityID ? Number(testForm.entityID) : null,
        });
    };

    return (
        <div>
            {/* Header */}
            <div className="d-flex align-items-center justify-content-between mb-4">
                <h2 className="text-primary-edulearn mb-0">
                    <i className="bi bi-bell me-2"></i>Notifications
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
                            <i className="bi bi-send me-1"></i>Test
                        </button>
                    )}
                    {unreadCount > 0 && (
                        <button
                            className="btn btn-outline-primary btn-sm"
                            onClick={() => markAllMutation.mutate()}
                            disabled={markAllMutation.isPending}
                        >
                            {markAllMutation.isPending
                                ? <span className="spinner-border spinner-border-sm"></span>
                                : <><i className="bi bi-check-all me-1"></i>Mark All Read</>
                            }
                        </button>
                    )}
                </div>
            </div>

            {/* Filter bar */}
            <div className="card shadow-sm mb-4">
                <div className="card-body py-2">
                    <div className="d-flex align-items-center gap-3">
                        <div className="form-check form-switch mb-0">
                            <input
                                className="form-check-input"
                                type="checkbox"
                                id="unreadOnly"
                                checked={unreadOnly}
                                onChange={e => { setUnreadOnly(e.target.checked); setPage(1); }}
                            />
                            <label className="form-check-label" htmlFor="unreadOnly">Unread only</label>
                        </div>
                        <small className="text-muted">{unreadCount} unread</small>
                    </div>
                </div>
            </div>

            {isLoading && <Loading message="Loading notifications..." />}
            {error && <ErrorAlert error={error} />}

            {!isLoading && notifications.length === 0 && (
                <EmptyState
                    icon="bi-bell-slash"
                    title={unreadOnly ? 'No unread notifications' : 'No notifications yet'}
                    description="You are all caught up."
                />
            )}

            {!isLoading && notifications.length > 0 && (
                <div className="card shadow-sm">
                    <div className="card-header bg-light d-flex justify-content-between align-items-center">
                        <strong><i className="bi bi-bell me-2"></i>Notifications</strong>
                        <small className="text-muted">{notifications.length} shown</small>
                    </div>
                    <div className="list-group list-group-flush">
                        {notifications.map(n => (
                            <div
                                key={n.notificationID}
                                className={`list-group-item ${!n.readAt ? 'border-start border-primary border-3 bg-light' : ''}`}
                            >
                                <div className="d-flex align-items-start justify-content-between gap-3">
                                    <div className="d-flex align-items-start gap-3">
                                        <i className={`bi bi-${CATEGORY_ICON[n.category] || 'bell'} fs-5 mt-1 text-${SEVERITY_VARIANT[n.severity] || 'secondary'}`}></i>
                                        <div>
                                            <div className="d-flex align-items-center gap-2 mb-1">
                                                <span className={`badge bg-${SEVERITY_VARIANT[n.severity] || 'secondary'}`}>{n.severity}</span>
                                                <span className="badge bg-light text-dark border">{n.category}</span>
                                                {!n.readAt && <span className="badge bg-primary">New</span>}
                                            </div>
                                            <p className="mb-1">{n.message}</p>
                                            <small className="text-muted">
                                                {n.createdAt ? new Date(n.createdAt).toLocaleString() : '—'}
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
                                            onClick={() => markReadMutation.mutate(n.notificationID)}
                                            disabled={markReadMutation.isPending}
                                            title="Mark as read"
                                        >
                                            <i className="bi bi-check2"></i>
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    {totalPages > 1 && (
                        <div className="card-footer d-flex align-items-center justify-content-between">
                            <button className="btn btn-sm btn-outline-secondary" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                                <i className="bi bi-chevron-left me-1"></i>Previous
                            </button>
                            <small className="text-muted">Page {page} of {totalPages}</small>
                            <button className="btn btn-sm btn-outline-secondary" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                                Next<i className="bi bi-chevron-right ms-1"></i>
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Test Notification Modal */}
            {showTestForm && (
                <>
                    <div className="modal-backdrop fade show"></div>
                    <div className="modal fade show d-block" tabIndex="-1">
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content">
                                <div className="modal-header bg-primary-edulearn text-white">
                                    <h5 className="modal-title"><i className="bi bi-send me-2"></i>Send Test Notification</h5>
                                    <button type="button" className="btn-close btn-close-white" onClick={() => setShowTestForm(false)} disabled={createTestMutation.isPending} />
                                </div>
                                <form onSubmit={handleTestSubmit}>
                                    <div className="modal-body">
                                        <div className="row g-3">
                                            <div className="col-12">
                                                <label className="form-label fw-bold">User ID <span className="text-danger">*</span></label>
                                                <input type="number" className="form-control" value={testForm.userID} onChange={e => setTestForm({ ...testForm, userID: e.target.value })} required />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label fw-bold">Category</label>
                                                <select className="form-select" value={testForm.category} onChange={e => setTestForm({ ...testForm, category: e.target.value })}>
                                                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                                                </select>
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label fw-bold">Severity</label>
                                                <select className="form-select" value={testForm.severity} onChange={e => setTestForm({ ...testForm, severity: e.target.value })}>
                                                    {SEVERITIES.map(s => <option key={s}>{s}</option>)}
                                                </select>
                                            </div>
                                            <div className="col-12">
                                                <label className="form-label fw-bold">Message <span className="text-danger">*</span></label>
                                                <textarea className="form-control" value={testForm.message} onChange={e => setTestForm({ ...testForm, message: e.target.value })} rows={3} required />
                                            </div>
                                            <div className="col-12">
                                                <label className="form-label fw-bold">Entity ID <small className="text-muted fw-normal">(optional)</small></label>
                                                <input type="number" className="form-control" value={testForm.entityID} onChange={e => setTestForm({ ...testForm, entityID: e.target.value })} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="modal-footer">
                                        <button type="button" className="btn btn-outline-secondary" onClick={() => setShowTestForm(false)} disabled={createTestMutation.isPending}>Cancel</button>
                                        <button type="submit" className="btn btn-primary-edulearn" disabled={createTestMutation.isPending}>
                                            {createTestMutation.isPending
                                                ? <><span className="spinner-border spinner-border-sm me-2"></span>Sending...</>
                                                : <><i className="bi bi-send me-2"></i>Send</>
                                            }
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
