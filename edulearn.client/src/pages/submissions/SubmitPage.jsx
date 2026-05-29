import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { assessmentService } from '../../services/assessmentService';
import { submissionService } from '../../services/submissionService';
import { authService } from '../../services/authService';
import { emptySubmission } from '../../models/Assessment';
import ErrorAlert from '../../components/ErrorAlert';
import Loading from '../../components/Loading';
import axiosClient from '../../api/axiosClient';
import { validateOptionalUrl } from '../../utils/validators';

export default function SubmitPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { role } = authService.getCurrentUser();

    const [assessment, setAssessment] = useState(null);
    const [studentID, setStudentID] = useState(null);
    const [form, setForm] = useState(emptySubmission());
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);
    const [errors, setErrors] = useState({});
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState('');

    const isStudent = role === 'Student';

    useEffect(() => { loadData(); }, [id]);

    const loadData = async () => {
        try {
            setPageLoading(true);
            setError(null);

            const [assessmentData, studentData] = await Promise.allSettled([
                assessmentService.getById(id),
                axiosClient.get('/students/me').then(r => r.data),
            ]);

            if (assessmentData.status === 'fulfilled') {
                setAssessment(assessmentData.value);
            } else {
                throw assessmentData.reason;
            }

            if (studentData.status === 'fulfilled') {
                setStudentID(studentData.value.studentID);
                setForm(prev => ({
                    ...prev,
                    assessmentID: assessmentData.value?.assessmentID || Number(id),
                    studentID: studentData.value.studentID,
                }));
            } else {
                throw new Error('Could not load your student record. Please contact support.');
            }
        } catch (err) {
            setError(err);
        } finally {
            setPageLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        // clear error as user types
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess('');

        const urlError = validateOptionalUrl(form.fileURI);
        if (urlError) {
            setErrors({ fileURI: urlError });
            return;
        }

        // Late submission warning
        if (assessment?.dueAt && new Date() > new Date(assessment.dueAt)) {
            if (!window.confirm('This assessment deadline has passed. Submit anyway?')) return;
        }

        setLoading(true);

        const payload = {
            assessmentID: form.assessmentID,
            studentID: studentID,
            fileURI: form.fileURI.trim() || null,
        };

        try {
            await submissionService.create(payload);
            setSuccess('Your submission has been received successfully.');
            setTimeout(() => navigate(`/assessments/${id}`), 1500);
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    if (!isStudent) {
        return (
            <div className="alert alert-danger">
                <i className="bi bi-shield-x me-2"></i>
                Only students can submit assessments.
            </div>
        );
    }

    if (pageLoading) return <Loading message="Loading assessment..." />;

    const urlValue = form.fileURI || '';
    const urlIsValid = urlValue.trim() && !validateOptionalUrl(urlValue);

    return (
        <div>
            {/* Page header */}
            <div className="d-flex align-items-center justify-content-between mb-4">
                <h2 className="text-primary-edulearn mb-0">
                    <i className="bi bi-cloud-upload me-2"></i>
                    Submit Assessment
                </h2>
                <button
                    className="btn btn-outline-secondary"
                    onClick={() => navigate(`/assessments/${id}`)}
                >
                    <i className="bi bi-arrow-left me-1"></i>Back
                </button>
            </div>

            {/* Assessment info banner */}
            {assessment && (
                <div className="alert alert-info mb-4">
                    <div className="row align-items-center">
                        <div className="col-md-7">
                            <div className="fw-bold">
                                <i className="bi bi-file-earmark-text me-2"></i>
                                {assessment.title}
                            </div>
                            <div className="mt-1">
                                <span className="badge bg-secondary me-2">{assessment.type}</span>
                                <small className="text-muted">Max Score: {assessment.maxScore}</small>
                            </div>
                            {assessment.instructionsURI && (
                                <div className="mt-2">
                                    <a
                                        href={assessment.instructionsURI}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn btn-sm btn-primary-edulearn"
                                    >
                                        <i className="bi bi-file-earmark-text me-1"></i>
                                        View Assessment Brief
                                    </a>
                                </div>
                            )}
                        </div>
                        <div className="col-md-5 text-md-end mt-2 mt-md-0">
                            {assessment.dueAt ? (
                                <small className={new Date() > new Date(assessment.dueAt) ? 'text-danger fw-bold' : 'text-muted'}>
                                    <i className="bi bi-calendar3 me-1"></i>
                                    Due: {new Date(assessment.dueAt).toLocaleString('en-US', {
                                        year: 'numeric', month: 'long', day: 'numeric',
                                        hour: '2-digit', minute: '2-digit',
                                    })}
                                    {new Date() > new Date(assessment.dueAt) && (
                                        <span className="ms-2 badge bg-danger">Overdue</span>
                                    )}
                                </small>
                            ) : (
                                <small className="text-muted">
                                    <i className="bi bi-calendar3 me-1"></i>No due date set
                                </small>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {success && (
                <div className="alert alert-success">
                    <i className="bi bi-check-circle me-2"></i>{success}
                </div>
            )}

            <ErrorAlert error={error} onDismiss={() => setError(null)} />

            <div className="card shadow-sm">
                <div className="card-header bg-primary-edulearn text-white">
                    <strong>
                        <i className="bi bi-pencil-square me-2"></i>
                        Your Submission
                    </strong>
                </div>
                <div className="card-body">
                    <form onSubmit={handleSubmit} noValidate>
                        <div className="row g-4">

                            {/* Submission URL field */}
                            <div className="col-12">
                                <label className="form-label fw-bold fs-6">
                                    <i className="bi bi-link-45deg me-1"></i>
                                    Submission URL
                                    <span className="text-muted fw-normal ms-2 small">
                                        (optional — leave blank if submitting in person)
                                    </span>
                                </label>

                                <div className={`input-group${errors.fileURI ? ' has-validation' : ''}`}>
                                    <span className="input-group-text bg-white">
                                        <i className="bi bi-link-45deg text-primary-edulearn"></i>
                                    </span>
                                    <input
                                        type="text"
                                        className={`form-control form-control-lg${errors.fileURI ? ' is-invalid' : urlIsValid ? ' is-valid' : ''}`}
                                        name="fileURI"
                                        value={urlValue}
                                        onChange={handleChange}
                                        onBlur={e => setErrors(prev => ({
                                            ...prev,
                                            fileURI: validateOptionalUrl(e.target.value)
                                        }))}
                                        placeholder="https://drive.google.com/file/... or https://github.com/..."
                                        maxLength={500}
                                        autoComplete="off"
                                        spellCheck={false}
                                    />
                                    {urlIsValid && (
                                        <span className="input-group-text bg-white text-success">
                                            <i className="bi bi-check-circle-fill"></i>
                                        </span>
                                    )}
                                    {errors.fileURI && (
                                        <div className="invalid-feedback">
                                            <i className="bi bi-exclamation-circle me-1"></i>
                                            {errors.fileURI}
                                        </div>
                                    )}
                                </div>

                                {/* Live URL preview */}
                                {urlIsValid && (() => {
                                    try {
                                        const parsed = new URL(urlValue.trim());
                                        return (
                                            <div className="mt-2 p-2 bg-light border rounded d-flex align-items-center gap-2">
                                                <i className="bi bi-globe text-muted small"></i>
                                                <small className="text-muted">
                                                    <strong>{parsed.hostname}</strong>
                                                    {parsed.pathname !== '/' && (
                                                        <span className="text-truncate ms-1" style={{ maxWidth: 300, display: 'inline-block', verticalAlign: 'middle' }}>
                                                            {parsed.pathname}
                                                        </span>
                                                    )}
                                                </small>
                                                <a
                                                    href={urlValue.trim()}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="btn btn-outline-secondary btn-sm ms-auto"
                                                    onClick={e => e.stopPropagation()}
                                                >
                                                    <i className="bi bi-box-arrow-up-right me-1"></i>Test link
                                                </a>
                                            </div>
                                        );
                                    } catch { return null; }
                                })()}

                                {/* Helper text with examples */}
                                {!errors.fileURI && (
                                    <div className="form-text mt-2">
                                        <i className="bi bi-info-circle me-1"></i>
                                        Paste a <strong>shareable link</strong> to your work. Accepted sources:
                                        <span className="ms-1">
                                            Google Drive · OneDrive · GitHub · Dropbox · any public URL
                                        </span>
                                        <div className="mt-1 text-muted" style={{ fontSize: '0.78rem' }}>
                                            Make sure the link is set to <strong>"Anyone with the link can view"</strong> before submitting.
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Plagiarism declaration */}
                            <div className="col-12">
                                <div className="form-check">
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        id="confirmOriginal"
                                        required
                                    />
                                    <label className="form-check-label" htmlFor="confirmOriginal">
                                        I confirm this is my own original work and I have not plagiarised from any source.
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="d-flex gap-2 mt-4">
                            <button
                                type="submit"
                                className="btn btn-primary-edulearn"
                                disabled={loading || !studentID}
                            >
                                {loading ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2"></span>
                                        Submitting...
                                    </>
                                ) : (
                                    <>
                                        <i className="bi bi-cloud-upload me-2"></i>
                                        Submit Assessment
                                    </>
                                )}
                            </button>
                            <button
                                type="button"
                                className="btn btn-outline-secondary"
                                onClick={() => navigate(`/assessments/${id}`)}
                                disabled={loading}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
