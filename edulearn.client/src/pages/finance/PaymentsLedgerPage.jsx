// PaymentsLedgerPage.jsx
// Route: /finance/payments
// Owner: Tanya (SFB module)
// Finance-facing full payments ledger. Search by student or invoice.
// Shows all payments with method, amount, status and reference.

import { useState }        from 'react';
import { paymentService }  from '../../services/paymentService';
import { invoiceService }  from '../../services/invoiceService';
import Loading             from '../../components/Loading';
import ErrorAlert          from '../../components/ErrorAlert';
import StatusBadge         from '../../components/StatusBadge';
import EmptyState          from '../../components/shared/EmptyState';

const METHOD_COLORS = {
    BankTransfer: 'primary',
    Cash:         'success',
    Card:         'info',
    UPI:          'warning',
    Cheque:       'secondary',
};

export default function PaymentsLedgerPage() {
    const [searchMode,  setSearchMode]  = useState('invoice'); // 'invoice' | 'student'
    const [searchId,    setSearchId]    = useState('');
    const [payments,    setPayments]    = useState([]);
    const [invoiceMap,  setInvoiceMap]  = useState({});
    const [loading,     setLoading]     = useState(false);
    const [searched,    setSearched]    = useState(false);
    const [error,       setError]       = useState(null);

    const handleSearch = async (e) => {
        e.preventDefault();
        setError(null);
        setPayments([]);
        setInvoiceMap({});
        setLoading(true);
        setSearched(true);

        try {
            if (searchMode === 'invoice') {
                const pays = await paymentService.getByInvoice(searchId);
                setPayments(pays || []);

                // fetch invoice details for the header
                const inv = await invoiceService.getById(searchId).catch(() => null);
                if (inv) setInvoiceMap({ [inv.invoiceID]: inv });

            } else {
                // student mode: get all invoices, then their payments
                const invoices = await invoiceService.getByStudent(searchId);
                const invMap = {};
                (invoices || []).forEach(inv => { invMap[inv.invoiceID] = inv; });
                setInvoiceMap(invMap);

                const payArrays = await Promise.allSettled(
                    (invoices || []).map(inv =>
                        paymentService.getByInvoice(inv.invoiceID).catch(() => [])
                    )
                );
                const allPays = payArrays
                    .filter(r => r.status === 'fulfilled')
                    .flatMap(r => r.value || []);
                setPayments(allPays);
            }
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    const totalAmount = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const completedAmount = payments
        .filter(p => ['Completed', 'Paid'].includes(p.status))
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    return (
        <div>
            {/* Header */}
            <div className="d-flex align-items-center justify-content-between mb-4">
                <h2 className="text-primary-edulearn mb-0">
                    <i className="bi bi-credit-card me-2"></i>Payments Ledger
                </h2>
            </div>

            {/* Search panel */}
            <div className="card shadow-sm mb-4">
                <div className="card-header bg-light">
                    <strong><i className="bi bi-search me-2"></i>Search Payments</strong>
                </div>
                <div className="card-body">
                    <div className="row g-3 align-items-end">
                        <div className="col-md-3">
                            <label className="form-label fw-bold">Search By</label>
                            <select
                                className="form-select"
                                value={searchMode}
                                onChange={e => { setSearchMode(e.target.value); setSearchId(''); setPayments([]); setSearched(false); }}
                            >
                                <option value="invoice">Invoice ID</option>
                                <option value="student">Student ID</option>
                            </select>
                        </div>
                        <div className="col-md-6">
                            <label className="form-label fw-bold">
                                {searchMode === 'invoice' ? 'Invoice ID' : 'Student ID'}
                                <span className="text-danger ms-1">*</span>
                            </label>
                            <input
                                type="number"
                                className="form-control"
                                value={searchId}
                                onChange={e => setSearchId(e.target.value)}
                                placeholder={searchMode === 'invoice' ? 'e.g. 12' : 'e.g. 5'}
                                required
                                min={1}
                            />
                        </div>
                        <div className="col-md-3">
                            <button
                                className="btn btn-primary-edulearn w-100"
                                onClick={handleSearch}
                                disabled={loading || !searchId}
                            >
                                {loading
                                    ? <span className="spinner-border spinner-border-sm"></span>
                                    : <><i className="bi bi-search me-1"></i>Search</>
                                }
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <ErrorAlert error={error} onDismiss={() => setError(null)} />

            {/* Summary strip — shown after search */}
            {searched && payments.length > 0 && (
                <div className="row g-3 mb-4">
                    {[
                        { label: 'Total Payments',   value: payments.length,              color: 'var(--primary)' },
                        { label: 'Total Amount',      value: `₹${totalAmount.toFixed(2)}`, color: 'var(--accent)' },
                        { label: 'Confirmed Paid',    value: `₹${completedAmount.toFixed(2)}`, color: 'var(--color-success)' },
                    ].map(s => (
                        <div key={s.label} className="col-md-4">
                            <div className="card shadow-sm border-0 bg-light">
                                <div className="card-body py-3">
                                    <div className="text-muted small text-uppercase mb-1">{s.label}</div>
                                    <div className="fs-4 fw-bold font-monospace" style={{ color: s.color }}>
                                        {s.value}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Results table */}
            {searched && (
                <div className="card shadow-sm">
                    <div className="card-header bg-light d-flex align-items-center justify-content-between">
                        <strong>
                            <i className="bi bi-list me-2"></i>
                            {payments.length > 0
                                ? `${payments.length} Payment${payments.length !== 1 ? 's' : ''} Found`
                                : 'Results'}
                        </strong>
                    </div>

                    {payments.length === 0 ? (
                        <div className="card-body p-0">
                            <EmptyState
                                icon="bi-credit-card"
                                title="No payments found"
                                description={`No payments found for ${searchMode === 'invoice' ? `Invoice #${searchId}` : `Student #${searchId}`}.`}
                            />
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-hover align-middle mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th>Payment #</th>
                                        <th>Invoice</th>
                                        <th>Amount</th>
                                        <th>Method</th>
                                        <th>Reference</th>
                                        <th>Status</th>
                                        <th>Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {payments.map(p => {
                                        const inv = invoiceMap[p.invoiceID];
                                        return (
                                            <tr key={p.paymentID}>
                                                <td><code>{p.paymentID}</code></td>
                                                <td>
                                                    <div className="fw-bold">
                                                        <code>{p.invoiceID}</code>
                                                    </div>
                                                    {inv && (
                                                        <small className="text-muted">{inv.term}</small>
                                                    )}
                                                </td>
                                                <td className="fw-bold font-monospace">
                                                    ₹{Number(p.amount).toFixed(2)}
                                                </td>
                                                <td>
                                                    <span className={`badge bg-${METHOD_COLORS[p.method] || 'secondary'}`}>
                                                        {p.method}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className="text-muted small font-monospace">
                                                        {p.reference || '—'}
                                                    </span>
                                                </td>
                                                <td><StatusBadge status={p.status} /></td>
                                                <td className="small">
                                                    {p.paidAt
                                                        ? new Date(p.paidAt).toLocaleString('en-IN', {
                                                            day: 'numeric', month: 'short', year: 'numeric',
                                                            hour: '2-digit', minute: '2-digit'
                                                          })
                                                        : '—'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
