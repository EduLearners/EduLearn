import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { applicantService } from '../../services/applicantService';
import { authService } from '../../services/authService';
import Loading from '../../components/Loading';
import ErrorAlert from '../../components/ErrorAlert';
import StatusBadge from '../../components/StatusBadge';

export default function ApplicantsPage() {
    const [applicants, setApplicants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const navigate = useNavigate();

    const { role } = authService.getCurrentUser();
    const canCreate = ['Registrar', 'ITAdmin'].includes(role);

    useEffect(() => {
        loadApplicants();
    }, []);

    const loadApplicants = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await applicantService.getAll();
            setApplicants(data || []);
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    const filteredApplicants = useMemo(() => {
        return applicants.filter(a => {
            if (statusFilter !== 'All' && a.applicationStatus !== statusFilter) return false;

            if (search.trim()) {
                const q = search.toLowerCase();
                const matches =
                    a.name?.toLowerCase().includes(q) ||
                    a.programApplied?.toLowerCase().includes(q) ||
                    a.nationalID?.toLowerCase().includes(q);
                if (!matches) return false;
            }
            return true;
        });
    }, [applicants, search, statusFilter]);

    // Count by status (for badges in filter buttons)
    const statusCounts = useMemo(() => {
        const counts = { All: applicants.length, Submitted: 0, UnderReview: 0, Accepted: 0, Rejected: 0, Waitlisted: 0 };
        applicants.forEach(a => {
            if (counts[a.applicationStatus] !== undefined) counts[a.applicationStatus]++;
        });
        return counts;
    }, [applicants]);

    return (
        <div>
            {/* Page header */}
            <div className="d-flex align-items-center justify-content-between mb-4">
                <h2 className="text-primary-edulearn mb-0">
                    <i className="bi bi-person-plus me-2"></i>Applicants
                </h2>
                {canCreate && (
                    <button
                        className="btn btn-primary-edulearn"
                        onClick={() => navigate('/applicants/new')}
                    >
                        <i className="bi bi-plus-lg me-2"></i>New Applicant
                    </button>
                )}
            </div>

            {/* Filter card */}
            <div className="card shadow-sm mb-3">
                <div className="card-body">
                    <div className="row g-3 align-items-end">
                        <div className="col-md-6">
                            <label className="form-label fw-bold">
                                <i className="bi bi-search me-1"></i>Search
                            </label>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Search by name, program, or national ID..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="col-md-4">
                            <label className="form-label fw-bold">
                                <i className="bi bi-funnel me-1"></i>Status
                            </label>
                            <select
                                className="form-select"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="All">All ({statusCounts.All})</option>
                                <option value="Submitted">Submitted ({statusCounts.Submitted})</option>
                                <option value="UnderReview">Under Review ({statusCounts.UnderReview})</option>
                                <option value="Accepted">Accepted ({statusCounts.Accepted})</option>
                                <option value="Rejected">Rejected ({statusCounts.Rejected})</option>
                                <option value="Waitlisted">Waitlisted ({statusCounts.Waitlisted})</option>
                            </select>
                        </div>
                        <div className="col-md-2">
                            <button
                                className="btn btn-outline-secondary w-100"
                                onClick={loadApplicants}
                                disabled={loading}
                            >
                                <i className="bi bi-arrow-clockwise me-1"></i>Refresh
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <ErrorAlert error={error} onDismiss={() => setError(null)} />

            {loading && <Loading message="Loading applicants..." />}

            {!loading && (
                <div className="card shadow-sm">
                    <div className="card-body p-0">
                        {filteredApplicants.length === 0 ? (
                            <div className="text-center py-5 text-muted">
                                <i className="bi bi-inbox" style={{ fontSize: '3rem' }}></i>
                                <p className="mt-3 mb-0">
                                    {applicants.length === 0
                                        ? 'No applicants in the system yet.'
                                        : 'No applicants match your filters.'}
                                </p>
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <table className="table table-hover mb-0">
                                    <thead className="bg-primary-edulearn text-white">
                                        <tr>
                                            <th>ID</th>
                                            <th>Name</th>
                                            <th>DOB</th>
                                            <th>Program Applied</th>
                                            <th>Submitted</th>
                                            <th>Status</th>
                                            <th className="text-end pe-3">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredApplicants.map(a => (
                                            <tr key={a.applicantID}>
                                                <td>{a.applicantID}</td>
                                                <td className="fw-bold">{a.name}</td>
                                                <td>
                                                    {a.dob ? new Date(a.dob).toLocaleDateString() : '—'}
                                                </td>
                                                <td>{a.programApplied}</td>
                                                <td>
                                                    <small className="text-muted">
                                                        {a.submittedAt ? new Date(a.submittedAt).toLocaleDateString() : '—'}
                                                    </small>
                                                </td>
                                                <td>
                                                    <StatusBadge status={a.applicationStatus} />
                                                </td>
                                                <td className="text-end pe-3">
                                                    <button
                                                        className="btn btn-sm btn-outline-primary"
                                                        onClick={() => navigate(`/applicants/${a.applicantID}`)}
                                                    >
                                                        <i className="bi bi-eye me-1"></i>Review
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                    {filteredApplicants.length > 0 && (
                        <div className="card-footer text-muted small">
                            Showing {filteredApplicants.length} of {applicants.length} applicants
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
