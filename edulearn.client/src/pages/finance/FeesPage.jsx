import { useState, useEffect } from 'react';
import { feeService } from '../../services/feeService';
import { programService } from '../../services/programService';
import { authService } from '../../services/authService';
import ErrorAlert from '../../components/ErrorAlert';
import ModalPortal from '../../components/ModalPortal';
import Loading from '../../components/Loading';
import StatusBadge from '../../components/StatusBadge';

const FEE_STATUSES = ['Draft', 'Active', 'Superseded'];

// Convert fee items array → JSON string for API
const itemsToJson = (items) =>
    JSON.stringify(
        items
            .filter(i => i.item.trim())
            .map(i => ({ item: i.item.trim(), amount: Number(i.amount) || 0 }))
    );

// Parse JSON string → fee items array
const parseFeeItems = (json) => {
    if (!json) return [];
    try {
        const parsed = JSON.parse(json);
        return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
};

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
        feeItems: [{ item: '', amount: '' }],
        effectiveFrom: '',
        effectiveTo: '',
        status: 'Draft',
    });

    // Helpers for the fee items row UI
    const addFeeItem = () => setForm(f => ({ ...f, feeItems: [...f.feeItems, { item: '', amount: '' }] }));
    const removeFeeItem = (idx) => setForm(f => ({ ...f, feeItems: f.feeItems.filter((_, i) => i !== idx) }));
    const updateFeeItem = (idx, field, value) => setForm(f => ({
        ...f,
        feeItems: f.feeItems.map((row, i) => i === idx ? { ...row, [field]: value } : row),
    }));

    const canManage = ['Finance', 'ITAdmin'].includes(role);

    // FIX: Was useState() misused as useEffect — replaced with correct useEffect
    useEffect(() => {
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
            feeItems: [{ item: '', amount: '' }],
            effectiveFrom: '',
            effectiveTo: '',
            status: 'Draft',
        });
        setSuccess('');
        setShowForm(true);
    };

    const openEdit = () => {
        if (!fee) return;
        setIsEdit(true);
        const existing = parseFeeItems(fee.feeItemsJSON);
        setForm({
            programID: fee.programID,
            term: fee.term,
            feeItems: existing.length > 0
                ? existing.map(i => ({ item: i.item || i.name || '', amount: String(i.amount || '') }))
                : [{ item: '', amount: '' }],
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

        // FIX: Cross-validate effectiveFrom < effectiveTo
        if (form.effectiveFrom && form.effectiveTo && form.effectiveFrom >= form.effectiveTo) {
            setError({ message: '"Effective From" date must be before "Effective To" date.' });
            return;
        }

        // FIX: Ensure at least one fee item has an amount > 0
        const totalAmount = form.feeItems.reduce((s, i) => s + (Number(i.amount) || 0), 0);
        if (totalAmount <= 0) {
            setError({ message: 'At least one fee item must have an amount greater than ₹0.' });
            return;
        }

        setSaving(true);
        try {
            const feeItemsJSON = itemsToJson(form.feeItems);
            const payload = {
                programID: Number(form.programID),
                term: form.term,
                feeItemsJSON,
                effectiveFrom: form.effectiveFrom,
                effectiveTo: form.effectiveTo,
                status: form.status,
            };
            if (isEdit) {
                const updated = await feeService.update(fee.feeID, payload);
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

    // FIX: Inline date cross-validation flag for UI feedback
    const dateRangeInvalid =
        form.effectiveFrom && form.effectiveTo && form.effectiveFrom >= form.effectiveTo;

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
                                    pattern="\d{4}-(Spring|Summer|Fall|Winter)"
                                    title="Format: YYYY-Season (e.g. 2026-Spring)"
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

            {/* Create / Edit Modal */}
            {showForm && (
                <ModalPortal>
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
                                                    pattern="\d{4}-(Spring|Summer|Fall|Winter)"
                                                    title="Format: YYYY-Season (e.g. 2026-Spring)"
                                                    required
                                                    disabled={isEdit}
                                                />
                                            </div>

                                            {/* FIX: Date cross-validation with inline feedback */}
                                            <div className="col-md-6">
                                                <label className="form-label fw-bold">
                                                    Effective From <span className="text-danger">*</span>
                                                </label>
                                                <input
                                                    type="date"
                                                    className={`form-control ${dateRangeInvalid ? 'is-invalid' : ''}`}
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
                                                    className={`form-control ${dateRangeInvalid ? 'is-invalid' : ''}`}
                                                    value={form.effectiveTo}
                                                    onChange={e => setForm({ ...form, effectiveTo: e.target.value })}
                                                    required
                                                />
                                                {dateRangeInvalid && (
                                                    <div className="invalid-feedback">
                                                        <i className="bi bi-exclamation-circle me-1"></i>
                                                        "Effective To" must be after "Effective From".
                                                    </div>
                                                )}
                                            </div>

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
                                            <div className="col-12">
                                                <div className="d-flex align-items-center justify-content-between mb-2">
                                                    <label className="form-label fw-bold mb-0">
                                                        Fee Items <span className="text-danger">*</span>
                                                    </label>
                                                    <button type="button" className="btn btn-sm btn-outline-primary" onClick={addFeeItem}>
                                                        <i className="bi bi-plus-lg me-1"></i>Add Item
                                                    </button>
                                                </div>
                                                {form.feeItems.map((row, idx) => (
                                                    <div key={idx} className="d-flex gap-2 mb-2 align-items-center">
                                                        <input
                                                            type="text"
                                                            className="form-control"
                                                            placeholder="Item name (e.g. Tuition Fee)"
                                                            value={row.item}
                                                            onChange={e => updateFeeItem(idx, 'item', e.target.value)}
                                                            required
                                                        />
                                                        <div className="input-group" style={{ maxWidth: 160 }}>
                                                            <span className="input-group-text">₹</span>
                                                            {/* FIX: min changed from "0" to "0.01" to prevent zero-amount items */}
                                                            <input
                                                                type="number"
                                                                className="form-control"
                                                                placeholder="Amount"
                                                                value={row.amount}
                                                                min="0.01"
                                                                step="0.01"
                                                                onChange={e => updateFeeItem(idx, 'amount', e.target.value)}
                                                                required
                                                            />
                                                        </div>
                                                        <button
                                                            type="button"
                                                            className="btn btn-outline-danger btn-sm"
                                                            onClick={() => removeFeeItem(idx)}
                                                            disabled={form.feeItems.length === 1}
                                                            title="Remove item"
                                                        >
                                                            <i className="bi bi-trash"></i>
                                                        </button>
                                                    </div>
                                                ))}
                                                {/* Running total */}
                                                <div className="text-end text-muted small mt-1">
                                                    Total: <strong>₹{form.feeItems.reduce((s, i) => s + (Number(i.amount) || 0), 0).toLocaleString()}</strong>
                                                </div>
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
                                            disabled={saving || dateRangeInvalid}
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
                </ModalPortal>
            )}
        </div>
    );
}
