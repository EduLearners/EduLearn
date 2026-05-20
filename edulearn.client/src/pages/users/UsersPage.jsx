import { useState, useEffect, useMemo } from 'react';
import { useNavigate }  from 'react-router-dom';
import { userService }  from '../../services/userService';
import Loading          from '../../components/Loading';
import ErrorAlert       from '../../components/ErrorAlert';
import StatusBadge      from '../../components/StatusBadge';
import ConfirmDialog    from '../../components/ConfirmDialog';

const ALL_ROLES    = ['Student', 'Instructor', 'Registrar', 'DeptAdmin', 'Finance', 'ITAdmin', 'Auditor'];
const ALL_STATUSES = ['Active', 'Inactive', 'Suspended', 'Locked', 'Withdrawn'];

const ROLE_COLORS = {
    Student:    { bg: '#E6F1FB', color: '#0C447C' },
    Instructor: { bg: '#EAF3DE', color: '#27500A' },
    Registrar:  { bg: '#EEEDFE', color: '#3C3489' },
    DeptAdmin:  { bg: '#FAEEDA', color: '#633806' },
    Finance:    { bg: '#EAF3DE', color: '#27500A' },
    ITAdmin:    { bg: '#FCEBEB', color: '#791F1F' },
    Auditor:    { bg: '#E1F5EE', color: '#085041' },
};

const EMPTY_FORM = {
    username: '', fullName: '', email: '',
    phone: '', role: 'Student', password: '', sendInvite: true,
};

export default function UsersPage() {
    const navigate = useNavigate();

    const [users,        setUsers]        = useState([]);
    const [loading,      setLoading]      = useState(true);
    const [error,        setError]        = useState(null);
    const [success,      setSuccess]      = useState('');

    const [search,       setSearch]       = useState('');
    const [filterRole,   setFilterRole]   = useState('All');
    const [filterStatus, setFilterStatus] = useState('All');

    // Create modal
    const [showCreate,   setShowCreate]   = useState(false);
    const [createForm,   setCreateForm]   = useState(EMPTY_FORM);
    const [creating,     setCreating]     = useState(false);
    const [createError,  setCreateError]  = useState(null);

    // Manage panel
    const [manageTarget, setManageTarget] = useState(null);
    const [editForm,     setEditForm]     = useState({ fullName: '', email: '', phone: '' });
    const [editing,      setEditing]      = useState(false);
    const [editError,    setEditError]    = useState(null);
    const [editSuccess,  setEditSuccess]  = useState('');
    const [newStatus,    setNewStatus]    = useState('');
    const [statusSaving, setStatusSaving] = useState(false);
    const [mfaConfirm,   setMfaConfirm]  = useState(false);
    const [mfaResetting, setMfaResetting] = useState(false);

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

    // ── Counts for dropdowns (mirrors Applicants pattern) ─────────────────
    const roleCounts = useMemo(() => {
        const c = { All: users.length };
        ALL_ROLES.forEach(r => { c[r] = users.filter(u => u.role === r).length; });
        return c;
    }, [users]);

    const statusCounts = useMemo(() => {
        const c = { All: users.length };
        ALL_STATUSES.forEach(s => { c[s] = users.filter(u => u.status === s).length; });
        return c;
    }, [users]);

    // ── Filtered list ─────────────────────────────────────────────────────
    const filtered = useMemo(() => users.filter(u => {
        if (filterRole   !== 'All' && u.role   !== filterRole)   return false;
        if (filterStatus !== 'All' && u.status !== filterStatus) return false;
        if (search.trim()) {
            const q = search.toLowerCase();
            return (
                u.username?.toLowerCase().includes(q) ||
                u.fullName?.toLowerCase().includes(q) ||
                u.email?.toLowerCase().includes(q)
            );
        }
        return true;
    }), [users, search, filterRole, filterStatus]);

    // ── Manage panel helpers ───────────────────────────────────────────────
    const openManage = (u, e) => {
        e.stopPropagation();
        setManageTarget(u);
        setEditForm({ fullName: u.fullName, email: u.email, phone: u.phone || '' });
        setNewStatus(u.status);
        setEditError(null);
        setEditSuccess('');
    };
    const closeManage = () => { setManageTarget(null); };

    // ── Create ────────────────────────────────────────────────────────────
    const handleCreate = async (e) => {
        e.preventDefault();
        setCreateError(null);
        setCreating(true);
        try {
            await userService.create({
                username:   createForm.username,
                fullName:   createForm.fullName,
                email:      createForm.email,
                phone:      createForm.phone || null,
                role:       createForm.role,
                password:   createForm.password,
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
        } catch (err) { setCreateError(err); }
        finally { setCreating(false); }
    };

    // ── Edit ──────────────────────────────────────────────────────────────
    const handleEdit = async (e) => {
        e.preventDefault();
        setEditError(null);
        setEditing(true);
        try {
            await userService.update(manageTarget.userID, editForm);
            setEditSuccess('Profile updated.');
            setUsers(prev => prev.map(u => u.userID === manageTarget.userID ? { ...u, ...editForm } : u));
            setManageTarget(prev => ({ ...prev, ...editForm }));
        } catch (err) { setEditError(err); }
        finally { setEditing(false); }
    };

    // ── Status ────────────────────────────────────────────────────────────
    const handleStatusUpdate = async () => {
        setStatusSaving(true);
        try {
            await userService.updateStatus(manageTarget.userID, newStatus);
            setEditSuccess(`Status updated to ${newStatus}.`);
            setUsers(prev => prev.map(u => u.userID === manageTarget.userID ? { ...u, status: newStatus } : u));
            setManageTarget(prev => ({ ...prev, status: newStatus }));
        } catch (err) { setEditError(err); }
        finally { setStatusSaving(false); }
    };

    // ── MFA Reset ─────────────────────────────────────────────────────────
    const handleMfaReset = async () => {
        setMfaResetting(true);
        try {
            await userService.resetMfa(manageTarget.userID);
            setEditSuccess('MFA reset. User will re-enroll on next login.');
            setUsers(prev => prev.map(u => u.userID === manageTarget.userID ? { ...u, mfaEnabled: false } : u));
            setManageTarget(prev => ({ ...prev, mfaEnabled: false }));
            setMfaConfirm(false);
        } catch (err) { setEditError(err); }
        finally { setMfaResetting(false); }
    };

    // ── Invite ────────────────────────────────────────────────────────────
    const handleInvite = async () => {
        try {
            await userService.inviteUser(manageTarget.userID);
            setEditSuccess(`Invite sent to ${manageTarget.email}.`);
        } catch (err) { setEditError(err); }
    };

    return (
        <div>

            {/* ── Header — identical pattern to Applicants ──────── */}
            <div className="d-flex align-items-center justify-content-between mb-4">
                <h2 className="text-primary-edulearn mb-0">
                    <i className="bi bi-people me-2"></i>Users
                </h2>
                <button
                    className="btn btn-primary-edulearn"
                    onClick={() => { setShowCreate(true); setCreateError(null); }}
                >
                    <i className="bi bi-person-plus me-2"></i>New User
                </button>
            </div>

            {success && (
                <div className="alert alert-success d-flex align-items-center justify-content-between mb-3">
                    <span><i className="bi bi-check-circle me-2"></i>{success}</span>
                    <button className="btn-close" onClick={() => setSuccess('')}></button>
                </div>
            )}

            {/* ── Filter card — exact same structure as Applicants ── */}
            <div className="card shadow-sm mb-3">
                <div className="card-body">
                    <div className="row g-3 align-items-end">
                        <div className="col-md-5">
                            <label className="form-label fw-bold">
                                <i className="bi bi-search me-1"></i>Search
                            </label>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Search by username, name or email..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>

                        <div className="col-md-3">
                            <label className="form-label fw-bold">
                                <i className="bi bi-person-badge me-1"></i>Role
                            </label>
                            <select
                                className="form-select"
                                value={filterRole}
                                onChange={e => setFilterRole(e.target.value)}
                            >
                                <option value="All">All ({roleCounts.All})</option>
                                {ALL_ROLES.map(r => (
                                    <option key={r} value={r}>{r} ({roleCounts[r] ?? 0})</option>
                                ))}
                            </select>
                        </div>

                        <div className="col-md-2">
                            <label className="form-label fw-bold">
                                <i className="bi bi-funnel me-1"></i>Status
                            </label>
                            <select
                                className="form-select"
                                value={filterStatus}
                                onChange={e => setFilterStatus(e.target.value)}
                            >
                                <option value="All">All Statuses</option>
                                {ALL_STATUSES.map(s => (
                                    <option key={s} value={s}>{s} ({statusCounts[s] ?? 0})</option>
                                ))}
                            </select>
                        </div>

                        <div className="col-md-2">
                            <button
                                className="btn btn-outline-secondary w-100"
                                onClick={loadUsers}
                                disabled={loading}
                            >
                                <i className="bi bi-arrow-clockwise me-1"></i>Refresh
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <ErrorAlert error={error} onDismiss={() => setError(null)} />
            {loading && <Loading message="Loading users..." />}

            {/* ── Table card — exact same structure as Applicants ─── */}
            {!loading && (
                <div className="card shadow-sm">
                    <div className="card-body p-0">
                        {filtered.length === 0 ? (
                            <div className="text-center py-5 text-muted">
                                <i className="bi bi-people" style={{ fontSize: '3rem' }}></i>
                                <p className="mt-3 mb-0">
                                    {users.length === 0
                                        ? 'No users in the system yet.'
                                        : 'No users match your filters.'}
                                </p>
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <table className="table table-hover mb-0">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Username</th>
                                            <th>Full Name</th>
                                            <th>Email</th>
                                            <th>Role</th>
                                            <th>MFA</th>
                                            <th>Status</th>
                                            <th>Created</th>
                                            <th className="text-end pe-3">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.map(u => {
                                            const rc = ROLE_COLORS[u.role] || { bg: '#F1EFE8', color: '#444441' };
                                            return (
                                                <tr
                                                    key={u.userID}
                                                    style={{ cursor: 'pointer' }}
                                                    onClick={() => navigate(`/admin/users/${u.userID}`)}
                                                >
                                                    <td>{u.userID}</td>
                                                    <td className="fw-bold">{u.username}</td>
                                                    <td>{u.fullName}</td>
                                                    <td>
                                                        <small className="text-muted">{u.email}</small>
                                                    </td>
                                                    <td>
                                                        <span
                                                            className="badge"
                                                            style={{
                                                                background: rc.bg,
                                                                color: rc.color,
                                                                fontSize: 11,
                                                                fontWeight: 500,
                                                            }}
                                                        >
                                                            {u.role}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        {u.mfaEnabled
                                                            ? <span className="badge bg-success"><i className="bi bi-shield-check me-1"></i>On</span>
                                                            : <span className="badge bg-secondary">Off</span>
                                                        }
                                                    </td>
                                                    <td><StatusBadge status={u.status} /></td>
                                                    <td>
                                                        <small className="text-muted">
                                                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                                                        </small>
                                                    </td>
                                                    <td className="text-end pe-3">
                                                        <button
                                                            className="btn btn-sm btn-outline-primary"
                                                            onClick={e => openManage(u, e)}
                                                        >
                                                            <i className="bi bi-sliders me-1"></i>Manage
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                    {filtered.length > 0 && (
                        <div className="card-footer text-muted small">
                            Showing {filtered.length} of {users.length} users
                        </div>
                    )}
                </div>
            )}

            {/* ── Manage Slide Panel ──────────────────────────────── */}
            {manageTarget && (
                <>
                    <div className="offcanvas-backdrop fade show" onClick={closeManage} style={{ zIndex: 1040 }}></div>
                    <div className="offcanvas offcanvas-end show" style={{ width: 480, zIndex: 1045, visibility: 'visible' }} aria-modal="true" role="dialog">

                        <div className="offcanvas-header text-white" style={{ background: 'var(--primary)' }}>
                            <div>
                                <h5 className="offcanvas-title mb-0">
                                    <i className="bi bi-person-badge me-2"></i>{manageTarget.username}
                                </h5>
                                <small style={{ opacity: 0.85 }}>{manageTarget.email}</small>
                            </div>
                            <button type="button" className="btn-close btn-close-white" onClick={closeManage}></button>
                        </div>

                        <div className="offcanvas-body p-0">
                            {editSuccess && (
                                <div className="alert alert-success m-3 mb-0 py-2 small">
                                    <i className="bi bi-check-circle me-2"></i>{editSuccess}
                                </div>
                            )}
                            <ErrorAlert error={editError} onDismiss={() => setEditError(null)} />

                            {/* Summary strip */}
                            <div className="px-4 py-3 border-bottom bg-light d-flex flex-wrap gap-3">
                                <div>
                                    <div className="text-muted small">Role</div>
                                    <span className="badge mt-1" style={{ background: ROLE_COLORS[manageTarget.role]?.bg || '#F1EFE8', color: ROLE_COLORS[manageTarget.role]?.color || '#444441' }}>
                                        {manageTarget.role}
                                    </span>
                                </div>
                                <div>
                                    <div className="text-muted small">Status</div>
                                    <div className="mt-1"><StatusBadge status={manageTarget.status} /></div>
                                </div>
                                <div>
                                    <div className="text-muted small">MFA</div>
                                    <div className="mt-1">
                                        {manageTarget.mfaEnabled
                                            ? <span className="badge bg-success"><i className="bi bi-shield-check me-1"></i>On</span>
                                            : <span className="badge bg-secondary">Off</span>
                                        }
                                    </div>
                                </div>
                                <div>
                                    <div className="text-muted small">Created</div>
                                    <div className="mt-1 small">{manageTarget.createdAt ? new Date(manageTarget.createdAt).toLocaleDateString() : '—'}</div>
                                </div>
                            </div>

                            <div className="p-4">

                                {/* Edit Profile */}
                                <h6 className="text-muted text-uppercase small fw-bold mb-3">
                                    <i className="bi bi-pencil me-2"></i>Edit Profile
                                </h6>
                                <form onSubmit={handleEdit}>
                                    <div className="row g-3 mb-3">
                                        <div className="col-12">
                                            <label className="form-label fw-bold small">Full Name</label>
                                            <input type="text" className="form-control form-control-sm" value={editForm.fullName} onChange={e => setEditForm({ ...editForm, fullName: e.target.value })} maxLength={200} required />
                                        </div>
                                        <div className="col-md-7">
                                            <label className="form-label fw-bold small">Email</label>
                                            <input type="email" className="form-control form-control-sm" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} maxLength={255} required />
                                        </div>
                                        <div className="col-md-5">
                                            <label className="form-label fw-bold small">Phone</label>
                                            <input type="text" className="form-control form-control-sm" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} maxLength={20} />
                                        </div>
                                    </div>
                                    <button type="submit" className="btn btn-primary-edulearn btn-sm" disabled={editing}>
                                        {editing ? <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</> : <><i className="bi bi-check-lg me-2"></i>Save Changes</>}
                                    </button>
                                </form>

                                <hr className="my-4" />

                                {/* Change Status */}
                                <h6 className="text-muted text-uppercase small fw-bold mb-3">
                                    <i className="bi bi-toggle-on me-2"></i>Account Status
                                </h6>
                                <div className="d-flex flex-wrap gap-2 mb-3">
                                    {ALL_STATUSES.map(s => (
                                        <button key={s} type="button"
                                            className={`btn btn-sm ${newStatus === s ? 'btn-primary-edulearn' : 'btn-outline-secondary'}`}
                                            onClick={() => setNewStatus(s)}
                                        >{s}</button>
                                    ))}
                                </div>
                                <button className="btn btn-outline-primary btn-sm" onClick={handleStatusUpdate} disabled={statusSaving || newStatus === manageTarget.status}>
                                    {statusSaving ? <><span className="spinner-border spinner-border-sm me-2"></span>Updating...</> : <><i className="bi bi-check-lg me-2"></i>Update Status</>}
                                </button>

                                <hr className="my-4" />

                                {/* Other Actions */}
                                <h6 className="text-muted text-uppercase small fw-bold mb-3">
                                    <i className="bi bi-three-dots me-2"></i>Other Actions
                                </h6>
                                <div className="d-flex flex-wrap gap-2">
                                    <button className="btn btn-outline-secondary btn-sm" onClick={handleInvite}>
                                        <i className="bi bi-envelope me-2"></i>Send Invite Email
                                    </button>
                                    {manageTarget.mfaEnabled && (
                                        <button className="btn btn-outline-warning btn-sm" onClick={() => setMfaConfirm(true)}>
                                            <i className="bi bi-shield-x me-2"></i>Reset MFA
                                        </button>
                                    )}
                                    <button className="btn btn-outline-primary btn-sm" onClick={() => { closeManage(); navigate(`/admin/users/${manageTarget.userID}`); }}>
                                        <i className="bi bi-eye me-2"></i>Full Profile
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* ── Create User Modal ────────────────────────────────── */}
            {showCreate && (
                <>
                    <div className="modal-backdrop fade show"></div>
                    <div className="modal fade show d-block" tabIndex="-1">
                        <div className="modal-dialog modal-dialog-centered modal-lg">
                            <div className="modal-content">
                                <div className="modal-header bg-primary-edulearn text-white">
                                    <h5 className="modal-title"><i className="bi bi-person-plus me-2"></i>New User</h5>
                                    <button type="button" className="btn-close btn-close-white" onClick={() => setShowCreate(false)} disabled={creating} />
                                </div>
                                <form onSubmit={handleCreate}>
                                    <div className="modal-body">
                                        <div className="alert alert-info mb-3">
                                            <i className="bi bi-info-circle me-2"></i>
                                            Privileged roles (Registrar, DeptAdmin, Finance, ITAdmin, Auditor) must set up MFA on first login.
                                        </div>
                                        <div className="row g-3">
                                            <div className="col-md-6">
                                                <label className="form-label fw-bold">Username <span className="text-danger">*</span></label>
                                                <input type="text" className="form-control" value={createForm.username} onChange={e => setCreateForm({ ...createForm, username: e.target.value })} placeholder="e.g. john.doe" maxLength={100} required />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label fw-bold">Full Name <span className="text-danger">*</span></label>
                                                <input type="text" className="form-control" value={createForm.fullName} onChange={e => setCreateForm({ ...createForm, fullName: e.target.value })} placeholder="e.g. John Doe" maxLength={200} required />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label fw-bold">Email <span className="text-danger">*</span></label>
                                                <input type="email" className="form-control" value={createForm.email} onChange={e => setCreateForm({ ...createForm, email: e.target.value })} placeholder="e.g. john@example.com" maxLength={255} required />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label fw-bold">Phone</label>
                                                <input type="text" className="form-control" value={createForm.phone} onChange={e => setCreateForm({ ...createForm, phone: e.target.value })} placeholder="e.g. +91-9876543210" maxLength={20} />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label fw-bold">Role <span className="text-danger">*</span></label>
                                                <select className="form-select" value={createForm.role} onChange={e => setCreateForm({ ...createForm, role: e.target.value })} required>
                                                    {ALL_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                                                </select>
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label fw-bold">Password <span className="text-danger">*</span> <small className="text-muted fw-normal">(min 8 chars)</small></label>
                                                <input type="password" className="form-control" value={createForm.password} onChange={e => setCreateForm({ ...createForm, password: e.target.value })} placeholder="Min 8 characters" minLength={8} required />
                                            </div>
                                            <div className="col-12">
                                                <div className="p-3 bg-light rounded d-flex align-items-start gap-3">
                                                    <input type="checkbox" className="form-check-input mt-1" id="sendInviteCheck" checked={createForm.sendInvite} onChange={e => setCreateForm({ ...createForm, sendInvite: e.target.checked })} />
                                                    <label htmlFor="sendInviteCheck" style={{ cursor: 'pointer' }}>
                                                        <div className="fw-bold"><i className="bi bi-envelope me-2"></i>Send welcome email</div>
                                                        <small className="text-muted">Sends login details to {createForm.email || "the user's email"}.</small>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                        <ErrorAlert error={createError} onDismiss={() => setCreateError(null)} />
                                    </div>
                                    <div className="modal-footer">
                                        <button type="button" className="btn btn-outline-secondary" onClick={() => setShowCreate(false)} disabled={creating}>Cancel</button>
                                        <button type="submit" className="btn btn-primary-edulearn" disabled={creating}>
                                            {creating ? <><span className="spinner-border spinner-border-sm me-2"></span>Creating...</> : <><i className="bi bi-check-lg me-2"></i>Create User</>}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* ── MFA Reset Confirm ───────────────────────────────── */}
            <ConfirmDialog
                show={mfaConfirm}
                title="Reset MFA"
                message={`Reset MFA for "${manageTarget?.username}"? They will re-enroll on next login.`}
                confirmText={mfaResetting ? 'Resetting...' : 'Reset MFA'}
                confirmVariant="warning"
                onConfirm={handleMfaReset}
                onCancel={() => !mfaResetting && setMfaConfirm(false)}
            />
        </div>
    );
}
