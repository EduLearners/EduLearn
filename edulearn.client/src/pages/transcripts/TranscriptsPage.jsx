import { useState, useEffect } from 'react';
import { transcriptService } from '../../services/transcriptService';
import { authService } from '../../services/authService';
import Loading from '../../components/Loading';
import ErrorAlert from '../../components/ErrorAlert';
import StatusBadge from '../../components/StatusBadge';
import ConfirmDialog from '../../components/ConfirmDialog';
import ModalPortal from '../../components/ModalPortal';
import Toast from '../../components/Toast';
import { getFriendlySimpleMessage } from '../../utils/errorMessage';

export default function TranscriptsPage() {
    const [studentId, setStudentId] = useState(() => localStorage.getItem('lastStudentId') || '');
    const [transcripts, setTranscripts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [actionMessage, setActionMessage] = useState(null); // { type, text }
    const [actionInProgress, setActionInProgress] = useState(null); // 'generate' | id of transcript

    // Confirmation dialogs
    const [generateConfirm, setGenerateConfirm] = useState(false);
    const [publishConfirm, setPublishConfirm] = useState(null);

    // Detail modal
    const [detailModal, setDetailModal] = useState(null);

    const { role } = authService.getCurrentUser();
    const canManage = ['Registrar', 'ITAdmin'].includes(role);
    const isStudent = role === 'Student';

    useEffect(() => {
        if (studentId && /^\d+$/.test(studentId)) {
            loadTranscripts();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [studentId]);

    const loadTranscripts = async () => {
        if (!studentId) return;
        try {
            setLoading(true);
            setError(null);
            const data = await transcriptService.getByStudent(studentId);
            setTranscripts(data || []);
            localStorage.setItem('lastStudentId', studentId);
        } catch (err) {
            setError(err);
            setTranscripts([]);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        setGenerateConfirm(false);
        try {
            setActionInProgress('generate');
            setActionMessage(null);
            const result = await transcriptService.generate(studentId);
            setActionMessage({
                type: 'success',
                text: `Draft transcript generated (ID ${result.transcriptID}). GPA: ${result.gpa?.toFixed(2) || 'Not yet computed'}.`,
            });
            await loadTranscripts();
        } catch (err) {
            setActionMessage({
                type: 'error',
                text: getFriendlySimpleMessage(err, 'Failed to generate transcript.'),
            });
        } finally {
            setActionInProgress(null);
        }
    };

    const handlePublish = async () => {
        if (!publishConfirm) return;
        const id = publishConfirm.transcriptID;
        setPublishConfirm(null);
        try {
            setActionInProgress(id);
            setActionMessage(null);
            await transcriptService.publish(id);
            setActionMessage({
                type: 'success',
                text: `Transcript ${id} issued. Student can now download the PDF.`,
            });
            await loadTranscripts();
        } catch (err) {
            setActionMessage({
                type: 'error',
                text: getFriendlySimpleMessage(err, 'Failed to publish transcript.'),
            });
        } finally {
            setActionInProgress(null);
        }
    };

    const handleDownloadPdf = async (t) => {
        try {
            setActionInProgress(t.transcriptID);
            setActionMessage(null);
            await transcriptService.downloadPdf(t.transcriptID, t.studentName?.replace(/\s+/g, '_') || 'student');
            setActionMessage({ type: 'success', text: 'PDF downloaded successfully.' });
        } catch (err) {
            const friendly = err.response?.data?.code === 'TRANSCRIPT_NOT_ISSUED'
                ? 'Only Issued transcripts can be downloaded. Publish it first.'
                : getFriendlySimpleMessage(err, 'Failed to download PDF.');
            setActionMessage({ type: 'error', text: friendly });
        } finally {
            setActionInProgress(null);
        }
    };

    // Parse entries JSON for preview in modal
    const parseEntries = (json) => {
        if (!json) return [];
        try {
            const parsed = JSON.parse(json);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    };

    return (
        <div>
            <h2 className="text-primary-edulearn mb-4">
                <i className="bi bi-file-earmark-text me-2"></i>Transcripts
            </h2>

            {/* Top-right auto-dismissing toast for action results */}
            <Toast
                show={!!actionMessage}
                type={actionMessage?.type}
                message={actionMessage?.text}
                onClose={() => setActionMessage(null)}
            />

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
                                placeholder={isStudent ? 'Find on your profile page' : 'Whose transcripts to view/manage'}
                                min="1"
                            />
                        </div>

                        <div className="col-md-3">
                            <label className="form-label fw-bold">&nbsp;</label>
                            <button
                                className="btn btn-outline-secondary w-100"
                                onClick={loadTranscripts}
                                disabled={!studentId || loading}
                            >
                                <i className="bi bi-arrow-clockwise me-1"></i>Refresh
                            </button>
                        </div>

                        <div className="col-md-3">
                            <label className="form-label fw-bold">&nbsp;</label>
                            {canManage && (
                                <button
                                    className="btn btn-primary-edulearn w-100"
                                    onClick={() => setGenerateConfirm(true)}
                                    disabled={!studentId || actionInProgress === 'generate'}
                                >
                                    {actionInProgress === 'generate' ? (
                                        <><span className="spinner-border spinner-border-sm me-2"></span>Generating...</>
                                    ) : (
                                        <><i className="bi bi-plus-lg me-2"></i>Generate New</>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <ErrorAlert error={error} onDismiss={() => setError(null)} />

            {loading && <Loading message="Loading transcripts..." />}

            {/* Empty state */}
            {!studentId && (
                <div className="alert alert-info">
                    <i className="bi bi-info-circle me-2"></i>
                    Enter a Student ID above to view their transcripts.
                </div>
            )}

            {/* Transcripts list */}
            {!loading && studentId && transcripts.length === 0 && !error && (
                <div className="card shadow-sm">
                    <div className="card-body text-center py-5 text-muted">
                        <i className="bi bi-file-earmark-x" style={{ fontSize: '3rem' }}></i>
                        <p className="mt-3 mb-0">No transcripts found for this student.</p>
                        {canManage && (
                            <button
                                className="btn btn-link mt-2"
                                onClick={() => setGenerateConfirm(true)}
                            >
                                <i className="bi bi-plus-lg me-1"></i>Generate the first transcript
                            </button>
                        )}
                    </div>
                </div>
            )}

            {!loading && transcripts.length > 0 && (
                <div className="card shadow-sm">
                    <div className="card-header bg-light">
                        <strong>
                            <i className="bi bi-file-earmark-text me-2"></i>
                            Transcripts ({transcripts.length})
                        </strong>
                    </div>
                    <div className="list-group list-group-flush">
                        {transcripts.map(t => {
                            const isIssued = t.status === 'Issued';
                            const isBusy = actionInProgress === t.transcriptID;
                            const entries = parseEntries(t.entriesJSON);

                            return (
                                <div key={t.transcriptID} className="list-group-item p-3">
                                    <div className="row align-items-center">
                                        <div className="col-md-7">
                                            <div className="d-flex align-items-center gap-2 mb-1">
                                                <h6 className="mb-0">
                                                    Transcript {t.transcriptID}
                                                </h6>
                                                <StatusBadge status={t.status} />
                                                {(() => {
                                                    const entries = parseEntries(t.entriesJSON);
                                                    const isStale = t.status !== 'Issued' &&
                                                        entries.some(e => e.gradePosted && !e.letterGrade);
                                                    return isStale ? (
                                                        <span
                                                            className="badge bg-warning text-dark"
                                                            title="Grades were updated after this transcript was generated"
                                                        >
                                                            <i className="bi bi-exclamation-triangle me-1"></i>Stale
                                                        </span>
                                                    ) : null;
                                                })()}
                                            </div>
                                            <div className="small text-muted">
                                                <i className="bi bi-person me-1"></i>
                                                {t.studentName} (<code>{t.mrn}</code>)
                                                <span className="mx-2">·</span>
                                                <i className="bi bi-mortarboard me-1"></i>{t.programName}
                                            </div>
                                            <div className="small text-muted mt-1">
                                                <i className="bi bi-calendar me-1"></i>
                                                {t.issuedAt ? new Date(t.issuedAt).toLocaleString() : '—'}
                                                <span className="mx-2">·</span>
                                                <i className="bi bi-bookmark me-1"></i>
                                                {entries.length} {entries.length === 1 ? 'course' : 'courses'}
                                            </div>
                                        </div>

                                        <div className="col-md-3 text-center">
                                            <div className="display-6 text-primary-edulearn fw-bold mb-0" style={{ fontSize: '2rem' }}>
                                                {t.gpa != null ? t.gpa.toFixed(2) : '—'}
                                            </div>
                                            <small className="text-muted">CGPA / 10.00</small>
                                        </div>

                                        <div className="col-md-2 text-end">
                                            <div className="btn-group-vertical btn-group-sm w-100">
                                                <button
                                                    className="btn btn-outline-secondary"
                                                    onClick={() => setDetailModal(t)}
                                                    disabled={isBusy}
                                                >
                                                    <i className="bi bi-eye me-1"></i>View
                                                </button>

                                                {!isIssued && canManage && (
                                                    <button
                                                        className="btn btn-outline-success"
                                                        onClick={() => setPublishConfirm(t)}
                                                        disabled={isBusy}
                                                    >
                                                        {isBusy ? (
                                                            <><span className="spinner-border spinner-border-sm"></span></>
                                                        ) : (
                                                            <><i className="bi bi-check2-circle me-1"></i>Issue</>
                                                        )}
                                                    </button>
                                                )}

                                                {isIssued && (
                                                    <button
                                                        className="btn btn-primary-edulearn"
                                                        onClick={() => handleDownloadPdf(t)}
                                                        disabled={isBusy}
                                                    >
                                                        {isBusy ? (
                                                            <><span className="spinner-border spinner-border-sm me-1"></span>...</>
                                                        ) : (
                                                            <><i className="bi bi-download me-1"></i>PDF</>
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Generate confirmation */}
            <ConfirmDialog
                show={generateConfirm}
                title="Generate New Transcript"
                message={
                    `Generate a fresh draft transcript for Student #${studentId}? ` +
                    'This will compute their GPA from all graded enrollments. ' +
                    'The transcript starts in Draft status and must be issued before it can be downloaded.'
                }
                onConfirm={handleGenerate}
                onCancel={() => setGenerateConfirm(false)}
                confirmText="Generate Draft"
                confirmVariant="primary"
            />

            {/* Issue confirmation */}
            <ConfirmDialog
                show={!!publishConfirm}
                title="Issue Transcript"
                message={
                    publishConfirm
                        ? `Issue Transcript ${publishConfirm.transcriptID} for ${publishConfirm.studentName}? ` +
                          'Once issued, the transcript becomes the official record and can be downloaded as a PDF.'
                        : ''
                }
                onConfirm={handlePublish}
                onCancel={() => setPublishConfirm(null)}
                confirmText="Issue"
                confirmVariant="success"
            />

            {/* Detail Modal */}
            {detailModal && (
                <ModalPortal>
                    <div className="modal-backdrop fade show"></div>
                    <div className="modal fade show d-block" tabIndex="-1">
                        <div className="modal-dialog modal-dialog-centered modal-lg">
                            <div className="modal-content">
                                <div className="modal-header bg-primary-edulearn text-white">
                                    <h5 className="modal-title">
                                        <i className="bi bi-file-earmark-text me-2"></i>
                                        Transcript {detailModal.transcriptID} Preview
                                    </h5>
                                    <button type="button" className="btn-close btn-close-white" onClick={() => setDetailModal(null)}></button>
                                </div>
                                <div className="modal-body">
                                    {/* Header info */}
                                    <div className="row g-3 mb-4">
                                        <div className="col-md-8">
                                            <h4 className="text-primary-edulearn mb-1">{detailModal.studentName}</h4>
                                            <div className="small text-muted">
                                                MRN: <code>{detailModal.mrn}</code>
                                                <span className="mx-2">·</span>
                                                Program: {detailModal.programName}
                                            </div>
                                        </div>
                                        <div className="col-md-4 text-end">
                                            <div className="h2 text-primary-edulearn fw-bold mb-0">
                                                {detailModal.gpa != null ? detailModal.gpa.toFixed(2) : '—'}
                                                <span className="text-muted h6 ms-1">/10.00</span>
                                            </div>
                                            <small className="text-muted">CGPA · <StatusBadge status={detailModal.status} /></small>
                                        </div>
                                    </div>

                                    <hr />

                                    <h6 className="text-muted text-uppercase small mb-3">Academic Record</h6>

                                    {(() => {
                                        const entries = parseEntries(detailModal.entriesJSON);
                                        if (entries.length === 0) {
                                            return (
                                                <p className="text-muted text-center py-3 mb-0">
                                                    No course entries on this transcript.
                                                </p>
                                            );
                                        }
                                        return (
                                            <div className="table-responsive">
                                                <table className="table table-sm">
                                                    <thead className="table-light">
                                                        <tr>
                                                            <th>Code</th>
                                                            <th>Course Title</th>
                                                            <th className="text-center">Credits</th>
                                                            <th className="text-center">Term</th>
                                                            <th className="text-center">Grade</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {entries.map((entry, idx) => (
                                                            <tr key={idx}>
                                                                <td><code>{entry.courseCode || '—'}</code></td>
                                                                <td>{entry.courseName || '—'}</td>
                                                                <td className="text-center">{entry.credits ?? '—'}</td>
                                                                <td className="text-center">{entry.term || '—'}</td>
                                                                <td className="text-center">
                                                                    {entry.letterGrade ? (
                                                                        <span className={`badge ${
                                                                            entry.letterGrade === 'F'                          ? 'bg-danger' :
                                                                            entry.letterGrade === 'E' || entry.letterGrade === 'D' ? 'bg-warning text-dark' :
                                                                            'bg-success'
                                                                        }`}>
                                                                            {entry.letterGrade}
                                                                            {entry.percentage != null ? ` · ${Number(entry.percentage).toFixed(1)}%` : ''}
                                                                        </span>
                                                                    ) : entry.gradePosted ? (
                                                                        <span
                                                                            className="badge bg-warning text-dark"
                                                                            title="Grade was posted after this transcript was generated — regenerate for updated grade"
                                                                        >
                                                                            <i className="bi bi-clock-history me-1"></i>Stale
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-muted small">Pending</span>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        );
                                    })()}

                                    {/* Stale warning — shown when gradePosted=true but letterGrade=null */}
                                    {(() => {
                                        const entries = parseEntries(detailModal.entriesJSON);
                                        const hasStale = detailModal.status !== 'Issued' &&
                                            entries.some(e => e.gradePosted && !e.letterGrade);
                                        if (!hasStale) return null;
                                        return (
                                            <div className="alert alert-warning py-2 mt-3 mb-2">
                                                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                                                <strong>Stale transcript</strong> — One or more grades were recorded
                                                after this transcript was generated. The CGPA shown may be incorrect.
                                                {canManage && (
                                                    <button
                                                        className="btn btn-link btn-sm p-0 ms-2 fw-bold"
                                                        onClick={() => {
                                                            setDetailModal(null);
                                                            setGenerateConfirm(true);
                                                        }}
                                                    >
                                                        Regenerate now →
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })()}

                                    <div className="alert alert-info mb-0 mt-2 py-2">
                                        <i className="bi bi-info-circle me-2"></i>
                                        <small>
                                            This is a preview. {detailModal.status === 'Issued'
                                                ? 'Click "PDF" to download the official document.'
                                                : 'Issue this transcript to enable PDF download.'}
                                        </small>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    {detailModal.status === 'Issued' && (
                                        <button
                                            type="button"
                                            className="btn btn-primary-edulearn"
                                            onClick={() => {
                                                setDetailModal(null);
                                                handleDownloadPdf(detailModal);
                                            }}
                                        >
                                            <i className="bi bi-download me-2"></i>Download PDF
                                        </button>
                                    )}
                                    <button type="button" className="btn btn-outline-secondary" onClick={() => setDetailModal(null)}>
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}
        </div>
    );
}
