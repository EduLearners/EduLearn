import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { submissionService } from '../../services/submissionService';
import { assessmentService } from '../../services/assessmentService';
import { authService } from '../../services/authService';
import ErrorAlert from '../../components/ErrorAlert';
import Loading from '../../components/Loading';
import StatusBadge from '../../components/StatusBadge';
import { validateScore } from '../../utils/validators';

export default function GradePage() {
    const { id } = useParams(); // submissionID
    const navigate = useNavigate();
    const { role } = authService.getCurrentUser();

    const [errors, setErrors] = useState({});

    const [submission, setSubmission] = useState(null);
    const [assessment, setAssessment] = useState(null);
    const [score, setScore] = useState('');
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState('');

    const canManage = ['Instructor', 'ITAdmin'].includes(role);

    useEffect(() => {
        loadSubmission();
    }, [id]);

    const loadSubmission = async () => {
        try {
            setPageLoading(true);
            setError(null);

            const subData = await submissionService.getById(id);
            setSubmission(subData);

            // Pre fill if already graded — backend field is score not marksAwarded
            if (subData.score != null) {
                setScore(String(subData.score));
            }

            // Load related assessment for maxScore
            if (subData.assessmentID) {
                const assessData = await assessmentService.getById(subData.assessmentID);
                setAssessment(assessData);
            }

        } catch (err) {
            setError(err);
        } finally {
            setPageLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess('');

        const maxAllowed = submission?.maxScore ?? assessment?.maxScore;
        const next = {
            score: validateScore(score, maxAllowed),
        };
        if (Object.values(next).some(Boolean)) { setErrors(next); return; }

        // AC-3: JS bounds check (browser min/max can be bypassed)
        const numScore = Number(score);
        const maxAllowedDisplay = maxAllowed ?? 9999;
        if (numScore < 0 || numScore > maxAllowedDisplay) {
            setError({ message: `Score must be between 0 and ${maxAllowedDisplay}.` });
            return;
        }

        // AC-5: Confirm before posting grade
        if (!window.confirm(`Post a grade of ${numScore} / ${maxAllowedDisplay} for this submission?`)) {
            return;
        }

        setLoading(true);

        // Payload matches GradeSubmissionDto exactly
        const payload = {
            score: numScore,
            reason: reason || null,
        };

        try {
            await submissionService.grade(id, payload);
            setSuccess('Submission graded successfully.');
            setTimeout(
                () => navigate(`/assessments/${submission.assessmentID}`),
                1500
            );
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    if (!canManage) {
        return (
            <div className="alert alert-danger">
                <i className="bi bi-shield-x me-2"></i>
                You do not have permission to grade submissions.
            </div>
        );
    }

    if (pageLoading) return <Loading message="Loading submission..." />;

    return (
        <div>
            {/* Page Header */}
            <div className="d-flex align-items-center justify-content-between mb-4">
                <h2 className="text-primary-edulearn mb-0">
                    <i className="bi bi-star me-2"></i>
                    Grade Submission
                </h2>
                <button
                    className="btn btn-outline-secondary"
                    onClick={() =>
                        navigate(
                            submission?.assessmentID
                                ? `/assessments/${submission.assessmentID}`
                                : '/submissions'
                        )
                    }
                >
                    <i className="bi bi-arrow-left me-1"></i>Back
                </button>
            </div>

            {/* Error */}
            <ErrorAlert error={error} onDismiss={() => setError(null)} />

            {/* Success */}
            {success && (
                <div className="alert alert-success">
                    <i className="bi bi-check-circle me-2"></i>{success}
                </div>
            )}

            {submission && (
                <>
                    {/* Submission Info Card */}
                    <div className="card shadow-sm mb-4">
                        <div className="card-header bg-primary-edulearn text-white">
                            <strong>
                                <i className="bi bi-info-circle me-2"></i>
                                Submission Information
                            </strong>
                        </div>
                        <div className="card-body">
                            <div className="row g-3">
                                <div className="col-md-6">
                                    <dl className="row mb-0">
                                        <dt className="col-sm-5 text-muted">Submission ID</dt>
                                        <dd className="col-sm-7">
                                            <code>#{submission.submissionID}</code>
                                        </dd>
                                        <dt className="col-sm-5 text-muted">Student</dt>
                                        <dd className="col-sm-7">
                                            {submission.studentName || `#${submission.studentID}`}
                                        </dd>
                                        <dt className="col-sm-5 text-muted">Assessment</dt>
                                        <dd className="col-sm-7">
                                            {submission.assessmentTitle || `#${submission.assessmentID}`}
                                        </dd>
                                    </dl>
                                </div>
                                <div className="col-md-6">
                                    <dl className="row mb-0">
                                        <dt className="col-sm-5 text-muted">Submitted At</dt>
                                        <dd className="col-sm-7">
                                            {submission.submittedAt
                                                ? new Date(submission.submittedAt).toLocaleString()
                                                : '—'}
                                        </dd>
                                        <dt className="col-sm-5 text-muted">Status</dt>
                                        <dd className="col-sm-7">
                                            <StatusBadge status={submission.status} />
                                        </dd>
                                        <dt className="col-sm-5 text-muted">Max Score</dt>
                                        <dd className="col-sm-7">
                                            {submission.maxScore ?? assessment?.maxScore ?? '—'}
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Student Work Card */}
                    <div className="card shadow-sm mb-4">
                        <div className="card-header bg-light">
                            <strong>
                                <i className="bi bi-file-text me-2"></i>
                                Student Work
                            </strong>
                        </div>
                        <div className="card-body">
                            {/* File Link — backend field is fileURI */}
                            {submission.fileURI ? (
                                <div>
                                    <label className="form-label text-muted small text-uppercase">
                                        Submitted File
                                    </label>
                                    <div>
                                        <a href={submission.fileURI} target="_blank" rel="noreferrer" className="btn btn-outline-primary btn-sm">
                                            <i className="bi bi-link-45deg me-2"></i>
                                            Open Submitted File
                                        </a>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-muted mb-0">
                                    <i className="bi bi-info-circle me-2"></i>
                                    No file submitted.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Grading Form Card */}
                    <div className="card shadow-sm">
                        <div className="card-header bg-primary-edulearn text-white">
                            <strong>
                                <i className="bi bi-star me-2"></i>
                                Grade This Submission
                            </strong>
                        </div>
                        <div className="card-body">
                            <form onSubmit={handleSubmit}>
                                <div className="row g-3">

                                    {/* Score */}
                                    <div className="col-md-4">
                                        <label className="form-label fw-bold">
                                            Score{' '}
                                            <span className="text-danger">*</span>
                                            {submission.maxScore && (
                                                <small className="text-muted fw-normal ms-2">
                                                    (max {submission.maxScore})
                                                </small>
                                            )}
                                        </label>
                                        <input
                                            type="number"
                                            className={`form-control${errors.score ? ' is-invalid' : ''}`}
                                            value={score}
                                            onChange={e => setScore(e.target.value)}
                                            onBlur={e => setErrors(prev => ({ ...prev, score: validateScore(e.target.value, submission?.maxScore ?? assessment?.maxScore) }))}
                                            min={0}
                                            max={submission.maxScore ?? assessment?.maxScore ?? 9999}
                                            step={0.1}
                                            required
                                        />
                                        {errors.score && <div className="invalid-feedback">{errors.score}</div>}
                                    </div>

                                    {/* Reason */}
                                    <div className="col-12">
                                        <label className="form-label fw-bold">
                                            Reason / Feedback
                                            <small className="text-muted fw-normal ms-2">
                                                (optional)
                                            </small>
                                        </label>
                                        <textarea
                                            className="form-control"
                                            value={reason}
                                            onChange={e => setReason(e.target.value)}
                                            rows={4}
                                            maxLength={500}
                                            placeholder="Write your feedback or reason for this grade..."
                                        />
                                    </div>

                                </div>

                                {/* Form Actions */}
                                <div className="d-flex gap-2 mt-4">
                                    <button
                                        type="submit"
                                        className="btn btn-primary-edulearn"
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2"></span>
                                                Saving Grade...
                                            </>
                                        ) : (
                                            <>
                                                <i className="bi bi-check-lg me-2"></i>
                                                Save Grade
                                            </>
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-outline-secondary"
                                        onClick={() =>
                                            navigate(
                                                submission?.assessmentID
                                                    ? `/assessments/${submission.assessmentID}`
                                                    : '/submissions'
                                            )
                                        }
                                        disabled={loading}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}