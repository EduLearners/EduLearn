import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { studentService } from '../../services/studentService';
import { authService } from '../../services/authService';
import Loading from '../../components/Loading';
import ErrorAlert from '../../components/ErrorAlert';
import StatusBadge from '../../components/StatusBadge';

export default function StudentsPage() {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const navigate = useNavigate();

    const { role } = authService.getCurrentUser();
    const canCreate = ['Registrar', 'ITAdmin'].includes(role);

    // Fetch students on mount
    useEffect(() => {
        loadStudents();
    }, []);

    const loadStudents = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await studentService.getAll();
            setStudents(data || []);
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    // Filter + search the table on the fly
    const filteredStudents = useMemo(() => {
        return students.filter(s => {
            // Status filter
            if (statusFilter !== 'All' && s.enrollmentStatus !== statusFilter) {
                return false;
            }
            // Search by name, MRN, or email
            if (search.trim()) {
                const q = search.toLowerCase();
                const matches =
                    s.name?.toLowerCase().includes(q) ||
                    s.mrn?.toLowerCase().includes(q);
                if (!matches) return false;
            }
            return true;
        });
    }, [students, search, statusFilter]);

    return (
        <div>
            {/* Page header */}
            <div className="d-flex align-items-center justify-content-between mb-4">
                <h2 className="text-primary-edulearn mb-0">
                    <i className="bi bi-people me-2"></i>Students
                </h2>
                {canCreate && (
                    <button
                        className="btn btn-primary-edulearn"
                        onClick={() => navigate('/students/new')}
                    >
                        <i className="bi bi-plus-lg me-2"></i>Add Student
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
                                placeholder="Search by name or MRN..."
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
                                <option value="All">All</option>
                                <option value="Active">Active</option>
                                <option value="Graduated">Graduated</option>
                                <option value="Withdrawn">Withdrawn</option>
                                <option value="Suspended">Suspended</option>
                            </select>
                        </div>
                        <div className="col-md-2">
                            <button
                                className="btn btn-outline-secondary w-100"
                                onClick={loadStudents}
                                disabled={loading}
                            >
                                <i className="bi bi-arrow-clockwise me-1"></i>Refresh
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <ErrorAlert error={error} onDismiss={() => setError(null)} />

            {/* Loading state */}
            {loading && <Loading message="Loading students..." />}

            {/* Table */}
            {!loading && (
                <div className="card shadow-sm">
                    <div className="card-body p-0">
                        {filteredStudents.length === 0 ? (
                            <div className="text-center py-5 text-muted">
                                <i className="bi bi-inbox" style={{ fontSize: '3rem' }}></i>
                                <p className="mt-3 mb-0">
                                    {students.length === 0
                                        ? 'No students found in the system.'
                                        : 'No students match your filters.'}
                                </p>
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <table className="table table-hover mb-0">
                                    <thead className="bg-primary-edulearn text-white">
                                        <tr>
                                            <th>MRN</th>
                                            <th>Name</th>
                                            <th>Gender</th>
                                            <th>Program ID</th>
                                            <th>Entry Term</th>
                                            <th>Expected Grad</th>
                                            <th>Status</th>
                                            <th className="text-end pe-3">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredStudents.map(s => (
                                            <tr key={s.studentID}>
                                                <td>
                                                    <code className="small">{s.mrn}</code>
                                                </td>
                                                <td className="fw-bold">{s.name}</td>
                                                <td>{s.gender || '—'}</td>
                                                <td>{s.programID || '—'}</td>
                                                <td>{s.entryTerm || '—'}</td>
                                                <td>{s.expectedGraduationTerm || '—'}</td>
                                                <td>
                                                    <StatusBadge status={s.enrollmentStatus} />
                                                </td>
                                                <td className="text-end pe-3">
                                                    <button
                                                        className="btn btn-sm btn-outline-primary"
                                                        onClick={() => navigate(`/students/${s.studentID}`)}
                                                    >
                                                        <i className="bi bi-eye me-1"></i>View
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                    {filteredStudents.length > 0 && (
                        <div className="card-footer text-muted small">
                            Showing {filteredStudents.length} of {students.length} students
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
