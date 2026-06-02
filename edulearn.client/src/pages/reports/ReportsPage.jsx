import { useState, useEffect } from 'react';
import { reportService } from '../../services/reportService';
import { authService } from '../../services/authService';
import Loading from '../../components/Loading';
import ErrorAlert from '../../components/ErrorAlert';
import Toast from '../../components/Toast';

const REPORT_SCOPES = ['Course', 'Department', 'Institution', 'Student', 'Enrollment'];

export default function ReportsPage() {
    const { role } = authService.getCurrentUser();

    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [generating, setGenerating] = useState(false);
    const [success, setSuccess] = useState('');
    const [downloading, setDownloading] = useState(null);

    const [form, setForm] = useState({
        scope: 'Institution',
        paramValue: '', // single parameter value (ID) for the selected scope
    });
    const [errors, setErrors] = useState({});

    const canGenerate = ['Auditor', 'ITAdmin'].includes(role);

    useEffect(() => {
        loadReports();
    }, []);

    const loadReports = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await reportService.getAll();
            setReports(data || []);
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    // Scope → parameter key mapping
    const scopeParamKey = { Course: 'courseId', Department: 'departmentId', Student: 'studentId', Enrollment: 'enrollmentId' };

    const handleGenerate = async (e) => {
        e.preventDefault();
        const paramKey = scopeParamKey[form.scope];
        // Validate: if scope needs a param, require a value
        if (paramKey && !form.paramValue) {
            setErrors({ paramValue: `${form.scope} ID is required` });
            return;
        }
        setErrors({});
        setError(null);
        setSuccess('');
        setGenerating(true);
        try {
            // Build parametersJSON from structured input
            const parametersJSON = paramKey && form.paramValue
                ? JSON.stringify({ [paramKey]: Number(form.paramValue) })
                : null;
            const payload = { scope: form.scope, parametersJSON };
            await reportService.generate(payload);
            setSuccess('Report generated successfully.');
            setForm({ scope: 'Institution', paramValue: '' });
            loadReports();
        } catch (err) {
            setError(err);
        } finally {
            setGenerating(false);
        }
    };

    const handleDownloadPdf = async (reportID) => {
        try {
            setDownloading(reportID);
            const blob = await reportService.downloadPdf(reportID);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `report-${reportID}.pdf`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            setError(err);
        } finally {
            setDownloading(null);
        }
    };

    const handleDownloadJson = async (reportID) => {
        try {
            setDownloading(reportID);
            const data = await reportService.downloadJson(reportID);
            const blob = new Blob(
                [JSON.stringify(data, null, 2)],
                { type: 'application/json' }
            );
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `report-${reportID}.json`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            setError(err);
        } finally {
            setDownloading(null);
        }
    };

    return (
        <div>
            <Toast show={!!success} type="success" message={success} onClose={() => setSuccess('')} />

            {/* Page Header */}
            <div className="d-flex align-items-center justify-content-between mb-4">
                <h2 className="text-primary-edulearn mb-0">
                    <i className="bi bi-file-earmark-bar-graph me-2"></i>Reports
                </h2>
                <button
                    className="btn btn-outline-secondary btn-sm"
                    onClick={loadReports}
                    disabled={loading}
                >
                    <i className="bi bi-arrow-clockwise me-1"></i>Refresh
                </button>
            </div>

            {/* Generate Report Card */}
            {canGenerate && (
                <div className="card shadow-sm mb-4">
                    <div className="card-header bg-primary-edulearn text-white">
                        <strong>
                            <i className="bi bi-plus-circle me-2"></i>
                            Generate New Report
                        </strong>
                    </div>
                    <div className="card-body">
                        <form onSubmit={handleGenerate}>
                            <div className="row g-3">
                                <div className="col-md-4">
                                    <label className="form-label fw-bold">
                                        Scope <span className="text-danger">*</span>
                                    </label>
                                    <select
                                        className="form-select"
                                        value={form.scope}
                                        onChange={e => setForm({ scope: e.target.value, paramValue: '' })}
                                        required
                                    >
                                        {REPORT_SCOPES.map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </div>
                                {scopeParamKey[form.scope] ? (
                                    <div className="col-md-8">
                                        <label className="form-label fw-bold">
                                            {form.scope} ID <span className="text-danger">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            className={`form-control${errors.paramValue ? ' is-invalid' : ''}`}
                                            value={form.paramValue}
                                            onChange={e => { setForm({ ...form, paramValue: e.target.value }); setErrors({}); }}
                                            placeholder={`Enter ${form.scope} ID…`}
                                            min={1}
                                            required
                                        />
                                        {errors.paramValue && <div className="invalid-feedback">{errors.paramValue}</div>}
                                        <div className="form-text">Enter the numeric ID of the {form.scope.toLowerCase()} to report on.</div>
                                    </div>
                                ) : (
                                    <div className="col-md-8 d-flex align-items-center">
                                        <div className="alert alert-light border mb-0 py-2 w-100 small">
                                            <i className="bi bi-info-circle me-2"></i>
                                            <strong>Institution</strong> scope covers all data — no additional parameters needed.
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="mt-3">
                                <button
                                    type="submit"
                                    className="btn btn-primary-edulearn"
                                    disabled={generating}
                                >
                                    {generating ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2"></span>
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <i className="bi bi-file-earmark-plus me-2"></i>
                                            Generate Report
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ErrorAlert error={error} onDismiss={() => setError(null)} />
            {loading && <Loading message="Loading reports..." />}

            {/* Empty State */}
            {!loading && !error && reports.length === 0 && (
                <div className="text-center py-5 text-muted">
                    <i className="bi bi-file-earmark-bar-graph display-4 d-block mb-3"></i>
                    <p className="mb-0">No reports generated yet.</p>
                </div>
            )}

            {/* Reports Table */}
            {!loading && reports.length > 0 && (
                <div className="card shadow-sm">
                    <div className="card-header bg-light d-flex align-items-center justify-content-between">
                        <strong>
                            <i className="bi bi-table me-2"></i>All Reports
                        </strong>
                        <small className="text-muted">{reports.length} report(s)</small>
                    </div>
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th>ID</th>
                                    <th>Scope</th>
                                    <th>Generated By</th>
                                    <th>Generated At</th>
                                    <th>Parameters</th>
                                    <th>Download</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reports.map(r => (
                                    <tr key={r.reportID}>
                                        <td><code>{r.reportID}</code></td>
                                        <td>
                                            <span className="badge bg-secondary">
                                                {r.scope}
                                            </span>
                                        </td>
                                        <td>{r.generatedByName || `User ID ${r.generatedByFK}`}</td>
                                        <td>
                                            {r.generatedAt
                                                ? new Date(r.generatedAt).toLocaleString()
                                                : '—'}
                                        </td>
                                        <td>
                                            {r.parametersJSON
                                                ? <code className="small">{r.parametersJSON}</code>
                                                : <span className="text-muted">—</span>}
                                        </td>
                                        <td>
                                            <div className="d-flex gap-2">
                                                <button
                                                    className="btn btn-sm btn-outline-danger"
                                                    onClick={() => handleDownloadPdf(r.reportID)}
                                                    disabled={downloading === r.reportID}
                                                    title="Download PDF"
                                                >
                                                    {downloading === r.reportID
                                                        ? <span className="spinner-border spinner-border-sm"></span>
                                                        : <><i className="bi bi-file-pdf me-1"></i>PDF</>
                                                    }
                                                </button>
                                                <button
                                                    className="btn btn-sm btn-outline-success"
                                                    onClick={() => handleDownloadJson(r.reportID)}
                                                    disabled={downloading === r.reportID}
                                                    title="Download JSON"
                                                >
                                                    {downloading === r.reportID
                                                        ? <span className="spinner-border spinner-border-sm"></span>
                                                        : <><i className="bi bi-filetype-json me-1"></i>JSON</>
                                                    }
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}