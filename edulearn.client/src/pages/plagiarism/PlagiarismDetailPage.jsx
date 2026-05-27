import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { plagiarismService } from '../../services/plagiarismService';
import { authService } from '../../services/authService';
import Loading from '../../components/Loading';
import ErrorAlert from '../../components/ErrorAlert';
import StatusBadge from '../../components/StatusBadge';
import ConfirmDialog from '../../components/ConfirmDialog';

export default function PlagiarismDetailPage() {
    const { id } = useParams(); // reportID
    const navigate = useNavigate();
    const { role } = authService.getCurrentUser();

    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionMessage, setActionMessage] = useState(null);
    const [statusConfirm, setStatusConfirm] = useState(null);
    const [updating, setUpdating] = useState(false);

    const canResolve = role === 'ITAdmin';

    useEffect(() => {
        loadReport();
    }, [id]);

    const loadReport = async () => {
        try {
            setLoading(true);
            setError(null);
            // Use getStudentIntegrity is not available per-report; use the reports list approach
            // Fall back to navigating back if direct fetch not available
            const data = await plagiarismService.getReportById(id).catch(() => null);
            if (!data) {
                setError({ message: 'Report not found or you do not have access.' });
                return;
            }
            setReport(data);
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async () => {
        if (!statusConfirm) return;
        const { newStatus } = statusConfirm;
        setStatusConfirm(null);
        try {
            setUpdating(true);
            setActionMessage(null);
            await plagiarismService.updateStatus(id, newStatus);
            setActionMessage({ type: 'success', text: `Report marked as ${newStatus}.` });
            await loadReport();
        } catch (err) {
            setActionMessage({ type: 'error', text: err.response?.data?.error || 'Failed to update status.' });
        } finally {
            setUpdating(false);
        }
    };

    const scoreColor = (score) => {
        if (score >= 80) return 'text-danger fw-bold';
        if (score >= 50) return 'text-warning fw-bold';
        return 'text-muted';
    };

    if (loading) return <Loading message="Loading plagiarism report..." />;

    return (
        <div>
            {/* Header */}
            <div className="d-flex align-items-center justify-content-between mb-4">
                <h2 className="text-primary-edulearn mb-0">
                    <i className="bi bi-shield-exclamation me-2"></i>
                    Plagiarism Report #{id}
                </h2>
                <button
                    className="btn btn-outline-secondary"
                    onClick={() => navigate('/plagiarism')}
                >
                    <i className="bi bi-arrow-left me-1"></i>Back
                </button>
            </div>

            {/* Status message */}
            {actionMessage && (
                <div className={`alert alert-${actionMessage.type === 'success' ? 'success' : 'danger'} d-flex align-items-center`}>
                    <i className={`bi bi-${actionMessage.type === 'success' ? 'check-circle' : 'exclamation-triangle'}-fill me-2`}></i>
                    <div className="flex-grow-1">{actionMessage.text}</div>
                    <button className="btn-close" onClick={() => setActionMessage(null)}></button>
                </div>
            )}

            <ErrorAlert error={error} onDismiss={() => setError(null)} />

            {!loading && !report && !error && (
                <div className="alert alert-warning">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    Report not found. It may have been deleted or you lack access.
                    <button className="btn btn-link ms-2 p-0" onClick={() => navigate('/plagiarism')}>
                        Go back to Plagiarism page
                    </button>
                </div>
            )}

            {!loading && report && (
                <>
                    {/* Report Overview Card */}
                    <div className="card shadow-sm mb-4">
                        <div className="card-header bg-primary-edulearn text-white d-flex align-items-center justify-content-between">
                            <strong>
                                <i className="bi bi-file-earmark-text me-2"></i>
                                Report Details
                            </strong>
                            <StatusBadge status={report.status} />
                        </div>
                        <div className="card-body">
                            <div className="row g-4">
                                <div className="col-md-6">
                                    <dl className="row mb-0">
                                        <dt className="col-sm-5 text-muted">Report ID</dt>
                                        <dd className="col-sm-7"><code>#{report.reportID}</code></dd>

                                        <dt className="col-sm-5 text-muted">Student</dt>
                                        <dd className="col-sm-7 fw-bold">{report.studentName || `#${report.studentID}`}</dd>

                                        <dt className="col-sm-5 text-muted">Course</dt>
                                        <dd className="col-sm-7">{report.courseName || '—'}</dd>

                                        <dt className="col-sm-5 text-muted">Assessment</dt>
                                        <dd className="col-sm-7">{report.assessmentTitle || '—'}</dd>

                                        <dt className="col-sm-5 text-muted">Submission ID</dt>
                                        <dd className="col-sm-7"><code>#{report.submissionID}</code></dd>
                                    </dl>
                                </div>

                                <div className="col-md-6">
                                    <dl className="row mb-0">
                                        <dt className="col-sm-5 text-muted">Similarity</dt>
                                        <dd className="col-sm-7">
                                            <span className={scoreColor(report.similarityScore)}>
                                                {report.similarityScore?.toFixed(1)}%
                                            </span>
                                        </dd>

                                        <dt className="col-sm-5 text-muted">Status</dt>
                                        <dd className="col-sm-7"><StatusBadge status={report.status} /></dd>

                                        <dt className="col-sm-5 text-muted">Flagged By</dt>
                                        <dd className="col-sm-7">{report.flaggedByName || '—'}</dd>

                                        <dt className="col-sm-5 text-muted">Flagged At</dt>
                                        <dd className="col-sm-7">
                                            {report.flaggedAt ? new Date(report.flaggedAt).toLocaleString() : '—'}
                                        </dd>

                                        {report.resolvedAt && (
                                            <>
                                                <dt className="col-sm-5 text-muted">Resolved At</dt>
                                                <dd className="col-sm-7">
                                                    {new Date(report.resolvedAt).toLocaleString()}
                                                </dd>
                                            </>
                                        )}
                                    </dl>
                                </div>

                                {report.details && (
                                    <div className="col-12">
                                        <dt className="text-muted small text-uppercase mb-2">Evidence / Details</dt>
                                        <div className="p-3 bg-light rounded border">
                                            <p className="mb-0">{report.details}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Similarity Score Visual */}
                    <div className="card shadow-sm mb-4">
                        <div className="card-header bg-light">
                            <strong><i className="bi bi-percent me-2"></i>Similarity Score</strong>
                        </div>
                        <div className="card-body">
                            <div className="d-flex align-items-center gap-4">
                                <div className="display-4 fw-bold" style={{
                                    color: report.similarityScore >= 80 ? '#dc3545'
                                         : report.similarityScore >= 50 ? '#ffc107'
                                         : '#6c757d'
                                }}>
                                    {report.similarityScore?.toFixed(1)}%
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div className="progress" style={{ height: 20 }}>
                                        <div
                                            className={`progress-bar ${
                                                report.similarityScore >= 80 ? 'bg-danger'
                                              : report.similarityScore >= 50 ? 'bg-warning'
                                              : 'bg-secondary'
                                            }`}
                                            style={{ width: `${Math.min(100, report.similarityScore || 0)}%` }}
                                        />
                                    </div>
                                    <div className="d-flex justify-content-between small text-muted mt-1">
                                        <span>0% (no match)</span>
                                        <span>50% (suspicious)</span>
                                        <span>100% (identical)</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Actions — ITAdmin only, only for Pending reports */}
                    {canResolve && report.status === 'Pending' && (
                        <div className="card shadow-sm">
                            <div className="card-header bg-light">
                                <strong><i className="bi bi-clipboard-check me-2"></i>Resolution Actions</strong>
                            </div>
                            <div className="card-body">
                                <p className="text-muted mb-3">
                                    Review the evidence above and choose a resolution. This action is permanent.
                                </p>
                                <div className="d-flex gap-3">
                                    <button
                                        className="btn btn-danger"
                                        onClick={() => setStatusConfirm({ newStatus: 'Confirmed' })}
                                        disabled={updating}
                                    >
                                        {updating
                                            ? <><span className="spinner-border spinner-border-sm me-2"></span>Processing...</>
                                            : <><i className="bi bi-exclamation-triangle-fill me-2"></i>Confirm Violation</>
                                        }
                                    </button>
                                    <button
                                        className="btn btn-outline-secondary"
                                        onClick={() => setStatusConfirm({ newStatus: 'Dismissed' })}
                                        disabled={updating}
                                    >
                                        <i className="bi bi-x-circle me-2"></i>Dismiss Report
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {report.status !== 'Pending' && (
                        <div className={`alert ${report.status === 'Confirmed' ? 'alert-danger' : 'alert-secondary'}`}>
                            <i className={`bi bi-${report.status === 'Confirmed' ? 'exclamation-triangle-fill' : 'check-circle'} me-2`}></i>
                            This report has been <strong>{report.status}</strong> and cannot be changed.
                        </div>
                    )}
                </>
            )}

            {/* Confirmation dialog */}
            <ConfirmDialog
                show={!!statusConfirm}
                title={statusConfirm?.newStatus === 'Confirmed' ? 'Confirm Plagiarism Violation' : 'Dismiss Report'}
                message={
                    statusConfirm?.newStatus === 'Confirmed'
                        ? 'Are you sure this is a genuine plagiarism violation? This is permanent and will affect the student\'s integrity record.'
                        : 'Are you sure you want to dismiss this report? The submission status will revert to its previous state.'
                }
                onConfirm={handleUpdateStatus}
                onCancel={() => setStatusConfirm(null)}
                confirmText={statusConfirm?.newStatus === 'Confirmed' ? 'Confirm Violation' : 'Dismiss'}
                confirmVariant={statusConfirm?.newStatus === 'Confirmed' ? 'danger' : 'secondary'}
                loading={updating}
            />
        </div>
    );
}
