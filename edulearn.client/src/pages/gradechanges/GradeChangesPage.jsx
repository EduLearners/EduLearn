import { useState, useEffect } from 'react';
import { gradeChangeService } from '../../services/gradeChangeService';
import { sectionService } from '../../services/sectionService';
import { enrollmentService } from '../../services/enrollmentService';
import { submissionService } from '../../services/submissionService';
import { authService } from '../../services/authService';
import Loading from '../../components/Loading';
import ErrorAlert from '../../components/ErrorAlert';
import StatusBadge from '../../components/StatusBadge';

export default function GradeChangesPage() {
    const { role, userId } = authService.getCurrentUser();
    const isInstructor = role === 'Instructor';

    // Step 1 — Section
    const [mySections, setMySections] = useState([]);
    const [selectedSection, setSelectedSection] = useState('');
    const [loadingSections, setLoadingSections] = useState(false);

    // Step 2 — Students in section
    const [enrolledStudents, setEnrolledStudents] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState('');
    const [loadingStudents, setLoadingStudents] = useState(false);

    // Step 3 — Submissions for selected student in this section's course
    const [submissions, setSubmissions] = useState([]);
    const [selectedSubmission, setSelectedSubmission] = useState(null);
    const [loadingSubmissions, setLoadingSubmissions] = useState(false);

    // Grade change form
    const [form, setForm] = useState({ newScore: '', reason: '', auditNote: '' });
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState(null);

    // History view
    const [history, setHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const canCreate = ['Instructor', 'ITAdmin'].includes(role);

    // Load instructor's sections on mount
    useEffect(() => {
        if (isInstructor && userId) {
            loadMySections();
        }
    }, []);

    const loadMySections = async () => {
        try {
            setLoadingSections(true);
            const data = await sectionService.getByInstructor(userId);
            setMySections(data || []);
        } catch {
            setMySections([]);
        } finally {
            setLoadingSections(false);
        }
    };

    // When section selected → load enrolled students
    const handleSectionChange = async (e) => {
        const sectionId = e.target.value;
        setSelectedSection(sectionId);
        setSelectedStudent('');
        setSubmissions([]);
        setSelectedSubmission(null);
        setEnrolledStudents([]);
        setSuccess('');
        setError(null);

        if (!sectionId) return;
        try {
            setLoadingStudents(true);
            const enrollments = await enrollmentService.getBySection(sectionId);
            // Only enrolled (not waitlisted or dropped)
            const active = (enrollments || []).filter(e => e.status === 'Enrolled');
            setEnrolledStudents(active);
        } catch (err) {
            setError(err);
        } finally {
            setLoadingStudents(false);
        }
    };

    // When student selected → load their submissions for this section
    const handleStudentChange = async (e) => {
        const studentId = e.target.value;
        setSelectedStudent(studentId);
        setSelectedSubmission(null);
        setSubmissions([]);
        setSuccess('');
        setError(null);

        if (!studentId || !selectedSection) return;

        const section = mySections.find(s => String(s.sectionID) === selectedSection);
        const sectionId = section?.sectionID;

        try {
            setLoadingSubmissions(true);
            const allSubs = await submissionService.getByStudent(studentId);
            // Filter to only submissions for assessments in this section (by sectionID match)
            const filtered = (allSubs || []).filter(sub =>
                !sub.sectionID || String(sub.sectionID) === String(sectionId)
            );
            setSubmissions(filtered.length > 0 ? filtered : allSubs || []);
        } catch (err) {
            setError(err);
        } finally {
            setLoadingSubmissions(false);
        }
    };

    // When submission selected
    const handleSubmissionSelect = async (sub) => {
        setSelectedSubmission(sub);
        setForm({ newScore: sub.score ?? '', reason: '', auditNote: '' });
        setSuccess('');
        setError(null);

        // Load grade change history for this submission
        try {
            setLoadingHistory(true);
            const hist = await gradeChangeService.getBySubmission(sub.submissionID);
            setHistory(hist || []);
        } catch {
            setHistory([]);
        } finally {
            setLoadingHistory(false);
        }
    };

    // Submit grade change
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedSubmission) return;
        setError(null);
        setSuccess('');
        setSaving(true);
        try {
            await gradeChangeService.create({
                submissionID: selectedSubmission.submissionID,
                oldScore: selectedSubmission.score ?? 0,
                newScore: Number(form.newScore),
                reason: form.reason || null,
                auditNote: form.auditNote || null,
            });
            setSuccess(`Grade changed from ${selectedSubmission.score ?? 0} → ${form.newScore} successfully.`);
            // Refresh history
            const hist = await gradeChangeService.getBySubmission(selectedSubmission.submissionID);
            setHistory(hist || []);
            // Update submission score locally
            setSelectedSubmission(prev => ({ ...prev, score: Number(form.newScore) }));
            setSubmissions(prev =>
                prev.map(s => s.submissionID === selectedSubmission.submissionID
                    ? { ...s, score: Number(form.newScore) }
                    : s)
            );
        } catch (err) {
            setError(err);
        } finally {
            setSaving(false);
        }
    };

    const parseSchedule = (json) => {
        try { return json ? JSON.parse(json) : null; } catch { return null; }
    };

    // ── For non-instructor (ITAdmin / Auditor) — keep simple submission ID search ──
    const [submissionIdSearch, setSubmissionIdSearch] = useState('');
    const [searchHistory, setSearchHistory] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchError, setSearchError] = useState(null);
    const [gcForm, setGcForm] = useState({ submissionID: '', oldScore: '', newScore: '', reason: '', auditNote: '' });
    const [gcSaving, setGcSaving] = useState(false);
    const [gcSuccess, setGcSuccess] = useState('');

    const handleAdminSearch = async (e) => {
        e.preventDefault();
        if (!submissionIdSearch) return;
        try {
            setSearchLoading(true);
            setSearchError(null);
            const data = await gradeChangeService.getBySubmission(submissionIdSearch);
            setSearchHistory(data || []);
        } catch (err) {
            setSearchError(err);
        } finally {
            setSearchLoading(false);
        }
    };

    const handleAdminCreate = async (e) => {
        e.preventDefault();
        setSearchError(null);
        setGcSuccess('');
        setGcSaving(true);
        try {
            await gradeChangeService.create({
                submissionID: Number(gcForm.submissionID),
                oldScore: Number(gcForm.oldScore),
                newScore: Number(gcForm.newScore),
                reason: gcForm.reason || null,
                auditNote: gcForm.auditNote || null,
            });
            setGcSuccess('Grade change recorded successfully.');
            setGcForm({ submissionID: '', oldScore: '', newScore: '', reason: '', auditNote: '' });
        } catch (err) {
            setSearchError(err);
        } finally {
            setGcSaving(false);
        }
    };

    // ── Render Instructor View ──────────────────────────────────────────────────
    if (isInstructor) {
        return (
            <div>
                <div className="d-flex align-items-center justify-content-between mb-4">
                    <h2 className="text-primary-edulearn mb-0">
                        <i className="bi bi-arrow-left-right me-2"></i>Grade Changes
                    </h2>
                </div>

                <ErrorAlert error={error} onDismiss={() => setError(null)} />

                {success && (
                    <div className="alert alert-success d-flex align-items-center">
                        <i className="bi bi-check-circle-fill me-2"></i>
                        <div>{success}</div>
                        <button className="btn-close ms-auto" onClick={() => setSuccess('')}></button>
                    </div>
                )}

                {/* Step 1 — Select Section */}
                <div className="card shadow-sm mb-3">
                    <div className="card-header bg-light">
                        <strong><i className="bi bi-collection me-2"></i>Step 1 — Select Your Section</strong>
                    </div>
                    <div className="card-body">
                        {loadingSections ? (
                            <div className="d-flex align-items-center gap-2 text-muted">
                                <span className="spinner-border spinner-border-sm"></span>
                                <small>Loading your sections...</small>
                            </div>
                        ) : (
                            <select
                                className="form-select"
                                value={selectedSection}
                                onChange={handleSectionChange}
                            >
                                <option value="">— Select a section —</option>
                                {mySections.map(s => {
                                    const sched = parseSchedule(s.scheduleJSON);
                                    return (
                                        <option key={s.sectionID} value={s.sectionID}>
                                            {s.courseName} — Section #{s.sectionID}
                                            {sched ? ` · ${sched.days} ${sched.time}` : ''}
                                            {` · ${s.enrolledCount}/${s.capacity} students`}
                                        </option>
                                    );
                                })}
                            </select>
                        )}
                        {mySections.length === 0 && !loadingSections && (
                            <small className="text-warning mt-2 d-block">
                                <i className="bi bi-exclamation-triangle me-1"></i>
                                No sections assigned to you. Contact the Registrar.
                            </small>
                        )}
                    </div>
                </div>

                {/* Step 2 — Select Student */}
                {selectedSection && (
                    <div className="card shadow-sm mb-3">
                        <div className="card-header bg-light">
                            <strong><i className="bi bi-person me-2"></i>Step 2 — Select Student</strong>
                        </div>
                        <div className="card-body">
                            {loadingStudents ? (
                                <Loading message="Loading enrolled students..." />
                            ) : enrolledStudents.length === 0 ? (
                                <div className="text-muted small">
                                    <i className="bi bi-inbox me-2"></i>No enrolled students in this section.
                                </div>
                            ) : (
                                <select
                                    className="form-select"
                                    value={selectedStudent}
                                    onChange={handleStudentChange}
                                >
                                    <option value="">— Select a student ({enrolledStudents.length} enrolled) —</option>
                                    {enrolledStudents.map(e => (
                                        <option key={e.studentID} value={e.studentID}>
                                            {e.studentName} (#{e.studentID})
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </div>
                )}

                {/* Step 3 — Select Submission */}
                {selectedStudent && (
                    <div className="card shadow-sm mb-3">
                        <div className="card-header bg-light">
                            <strong><i className="bi bi-file-earmark me-2"></i>Step 3 — Select Submission to Change Grade</strong>
                        </div>
                        <div className="card-body p-0">
                            {loadingSubmissions ? (
                                <div className="p-3"><Loading message="Loading submissions..." /></div>
                            ) : submissions.length === 0 ? (
                                <div className="p-3 text-muted small">
                                    <i className="bi bi-inbox me-2"></i>No submissions found for this student.
                                </div>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table table-hover align-middle mb-0">
                                        <thead className="table-light">
                                            <tr>
                                                <th>Assessment</th>
                                                <th>Submitted At</th>
                                                <th>Status</th>
                                                <th>Current Score</th>
                                                <th>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {submissions.map(sub => (
                                                <tr
                                                    key={sub.submissionID}
                                                    className={selectedSubmission?.submissionID === sub.submissionID ? 'table-primary' : ''}
                                                >
                                                    <td className="fw-bold">
                                                        {sub.assessmentTitle || `Assessment #${sub.assessmentID}`}
                                                    </td>
                                                    <td>
                                                        <small className="text-muted">
                                                            {sub.submittedAt ? new Date(sub.submittedAt).toLocaleString() : '—'}
                                                        </small>
                                                    </td>
                                                    <td><StatusBadge status={sub.status} /></td>
                                                    <td>
                                                        {sub.score != null
                                                            ? <span className="fw-bold text-success">{sub.score} / {sub.maxScore}</span>
                                                            : <span className="text-muted">Not graded</span>}
                                                    </td>
                                                    <td>
                                                        <button
                                                            className="btn btn-sm btn-primary-edulearn"
                                                            onClick={() => handleSubmissionSelect(sub)}
                                                        >
                                                            <i className="bi bi-pencil me-1"></i>Change Grade
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Step 4 — Grade Change Form */}
                {selectedSubmission && (
                    <div className="row g-4">
                        <div className="col-md-6">
                            <div className="card shadow-sm">
                                <div className="card-header bg-primary-edulearn text-white">
                                    <strong>
                                        <i className="bi bi-star me-2"></i>
                                        Step 4 — Record Grade Change
                                    </strong>
                                </div>
                                <div className="card-body">
                                    <div className="alert alert-info mb-3 py-2 small">
                                        <i className="bi bi-info-circle me-2"></i>
                                        Changing grade for <strong>{selectedSubmission.assessmentTitle || `#${selectedSubmission.assessmentID}`}</strong>
                                        {' '}— Current: <strong>{selectedSubmission.score ?? 'Not graded'}</strong> / {selectedSubmission.maxScore}
                                    </div>
                                    <form onSubmit={handleSubmit}>
                                        <div className="row g-3">
                                            <div className="col-6">
                                                <label className="form-label fw-bold">Old Score</label>
                                                <input
                                                    type="number"
                                                    className="form-control bg-light"
                                                    value={selectedSubmission.score ?? 0}
                                                    readOnly
                                                />
                                            </div>
                                            <div className="col-6">
                                                <label className="form-label fw-bold">New Score <span className="text-danger">*</span></label>
                                                <input
                                                    type="number"
                                                    className="form-control"
                                                    value={form.newScore}
                                                    onChange={e => setForm({ ...form, newScore: e.target.value })}
                                                    min={0}
                                                    max={selectedSubmission.maxScore}
                                                    step={0.1}
                                                    required
                                                />
                                                <small className="text-muted">Max: {selectedSubmission.maxScore}</small>
                                            </div>
                                            <div className="col-12">
                                                <label className="form-label fw-bold">Reason <span className="text-danger">*</span></label>
                                                <textarea
                                                    className="form-control"
                                                    value={form.reason}
                                                    onChange={e => setForm({ ...form, reason: e.target.value })}
                                                    rows={2}
                                                    placeholder="Reason for grade change (e.g. marking error, re-evaluation)..."
                                                    required
                                                />
                                            </div>
                                            <div className="col-12">
                                                <label className="form-label fw-bold">Audit Note</label>
                                                <textarea
                                                    className="form-control"
                                                    value={form.auditNote}
                                                    onChange={e => setForm({ ...form, auditNote: e.target.value })}
                                                    rows={2}
                                                    placeholder="Internal audit note (optional)..."
                                                />
                                            </div>
                                        </div>
                                        <div className="mt-3">
                                            <button type="submit" className="btn btn-primary-edulearn w-100" disabled={saving}>
                                                {saving
                                                    ? <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</>
                                                    : <><i className="bi bi-check-lg me-2"></i>Record Grade Change</>
                                                }
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>

                        {/* Grade Change History */}
                        <div className="col-md-6">
                            <div className="card shadow-sm h-100">
                                <div className="card-header bg-light">
                                    <strong><i className="bi bi-clock-history me-2"></i>Change History</strong>
                                </div>
                                {loadingHistory ? (
                                    <div className="card-body"><Loading message="Loading history..." /></div>
                                ) : history.length === 0 ? (
                                    <div className="card-body text-center text-muted py-4">
                                        <i className="bi bi-clock-history display-5 opacity-25 d-block mb-2"></i>
                                        <small>No grade changes yet for this submission.</small>
                                    </div>
                                ) : (
                                    <div className="table-responsive">
                                        <table className="table table-sm align-middle mb-0">
                                            <thead className="table-light">
                                                <tr>
                                                    <th>From → To</th>
                                                    <th>By</th>
                                                    <th>Reason</th>
                                                    <th>Date</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {history.map(c => (
                                                    <tr key={c.gradeChangeID}>
                                                        <td>
                                                            <span className="text-danger fw-bold">{c.oldScore}</span>
                                                            <i className="bi bi-arrow-right mx-1 text-muted"></i>
                                                            <span className="text-success fw-bold">{c.newScore}</span>
                                                        </td>
                                                        <td><small>{c.changedByName}</small></td>
                                                        <td><small className="text-muted">{c.reason || '—'}</small></td>
                                                        <td>
                                                            <small className="text-muted">
                                                                {c.changedAt ? new Date(c.changedAt).toLocaleDateString() : '—'}
                                                            </small>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ── Render Admin / Auditor View ─────────────────────────────────────────────
    return (
        <div>
            <div className="d-flex align-items-center justify-content-between mb-4">
                <h2 className="text-primary-edulearn mb-0">
                    <i className="bi bi-arrow-left-right me-2"></i>Grade Changes
                </h2>
            </div>

            <div className="row g-4">
                <div className="col-md-8">
                    <div className="card shadow-sm mb-4">
                        <div className="card-header bg-light">
                            <strong><i className="bi bi-search me-2"></i>View Grade Change History</strong>
                        </div>
                        <div className="card-body">
                            <form onSubmit={handleAdminSearch}>
                                <div className="row g-3 align-items-end">
                                    <div className="col-md-8">
                                        <label className="form-label fw-bold">Submission ID <span className="text-danger">*</span></label>
                                        <input
                                            type="number"
                                            className="form-control"
                                            value={submissionIdSearch}
                                            onChange={e => setSubmissionIdSearch(e.target.value)}
                                            placeholder="e.g. 5"
                                            required
                                        />
                                    </div>
                                    <div className="col-md-4">
                                        <button type="submit" className="btn btn-primary-edulearn w-100" disabled={searchLoading}>
                                            {searchLoading
                                                ? <span className="spinner-border spinner-border-sm"></span>
                                                : <><i className="bi bi-search me-1"></i>Search</>
                                            }
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>

                    <ErrorAlert error={searchError} onDismiss={() => setSearchError(null)} />

                    {searchHistory.length > 0 && (
                        <div className="card shadow-sm">
                            <div className="card-header bg-light">
                                <strong><i className="bi bi-clock-history me-2"></i>Grade Change History ({searchHistory.length})</strong>
                            </div>
                            <div className="table-responsive">
                                <table className="table table-hover align-middle mb-0">
                                    <thead className="table-light">
                                        <tr><th>ID</th><th>Old Score</th><th>New Score</th><th>Changed By</th><th>Changed At</th><th>Reason</th></tr>
                                    </thead>
                                    <tbody>
                                        {searchHistory.map(c => (
                                            <tr key={c.gradeChangeID}>
                                                <td><code>#{c.gradeChangeID}</code></td>
                                                <td><span className="text-danger fw-bold">{c.oldScore}</span></td>
                                                <td><span className="text-success fw-bold">{c.newScore}</span></td>
                                                <td>{c.changedByName || `#${c.changedByFK}`}</td>
                                                <td><small>{c.changedAt ? new Date(c.changedAt).toLocaleString() : '—'}</small></td>
                                                <td><small>{c.reason || '—'}</small></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {canCreate && (
                    <div className="col-md-4">
                        <div className="card shadow-sm">
                            <div className="card-header bg-primary-edulearn text-white">
                                <strong><i className="bi bi-plus-circle me-2"></i>Record Grade Change</strong>
                            </div>
                            <div className="card-body">
                                {gcSuccess && <div className="alert alert-success small"><i className="bi bi-check-circle me-2"></i>{gcSuccess}</div>}
                                <form onSubmit={handleAdminCreate}>
                                    <div className="row g-3">
                                        <div className="col-12">
                                            <label className="form-label fw-bold">Submission ID <span className="text-danger">*</span></label>
                                            <input type="number" className="form-control" value={gcForm.submissionID} onChange={e => setGcForm({ ...gcForm, submissionID: e.target.value })} placeholder="e.g. 5" required />
                                        </div>
                                        <div className="col-6">
                                            <label className="form-label fw-bold">Old Score <span className="text-danger">*</span></label>
                                            <input type="number" className="form-control" value={gcForm.oldScore} onChange={e => setGcForm({ ...gcForm, oldScore: e.target.value })} step="0.1" required />
                                        </div>
                                        <div className="col-6">
                                            <label className="form-label fw-bold">New Score <span className="text-danger">*</span></label>
                                            <input type="number" className="form-control" value={gcForm.newScore} onChange={e => setGcForm({ ...gcForm, newScore: e.target.value })} step="0.1" required />
                                        </div>
                                        <div className="col-12">
                                            <label className="form-label fw-bold">Reason</label>
                                            <textarea className="form-control" value={gcForm.reason} onChange={e => setGcForm({ ...gcForm, reason: e.target.value })} rows={2} placeholder="Reason..." />
                                        </div>
                                        <div className="col-12">
                                            <label className="form-label fw-bold">Audit Note</label>
                                            <textarea className="form-control" value={gcForm.auditNote} onChange={e => setGcForm({ ...gcForm, auditNote: e.target.value })} rows={2} placeholder="Audit note..." />
                                        </div>
                                    </div>
                                    <div className="mt-3">
                                        <button type="submit" className="btn btn-primary-edulearn w-100" disabled={gcSaving}>
                                            {gcSaving ? <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</> : <><i className="bi bi-check-lg me-2"></i>Record Change</>}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
