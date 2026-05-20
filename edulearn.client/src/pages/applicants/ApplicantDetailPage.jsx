import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { applicantService } from '../../services/applicantService';
import { authService } from '../../services/authService';
import Loading from '../../components/Loading';
import ErrorAlert from '../../components/ErrorAlert';
import StatusBadge from '../../components/StatusBadge';
import ConfirmDialog from '../../components/ConfirmDialog';

export default function ApplicantDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [applicant, setApplicant] = useState(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [error, setError] = useState(null);
    const [confirmAction, setConfirmAction] = useState(null);

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

    const handleCreateStudent = () => {
        // Pass applicant name and dob as query params to pre-fill NewStudentPage
        const params = new URLSearchParams({
            name: applicant.name || '',
            dob: applicant.dob ? applicant.dob.split('T')[0] : '',
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
                                    {applicant.dob
                                        ? new Date(applicant.dob).toLocaleDateString()
                                        : '—'}
                                </dd>

                                <dt className="col-sm-5 text-muted">National ID</dt>
                                <dd className="col-sm-7">
                                    {applicant.nationalID
                                        ? <code>{applicant.nationalID}</code>
                                        : '—'}
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

            {/* Accepted — show Create Student Record button */}
            {applicant.applicationStatus === 'Accepted' && canDecide && (
                <div className="alert alert-success mt-4">
                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
                        <div>
                            <i className="bi bi-check-circle me-2"></i>
                            <strong>Application Accepted.</strong> Next step: create a
                            Student record linked to a User account.
                        </div>
                        <button
                            className="btn btn-success"
                            onClick={handleCreateStudent}
                        >
                            <i className="bi bi-person-plus me-2"></i>
                            Create Student Record
                        </button>
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