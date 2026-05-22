import { useState, useEffect } from 'react';
import { ticketService } from '../../services/ticketService';
import { authService } from '../../services/authService';
import Loading from '../../components/Loading';
import ErrorAlert from '../../components/ErrorAlert';
import ModalPortal from '../../components/ModalPortal';
import StatusBadge from '../../components/StatusBadge';

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

const PRIORITY_VARIANT = {
    Low: 'success',
    Medium: 'warning',
    High: 'danger',
    Critical: 'dark',
};

// Role-specific issue categories
const ROLE_CATEGORIES = {
    Student: [
        'Enrollment not reflecting',
        'Timetable not loading',
        'Submission failed',
        'Invoice incorrect',
        'Transcript unavailable',
    ],
    Instructor: [
        'Cannot create assessment',
        'Submission not visible',
        'Content upload failed',
        'Grade change not processing',
        'Section timetable conflict',
    ],
    Registrar: [
        'Applicant status not updating',
        'Enrollment record missing',
        'Transcript generation failed',
        'Section over/under-enrolled',
        'Student account mismatch',
    ],
    DeptAdmin: [
        'Room booking conflict',
        'Section under wrong program',
        'Instructor not assigned',
        'Timetable clash',
        'Syllabus not updated',
    ],
    Finance: [
        'Invoice not generated',
        'Payment not reflecting',
        'Scholarship not applied',
        'Fee schedule mismatch',
        'Incorrect fee amount',
    ],
    Auditor: [
        'Audit log entries missing',
        'KPI data not updating',
        'Report generation failed',
        'Grade change not in audit',
        'User activity not logged',
    ],
};

// Parse category from subject string: "[Category] Subject"
const parseCategory = (subject) => {
    const match = subject?.match(/^\[(.+?)\]\s*(.*)$/);
    return match ? { category: match[1], subject: match[2] } : { category: '', subject: subject || '' };
};

export default function TicketsPage() {
    const { role } = authService.getCurrentUser();

    const [tickets, setTickets] = useState([]);
    const [selected, setSelected] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState('');
    const [saving, setSaving] = useState(false);
    const [showCreate, setShowCreate] = useState(false);
    const [showAssign, setShowAssign] = useState(false);
    const [showResolve, setShowResolve] = useState(false);

    const [createForm, setCreateForm] = useState({
        subject: '',
        description: '',
        priority: 'Medium',
        category: '',
    });

    const categories = ROLE_CATEGORIES[role] || [];

    const [assignForm, setAssignForm] = useState({ assignedToUserId: '' });
    const [resolveForm, setResolveForm] = useState({
        resolutionURI: '',
        resolutionNote: '',
    });

    const isITAdmin = role === 'ITAdmin';

    useEffect(() => {
        loadTickets();
    }, []);

    const loadTickets = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await ticketService.getAll();
            setTickets(data || []);
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess('');
        setSaving(true);
        try {
            // Prepend category as [Category] prefix in subject so it's stored in DB
            const subjectWithCategory = createForm.category
                ? `[${createForm.category}] ${createForm.subject}`
                : createForm.subject;
            await ticketService.create({
                subject: subjectWithCategory,
                description: createForm.description,
                priority: createForm.priority,
            });
            setSuccess('Ticket created successfully.');
            setShowCreate(false);
            setCreateForm({ subject: '', description: '', priority: 'Medium', category: '' });
            loadTickets();
        } catch (err) {
            setError(err);
        } finally {
            setSaving(false);
        }
    };

    const handleAssign = async (e) => {
        e.preventDefault();
        setError(null);
        setSaving(true);
        try {
            const updated = await ticketService.assign(selected.ticketID, {
                assignedToUserId: Number(assignForm.assignedToUserId),
            });
            setSelected(updated);
            setTickets(prev => prev.map(t => t.ticketID === updated.ticketID ? updated : t));
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
        setError(null);
        setSaving(true);
        try {
            const updated = await ticketService.resolve(selected.ticketID, resolveForm);
            setSelected(updated);
            setTickets(prev => prev.map(t => t.ticketID === updated.ticketID ? updated : t));
            setSuccess('Ticket resolved successfully.');
            setShowResolve(false);
        } catch (err) {
            setError(err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div>
            {/* Page Header */}
            <div className="d-flex align-items-center justify-content-between mb-4">
                <h2 className="text-primary-edulearn mb-0">
                    <i className="bi bi-headset me-2"></i>Support Tickets
                </h2>
                <button
                    className="btn btn-primary-edulearn"
                    onClick={() => setShowCreate(true)}
                >
                    <i className="bi bi-plus-lg me-2"></i>New Ticket
                </button>
            </div>

            <ErrorAlert error={error} onDismiss={() => setError(null)} />

            {success && (
                <div className="alert alert-success">
                    <i className="bi bi-check-circle me-2"></i>{success}
                </div>
            )}

            {loading && <Loading message="Loading tickets..." />}

            {!loading && tickets.length === 0 && (
                <div className="text-center py-5 text-muted">
                    <i className="bi bi-headset display-4 d-block mb-3"></i>
                    <p className="mb-0">No tickets found.</p>
                </div>
            )}

            {!loading && tickets.length > 0 && (
                <div className="row g-4">
                    {/* Ticket List */}
                    <div className="col-md-4">
                        <div className="card shadow-sm">
                            <div className="card-header bg-light">
                                <strong>
                                    <i className="bi bi-list me-2"></i>
                                    Tickets ({tickets.length})
                                </strong>
                            </div>
                            <div className="list-group list-group-flush" style={{ maxHeight: 600, overflowY: 'auto' }}>
                                {tickets.map(t => (
                                    <button
                                        key={t.ticketID}
                                        className={`list-group-item list-group-item-action ${selected?.ticketID === t.ticketID ? 'active' : ''}`}
                                        onClick={() => setSelected(t)}
                                    >
                                        <div className="d-flex align-items-center justify-content-between mb-1">
                                        <span className="fw-bold small text-truncate me-2">
                                        {t.ticketID} {parseCategory(t.subject).subject || t.subject}
                                        </span>
                                        <span className={`badge bg-${PRIORITY_VARIANT[t.priority] || 'secondary'} flex-shrink-0`}>
                                        {t.priority}
                                        </span>
                                        </div>
                                            {parseCategory(t.subject).category && (
                                                <div className="mb-1">
                                                    <span className="badge rounded-pill" style={{ background: selected?.ticketID === t.ticketID ? 'rgba(255,255,255,0.2)' : '#e8f0fc', color: selected?.ticketID === t.ticketID ? '#fff' : '#1a3c6e', fontSize: '0.7rem' }}>
                                                        <i className="bi bi-tag me-1"></i>{parseCategory(t.subject).category}
                                                    </span>
                                                </div>
                                            )}
                                        <div className="d-flex align-items-center gap-2">
                                            <StatusBadge status={t.status} />
                                            <small className={selected?.ticketID === t.ticketID ? 'text-white-50' : 'text-muted'}>
                                                {t.createdAt
                                                    ? new Date(t.createdAt).toLocaleDateString()
                                                    : ''}
                                            </small>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Ticket Detail */}
                    <div className="col-md-8">
                        {!selected ? (
                            <div className="card shadow-sm h-100 d-flex align-items-center justify-content-center">
                                <div className="text-center text-muted py-5">
                                    <i className="bi bi-headset display-4 d-block mb-3"></i>
                                    Select a ticket to view details
                                </div>
                            </div>
                        ) : (
                            <div className="card shadow-sm">
                                <div className="card-header bg-primary-edulearn text-white d-flex align-items-center justify-content-between">
                                    <strong>
                                        <i className="bi bi-ticket me-2"></i>
                                        Ticket #{selected.ticketID}
                                    </strong>
                                    <div className="d-flex gap-2 align-items-center">
                                        <StatusBadge status={selected.status} />
                                        {isITAdmin && selected.status === 'Open' && (
                                            <button
                                                className="btn btn-light btn-sm"
                                                onClick={() => {
                                                    setAssignForm({ assignedToUserId: '' });
                                                    setShowAssign(true);
                                                }}
                                            >
                                                <i className="bi bi-person-check me-1"></i>Assign
                                            </button>
                                        )}
                                        {isITAdmin && (selected.status === 'Open' || selected.status === 'InProgress') && (
                                            <button
                                                className="btn btn-success btn-sm"
                                                onClick={() => {
                                                    setResolveForm({ resolutionURI: '', resolutionNote: '' });
                                                    setShowResolve(true);
                                                }}
                                            >
                                                <i className="bi bi-check-circle me-1"></i>Resolve
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="card-body">
                                    <h5 className="fw-bold mb-3">{parseCategory(selected.subject).subject || selected.subject}</h5>

                                    <div className="row g-3 mb-3">
                                        {/* Category badge — shown if subject contains [Category] prefix */}
                                        {parseCategory(selected.subject).category && (
                                            <div className="col-12">
                                                <dt className="text-muted small">Category</dt>
                                                <dd>
                                                    <span className="badge rounded-pill" style={{ background: '#e8f0fc', color: '#1a3c6e', fontWeight: 600, fontSize: '0.82rem', padding: '5px 12px' }}>
                                                        <i className="bi bi-tag me-1"></i>
                                                        {parseCategory(selected.subject).category}
                                                    </span>
                                                </dd>
                                            </div>
                                        )}
                                        <div className="col-md-4">
                                            <dt className="text-muted small">Priority</dt>
                                            <dd>
                                                <span className={`badge bg-${PRIORITY_VARIANT[selected.priority] || 'secondary'}`}>
                                                    {selected.priority}
                                                </span>
                                            </dd>
                                        </div>
                                        <div className="col-md-4">
                                            <dt className="text-muted small">Created By</dt>
                                            <dd>{selected.createdByUsername}</dd>
                                        </div>
                                        <div className="col-md-4">
                                            <dt className="text-muted small">Assigned To</dt>
                                            <dd>{selected.assignedToUsername || <span className="text-muted">Unassigned</span>}</dd>
                                        </div>
                                        <div className="col-md-4">
                                            <dt className="text-muted small">Created At</dt>
                                            <dd>
                                                {selected.createdAt
                                                    ? new Date(selected.createdAt).toLocaleString()
                                                    : '—'}
                                            </dd>
                                        </div>
                                        <div className="col-md-4">
                                            <dt className="text-muted small">Last Updated</dt>
                                            <dd>
                                                {selected.updatedAt
                                                    ? new Date(selected.updatedAt).toLocaleString()
                                                    : '—'}
                                            </dd>
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <dt className="text-muted small text-uppercase mb-1">Description</dt>
                                        <div className="p-3 bg-light rounded">
                                            <p className="mb-0">{selected.description}</p>
                                        </div>
                                    </div>

                                    {selected.resolutionURI && (
                                        <div>
                                            <dt className="text-muted small text-uppercase mb-1">
                                                Resolution
                                            </dt>
                                            <a href={selected.resolutionURI} target="_blank" rel="noreferrer" className="btn btn-outline-success btn-sm">
                                                <i className="bi bi-box-arrow-up-right me-2"></i>
                                                View Resolution
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Create Ticket Modal */}
            {showCreate && (
                <ModalPortal>
                    <div className="modal-backdrop fade show"></div>
                    <div className="modal fade show d-block" tabIndex="-1">
                        <div className="modal-dialog modal-dialog-centered modal-lg">
                            <div className="modal-content">
                                <div className="modal-header bg-primary-edulearn text-white">
                                    <h5 className="modal-title">
                                        <i className="bi bi-plus-circle me-2"></i>New Support Ticket
                                    </h5>
                                    <button
                                        type="button"
                                        className="btn-close btn-close-white"
                                        onClick={() => setShowCreate(false)}
                                        disabled={saving}
                                    />
                                </div>
                                <form onSubmit={handleCreate}>
                                    <div className="modal-body">
                                        <div className="row g-3">
                                        {/* Category dropdown — shown only for roles that have categories */}
                                        {categories.length > 0 && (
                                            <div className="col-12">
                                                <label className="form-label fw-bold">
                                                    Issue Category <span className="text-danger">*</span>
                                                </label>
                                                <select
                                                    className="form-select"
                                                    value={createForm.category}
                                                    onChange={e => setCreateForm({ ...createForm, category: e.target.value })}
                                                    required
                                                >
                                                    <option value="">-- Select a category --</option>
                                                    {categories.map(c => (
                                                        <option key={c} value={c}>{c}</option>
                                                    ))}
                                                    <option value="Other">Other</option>
                                                </select>
                                            </div>
                                        )}
                                            <div className="col-md-8">
                                                <label className="form-label fw-bold">
                                                    Subject <span className="text-danger">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={createForm.subject}
                                                    onChange={e => setCreateForm({ ...createForm, subject: e.target.value })}
                                                    placeholder="Brief description of the issue..."
                                                    maxLength={200}
                                                    required
                                                />
                                            </div>
                                            <div className="col-md-4">
                                                <label className="form-label fw-bold">
                                                    Priority <span className="text-danger">*</span>
                                                </label>
                                                <select
                                                    className="form-select"
                                                    value={createForm.priority}
                                                    onChange={e => setCreateForm({ ...createForm, priority: e.target.value })}
                                                    required
                                                >
                                                    {PRIORITIES.map(p => (
                                                        <option key={p} value={p}>{p}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="col-12">
                                                <label className="form-label fw-bold">
                                                    Description <span className="text-danger">*</span>
                                                </label>
                                                <textarea
                                                    className="form-control"
                                                    value={createForm.description}
                                                    onChange={e => setCreateForm({ ...createForm, description: e.target.value })}
                                                    rows={5}
                                                    placeholder="Describe the issue in detail..."
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <ErrorAlert error={error} onDismiss={() => setError(null)} />
                                    </div>
                                    <div className="modal-footer">
                                        <button
                                            type="button"
                                            className="btn btn-outline-secondary"
                                            onClick={() => setShowCreate(false)}
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
                                                    Creating...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="bi bi-check-lg me-2"></i>
                                                    Create Ticket
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

            {/* Assign Ticket Modal */}
            {showAssign && (
                <ModalPortal>
                    <div className="modal-backdrop fade show"></div>
                    <div className="modal fade show d-block" tabIndex="-1">
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content">
                                <div className="modal-header bg-primary-edulearn text-white">
                                    <h5 className="modal-title">
                                        <i className="bi bi-person-check me-2"></i>
                                        Assign Ticket #{selected?.ticketID}
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
                                        <div className="row g-3">
                                            <div className="col-12">
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
                                                />
                                                <div className="form-text">
                                                    Must be a user with ITAdmin role.
                                                </div>
                                            </div>
                                        </div>
                                        <ErrorAlert error={error} onDismiss={() => setError(null)} />
                                    </div>
                                    <div className="modal-footer">
                                        <button
                                            type="button"
                                            className="btn btn-outline-secondary"
                                            onClick={() => setShowAssign(false)}
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
                                                    Assigning...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="bi bi-check-lg me-2"></i>
                                                    Assign
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

            {/* Resolve Ticket Modal */}
            {showResolve && (
                <ModalPortal>
                    <div className="modal-backdrop fade show"></div>
                    <div className="modal fade show d-block" tabIndex="-1">
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content">
                                <div className="modal-header bg-success text-white">
                                    <h5 className="modal-title">
                                        <i className="bi bi-check-circle me-2"></i>
                                        Resolve Ticket #{selected?.ticketID}
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
                                                    Resolution URI
                                                    <small className="text-muted fw-normal ms-2">(optional link)</small>
                                                </label>
                                                <div className="input-group">
                                                    <span className="input-group-text">
                                                        <i className="bi bi-link-45deg"></i>
                                                    </span>
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
                                                    Resolution Note
                                                    <small className="text-muted fw-normal ms-2">(optional)</small>
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
                                        <button
                                            type="button"
                                            className="btn btn-outline-secondary"
                                            onClick={() => setShowResolve(false)}
                                            disabled={saving}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="btn btn-success"
                                            disabled={saving}
                                        >
                                            {saving ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-2"></span>
                                                    Resolving...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="bi bi-check-lg me-2"></i>
                                                    Mark Resolved
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