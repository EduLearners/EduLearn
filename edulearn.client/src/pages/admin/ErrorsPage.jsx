import { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import Loading from '../../components/Loading';
import ErrorAlert from '../../components/ErrorAlert';

export default function ErrorsPage() {
  const [errors, setErrors] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ source: '', severity: '', resolved: '', page: 1, pageSize: 25 });
  const [resolving, setResolving] = useState(null);
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''));
      const { data } = await axiosClient.get('/clientlogs', { params });
      setErrors(data.items || []);
      setTotal(data.total || 0);
    } catch (err) { setError(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filters.page]);

  const handleResolve = async (id) => {
    try {
      setResolving(id);
      await axiosClient.post(`/clientlogs/${id}/resolve`, { note });
      setSelected(null);
      setNote('');
      load();
    } catch (err) { setError(err); }
    finally { setResolving(null); }
  };

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <h2 className="text-primary-edulearn mb-0">
          <i className="bi bi-bug me-2"></i>Application Errors
        </h2>
        <button className="btn btn-outline-secondary btn-sm" onClick={load} disabled={loading}>
          <i className="bi bi-arrow-clockwise me-1"></i>Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-2">
            <div className="col-md-3">
              <select className="form-select form-select-sm" value={filters.source} onChange={e => setFilters(f => ({ ...f, source: e.target.value, page: 1 }))}>
                <option value="">All Sources</option>
                <option value="Server">Server</option>
                <option value="Client">Client</option>
              </select>
            </div>
            <div className="col-md-3">
              <select className="form-select form-select-sm" value={filters.severity} onChange={e => setFilters(f => ({ ...f, severity: e.target.value, page: 1 }))}>
                <option value="">All Severities</option>
                <option value="Info">Info</option>
                <option value="Warning">Warning</option>
                <option value="Error">Error</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
            <div className="col-md-3">
              <select className="form-select form-select-sm" value={filters.resolved} onChange={e => setFilters(f => ({ ...f, resolved: e.target.value, page: 1 }))}>
                <option value="">All</option>
                <option value="false">Unresolved</option>
                <option value="true">Resolved</option>
              </select>
            </div>
            <div className="col-md-3">
              <button className="btn btn-sm btn-primary-edulearn w-100" onClick={load}>Apply</button>
            </div>
          </div>
        </div>
      </div>

      <ErrorAlert error={error} onDismiss={() => setError(null)} />
      {loading && <Loading message="Loading errors..." />}

      {!loading && errors.length === 0 && (
        <div className="text-center py-5 text-muted">
          <i className="bi bi-check-circle display-4 d-block mb-3"></i>
          <p>No errors found.</p>
        </div>
      )}

      {!loading && errors.length > 0 && (
        <div className="card shadow-sm">
          <div className="card-header bg-light d-flex align-items-center justify-content-between">
            <strong><i className="bi bi-table me-2"></i>Errors</strong>
            <small className="text-muted">{total} total</small>
          </div>
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>ID</th><th>Time</th><th>Source</th><th>Severity</th><th>Message</th><th>User</th><th>Status</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {errors.map(e => (
                  <tr key={e.id}>
                    <td><code>{e.id}</code></td>
                    <td><small>{new Date(e.occurredAt).toLocaleString()}</small></td>
                    <td><span className="badge bg-secondary">{e.source}</span></td>
                    <td><span className={`badge ${e.severity === 'Critical' || e.severity === 'Error' ? 'bg-danger' : e.severity === 'Warning' ? 'bg-warning text-dark' : 'bg-info text-dark'}`}>{e.severity}</span></td>
                    <td><small className="text-truncate d-block" style={{maxWidth:240}}>{e.message}</small></td>
                    <td><small>{e.userId ?? '—'}</small></td>
                    <td>{e.resolved ? <span className="badge bg-success">Resolved</span> : <span className="badge bg-secondary">Open</span>}</td>
                    <td>
                      {!e.resolved && (
                        <button className="btn btn-sm btn-outline-primary" onClick={() => { setSelected(e.id); setNote(''); }}>
                          Resolve
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          <div className="card-footer d-flex gap-2">
            <button className="btn btn-sm btn-outline-secondary" disabled={filters.page <= 1} onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}>Previous</button>
            <span className="align-self-center small">Page {filters.page}</span>
            <button className="btn btn-sm btn-outline-secondary" disabled={filters.page * filters.pageSize >= total} onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}>Next</button>
          </div>
        </div>
      )}

      {/* Resolve Modal */}
      {selected !== null && (
        <div className="modal d-block" tabIndex="-1" style={{background:'rgba(0,0,0,.5)'}}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Resolve Error #{selected}</h5>
                <button type="button" className="btn-close" onClick={() => setSelected(null)}></button>
              </div>
              <div className="modal-body">
                <label className="form-label">Resolution note (optional)</label>
                <textarea className="form-control" rows={3} value={note} onChange={e => setNote(e.target.value)} />
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setSelected(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={() => handleResolve(selected)} disabled={resolving === selected}>
                  {resolving === selected ? <span className="spinner-border spinner-border-sm me-1"></span> : null}
                  Mark Resolved
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
