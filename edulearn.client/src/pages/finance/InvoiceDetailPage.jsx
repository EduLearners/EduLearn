// InvoiceDetailPage.jsx
// Route: /student/invoices/:id
// Owner: Tanya (SFB module)
// Student-facing invoice detail view. Read-only. Shows line items and payments.

import { useState, useEffect }    from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { invoiceService }  from '../../services/invoiceService';
import { paymentService }  from '../../services/paymentService';
import Loading             from '../../components/Loading';
import ErrorAlert          from '../../components/ErrorAlert';
import StatusBadge         from '../../components/StatusBadge';
import EmptyState          from '../../components/shared/EmptyState';

export default function InvoiceDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [invoice,  setInvoice]  = useState(null);
    const [payments, setPayments] = useState([]);
    const [loading,  setLoading]  = useState(true);
    const [error,    setError]    = useState(null);

    useEffect(() => { loadAll(); }, [id]);

    const loadAll = async () => {
        try {
            setLoading(true);
            setError(null);
            const [inv, pays] = await Promise.all([
                invoiceService.getById(id),
                paymentService.getByInvoice(id).catch(() => []),
            ]);
            setInvoice(inv);
            setPayments(pays || []);
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    const parseLineItems = (json) => {
        if (!json) return [];
        try { return JSON.parse(json); } catch { return []; }
    };

    const totalPaid = payments
        .filter(p => p.status === 'Completed' || p.status === 'Paid')
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    if (loading) return <Loading message="Loading invoice..." />;

    return (
        <div>
            {/* Header */}
            <div className="d-flex align-items-center justify-content-between mb-4">
                <h2 className="text-primary-edulearn mb-0">
                    <i className="bi bi-receipt me-2"></i>Invoice Detail
                </h2>
                <button
                    className="btn btn-outline-secondary"
                    onClick={() => navigate('/finance/invoices')}
                >
                    <i className="bi bi-arrow-left me-1"></i>Back to Invoices
                </button>
            </div>

            <ErrorAlert error={error} onDismiss={() => setError(null)} />

            {invoice && (
                <div className="row g-4">
                    {/* Invoice card */}
                    <div className="col-lg-8">
                        <div className="card shadow-sm mb-4">
                            <div className="card-header bg-primary-edulearn text-white d-flex align-items-center justify-content-between">
                                <strong>
                                    <i className="bi bi-receipt me-2"></i>
                                    Invoice {invoice.invoiceID}
                                </strong>
                                <StatusBadge status={invoice.status} />
                            </div>
                            <div className="card-body">
                                <div className="row g-3 mb-4">
                                    <div className="col-md-4">
                                        <dt className="text-muted small">Student</dt>
                                        <dd className="fw-bold mb-0">{invoice.studentName}</dd>
                                    </div>
                                    <div className="col-md-4">
                                        <dt className="text-muted small">Term</dt>
                                        <dd className="mb-0">{invoice.term}</dd>
                                    </div>
                                    <div className="col-md-4">
                                        <dt className="text-muted small">Due Date</dt>
                                        <dd className="mb-0">
                                            {invoice.dueDate
                                                ? new Date(invoice.dueDate).toLocaleDateString()
                                                : '—'}
                                        </dd>
                                    </div>
                                </div>

                                {/* Line items */}
                                <h6 className="text-muted text-uppercase small mb-2">Fee Breakdown</h6>
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
                                            {parseLineItems(invoice.lineItemsJSON).map((item, idx) => (
                                                <tr key={idx}>
                                                    <td>{item.item}</td>
                                                    <td className="text-end font-monospace">
                                                        ₹{Number(item.amount || 0).toFixed(2)}
                                                    </td>
                                                    <td className="text-end text-danger font-monospace">
                                                        {item.discount ? `-₹${Number(item.discount).toFixed(2)}` : '—'}
                                                    </td>
                                                    <td className="text-end font-monospace">
                                                        ₹{Number(item.net || item.amount || 0).toFixed(2)}
                                                    </td>
                                                </tr>
                                            ))}
                                            <tr className="table-light fw-bold">
                                                <td colSpan={3}>Total Amount Due</td>
                                                <td className="text-end font-monospace">
                                                    ₹{Number(invoice.amountDue).toFixed(2)}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Payments */}
                        <div className="card shadow-sm">
                            <div className="card-header bg-light d-flex align-items-center justify-content-between">
                                <strong>
                                    <i className="bi bi-credit-card me-2"></i>
                                    Payment History ({payments.length})
                                </strong>
                            </div>
                            {payments.length === 0 ? (
                                <div className="card-body p-0">
                                    <EmptyState
                                        icon="bi-credit-card"
                                        title="No payments yet"
                                        description="Payments will appear here once recorded by the Finance office."
                                    />
                                </div>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table table-sm align-middle mb-0">
                                        <thead className="table-light">
                                            <tr>
                                                <th>Payment #</th>
                                                <th>Amount</th>
                                                <th>Method</th>
                                                <th>Reference</th>
                                                <th>Status</th>
                                                <th>Date</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {payments.map(p => (
                                                <tr key={p.paymentID}>
                                                    <td><code>{p.paymentID}</code></td>
                                                    <td className="fw-bold font-monospace">
                                                        ₹{Number(p.amount).toFixed(2)}
                                                    </td>
                                                    <td>
                                                        <span className="badge bg-secondary">{p.method}</span>
                                                    </td>
                                                    <td>{p.reference || '—'}</td>
                                                    <td><StatusBadge status={p.status} /></td>
                                                    <td>
                                                        {p.paidAt
                                                            ? new Date(p.paidAt).toLocaleDateString()
                                                            : '—'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Summary sidebar */}
                    <div className="col-lg-4">
                        <div className="card shadow-sm">
                            <div className="card-header bg-light">
                                <strong><i className="bi bi-calculator me-2"></i>Payment Summary</strong>
                            </div>
                            <div className="card-body">
                                <div className="d-flex justify-content-between mb-2">
                                    <span className="text-muted">Total Due</span>
                                    <strong className="font-monospace">
                                        ₹{Number(invoice.amountDue).toFixed(2)}
                                    </strong>
                                </div>
                                <div className="d-flex justify-content-between mb-2">
                                    <span className="text-muted">Total Paid</span>
                                    <strong className="font-monospace text-success">
                                        ₹{totalPaid.toFixed(2)}
                                    </strong>
                                </div>
                                <hr />
                                <div className="d-flex justify-content-between">
                                    <span className="fw-bold">Balance</span>
                                    <strong
                                        className="font-monospace"
                                        style={{
                                            color: (Number(invoice.amountDue) - totalPaid) > 0
                                                ? 'var(--color-danger)'
                                                : 'var(--color-success)'
                                        }}
                                    >
                                        ₹{(Number(invoice.amountDue) - totalPaid).toFixed(2)}
                                    </strong>
                                </div>

                                <div className="mt-3">
                                    <StatusBadge status={invoice.status} />
                                </div>

                                {invoice.status !== 'Paid' && (
                                    <div className="alert alert-warning mt-3 py-2 small mb-0">
                                        <i className="bi bi-exclamation-circle me-2"></i>
                                        Please contact the Finance office to make a payment.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
