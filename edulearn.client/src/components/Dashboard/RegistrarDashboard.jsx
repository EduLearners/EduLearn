import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { applicantService } from '../../services/applicantService';
import { studentService } from '../../services/studentService';
import Loading from '../Loading';
import ErrorAlert from '../ErrorAlert';
import StatusBadge from '../StatusBadge';
import axiosClient from '../../api/axiosClient';

const TERM = '2026-Spring';

const EMPTY_USER_FORM = {
    username: '',
    fullName: '',
    email: '',
    phone: '',
    password: '',
};

export default function RegistrarDashboard() {
    const navigate = useNavigate();
    const { username } = authService.getCurrentUser();

    const [stats, setStats] = useState({});
    const [recentApplicants, setRecentApplicants] = useState([]);
    const [loading, setLoading] = useState(true);

    // Create Student User modal
    const [showCreateUser, setShowCreateUser] = useState(false);
    const [userForm, setUserForm] = useState(EMPTY_USER_FORM);
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState(null);
    const [createSuccess, setCreateSuccess] = useState('');
    const [createdUser, setCreatedUser] = useState(null); // stores result to show userID

    const today = new Date();

    useEffect(() => { loadStats(); }, []);

    const loadStats = async () => {
        setLoading(true);
        const s = {};
        try {
            const [applicants, students] = await Promise.allSettled([
                applicantService.getAll(),
                studentService.getAll(),
            ]);
            if (applicants.status === 'fulfilled') {
                const d = applicants.value || [];
                s.applicants = d.length;
                s.pendingReview = d.filter(a =>
                    a.applicationStatus === 'Submitted' ||
                    a.applicationStatus === 'UnderReview'
                ).length;
                setRecentApplicants(
                    [...d]
                        .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
                        .slice(0, 5)
                );
            }
            if (students.status === 'fulfilled') {
                const d = students.value || [];
                s.students = d.length;
                s.activeStudents = d.filter(st => st.enrollmentStatus === 'Active').length;
            }
        } catch { }
        setStats(s);
        setLoading(false);
    };

    // POST /api/auth/register — always creates a Student role user
    const handleCreateUser = async (e) => {
        e.preventDefault();
        setCreateError(null);
        setCreateSuccess('');
        setCreatedUser(null);
        setCreating(true);
        try {
            const { data } = await axiosClient.post('/auth/register', {
                username: userForm.username,
                fullName: userForm.fullName,
                email: userForm.email,
                phone: userForm.phone || null,
                password: userForm.password,
            });
            setCreatedUser(data);
            setCreateSuccess(
                `User "${userForm.username}" created successfully with Student role. User ID: #${data.userId}`
            );
            setUserForm(EMPTY_USER_FORM);
        } catch (err) {
            setCreateError(err);
        } finally {
            setCreating(false);
        }
    };

    const openCreateUser = () => {
        setUserForm(EMPTY_USER_FORM);
        setCreateError(null);
        setCreateSuccess('');
        setCreatedUser(null);
        setShowCreateUser(true);
    };

    if (loading) return <Loading message="Loading your dashboard..." />;

    return (
        <div>
            {/* Page Header */}
            <div className="d-flex align-items-center justify-content-between mb-4">
                <div className="d-flex align-items-center gap-3">
                    <span className="badge" style={{ background: '#EEEDFE', color: '#3C3489', fontSize: 13 }}>
                        Registrar
                    </span>
                    <h2 className="mb-0 text-primary-edulearn">Registrar Dashboard</h2>
                </div>
                <div className="d-flex align-items-center gap-3">
                    <small className="text-muted">
                        {today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </small>
                    <button
                        className="btn btn-primary-edulearn btn-sm"
                        onClick={openCreateUser}
                    >
                        <i className="bi bi-person-plus me-2"></i>Create Student User
                    </button>
                </div>
            </div>

            {/* Welcome Banner */}
            <div className="card shadow-sm mb-4 border-0 bg-light">
                <div className="card-body d-flex align-items-center justify-content-between">
                    <div>
                        <h4 className="mb-1">Welcome back, {username}! 👋</h4>
                        <p className="mb-0 text-muted">Term: {TERM} &nbsp;·&nbsp; Role: Registrar</p>
                    </div>
                    <i className="bi bi-clipboard-check text-muted" style={{ fontSize: '2.5rem', opacity: 0.3 }}></i>
                </div>
            </div>

            {/* Success Alert */}
            {createSuccess && (
                <div className="alert alert-success d-flex align-items-center justify-content-between mb-4">
                    <div>
                        <i className="bi bi-check-circle me-2"></i>
                        {createSuccess}
                        {createdUser && (
                            <div className="mt-1">
                                <small>
                                    <strong>Next step:</strong> Use User ID{' '}
                                    <code>#{createdUser.userId}</code> when creating the
                                    Student record at{' '}
                                    <button
                                        className="btn btn-link btn-sm p-0"
                                        onClick={() => navigate('/students/new')}
                                    >
                                        New Student →
                                    </button>
                                </small>
                            </div>
                        )}
                    </div>
                    <button className="btn-close" onClick={() => setCreateSuccess('')} />
                </div>
            )}

            {/* KPI Cards */}
            <div className="row g-3 mb-4">
                <div className="col-md-3 col-sm-6">
                    <div
                        className="card shadow-sm h-100 border-0 bg-light"
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate('/applicants')}
                    >
                        <div className="card-body">
                            <div className="text-muted small text-uppercase mb-1">Total Applicants</div>
                            <div className="display-5 fw-bold" style={{ color: '#534AB7' }}>
                                {stats.applicants ?? '—'}
                            </div>
                            <small className="text-muted">{stats.pendingReview ?? 0} pending review</small>
                        </div>
                    </div>
                </div>
                <div className="col-md-3 col-sm-6">
                    <div
                        className="card shadow-sm h-100 border-0 bg-light"
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate('/students')}
                    >
                        <div className="card-body">
                            <div className="text-muted small text-uppercase mb-1">Total Students</div>
                            <div className="display-5 fw-bold" style={{ color: '#185FA5' }}>
                                {stats.students ?? '—'}
                            </div>
                            <small className="text-muted">{stats.activeStudents ?? 0} active</small>
                        </div>
                    </div>
                </div>
                <div className="col-md-3 col-sm-6">
                    <div
                        className="card shadow-sm h-100 border-0 bg-light"
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate('/sections')}
                    >
                        <div className="card-body">
                            <div className="text-muted small text-uppercase mb-1">Sections</div>
                            <div className="display-5 fw-bold" style={{ color: '#3B6D11' }}>—</div>
                            <small className="text-muted">view sections</small>
                        </div>
                    </div>
                </div>
                <div className="col-md-3 col-sm-6">
                    <div
                        className="card shadow-sm h-100 border-0 bg-light"
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate('/enrollment')}
                    >
                        <div className="card-body">
                            <div className="text-muted small text-uppercase mb-1">Enrollments</div>
                            <div className="display-5 fw-bold" style={{ color: '#0F6E56' }}>—</div>
                            <small className="text-muted">this term</small>
                        </div>
                    </div>
                </div>
                <div className="col-md-3 col-sm-6">
                    <div
                        className="card shadow-sm h-100 border-0 bg-light"
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate('/transcripts')}
                    >
                        <div className="card-body">
                            <div className="text-muted small text-uppercase mb-1">Transcripts</div>
                            <div className="display-5 fw-bold" style={{ color: '#854F0B' }}>—</div>
                            <small className="text-muted">view transcripts</small>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Applicants + Quick Actions */}
            <div className="row g-3">
                {recentApplicants.length > 0 && (
                    <div className="col-lg-7">
                        <div className="card shadow-sm h-100">
                            <div className="card-header bg-light d-flex align-items-center justify-content-between">
                                <strong>
                                    <i className="bi bi-clock-history me-2"></i>Recent Applicants
                                </strong>
                                <button
                                    className="btn btn-sm btn-link p-0"
                                    onClick={() => navigate('/applicants')}
                                >
                                    View all <i className="bi bi-arrow-right"></i>
                                </button>
                            </div>
                            <div className="list-group list-group-flush">
                                {recentApplicants.map(a => (
                                    <div
                                        key={a.applicantID}
                                        className="list-group-item list-group-item-action"
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => navigate(`/applicants/${a.applicantID}`)}
                                    >
                                        <div className="d-flex align-items-center justify-content-between">
                                            <div>
                                                <div className="fw-bold">{a.name}</div>
                                                <small className="text-muted">
                                                    {a.programApplied} · {a.submittedAt
                                                        ? new Date(a.submittedAt).toLocaleDateString()
                                                        : '—'}
                                                </small>
                                            </div>
                                            <StatusBadge status={a.applicationStatus} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
                <div className={recentApplicants.length > 0 ? 'col-lg-5' : 'col-12'}>
                    <div className="card shadow-sm h-100">
                        <div className="card-header bg-light">
                            <strong><i className="bi bi-lightning me-2"></i>Quick Actions</strong>
                        </div>
                        <div className="card-body">
                            <div className="d-grid gap-2">
                                {/* Step 1 */}
                                <button
                                    className="btn btn-primary-edulearn btn-sm text-start"
                                    onClick={openCreateUser}
                                >
                                    <i className="bi bi-person-plus me-2"></i>
                                    Step 1 — Create Student User
                                </button>
                                {/* Step 2 */}
                                <button
                                    className="btn btn-outline-primary btn-sm text-start"
                                    onClick={() => navigate('/students/new')}
                                >
                                    <i className="bi bi-person-check me-2"></i>
                                    Step 2 — Create Student Record
                                </button>
                                <hr className="my-1" />
                                <button
                                    className="btn btn-outline-primary btn-sm text-start"
                                    onClick={() => navigate('/applicants/new')}
                                >
                                    <i className="bi bi-person-plus me-2"></i>New Applicant
                                </button>
                                <button
                                    className="btn btn-outline-primary btn-sm text-start"
                                    onClick={() => navigate('/students')}
                                >
                                    <i className="bi bi-people me-2"></i>View Students
                                </button>
                                <button
                                    className="btn btn-outline-primary btn-sm text-start"
                                    onClick={() => navigate('/sections')}
                                >
                                    <i className="bi bi-collection me-2"></i>Sections
                                </button>
                                <button
                                    className="btn btn-outline-primary btn-sm text-start"
                                    onClick={() => navigate('/enrollment')}
                                >
                                    <i className="bi bi-card-checklist me-2"></i>Enrollment
                                </button>
                                <button
                                    className="btn btn-outline-primary btn-sm text-start"
                                    onClick={() => navigate('/transcripts')}
                                >
                                    <i className="bi bi-file-earmark-text me-2"></i>Transcripts
                                </button>
                                <button
                                    className="btn btn-outline-primary btn-sm text-start"
                                    onClick={() => navigate('/plagiarism')}
                                >
                                    <i className="bi bi-shield-exclamation me-2"></i>Plagiarism
                                </button>
                                <button
                                    className="btn btn-outline-primary btn-sm text-start"
                                    onClick={() => navigate('/notifications')}
                                >
                                    <i className="bi bi-bell me-2"></i>Notifications
                                </button>
                                <button
                                    className="btn btn-outline-primary btn-sm text-start"
                                    onClick={() => navigate('/tickets')}
                                >
                                    <i className="bi bi-headset me-2"></i>Support Ticket
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Create Student User Modal ─────────────────────── */}
            {showCreateUser && (
                <>
                    <div className="modal-backdrop fade show"></div>
                    <div className="modal fade show d-block" tabIndex="-1">
                        <div className="modal-dialog modal-dialog-centered modal-lg">
                            <div className="modal-content">
                                <div className="modal-header bg-primary-edulearn text-white">
                                    <h5 className="modal-title">
                                        <i className="bi bi-person-plus me-2"></i>
                                        Create Student User Account
                                    </h5>
                                    <button
                                        type="button"
                                        className="btn-close btn-close-white"
                                        onClick={() => setShowCreateUser(false)}
                                        disabled={creating}
                                    />
                                </div>
                                <form onSubmit={handleCreateUser}>
                                    <div className="modal-body">

                                        {/* Info Banner */}
                                        <div className="alert alert-info mb-4">
                                            <i className="bi bi-info-circle me-2"></i>
                                            This registers a new user with <strong>Student role</strong> via{' '}
                                            <code>POST /api/auth/register</code>. The backend enforces
                                            Student role — no other role can be selected here.
                                            <br />
                                            <strong>After creation</strong>, use the returned{' '}
                                            <strong>User ID</strong> when creating the Student record
                                            at <em>Students → New Student</em>.
                                        </div>

                                        {/* Success inside modal (after creation, before closing) */}
                                        {createSuccess && createdUser && (
                                            <div className="alert alert-success mb-3">
                                                <i className="bi bi-check-circle me-2"></i>
                                                <strong>User created!</strong> User ID:{' '}
                                                <code className="fs-6">#{createdUser.userId}</code>
                                                <br />
                                                <small>Copy this ID — you will need it in the next step.</small>
                                            </div>
                                        )}

                                        <div className="row g-3">
                                            <div className="col-md-6">
                                                <label className="form-label fw-bold">
                                                    Username <span className="text-danger">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={userForm.username}
                                                    onChange={e => setUserForm({ ...userForm, username: e.target.value })}
                                                    placeholder="e.g. john.doe"
                                                    required
                                                    disabled={creating}
                                                />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label fw-bold">
                                                    Full Name <span className="text-danger">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={userForm.fullName}
                                                    onChange={e => setUserForm({ ...userForm, fullName: e.target.value })}
                                                    placeholder="e.g. John Doe"
                                                    required
                                                    disabled={creating}
                                                />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label fw-bold">
                                                    Email <span className="text-danger">*</span>
                                                </label>
                                                <input
                                                    type="email"
                                                    className="form-control"
                                                    value={userForm.email}
                                                    onChange={e => setUserForm({ ...userForm, email: e.target.value })}
                                                    placeholder="e.g. john@example.com"
                                                    required
                                                    disabled={creating}
                                                />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label fw-bold">Phone</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={userForm.phone}
                                                    onChange={e => setUserForm({ ...userForm, phone: e.target.value })}
                                                    placeholder="e.g. +91-9876543210"
                                                    disabled={creating}
                                                />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label fw-bold">
                                                    Password <span className="text-danger">*</span>
                                                    <small className="text-muted fw-normal ms-2">(min 8 chars)</small>
                                                </label>
                                                <input
                                                    type="password"
                                                    className="form-control"
                                                    value={userForm.password}
                                                    onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                                                    placeholder="Min 8 characters"
                                                    minLength={8}
                                                    required
                                                    disabled={creating}
                                                />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label fw-bold">Role</label>
                                                <input
                                                    type="text"
                                                    className="form-control bg-light"
                                                    value="Student (enforced by backend)"
                                                    readOnly
                                                />
                                                <div className="form-text text-muted">
                                                    <i className="bi bi-lock me-1"></i>
                                                    Role is always Student via this endpoint.
                                                </div>
                                            </div>
                                        </div>

                                        <ErrorAlert error={createError} onDismiss={() => setCreateError(null)} />
                                    </div>
                                    <div className="modal-footer">
                                        <button
                                            type="button"
                                            className="btn btn-outline-secondary"
                                            onClick={() => setShowCreateUser(false)}
                                            disabled={creating}
                                        >
                                            {createdUser ? 'Close' : 'Cancel'}
                                        </button>
                                        {createdUser ? (
                                            <button
                                                type="button"
                                                className="btn btn-success"
                                                onClick={() => {
                                                    setShowCreateUser(false);
                                                    navigate('/students/new');
                                                }}
                                            >
                                                <i className="bi bi-arrow-right me-2"></i>
                                                Go to Create Student Record
                                            </button>
                                        ) : (
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
                                                        Create Student User
                                                    </>
                                                )}
                                            </button>
                                        )}
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
