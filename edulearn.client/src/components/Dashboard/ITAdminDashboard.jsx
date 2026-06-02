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
import { CURRENT_TERM } from '../../config/academic';
import './ITAdminDashboard.css';

const TERM = CURRENT_TERM;

const ALL_ROLES = ['Student', 'Instructor', 'Registrar', 'DeptAdmin', 'Finance', 'ITAdmin', 'Auditor'];

const QUICK_ACTIONS = [
    { label: 'Open Tickets',    icon: 'bi-headset',              path: '/tickets'       },
    { label: 'Manage Users',    icon: 'bi-person-badge',         path: '/users'         },
    { label: 'Students',        icon: 'bi-people',               path: '/students'      },
    { label: 'Applicants',      icon: 'bi-person-plus',          path: '/applicants'    },
    { label: 'Sections',        icon: 'bi-collection',           path: '/sections'      },
    { label: 'Enrollment',      icon: 'bi-card-checklist',       path: '/enrollment'    },
    { label: 'Assessments',     icon: 'bi-file-earmark-check',   path: '/assessments'   },
    { label: 'Fees',            icon: 'bi-cash-stack',           path: '/fees'          },
    { label: 'Invoices',        icon: 'bi-receipt',              path: '/invoices'      },
    { label: 'KPIs',            icon: 'bi-bar-chart-line',       path: '/kpis'          },
    { label: 'Audit Log',       icon: 'bi-journal-text',         path: '/audit-log'     },
    { label: 'Notifications',   icon: 'bi-bell',                 path: '/notifications' },
];

const STAT_CARDS = [
    { key: 'users',         label: 'Total Users',   sub: () => 'all roles',                             icon: 'bi-people-fill',      accent: '#185FA5', iconBg: '#dbeafe', iconColor: '#185FA5', path: '/users'         },
    { key: 'openTickets',   label: 'Open Tickets',  sub: (s) => `${s.highPriority ?? 0} high priority`, icon: 'bi-headset',          accent: '#A32D2D', iconBg: '#fee2e2', iconColor: '#A32D2D', path: '/tickets'       },
    { key: 'students',      label: 'Students',      sub: (s) => `${s.activeStudents ?? 0} active`,      icon: 'bi-mortarboard-fill', accent: '#3B6D11', iconBg: '#dcfce7', iconColor: '#3B6D11', path: '/students'      },
    { key: 'courses',       label: 'Courses',       sub: () => 'active',                                icon: 'bi-book-fill',        accent: '#534AB7', iconBg: '#ede9fe', iconColor: '#534AB7', path: '/courses'       },
    { key: 'notifications', label: 'Notifications', sub: () => 'sent today',                            icon: 'bi-bell-fill',        accent: '#854F0B', iconBg: '#fef3c7', iconColor: '#854F0B', path: '/notifications' },
];

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
        <div className="itadmin-dashboard">

            {/* Hero Banner */}
            <div className="itadmin-hero">
                <div style={{ position: 'relative', zIndex: 1 }}>
                    <span className="itadmin-hero-badge">ITAdmin · Full Access</span>
                    <div className="itadmin-hero-title">Welcome back, {username}! 👋</div>
                    <p className="itadmin-hero-sub">
                        {today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        &nbsp;·&nbsp; Term: {TERM}
                    </p>
                </div>
                <div className="d-flex flex-column align-items-end gap-2" style={{ position: 'relative', zIndex: 1 }}>
                    <i className="bi bi-gear-fill itadmin-hero-icon"></i>
                </div>
            </div>

            {/* Success Alert */}
            {createSuccess && (
                <div className="itadmin-success-alert">
                    <span><i className="bi bi-check-circle-fill me-2"></i>{createSuccess}</span>
                    <button
                        className="btn-close btn-close-sm"
                        style={{ filter: 'invert(30%) sepia(1) saturate(3) hue-rotate(110deg)' }}
                        onClick={() => setCreateSuccess('')}
                    />
                </div>
            )}

            {/* Stat Cards */}
            <div className="row g-3 mb-4">
                {STAT_CARDS.map((card) => (
                    <div key={card.key} className="col">
                        <div
                            className="itadmin-stat-card"
                            style={{ '--iad-accent': card.accent }}
                            onClick={() => navigate(card.path)}
                        >
                            <div>
                                <div className="itadmin-stat-label">{card.label}</div>
                                <div className="itadmin-stat-value" style={{ color: card.accent }}>
                                    {card.key === 'notifications' ? '—' : (stats[card.key] ?? '—')}
                                </div>
                                <div className="itadmin-stat-sub">{card.sub(stats)}</div>
                            </div>
                            <div className="itadmin-stat-icon-wrap" style={{ background: card.iconBg, color: card.iconColor }}>
                                <i className={`bi ${card.icon}`}></i>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Open Tickets + Quick Actions */}
            <div className="row g-3 mb-0">
                {openTickets.length > 0 && (
                    <div className="col-lg-7">
                        <div className="itadmin-card h-100">
                            <div className="itadmin-card-header">
                                <span className="itadmin-card-header-title">
                                    <i className="bi bi-headset me-2"></i>Open Tickets
                                </span>
                                <button
                                    className="btn btn-sm btn-link p-0 text-decoration-none"
                                    style={{ color: '#185FA5', fontSize: '0.8rem' }}
                                    onClick={() => navigate('/tickets')}
                                >
                                    View all <i className="bi bi-arrow-right ms-1"></i>
                                </button>
                            </div>
                            <div>
                                {openTickets.map(t => (
                                    <div key={t.ticketID} className="itadmin-ticket-row" onClick={() => navigate('/tickets')}>
                                        <div>
                                            <div className="d-flex align-items-center mb-1">
                                                <span className="itadmin-ticket-id">#{t.ticketID}</span>
                                                <span className="itadmin-ticket-subject">{t.subject}</span>
                                            </div>
                                            <div className="itadmin-ticket-meta">
                                                {t.createdByUsername} &nbsp;·&nbsp;
                                                {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '—'}
                                            </div>
                                        </div>
                                        <StatusBadge status={t.priority} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
                <div className={openTickets.length > 0 ? 'col-lg-5' : 'col-12'}>
                    <div className="itadmin-card h-100">
                        <div className="itadmin-card-header">
                            <span className="itadmin-card-header-title">
                                <i className="bi bi-lightning-fill me-2"></i>Quick Actions
                            </span>
                        </div>
                        <div className="itadmin-qa-grid">
                            {QUICK_ACTIONS.map((action) => (
                                <button
                                    key={action.path}
                                    className="itadmin-qa-btn"
                                    onClick={() => navigate(action.path)}
                                >
                                    <i className={`bi ${action.icon}`}></i>
                                    {action.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Users Table */}
            {recentUsers.length > 0 && (
                <div className="itadmin-table-card">
                    <div className="itadmin-card-header">
                        <span className="itadmin-card-header-title">
                            <i className="bi bi-people me-2"></i>Recent Users
                        </span>
                    </div>
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead>
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
                                    <tr key={u.userID} onClick={() => navigate('/users')}>
                                        <td><code style={{ color: '#185FA5' }}>{u.userID}</code></td>
                                        <td className="fw-bold">{u.username}</td>
                                        <td>{u.fullName}</td>
                                        <td style={{ color: '#6b7280' }}>{u.email}</td>
                                        <td><span className="badge" style={{ background: '#e8f0fc', color: '#1a3c6e', fontWeight: 600 }}>{u.role}</span></td>
                                        <td><StatusBadge status={u.status} /></td>
                                        <td><small className="text-muted">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</small></td>
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
                                                    <small className="text-muted fw-normal ms-2">(min 8 chars)</small>
                                                </label>
                                                <input
                                                    type="password"
                                                    className="form-control"
                                                    name="password"
                                                    value={userForm.password}
                                                    onChange={handleChange}
                                                    placeholder="Min 8 characters"
                                                    minLength={8}
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
