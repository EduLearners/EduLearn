import { useState } from 'react';
import { scholarshipService } from '../../services/scholarshipService';
import { authService } from '../../services/authService';
import ErrorAlert from '../../components/ErrorAlert';
import ModalPortal from '../../components/ModalPortal';
import StatusBadge from '../../components/StatusBadge';
import { validateAwardType, validateAmount, validateOptionalPositiveId, validateDateRange } from '../../utils/validators';

const SCHOLARSHIP_STATUSES = ['Active', 'Suspended', 'Revoked', 'Expired'];

export default function ScholarshipsPage() {
    const { role } = authService.getCurrentUser();

    const [studentId, setStudentId] = useState('');
    const [scholarships, setScholarships] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState('');
    const [saving, setSaving] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const [errors, setErrors] = useState({});

    const [form, setForm] = useState({
        studentID: '',
        awardType: '',
        amount: '',
        validFrom: '',
        validTo: '',
    });

    const [statusUpdate, setStatusUpdate] = useState({
        id: null,
        status: '',
    });

    const canManage = ['Finance', 'ITAdmin'].includes(role);

    const handleSearch = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const data = await scholarshipService.getByStudent(studentId);
            setScholarships(data || []);
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
        const next = {
            studentID: validateOptionalPositiveId(form.studentID),
            awardType: validateAwardType(form.awardType),
            amount: validateAmount(form.amount, 0.01, 9_999_999),
            validTo: validateDateRange(form.validFrom, form.validTo),
        };
        if (Object.values(next).some(Boolean)) { setErrors(next); return; }
        if (form.validFrom && form.validTo && new Date(form.validFrom) >= new Date(form.validTo)) {
            setError({ message: 'Valid From date must be before Valid To date.' });
            return;
        }
        setSaving(true);
        try {
            await scholarshipService.create({
                studentID: Number(form.studentID),
                awardType: form.awardType,
                amount: Number(form.amount),
                validFrom: form.validFrom,
                validTo: form.validTo,
            });
            setSuccess('Scholarship awarded successfully.');
            setShowForm(false);
            setForm({ studentID: '', awardType: '', amount: '', validFrom: '', validTo: '' });
            if (studentId) {
                const data = await scholarshipService.getByStudent(studentId);
                setScholarships(data || []);
            }
        } catch (err) {
            setError(err);
        } finally {
            setSaving(false);
        }
    };

    const handleStatusUpdate = async (id, newStatus) => {
        setError(null);
        try {
            const updated = await scholarshipService.update(id, { status: newStatus });
            setScholarships(prev =>
                prev.map(s => s.scholarID === updated.scholarID ? updated : s)
            );
            setSuccess(`Scholarship status updated to ${newStatus}.`);
        } catch (err) {
            setError(err);
        }
    };

    return (
        <div>
            {/* Page Header */}
            <div className="d-flex align-items-center justify-content-between mb-4">
                <h2 className="text-primary-edulearn mb-0">
                    <i className="bi bi-award me-2"></i>Scholarships
                </h2>
                {canManage && (
                    <button
                        className="btn btn-primary-edulearn"
                        onClick={() => {
                            setErrors({});
                            setForm({ studentID: studentId || '', awardType: '', amount: '', validFrom: '', validTo: '' });
                            setSuccess('');
                            setShowForm(true);
                        }}
                    >
                        <i className="bi bi-plus-lg me-2"></i>Award Scholarship
                    </button>
                )}
            </div>

            {/* Search */}
            <div className="card shadow-sm mb-4">
                <div className="card-body">
                    <form onSubmit={handleSearch}>
                        <div className="row g-3 align-items-end">
                            <div className="col-md-8">
                                <label className="form-label fw-bold">
                                    Student ID <span className="text-danger">*</span>
                                </label>
                                <input
                                    type="number"
                                    className="form-control"
                                    value={studentId}
                                    onChange={e => setStudentId(e.target.value)}
                                    placeholder="Enter student ID..."
                                    min="1"
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

            {success && (
                <div className="alert alert-success">
                    <i className="bi bi-check-circle me-2"></i>{success}
                </div>
            )}

            {/* Scholarships Table */}
            {scholarships.length === 0 && studentId && !loading && (
                <div className="text-center py-5 text-muted">
                    <i className="bi bi-award display-4 d-block mb-3"></i>
                    <p className="mb-0">No scholarships found for this student.</p>
                </div>
            )}

            {scholarships.length > 0 && (
                <div className="card shadow-sm">
                    <div className="card-header bg-light d-flex align-items-center justify-content-between">
                        <strong>
                            <i className="bi bi-table me-2"></i>
                            Scholarships
                        </strong>
                        <small className="text-muted">{scholarships.length} record(s)</small>
                    </div>
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th>ID</th>
                                    <th>Student</th>
                                    <th>Award Type</th>
                                    <th>Amount</th>
                                    <th>Valid From</th>
                                    <th>Valid To</th>
                                    <th>Status</th>
                                    {canManage && <th>Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {scholarships.map(s => (
                                    <tr key={s.scholarID}>
                                        <td><code>#{s.scholarID}</code></td>
                                        <td>{s.studentName || `#${s.studentID}`}</td>
                                        <td>
                                            <span className="badge bg-secondary">
                                                {s.awardType}
                                            </span>
                                        </td>
                                        <td className="fw-bold">
                                            ₹{Number(s.amount).toFixed(2)}
                                        </td>
                                        <td>{new Date(s.validFrom).toLocaleDateString()}</td>
                                        <td>{new Date(s.validTo).toLocaleDateString()}</td>
                                        <td><StatusBadge status={s.status} /></td>
                                        {canManage && (
                                            <td>
                                                {s.status !== 'Revoked' && (
                                                    <select
                                                        className="form-select form-select-sm"
                                                        value={s.status}
                                                        onChange={e => handleStatusUpdate(s.scholarID, e.target.value)}
                                                        style={{ width: 130 }}
                                                    >
                                                        {SCHOLARSHIP_STATUSES.map(st => (
                                                            <option key={st} value={st}>{st}</option>
                                                        ))}
                                                    </select>
                                                )}
                                                {s.status === 'Revoked' && (
                                                    <span className="text-muted small">Terminal</span>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Award Scholarship Modal */}
            {showForm && (
                <ModalPortal>
                    <div className="modal-backdrop fade show"></div>
                    <div className="modal fade show d-block" tabIndex="-1">
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content">
                                <div className="modal-header bg-primary-edulearn text-white">
                                    <h5 className="modal-title">
                                        <i className="bi bi-award me-2"></i>Award Scholarship
                                    </h5>
                                    <button
                                        type="button"
                                        className="btn-close btn-close-white"
                                        onClick={() => setShowForm(false)}
                                        disabled={saving}
                                    />
                                </div>
                                <form onSubmit={handleCreate}>
                                    <div className="modal-body">
                                        <div className="row g-3">
                                            <div className="col-12">
                                                <label className="form-label fw-bold">
                                                    Student ID <span className="text-danger">*</span>
                                                </label>
                                                <input
                                                    type="number"
                                                    className={`form-control${errors.studentID ? ' is-invalid' : ''}`}
                                                    value={form.studentID}
                                                    onChange={e => setForm({ ...form, studentID: e.target.value })}
                                                    onBlur={e => setErrors(prev => ({ ...prev, studentID: validateOptionalPositiveId(e.target.value) }))}
                                                    min="1"
                                                    required
                                                />
                                                {errors.studentID && <div className="invalid-feedback">{errors.studentID}</div>}
                                            </div>
                                            <div className="col-md-8">
                                                <label className="form-label fw-bold">
                                                    Award Type <span className="text-danger">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    className={`form-control${errors.awardType ? ' is-invalid' : ''}`}
                                                    value={form.awardType}
                                                    onChange={e => setForm({ ...form, awardType: e.target.value })}
                                                    onBlur={e => setErrors(prev => ({ ...prev, awardType: validateAwardType(e.target.value) }))}
                                                    placeholder="e.g. Merit, Need-based"
                                                    maxLength={100}
                                                    required
                                                />
                                                {errors.awardType && <div className="invalid-feedback">{errors.awardType}</div>}
                                            </div>
                                            <div className="col-md-4">
                                                <label className="form-label fw-bold">
                                                    Amount <span className="text-danger">*</span>
                                                </label>
                                                <div className={`input-group${errors.amount ? ' has-validation' : ''}`}>
                                                    <span className="input-group-text">₹</span>
                                                    <input
                                                        type="number"
                                                        className={`form-control${errors.amount ? ' is-invalid' : ''}`}
                                                        value={form.amount}
                                                        onChange={e => setForm({ ...form, amount: e.target.value })}
                                                        onBlur={e => setErrors(prev => ({ ...prev, amount: validateAmount(e.target.value, 0.01, 9_999_999) }))}
                                                        step="0.01"
                                                        min="0.01"
                                                        required
                                                    />
                                                    {errors.amount && <div className="invalid-feedback">{errors.amount}</div>}
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label fw-bold">
                                                    Valid From <span className="text-danger">*</span>
                                                </label>
                                                <input
                                                    type="date"
                                                    className={`form-control${errors.validTo ? ' is-invalid' : ''}`}
                                                    value={form.validFrom}
                                                    onChange={e => setForm({ ...form, validFrom: e.target.value })}
                                                    required
                                                />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label fw-bold">
                                                    Valid To <span className="text-danger">*</span>
                                                </label>
                                                <input
                                                    type="date"
                                                    className={`form-control${errors.validTo ? ' is-invalid' : ''}`}
                                                    value={form.validTo}
                                                    onChange={e => setForm({ ...form, validTo: e.target.value })}
                                                    onBlur={e => setErrors(prev => ({ ...prev, validTo: validateDateRange(form.validFrom, e.target.value) }))}
                                                    required
                                                />
                                                {errors.validTo && <div className="invalid-feedback">{errors.validTo}</div>}
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
                                                    Awarding...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="bi bi-check-lg me-2"></i>
                                                    Award Scholarship
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