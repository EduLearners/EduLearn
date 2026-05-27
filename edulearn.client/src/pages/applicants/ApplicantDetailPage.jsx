import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { applicantService } from '../../services/applicantService';
import { authService } from '../../services/authService';
import Loading from '../../components/Loading';
import ErrorAlert from '../../components/ErrorAlert';
import StatusBadge from '../../components/StatusBadge';
import ConfirmDialog from '../../components/ConfirmDialog';
import ModalPortal from '../../components/ModalPortal';

const emptyUserForm = {
    username: '',
    fullName: '',
    email: '',
    phone: '',
    password: '',
    sendInvite: true,
};

export default function ApplicantDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [applicant, setApplicant] = useState(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [error, setError] = useState(null);
    const [confirmAction, setConfirmAction] = useState(null);

    // Create Student User modal state
    const [showUserModal, setShowUserModal] = useState(false);
    const [userForm, setUserForm] = useState(emptyUserForm);
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState(null);
    const [createSuccess, setCreateSuccess] = useState(null); // { userID, username }

    const { role } = authService.getCurrentUser();
    const canDecide = ['Registrar', 'ITAdmin'].includes(role);

    useEffect(() => {
        loadApplicant();
    }, [id]);

    const loadApplicant = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await applicantService.getById(id);
            setApplicant(data);
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async () => {
        if (!confirmAction) return;
        try {
            setUpdating(true);
            setError(null);
            await applicantService.updateStatus(id, confirmAction);
            setConfirmAction(null);
            await loadApplicant();
        } catch (err) {
            setError(err);
            setConfirmAction(null);
        } finally {
            setUpdating(false);
        }
    };

    // Open the Create Student User modal, pre-filling from applicant data
    const openUserModal = () => {
        const contactInfo = (() => {
            if (!applicant?.contactInfoJSON) return {};
            try { return JSON.parse(applicant.contactInfoJSON); } catch { return {}; }
        })();

        setUserForm({
            username: '',
            fullName: applicant.name || '',
            email: contactInfo.email || '',
            phone: contactInfo.phone || '',
            password: '',
            sendInvite: true,
        });
        setCreateError(null);
        setCreateSuccess(null);
        setShowUserModal(true);
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setCreateError(null);
        if (userForm.phone.length > 0) {
            if (!/^\d{10}$/.test(userForm.phone)) {
                setCreateError({ message: 'Phone number must be exactly 10 digits.' });
                return;
            }
        }
        if (!userForm.username.trim()) {
            setCreateError({ message: 'Username cannot be blank.' });
            return;
        }
        setCreating(true);

        try {
            const result = await authService.register({
                username: userForm.username,
                fullName: userForm.fullName,
                email: userForm.email,
                phone: userForm.phone || null,
                password: userForm.password,
                role: 'Student',       // always Student via this endpoint
                sendInvite: userForm.sendInvite,
            });

            // result contains { userID, username, message }
            setCreateSuccess(result);
        } catch (err) {
            setCreateError(err);
        } finally {
            setCreating(false);
        }
    };

    const handleGoToCreateRecord = () => {
        // phase4-fix-16: DOB removed from URL (PII in logs/history).
        // NewStudentPage resolves DOB server-side via applicantID.
        const params = new URLSearchParams({
            name: applicant.name || '',
            applicantID: applicant.applicantID,
        });
        navigate(`/students/new?${params.toString()}`);
    };

    const contactInfo = (() => {
        if (!applicant?.contactInfoJSON) return {};
        try { return JSON.parse(applicant.contactInfoJSON); } catch { return {}; }
    })();

    const documents = (() => {
        if (!applicant?.documentsURIJSON) return [];
        try {
            const parsed = JSON.parse(applicant.documentsURIJSON);
            return Array.isArray(parsed) ? parsed : [];
        } catch { return []; }
    })();

    if (loading) return <Loading message="Loading applicant..." />;

    if (error && !applicant) {
        return (
            <div>
                <button className="btn btn-link mb-3" onClick={() => navigate('/applicants')}>
                    <i className="bi bi-arrow-left me-1"></i>Back to Applicants
                </button>
                <ErrorAlert error={error} />
            </div>
        );
    }

    const confirmConfig = {
        Accepted: {
            title: 'Accept Applicant',
            message: `Are you sure you want to accept ${applicant.name}'s application for ${applicant.programApplied}?`,
            confirmText: 'Accept',
            confirmVariant: 'success',
        },
        Rejected: {
            title: 'Reject Applicant',
            message: `Are you sure you want to reject ${applicant.name}'s application? This cannot be easily undone.`,
            confirmText: 'Reject',
            confirmVariant: 'danger',
        },
        Waitlisted: {
            title: 'Waitlist Applicant',
            message: `Move ${applicant.name} to the waitlist for ${applicant.programApplied}?`,
            confirmText: 'Waitlist',
            confirmVariant: 'warning',
        },
        UnderReview: {
            title: 'Mark Under Review',
            message: `Move ${applicant.name}'s application to "Under Review"?`,
            confirmText: 'Mark Under Review',
            confirmVariant: 'info',
        },
    }[confirmAction] || {};

    const isTerminalStatus = ['Accepted', 'Rejected'].includes(applicant.applicationStatus);

    return (
        <div>
            <button className="btn btn-link p-0 mb-3" onClick={() => navigate('/applicants')}>
                <i className="bi bi-arrow-left me-1"></i>Back to Applicants
            </button>

            {/* Title */}
            <div className="d-flex align-items-center mb-4">
                <div
                    className="rounded-circle bg-primary-edulearn d-flex align-items-center justify-content-center me-3"
                    style={{ width: 60, height: 60 }}
                >
                    <i className="bi bi-person-fill text-white" style={{ fontSize: '2rem' }}></i>
                </div>
                <div>
                    <h2 className="mb-0 text-primary-edulearn">{applicant.name}</h2>
                    <div className="d-flex align-items-center gap-2 mt-1">
                        <span className="text-muted">Applicant #{applicant.applicantID}</span>
                        <StatusBadge status={applicant.applicationStatus} />
                    </div>
                </div>
            </div>

            <ErrorAlert error={error} onDismiss={() => setError(null)} />

            <div className="row g-4">
                {/* Personal Info */}
                <div className="col-md-6">
                    <div className="card shadow-sm h-100">
                        <div className="card-header bg-primary-edulearn text-white">
                            <i className="bi bi-person me-2"></i>Personal Information
                        </div>
                        <div className="card-body">
                            <dl className="row mb-0">
                                <dt className="col-sm-5 text-muted">Full Name</dt>
                                <dd className="col-sm-7">{applicant.name}</dd>
                                <dt className="col-sm-5 text-muted">Date of Birth</dt>
                                <dd className="col-sm-7">
                                    {applicant.dob ? new Date(applicant.dob).toLocaleDateString() : '—'}
                                </dd>
                                <dt className="col-sm-5 text-muted">National ID</dt>
                                <dd className="col-sm-7">
                                    {applicant.nationalID ? <code>{applicant.nationalID}</code> : '—'}
                                </dd>
                                <dt className="col-sm-5 text-muted">Email</dt>
                                <dd className="col-sm-7">{contactInfo.email || '—'}</dd>
                                <dt className="col-sm-5 text-muted">Phone</dt>
                                <dd className="col-sm-7">{contactInfo.phone || '—'}</dd>
                                <dt className="col-sm-5 text-muted">Address</dt>
                                <dd className="col-sm-7">{contactInfo.address || '—'}</dd>
                            </dl>
                        </div>
                    </div>
                </div>

                {/* Application Info */}
                <div className="col-md-6">
                    <div className="card shadow-sm h-100">
                        <div className="card-header bg-primary-edulearn text-white">
                            <i className="bi bi-file-earmark-text me-2"></i>Application Details
                        </div>
                        <div className="card-body">
                            <dl className="row mb-0">
                                <dt className="col-sm-5 text-muted">Program Applied</dt>
                                <dd className="col-sm-7 fw-bold">{applicant.programApplied}</dd>
                                <dt className="col-sm-5 text-muted">Status</dt>
                                <dd className="col-sm-7">
                                    <StatusBadge status={applicant.applicationStatus} />
                                </dd>
                                <dt className="col-sm-5 text-muted">Submitted</dt>
                                <dd className="col-sm-7">
                                    {applicant.submittedAt
                                        ? new Date(applicant.submittedAt).toLocaleString()
                                        : '—'}
                                </dd>
                            </dl>

                            {documents.length > 0 && (
                                <>
                                    <hr className="my-3" />
                                    <h6 className="text-muted mb-2">
                                        <i className="bi bi-paperclip me-2"></i>Documents
                                    </h6>
                                    <ul className="list-unstyled mb-0">
                                        {documents.map((doc, idx) => (
                                            <li key={idx} className="mb-1">
                                                <i className="bi bi-file-earmark me-2 text-muted"></i>
                                                {doc.uri ? (
                                                    <a href={doc.uri} target="_blank" rel="noreferrer">
                                                        {doc.name || `Document ${idx + 1}`}
                                                    </a>
                                                ) : (
                                                    <span>{doc.name || `Document ${idx + 1}`}</span>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Decision actions */}
            {canDecide && !isTerminalStatus && (
                <div className="card shadow-sm mt-4">
                    <div className="card-header bg-light">
                        <i className="bi bi-clipboard-check me-2"></i>Admission Decision
                    </div>
                    <div className="card-body">
                        <p className="text-muted mb-3">
                            Choose an action for this applicant. Accept and Reject are
                            terminal — they cannot be undone easily.
                        </p>
                        <div className="d-flex gap-2 flex-wrap">
                            {applicant.applicationStatus !== 'UnderReview' && (
                                <button
                                    className="btn btn-info text-white"
                                    onClick={() => setConfirmAction('UnderReview')}
                                    disabled={updating}
                                >
                                    <i className="bi bi-eye me-1"></i>Mark Under Review
                                </button>
                            )}
                            <button
                                className="btn btn-success"
                                onClick={() => setConfirmAction('Accepted')}
                                disabled={updating}
                            >
                                <i className="bi bi-check-circle me-1"></i>Accept
                            </button>
                            <button
                                className="btn btn-warning"
                                onClick={() => setConfirmAction('Waitlisted')}
                                disabled={updating}
                            >
                                <i className="bi bi-pause-circle me-1"></i>Waitlist
                            </button>
                            <button
                                className="btn btn-danger"
                                onClick={() => setConfirmAction('Rejected')}
                                disabled={updating}
                            >
                                <i className="bi bi-x-circle me-1"></i>Reject
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Accepted — show Create Student User Account button */}
            {applicant.applicationStatus === 'Accepted' && canDecide && (
                <div className="alert alert-success mt-4 mb-0">
                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
                        <div>
                            <i className="bi bi-check-circle me-2"></i>
                            <strong>Application Accepted.</strong> Next step: create a Student User Account
                            so the applicant can log in, then create their Student record.
                        </div>
                        <div className="d-flex gap-2 flex-wrap">
                            <button
                                className="btn btn-success"
                                onClick={openUserModal}
                            >
                                <i className="bi bi-person-plus me-2"></i>
                                Create Student User Account
                            </button>
                            <button
                                className="btn btn-outline-success"
                                onClick={handleGoToCreateRecord}
                            >
                                <i className="bi bi-card-list me-2"></i>
                                Create Student Record
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Rejected */}
            {applicant.applicationStatus === 'Rejected' && (
                <div className="alert alert-secondary mt-4">
                    <i className="bi bi-x-circle me-2"></i>
                    This application has been <strong>Rejected</strong>.
                </div>
            )}

            {/* ── Create Student User Account Modal ────────────────── */}
            {showUserModal && (
                <ModalPortal>
                    <div className="modal-backdrop fade show"></div>
                    <div className="modal fade show d-flex align-items-center justify-content-center" tabIndex="-1" style={{ minHeight: '100vh' }}>
                        <div className="modal-dialog modal-lg w-100" style={{ margin: '1rem auto' }}>
                            <div className="modal-content">
                                <div className="modal-header bg-primary-edulearn text-white">
                                    <h5 className="modal-title">
                                        <i className="bi bi-person-plus me-2"></i>
                                        Create Student User Account
                                    </h5>
                                    <button
                                        type="button"
                                        className="btn-close btn-close-white"
                                        onClick={() => { setShowUserModal(false); setCreateSuccess(null); }}
                                        disabled={creating}
                                    />
                                </div>

                                <div className="modal-body">
                                    {/* Success state */}
                                    {createSuccess ? (
                                        <div>
                                            <div className="alert alert-success">
                                                <i className="bi bi-check-circle-fill me-2"></i>
                                                <strong>Student user account created successfully!</strong>
                                            </div>
                                            <dl className="row">
                                                <dt className="col-sm-4 text-muted">User ID</dt>
                                                <dd className="col-sm-8">
                                                    <code className="text-primary-edulearn fw-bold fs-5">
                                                        {createSuccess.userID ?? createSuccess.userId ?? createSuccess.id ?? '—'}
                                                    </code>
                                                    <span className="ms-2 badge bg-info text-dark">
                                                        Use this when creating the Student record
                                                    </span>
                                                </dd>
                                                <dt className="col-sm-4 text-muted">Username</dt>
                                                <dd className="col-sm-8"><code>{createSuccess.username}</code></dd>
                                            </dl>
                                            <div className="alert alert-info mb-0">
                                                <i className="bi bi-arrow-right-circle me-2"></i>
                                                <strong>Next:</strong> Go to <strong>Students → New Student</strong> and
                                                select this user account to create the Student record.
                                            </div>
                                        </div>
                                    ) : (
                                        /* Form state */
                                        <form onSubmit={handleCreateUser} autoComplete="off" id="createUserForm">
                                            <div className="alert alert-info mb-4">
                                                <i className="bi bi-info-circle me-2"></i>
                                                This registers a new user with <strong>Student role</strong> 
                                                {/* <br /> */}
                                                {/* <strong>After creation</strong>, use the returned <strong>User ID</strong> when
                                                creating the Student record at <em>Students → New Student</em>. */}
                                            </div>
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
                                                        placeholder="e.g. vikash.kumar"
                                                        maxLength={100}
                                                        required
                                                        autoComplete="off"
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
                                                        placeholder="e.g. Vikash Kumar"
                                                        maxLength={200}
                                                        required
                                                        autoComplete="off"
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
                                                        onChange={e => setUserForm({ ...userForm, email: e.target.value.toLowerCase() })}
                                                        placeholder="e.g. vikash@example.com"
                                                        maxLength={255}
                                                        required
                                                        autoComplete="off"
                                                    />
                                                </div>

                                                <div className="col-md-6">
                                                    <label className="form-label fw-bold">Phone</label>
                                                    <input
                                                        type="text"
                                                        className={`form-control ${userForm.phone.length > 0 && !/^\d{10}$/.test(userForm.phone) ? 'is-invalid' : ''}`}
                                                        value={userForm.phone}
                                                        onChange={e => setUserForm({ ...userForm, phone: e.target.value })}
                                                        placeholder="9876543210"
                                                        maxLength={15}
                                                        autoComplete="off"
                                                    />
                                                    {userForm.phone.length > 0 && !/^\d{10}$/.test(userForm.phone) && (
                                                        <div className="invalid-feedback">
                                                            <i className="bi bi-exclamation-circle me-1"></i>
                                                            Phone must be exactly 10 digits.
                                                        </div>
                                                    )}
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
                                                        autoComplete="new-password"
                                                    />
                                                </div>

                                                <div className="col-md-6">
                                                    <label className="form-label fw-bold">Role</label>
                                                    <div className="form-control bg-light text-muted">
                                                        Student {/* //(enforced by backend) */}
                                                    </div>
                                                    <small className="text-muted">
                                                        <i className="bi bi-lock me-1"></i>
                                                        Role is always Student via this endpoint.
                                                    </small>
                                                </div>

                                                <div className="col-12">
                                                    <div className="form-check">
                                                        <input
                                                            className="form-check-input"
                                                            type="checkbox"
                                                            id="sendInvite"
                                                            checked={userForm.sendInvite}
                                                            onChange={e => setUserForm({ ...userForm, sendInvite: e.target.checked })}
                                                        />
                                                        <label className="form-check-label fw-bold" htmlFor="sendInvite">
                                                            <i className="bi bi-envelope me-2"></i>Send welcome email
                                                        </label>
                                                        <div className="text-muted small">
                                                            Sends login details (username, login URL and temporary password) to the student's email.
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <ErrorAlert error={createError} onDismiss={() => setCreateError(null)} />
                                        </form>
                                    )}
                                </div>

                                <div className="modal-footer">
                                    {createSuccess ? (
                                        <>
                                            <button
                                                type="button"
                                                className="btn btn-outline-secondary"
                                                onClick={() => { setShowUserModal(false); setCreateSuccess(null); }}
                                            >
                                                Close
                                            </button>
                                            <button
                                                type="button"
                                                className="btn btn-primary-edulearn"
                                                onClick={() => { setShowUserModal(false); handleGoToCreateRecord(); }}
                                            >
                                                <i className="bi bi-arrow-right me-2"></i>
                                                Go to Create Student Record
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                type="button"
                                                className="btn btn-outline-secondary"
                                                onClick={() => setShowUserModal(false)}
                                                disabled={creating}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                form="createUserForm"
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
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}

            <ConfirmDialog
                show={!!confirmAction}
                title={confirmConfig.title}
                message={confirmConfig.message}
                onConfirm={handleUpdateStatus}
                onCancel={() => setConfirmAction(null)}
                confirmText={confirmConfig.confirmText}
                confirmVariant={confirmConfig.confirmVariant}
            />
        </div>
    );
}
