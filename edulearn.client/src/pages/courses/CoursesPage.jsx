import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { courseService } from '../../services/courseService';
import { authService } from '../../services/authService';
import { CourseStatus } from '../../models/Course';
import Loading from '../../components/Loading';
import ErrorAlert from '../../components/ErrorAlert';
import StatusBadge from '../../components/StatusBadge';

export default function CoursesPage() {
    const navigate = useNavigate();
    const { role } = authService.getCurrentUser();

    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    // Backend CourseManagerPolicy: Instructor + DeptAdmin + ITAdmin
    const canManage = ['Instructor', 'DeptAdmin', 'ITAdmin'].includes(role);

    useEffect(() => {
        loadCourses();
    }, []);

    const loadCourses = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await courseService.getAll();
            setCourses(data);
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    const filtered = courses.filter(c => {
        const matchSearch =
            c.title?.toLowerCase().includes(search.toLowerCase()) ||
            c.code?.toLowerCase().includes(search.toLowerCase());
        const matchStatus = filterStatus ? c.status === filterStatus : true;
        return matchSearch && matchStatus;
    });

    return (
        <div>
            {/* Page Header */}
            <div className="d-flex align-items-center justify-content-between mb-4">
                <h2 className="text-primary-edulearn mb-0">
                    <i className="bi bi-book me-2"></i>Course Catalog
                </h2>
                {canManage && (
                    <button
                        className="btn btn-primary-edulearn"
                        onClick={() => navigate('/courses/new')}
                    >
                        <i className="bi bi-plus-lg me-2"></i>New Course
                    </button>
                )}
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
                                    placeholder="Search by title or code..."
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
                                {Object.values(CourseStatus).map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-md-1">
                            <button
                                className="btn btn-outline-secondary w-100"
                                onClick={() => { setSearch(''); setFilterStatus(''); }}
                            >
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <ErrorAlert error={error} onDismiss={() => setError(null)} />
            {loading && <Loading message="Loading courses..." />}

            {!loading && !error && filtered.length === 0 && (
                <div className="text-center py-5 text-muted">
                    <i className="bi bi-book display-4 d-block mb-3"></i>
                    <p className="mb-1">No courses found.</p>
                    {canManage && (
                        <button
                            className="btn btn-primary-edulearn mt-2"
                            onClick={() => navigate('/courses/new')}
                        >
                            <i className="bi bi-plus-lg me-2"></i>Create First Course
                        </button>
                    )}
                </div>
            )}

            {!loading && filtered.length > 0 && (
                <div className="card shadow-sm">
                    <div className="card-header bg-light d-flex align-items-center justify-content-between">
                        <strong><i className="bi bi-table me-2"></i>Courses</strong>
                        <small className="text-muted">{filtered.length} result(s)</small>
                    </div>
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th>Code</th>
                                    <th>Title</th>
                                    <th>Level</th>
                                    <th>Credits</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(course => (
                                    <tr
                                        key={course.courseID}
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => navigate(`/courses/${course.courseID}`)}
                                    >
                                        <td><code>{course.code}</code></td>
                                        <td className="fw-bold">{course.title}</td>
                                        <td>{course.level || '—'}</td>
                                        <td>{course.credits}</td>
                                        <td><StatusBadge status={course.status} /></td>
                                        <td onClick={e => e.stopPropagation()}>
                                            <div className="d-flex gap-2">
                                                <button
                                                    className="btn btn-sm btn-outline-primary"
                                                    onClick={() => navigate(`/courses/${course.courseID}`)}
                                                    title="View"
                                                >
                                                    <i className="bi bi-eye"></i>
                                                </button>
                                                {canManage && (
                                                    <button
                                                        className={`btn btn-sm ${
                                                            course.status === 'Archived' || course.status === 'Deprecated'
                                                                ? 'btn-outline-warning'
                                                                : 'btn-outline-secondary'
                                                        }`}
                                                        onClick={() => {
                                                            if (course.status === 'Archived' || course.status === 'Deprecated') {
                                                                if (!window.confirm(`This course is ${course.status}. Are you sure you want to edit it?`)) return;
                                                            }
                                                            navigate(`/courses/${course.courseID}/edit`);
                                                        }}
                                                        title={`Edit${
                                                            course.status === 'Archived' || course.status === 'Deprecated'
                                                                ? ` (${course.status} — editing not recommended)`
                                                                : ''
                                                        }`}
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
