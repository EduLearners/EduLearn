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
    const { role, userId } = authService.getCurrentUser();

    const [assessment, setAssessment] = useState(null);
    const [studentID, setStudentID] = useState(null);
    const [form, setForm] = useState(emptySubmission());
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);
    const [errors, setErrors] = useState({});
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState('');

    const isStudent = role === 'Student';

    useEffect(() => {
        loadData();
    }, [id]);

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
    };

    // FIX: Validate that fileURI looks like a proper URL when provided
    const fileURIInvalid = !!validateOptionalUrl(form.fileURI);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess('');

        // FIX: Block if fileURI is provided but doesn't look like a URL
        const nextErrors = { fileURI: validateOptionalUrl(form.fileURI) };
        if (Object.values(nextErrors).some(Boolean)) { setErrors(nextErrors); return; }

        // AC-2: Late submission warning
        if (assessment?.dueAt && new Date() > new Date(assessment.dueAt)) {
            if (!window.confirm('This assessment deadline has passed. Submit anyway?')) {
                return;
            }
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

    return (
        <div>
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

            {assessment && (
                <div className="alert alert-info mb-4">
                    <div className="row">
                        <div className="col-md-6">
                            <strong>
                                <i className="bi bi-file-earmark-text me-2"></i>
                                {assessment.title}
                            </strong>
                            <div className="mt-1">
                                <span className="badge bg-secondary me-2">{assessment.type}</span>
                                <small className="text-muted">Max Score: {assessment.maxScore}</small>
                            </div>
                        </div>
                        <div className="col-md-6 text-md-end">
                            <small className="text-muted">
                                <i className="bi bi-calendar3 me-1"></i>
                                Due:{' '}
                                {assessment.dueAt
                                    ? new Date(assessment.dueAt).toLocaleString('en-US', {
                                        year: 'numeric', month: 'long', day: 'numeric',
                                        hour: '2-digit', minute: '2-digit',
                                    })
                                    : 'No due date set'}
                            </small>
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
                    <form onSubmit={handleSubmit}>
                        <div className="row g-3">

                            {/* FIX: Changed type to "url" and added live URL validation */}
                            <div className="col-12">
                                <label className="form-label fw-bold">
                                    File Link
                                    <small className="text-muted fw-normal ms-2">
                                        (paste a link to your file — Google Drive, GitHub, etc.)
                                    </small>
                                </label>
                                <div className="input-group">
                                    <span className="input-group-text">
                                        <i className="bi bi-link-45deg"></i>
                                    </span>
                                    <input
                                        type="url"
                                        className={`form-control ${errors.fileURI ? 'is-invalid' : ''}`}
                                        name="fileURI"
                                        value={form.fileURI}
                                        onChange={handleChange}
                                        onBlur={e => setErrors(prev => ({ ...prev, fileURI: validateOptionalUrl(e.target.value) }))}
                                        placeholder="https://drive.google.com/..."
                                        maxLength={500}
                                    />
                                    {errors.fileURI && (
                                        <div className="invalid-feedback">
                                            <i className="bi bi-exclamation-circle me-1"></i>
                                            {errors.fileURI}
                                        </div>
                                    )}
                                </div>
                                <div className="form-text">
                                    Paste a shareable link to your submitted work. Leave blank if submitting in person.
                                </div>
                            </div>

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

                        <div className="d-flex gap-2 mt-4">
                            <button
                                type="submit"
                                className="btn btn-primary-edulearn"
                                disabled={loading || !studentID || fileURIInvalid}
                            >
                                {loading ? (
                                    <><span className="spinner-border spinner-border-sm me-2"></span>Submitting...</>
                                ) : (
                                    <><i className="bi bi-cloud-upload me-2"></i>Submit Assessment</>
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
