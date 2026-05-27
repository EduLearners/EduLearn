import { useState } from 'react';
import { invoiceService } from '../../services/invoiceService';
import { paymentService } from '../../services/paymentService';
import { authService } from '../../services/authService';
import ErrorAlert from '../../components/ErrorAlert';
import ModalPortal from '../../components/ModalPortal';
import Loading from '../../components/Loading';
import StatusBadge from '../../components/StatusBadge';

const PAYMENT_METHODS = ['BankTransfer', 'Cash', 'Card', 'UPI', 'Cheque'];

export default function PaymentsPage() {
    const { role } = authService.getCurrentUser();
    const canManage = ['Finance', 'ITAdmin'].includes(role);

    // Search
    const [searchType, setSearchType] = useState('invoice'); // 'invoice' | 'student'
    const [searchId, setSearchId] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState('');
    const [saving, setSaving] = useState(false);

    // Invoice + payment state
    const [invoices, setInvoices] = useState([]);
    const [selected, setSelected] = useState(null);
    const [payments, setPayments] = useState([]);
    const [paymentsLoading, setPaymentsLoading] = useState(false);

    // Payment form
    const [showPayment, setShowPayment] = useState(false);
    const [payForm, setPayForm] = useState({
        invoiceID: '',
        amount: '',
        method: 'BankTransfer',
        reference: '',
    });

    const handleSearch = async (e) => {
        e.preventDefault();
        setError(null);
        setSelected(null);
        setPayments([]);
        setInvoices([]);
        setLoading(true);
        try {
            if (searchType === 'invoice') {
                const inv = await invoiceService.getById(Number(searchId));
                setInvoices([inv]);
                await handleSelectInvoice(inv);
            } else {
                const data = await invoiceService.getByStudent(Number(searchId));
                setInvoices(data || []);
                // Auto-select first invoice if only one result
                if (data && data.length === 1) {
                    await handleSelectInvoice(data[0]);
                }
            }
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

    const openPaymentModal = (invoice) => {
        setPayForm({
            invoiceID: invoice.invoiceID,
            amount: '',
            method: 'BankTransfer',
            reference: '',
        });
        setError(null);
        setShowPayment(true);
    };

    const handlePayment = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess('');

        // Validate amount does not exceed remaining balance
        if (balance > 0 && Number(payForm.amount) > balance + 0.01) {
            setError({ message: `Payment amount (₹${Number(payForm.amount).toFixed(2)}) exceeds remaining balance (₹${balance.toFixed(2)}).` });
            return;
        }

        setSaving(true);
        try {
            await paymentService.create({
                invoiceID: Number(payForm.invoiceID),
                amount: Number(payForm.amount),
                method: payForm.method,
                reference: payForm.reference || null,
            });
            setSuccess(`Payment of ₹${Number(payForm.amount).toFixed(2)} recorded successfully for Invoice #${payForm.invoiceID}.`);
            setShowPayment(false);
            // Refresh
            if (selected) {
                const updatedPayments = await paymentService.getByInvoice(selected.invoiceID);
                setPayments(updatedPayments || []);
                const updatedInvoice = await invoiceService.getById(selected.invoiceID);
                setSelected(updatedInvoice);
                setInvoices(prev => prev.map(i => i.invoiceID === updatedInvoice.invoiceID ? updatedInvoice : i));
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

    const totalPaid = payments
        .filter(p => p.status === 'Completed')
        .reduce((sum, p) => sum + Number(p.amount), 0);

    const balance = selected
        ? Math.max(0, Number(selected.amountDue) - totalPaid)
        : 0;

    return (
        <div>
            {/* Page Header */}
            <div className="d-flex align-items-center justify-content-between mb-4">
                <h2 className="text-primary-edulearn mb-0">
                    <i className="bi bi-credit-card me-2"></i>Payments
                </h2>
            </div>

            {/* Success Alert */}
            {success && (
                <div className="alert alert-success d-flex align-items-center justify-content-between mb-4">
                    <span><i className="bi bi-check-circle me-2"></i>{success}</span>
                    <button className="btn-close" onClick={() => setSuccess('')}></button>
                </div>
            )}

            {/* Search Card */}
            <div className="card shadow-sm mb-4">
                <div className="card-header bg-light">
                    <strong><i className="bi bi-search me-2"></i>Find Invoice</strong>
                </div>
                <div className="card-body">
                    <form onSubmit={handleSearch}>
                        <div className="row g-3 align-items-end">
                            {/* Search Type Toggle */}
                            <div className="col-md-3">
                                <label className="form-label fw-bold">Search By</label>
                                <select
                                    className="form-select"
                                    value={searchType}
                                    onChange={e => { setSearchType(e.target.value); setSearchId(''); }}
                                >
                                    <option value="invoice">Invoice ID</option>
                                     <option value="student">Student ID</option>
                                </select>
                            </div>
                            <div className="col-md-6">
                                <label className="form-label fw-bold">
                                    {searchType === 'invoice' ? 'Invoice ID' : 'Student ID'}
                                    <span className="text-danger"> *</span>
                                </label>
                                <input
                                    type="number"
                                    className="form-control"
                                    value={searchId}
                                    onChange={e => setSearchId(e.target.value)}
                                    placeholder={searchType === 'invoice' ? 'Enter Invoice ID...' : 'Enter Student ID...'}
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

            {/* Results */}
            {invoices.length > 0 && (
                <div className="row g-4">
                    {/* Invoice List — show when multiple invoices */}
                    {invoices.length > 1 && (
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
                    )}

                    {/* Invoice Detail + Payments */}
                    <div className={invoices.length > 1 ? 'col-md-8' : 'col-12'}>
                        {!selected ? (
                            <div className="card shadow-sm d-flex align-items-center justify-content-center" style={{ minHeight: 200 }}>
                                <div className="text-center text-muted py-5">
                                    <i className="bi bi-receipt display-4 d-block mb-3"></i>
                                    Select an invoice to view details
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Invoice Summary Card */}
                                <div className="card shadow-sm mb-4">
                                    <div className="card-header bg-primary-edulearn text-white d-flex align-items-center justify-content-between">
                                        <strong>
                                            <i className="bi bi-receipt me-2"></i>
                                            Invoice #{selected.invoiceID} — {selected.studentName}
                                        </strong>
                                        <div className="d-flex align-items-center gap-2">
                                            <StatusBadge status={selected.status} />
                                            {canManage && selected.status !== 'Paid' && selected.status !== 'Cancelled' && (
                                                <button
                                                    className="btn btn-light btn-sm fw-bold"
                                                    onClick={() => openPaymentModal(selected)}
                                                >
                                                    <i className="bi bi-plus-lg me-1"></i>Record Payment
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="card-body">
                                        {/* Summary Row */}
                                        <div className="row g-3 mb-4">
                                            <div className="col-md-3">
                                                <dt className="text-muted small text-uppercase">Student</dt>
                                                <dd className="fw-bold mb-0">{selected.studentName}</dd>
                                            </div>
                                            <div className="col-md-3">
                                                <dt className="text-muted small text-uppercase">Term</dt>
                                                <dd className="mb-0">{selected.term}</dd>
                                            </div>
                                            <div className="col-md-3">
                                                <dt className="text-muted small text-uppercase">Due Date</dt>
                                                <dd className="mb-0">{new Date(selected.dueDate).toLocaleDateString()}</dd>
                                            </div>
                                            <div className="col-md-3">
                                                <dt className="text-muted small text-uppercase">Amount Due</dt>
                                                <dd className="fw-bold fs-5 mb-0" style={{ color: '#A32D2D' }}>
                                                    ₹{Number(selected.amountDue).toFixed(2)}
                                                </dd>
                                            </div>
                                        </div>

                                        {/* Balance Summary */}
                                        <div className="row g-3 mb-3">
                                            <div className="col-md-4">
                                                <div className="p-3 rounded bg-light border text-center">
                                                    <div className="text-muted small text-uppercase mb-1">Total Due</div>
                                                    <div className="fw-bold fs-5">₹{Number(selected.amountDue).toFixed(2)}</div>
                                                </div>
                                            </div>
                                            <div className="col-md-4">
                                                <div className="p-3 rounded border text-center" style={{ background: '#EAF3DE' }}>
                                                    <div className="text-muted small text-uppercase mb-1">Total Paid</div>
                                                    <div className="fw-bold fs-5" style={{ color: '#3B6D11' }}>₹{totalPaid.toFixed(2)}</div>
                                                </div>
                                            </div>
                                            <div className="col-md-4">
                                                <div className="p-3 rounded border text-center" style={{ background: balance > 0 ? '#FEE2E2' : '#EAF3DE' }}>
                                                    <div className="text-muted small text-uppercase mb-1">Balance</div>
                                                    <div className="fw-bold fs-5" style={{ color: balance > 0 ? '#A32D2D' : '#3B6D11' }}>
                                                        ₹{balance.toFixed(2)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Line Items */}
                                        <label className="form-label text-muted small text-uppercase">Fee Breakdown</label>
                                        <div className="table-responsive">
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
                                                            <td className="text-end">₹{Number(item.net ?? item.amount ?? 0).toFixed(2)}</td>
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

                                {/* Payment History */}
                                <div className="card shadow-sm">
                                    <div className="card-header bg-light d-flex align-items-center justify-content-between">
                                        <strong>
                                            <i className="bi bi-clock-history me-2"></i>
                                            Payment History ({payments.length})
                                        </strong>
                                        {canManage && selected.status !== 'Paid' && selected.status !== 'Cancelled' && (
                                            <button
                                                className="btn btn-sm btn-primary-edulearn"
                                                onClick={() => openPaymentModal(selected)}
                                            >
                                                <i className="bi bi-plus-lg me-1"></i>Record Payment
                                            </button>
                                        )}
                                    </div>
                                    {paymentsLoading ? (
                                        <div className="card-body">
                                            <Loading message="Loading payments..." />
                                        </div>
                                    ) : payments.length === 0 ? (
                                        <div className="card-body text-center text-muted py-4">
                                            <i className="bi bi-credit-card display-6 d-block mb-2 opacity-25"></i>
                                            No payments recorded yet.
                                        </div>
                                    ) : (
                                        <div className="table-responsive">
                                            <table className="table table-hover align-middle mb-0">
                                                <thead className="table-light">
                                                    <tr>
                                                        <th>ID</th>
                                                        <th>Amount</th>
                                                        <th>Method</th>
                                                        <th>Reference</th>
                                                        <th>Status</th>
                                                        <th>Paid At</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {payments.map(p => (
                                                        <tr key={p.paymentID}>
                                                            <td><code>#{p.paymentID}</code></td>
                                                            <td className="fw-bold text-success">₹{Number(p.amount).toFixed(2)}</td>
                                                            <td>
                                                                <span className="badge bg-secondary">{p.method}</span>
                                                            </td>
                                                            <td>{p.reference || '—'}</td>
                                                            <td><StatusBadge status={p.status} /></td>
                                                            <td>
                                                                <small className="text-muted">
                                                                    {p.paidAt ? new Date(p.paidAt).toLocaleString() : '—'}
                                                                </small>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                    {payments.length > 0 && (
                                        <div className="card-footer text-muted small d-flex justify-content-between">
                                            <span>{payments.length} payment(s) recorded</span>
                                            <span>Total Paid: <strong>₹{totalPaid.toFixed(2)}</strong></span>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
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
                                        <i className="bi bi-credit-card me-2"></i>
                                        Record Payment — Invoice #{payForm.invoiceID}
                                    </h5>
                                    <button
                                        type="button"
                                        className="btn-close btn-close-white"
                                        onClick={() => setShowPayment(false)}
                                        disabled={saving}
                                    />
                                </div>
                                <form onSubmit={handlePayment}>
                                    <div className="modal-body">
                                        {/* Balance info banner */}
                                        {selected && (
                                            <div className="alert alert-info py-2 mb-3">
                                                <div className="d-flex justify-content-between">
                                                    <span><strong>Amount Due:</strong> ₹{Number(selected.amountDue).toFixed(2)}</span>
                                                    <span><strong>Paid:</strong> ₹{totalPaid.toFixed(2)}</span>
                                                    <span><strong>Balance:</strong> ₹{balance.toFixed(2)}</span>
                                                </div>
                                            </div>
                                        )}
                                        <div className="row g-3">
                                            <div className="col-md-6">
                                                <label className="form-label fw-bold">
                                                    Amount <span className="text-danger">*</span>
                                                </label>
                                                <div className="input-group">
                                                    <span className="input-group-text">₹</span>
                                                    <input
                                                        type="number"
                                                        className="form-control"
                                                        value={payForm.amount}
                                                        onChange={e => setPayForm({ ...payForm, amount: e.target.value })}
                                                        placeholder={balance > 0 ? balance.toFixed(2) : '0.00'}
                                                        step="0.01"
                                                        min="0.01"
                                                        max={balance > 0 ? balance.toFixed(2) : undefined}
                                                        required
                                                        autoFocus
                                                    />
                                                </div>
                                                {balance > 0 && (
                                                    <div className="form-text">
                                                        <button
                                                            type="button"
                                                            className="btn btn-link btn-sm p-0"
                                                            onClick={() => setPayForm({ ...payForm, amount: balance.toFixed(2) })}
                                                        >
                                                            Pay full balance ₹{balance.toFixed(2)}
                                                        </button>
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
                                                    placeholder="Transaction ID / Cheque number / UPI ref..."
                                                />
                                            </div>
                                        </div>
                                        <ErrorAlert error={error} onDismiss={() => setError(null)} />
                                    </div>
                                    <div className="modal-footer">
                                        <button
                                            type="button"
                                            className="btn btn-outline-secondary"
                                            onClick={() => setShowPayment(false)}
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
                                                    Recording...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="bi bi-check-lg me-2"></i>
                                                    Record Payment
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
