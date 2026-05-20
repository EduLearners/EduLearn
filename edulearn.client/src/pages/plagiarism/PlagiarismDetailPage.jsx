// PlagiarismDetailPage.jsx
// Route: /admin/plagiarism/:id   (reportID)
// Owner: Vikash
// Detailed view of a single plagiarism report. ITAdmin can confirm or dismiss.

import { useState, useEffect }    from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { plagiarismService } from '../../services/plagiarismService';
import { authService }       from '../../services/authService';
import Loading               from '../../components/Loading';
import ErrorAlert            from '../../components/ErrorAlert';
import StatusBadge           from '../../components/StatusBadge';
import ConfirmDialog         from '../../components/ConfirmDialog';

export default function PlagiarismDetailPage() {
    const { id } = useParams();   // reportID
    const navigate = useNavigate();
    const { role } = authService.getCurrentUser();

    const [report,   setReport]   = useState(null);
    const [loading,  setLoading]  = useState(true);
    const [error,    setError]    = useState(null);
    const [updating, setUpdating] = useState(false);
    const [success,  setSuccess]  = useState('');
    const [confirm,  setConfirm]  = useState(null); // { newStatus }

    const canResolve = role === 'ITAdmin';

    useEffect(() => { loadReport(); }, [id]);

    const loadReport = async () => {
        try {
            setLoading(true);
            setError(null);
            // Fetch via student integrity — we need to find this report by ID.
            // The backend exposes GET /api/plagiarism/:reportId directly.
            const data = await plagiarismService.getById(id).catch(async () => {
                // Fallback: search doesn't exist yet — show a not-found state
                return null;
            });
            setReport(data);
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async () => {
        if (!confirm) return;
        setUpdating(true);
        try {
            await plagiarismService.updateStatus(id, confirm.newStatus);
            setSuccess(`Report ${id} marked as ${confirm.newStatus}.`);
            setConfirm(null);
            await loadReport();
        } catch (err) {
            setError(err);
        } finally {
            setUpdating(false);
        }
    };

    const scoreColor = (score) => {
        if (score >= 80) return 'var(--color-danger)';
        if (score >= 50) return 'var(--color-warning)';
        return 'var(--text-muted)';
    };

    if (loading) return <Loading message="Loading plagiarism report..." />;

    return (
        <div>
            {/* Header */}
            <div className="d-flex align-items-center justify-content-between mb-4">
                <h2 className="text-primary-edulearn mb-0">
                    <i className="bi bi-shield-exclamation me-2"></i>
                    Plagiarism Report {id}
                </h2>
                <button
                    className="btn btn-outline-secondary"
                    onClick={() => navigate('/admin/plagiarism/queue')}
                >
                    <i className="bi bi-arrow-left me-1"></i>Back to Queue
                </button>
            </div>

            <ErrorAlert error={error} onDismiss={() => setError(null)} />

            {success && (
                <div className="alert alert-success d-flex align-items-center">
                    <i className="bi bi-check-circle me-2"></i>{success}
                    <button className="btn-close ms-auto" onClick={() => setSuccess('')}></button>
                </div>
            )}

            {!report ? (
                <div className="alert alert-warning">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    Report {id} could not be loaded. It may not exist or the API endpoint
                    <code className="mx-1">GET /api/plagiarism/{id}</code> may not yet be implemented.
                </div>
            ) : (
                <div className="row g-4">
                    {/* Main card */}
                    <div className="col-lg-8">
                        <div className="card shadow-sm mb-4">
                            <div className="card-header bg-primary-edulearn text-white d-flex align-items-center justify-content-between">
                                <strong>
                                    <i className="bi bi-shield-exclamation me-2"></i>
                                    Report Details
                                </strong>
                                <StatusBadge status={report.status} />
                            </div>
                            <div className="card-body">
                                <div className="row g-3 mb-3">
                                    <div className="col-md-6">
                                        <dt className="text-muted small">Student</dt>
                                        <dd className="fw-bold mb-0">{report.studentName ?? report.studentID}</dd>
                                    </div>
                                    <div className="col-md-6">
                                        <dt className="text-muted small">Assessment</dt>
                                        <dd className="mb-0">{report.assessmentTitle ?? '—'}</dd>
                                    </div>
                                    <div className="col-md-6">
                                        <dt className="text-muted small">Course</dt>
                                        <dd className="mb-0">{report.courseName ?? '—'}</dd>
                                    </div>
                                    <div className="col-md-6">
                                        <dt className="text-muted small">Submission ID</dt>
                                        <dd className="mb-0"><code>{report.submissionID}</code></dd>
                                    </div>
                                    <div className="col-md-6">
                                        <dt className="text-muted small">Flagged By</dt>
                                        <dd className="mb-0">{report.flaggedByName ?? '—'}</dd>
                                    </div>
                                    <div className="col-md-6">
                                        <dt className="text-muted small">Flagged At</dt>
                                        <dd className="mb-0">
                                            {report.flaggedAt
                                                ? new Date(report.flaggedAt).toLocaleString()
                                                : '—'}
                                        </dd>
                                    </div>
                                    {report.resolvedAt && (
                                        <div className="col-md-6">
                                            <dt className="text-muted small">Resolved At</dt>
                                            <dd className="mb-0">
                                                {new Date(report.resolvedAt).toLocaleString()}
                                            </dd>
                                        </div>
                                    )}
                                </div>

                                {/* Similarity score bar */}
                                <div className="mb-3">
                                    <dt className="text-muted small mb-1">Similarity Score</dt>
                                    <div className="d-flex align-items-center gap-3">
                                        <div
                                            className="display-6 fw-bold font-monospace"
                                            style={{ color: scoreColor(report.similarityScore) }}
                                        >
                                            {Number(report.similarityScore ?? 0).toFixed(1)}%
                                        </div>
                                        <div className="flex-grow-1">
                                            <div className="progress" style={{ height: 10 }}>
                                                <div
                                                    className="progress-bar"
                                                    style={{
                                                        width: `${report.similarityScore ?? 0}%`,
                                                        background: scoreColor(report.similarityScore),
                                                    }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Details / notes */}
                                {report.details && (
                                    <div>
                                        <dt className="text-muted small mb-1">Instructor Notes</dt>
                                        <div className="alert alert-light border p-3 mb-0">
                                            <i className="bi bi-chat-quote me-2 text-muted"></i>
                                            {report.details}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Actions sidebar */}
                    <div className="col-lg-4">
                        <div className="card shadow-sm">
                            <div className="card-header bg-light">
                                <strong><i className="bi bi-sliders me-2"></i>Actions</strong>
                            </div>
                            <div className="card-body d-grid gap-2">
                                {report.status === 'Pending' && canResolve && (
                                    <>
                                        <button
                                            className="btn btn-danger"
                                            onClick={() => setConfirm({ newStatus: 'Confirmed' })}
                                            disabled={updating}
                                        >
                                            <i className="bi bi-exclamation-triangle-fill me-2"></i>
                                            Confirm Violation
                                        </button>
                                        <button
                                            className="btn btn-outline-secondary"
                                            onClick={() => setConfirm({ newStatus: 'Dismissed' })}
                                            disabled={updating}
                                        >
                                            <i className="bi bi-x-circle me-2"></i>
                                            Dismiss Report
                                        </button>
                                    </>
                                )}
                                {report.status !== 'Pending' && (
                                    <div className="alert alert-secondary py-2 mb-0 small text-center">
                                        <i className="bi bi-check2-circle me-2"></i>
                                        This report has been resolved.
                                    </div>
                                )}
                                {!canResolve && report.status === 'Pending' && (
                                    <div className="alert alert-info py-2 mb-0 small">
                                        <i className="bi bi-info-circle me-2"></i>
                                        Pending ITAdmin review.
                                    </div>
                                )}
                                <button
                                    className="btn btn-outline-secondary btn-sm"
                                    onClick={() => navigate(`/submissions/${report.submissionID}/grade`)}
                                >
                                    <i className="bi bi-star me-2"></i>View Submission
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm dialogs */}
            <ConfirmDialog
                show={confirm?.newStatus === 'Confirmed'}
                title="Confirm Plagiarism Violation"
                message={`Mark Report ${id} as a confirmed plagiarism violation? This is permanent and will affect the student's academic integrity record.`}
                onConfirm={handleUpdateStatus}
                onCancel={() => setConfirm(null)}
                confirmText="Confirm Violation"
                confirmVariant="danger"
            />
            <ConfirmDialog
                show={confirm?.newStatus === 'Dismissed'}
                title="Dismiss Report"
                message={`Dismiss Report ${id}? The submission status will revert to its previous state.`}
                onConfirm={handleUpdateStatus}
                onCancel={() => setConfirm(null)}
                confirmText="Dismiss"
                confirmVariant="secondary"
            />
        </div>
    );
}
