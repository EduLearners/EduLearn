import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { userService } from '../../services/userService';
import { auditLogService } from '../../services/auditLogService';
import Loading from '../../components/Loading';
import ErrorAlert from '../../components/ErrorAlert';
import StatusBadge from '../../components/StatusBadge';
import ConfirmDialog from '../../components/ConfirmDialog';
import { authService } from '../../services/authService';

const ROLE_BADGE_STYLE = {
    Student:    { bg: '#E6F1FB', color: '#0C447C' },
    Instructor: { bg: '#EAF3DE', color: '#27500A' },
    Registrar:  { bg: '#EEEDFE', color: '#3C3489' },
    DeptAdmin:  { bg: '#FAEEDA', color: '#633806' },
    Finance:    { bg: '#EAF3DE', color: '#27500A' },
    ITAdmin:    { bg: '#FCEBEB', color: '#791F1F' },
    Auditor:    { bg: '#E1F5EE', color: '#085041' },
};

export default function UserDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [user, setUser] = useState(null);
    const [auditLogs, setAuditLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState('');

    // Edit form
    const [editMode, setEditMode] = useState(false);
    const [editForm, setEditForm] = useState({ fullName: '', email: '', phone: '' });
    const [editing, setEditing] = useState(false);
    const [editError, setEditError] = useState(null);

    // Status change
    const [showStatus, setShowStatus] = useState(false);
    const [newStatus, setNewStatus] = useState('');
    const [statusSaving, setStatusSaving] = useState(false);

    // MFA reset
    const [showMfaConfirm, setShowMfaConfirm] = useState(false);
    const [mfaResetting, setMfaResetting] = useState(false);

    const { role: currentRole } = authService.getCurrentUser();
    const isITAdmin = currentRole === 'ITAdmin';

    useEffect(() => {
        loadUser();
        loadAuditLogs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const loadUser = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await userService.getById(id);
            setUser(data);
            setEditForm({
                fullName: data.fullName || '',
                email: data.email || '',
                phone: data.phone || '',
            });
            setNewStatus(data.status);
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    const loadAuditLogs = async () => {
        try {
            const data = await auditLogService.getAll({ userId: id, limit: 5 });
            setAuditLogs(data || []);
        } catch {
            // non-blocking — silently skip if audit log fetch fails
        }
    };

    const handleEdit = async (e) => {
        e.preventDefault();
        setEditError(null);
        if (editForm.phone.length > 0) {
            if (!/^\d{10}$/.test(editForm.phone)) {
                setEditError({ message: 'Phone number must be exactly 10 digits.' });
                return;
            }
        }
        setEditing(true);
        try {
            await userService.update(id, editForm);
            setSuccess('User profile updated successfully.');
            setEditMode(false);
            loadUser();
        } catch (err) {
            setEditError(err);
        } finally {
            setEditing(false);
        }
    };

    const handleStatusUpdate = async () => {
        setStatusSaving(true);
        try {
            await userService.updateStatus(id, newStatus);
            setSuccess(`Status updated to ${newStatus}.`);
            setShowStatus(false);
            loadUser();
        } catch (err) {
            setError(err);
            setShowStatus(false);
        } finally {
            setStatusSaving(false);
        }
    };

    const handleMfaReset = async () => {
        setMfaResetting(true);
        try {
            await userService.resetMfa(id);
            setSuccess('MFA reset. User will re-enroll on next privileged login.');
            setShowMfaConfirm(false);
            loadUser();
        } catch (err) {
            setError(err);
            setShowMfaConfirm(false);
        } finally {
            setMfaResetting(false);
        }
    };

    const formatTimestamp = (ts) => {
        if (!ts) return '—';
        return new Date(ts + 'Z').toLocaleString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: true,
        });
    };

    if (loading) return <Loading message="Loading user profile..." />;

    if (error && !user) {
        return (
            <div>
                <button className="btn btn-link mb-3 p-0" onClick={() => navigate('/users')}>
                    <i className="bi bi-arrow-left me-1"></i>Back to Users
                </button>
                <ErrorAlert error={error} />
            </div>
        );
    }

    const roleStyle = ROLE_BADGE_STYLE[user.role] || { bg: '#F1EFE8', color: '#444441' };

    return (
        <div>
            {/* Back */}
            <div className="d-flex align-items-center justify-content-between mb-4">
                <button className="btn btn-link p-0" onClick={() => navigate('/users')}>
                    <i className="bi bi-arrow-left me-1"></i>Back to Users
                </button>
                {isITAdmin && !editMode && (
                    <div className="d-flex gap-2">
                        <button
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() => setEditMode(true)}
                        >
                            <i className="bi bi-pencil me-1"></i>Edit
                        </button>
                        <button
                            className="btn btn-outline-primary btn-sm"
                            onClick={() => setShowStatus(true)}
                        >
                            <i className="bi bi-toggle-on me-1"></i>Change Status
                        </button>
                    </div>
                )}
            </div>

            {/* Success alert */}
            {success && (
                <div className="alert alert-success d-flex align-items-center justify-content-between mb-4">
                    <span><i className="bi bi-check-circle me-2"></i>{success}</span>
                    <button className="btn-close" onClick={() => setSuccess('')}></button>
                </div>
            )}

            <ErrorAlert error={error} onDismiss={() => setError(null)} />

            {/* Profile Header */}
            <div className="d-flex align-items-center mb-4">
                <div
                    className="rounded-circle d-flex align-items-center justify-content-center me-3 bg-primary-edulearn"
                    style={{ width: 64, height: 64, flexShrink: 0 }}
                >
                    <i className="bi bi-person-fill text-white" style={{ fontSize: '2rem' }}></i>
                </div>
                <div>
                    <h2 className="mb-1 text-primary-edulearn">{user.fullName}</h2>
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                        <code className="text-muted">@{user.username}</code>
                        <span
                            className="badge"
                            style={{ background: roleStyle.bg, color: roleStyle.color, fontSize: 12 }}
                        >
                            {user.role}
                        </span>
                        <StatusBadge status={user.status} />
                        {user.mfaEnabled && (
                            <span className="badge bg-success">
                                <i className="bi bi-shield-check me-1"></i>MFA On
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="row g-4">
                {/* Account Details */}
                <div className="col-md-6">
                    <div className="card shadow-sm h-100">
                        <div className="card-header bg-primary-edulearn text-white">
                            <i className="bi bi-person me-2"></i>Account Details
                        </div>
                        <div className="card-body">
                            {editMode ? (
                                <form onSubmit={handleEdit}>
                                    <div className="mb-3">
                                        <label className="form-label fw-bold">Full Name <span className="text-danger">*</span></label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={editForm.fullName}
                                            onChange={e => setEditForm({ ...editForm, fullName: e.target.value })}
                                            maxLength={200}
                                            required
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label fw-bold">Email <span className="text-danger">*</span></label>
                                        <input
                                            type="email"
                                            className="form-control"
                                            value={editForm.email}
                                            onChange={e => setEditForm({ ...editForm, email: e.target.value.toLowerCase() })}
                                            maxLength={255}
                                            required
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label fw-bold">Phone</label>
                                        <input
                                            type="text"
                                            className={`form-control ${editForm.phone.length > 0 && !/^\d{10}$/.test(editForm.phone) ? 'is-invalid' : ''}`}
                                            value={editForm.phone}
                                            onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                                            maxLength={20}
                                        />
                                        {editForm.phone.length > 0 && !/^\d{10}$/.test(editForm.phone) && (
                                            <div className="invalid-feedback">
                                                <i className="bi bi-exclamation-circle me-1"></i>
                                                Phone number must be exactly 10 digits.
                                            </div>
                                        )}
                                    </div>
                                    <ErrorAlert error={editError} onDismiss={() => setEditError(null)} />
                                    <div className="d-flex gap-2">
                                        <button type="submit" className="btn btn-primary-edulearn" disabled={editing}>
                                            {editing
                                                ? <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</>
                                                : <><i className="bi bi-check-lg me-1"></i>Save</>
                                            }
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-outline-secondary"
                                            onClick={() => { setEditMode(false); loadUser(); }}
                                            disabled={editing}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <dl className="row mb-0">
                                    <dt className="col-sm-4 text-muted">User ID</dt>
                                    <dd className="col-sm-8"><code>#{user.userID}</code></dd>

                                    <dt className="col-sm-4 text-muted">Username</dt>
                                    <dd className="col-sm-8">{user.username}</dd>

                                    <dt className="col-sm-4 text-muted">Full Name</dt>
                                    <dd className="col-sm-8">{user.fullName}</dd>

                                    <dt className="col-sm-4 text-muted">Email</dt>
                                    <dd className="col-sm-8">{user.email}</dd>

                                    <dt className="col-sm-4 text-muted">Phone</dt>
                                    <dd className="col-sm-8">{user.phone || '—'}</dd>

                                    <dt className="col-sm-4 text-muted">Role</dt>
                                    <dd className="col-sm-8">
                                        <span className="badge" style={{ background: roleStyle.bg, color: roleStyle.color }}>
                                            {user.role}
                                        </span>
                                    </dd>

                                    <dt className="col-sm-4 text-muted">Status</dt>
                                    <dd className="col-sm-8"><StatusBadge status={user.status} /></dd>

                                    <dt className="col-sm-4 text-muted">Created</dt>
                                    <dd className="col-sm-8">{formatTimestamp(user.createdAt)}</dd>

                                    <dt className="col-sm-4 text-muted">Updated</dt>
                                    <dd className="col-sm-8">{formatTimestamp(user.updatedAt)}</dd>
                                </dl>
                            )}
                        </div>
                    </div>
                </div>

                {/* MFA + Recent Activity */}
                <div className="col-md-6">
                    <div className="card shadow-sm mb-4">
                        <div className="card-header bg-primary-edulearn text-white">
                            <i className="bi bi-shield-check me-2"></i>Security
                        </div>
                        <div className="card-body">
                            <dl className="row mb-0">
                                <dt className="col-sm-5 text-muted">MFA Status</dt>
                                <dd className="col-sm-7">
                                    {user.mfaEnabled
                                        ? <span className="badge bg-success"><i className="bi bi-shield-check me-1"></i>Enrolled</span>
                                        : <span className="badge bg-secondary">Not enrolled</span>
                                    }
                                </dd>
                            </dl>
                            {isITAdmin && user.mfaEnabled && (
                                <button
                                    className="btn btn-outline-warning btn-sm mt-3"
                                    onClick={() => setShowMfaConfirm(true)}
                                >
                                    <i className="bi bi-shield-x me-1"></i>Reset MFA
                                </button>
                            )}
                            {!user.mfaEnabled && (
                                <p className="text-muted small mt-2 mb-0">
                                    MFA is required for privileged roles on next login.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Recent Audit Trail */}
                    <div className="card shadow-sm">
                        <div className="card-header bg-primary-edulearn text-white d-flex justify-content-between align-items-center">
                            <span><i className="bi bi-journal-text me-2"></i>Recent Activity</span>
                            <small className="opacity-75">Last 5 events</small>
                        </div>
                        <div className="card-body p-0">
                            {auditLogs.length === 0 ? (
                                <p className="text-muted small p-3 mb-0">No audit events found.</p>
                            ) : (
                                <ul className="list-group list-group-flush">
                                    {auditLogs.map((log, idx) => (
                                        <li key={log.auditLogID || idx} className="list-group-item d-flex justify-content-between align-items-center py-2">
                                            <span>
                                                <span className="badge bg-primary me-2" style={{ fontSize: 10 }}>
                                                    {log.action}
                                                </span>
                                                <small className="text-muted">{log.resourceType}</small>
                                            </span>
                                            <small className="text-muted">{formatTimestamp(log.timestamp)}</small>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <div className="card-footer py-2">
                            <button
                                className="btn btn-link btn-sm p-0 text-decoration-none"
                                onClick={() => navigate(`/audit-log?userId=${id}`)}
                            >
                                <i className="bi bi-box-arrow-up-right me-1"></i>View full audit log
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Change Status Modal */}
            {showStatus && (
                <>
                    <div className="modal-backdrop fade show"></div>
                    <div className="modal fade show d-block" tabIndex="-1">
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content">
                                <div className="modal-header bg-primary-edulearn text-white">
                                    <h5 className="modal-title">
                                        <i className="bi bi-toggle-on me-2"></i>Change Status
                                    </h5>
                                    <button type="button" className="btn-close btn-close-white" onClick={() => setShowStatus(false)} />
                                </div>
                                <div className="modal-body">
                                    <p className="text-muted mb-3">
                                        Current status: <StatusBadge status={user.status} />
                                    </p>
                                    <div className="d-flex flex-wrap gap-3">
                                        {['Active', 'Inactive', 'Suspended', 'Locked', 'Withdrawn'].map(s => (
                                            <div key={s} className="form-check">
                                                <input
                                                    className="form-check-input"
                                                    type="radio"
                                                    name="newStatus"
                                                    id={`ns-${s}`}
                                                    value={s}
                                                    checked={newStatus === s}
                                                    onChange={() => setNewStatus(s)}
                                                />
                                                <label className="form-check-label" htmlFor={`ns-${s}`}>{s}</label>
                                            </div>
                                        ))}
                                    </div>
                                    {(newStatus === 'Suspended' || newStatus === 'Locked') && (
                                        <div className="alert alert-warning mt-3 mb-0">
                                            <i className="bi bi-exclamation-triangle me-2"></i>
                                            This will immediately prevent the user from logging in.
                                        </div>
                                    )}
                                </div>
                                <div className="modal-footer">
                                    <button className="btn btn-outline-secondary" onClick={() => setShowStatus(false)} disabled={statusSaving}>
                                        Cancel
                                    </button>
                                    <button
                                        className="btn btn-primary-edulearn"
                                        onClick={handleStatusUpdate}
                                        disabled={statusSaving || newStatus === user.status}
                                    >
                                        {statusSaving
                                            ? <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</>
                                            : <><i className="bi bi-check-lg me-1"></i>Update Status</>
                                        }
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* MFA Reset Confirm */}
            <ConfirmDialog
                show={showMfaConfirm}
                title="Reset MFA"
                message={`Resetting MFA will require ${user.fullName} to re-enroll on their next privileged login. Are you sure?`}
                confirmText={mfaResetting ? 'Resetting...' : 'Reset MFA'}
                confirmVariant="warning"
                onConfirm={handleMfaReset}
                onCancel={() => !mfaResetting && setShowMfaConfirm(false)}
            />
        </div>
    );
}
