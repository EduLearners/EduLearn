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
    const [prereqCourses, setPrereqCourses] = useState([]);
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
            // Resolve prerequisite IDs to course names
            if (data.prerequisitesJSON) {
                try {
                    const parsed = JSON.parse(data.prerequisitesJSON);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        const ids = parsed.map(item =>
                            typeof item === 'number' ? item
                            : typeof item === 'object' ? (item.courseId ?? item.courseID ?? null)
                            : null
                        ).filter(Boolean);
                        const results = await Promise.allSettled(ids.map(cid => courseService.getById(cid).catch(() => null)));
                        const resolved = results
                            .filter(r => r.status === 'fulfilled' && r.value)
                            .map(r => r.value);
                        setPrereqCourses(resolved);
                    }
                } catch { /* malformed JSON — show nothing */ }
            }
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
                                        <div className="d-flex gap-2 flex-wrap mt-1">
                                            {prereqCourses.length > 0
                                                ? prereqCourses.map(c => (
                                                    <span
                                                        key={c.courseID}
                                                        className="badge bg-light text-dark border"
                                                        style={{ cursor: 'pointer', fontSize: 13, padding: '6px 10px' }}
                                                        onClick={() => navigate(`/courses/${c.courseID}`)}
                                                        title="Click to view course"
                                                    >
                                                        <i className="bi bi-book me-1"></i>
                                                        {c.code} — {c.title}
                                                    </span>
                                                ))
                                                : <span className="text-muted small">None assigned</span>
                                            }
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
                                    onClick={() => navigate(`/assessments?courseId=${id}`)}
                                >
                                    <i className="bi bi-file-earmark-text me-2"></i>View Assessments
                                </button>
                                <button
                                    className="btn btn-outline-primary"
                                    onClick={() => navigate(`/contents?courseId=${id}`)}
                                >
                                    <i className="bi bi-collection-play me-2"></i>View Contents
                                </button>
                                <button
                                    className="btn btn-outline-primary"
                                    onClick={() => navigate(`/discussions?courseId=${id}`)}
                                >
                                    <i className="bi bi-chat-square-text me-2"></i>Discussions
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
