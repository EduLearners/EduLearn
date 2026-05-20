import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { courseService } from '../../services/courseService';
import { authService } from '../../services/authService';
import Loading from '../../components/Loading';
import ErrorAlert from '../../components/ErrorAlert';
import StatusBadge from '../../components/StatusBadge';

export default function CourseDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { role } = authService.getCurrentUser();

    const [course, setCourse] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Backend CourseManagerPolicy: Instructor + DeptAdmin + ITAdmin
    const canManage = ['Instructor', 'DeptAdmin', 'ITAdmin'].includes(role);

    useEffect(() => {
        loadCourse();
    }, [id]);

    const loadCourse = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await courseService.getById(id);
            setCourse(data);
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            {/* Page Header */}
            <div className="d-flex align-items-center justify-content-between mb-4">
                <h2 className="text-primary-edulearn mb-0">
                    <i className="bi bi-book me-2"></i>Course Detail
                </h2>
                <div className="d-flex gap-2">
                    {canManage && course && (
                        <button
                            className="btn btn-outline-secondary"
                            onClick={() => navigate(`/courses/${id}/edit`)}
                        >
                            <i className="bi bi-pencil me-2"></i>Edit
                        </button>
                    )}
                    <button
                        className="btn btn-outline-secondary"
                        onClick={() => navigate('/courses')}
                    >
                        <i className="bi bi-arrow-left me-1"></i>Back
                    </button>
                </div>
            </div>

            <ErrorAlert error={error} onDismiss={() => setError(null)} />
            {loading && <Loading message="Loading course..." />}

            {!loading && course && (
                <>
                    <div className="card shadow-sm mb-4">
                        <div className="card-header bg-primary-edulearn text-white">
                            <div className="d-flex align-items-center justify-content-between">
                                <strong>
                                    <i className="bi bi-info-circle me-2"></i>Course Information
                                </strong>
                                <StatusBadge status={course.status} />
                            </div>
                        </div>
                        <div className="card-body">
                            <div className="row g-4">
                                <div className="col-md-6">
                                    <dl className="row mb-0">
                                        <dt className="col-sm-5 text-muted">Course ID</dt>
                                        <dd className="col-sm-7"><code>#{course.courseID}</code></dd>
                                        <dt className="col-sm-5 text-muted">Course Code</dt>
                                        <dd className="col-sm-7"><code>{course.code}</code></dd>
                                        <dt className="col-sm-5 text-muted">Title</dt>
                                        <dd className="col-sm-7 fw-bold">{course.title}</dd>
                                        <dt className="col-sm-5 text-muted">Level</dt>
                                        <dd className="col-sm-7">{course.level || '—'}</dd>
                                        <dt className="col-sm-5 text-muted">Credits</dt>
                                        <dd className="col-sm-7">{course.credits}</dd>
                                    </dl>
                                </div>
                                <div className="col-md-6">
                                    <dl className="row mb-0">
                                        <dt className="col-sm-5 text-muted">Department ID</dt>
                                        <dd className="col-sm-7">{course.departmentID || '—'}</dd>
                                        <dt className="col-sm-5 text-muted">Created</dt>
                                        <dd className="col-sm-7">
                                            {course.createdAt
                                                ? new Date(course.createdAt).toLocaleDateString()
                                                : '—'}
                                        </dd>
                                    </dl>
                                </div>
                                {course.description && (
                                    <div className="col-12">
                                        <dt className="text-muted small text-uppercase mb-1">Description</dt>
                                        <p className="mb-0">{course.description}</p>
                                    </div>
                                )}
                                {course.prerequisitesJSON && (
                                    <div className="col-12">
                                        <dt className="text-muted small text-uppercase mb-1">Prerequisites</dt>
                                        <div className="p-3 bg-light rounded">
                                            <pre className="mb-0" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                                {course.prerequisitesJSON}
                                            </pre>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="card shadow-sm">
                        <div className="card-header bg-light">
                            <strong><i className="bi bi-lightning me-2"></i>Quick Actions</strong>
                        </div>
                        <div className="card-body">
                            <div className="d-flex gap-2 flex-wrap">
                                <button
                                    className="btn btn-outline-primary"
                                    onClick={() => navigate('/assessments')}
                                >
                                    <i className="bi bi-file-earmark-text me-2"></i>View Assessments
                                </button>
                                <button
                                    className="btn btn-outline-primary"
                                    onClick={() => navigate('/contents')}
                                >
                                    <i className="bi bi-collection-play me-2"></i>View Contents
                                </button>
                                {canManage && (
                                    <button
                                        className="btn btn-outline-secondary"
                                        onClick={() => navigate(`/courses/${id}/edit`)}
                                    >
                                        <i className="bi bi-pencil me-2"></i>Edit Course
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
