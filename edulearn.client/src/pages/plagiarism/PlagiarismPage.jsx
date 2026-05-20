import { useState, useEffect } from 'react';
import { plagiarismService } from '../../services/plagiarismService';
import { authService } from '../../services/authService';
import Loading from '../../components/Loading';
import ErrorAlert from '../../components/ErrorAlert';
import StatusBadge from '../../components/StatusBadge';
import ConfirmDialog from '../../components/ConfirmDialog';

const emptyFlagForm = {
    submissionID: '',
    similarityScore: 75,
    details: '',
};

export default function PlagiarismPage() {
    const [studentId, setStudentId] = useState(() => sessionStorage.getItem('plagiarism_lastStudentId') || '');
    const [integrity, setIntegrity] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [actionMessage, setActionMessage] = useState(null); // { type, text }

    // Flag modal
    const [showFlagModal, setShowFlagModal] = useState(false);
    const [flagForm, setFlagForm] = useState(emptyFlagForm);
    const [flagging, setFlagging] = useState(false);
    const [flagError, setFlagError] = useState(null);

    // Status update confirmation
    const [statusConfirm, setStatusConfirm] = useState(null); // { reportId, newStatus, reportTitle }
    const [updatingReportId, setUpdatingReportId] = useState(null);

    const { role } = authService.getCurrentUser();
    const canFlag = ['Instructor', 'ITAdmin'].includes(role);
    const canResolve = role === 'ITAdmin';

    // Auto-load when student ID is valid
    useEffect(() => {
        if (studentId && /^\d+$/.test(studentId)) {
            loadIntegrity();
        } else {
            setIntegrity(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [studentId]);

    const loadIntegrity = async () => {
        if (!studentId) return;
        try {
            setLoading(true);
            setError(null);
            const data = await plagiarismService.getStudentIntegrity(studentId);
            setIntegrity(data);
            sessionStorage.setItem('plagiarism_lastStudentId', studentId);
        } catch (err) {
            setError(err);
            setIntegrity(null);
        } finally {
            setLoading(false);
        }
    };

    // ── Flag a submission ────────────────────────────────────────
    const openFlagModal = () => {
        setFlagForm(emptyFlagForm);
        setFlagError(null);
        setShowFlagModal(true);
    };

    const handleSubmitFlag = async (e) => {
        e.preventDefault();
        setFlagError(null);
        setFlagging(true);

        try {
            await plagiarismService.report(
                parseInt(flagForm.submissionID, 10),
                parseFloat(flagForm.similarityScore),
                flagForm.details || null
            );
            setShowFlagModal(false);
            setActionMessage({
                type: 'success',
                text: 'Plagiarism report filed. Submission is now flagged.',
            });
            // Reload if the current student happens to be affected
            if (studentId) await loadIntegrity();
        } catch (err) {
            setFlagError(err);
        } finally {
            setFlagging(false);
        }
    };

    // ── Resolve a report (Confirm/Dismiss) ───────────────────────
    const handleUpdateStatus = async () => {
        if (!statusConfirm) return;
        const { reportId, newStatus } = statusConfirm;
        setStatusConfirm(null);
        try {
            setUpdatingReportId(reportId);
            setActionMessage(null);
            await plagiarismService.updateStatus(reportId, newStatus);
            setActionMessage({
                type: 'success',
                text: `Report #${reportId} marked as ${newStatus}.`,
            });
            await loadIntegrity();
        } catch (err) {
            setActionMessage({
                type: 'error',
                text: err.response?.data?.error || 'Failed to update report status.',
            });
        } finally {
            setUpdatingReportId(null);
        }
    };

    return (
        <div>
            <h2 className="text-primary-edulearn mb-4">
                <i className="bi bi-shield-exclamation me-2"></i>Plagiarism & Academic Integrity
            </h2>

            {/* Top status message */}
            {actionMessage && (
                <div className={`alert alert-${actionMessage.type === 'success' ? 'success' : 'danger'} d-flex align-items-center`}>
                    <i className={`bi bi-${actionMessage.type === 'success' ? 'check-circle' : 'exclamation-triangle'}-fill me-2`}></i>
                    <div className="flex-grow-1">{actionMessage.text}</div>
                    <button className="btn-close" onClick={() => setActionMessage(null)}></button>
                </div>
            )}

            {/* Search panel */}
            <div className="card shadow-sm mb-4">
                <div className="card-body">
                    <div className="row g-3 align-items-end">
                        <div className="col-md-6">
                            <label className="form-label fw-bold">
                                <i className="bi bi-person me-1"></i>Student ID
                            </label>
                            <input
                                type="number"
                                className="form-control"
                                value={studentId}
                                onChange={(e) => setStudentId(e.target.value)}
                                placeholder="e.g. 1"
                                min="1"
                            />
                            <small className="text-muted">
                                Whose integrity status to view
                            </small>
                        </div>

                        <div className="col-md-3">
                            <button
                                className="btn btn-outline-secondary w-100"
                                onClick={loadIntegrity}
                                disabled={!studentId || loading}
                            >
                                <i className="bi bi-arrow-clockwise me-1"></i>Refresh
                            </button>
                        </div>

                        <div className="col-md-3">
                            {canFlag && (
                                <button
                                    className="btn btn-warning w-100"
                                    onClick={openFlagModal}
                                >
                                    <i className="bi bi-flag-fill me-2"></i>Flag Submission
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <ErrorAlert error={error} onDismiss={() => setError(null)} />

            {loading && <Loading message="Loading integrity status..." />}

            {/* Empty state */}
            {!studentId && (
                <div className="alert alert-info">
                    <i className="bi bi-info-circle me-2"></i>
                    Enter a Student ID above to view their academic integrity status.
                </div>
            )}

            {/* Integrity Dashboard */}
            {!loading && integrity && (
                <>
                    {/* Student summary */}
                    <div className="card shadow-sm mb-3">
                        <div className="card-body">
                            <div className="d-flex align-items-center justify-content-between mb-3">
                                <div>
                                    <h5 className="mb-1">
                                        <i className="bi bi-person-fill text-primary-edulearn me-2"></i>
                                        {integrity.studentName}
                                    </h5>
                                    <small className="text-muted">
                                        MRN: <code>{integrity.studentMRN}</code>
                                    </small>
                                </div>

                                {integrity.hasConfirmedViolation ? (
                                    <span className="badge bg-danger fs-6 px-3 py-2">
                                        <i className="bi bi-exclamation-triangle-fill me-1"></i>
                                        Confirmed Violation
                                    </span>
                                ) : (
                                    <span className="badge bg-success fs-6 px-3 py-2">
                                        <i className="bi bi-shield-check me-1"></i>
                                        Good Standing
                                    </span>
                                )}
                            </div>

                            {/* KPI cards */}
                            <div className="row g-3">
                                <div className="col-md-3 col-6">
                                    <div className="border rounded p-3 text-center">
                                        <div className="display-6 text-primary-edulearn fw-bold">
                                            {integrity.totalReports}
                                        </div>
                                        <small className="text-muted">Total Reports</small>
                                    </div>
                                </div>
                                <div className="col-md-3 col-6">
                                    <div className="border rounded p-3 text-center" style={{ borderColor: '#ffc107' }}>
                                        <div className="display-6 fw-bold" style={{ color: '#ffc107' }}>
                                            {integrity.pendingCount}
                                        </div>
                                        <small className="text-muted">Pending</small>
                                    </div>
                                </div>
                                <div className="col-md-3 col-6">
                                    <div className="border rounded p-3 text-center" style={{ borderColor: '#dc3545' }}>
                                        <div className="display-6 fw-bold text-danger">
                                            {integrity.confirmedCount}
                                        </div>
                                        <small className="text-muted">Confirmed</small>
                                    </div>
                                </div>
                                <div className="col-md-3 col-6">
                                    <div className="border rounded p-3 text-center">
                                        <div className="display-6 text-muted fw-bold">
                                            {integrity.dismissedCount}
                                        </div>
                                        <small className="text-muted">Dismissed</small>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Reports list */}
                    <div className="card shadow-sm">
                        <div className="card-header bg-light">
                            <strong>
                                <i className="bi bi-list-ul me-2"></i>
                                Plagiarism Reports ({integrity.reports?.length || 0})
                            </strong>
                        </div>

                        {!integrity.reports || integrity.reports.length === 0 ? (
                            <div className="card-body text-center py-5 text-muted">
                                <i className="bi bi-shield-check text-success" style={{ fontSize: '3rem' }}></i>
                                <p className="mt-3 mb-0">No plagiarism reports on record. Clean slate!</p>
                            </div>
                        ) : (
                            <div className="list-group list-group-flush">
                                {integrity.reports.map(r => {
                                    const isPending = r.status === 'Pending';
                                    const isBusy = updatingReportId === r.reportID;
                                    const scoreColor =
                                        r.similarityScore >= 80 ? 'text-danger'
                                        : r.similarityScore >= 50 ? 'text-warning'
                                        : 'text-muted';

                                    return (
                                        <div key={r.reportID} className="list-group-item p-3">
                                            <div className="row align-items-start">
                                                <div className="col-md-8">
                                                    <div className="d-flex align-items-center gap-2 mb-1">
                                                        <h6 className="mb-0">
                                                            Report #{r.reportID}
                                                        </h6>
                                                        <StatusBadge status={r.status} />
                                                        <span className={`fw-bold ${scoreColor}`}>
                                                            <i className="bi bi-percent"></i>
                                                            {r.similarityScore?.toFixed(1)}% similar
                                                        </span>
                                                    </div>

                                                    <div className="small text-muted mb-2">
                                                        <i className="bi bi-file-earmark-text me-1"></i>
                                                        {r.assessmentTitle || '—'}
                                                        <span className="mx-2">·</span>
                                                        <i className="bi bi-book me-1"></i>
                                                        {r.courseName || '—'}
                                                        <span className="mx-2">·</span>
                                                        <i className="bi bi-hash"></i>Submission {r.submissionID}
                                                    </div>

                                                    {r.details && (
                                                        <div className="alert alert-light border py-2 mb-2 small">
                                                            <i className="bi bi-chat-quote me-2 text-muted"></i>
                                                            {r.details}
                                                        </div>
                                                    )}

                                                    <div className="small text-muted">
                                                        <i className="bi bi-person-badge me-1"></i>
                                                        Flagged by <strong>{r.flaggedByName}</strong>
                                                        <span className="mx-2">·</span>
                                                        <i className="bi bi-clock me-1"></i>
                                                        {r.flaggedAt ? new Date(r.flaggedAt).toLocaleString() : '—'}
                                                        {r.resolvedAt && (
                                                            <>
                                                                <span className="mx-2">·</span>
                                                                <i className="bi bi-check2-circle me-1"></i>
                                                                Resolved {new Date(r.resolvedAt).toLocaleString()}
                                                            </>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="col-md-4 text-end">
                                                    {isPending && canResolve && (
                                                        <div className="btn-group-vertical btn-group-sm">
                                                            <button
                                                                className="btn btn-danger"
                                                                onClick={() => setStatusConfirm({
                                                                    reportId: r.reportID,
                                                                    newStatus: 'Confirmed',
                                                                    reportTitle: `Report #${r.reportID}`,
                                                                })}
                                                                disabled={isBusy}
                                                            >
                                                                {isBusy ? (
                                                                    <span className="spinner-border spinner-border-sm"></span>
                                                                ) : (
                                                                    <><i className="bi bi-exclamation-triangle-fill me-1"></i>Confirm Violation</>
                                                                )}
                                                            </button>
                                                            <button
                                                                className="btn btn-outline-secondary"
                                                                onClick={() => setStatusConfirm({
                                                                    reportId: r.reportID,
                                                                    newStatus: 'Dismissed',
                                                                    reportTitle: `Report #${r.reportID}`,
                                                                })}
                                                                disabled={isBusy}
                                                            >
                                                                <i className="bi bi-x-circle me-1"></i>Dismiss
                                                            </button>
                                                        </div>
                                                    )}
                                                    {isPending && !canResolve && (
                                                        <small className="text-muted fst-italic">
                                                            Pending ITAdmin review
                                                        </small>
                                                    )}
                                                    {!isPending && (
                                                        <small className="text-muted fst-italic">
                                                            Resolved
                                                        </small>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Status confirmation */}
            <ConfirmDialog
                show={!!statusConfirm}
                title={statusConfirm?.newStatus === 'Confirmed' ? 'Confirm Plagiarism Violation' : 'Dismiss Report'}
                message={
                    statusConfirm
                        ? statusConfirm.newStatus === 'Confirmed'
                            ? `Confirm that ${statusConfirm.reportTitle} is a genuine plagiarism violation? ` +
                              'This is a permanent decision and will affect the student\'s integrity record.'
                            : `Dismiss ${statusConfirm.reportTitle}? ` +
                              'The submission status will revert to its previous state (Graded or Submitted).'
                        : ''
                }
                onConfirm={handleUpdateStatus}
                onCancel={() => setStatusConfirm(null)}
                confirmText={statusConfirm?.newStatus === 'Confirmed' ? 'Confirm Violation' : 'Dismiss'}
                confirmVariant={statusConfirm?.newStatus === 'Confirmed' ? 'danger' : 'secondary'}
            />

            {/* Flag Submission Modal */}
            {showFlagModal && (
                <>
                    <div className="modal-backdrop fade show"></div>
                    <div className="modal fade show d-block" tabIndex="-1">
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content">
                                <div className="modal-header bg-warning">
                                    <h5 className="modal-title">
                                        <i className="bi bi-flag-fill me-2"></i>Flag Submission for Plagiarism
                                    </h5>
                                    <button
                                        type="button"
                                        className="btn-close"
                                        onClick={() => !flagging && setShowFlagModal(false)}
                                        disabled={flagging}
                                    ></button>
                                </div>
                                <form onSubmit={handleSubmitFlag}>
                                    <div className="modal-body">
                                        <div className="alert alert-warning">
                                            <i className="bi bi-exclamation-triangle me-2"></i>
                                            Flagging a submission marks it as <strong>Plagiarised</strong>.
                                            An ITAdmin will review and either Confirm or Dismiss the report.
                                        </div>

                                        <div className="mb-3">
                                            <label className="form-label fw-bold">Submission ID *</label>
                                            <input
                                                type="number"
                                                className="form-control"
                                                value={flagForm.submissionID}
                                                onChange={(e) => setFlagForm({ ...flagForm, submissionID: e.target.value })}
                                                required
                                                min="1"
                                                placeholder="e.g. 1"
                                                autoFocus
                                            />
                                            <small className="text-muted">
                                                The ID of the submission you believe is plagiarised.
                                            </small>
                                        </div>

                                        <div className="mb-3">
                                            <label className="form-label fw-bold">
                                                Similarity Score (%) — {flagForm.similarityScore}%
                                            </label>
                                            <input
                                                type="range"
                                                className="form-range"
                                                value={flagForm.similarityScore}
                                                onChange={(e) => setFlagForm({ ...flagForm, similarityScore: e.target.value })}
                                                min="0"
                                                max="100"
                                                step="0.5"
                                            />
                                            <div className="d-flex justify-content-between small text-muted">
                                                <span>0% (no match)</span>
                                                <span>50% (suspicious)</span>
                                                <span>100% (identical)</span>
                                            </div>
                                        </div>

                                        <div className="mb-3">
                                            <label className="form-label fw-bold">Details</label>
                                            <textarea
                                                className="form-control"
                                                rows={4}
                                                value={flagForm.details}
                                                onChange={(e) => setFlagForm({ ...flagForm, details: e.target.value })}
                                                placeholder="Describe the evidence: matched sources, sections, comparison to other submissions, etc."
                                            />
                                        </div>

                                        <ErrorAlert error={flagError} onDismiss={() => setFlagError(null)} />
                                    </div>

                                    <div className="modal-footer">
                                        <button
                                            type="button"
                                            className="btn btn-outline-secondary"
                                            onClick={() => setShowFlagModal(false)}
                                            disabled={flagging}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="btn btn-warning"
                                            disabled={flagging || !flagForm.submissionID}
                                        >
                                            {flagging ? (
                                                <><span className="spinner-border spinner-border-sm me-2"></span>Filing...</>
                                            ) : (
                                                <><i className="bi bi-flag-fill me-2"></i>File Report</>
                                            )}
                                        </button>
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
