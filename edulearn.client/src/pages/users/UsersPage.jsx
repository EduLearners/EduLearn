import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { userService } from '../../services/userService';
import Loading from '../../components/Loading';
import ErrorAlert from '../../components/ErrorAlert';
import ModalPortal from '../../components/ModalPortal';
import StatusBadge from '../../components/StatusBadge';
import ConfirmDialog from '../../components/ConfirmDialog';

const ALL_ROLES = ['Student', 'Instructor', 'Registrar', 'DeptAdmin', 'Finance', 'ITAdmin', 'Auditor'];
const ALL_STATUSES = ['Active', 'Inactive', 'Suspended', 'Locked', 'Withdrawn'];

const ROLE_BADGE_STYLE = {
    Student:    { bg: '#E6F1FB', color: '#0C447C' },
    Instructor: { bg: '#EAF3DE', color: '#27500A' },
    Registrar:  { bg: '#EEEDFE', color: '#3C3489' },
    DeptAdmin:  { bg: '#FAEEDA', color: '#633806' },
    Finance:    { bg: '#EAF3DE', color: '#27500A' },
    ITAdmin:    { bg: '#FCEBEB', color: '#791F1F' },
    Auditor:    { bg: '#E1F5EE', color: '#085041' },
};

const EMPTY_FORM = {
    username: '',
    fullName: '',
    email: '',
    phone: '',
    role: 'Student',
    password: '',
    sendInvite: true,
};

export default function UsersPage() {

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState('');

    const [search, setSearch] = useState('');
    const [filterRole, setFilterRole] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    const [showCreate, setShowCreate] = useState(false);
    const [createForm, setCreateForm] = useState(EMPTY_FORM);
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState(null);

    const [showEdit, setShowEdit] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [editForm, setEditForm] = useState({ fullName: '', email: '', phone: '' });
    const [editing, setEditing] = useState(false);
    const [editError, setEditError] = useState(null);

    const [showStatus, setShowStatus] = useState(false);
    const [statusTarget, setStatusTarget] = useState(null);
    const [newStatus, setNewStatus] = useState('');
    const [statusSaving, setStatusSaving] = useState(false);

    const [mfaResetTarget, setMfaResetTarget] = useState(null);
    const [mfaResetting, setMfaResetting] = useState(false);

    const navigate = useNavigate();

    useEffect(() => { loadUsers(); }, []);

    const loadUsers = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await userService.getAll();
            setUsers(data || []);
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

   const handleCreate = async (e) => {
        e.preventDefault();
        setCreateError(null);
        setCreating(true);
        try {
            await userService.create({
                username: createForm.username,
                fullName: createForm.fullName,
                email: createForm.email,
                phone: createForm.phone || null,
                role: createForm.role,
                password: createForm.password,
                sendInvite: createForm.sendInvite,
            });
            setSuccess(
                createForm.sendInvite
                    ? `User "${createForm.username}" created. Welcome email sent to ${createForm.email}.`
                    : `User "${createForm.username}" created successfully.`
            );
            setCreateForm(EMPTY_FORM);
            setShowCreate(false);
            loadUsers();
        } catch (err) {
            setCreateError(err);
        } finally {
            setCreating(false);
        }
    };
    const openEdit = (user) => {
        setEditTarget(user);
        setEditForm({ fullName: user.fullName, email: user.email, phone: user.phone || '' });
        setEditError(null);
        setShowEdit(true);
    };

    const handleEdit = async (e) => {
        e.preventDefault();
        setEditError(null);
        setEditing(true);
        try {
            await userService.update(editTarget.userID, editForm);
            setSuccess(`User "${editTarget.username}" updated.`);
            setShowEdit(false);
            loadUsers();
        } catch (err) {
            setEditError(err);
        } finally {
            setEditing(false);
        }
    };

    const openStatus = (user) => {
        setStatusTarget(user);
        setNewStatus(user.status);
        setShowStatus(true);
    };

    const handleStatusUpdate = async () => {
        setStatusSaving(true);
        try {
            await userService.updateStatus(statusTarget.userID, newStatus);
            setSuccess(`${statusTarget.username} status set to ${newStatus}.`);
            setShowStatus(false);
            loadUsers();
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
            await userService.resetMfa(mfaResetTarget.userID);
            setSuccess(`MFA reset for "${mfaResetTarget.username}". They will re-enroll on next login.`);
            setMfaResetTarget(null);
            loadUsers();
        } catch (err) {
            setError(err);
            setMfaResetTarget(null);
        } finally {
            setMfaResetting(false);
        }
    };

    const handleInvite = async (user) => {
        try {
            await userService.inviteUser(user.userID);
            setSuccess(`Invite email sent to ${user.email}.`);
        } catch (err) {
            setError(err);
        }
    };

    const filtered = users.filter(u => {
        const matchSearch =
            u.username?.toLowerCase().includes(search.toLowerCase()) ||
            u.fullName?.toLowerCase().includes(search.toLowerCase()) ||
            u.email?.toLowerCase().includes(search.toLowerCase());
        const matchRole = filterRole ? String(u.role) === filterRole : true;
        const matchStatus = filterStatus ? String(u.status) === filterStatus : true;
        return matchSearch && matchRole && matchStatus;
    });

    return (
        <div className="edulearn-page">
            <div className="edulearn-page-header">
                <h2 className="edulearn-page-title">
                    <i className="bi bi-people"></i>User Management
                </h2>
                <button
                    className="btn btn-primary-edulearn"
                    onClick={() => { setShowCreate(true); setCreateError(null); }}
                >
                    <i className="bi bi-person-plus me-2"></i>Create User
                </button>
            </div>

            {success && (
                <div className="alert alert-success d-flex align-items-center justify-content-between mb-4">
                    <span><i className="bi bi-check-circle me-2"></i>{success}</span>
                    <button className="btn-close" onClick={() => setSuccess('')}></button>
                </div>
            )}

            <div className="edulearn-filter-card">
                <div className="row g-3">
                    <div className="col-md-5">
                        <div className="input-group">
                            <span className="input-group-text">
                                <i className="bi bi-search"></i>
                            </span>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Search by username, name or email..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="col-md-3">
                        <select
                            className="form-select"
                            value={filterRole}
                            onChange={e => setFilterRole(e.target.value)}
                        >
                            <option value="">All Roles</option>
                            {ALL_ROLES.map(r => (
                                <option key={r} value={r}>{r}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-md-2">
                        <select
                            className="form-select"
                            value={filterStatus}
                            onChange={e => setFilterStatus(e.target.value)}
                        >
                            <option value="">All Statuses</option>
                            {ALL_STATUSES.map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-md-2">
                        <button
                            className="btn btn-outline-secondary w-100"
                            onClick={() => { setSearch(''); setFilterRole(''); setFilterStatus(''); }}
                        >
                            <i className="bi bi-x-lg me-1"></i>Clear
                        </button>
                    </div>
                </div>
            </div>

            <ErrorAlert error={error} onDismiss={() => setError(null)} />
            {loading && <Loading message="Loading users..." />}

            {!loading && !error && filtered.length === 0 && (
                <div className="text-center py-5 text-muted">
                    <i className="bi bi-people display-4 d-block mb-3"></i>
                    <p className="mb-0">No users found.</p>
                </div>
            )}

            {!loading && filtered.length > 0 && (
                <div className="card shadow-sm">
                    <div className="card-header bg-light d-flex align-items-center justify-content-between">
                        <strong><i className="bi bi-table me-2"></i>Users</strong>
                        <small className="text-muted">{filtered.length} of {users.length} user(s)</small>
                    </div>
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th>ID</th>
                                    <th>Username</th>
                                    <th>Full Name</th>
                                    <th>Email</th>
                                    <th>Phone</th>
                                    <th>Role</th>
                                    <th>MFA</th>
                                    <th>Status</th>
                                    <th>Created</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(u => {
                                    const roleStyle = ROLE_BADGE_STYLE[u.role] || { bg: '#F1EFE8', color: '#444441' };
                                    return (
                                        <tr
                                            key={u.userID}
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => navigate(`/users/${u.userID}`)}
                                        >
                                            <td><code>{u.userID}</code></td>
                                            <td className="fw-bold">{u.username}</td>
                                            <td>{u.fullName}</td>
                                            <td><small>{u.email}</small></td>
                                            <td><small>{u.phone || '—'}</small></td>
                                            <td>
                                                <span
                                                    className="badge"
                                                    style={{ background: roleStyle.bg, color: roleStyle.color, fontSize: 11 }}
                                                >
                                                    {u.role}
                                                </span>
                                            </td>
                                            <td>
                                                {u.mfaEnabled ? (
                                                    <span className="badge bg-success">
                                                        <i className="bi bi-shield-check me-1"></i>On
                                                    </span>
                                                ) : (
                                                    <span className="badge bg-secondary">Off</span>
                                                )}
                                            </td>
                                            <td><StatusBadge status={u.status} /></td>
                                            <td>
                                                <small className="text-muted">
                                                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                                                </small>
                                            </td>
                                            <td>
                                                <div className="d-flex gap-1">
                                                    <button
                                                        className="btn btn-sm btn-outline-secondary"
                                                        onClick={(e) => { e.stopPropagation(); openEdit(u); }}
                                                        title="Edit profile"
                                                    >
                                                        <i className="bi bi-pencil"></i>
                                                    </button>
                                                    <button
                                                        className="btn btn-sm btn-outline-primary"
                                                        onClick={(e) => { e.stopPropagation(); openStatus(u); }}
                                                        title="Change status"
                                                    >
                                                        <i className="bi bi-toggle-on"></i>
                                                    </button>
                                                    <button
                                                        className="btn btn-sm btn-outline-success"
                                                        onClick={(e) => { e.stopPropagation(); handleInvite(u); }}
                                                        title="Send invite email"
                                                    >
                                                        <i className="bi bi-envelope"></i>
                                                    </button>
                                                    {u.mfaEnabled && (
                                                        <button
                                                            className="btn btn-sm btn-outline-warning"
                                                            onClick={(e) => { e.stopPropagation(); setMfaResetTarget(u); }}
                                                            title="Reset MFA"
                                                        >
                                                            <i className="bi bi-shield-x"></i>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="card-footer text-muted small">
                        Showing {filtered.length} of {users.length} users
                    </div>
                </div>
            )}

            {/* ── Create User Modal ──────────────────────────────── */}
            {showCreate && (
                <ModalPortal>
                    <div className="modal-backdrop fade show"></div>
                    <div className="modal fade show d-block" tabIndex="-1">
                        <div className="modal-dialog modal-dialog-centered modal-lg">
                            <div className="modal-content">
                                <div className="modal-header bg-primary-edulearn text-white">
                                    <h5 className="modal-title">
                                        <i className="bi bi-person-plus me-2"></i>Create New User
                                    </h5>
                                    <button
                                        type="button"
                                        className="btn-close btn-close-white"
                                        onClick={() => setShowCreate(false)}
                                        disabled={creating}
                                    />
                                </div>
                                <form onSubmit={handleCreate}>
                                    <div className="modal-body">
                                        <div className="alert alert-info mb-3">
                                            <i className="bi bi-info-circle me-2"></i>
                                            Privileged roles (Registrar, DeptAdmin, Finance, ITAdmin, Auditor)
                                            are required to set up MFA on first login.
                                        </div>
                                        <div className="row g-3">
                                            <div className="col-md-6">
                                                <label className="form-label fw-bold">
                                                    Username <span className="text-danger">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={createForm.username}
                                                    onChange={e => setCreateForm({ ...createForm, username: e.target.value })}
                                                    placeholder="e.g. john.doe"
                                                    maxLength={100}
                                                    required
                                                />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label fw-bold">
                                                    Full Name <span className="text-danger">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={createForm.fullName}
                                                    onChange={e => setCreateForm({ ...createForm, fullName: e.target.value })}
                                                    placeholder="e.g. John Doe"
                                                    maxLength={200}
                                                    required
                                                />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label fw-bold">
                                                    Email <span className="text-danger">*</span>
                                                </label>
                                                <input
                                                    type="email"
                                                    className="form-control"
                                                    value={createForm.email}
                                                    onChange={e => setCreateForm({ ...createForm, email: e.target.value })}
                                                    placeholder="e.g. john@example.com"
                                                    maxLength={255}
                                                    required
                                                />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label fw-bold">Phone</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={createForm.phone}
                                                    onChange={e => setCreateForm({ ...createForm, phone: e.target.value })}
                                                    placeholder="e.g. +91-9876543210"
                                                    maxLength={20}
                                                />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label fw-bold">
                                                    Role <span className="text-danger">*</span>
                                                </label>
                                                <select
                                                    className="form-select"
                                                    value={createForm.role}
                                                    onChange={e => setCreateForm({ ...createForm, role: e.target.value })}
                                                    required
                                                >
                                                    {ALL_ROLES.map(r => (
                                                        <option key={r} value={r}>{r}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label fw-bold">
                                                    Password <span className="text-danger">*</span>
                                                    <small className="text-muted fw-normal ms-2">(min 8 chars)</small>
                                                </label>
                                                <input
                                                    type="password"
                                                    className="form-control"
                                                    value={createForm.password}
                                                    onChange={e => setCreateForm({ ...createForm, password: e.target.value })}
                                                    placeholder="Min 8 characters"
                                                    minLength={8}
                                                    required
                                                />
                                            </div>

                                            {/* Send Invite Checkbox */}
                                            <div className="col-12">
                                                <div className="p-3 bg-light rounded d-flex align-items-start gap-3">
                                                    <input
                                                        type="checkbox"
                                                        className="form-check-input mt-1"
                                                        id="sendInviteCheck"
                                                        checked={createForm.sendInvite}
                                                        onChange={e => setCreateForm({ ...createForm, sendInvite: e.target.checked })}
                                                    />
                                                    <label htmlFor="sendInviteCheck" style={{ cursor: 'pointer' }}>
                                                        <div className="fw-bold">
                                                            <i className="bi bi-envelope me-2"></i>
                                                            Send welcome email
                                                        </div>
                                                        <small className="text-muted">
                                                            Sends login details (username, role, login URL
                                                            and temporary password) to {createForm.email || 'the user\'s email'}.
                                                        </small>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                        <ErrorAlert error={createError} onDismiss={() => setCreateError(null)} />
                                    </div>
                                    <div className="modal-footer">
                                        <button
                                            type="button"
                                            className="btn btn-outline-secondary"
                                            onClick={() => setShowCreate(false)}
                                            disabled={creating}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="btn btn-primary-edulearn"
                                            disabled={creating}
                                        >
                                            {creating ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-2"></span>
                                                    Creating...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="bi bi-check-lg me-2"></i>
                                                    Create User
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

            {/* ── Edit User Modal ───────────────────────────────── */}
            {showEdit && editTarget && (
                <ModalPortal>
                    <div className="modal-backdrop fade show"></div>
                    <div className="modal fade show d-block" tabIndex="-1">
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content">
                                <div className="modal-header bg-primary-edulearn text-white">
                                    <h5 className="modal-title">
                                        <i className="bi bi-pencil me-2"></i>
                                        Edit User — {editTarget.username}
                                    </h5>
                                    <button
                                        type="button"
                                        className="btn-close btn-close-white"
                                        onClick={() => setShowEdit(false)}
                                        disabled={editing}
                                    />
                                </div>
                                <form onSubmit={handleEdit}>
                                    <div className="modal-body">
                                        <div className="row g-3">
                                            <div className="col-12">
                                                <label className="form-label fw-bold">
                                                    Full Name <span className="text-danger">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={editForm.fullName}
                                                    onChange={e => setEditForm({ ...editForm, fullName: e.target.value })}
                                                    maxLength={200}
                                                    required
                                                />
                                            </div>
                                            <div className="col-12">
                                                <label className="form-label fw-bold">
                                                    Email <span className="text-danger">*</span>
                                                </label>
                                                <input
                                                    type="email"
                                                    className="form-control"
                                                    value={editForm.email}
                                                    onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                                                    maxLength={255}
                                                    required
                                                />
                                            </div>
                                            <div className="col-12">
                                                <label className="form-label fw-bold">Phone</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={editForm.phone}
                                                    onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                                                    maxLength={20}
                                                />
                                            </div>
                                        </div>
                                        <ErrorAlert error={editError} onDismiss={() => setEditError(null)} />
                                    </div>
                                    <div className="modal-footer">
                                        <button
                                            type="button"
                                            className="btn btn-outline-secondary"
                                            onClick={() => setShowEdit(false)}
                                            disabled={editing}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="btn btn-primary-edulearn"
                                            disabled={editing}
                                        >
                                            {editing ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-2"></span>
                                                    Saving...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="bi bi-check-lg me-2"></i>
                                                    Save Changes
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

            {/* ── Change Status Modal ───────────────────────────── */}
            {showStatus && statusTarget && (
                <ModalPortal>
                    <div className="modal-backdrop fade show"></div>
                    <div className="modal fade show d-block" tabIndex="-1">
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content">
                                <div className="modal-header bg-primary-edulearn text-white">
                                    <h5 className="modal-title">
                                        <i className="bi bi-toggle-on me-2"></i>
                                        Change Status — {statusTarget.username}
                                    </h5>
                                    <button
                                        type="button"
                                        className="btn-close btn-close-white"
                                        onClick={() => setShowStatus(false)}
                                        disabled={statusSaving}
                                    />
                                </div>
                                <div className="modal-body">
                                    <p className="mb-3 text-muted">
                                        Current status: <StatusBadge status={statusTarget.status} />
                                    </p>
                                    <label className="form-label fw-bold">New Status</label>
                                    <div className="d-flex flex-wrap gap-3">
                                        {ALL_STATUSES.map(s => (
                                            <div key={s} className="form-check">
                                                <input
                                                    className="form-check-input"
                                                    type="radio"
                                                    name="status"
                                                    id={`status-${s}`}
                                                    value={s}
                                                    checked={newStatus === s}
                                                    onChange={() => setNewStatus(s)}
                                                />
                                                <label className="form-check-label" htmlFor={`status-${s}`}>
                                                    {s}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                    {newStatus === 'Locked' && (
                                        <div className="alert alert-warning mt-3 mb-0">
                                            <i className="bi bi-exclamation-triangle me-2"></i>
                                            Locked users cannot log in until status is changed back.
                                        </div>
                                    )}
                                    {newStatus === 'Suspended' && (
                                        <div className="alert alert-warning mt-3 mb-0">
                                            <i className="bi bi-exclamation-triangle me-2"></i>
                                            Suspended users cannot access the system.
                                        </div>
                                    )}
                                    {newStatus === 'Withdrawn' && (
                                        <div className="alert alert-secondary mt-3 mb-0">
                                            <i className="bi bi-info-circle me-2"></i>
                                            Withdrawn users have left the institution and cannot log in.
                                        </div>
                                    )}
                                </div>
                                <div className="modal-footer">
                                    <button
                                        type="button"
                                        className="btn btn-outline-secondary"
                                        onClick={() => setShowStatus(false)}
                                        disabled={statusSaving}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-primary-edulearn"
                                        onClick={handleStatusUpdate}
                                        disabled={statusSaving || newStatus === statusTarget.status}
                                    >
                                        {statusSaving ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2"></span>
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <i className="bi bi-check-lg me-2"></i>
                                                Update Status
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}

            {/* ── MFA Reset Confirm ──────────────────────────────── */}
            <ConfirmDialog
                show={!!mfaResetTarget}
                title="Reset MFA"
                message={`Are you sure you want to reset MFA for "${mfaResetTarget?.username}"? They will be required to set up MFA again on their next login.`}
                confirmText={mfaResetting ? 'Resetting...' : 'Reset MFA'}
                confirmVariant="warning"
                onConfirm={handleMfaReset}
                onCancel={() => !mfaResetting && setMfaResetTarget(null)}
            />
        </div>
    );
}
