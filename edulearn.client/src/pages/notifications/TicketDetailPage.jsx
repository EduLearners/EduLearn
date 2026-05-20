// TicketDetailPage.jsx
// Route: /tickets/:id
// Owner: Swarna (NHT module)
// Standalone routable ticket detail page — separate from TicketsPage list.

import { useState, useEffect }    from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ticketService }   from '../../services/ticketService';
import { authService }     from '../../services/authService';
import Loading             from '../../components/Loading';
import ErrorAlert          from '../../components/ErrorAlert';
import StatusBadge         from '../../components/StatusBadge';

const PRIORITY_VARIANT = {
    Low:      'success',
    Medium:   'warning',
    High:     'danger',
    Critical: 'dark',
};

export default function TicketDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { role } = authService.getCurrentUser();

    const [ticket,   setTicket]   = useState(null);
    const [loading,  setLoading]  = useState(true);
    const [error,    setError]    = useState(null);
    const [saving,   setSaving]   = useState(false);
    const [success,  setSuccess]  = useState('');

    const [showAssign,  setShowAssign]  = useState(false);
    const [showResolve, setShowResolve] = useState(false);
    const [assignForm,  setAssignForm]  = useState({ assignedToUserId: '' });
    const [resolveForm, setResolveForm] = useState({ resolutionURI: '', resolutionNote: '' });

    const isITAdmin = role === 'ITAdmin';

    useEffect(() => { loadTicket(); }, [id]);

    const loadTicket = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await ticketService.getById(id);
            setTicket(data);
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAssign = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const updated = await ticketService.assign(id, {
                assignedToUserId: Number(assignForm.assignedToUserId),
            });
            setTicket(updated);
            setSuccess('Ticket assigned successfully.');
            setShowAssign(false);
        } catch (err) {
            setError(err);
        } finally {
            setSaving(false);
        }
    };

    const handleResolve = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const updated = await ticketService.resolve(id, resolveForm);
            setTicket(updated);
            setSuccess('Ticket resolved successfully.');
            setShowResolve(false);
        } catch (err) {
            setError(err);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <Loading message="Loading ticket..." />;

    return (
        <div>
            {/* Header */}
            <div className="d-flex align-items-center justify-content-between mb-4">
                <h2 className="text-primary-edulearn mb-0">
                    <i className="bi bi-ticket me-2"></i>Ticket {id}
                </h2>
                <button
                    className="btn btn-outline-secondary"
                    onClick={() => navigate('/tickets')}
                >
                    <i className="bi bi-arrow-left me-1"></i>All Tickets
                </button>
            </div>

            <ErrorAlert error={error} onDismiss={() => setError(null)} />
            {success && (
                <div className="alert alert-success d-flex align-items-center">
                    <i className="bi bi-check-circle me-2"></i>{success}
                    <button className="btn-close ms-auto" onClick={() => setSuccess('')}></button>
                </div>
            )}

            {ticket && (
                <div className="row g-4">
                    {/* Ticket main card */}
                    <div className="col-lg-8">
                        <div className="card shadow-sm">
                            <div className="card-header bg-primary-edulearn text-white d-flex align-items-center justify-content-between">
                                <strong>
                                    <i className="bi bi-headset me-2"></i>
                                    {ticket.subject}
                                </strong>
                                <StatusBadge status={ticket.status} />
                            </div>
                            <div className="card-body">
                                <div className="row g-3 mb-4">
                                    <div className="col-md-4">
                                        <dt className="text-muted small">Priority</dt>
                                        <dd className="mb-0">
                                            <span className={`badge bg-${PRIORITY_VARIANT[ticket.priority] || 'secondary'}`}>
                                                {ticket.priority}
                                            </span>
                                        </dd>
                                    </div>
                                    <div className="col-md-4">
                                        <dt className="text-muted small">Created By</dt>
                                        <dd className="mb-0">{ticket.createdByUsername}</dd>
                                    </div>
                                    <div className="col-md-4">
                                        <dt className="text-muted small">Assigned To</dt>
                                        <dd className="mb-0">
                                            {ticket.assignedToUsername
                                                ? <strong>{ticket.assignedToUsername}</strong>
                                                : <span className="text-muted">Unassigned</span>}
                                        </dd>
                                    </div>
                                    <div className="col-md-4">
                                        <dt className="text-muted small">Created At</dt>
                                        <dd className="mb-0 small">
                                            {ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : '—'}
                                        </dd>
                                    </div>
                                    <div className="col-md-4">
                                        <dt className="text-muted small">Last Updated</dt>
                                        <dd className="mb-0 small">
                                            {ticket.updatedAt ? new Date(ticket.updatedAt).toLocaleString() : '—'}
                                        </dd>
                                    </div>
                                </div>

                                <h6 className="text-muted text-uppercase small mb-2">Description</h6>
                                <div className="p-3 bg-light rounded mb-4">
                                    <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>
                                        {ticket.description}
                                    </p>
                                </div>

                                {ticket.resolutionURI && (
                                    <div className="mb-3">
                                        <h6 className="text-muted text-uppercase small mb-2">Resolution</h6>
                                        <a
                                            href={ticket.resolutionURI}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="btn btn-outline-success btn-sm"
                                        >
                                            <i className="bi bi-box-arrow-up-right me-2"></i>
                                            View Resolution
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Actions sidebar */}
                    <div className="col-lg-4">
                        <div className="card shadow-sm">
                            <div className="card-header bg-light">
                                <strong><i className="bi bi-sliders me-2"></i>Actions</strong>
                            </div>
                            <div className="card-body d-grid gap-2">
                                {isITAdmin && ticket.status === 'Open' && (
                                    <button
                                        className="btn btn-primary-edulearn"
                                        onClick={() => { setAssignForm({ assignedToUserId: '' }); setShowAssign(true); }}
                                    >
                                        <i className="bi bi-person-check me-2"></i>Assign Ticket
                                    </button>
                                )}
                                {isITAdmin && ['Open', 'InProgress'].includes(ticket.status) && (
                                    <button
                                        className="btn btn-success"
                                        onClick={() => { setResolveForm({ resolutionURI: '', resolutionNote: '' }); setShowResolve(true); }}
                                    >
                                        <i className="bi bi-check-circle me-2"></i>Mark Resolved
                                    </button>
                                )}
                                {ticket.status === 'Resolved' && (
                                    <div className="alert alert-success py-2 mb-0 small text-center">
                                        <i className="bi bi-check2-circle me-2"></i>
                                        This ticket is resolved.
                                    </div>
                                )}
                                <button
                                    className="btn btn-outline-secondary btn-sm"
                                    onClick={() => navigate('/tickets')}
                                >
                                    <i className="bi bi-list me-2"></i>All Tickets
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Assign Modal */}
            {showAssign && (
                <>
                    <div className="modal-backdrop fade show"></div>
                    <div className="modal fade show d-block" tabIndex="-1">
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content">
                                <div className="modal-header bg-primary-edulearn text-white">
                                    <h5 className="modal-title">
                                        <i className="bi bi-person-check me-2"></i>Assign Ticket {id}
                                    </h5>
                                    <button
                                        type="button"
                                        className="btn-close btn-close-white"
                                        onClick={() => setShowAssign(false)}
                                        disabled={saving}
                                    />
                                </div>
                                <form onSubmit={handleAssign}>
                                    <div className="modal-body">
                                        <label className="form-label fw-bold">
                                            Assign To (ITAdmin User ID) <span className="text-danger">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            className="form-control"
                                            value={assignForm.assignedToUserId}
                                            onChange={e => setAssignForm({ assignedToUserId: e.target.value })}
                                            placeholder="Enter ITAdmin UserID..."
                                            required
                                            min={1}
                                            autoFocus
                                        />
                                        <div className="form-text">Must be a user with ITAdmin role.</div>
                                        <ErrorAlert error={error} onDismiss={() => setError(null)} />
                                    </div>
                                    <div className="modal-footer">
                                        <button type="button" className="btn btn-outline-secondary" onClick={() => setShowAssign(false)} disabled={saving}>Cancel</button>
                                        <button type="submit" className="btn btn-primary-edulearn" disabled={saving}>
                                            {saving ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="bi bi-check-lg me-2"></i>}
                                            Assign
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Resolve Modal */}
            {showResolve && (
                <>
                    <div className="modal-backdrop fade show"></div>
                    <div className="modal fade show d-block" tabIndex="-1">
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content">
                                <div className="modal-header bg-success text-white">
                                    <h5 className="modal-title">
                                        <i className="bi bi-check-circle me-2"></i>Resolve Ticket {id}
                                    </h5>
                                    <button
                                        type="button"
                                        className="btn-close btn-close-white"
                                        onClick={() => setShowResolve(false)}
                                        disabled={saving}
                                    />
                                </div>
                                <form onSubmit={handleResolve}>
                                    <div className="modal-body">
                                        <div className="row g-3">
                                            <div className="col-12">
                                                <label className="form-label fw-bold">
                                                    Resolution URI <small className="text-muted fw-normal">(optional)</small>
                                                </label>
                                                <div className="input-group">
                                                    <span className="input-group-text"><i className="bi bi-link-45deg"></i></span>
                                                    <input
                                                        type="text"
                                                        className="form-control"
                                                        value={resolveForm.resolutionURI}
                                                        onChange={e => setResolveForm({ ...resolveForm, resolutionURI: e.target.value })}
                                                        placeholder="https://..."
                                                    />
                                                </div>
                                            </div>
                                            <div className="col-12">
                                                <label className="form-label fw-bold">
                                                    Resolution Note <small className="text-muted fw-normal">(optional)</small>
                                                </label>
                                                <textarea
                                                    className="form-control"
                                                    value={resolveForm.resolutionNote}
                                                    onChange={e => setResolveForm({ ...resolveForm, resolutionNote: e.target.value })}
                                                    rows={3}
                                                    placeholder="Describe how the issue was resolved..."
                                                />
                                            </div>
                                        </div>
                                        <ErrorAlert error={error} onDismiss={() => setError(null)} />
                                    </div>
                                    <div className="modal-footer">
                                        <button type="button" className="btn btn-outline-secondary" onClick={() => setShowResolve(false)} disabled={saving}>Cancel</button>
                                        <button type="submit" className="btn btn-success" disabled={saving}>
                                            {saving ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="bi bi-check-lg me-2"></i>}
                                            Mark Resolved
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
