import { useState } from 'react';
import { auditPackageService } from '../../services/auditPackageService';
import { authService } from '../../services/authService';
import ErrorAlert from '../../components/ErrorAlert';
import Toast from '../../components/Toast';

const parseContents = (json) => {
    try { return JSON.parse(json) || []; } catch { return []; }
};

const triggerDownload = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
};

export default function AuditPackagesPage() {
    const { role } = authService.getCurrentUser();
    const canGenerate = ['Auditor', 'ITAdmin'].includes(role);

    const [form, setForm] = useState({ periodStart: '', periodEnd: '' });
    const [errors, setErrors] = useState({});
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState('');
    const [packages, setPackages] = useState([]);
    const [downloading, setDownloading] = useState(null);
    const [expandedPkg, setExpandedPkg] = useState(null);

    const validate = () => {
        const next = {};
        if (!form.periodStart) next.periodStart = 'Start date is required';
        if (!form.periodEnd)   next.periodEnd   = 'End date is required';
        if (form.periodStart && form.periodEnd && form.periodEnd < form.periodStart)
            next.periodEnd = 'End date must be after start date';
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleGenerate = async (e) => {
        e.preventDefault();
        if (!validate()) return;
        setError(null);
        setGenerating(true);
        try {
            const pkg = await auditPackageService.generate(form.periodStart, form.periodEnd);
            setPackages(prev => [pkg, ...prev]);
            const count = parseContents(pkg.contentsJSON).length;
            setSuccess(`Audit package #${pkg.packageID} generated — ${count} report${count !== 1 ? 's' : ''} bundled.`);
            setForm({ periodStart: '', periodEnd: '' });
        } catch (err) {
            setError(err);
        } finally {
            setGenerating(false);
        }
    };

    const handleDownloadPdf = async (pkg) => {
        try {
            setDownloading(`pdf-${pkg.packageID}`);
            const blob = await auditPackageService.downloadPdf(pkg.packageID);
            triggerDownload(blob, `audit-package-${pkg.packageID}-${pkg.periodStart?.slice(0, 10)}-${pkg.periodEnd?.slice(0, 10)}.pdf`);
        } catch (err) {
            setError(err);
        } finally {
            setDownloading(null);
        }
    };

    const handleDownloadJson = async (pkg) => {
        try {
            setDownloading(`json-${pkg.packageID}`);
            const data = await auditPackageService.downloadJson(pkg.packageID);
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            triggerDownload(blob, `audit-package-${pkg.packageID}-${pkg.periodStart?.slice(0, 10)}-${pkg.periodEnd?.slice(0, 10)}.json`);
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
                    <i className="bi bi-archive me-2"></i>Audit Packages
                </h2>
                <small className="text-muted">
                    <i className="bi bi-info-circle me-1"></i>
                    Bundles reports within a date range into a downloadable compliance package
                </small>
            </div>

            {/* Generate Card — Auditor + ITAdmin */}
            {canGenerate && (
                <div className="card shadow-sm mb-4">
                    <div className="card-header bg-primary-edulearn text-white">
                        <strong>
                            <i className="bi bi-plus-circle me-2"></i>Generate New Audit Package
                        </strong>
                    </div>
                    <div className="card-body">
                        <p className="text-muted small mb-3">
                            Select the period to bundle. All reports generated within those dates will be included.
                        </p>
                        <form onSubmit={handleGenerate}>
                            <div className="row g-3">
                                <div className="col-md-4">
                                    <label className="form-label fw-bold">
                                        Period Start <span className="text-danger">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        className={`form-control${errors.periodStart ? ' is-invalid' : ''}`}
                                        value={form.periodStart}
                                        onChange={e => {
                                            setForm(p => ({ ...p, periodStart: e.target.value }));
                                            setErrors(p => ({ ...p, periodStart: null }));
                                        }}
                                    />
                                    {errors.periodStart && (
                                        <div className="invalid-feedback">{errors.periodStart}</div>
                                    )}
                                </div>

                                <div className="col-md-4">
                                    <label className="form-label fw-bold">
                                        Period End <span className="text-danger">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        className={`form-control${errors.periodEnd ? ' is-invalid' : ''}`}
                                        value={form.periodEnd}
                                        onChange={e => {
                                            setForm(p => ({ ...p, periodEnd: e.target.value }));
                                            setErrors(p => ({ ...p, periodEnd: null }));
                                        }}
                                    />
                                    {errors.periodEnd && (
                                        <div className="invalid-feedback">{errors.periodEnd}</div>
                                    )}
                                </div>

                                <div className="col-md-4 d-flex align-items-end">
                                    <button
                                        type="submit"
                                        className="btn btn-primary-edulearn w-100"
                                        disabled={generating}
                                    >
                                        {generating ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2"></span>
                                                Generating...
                                            </>
                                        ) : (
                                            <>
                                                <i className="bi bi-archive me-2"></i>
                                                Generate Package
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ErrorAlert error={error} onDismiss={() => setError(null)} />

            {/* Empty State */}
            {packages.length === 0 && (
                <div className="text-center py-5 text-muted">
                    <i className="bi bi-archive display-4 d-block mb-3"></i>
                    <p className="mb-1 fw-semibold">No packages generated this session.</p>
                    <p className="small mb-0">
                        {canGenerate
                            ? 'Use the form above to generate your first audit package.'
                            : 'Audit packages will appear here once generated.'}
                    </p>
                </div>
            )}

            {/* Packages Table */}
            {packages.length > 0 && (
                <div className="card shadow-sm">
                    <div className="card-header bg-light d-flex align-items-center justify-content-between">
                        <strong>
                            <i className="bi bi-archive me-2"></i>Generated Packages
                        </strong>
                        <small className="text-muted">{packages.length} package{packages.length !== 1 ? 's' : ''} this session</small>
                    </div>
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th>Package ID</th>
                                    <th>Period</th>
                                    <th>Reports Bundled</th>
                                    <th>Generated At</th>
                                    <th>Contents</th>
                                    <th>Download</th>
                                </tr>
                            </thead>
                            <tbody>
                                {packages.map(pkg => {
                                    const contents = parseContents(pkg.contentsJSON);
                                    const pdfBusy  = downloading === `pdf-${pkg.packageID}`;
                                    const jsonBusy = downloading === `json-${pkg.packageID}`;
                                    const anyBusy  = pdfBusy || jsonBusy;
                                    const isExpanded = expandedPkg === pkg.packageID;

                                    return (
                                        <>
                                            <tr key={pkg.packageID}>
                                                <td><code>{pkg.packageID}</code></td>
                                                <td>
                                                    <span className="text-nowrap">
                                                        {new Date(pkg.periodStart).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </span>
                                                    <span className="text-muted mx-1">—</span>
                                                    <span className="text-nowrap">
                                                        {new Date(pkg.periodEnd).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={`badge ${contents.length > 0 ? 'bg-success' : 'bg-secondary'}`}>
                                                        {contents.length} report{contents.length !== 1 ? 's' : ''}
                                                    </span>
                                                </td>
                                                <td>
                                                    <small className="text-muted">
                                                        {new Date(pkg.generatedAt).toLocaleString('en-IN', {
                                                            day: 'numeric', month: 'short', year: 'numeric',
                                                            hour: '2-digit', minute: '2-digit', hour12: true
                                                        })}
                                                    </small>
                                                </td>
                                                <td>
                                                    {contents.length > 0 ? (
                                                        <button
                                                            className="btn btn-sm btn-outline-secondary"
                                                            onClick={() => setExpandedPkg(isExpanded ? null : pkg.packageID)}
                                                            title={isExpanded ? 'Hide contents' : 'Show bundled reports'}
                                                        >
                                                            <i className={`bi bi-chevron-${isExpanded ? 'up' : 'down'} me-1`}></i>
                                                            {isExpanded ? 'Hide' : 'View'}
                                                        </button>
                                                    ) : (
                                                        <span className="text-muted small">No reports in range</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <div className="d-flex gap-2">
                                                        <button
                                                            className="btn btn-sm btn-outline-danger"
                                                            onClick={() => handleDownloadPdf(pkg)}
                                                            disabled={anyBusy}
                                                            title="Download as PDF"
                                                        >
                                                            {pdfBusy
                                                                ? <span className="spinner-border spinner-border-sm"></span>
                                                                : <><i className="bi bi-file-pdf me-1"></i>PDF</>}
                                                        </button>
                                                        <button
                                                            className="btn btn-sm btn-outline-success"
                                                            onClick={() => handleDownloadJson(pkg)}
                                                            disabled={anyBusy}
                                                            title="Download as JSON"
                                                        >
                                                            {jsonBusy
                                                                ? <span className="spinner-border spinner-border-sm"></span>
                                                                : <><i className="bi bi-filetype-json me-1"></i>JSON</>}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>

                                            {/* Expandable contents row */}
                                            {isExpanded && (
                                                <tr key={`${pkg.packageID}-contents`} className="table-light">
                                                    <td colSpan={6} className="ps-4 py-3">
                                                        <div className="small fw-bold text-muted mb-2">
                                                            <i className="bi bi-list-ul me-1"></i>
                                                            Bundled Reports ({contents.length})
                                                        </div>
                                                        <div className="d-flex flex-wrap gap-2">
                                                            {contents.map((c, idx) => (
                                                                <span
                                                                    key={idx}
                                                                    className="badge bg-white border text-dark fw-normal"
                                                                    style={{ fontSize: '0.78rem' }}
                                                                    title={c.description}
                                                                >
                                                                    <i className="bi bi-file-earmark-bar-graph me-1 text-primary"></i>
                                                                    Report #{c.reportID}
                                                                    <span className="ms-1 text-muted">({c.reportType})</span>
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="card-footer text-muted small">
                        <i className="bi bi-info-circle me-1"></i>
                        Packages are shown for this session only. Refresh the page to start fresh.
                    </div>
                </div>
            )}
        </div>
    );
}
