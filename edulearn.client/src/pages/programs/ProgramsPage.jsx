import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { programService } from '../../services/programService';
import { authService } from '../../services/authService';
import Loading from '../../components/Loading';
import ErrorAlert from '../../components/ErrorAlert';
import StatusBadge from '../../components/StatusBadge';

export default function ProgramsPage() {
    const navigate = useNavigate();
    const { role } = authService.getCurrentUser();
    const isStudent = role === 'Student';
    // Backend DeptAdminPolicy: DeptAdmin + ITAdmin only for create/edit
    const canManage = ['DeptAdmin', 'ITAdmin'].includes(role);

    const [programs, setPrograms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');

    useEffect(() => {
        loadPrograms();
    }, []);

    const loadPrograms = async () => {
        try {
            setLoading(true);
            setError(null);
            if (isStudent) {
                // Student: use dedicated /programs/mine endpoint
                // returns only programs the student is enrolled in
                const data = await programService.getMine();
                setPrograms(data || []);
            } else {
                // All other roles: load all programs
                const data = await programService.getAll();
                setPrograms(data || []);
            }
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    const filtered = programs.filter(p =>
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.degreeType?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div>
            {/* Page Header */}
            <div className="d-flex align-items-center justify-content-between mb-4">
                <h2 className="text-primary-edulearn mb-0">
                    <i className="bi bi-mortarboard me-2"></i>Degree Programs
                </h2>
                {canManage && (
                    <button
                        className="btn btn-primary-edulearn"
                        onClick={() => navigate('/programs/new')}
                    >
                        <i className="bi bi-plus-lg me-2"></i>New Program
                    </button>
                )}
            </div>

            {/* Search */}
            <div className="card shadow-sm mb-4">
                <div className="card-body">
                    <div className="row g-3">
                        <div className="col-md-8">
                            <div className="input-group">
                                <span className="input-group-text">
                                    <i className="bi bi-search"></i>
                                </span>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Search by name or degree type..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="col-md-2">
                            <button
                                className="btn btn-outline-secondary w-100"
                                onClick={() => setSearch('')}
                            >
                                <i className="bi bi-x-lg me-1"></i>Clear
                            </button>
                        </div>
                        <div className="col-md-2">
                            <button
                                className="btn btn-outline-secondary w-100"
                                onClick={loadPrograms}
                                disabled={loading}
                            >
                                <i className="bi bi-arrow-clockwise me-1"></i>Refresh
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <ErrorAlert error={error} onDismiss={() => setError(null)} />
            {loading && <Loading message="Loading programs..." />}

            {/* Empty State */}
            {!loading && !error && filtered.length === 0 && (
                <div className="text-center py-5 text-muted">
                    <i className="bi bi-mortarboard display-4 d-block mb-3"></i>
                    <p className="mb-1">No programs found.</p>
                    {canManage && (
                        <button
                            className="btn btn-primary-edulearn mt-2"
                            onClick={() => navigate('/programs/new')}
                        >
                            <i className="bi bi-plus-lg me-2"></i>Create First Program
                        </button>
                    )}
                </div>
            )}

            {/* Table */}
            {!loading && filtered.length > 0 && (
                <div className="card shadow-sm">
                    <div className="card-header bg-light d-flex align-items-center justify-content-between">
                        <strong>
                            <i className="bi bi-table me-2"></i>Programs
                        </strong>
                        <small className="text-muted">{filtered.length} result(s)</small>
                    </div>
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th>Name</th>
                                    <th>Degree Type</th>
                                    <th>Duration</th>
                                    <th>Department ID</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(program => (
                                    <tr
                                        key={program.programID}
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => navigate(`/programs/${program.programID}`)}
                                    >
                                        <td className="fw-bold">{program.name}</td>
                                        <td>
                                            <span className="badge bg-secondary">
                                                {program.degreeType}
                                            </span>
                                        </td>
                                        <td>{program.durationTerms} terms</td>
                                        <td>{program.departmentID || '—'}</td>
                                        <td>
                                            <StatusBadge status={program.status} />
                                        </td>
                                        <td onClick={e => e.stopPropagation()}>
                                            <div className="d-flex gap-2">
                                                <button
                                                    className="btn btn-sm btn-outline-primary"
                                                    onClick={() => navigate(`/programs/${program.programID}`)}
                                                    title="View"
                                                >
                                                    <i className="bi bi-eye"></i>
                                                </button>
                                                {canManage && (
                                                    <button
                                                        className="btn btn-sm btn-outline-secondary"
                                                        onClick={() => navigate(`/programs/${program.programID}/edit`)}
                                                        title="Edit"
                                                    >
                                                        <i className="bi bi-pencil"></i>
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="card-footer text-muted small">
                        Showing {filtered.length} of {programs.length} programs
                    </div>
                </div>
            )}
        </div>
    );
}