import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { userService } from '../../services/userService';
import { studentService } from '../../services/studentService';
import { courseService } from '../../services/courseService';
import { ticketService } from '../../services/ticketService';
import Loading from '../Loading';
import ErrorAlert from '../ErrorAlert';
import StatusBadge from '../StatusBadge';
import axiosClient from '../../api/axiosClient';

const TERM = '2026-Spring';

const ALL_ROLES = ['Student', 'Instructor', 'Registrar', 'DeptAdmin', 'Finance', 'ITAdmin', 'Auditor'];

export default function ITAdminDashboard() {
    const navigate = useNavigate();
    const { username } = authService.getCurrentUser();
    const [stats, setStats] = useState({});
    const [openTickets, setOpenTickets] = useState([]);
    const [recentUsers, setRecentUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateUser, setShowCreateUser] = useState(false);
    const [saving, setSaving] = useState(false);
    const [createError, setCreateError] = useState(null);
    const [createSuccess, setCreateSuccess] = useState('');
    const today = new Date();

    const [userForm, setUserForm] = useState({
        username: '',
        fullName: '',
        email: '',
        phone: '',
        role: 'Student',
        password: '',
    });

    useEffect(() => { loadStats(); }, []);

    const loadStats = async () => {
        setLoading(true);
        const s = {};
        try {
            const [users, students, courses, tickets] = await Promise.allSettled([
                userService.getAll(),
                studentService.getAll(),
                courseService.getAll(),
                ticketService.getAll(),
            ]);
            if (users.status === 'fulfilled') {
                const d = users.value || [];
                s.users = d.length;
                setRecentUsers([...d].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5));
            }
            if (students.status === 'fulfilled') {
                const d = students.value || [];
                s.students = d.length;
                s.activeStudents = d.filter(st => st.enrollmentStatus === 'Active').length;
            }
            if (courses.status === 'fulfilled') s.courses = (courses.value || []).length;
            if (tickets.status === 'fulfilled') {
                const d = tickets.value || [];
                s.openTickets = d.filter(t => t.status === 'Open' || t.status === 'InProgress').length;
                s.highPriority = d.filter(t => (t.status === 'Open' || t.status === 'InProgress') && (t.priority === 'High' || t.priority === 'Critical')).length;
                setOpenTickets(d.filter(t => t.status === 'Open').slice(0, 5));
            }
        } catch { }
        setStats(s);
        setLoading(false);
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setCreateError(null);
        setCreateSuccess('');
        setSaving(true);
        try {
            const payload = {
                username: userForm.username,
                fullName: userForm.fullName,
                email: userForm.email,
                phone: userForm.phone || null,
                role: userForm.role,
                password: userForm.password,
            };
            await axiosClient.post('/users', payload);
            setCreateSuccess(`User "${userForm.username}" created successfully.`);
            setUserForm({ username: '', fullName: '', email: '', phone: '', role: 'Student', password: '' });
            setShowCreateUser(false);
            loadStats();
        } catch (err) {
            setCreateError(err);
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setUserForm(prev => ({ ...prev, [name]: value }));
    };

    if (loading) return <Loading message="Loading your dashboard..." />;

    return (
        <div>
            <div className="d-flex align-items-center justify-content-between mb-4">
                <div className="d-flex align-items-center gap-3">
                    <span className="badge" style={{ background: '#FCEBEB', color: '#791F1F', fontSize: 13 }}>ITAdmin</span>
                    <h2 className="mb-0 text-primary-edulearn">IT Admin Dashboard</h2>
                </div>
                <div className="d-flex align-items-center gap-3">
                    <small className="text-muted">{today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</small>
                    <button
                        className="btn btn-primary-edulearn btn-sm"
                        onClick={() => { setShowCreateUser(true); setCreateError(null); setCreateSuccess(''); }}
                    >
                        <i className="bi bi-person-plus me-2"></i>Create User
                    </button>
                </div>
            </div>

            <div className="card shadow-sm mb-4 border-0 bg-light">
                <div className="card-body d-flex align-items-center justify-content-between">
                    <div>
                        <h4 className="mb-1">Welcome back, {username}! 👋</h4>
                        <p className="mb-0 text-muted">Term: {TERM} &nbsp;·&nbsp; Role: ITAdmin &nbsp;·&nbsp; Full access</p>
                    </div>
                    <i className="bi bi-gear text-muted" style={{ fontSize: '2.5rem', opacity: 0.3 }}></i>
                </div>
            </div>

            <div className="row g-3 mb-4">
                <div className="col-md-3 col-sm-6">
                    <div className="card shadow-sm h-100 border-0 bg-light">
                        <div className="card-body">
                            <div className="text-muted small text-uppercase mb-1">Total Users</div>
                            <div className="display-5 fw-bold" style={{ color: '#185FA5' }}>{stats.users ?? '—'}</div>
                            <small className="text-muted">all roles</small>
                        </div>
                    </div>
                </div>
                <div className="col-md-3 col-sm-6">
                    <div className="card shadow-sm h-100 border-0 bg-light" style={{ cursor: 'pointer' }} onClick={() => navigate('/tickets')}>
                        <div className="card-body">
                            <div className="text-muted small text-uppercase mb-1">Open Tickets</div>
                            <div className="display-5 fw-bold" style={{ color: '#A32D2D' }}>{stats.openTickets ?? '—'}</div>
                            <small className="text-muted">{stats.highPriority ?? 0} high priority</small>
                        </div>
                    </div>
                </div>
                <div className="col-md-3 col-sm-6">
                    <div className="card shadow-sm h-100 border-0 bg-light" style={{ cursor: 'pointer' }} onClick={() => navigate('/students')}>
                        <div className="card-body">
                            <div className="text-muted small text-uppercase mb-1">Students</div>
                            <div className="display-5 fw-bold" style={{ color: '#3B6D11' }}>{stats.students ?? '—'}</div>
                            <small className="text-muted">{stats.activeStudents ?? 0} active</small>
                        </div>
                    </div>
                </div>
                <div className="col-md-3 col-sm-6">
                    <div className="card shadow-sm h-100 border-0 bg-light" style={{ cursor: 'pointer' }} onClick={() => navigate('/courses')}>
                        <div className="card-body">
                            <div className="text-muted small text-uppercase mb-1">Courses</div>
                            <div className="display-5 fw-bold" style={{ color: '#534AB7' }}>{stats.courses ?? '—'}</div>
                            <small className="text-muted">active</small>
                        </div>
                    </div>
                </div>
                <div className="col-md-3 col-sm-6">
                    <div className="card shadow-sm h-100 border-0 bg-light" style={{ cursor: 'pointer' }} onClick={() => navigate('/notifications')}>
                        <div className="card-body">
                            <div className="text-muted small text-uppercase mb-1">Notifications</div>
                            <div className="display-5 fw-bold" style={{ color: '#854F0B' }}>—</div>
                            <small className="text-muted">sent today</small>
                        </div>
                    </div>
                </div>
            </div>

            {/* Create User Success Alert */}
            {createSuccess && (
                <div className="alert alert-success d-flex align-items-center justify-content-between mb-4">
                    <span><i className="bi bi-check-circle me-2"></i>{createSuccess}</span>
                    <button className="btn-close" onClick={() => setCreateSuccess('')}></button>
                </div>
            )}

            <div className="row g-3">
                {openTickets.length > 0 && (
                    <div className="col-lg-7">
                        <div className="card shadow-sm h-100">
                            <div className="card-header bg-light d-flex align-items-center justify-content-between">
                                <strong><i className="bi bi-headset me-2"></i>Open Tickets</strong>
                                <button className="btn btn-sm btn-link p-0" onClick={() => navigate('/tickets')}>View all <i className="bi bi-arrow-right"></i></button>
                            </div>
                            <div className="list-group list-group-flush">
                                {openTickets.map(t => (
                                    <div key={t.ticketID} className="list-group-item list-group-item-action" style={{ cursor: 'pointer' }} onClick={() => navigate('/tickets')}>
                                        <div className="d-flex align-items-center justify-content-between">
                                            <div>
                                                <div className="fw-bold">#{t.ticketID} {t.subject}</div>
                                                <small className="text-muted">{t.createdByUsername} · {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '—'}</small>
                                            </div>
                                            <StatusBadge status={t.priority} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
                <div className={openTickets.length > 0 ? 'col-lg-5' : 'col-12'}>
                    <div className="card shadow-sm h-100">
                        <div className="card-header bg-light"><strong><i className="bi bi-lightning me-2"></i>Quick Actions</strong></div>
                        <div className="card-body">
                            <div className="d-grid gap-2">
                                <button className="btn btn-outline-primary btn-sm text-start" onClick={() => navigate('/tickets')}><i className="bi bi-headset me-2"></i>Open Tickets</button>
                                <button className="btn btn-outline-primary btn-sm text-start" onClick={() => navigate('/users')}><i className="bi bi-person-badge me-2"></i>Manage Users</button>
                                <button className="btn btn-outline-primary btn-sm text-start" onClick={() => navigate('/students')}><i className="bi bi-people me-2"></i>Manage Students</button>
                                <button className="btn btn-outline-primary btn-sm text-start" onClick={() => navigate('/applicants')}><i className="bi bi-person-plus me-2"></i>Applicants</button>
                                <button className="btn btn-outline-primary btn-sm text-start" onClick={() => navigate('/sections')}><i className="bi bi-collection me-2"></i>Sections</button>
                                <button className="btn btn-outline-primary btn-sm text-start" onClick={() => navigate('/enrollment')}><i className="bi bi-card-checklist me-2"></i>Enrollment</button>
                                <button className="btn btn-outline-primary btn-sm text-start" onClick={() => navigate('/assessments')}><i className="bi bi-file-earmark-check me-2"></i>Assessments</button>
                                <button className="btn btn-outline-primary btn-sm text-start" onClick={() => navigate('/fees')}><i className="bi bi-cash-stack me-2"></i>Fees</button>
                                <button className="btn btn-outline-primary btn-sm text-start" onClick={() => navigate('/invoices')}><i className="bi bi-receipt me-2"></i>Invoices</button>
                                <button className="btn btn-outline-primary btn-sm text-start" onClick={() => navigate('/plagiarism')}><i className="bi bi-shield-exclamation me-2"></i>Plagiarism</button>
                                <button className="btn btn-outline-primary btn-sm text-start" onClick={() => navigate('/kpis')}><i className="bi bi-bar-chart-line me-2"></i>KPIs</button>
                                <button className="btn btn-outline-primary btn-sm text-start" onClick={() => navigate('/audit-log')}><i className="bi bi-journal-text me-2"></i>Audit Log</button>
                                <button className="btn btn-outline-primary btn-sm text-start" onClick={() => navigate('/notifications')}><i className="bi bi-bell me-2"></i>Send Notification</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Users */}
            {recentUsers.length > 0 && (
                <div className="card shadow-sm mt-4">
                    <div className="card-header bg-light d-flex align-items-center justify-content-between">
                        <strong><i className="bi bi-people me-2"></i>Recent Users</strong>
                        <button
                            className="btn btn-sm btn-primary-edulearn"
                            onClick={() => { setShowCreateUser(true); setCreateError(null); setCreateSuccess(''); }}
                        >
                            <i className="bi bi-person-plus me-2"></i>Create User
                        </button>
                    </div>
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th>ID</th>
                                    <th>Username</th>
                                    <th>Full Name</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Status</th>
                                    <th>Created</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentUsers.map(u => (
                                    <tr key={u.userID}>
                                        <td><code>#{u.userID}</code></td>
                                        <td className="fw-bold">{u.username}</td>
                                        <td>{u.fullName}</td>
                                        <td>{u.email}</td>
                                        <td>
                                            <span className="badge bg-secondary">{u.role}</span>
                                        </td>
                                        <td><StatusBadge status={u.status} /></td>
                                        <td>
                                            <small className="text-muted">
                                                {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                                            </small>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Create User Modal */}
            {showCreateUser && (
                <>
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
                                        onClick={() => setShowCreateUser(false)}
                                        disabled={saving}
                                    />
                                </div>
                                <form onSubmit={handleCreateUser}>
                                    <div className="modal-body">
                                        <div className="alert alert-info">
                                            <i className="bi bi-info-circle me-2"></i>
                                            This creates a user account directly. For privileged roles
                                            (Registrar, DeptAdmin, Finance, ITAdmin, Auditor) the user
                                            will be prompted to set up MFA on first login.
                                        </div>
                                        <div className="row g-3">
                                            <div className="col-md-6">
                                                <label className="form-label fw-bold">
                                                    Username <span className="text-danger">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    name="username"
                                                    value={userForm.username}
                                                    onChange={handleChange}
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
                                                    name="fullName"
                                                    value={userForm.fullName}
                                                    onChange={handleChange}
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
                                                    name="email"
                                                    value={userForm.email}
                                                    onChange={handleChange}
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
                                                    name="phone"
                                                    value={userForm.phone}
                                                    onChange={handleChange}
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
                                                    name="role"
                                                    value={userForm.role}
                                                    onChange={handleChange}
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
                                                    <small className="text-muted fw-normal ms-2">(min 6 chars)</small>
                                                </label>
                                                <input
                                                    type="password"
                                                    className="form-control"
                                                    name="password"
                                                    value={userForm.password}
                                                    onChange={handleChange}
                                                    placeholder="Min 6 characters"
                                                    minLength={6}
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <ErrorAlert error={createError} onDismiss={() => setCreateError(null)} />
                                    </div>
                                    <div className="modal-footer">
                                        <button
                                            type="button"
                                            className="btn btn-outline-secondary"
                                            onClick={() => setShowCreateUser(false)}
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
                                                    Create User
                                                </>
                                            )}
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
