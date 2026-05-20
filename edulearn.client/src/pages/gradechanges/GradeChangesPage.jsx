import { useState } from 'react';
import { gradeChangeService } from '../../services/gradeChangeService';
import { authService } from '../../services/authService';
import Loading from '../../components/Loading';
import ErrorAlert from '../../components/ErrorAlert';

export default function GradeChangesPage() {
    const { role } = authService.getCurrentUser();

    const [submissionId, setSubmissionId] = useState('');
    const [changes, setChanges] = useState([]);
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState('');
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        submissionID: '',
        oldScore: '',
        newScore: '',
        reason: '',
        auditNote: '',
    });

    const canCreate = ['Instructor', 'ITAdmin'].includes(role);
    const canView = ['Instructor', 'Auditor', 'ITAdmin'].includes(role);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!submissionId) return;
        try {
            setLoading(true);
            setError(null);
            const data = await gradeChangeService.getBySubmission(submissionId);
            setChanges(data || []);
            setHasSearched(true);
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess('');
        setSaving(true);
        try {
            const payload = {
                submissionID: Number(form.submissionID),
                oldScore: Number(form.oldScore),
                newScore: Number(form.newScore),
                reason: form.reason || null,
                auditNote: form.auditNote || null,
            };
            await gradeChangeService.create(payload);
            setSuccess('Grade change recorded successfully.');
            setForm({ submissionID: '', oldScore: '', newScore: '', reason: '', auditNote: '' });
            // Refresh if we were already viewing this submission
            if (String(submissionId) === String(form.submissionID)) {
                const data = await gradeChangeService.getBySubmission(submissionId);
                setChanges(data || []);
            }
        } catch (err) {
            setError(err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div>
            {/* Page Header */}
            <div className="d-flex align-items-center justify-content-between mb-4">
                <h2 className="text-primary-edulearn mb-0">
                    <i className="bi bi-arrow-left-right me-2"></i>Grade Changes
                </h2>
            </div>

            <div className="row g-4">
                {/* Left — Search */}
                <div className="col-md-8">
                    {/* Search Card */}
                    <div className="card shadow-sm mb-4">
                        <div className="card-header bg-light">
                            <strong>
                                <i className="bi bi-search me-2"></i>
                                View Grade Change History
                            </strong>
                        </div>
                        <div className="card-body">
                            <form onSubmit={handleSearch}>
                                <div className="row g-3 align-items-end">
                                    <div className="col-md-8">
                                        <label className="form-label fw-bold">
                                            Submission ID <span className="text-danger">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            className="form-control"
                                            value={submissionId}
                                            onChange={e => setSubmissionId(e.target.value)}
                                            placeholder="e.g. 5"
                                            required
                                        />
                                    </div>
                                    <div className="col-md-4">
                                        <button
                                            type="submit"
                                            className="btn btn-primary-edulearn w-100"
                                            disabled={loading}
                                        >
                                            {loading
                                                ? <span className="spinner-border spinner-border-sm"></span>
                                                : <><i className="bi bi-search me-1"></i>Search</>
                                            }
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>

                    <ErrorAlert error={error} onDismiss={() => setError(null)} />

                    {/* Results */}
                    {loading && <Loading message="Loading grade changes..." />}

                    {!loading && hasSearched && changes.length === 0 && (
                        <div className="text-center py-5 text-muted">
                            <i className="bi bi-inbox display-4 d-block mb-3"></i>
                            <p className="mb-0">No grade changes found for this submission.</p>
                        </div>
                    )}

                    {!loading && changes.length > 0 && (
                        <div className="card shadow-sm">
                            <div className="card-header bg-light d-flex align-items-center justify-content-between">
                                <strong>
                                    <i className="bi bi-clock-history me-2"></i>
                                    Grade Change History
                                </strong>
                                <small className="text-muted">
                                    {changes.length} change(s)
                                </small>
                            </div>
                            <div className="table-responsive">
                                <table className="table table-hover align-middle mb-0">
                                    <thead className="table-light">
                                        <tr>
                                            <th>ID</th>
                                            <th>Old Score</th>
                                            <th>New Score</th>
                                            <th>Changed By</th>
                                            <th>Changed At</th>
                                            <th>Reason</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {changes.map(c => (
                                            <tr key={c.gradeChangeID}>
                                                <td><code>#{c.gradeChangeID}</code></td>
                                                <td>
                                                    <span className="text-danger fw-bold">
                                                        {c.oldScore}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className="text-success fw-bold">
                                                        {c.newScore}
                                                    </span>
                                                </td>
                                                <td>{c.changedByName || `#${c.changedByFK}`}</td>
                                                <td>
                                                    {c.changedAt
                                                        ? new Date(c.changedAt).toLocaleString()
                                                        : '—'}
                                                </td>
                                                <td>
                                                    {c.reason
                                                        ? <small>{c.reason}</small>
                                                        : <span className="text-muted">—</span>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right — Create */}
                {canCreate && (
                    <div className="col-md-4">
                        <div className="card shadow-sm">
                            <div className="card-header bg-primary-edulearn text-white">
                                <strong>
                                    <i className="bi bi-plus-circle me-2"></i>
                                    Record Grade Change
                                </strong>
                            </div>
                            <div className="card-body">
                                {success && (
                                    <div className="alert alert-success">
                                        <i className="bi bi-check-circle me-2"></i>{success}
                                    </div>
                                )}
                                <form onSubmit={handleCreate}>
                                    <div className="row g-3">
                                        <div className="col-12">
                                            <label className="form-label fw-bold">
                                                Submission ID <span className="text-danger">*</span>
                                            </label>
                                            <input
                                                type="number"
                                                className="form-control"
                                                value={form.submissionID}
                                                onChange={e => setForm({ ...form, submissionID: e.target.value })}
                                                placeholder="e.g. 5"
                                                required
                                            />
                                        </div>
                                        <div className="col-6">
                                            <label className="form-label fw-bold">
                                                Old Score <span className="text-danger">*</span>
                                            </label>
                                            <input
                                                type="number"
                                                className="form-control"
                                                value={form.oldScore}
                                                onChange={e => setForm({ ...form, oldScore: e.target.value })}
                                                step="0.1"
                                                required
                                            />
                                        </div>
                                        <div className="col-6">
                                            <label className="form-label fw-bold">
                                                New Score <span className="text-danger">*</span>
                                            </label>
                                            <input
                                                type="number"
                                                className="form-control"
                                                value={form.newScore}
                                                onChange={e => setForm({ ...form, newScore: e.target.value })}
                                                step="0.1"
                                                required
                                            />
                                        </div>
                                        <div className="col-12">
                                            <label className="form-label fw-bold">Reason</label>
                                            <textarea
                                                className="form-control"
                                                value={form.reason}
                                                onChange={e => setForm({ ...form, reason: e.target.value })}
                                                rows={2}
                                                placeholder="Reason for grade change..."
                                            />
                                        </div>
                                        <div className="col-12">
                                            <label className="form-label fw-bold">Audit Note</label>
                                            <textarea
                                                className="form-control"
                                                value={form.auditNote}
                                                onChange={e => setForm({ ...form, auditNote: e.target.value })}
                                                rows={2}
                                                placeholder="Internal audit note..."
                                            />
                                        </div>
                                    </div>
                                    <div className="mt-3">
                                        <button
                                            type="submit"
                                            className="btn btn-primary-edulearn w-100"
                                            disabled={saving}
                                        >
                                            {saving ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-2"></span>
                                                    Saving...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="bi bi-check-lg me-2"></i>
                                                    Record Change
                                                </>
                                            )}
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