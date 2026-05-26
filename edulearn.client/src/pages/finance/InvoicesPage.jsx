import { useState, useEffect } from 'react';
import { invoiceService } from '../../services/invoiceService';
import { paymentService } from '../../services/paymentService';
import { programService } from '../../services/programService';
import { authService } from '../../services/authService';
import { studentService } from '../../services/studentService';
import ErrorAlert from '../../components/ErrorAlert';
import ModalPortal from '../../components/ModalPortal';
import Loading from '../../components/Loading';
import StatusBadge from '../../components/StatusBadge';

const PAYMENT_METHODS = ['BankTransfer', 'Cash', 'Card', 'UPI', 'Cheque'];

export default function InvoicesPage() {
    const { role, userId } = authService.getCurrentUser();

    const [studentId, setStudentId] = useState('');
    const [invoices, setInvoices] = useState([]);
    const [selected, setSelected] = useState(null);
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [paymentsLoading, setPaymentsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState('');
    const [saving, setSaving] = useState(false);
    const [showGenerate, setShowGenerate] = useState(false);
    const [showBulk, setShowBulk] = useState(false);
    const [showPayment, setShowPayment] = useState(false);
    const [programs, setPrograms] = useState([]);
    const [bulkResult, setBulkResult] = useState(null);

    const [bulkForm, setBulkForm] = useState({
        programID: '',
        term: '',
        dueDate: '',
    });

    const [genForm, setGenForm] = useState({
        studentID: '',
        term: '',
        dueDate: '',
    });

    const [payForm, setPayForm] = useState({
        invoiceID: '',
        amount: '',
        method: 'BankTransfer',
        reference: '',
    });

    const canManage = ['Finance', 'ITAdmin'].includes(role);
    const isStudent = role === 'Student';

    // FIX: Today's date string for minimum due date validation
    const todayString = new Date().toISOString().split('T')[0];

    // FIX: Compute balance so payment modal can enforce max = outstanding balance
    const totalPaid = payments
        .filter(p => p.status === 'Completed')
        .reduce((sum, p) => sum + Number(p.amount), 0);
    const balance = selected ? Math.max(0, Number(selected.amountDue) - totalPaid) : 0;

    useEffect(() => {
        if (canManage) {
            programService.getAll()
                .then(d => setPrograms(d || []))
                .catch(() => {});
        }
    }, []);

    // Auto-load own invoices for Student role
    useEffect(() => {
        if (!isStudent) return;
        setLoading(true);
        setError(null);
        studentService.getMe()
            .then(s => {
                setStudentId(String(s.studentID));
                return invoiceService.getByStudent(s.studentID);
            })
            .then(data => setInvoices(data || []))
            .catch(err => setError(err))
            .finally(() => setLoading(false));
    }, [isStudent]);

    const handleGenerateBulk = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess('');
        setBulkResult(null);
        setSaving(true);
        try {
            const result = await invoiceService.generateBulk({
                programID: Number(bulkForm.programID),
                term: bulkForm.term,
                dueDate: bulkForm.dueDate,
            });
            setBulkResult(result);
            setSuccess(`Bulk generation complete: ${result.generated} generated, ${result.skipped} skipped (already existed).`);
            setShowBulk(false);
            setBulkForm({ programID: '', term: '', dueDate: '' });
        } catch (err) {
            setError(err);
        } finally {
            setSaving(false);
        }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        setError(null);
        setSelected(null);
        setPayments([]);
        setLoading(true);
        try {
            const data = await invoiceService.getByStudent(studentId);
            setInvoices(data || []);
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectInvoice = async (invoice) => {
        setSelected(invoice);
        setPaymentsLoading(true);
        try {
            const data = await paymentService.getByInvoice(invoice.invoiceID);
            setPayments(data || []);
        } catch {
            setPayments([]);
        } finally {
            setPaymentsLoading(false);
        }
    };

    const handleGenerate = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess('');
        setSaving(true);
        try {
            await invoiceService.generate({
                studentID: Number(genForm.studentID),
                term: genForm.term,
                dueDate: genForm.dueDate,
            });
            setSuccess('Invoice generated successfully.');
            setShowGenerate(false);
            setGenForm({ studentID: '', term: '', dueDate: '' });
            if (studentId) {
                const data = await invoiceService.getByStudent(studentId);
                setInvoices(data || []);
            }
        } catch (err) {
            setError(err);
        } finally {
            setSaving(false);
        }
    };

    const handlePayment = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess('');
        setSaving(true);
        try {
            await paymentService.create({
                invoiceID: Number(payForm.invoiceID),
                amount: Number(payForm.amount),
                method: payForm.method,
                reference: payForm.reference || null,
            });
            setSuccess('Payment recorded successfully.');
            setShowPayment(false);
            if (selected) {
                const data = await paymentService.getByInvoice(selected.invoiceID);
                setPayments(data || []);
                const inv = await invoiceService.getById(selected.invoiceID);
                setSelected(inv);
                setInvoices(prev => prev.map(i => i.invoiceID === inv.invoiceID ? inv : i));
            }
        } catch (err) {
            setError(err);
        } finally {
            setSaving(false);
        }
    };

    const parseLineItems = (json) => {
        if (!json) return [];
        try { return JSON.parse(json); } catch { return []; }
    };

    return (
        <div>
            <div className="d-flex align-items-center justify-content-between mb-4">
                <h2 className="text-primary-edulearn mb-0">
                    <i className="bi bi-receipt me-2"></i>{isStudent ? 'Your Invoices' : 'Invoices'}
                </h2>
                {canManage && (
                    <div className="d-flex gap-2">
                        <button
                            className="btn btn-outline-primary"
                            onClick={() => { setBulkForm({ programID: '', term: '', dueDate: '' }); setBulkResult(null); setShowBulk(true); }}
                        >
                            <i className="bi bi-people me-2"></i>Generate for All
                        </button>
                        <button
                            className="btn btn-primary-edulearn"
                            onClick={() => setShowGenerate(true)}
                        >
                            <i className="bi bi-plus-lg me-2"></i>Generate Invoice
                        </button>
                    </div>
                )}
            </div>

            {/* Search — hidden for Student role (auto-loaded above) */}
            {!isStudent && (
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
            )}

            {isStudent && loading && <Loading message="Loading your invoices..." />}

            <ErrorAlert error={error} onDismiss={() => setError(null)} />

            {success && (
                <div className="alert alert-success">
                    <i className="bi bi-check-circle me-2"></i>{success}
                </div>
            )}

            {invoices.length > 0 && (
                <div className="row g-4">
                    <div className="col-md-4">
                        <div className="card shadow-sm">
                            <div className="card-header bg-light">
                                <strong>
                                    <i className="bi bi-list me-2"></i>
                                    Invoices ({invoices.length})
                                </strong>
                            </div>
                            <div className="list-group list-group-flush">
                                {invoices.map(inv => (
                                    <button
                                        key={inv.invoiceID}
                                        className={`list-group-item list-group-item-action ${selected?.invoiceID === inv.invoiceID ? 'active' : ''}`}
                                        onClick={() => handleSelectInvoice(inv)}
                                    >
                                        <div className="d-flex align-items-center justify-content-between">
                                            <div>
                                                <div className="fw-bold">Invoice #{inv.invoiceID}</div>
                                                <small className={selected?.invoiceID === inv.invoiceID ? 'text-white-50' : 'text-muted'}>
                                                    {inv.term}
                                                </small>
                                            </div>
                                            <div className="text-end">
                                                <div className="fw-bold">₹{Number(inv.amountDue).toFixed(2)}</div>
                                                <StatusBadge status={inv.status} />
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="col-md-8">
                        {!selected ? (
                            <div className="card shadow-sm h-100 d-flex align-items-center justify-content-center">
                                <div className="text-center text-muted py-5">
                                    <i className="bi bi-receipt display-4 d-block mb-3"></i>
                                    Select an invoice to view details
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="card shadow-sm mb-4">
                                    <div className="card-header bg-primary-edulearn text-white d-flex align-items-center justify-content-between">
                                        <strong>
                                            <i className="bi bi-receipt me-2"></i>
                                            Invoice #{selected.invoiceID}
                                        </strong>
                                        <div className="d-flex align-items-center gap-2">
                                            <StatusBadge status={selected.status} />
                                            {canManage && selected.status !== 'Paid' && selected.status !== 'Cancelled' && (
                                                <button
                                                    className="btn btn-light btn-sm"
                                                    onClick={() => {
                                                        setPayForm({ invoiceID: selected.invoiceID, amount: '', method: 'BankTransfer', reference: '' });
                                                        setShowPayment(true);
                                                    }}
                                                >
                                                    <i className="bi bi-plus-lg me-1"></i>Record Payment
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="card-body">
                                        <div className="row g-3 mb-3">
                                            <div className="col-md-4">
                                                <dt className="text-muted small">Student</dt>
                                                <dd className="fw-bold">{selected.studentName}</dd>
                                            </div>
                                            <div className="col-md-4">
                                                <dt className="text-muted small">Term</dt>
                                                <dd>{selected.term}</dd>
                                            </div>
                                            <div className="col-md-4">
                                                <dt className="text-muted small">Due Date</dt>
                                                <dd>{new Date(selected.dueDate).toLocaleDateString()}</dd>
                                            </div>
                                        </div>
                                        <label className="form-label text-muted small text-uppercase">Line Items</label>
                                        <div className="table-responsive mb-3">
                                            <table className="table table-bordered table-sm mb-0">
                                                <thead className="table-light">
                                                    <tr>
                                                        <th>Item</th>
                                                        <th className="text-end">Amount</th>
                                                        <th className="text-end">Discount</th>
                                                        <th className="text-end">Net</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {parseLineItems(selected.lineItemsJSON).map((item, idx) => (
                                                        <tr key={idx}>
                                                            <td>{item.item}</td>
                                                            <td className="text-end">₹{Number(item.amount || 0).toFixed(2)}</td>
                                                            <td className="text-end text-danger">
                                                                {item.discount ? `-₹${Number(item.discount).toFixed(2)}` : '—'}
                                                            </td>
                                                            <td className="text-end">₹{Number(item.net || item.amount || 0).toFixed(2)}</td>
                                                        </tr>
                                                    ))}
                                                    <tr className="table-light fw-bold">
                                                        <td colSpan={3}>Total Amount Due</td>
                                                        <td className="text-end">₹{Number(selected.amountDue).toFixed(2)}</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>

                                <div className="card shadow-sm">
                                    <div className="card-header bg-light">
                                        <strong>
                                            <i className="bi bi-credit-card me-2"></i>
                                            Payments ({payments.length})
                                        </strong>
                                    </div>
                                    {paymentsLoading ? (
                                        <div className="card-body"><Loading message="Loading payments..." /></div>
                                    ) : payments.length === 0 ? (
                                        <div className="card-body text-center text-muted py-4">No payments recorded yet.</div>
                                    ) : (
                                        <div className="table-responsive">
                                            <table className="table table-sm align-middle mb-0">
                                                <thead className="table-light">
                                                    <tr>
                                                        <th>ID</th><th>Amount</th><th>Method</th>
                                                        <th>Reference</th><th>Status</th><th>Paid At</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {payments.map(p => (
                                                        <tr key={p.paymentID}>
                                                            <td><code>#{p.paymentID}</code></td>
                                                            <td className="fw-bold">₹{Number(p.amount).toFixed(2)}</td>
                                                            <td><span className="badge bg-secondary">{p.method}</span></td>
                                                            <td>{p.reference || '—'}</td>
                                                            <td><StatusBadge status={p.status} /></td>
                                                            <td>{p.paidAt ? new Date(p.paidAt).toLocaleString() : '—'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Generate for All Modal */}
            {showBulk && (
                <ModalPortal>
                    <div className="modal-backdrop fade show"></div>
                    <div className="modal fade show d-block" tabIndex="-1">
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content">
                                <div className="modal-header bg-primary-edulearn text-white">
                                    <h5 className="modal-title">
                                        <i className="bi bi-people me-2"></i>Generate Invoices for All Students
                                    </h5>
                                    <button type="button" className="btn-close btn-close-white"
                                        onClick={() => setShowBulk(false)} disabled={saving} />
                                </div>
                                <form onSubmit={handleGenerateBulk}>
                                    <div className="modal-body">
                                        <div className="alert alert-info py-2 small mb-3">
                                            <i className="bi bi-info-circle me-2"></i>
                                            Generates invoices for <strong>all active students</strong> in the selected program.
                                            Students who already have an invoice for this term will be <strong>skipped</strong>.
                                        </div>
                                        <div className="row g-3">
                                            <div className="col-12">
                                                <label className="form-label fw-bold">
                                                    Program <span className="text-danger">*</span>
                                                </label>
                                                <select
                                                    className="form-select"
                                                    value={bulkForm.programID}
                                                    onChange={e => setBulkForm({ ...bulkForm, programID: e.target.value })}
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
                                            <div className="col-md-6">
                                                <label className="form-label fw-bold">
                                                    Term <span className="text-danger">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={bulkForm.term}
                                                    onChange={e => setBulkForm({ ...bulkForm, term: e.target.value })}
                                                    placeholder="e.g. 2026-Spring"
                                                    required
                                                />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label fw-bold">
                                                    Due Date <span className="text-danger">*</span>
                                                </label>
                                                {/* FIX: min prevents past dates being submitted */}
                                                <input
                                                    type="date"
                                                    className="form-control"
                                                    value={bulkForm.dueDate}
                                                    onChange={e => setBulkForm({ ...bulkForm, dueDate: e.target.value })}
                                                    min={todayString}
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <ErrorAlert error={error} onDismiss={() => setError(null)} />
                                    </div>
                                    <div className="modal-footer">
                                        <button type="button" className="btn btn-outline-secondary"
                                            onClick={() => setShowBulk(false)} disabled={saving}>Cancel</button>
                                        <button type="submit" className="btn btn-primary-edulearn" disabled={saving}>
                                            {saving
                                                ? <><span className="spinner-border spinner-border-sm me-2"></span>Generating...</>
                                                : <><i className="bi bi-people me-2"></i>Generate for All</>}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}

            {/* Generate Invoice Modal */}
            {showGenerate && (
                <ModalPortal>
                    <div className="modal-backdrop fade show"></div>
                    <div className="modal fade show d-block" tabIndex="-1">
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content">
                                <div className="modal-header bg-primary-edulearn text-white">
                                    <h5 className="modal-title">
                                        <i className="bi bi-receipt me-2"></i>Generate Invoice
                                    </h5>
                                    <button type="button" className="btn-close btn-close-white"
                                        onClick={() => setShowGenerate(false)} disabled={saving} />
                                </div>
                                <form onSubmit={handleGenerate}>
                                    <div className="modal-body">
                                        <div className="row g-3">
                                            <div className="col-12">
                                                <label className="form-label fw-bold">
                                                    Student ID <span className="text-danger">*</span>
                                                </label>
                                                <input
                                                    type="number"
                                                    className="form-control"
                                                    value={genForm.studentID}
                                                    onChange={e => setGenForm({ ...genForm, studentID: e.target.value })}
                                                    min={1}
                                                    required
                                                />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label fw-bold">
                                                    Term <span className="text-danger">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={genForm.term}
                                                    onChange={e => setGenForm({ ...genForm, term: e.target.value })}
                                                    placeholder="e.g. 2026-Spring"
                                                    required
                                                />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label fw-bold">
                                                    Due Date <span className="text-danger">*</span>
                                                </label>
                                                {/* FIX: min prevents past dates */}
                                                <input
                                                    type="date"
                                                    className="form-control"
                                                    value={genForm.dueDate}
                                                    onChange={e => setGenForm({ ...genForm, dueDate: e.target.value })}
                                                    min={todayString}
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <ErrorAlert error={error} onDismiss={() => setError(null)} />
                                    </div>
                                    <div className="modal-footer">
                                        <button type="button" className="btn btn-outline-secondary"
                                            onClick={() => setShowGenerate(false)} disabled={saving}>Cancel</button>
                                        <button type="submit" className="btn btn-primary-edulearn" disabled={saving}>
                                            {saving
                                                ? <><span className="spinner-border spinner-border-sm me-2"></span>Generating...</>
                                                : <><i className="bi bi-check-lg me-2"></i>Generate</>}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}

            {/* Record Payment Modal */}
            {showPayment && (
                <ModalPortal>
                    <div className="modal-backdrop fade show"></div>
                    <div className="modal fade show d-block" tabIndex="-1">
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content">
                                <div className="modal-header bg-primary-edulearn text-white">
                                    <h5 className="modal-title">
                                        <i className="bi bi-credit-card me-2"></i>Record Payment
                                    </h5>
                                    <button type="button" className="btn-close btn-close-white"
                                        onClick={() => setShowPayment(false)} disabled={saving} />
                                </div>
                                <form onSubmit={handlePayment}>
                                    <div className="modal-body">
                                        <div className="row g-3">
                                            <div className="col-md-6">
                                                <label className="form-label fw-bold">
                                                    Amount <span className="text-danger">*</span>
                                                </label>
                                                <div className="input-group">
                                                    <span className="input-group-text">₹</span>
                                                    {/* FIX: max enforces outstanding balance cap, consistent with PaymentsPage */}
                                                    <input
                                                        type="number"
                                                        className="form-control"
                                                        value={payForm.amount}
                                                        onChange={e => setPayForm({ ...payForm, amount: e.target.value })}
                                                        step="0.01"
                                                        min="0.01"
                                                        max={balance > 0 ? balance.toFixed(2) : undefined}
                                                        required
                                                    />
                                                </div>
                                                {balance > 0 && (
                                                    <div className="form-text">
                                                        Outstanding balance: <strong>₹{balance.toFixed(2)}</strong>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label fw-bold">
                                                    Method <span className="text-danger">*</span>
                                                </label>
                                                <select
                                                    className="form-select"
                                                    value={payForm.method}
                                                    onChange={e => setPayForm({ ...payForm, method: e.target.value })}
                                                    required
                                                >
                                                    {PAYMENT_METHODS.map(m => (
                                                        <option key={m} value={m}>{m}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="col-12">
                                                <label className="form-label fw-bold">
                                                    Reference
                                                    <small className="text-muted fw-normal ms-2">(optional)</small>
                                                </label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={payForm.reference}
                                                    onChange={e => setPayForm({ ...payForm, reference: e.target.value })}
                                                    placeholder="Transaction ref / cheque number..."
                                                />
                                            </div>
                                        </div>
                                        <ErrorAlert error={error} onDismiss={() => setError(null)} />
                                    </div>
                                    <div className="modal-footer">
                                        <button type="button" className="btn btn-outline-secondary"
                                            onClick={() => setShowPayment(false)} disabled={saving}>Cancel</button>
                                        <button type="submit" className="btn btn-primary-edulearn" disabled={saving}>
                                            {saving
                                                ? <><span className="spinner-border spinner-border-sm me-2"></span>Recording...</>
                                                : <><i className="bi bi-check-lg me-2"></i>Record Payment</>}
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
