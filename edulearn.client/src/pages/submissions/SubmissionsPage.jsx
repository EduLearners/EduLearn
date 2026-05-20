import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { submissionService } from '../../services/submissionService';
import { authService } from '../../services/authService';
import { SubmissionStatus } from '../../models/Assessment';
import Loading from '../../components/Loading';
import ErrorAlert from '../../components/ErrorAlert';
import StatusBadge from '../../components/StatusBadge';
import axiosClient from '../../api/axiosClient';

export default function SubmissionsPage() {
    const navigate = useNavigate();
    const { role, userId } = authService.getCurrentUser();

    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filterStatus, setFilterStatus] = useState('');
    const [search, setSearch] = useState('');

    const canManage = ['Instructor', 'ITAdmin'].includes(role);
    const isStudent = role === 'Student';

    useEffect(() => {
        loadSubmissions();
    }, []);

    const loadSubmissions = async () => {
        try {
            setLoading(true);
            setError(null);

            let data = [];

            if (isStudent) {
                // GET /api/students/me — resolves StudentID from JWT UserID
                const studentRecord = await axiosClient.get('/students/me').then(r => r.data);
                data = await submissionService.getByStudent(studentRecord.studentID);
            } else {
                // Instructor/ITAdmin — aggregate submissions across all assessments
                const { data: courses } = await axiosClient.get('/courses');
                const assessmentResults = await Promise.allSettled(
                    courses.map(c =>
                        axiosClient.get(`/assessments/course/${c.courseID}`)
                            .then(r => r.data)
                            .catch(() => [])
                    )
                );
                const allAssessments = assessmentResults
                    .filter(r => r.status === 'fulfilled')
                    .flatMap(r => r.value);

                const subResults = await Promise.allSettled(
                    allAssessments.map(a =>
                        submissionService.getByAssessment(a.assessmentID)
                            .catch(() => [])
                    )
                );
                data = subResults
                    .filter(r => r.status === 'fulfilled')
                    .flatMap(r => r.value);
            }

            setSubmissions(data);
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    const filtered = submissions.filter(s => {
        const matchStatus = filterStatus ? s.status === filterStatus : true;
        const matchSearch = search
            ? String(s.assessmentID).includes(search) ||
              String(s.studentID).includes(search)
            : true;
        return matchStatus && matchSearch;
    });

    return (
        <div>
            {/* Page Header */}
            <div className="d-flex align-items-center justify-content-between mb-4">
                <h2 className="text-primary-edulearn mb-0">
                    <i className="bi bi-cloud-upload me-2"></i>
                    {isStudent ? 'My Submissions' : 'All Submissions'}
                </h2>
            </div>

            {/* Filters */}
            <div className="card shadow-sm mb-4">
                <div className="card-body">
                    <div className="row g-3">
                        <div className="col-md-7">
                            <div className="input-group">
                                <span className="input-group-text">
                                    <i className="bi bi-search"></i>
                                </span>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder={
                                        isStudent
                                            ? 'Search by assessment ID...'
                                            : 'Search by assessment ID or student ID...'
                                    }
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="col-md-4">
                            <select
                                className="form-select"
                                value={filterStatus}
                                onChange={e => setFilterStatus(e.target.value)}
                            >
                                <option value="">All Statuses</option>
                                {Object.values(SubmissionStatus).map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-md-1">
                            <button
                                className="btn btn-outline-secondary w-100"
                                onClick={() => { setSearch(''); setFilterStatus(''); }}
                                title="Clear filters"
                            >
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Error */}
            <ErrorAlert error={error} onDismiss={() => setError(null)} />

            {/* Loading */}
            {loading && <Loading message="Loading submissions..." />}

            {/* Empty State */}
            {!loading && !error && filtered.length === 0 && (
                <div className="text-center py-5 text-muted">
                    <i className="bi bi-inbox display-4 d-block mb-3"></i>
                    <p className="mb-1">No submissions found.</p>
                    {isStudent && (
                        <button
                            className="btn btn-primary-edulearn mt-2"
                            onClick={() => navigate('/assessments')}
                        >
                            <i className="bi bi-file-earmark-text me-2"></i>
                            Browse Assessments
                        </button>
                    )}
                </div>
            )}

            {/* Table */}
            {!loading && filtered.length > 0 && (
                <div className="card shadow-sm">
                    <div className="card-header bg-light d-flex align-items-center justify-content-between">
                        <strong>
                            <i className="bi bi-table me-2"></i>Submissions
                        </strong>
                        <small className="text-muted">{filtered.length} result(s)</small>
                    </div>
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th>ID</th>
                                    <th>Assessment</th>
                                    {!isStudent && <th>Student</th>}
                                    <th>Submitted At</th>
                                    <th>Status</th>
                                    <th>Score</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(sub => (
                                    <tr key={sub.submissionID}>
                                        <td><code>{sub.submissionID}</code></td>
                                        <td>
                                            <button
                                                className="btn btn-link p-0 text-decoration-none"
                                                onClick={() => navigate(`/assessments/${sub.assessmentID}`)}
                                            >
                                                {sub.assessmentTitle || sub.assessmentID}
                                            </button>
                                        </td>
                                        {!isStudent && (
                                            <td>{sub.studentName || sub.studentID}</td>
                                        )}
                                        <td>
                                            {sub.submittedAt
                                                ? new Date(sub.submittedAt).toLocaleString()
                                                : '—'}
                                        </td>
                                        <td><StatusBadge status={sub.status} /></td>
                                        <td>
                                            {sub.score != null
                                                ? `${sub.score} / ${sub.maxScore}`
                                                : '—'}
                                        </td>
                                        <td>
                                            <div className="d-flex gap-2">
                                                {canManage && (
                                                    <button
                                                        className="btn btn-sm btn-outline-success"
                                                        onClick={() => navigate(`/submissions/${sub.submissionID}/grade`)}
                                                        title="Grade"
                                                    >
                                                        <i className="bi bi-star me-1"></i>Grade
                                                    </button>
                                                )}
                                                <button
                                                    className="btn btn-sm btn-outline-primary"
                                                    onClick={() => navigate(`/assessments/${sub.assessmentID}`)}
                                                    title="View Assessment"
                                                >
                                                    <i className="bi bi-eye"></i>
                                                </button>
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