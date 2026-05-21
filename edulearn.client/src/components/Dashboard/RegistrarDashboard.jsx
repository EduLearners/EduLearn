import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { applicantService } from '../../services/applicantService';
import { studentService } from '../../services/studentService';
import { sectionService } from '../../services/sectionService';
import { enrollmentService } from '../../services/enrollmentService';
import { transcriptService } from '../../services/transcriptService';
import { courseService } from '../../services/courseService';
import Loading from '../Loading';
import ErrorAlert from '../ErrorAlert';
import StatusBadge from '../StatusBadge';
import ModalPortal from '../ModalPortal';
import axiosClient from '../../api/axiosClient';
import './RoleDashboard.css';

const TERM = '2026-Spring';

const QUICK_ACTIONS = [
    { label: 'New Applicant',  icon: 'bi-person-plus',        path: '/applicants/new' },
    { label: 'View Students',  icon: 'bi-people',             path: '/students'       },
    { label: 'Sections',       icon: 'bi-collection',         path: '/sections'       },
    { label: 'Enrollment',     icon: 'bi-card-checklist',     path: '/enrollment'     },
    { label: 'Transcripts',    icon: 'bi-file-earmark-text',  path: '/transcripts'    },
    { label: 'Timetable',      icon: 'bi-calendar3',          path: '/timetable'      },
    { label: 'Notifications',  icon: 'bi-bell',               path: '/notifications'  },
    { label: 'Support Ticket', icon: 'bi-headset',            path: '/tickets'        },
];

const STAT_CARDS = [
    { key: 'applicants',  label: 'Total Applicants', sub: (s) => `${s.pendingReview ?? 0} pending review`,     icon: 'bi-person-plus-fill',  accent: '#534AB7', iconBg: '#ede9fe', iconColor: '#534AB7', path: '/applicants'  },
    { key: 'students',    label: 'Total Students',   sub: (s) => `${s.activeStudents ?? 0} active`,            icon: 'bi-people-fill',       accent: '#185FA5', iconBg: '#dbeafe', iconColor: '#185FA5', path: '/students'    },
    { key: 'sections',    label: 'Sections',         sub: () => `${TERM}`,                                     icon: 'bi-collection-fill',   accent: '#3B6D11', iconBg: '#dcfce7', iconColor: '#3B6D11', path: '/sections'    },
    { key: 'enrollments', label: 'Enrollments',      sub: () => 'active this term',                            icon: 'bi-card-checklist',    accent: '#0F6E56', iconBg: '#d1fae5', iconColor: '#0F6E56', path: '/enrollment'  },
    { key: 'transcripts', label: 'Transcripts',      sub: (s) => `${s.publishedTranscripts ?? 0} published`,  icon: 'bi-file-earmark-text', accent: '#854F0B', iconBg: '#fef3c7', iconColor: '#854F0B', path: '/transcripts' },
];

const EMPTY_USER_FORM = { username: '', fullName: '', email: '', phone: '', password: '', sendInvite: true };

export default function RegistrarDashboard() {
    const navigate = useNavigate();
    const { username } = authService.getCurrentUser();
    const [stats, setStats] = useState({});
    const [recentApplicants, setRecentApplicants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateUser, setShowCreateUser] = useState(false);
    const [userForm, setUserForm] = useState(EMPTY_USER_FORM);
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState(null);
    const [createSuccess, setCreateSuccess] = useState('');
    const [createdUser, setCreatedUser] = useState(null);
    const today = new Date();

    useEffect(() => { loadStats(); }, []);

    const loadStats = async () => {
        setLoading(true);
        const s = {};
        try {
            const [applicants, students, courses] = await Promise.allSettled([
                applicantService.getAll(),
                studentService.getAll(),
                courseService.getAll(),
            ]);

            // Applicants
            if (applicants.status === 'fulfilled') {
                const d = applicants.value || [];
                s.applicants = d.length;
                s.pendingReview = d.filter(a => a.applicationStatus === 'Submitted' || a.applicationStatus === 'UnderReview').length;
                setRecentApplicants([...d].sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)).slice(0, 5));
            }

            // Students
            let studentList = [];
            if (students.status === 'fulfilled') {
                studentList = students.value || [];
                s.students = studentList.length;
                s.activeStudents = studentList.filter(st => st.enrollmentStatus === 'Active').length;
            }

            // Sections — fetch per course for this term in parallel
            let allSections = [];
            if (courses.status === 'fulfilled') {
                const courseList = courses.value || [];
                const sectionResults = await Promise.allSettled(
                    courseList.map(c => sectionService.getByCourseAndTerm(c.courseID, TERM).catch(() => []))
                );
                allSections = sectionResults
                    .filter(r => r.status === 'fulfilled')
                    .flatMap(r => r.value || []);
                s.sections = allSections.length;
            }

            // Enrollments — fetch per section in parallel
            if (allSections.length > 0) {
                const enrollResults = await Promise.allSettled(
                    allSections.map(sec => enrollmentService.getBySection(sec.sectionID).catch(() => []))
                );
                const allEnrollments = enrollResults
                    .filter(r => r.status === 'fulfilled')
                    .flatMap(r => r.value || []);
                s.enrollments = allEnrollments.filter(e => e.status === 'Enrolled').length;
            }

            // Transcripts — fetch per student in parallel (cap at 50 students to avoid overload)
            if (studentList.length > 0) {
                const transcriptResults = await Promise.allSettled(
                    studentList.slice(0, 50).map(st => transcriptService.getByStudent(st.studentID).catch(() => []))
                );
                const allTranscripts = transcriptResults
                    .filter(r => r.status === 'fulfilled')
                    .flatMap(r => r.value || []);
                s.transcripts = allTranscripts.length;
                s.publishedTranscripts = allTranscripts.filter(t => t.status === 'Published').length;
            }

        } catch { }
        setStats(s);
        setLoading(false);
    };

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
                sendInvite: userForm.sendInvite,
            });
            setCreatedUser(data);
            setCreateSuccess(
                userForm.sendInvite
                    ? `User "${userForm.username}" created. Welcome email sent to ${userForm.email}. User ID: ${data.userId}`
                    : `User "${userForm.username}" created successfully. User ID: ${data.userId}`
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
        <div className="role-dashboard">
            {/* Hero */}
            <div className="rd-hero">
                <div style={{ position: 'relative', zIndex: 1 }}>
                    <span className="rd-hero-badge">Registrar · {TERM}</span>
                    <div className="rd-hero-title">Welcome back, {username}! 👋</div>
                    <p className="rd-hero-sub">
                        {today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>
                <div className="d-flex flex-column align-items-end gap-2" style={{ position: 'relative', zIndex: 1 }}>
                    <i className="bi bi-clipboard-check rd-hero-icon"></i>
                    <button className="rd-hero-btn" onClick={openCreateUser}>
                        <i className="bi bi-person-plus me-2"></i>Create Student User
                    </button>
                </div>
            </div>

            {/* Success alert */}
            {createSuccess && (
                <div className="rd-success-alert">
                    <div>
                        <i className="bi bi-check-circle-fill me-2"></i>{createSuccess}
                        {createdUser && (
                            <div className="mt-1">
                                <small>
                                    <strong>Next:</strong> Use User ID <code>{createdUser.userId}</code> when creating the Student record at{' '}
                                    <button className="btn btn-link btn-sm p-0" style={{ color: '#065f46' }} onClick={() => navigate('/students/new')}>New Student →</button>
                                </small>
                            </div>
                        )}
                    </div>
                    <button className="btn-close" style={{ filter: 'invert(30%) sepia(1) saturate(3) hue-rotate(110deg)' }} onClick={() => setCreateSuccess('')} />
                </div>
            )}

            {/* Stat Cards */}
            <div className="row g-3 mb-4">
                {STAT_CARDS.map((card) => (
                    <div key={card.key} className="col">
                        <div className="rd-stat-card" style={{ '--rd-accent': card.accent }} onClick={() => navigate(card.path)}>
                            <div>
                                <div className="rd-stat-label">{card.label}</div>
                                <div className="rd-stat-value" style={{ color: card.accent }}>
                                    {stats[card.key] ?? '—'}
                                </div>
                                <div className="rd-stat-sub">{card.sub(stats)}</div>
                            </div>
                            <div className="rd-stat-icon-wrap" style={{ background: card.iconBg, color: card.iconColor }}>
                                <i className={`bi ${card.icon}`}></i>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Recent Applicants + Quick Actions */}
            <div className="row g-3">
                {recentApplicants.length > 0 && (
                    <div className="col-lg-7">
                        <div className="rd-card h-100">
                            <div className="rd-card-header">
                                <span className="rd-card-header-title"><i className="bi bi-clock-history me-2"></i>Recent Applicants</span>
                                <button className="btn btn-sm btn-link p-0 text-decoration-none" style={{ color: '#185FA5', fontSize: '0.8rem' }} onClick={() => navigate('/applicants')}>
                                    View all <i className="bi bi-arrow-right ms-1"></i>
                                </button>
                            </div>
                            <div>
                                {recentApplicants.map(a => (
                                    <div key={a.applicantID} className="rd-list-row" onClick={() => navigate(`/applicants/${a.applicantID}`)}>
                                        <div>
                                            <div className="rd-list-title">{a.name}</div>
                                            <div className="rd-list-meta">{a.programApplied} · {a.submittedAt ? new Date(a.submittedAt).toLocaleDateString() : '—'}</div>
                                        </div>
                                        <StatusBadge status={a.applicationStatus} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
                <div className={recentApplicants.length > 0 ? 'col-lg-5' : 'col-12'}>
                    <div className="rd-card h-100">
                        <div className="rd-card-header">
                            <span className="rd-card-header-title"><i className="bi bi-lightning-fill me-2"></i>Quick Actions</span>
                        </div>
                        <div className="rd-qa-grid">
                            <button className="rd-qa-btn" style={{ gridColumn: '1 / -1', background: '#e8f0fc', borderColor: '#185FA5', color: '#185FA5' }} onClick={openCreateUser}>
                                <i className="bi bi-person-plus"></i>Step 1 — Create Student User
                            </button>
                            <button className="rd-qa-btn" style={{ gridColumn: '1 / -1' }} onClick={() => navigate('/students/new')}>
                                <i className="bi bi-person-check"></i>Step 2 — Create Student Record
                            </button>
                            {QUICK_ACTIONS.map((a) => (
                                <button key={a.path + a.label} className="rd-qa-btn" onClick={() => navigate(a.path)}>
                                    <i className={`bi ${a.icon}`}></i>{a.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Create Student User Modal */}
            {showCreateUser && (
                <ModalPortal>
                    <div className="modal-backdrop fade show"></div>
                    <div className="modal fade show d-block" tabIndex="-1">
                        <div className="modal-dialog modal-dialog-centered modal-lg">
                            <div className="modal-content">
                                <div className="modal-header bg-primary-edulearn text-white">
                                    <h5 className="modal-title"><i className="bi bi-person-plus me-2"></i>Create Student User Account</h5>
                                    <button type="button" className="btn-close btn-close-white" onClick={() => setShowCreateUser(false)} disabled={creating} />
                                </div>
                                <form onSubmit={handleCreateUser}>
                                    <div className="modal-body">
                                        <div className="alert alert-info mb-3">
                                            <i className="bi bi-info-circle me-2"></i>
                                            Registers a new user with <strong>Student role</strong>. After creation, use the returned <strong>User ID</strong> when creating the Student record at <em>Students → New Student</em>.
                                        </div>
                                        {createSuccess && createdUser && (
                                            <div className="alert alert-success mb-3">
                                                <i className="bi bi-check-circle me-2"></i>
                                                <strong>User created!</strong> User ID: <code className="fs-6">{createdUser.userId}</code>
                                                <br /><small>Copy this ID — you will need it in the next step.</small>
                                            </div>
                                        )}
                                        <div className="row g-3">
                                            <div className="col-md-6">
                                                <label className="form-label fw-bold">Username <span className="text-danger">*</span></label>
                                                <input type="text" className="form-control" value={userForm.username} onChange={e => setUserForm({ ...userForm, username: e.target.value })} placeholder="e.g. john.doe" required disabled={creating} />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label fw-bold">Full Name <span className="text-danger">*</span></label>
                                                <input type="text" className="form-control" value={userForm.fullName} onChange={e => setUserForm({ ...userForm, fullName: e.target.value })} placeholder="e.g. John Doe" required disabled={creating} />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label fw-bold">Email <span className="text-danger">*</span></label>
                                                <input type="email" className="form-control" value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} placeholder="e.g. john@example.com" required disabled={creating} />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label fw-bold">Phone</label>
                                                <input type="text" className="form-control" value={userForm.phone} onChange={e => setUserForm({ ...userForm, phone: e.target.value })} placeholder="e.g. +91-9876543210" disabled={creating} />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label fw-bold">Password <span className="text-danger">*</span> <small className="text-muted fw-normal">(min 8 chars)</small></label>
                                                <input type="password" className="form-control" value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} placeholder="Min 8 characters" minLength={8} required disabled={creating} />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label fw-bold">Role</label>
                                                <input type="text" className="form-control bg-light" value="Student (enforced by backend)" readOnly />
                                            </div>
                                            <div className="col-12">
                                                <div className="p-3 bg-light rounded d-flex align-items-start gap-3">
                                                    <input type="checkbox" className="form-check-input mt-1" id="sendInviteRegistrar" checked={userForm.sendInvite} onChange={e => setUserForm({ ...userForm, sendInvite: e.target.checked })} disabled={creating} />
                                                    <label htmlFor="sendInviteRegistrar" style={{ cursor: 'pointer' }}>
                                                        <div className="fw-bold"><i className="bi bi-envelope me-2"></i>Send welcome email</div>
                                                        <small className="text-muted">Sends login details to {userForm.email || "the student's email"}.</small>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                        <ErrorAlert error={createError} onDismiss={() => setCreateError(null)} />
                                    </div>
                                    <div className="modal-footer">
                                        <button type="button" className="btn btn-outline-secondary" onClick={() => setShowCreateUser(false)} disabled={creating}>
                                            {createdUser ? 'Close' : 'Cancel'}
                                        </button>
                                        {createdUser ? (
                                            <button type="button" className="btn btn-success" onClick={() => { setShowCreateUser(false); navigate('/students/new'); }}>
                                                <i className="bi bi-arrow-right me-2"></i>Go to Create Student Record
                                            </button>
                                        ) : (
                                            <button type="submit" className="btn btn-primary-edulearn" disabled={creating}>
                                                {creating ? <><span className="spinner-border spinner-border-sm me-2"></span>Creating...</> : <><i className="bi bi-check-lg me-2"></i>Create Student User</>}
                                            </button>
                                        )}
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
