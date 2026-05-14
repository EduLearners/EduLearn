import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { assessmentService } from '../../services/assessmentService';
import { authService } from '../../services/authService';
import { AssessmentType, AssessmentStatus } from '../../models/Assessment';
import Loading from '../../components/Loading';
import ErrorAlert from '../../components/ErrorAlert';
import StatusBadge from '../../components/StatusBadge';

export default function AssessmentsPage() {
    const navigate = useNavigate();
    const { role } = authService.getCurrentUser();

    const [assessments, setAssessments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    const canManage = ['Instructor', 'ITAdmin'].includes(role);
    const isStudent = role === 'Student';

    useEffect(() => {
        loadAssessments();
    }, []);

    const loadAssessments = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await assessmentService.getAll();
            setAssessments(data);
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    const filtered = assessments.filter(a => {
        const matchSearch = a.title?.toLowerCase().includes(search.toLowerCase());
        const matchType = filterType ? a.type === filterType : true;
        const matchStatus = filterStatus ? a.status === filterStatus : true;
        return matchSearch && matchType && matchStatus;
    });

    return (
        <div>
            {/* Page Header */}
            <div className="d-flex align-items-center justify-content-between mb-4">
                <h2 className="text-primary-edulearn mb-0">
                    <i className="bi bi-file-earmark-text me-2"></i>Assessments
                </h2>
                {canManage && (
                    <button
                        className="btn btn-primary-edulearn"
                        onClick={() => navigate('/assessments/new')}
                    >
                        <i className="bi bi-plus-lg me-2"></i>New Assessment
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="card shadow-sm mb-4">
                <div className="card-body">
                    <div className="row g-3">
                        <div className="col-md-4">
                            <div className="input-group">
                                <span className="input-group-text">
                                    <i className="bi bi-search"></i>
                                </span>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Search by title..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="col-md-3">
                            <select
                                className="form-select"
                                value={filterType}
                                onChange={e => setFilterType(e.target.value)}
                            >
                                <option value="">All Types</option>
                                {Object.values(AssessmentType).map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-md-3">
                            <select
                                className="form-select"
                                value={filterStatus}
                                onChange={e => setFilterStatus(e.target.value)}
                            >
                                <option value="">All Statuses</option>
                                {Object.values(AssessmentStatus).map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-md-2">
                            <button
                                className="btn btn-outline-secondary w-100"
                                onClick={() => { setSearch(''); setFilterType(''); setFilterStatus(''); }}
                            >
                                <i className="bi bi-x-lg me-1"></i>Clear
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <ErrorAlert error={error} onDismiss={() => setError(null)} />
            {loading && <Loading message="Loading assessments..." />}

            {!loading && !error && filtered.length === 0 && (
                <div className="text-center py-5 text-muted">
                    <i className="bi bi-file-earmark-text display-4 d-block mb-3"></i>
                    <p className="mb-1">No assessments found.</p>
                    {canManage && (
                        <button
                            className="btn btn-primary-edulearn mt-2"
                            onClick={() => navigate('/assessments/new')}
                        >
                            <i className="bi bi-plus-lg me-2"></i>Create First Assessment
                        </button>
                    )}
                </div>
            )}

            {!loading && filtered.length > 0 && (
                <div className="card shadow-sm">
                    <div className="card-header bg-light d-flex align-items-center justify-content-between">
                        <strong><i className="bi bi-table me-2"></i>Assessments</strong>
                        <small className="text-muted">{filtered.length} result(s)</small>
                    </div>
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th>Title</th>
                                    <th>Type</th>
                                    <th>Max Score</th>
                                    <th>Due At</th>
                                    <th>Course</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(assessment => (
                                    <tr
                                        key={assessment.assessmentID}
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => navigate(`/assessments/${assessment.assessmentID}`)}
                                    >
                                        <td className="fw-bold">{assessment.title}</td>
                                        <td>
                                            <span className="badge bg-secondary">{assessment.type}</span>
                                        </td>
                                        <td>{assessment.maxScore}</td>
                                        <td>
                                            {assessment.dueAt
                                                ? new Date(assessment.dueAt).toLocaleDateString()
                                                : '—'}
                                        </td>
                                        <td>{assessment.courseName || assessment.courseID || '—'}</td>
                                        <td><StatusBadge status={assessment.status} /></td>
                                        <td onClick={e => e.stopPropagation()}>
                                            <div className="d-flex gap-2">
                                                <button
                                                    className="btn btn-sm btn-outline-primary"
                                                    onClick={() => navigate(`/assessments/${assessment.assessmentID}`)}
                                                    title="View"
                                                >
                                                    <i className="bi bi-eye"></i>
                                                </button>
                                                {isStudent && (
                                                    <button
                                                        className="btn btn-sm btn-outline-success"
                                                        onClick={() => navigate(`/submissions/${assessment.assessmentID}/submit`)}
                                                        title="Submit"
                                                    >
                                                        <i className="bi bi-cloud-upload"></i>
                                                    </button>
                                                )}
                                                {canManage && (
                                                    <button
                                                        className="btn btn-sm btn-outline-secondary"
                                                        onClick={() => navigate(`/assessments/${assessment.assessmentID}/edit`)}
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
                </div>
            )}
        </div>
    );
}