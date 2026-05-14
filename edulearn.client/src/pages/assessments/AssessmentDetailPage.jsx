import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { assessmentService } from '../../services/assessmentService';
import { authService } from '../../services/authService';
import Loading from '../../components/Loading';
import ErrorAlert from '../../components/ErrorAlert';
import StatusBadge from '../../components/StatusBadge';

export default function AssessmentDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { role, userId } = authService.getCurrentUser();

    const [assessment, setAssessment] = useState(null);
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const canManage = ['Instructor', 'ITAdmin'].includes(role);
    const isStudent = role === 'Student';

    useEffect(() => {
        loadAll();
    }, [id]);

    const loadAll = async () => {
        try {
            setLoading(true);
            setError(null);

            const [assessmentData, submissionsData] = await Promise.allSettled([
                assessmentService.getById(id),
                assessmentService.getSubmissions(id),
            ]);

            if (assessmentData.status === 'fulfilled') {
                setAssessment(assessmentData.value);
            } else {
                throw assessmentData.reason;
            }

            if (submissionsData.status === 'fulfilled') {
                const allSubmissions = submissionsData.value;
                if (isStudent) {
                    setSubmissions(
                        allSubmissions.filter(
                            s => String(s.studentID) === String(userId)
                        )
                    );
                } else {
                    setSubmissions(allSubmissions);
                }
            }
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    const alreadySubmitted = isStudent &&
        submissions.some(s => String(s.studentID) === String(userId));

    return (
        <div>
            {/* Page Header */}
            <div className="d-flex align-items-center justify-content-between mb-4">
                <h2 className="text-primary-edulearn mb-0">
                    <i className="bi bi-file-earmark-text me-2"></i>
                    Assessment Detail
                </h2>
                <div className="d-flex gap-2">
                    {canManage && assessment && (
                        <button
                            className="btn btn-outline-secondary"
                            onClick={() => navigate(`/assessments/${id}/edit`)}
                        >
                            <i className="bi bi-pencil me-2"></i>Edit
                        </button>
                    )}
                    <button
                        className="btn btn-outline-secondary"
                        onClick={() => navigate('/assessments')}
                    >
                        <i className="bi bi-arrow-left me-1"></i>Back
                    </button>
                </div>
            </div>

            {/* Error */}
            <ErrorAlert error={error} onDismiss={() => setError(null)} />

            {/* Loading */}
            {loading && <Loading message="Loading assessment..." />}

            {/* Content */}
            {!loading && assessment && (
                <>
                    {/* Assessment Info Card */}
                    <div className="card shadow-sm mb-4">
                        <div className="card-header bg-primary-edulearn text-white">
                            <div className="d-flex align-items-center justify-content-between">
                                <strong>
                                    <i className="bi bi-info-circle me-2"></i>
                                    Assessment Information
                                </strong>
                                <StatusBadge status={assessment.status} />
                            </div>
                        </div>
                        <div className="card-body">
                            <div className="row g-4">
                                <div className="col-md-6">
                                    <dl className="row mb-0">
                                        <dt className="col-sm-5 text-muted">Title</dt>
                                        <dd className="col-sm-7 fw-bold">
                                            {assessment.title}
                                        </dd>

                                        <dt className="col-sm-5 text-muted">Type</dt>
                                        <dd className="col-sm-7">
                                            <span className="badge bg-secondary">
                                                {assessment.type}
                                            </span>
                                        </dd>

                                        <dt className="col-sm-5 text-muted">Max Score</dt>
                                        <dd className="col-sm-7">
                                            {assessment.maxScore}
                                        </dd>

                                        <dt className="col-sm-5 text-muted">Course</dt>
                                        <dd className="col-sm-7">
                                            {assessment.courseName || assessment.courseID || '—'}
                                        </dd>
                                    </dl>
                                </div>

                                <div className="col-md-6">
                                    <dl className="row mb-0">
                                        <dt className="col-sm-5 text-muted">Due At</dt>
                                        <dd className="col-sm-7">
                                            {assessment.dueAt
                                                ? new Date(assessment.dueAt).toLocaleString(
                                                    'en-US', {
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })
                                                : '—'}
                                        </dd>

                                        <dt className="col-sm-5 text-muted">Created By</dt>
                                        <dd className="col-sm-7">
                                            {assessment.createdByName || '—'}
                                        </dd>

                                        <dt className="col-sm-5 text-muted">Created At</dt>
                                        <dd className="col-sm-7">
                                            {assessment.createdAt
                                                ? new Date(assessment.createdAt).toLocaleDateString()
                                                : '—'}
                                        </dd>

                                        <dt className="col-sm-5 text-muted">Total Submissions</dt>
                                        <dd className="col-sm-7">
                                            <span className="badge bg-primary-edulearn">
                                                {submissions.length}
                                            </span>
                                        </dd>
                                    </dl>
                                </div>

                                {assessment.gradingRubricJSON && (
                                    <div className="col-12">
                                        <dt className="text-muted small text-uppercase mb-1">
                                            Grading Rubric
                                        </dt>
                                        <div className="p-3 bg-light rounded">
                                            <pre
                                                className="mb-0"
                                                style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                                            >
                                                {assessment.gradingRubricJSON}
                                            </pre>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Student Submit Banner */}
                    {isStudent && (
                        <div className={`alert ${alreadySubmitted ? 'alert-success' : 'alert-info'} mb-4`}>
                            <div className="d-flex align-items-center justify-content-between">
                                <div>
                                    <i className={`bi ${alreadySubmitted ? 'bi-check-circle' : 'bi-cloud-upload'} me-2`}></i>
                                    {alreadySubmitted
                                        ? 'You have already submitted this assessment.'
                                        : 'You have not submitted this assessment yet.'}
                                </div>
                                {!alreadySubmitted && (
                                    <button
                                        className="btn btn-primary-edulearn btn-sm"
                                        onClick={() => navigate(`/submissions/${id}/submit`)}
                                    >
                                        <i className="bi bi-cloud-upload me-2"></i>
                                        Submit Now
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Submissions Card */}
                    <div className="card shadow-sm">
                        <div className="card-header bg-light d-flex align-items-center justify-content-between">
                            <strong>
                                <i className="bi bi-cloud-upload me-2"></i>
                                {isStudent ? 'My Submission' : 'All Submissions'}
                            </strong>
                            <small className="text-muted">
                                {submissions.length} submission(s)
                            </small>
                        </div>

                        {submissions.length === 0 ? (
                            <div className="card-body text-center py-5 text-muted">
                                <i className="bi bi-inbox display-4 d-block mb-3"></i>
                                <p className="mb-0">
                                    {isStudent
                                        ? 'You have not submitted yet.'
                                        : 'No submissions received yet.'}
                                </p>
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <table className="table table-hover align-middle mb-0">
                                    <thead className="table-light">
                                        <tr>
                                            {!isStudent && <th>Student ID</th>}
                                            <th>Submitted At</th>
                                            <th>Status</th>
                                            <th>Score</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {submissions.map(sub => (
                                            <tr key={sub.submissionID}>
                                                {!isStudent && (
                                                    <td>
                                                        <code>#{sub.studentID}</code>
                                                    </td>
                                                )}
                                                <td>
                                                    {sub.submittedAt
                                                        ? new Date(sub.submittedAt).toLocaleString()
                                                        : '—'}
                                                </td>
                                                <td>
                                                    <StatusBadge status={sub.status} />
                                                </td>
                                                <td>
                                                    {sub.score != null
                                                        ? `${sub.score} / ${assessment.maxScore}`
                                                        : '—'}
                                                </td>
                                                <td>
                                                    <div className="d-flex gap-2">
                                                        {canManage && (
                                                            <button
                                                                className="btn btn-sm btn-outline-success"
                                                                onClick={() => navigate(`/submissions/${sub.submissionID}/grade`)}
                                                                title="Grade"
                                                            >
                                                                <i className="bi bi-star"></i>
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}