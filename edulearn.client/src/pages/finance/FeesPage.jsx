import { useState } from 'react';
import { createPortal } from 'react-dom';
import { feeService } from '../../services/feeService';
import { programService } from '../../services/programService';
import { authService } from '../../services/authService';
import ErrorAlert from '../../components/ErrorAlert';
import Loading from '../../components/Loading';
import StatusBadge from '../../components/StatusBadge';

const FEE_STATUSES = ['Draft', 'Active', 'Superseded'];

export default function FeesPage() {
    const { role } = authService.getCurrentUser();

    const [programId, setProgramId] = useState('');
    const [term, setTerm] = useState('');
    const [fee, setFee] = useState(null);
    const [programs, setPrograms] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState('');
    const [saving, setSaving] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [isEdit, setIsEdit] = useState(false);

    const [form, setForm] = useState({
        programID: '',
        term: '',
        feeItemsJSON: '',
        effectiveFrom: '',
        effectiveTo: '',
    });

    const canManage = ['Finance', 'ITAdmin'].includes(role);

    useState(() => {
        programService.getAll()
            .then(d => setPrograms(d || []))
            .catch(() => {})
            .finally(() => setPageLoading(false));
    }, []);

    const handleSearch = async (e) => {
        e.preventDefault();
        setError(null);
        setFee(null);
        setLoading(true);
        try {
            const data = await feeService.getByProgramAndTerm(programId, term);
            setFee(data);
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    const openCreate = () => {
        setIsEdit(false);
        setForm({
            programID: programId || '',
            term: term || '',
            feeItemsJSON: '',
            effectiveFrom: '',
            effectiveTo: '',
        });
        setSuccess('');
        setShowForm(true);
    };

    const openEdit = () => {
        if (!fee) return;
        setIsEdit(true);
        setForm({
            programID: fee.programID,
            term: fee.term,
            feeItemsJSON: fee.feeItemsJSON || '',
            effectiveFrom: fee.effectiveFrom ? fee.effectiveFrom.split('T')[0] : '',
            effectiveTo: fee.effectiveTo ? fee.effectiveTo.split('T')[0] : '',
            status: fee.status,
        });
        setSuccess('');
        setShowForm(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess('');
        setSaving(true);
        try {
            const payload = {
                programID: Number(form.programID),
                term: form.term,
                feeItemsJSON: form.feeItemsJSON,
                effectiveFrom: form.effectiveFrom,
                effectiveTo: form.effectiveTo,
            };
            if (isEdit) {
                const updated = await feeService.update(fee.feeID, {
                    ...payload,
                    status: form.status,
                });
                setFee(updated);
                setSuccess('Fee schedule updated successfully.');
            } else {
                const created = await feeService.create(payload);
                setFee(created);
                setSuccess('Fee schedule created successfully.');
            }
            setShowForm(false);
        } catch (err) {
            setError(err);
        } finally {
            setSaving(false);
        }
    };

    const parseFeeItems = (json) => {
        if (!json) return [];
        try { return JSON.parse(json); } catch { return []; }
    };

    if (pageLoading) return <Loading message="Loading..." />;

    return (
        <div>
            {/* Page Header */}
            <div className="d-flex align-items-center justify-content-between mb-4">
                <h2 className="text-primary-edulearn mb-0">
                    <i className="bi bi-cash-stack me-2"></i>Fee Schedules
                </h2>
                {canManage && (
                    <button
                        className="btn btn-primary-edulearn"
                        onClick={openCreate}
                    >
                        <i className="bi bi-plus-lg me-2"></i>New Fee Schedule
                    </button>
                )}
            </div>

            {/* Search Card */}
            <div className="card shadow-sm mb-4">
                <div className="card-header bg-light">
                    <strong>
                        <i className="bi bi-search me-2"></i>
                        Find Fee Schedule
                    </strong>
                </div>
                <div className="card-body">
                    <form onSubmit={handleSearch}>
                        <div className="row g-3 align-items-end">
                            <div className="col-md-5">
                                <label className="form-label fw-bold">
                                    Program <span className="text-danger">*</span>
                                </label>
                                <select
                                    className="form-select"
                                    value={programId}
                                    onChange={e => setProgramId(e.target.value)}
                                    required
                                >
                                    <option value="">-- Select Program --</option>
                                    {programs.map(p => (
                                        <option key={p.programID} value={p.programID}>
                                            {p.name} ({p.degreeType})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-md-4">
                                <label className="form-label fw-bold">
                                    Term <span className="text-danger">*</span>
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={term}
                                    onChange={e => setTerm(e.target.value)}
                                    placeholder="e.g. 2026-Spring"
                                    required
                                />
                            </div>
                            <div className="col-md-3">
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

            {success && (
                <div className="alert alert-success">
                    <i className="bi bi-check-circle me-2"></i>{success}
                </div>
            )}

            {/* Fee Schedule Result */}
            {fee && (
                <div className="card shadow-sm">
                    <div className="card-header bg-primary-edulearn text-white d-flex align-items-center justify-content-between">
                        <strong>
                            <i className="bi bi-cash-stack me-2"></i>
                            {fee.programName} — {fee.term}
                        </strong>
                        <div className="d-flex align-items-center gap-2">
                            <StatusBadge status={fee.status} />
                            {canManage && (
                                <button
                                    className="btn btn-light btn-sm"
                                    onClick={openEdit}
                                >
                                    <i className="bi bi-pencil me-1"></i>Edit
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="card-body">
                        <div className="row g-3 mb-3">
                            <div className="col-md-4">
                                <dt className="text-muted small">Effective From</dt>
                                <dd className="fw-bold">
                                    {new Date(fee.effectiveFrom).toLocaleDateString()}
                                </dd>
                            </div>
                            <div className="col-md-4">
                                <dt className="text-muted small">Effective To</dt>
                                <dd className="fw-bold">
                                    {new Date(fee.effectiveTo).toLocaleDateString()}
                                </dd>
                            </div>
                            <div className="col-md-4">
                                <dt className="text-muted small">Status</dt>
                                <dd><StatusBadge status={fee.status} /></dd>
                            </div>
                        </div>

                        {/* Fee Items Table */}
                        <label className="form-label text-muted small text-uppercase">
                            Fee Items
                        </label>
                        {parseFeeItems(fee.feeItemsJSON).length === 0 ? (
                            <p className="text-muted">No fee items defined.</p>
                        ) : (
                            <div className="table-responsive">
                                <table className="table table-bordered table-sm mb-0">
                                    <thead className="table-light">
                                        <tr>
                                            <th>Item</th>
                                            <th className="text-end">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {parseFeeItems(fee.feeItemsJSON).map((item, idx) => (
                                            <tr key={idx}>
                                                <td>{item.item || item.name || `Item ${idx + 1}`}</td>
                                                <td className="text-end">
                                                    ₹{Number(item.amount || 0).toFixed(2)}
                                                </td>
                                            </tr>
                                        ))}
                                        <tr className="table-light fw-bold">
                                            <td>Total</td>
                                            <td className="text-end">
                                                ₹{parseFeeItems(fee.feeItemsJSON)
                                                    .reduce((sum, i) => sum + Number(i.amount || 0), 0)
                                                    .toFixed(2)}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {showForm && createPortal(<>
                    <div className="modal-backdrop fade show"></div>
                    <div className="modal fade show d-block" tabIndex="-1">
                        <div className="modal-dialog modal-dialog-centered modal-lg">
                            <div className="modal-content">
                                <div className="modal-header bg-primary-edulearn text-white">
                                    <h5 className="modal-title">
                                        <i className="bi bi-cash-stack me-2"></i>
                                        {isEdit ? 'Edit Fee Schedule' : 'New Fee Schedule'}
                                    </h5>
                                    <button
                                        type="button"
                                        className="btn-close btn-close-white"
                                        onClick={() => setShowForm(false)}
                                        disabled={saving}
                                    />
                                </div>
                                <form onSubmit={handleSubmit}>
                                    <div className="modal-body">
                                        <div className="row g-3">
                                            <div className="col-md-8">
                                                <label className="form-label fw-bold">
                                                    Program <span className="text-danger">*</span>
                                                </label>
                                                <select
                                                    className="form-select"
                                                    value={form.programID}
                                                    onChange={e => setForm({ ...form, programID: e.target.value })}
                                                    required
                                                    disabled={isEdit}
                                                >
                                                    <option value="">-- Select Program --</option>
                                                    {programs.map(p => (
                                                        <option key={p.programID} value={p.programID}>
                                                            {p.name} ({p.degreeType})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="col-md-4">
                                                <label className="form-label fw-bold">
                                                    Term <span className="text-danger">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={form.term}
                                                    onChange={e => setForm({ ...form, term: e.target.value })}
                                                    placeholder="e.g. 2026-Spring"
                                                    required
                                                    disabled={isEdit}
                                                />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label fw-bold">
                                                    Effective From <span className="text-danger">*</span>
                                                </label>
                                                <input
                                                    type="date"
                                                    className="form-control"
                                                    value={form.effectiveFrom}
                                                    onChange={e => setForm({ ...form, effectiveFrom: e.target.value })}
                                                    required
                                                />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label fw-bold">
                                                    Effective To <span className="text-danger">*</span>
                                                </label>
                                                <input
                                                    type="date"
                                                    className="form-control"
                                                    value={form.effectiveTo}
                                                    onChange={e => setForm({ ...form, effectiveTo: e.target.value })}
                                                    required
                                                />
                                            </div>
                                            {isEdit && (
                                                <div className="col-md-4">
                                                    <label className="form-label fw-bold">Status</label>
                                                    <select
                                                        className="form-select"
                                                        value={form.status}
                                                        onChange={e => setForm({ ...form, status: e.target.value })}
                                                    >
                                                        {FEE_STATUSES.map(s => (
                                                            <option key={s} value={s}>{s}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                            <div className="col-12">
                                                <label className="form-label fw-bold">
                                                    Fee Items JSON <span className="text-danger">*</span>
                                                    <small className="text-muted fw-normal ms-2">
                                                        (array of item + amount)
                                                    </small>
                                                </label>
                                                <textarea
                                                    className="form-control font-monospace"
                                                    value={form.feeItemsJSON}
                                                    onChange={e => setForm({ ...form, feeItemsJSON: e.target.value })}
                                                    rows={5}
                                                    placeholder='[{"item":"Tuition Fee","amount":50000},{"item":"Library Fee","amount":2000}]'
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <ErrorAlert error={error} onDismiss={() => setError(null)} />
                                    </div>
                                    <div className="modal-footer">
                                        <button
                                            type="button"
                                            className="btn btn-outline-secondary"
                                            onClick={() => setShowForm(false)}
                                            disabled={saving}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="btn btn-primary-edulearn"
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
                                                    {isEdit ? 'Save Changes' : 'Create Fee Schedule'}
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
            </>, document.body)}
        </div>
    );
}