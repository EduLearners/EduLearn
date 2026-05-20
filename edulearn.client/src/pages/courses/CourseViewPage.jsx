// CourseViewPage.jsx
// Route: /student/courses/:id
// Owner: Vikash
// Student-facing course view. Shows course info, enrolled sections,
// available content, and assessments for the student.

import { useState, useEffect }    from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { courseService }          from '../../services/courseService';
import { enrollmentService }      from '../../services/enrollmentService';
import { assessmentService }      from '../../services/assessmentService';
import { contentService }         from '../../services/contentService';
import { authService }            from '../../services/authService';
import Loading                    from '../../components/Loading';
import ErrorAlert                 from '../../components/ErrorAlert';
import StatusBadge                from '../../components/StatusBadge';
import EmptyState                 from '../../components/shared/EmptyState';

export default function CourseViewPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { userId } = authService.getCurrentUser();

    const [course,      setCourse]      = useState(null);
    const [enrollment,  setEnrollment]  = useState(null);
    const [assessments, setAssessments] = useState([]);
    const [contents,    setContents]    = useState([]);
    const [loading,     setLoading]     = useState(true);
    const [error,       setError]       = useState(null);
    const [activeTab,   setActiveTab]   = useState('overview');

    useEffect(() => { loadAll(); }, [id]);

    const loadAll = async () => {
        try {
            setLoading(true);
            setError(null);

            const courseData = await courseService.getById(id);
            setCourse(courseData);

            const [enrollResult, assessResult, contentResult] = await Promise.allSettled([
                userId ? enrollmentService.getByStudent(userId) : Promise.resolve([]),
                assessmentService.getByCourse(id).catch(() => []),
                contentService.getByCourse ? contentService.getByCourse(id).catch(() => []) : Promise.resolve([]),
            ]);

            if (enrollResult.status === 'fulfilled') {
                const match = (enrollResult.value || []).find(
                    e => String(e.courseID) === String(id) && e.status === 'Enrolled'
                );
                setEnrollment(match || null);
            }

            if (assessResult.status === 'fulfilled') {
                setAssessments((assessResult.value || []).filter(a => a.status === 'Published'));
            }

            if (contentResult.status === 'fulfilled') {
                setContents(contentResult.value || []);
            }

        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <Loading message="Loading course..." />;

    return (
        <div>
            {/* Header */}
            <div className="d-flex align-items-center justify-content-between mb-4">
                <div>
                    <h2 className="text-primary-edulearn mb-1">
                        <i className="bi bi-book me-2"></i>
                        {course?.name ?? 'Course'}
                    </h2>
                    {course && (
                        <p className="text-muted mb-0 small">
                            <code className="me-2">{course.courseCode}</code>
                            {course.credits} credits
                            {course.department && <> &nbsp;·&nbsp; {course.department}</>}
                        </p>
                    )}
                </div>
                <div className="d-flex align-items-center gap-2">
                    {enrollment && (
                        <span className="badge bg-success">
                            <i className="bi bi-check-circle me-1"></i>Enrolled
                        </span>
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

            {course && (
                <>
                    {/* Tab nav */}
                    <ul className="nav nav-tabs mb-4">
                        {[
                            { key: 'overview',     icon: 'bi-info-circle',          label: 'Overview' },
                            { key: 'assessments',  icon: 'bi-file-earmark-check',   label: `Assessments (${assessments.length})` },
                            { key: 'content',      icon: 'bi-collection-play',      label: `Content (${contents.length})` },
                        ].map(tab => (
                            <li key={tab.key} className="nav-item">
                                <button
                                    className={`nav-link ${activeTab === tab.key ? 'active' : ''}`}
                                    onClick={() => setActiveTab(tab.key)}
                                >
                                    <i className={`bi ${tab.icon} me-1`}></i>{tab.label}
                                </button>
                            </li>
                        ))}
                    </ul>

                    {/* Overview tab */}
                    {activeTab === 'overview' && (
                        <div className="row g-4">
                            <div className="col-md-8">
                                <div className="card shadow-sm">
                                    <div className="card-header bg-light">
                                        <strong><i className="bi bi-info-circle me-2"></i>Course Details</strong>
                                    </div>
                                    <div className="card-body">
                                        <dl className="row mb-0">
                                            <dt className="col-sm-4 text-muted">Course Code</dt>
                                            <dd className="col-sm-8"><code>{course.courseCode}</code></dd>

                                            <dt className="col-sm-4 text-muted">Name</dt>
                                            <dd className="col-sm-8 fw-bold">{course.name}</dd>

                                            <dt className="col-sm-4 text-muted">Credits</dt>
                                            <dd className="col-sm-8">{course.credits}</dd>

                                            <dt className="col-sm-4 text-muted">Level</dt>
                                            <dd className="col-sm-8">{course.level ?? '—'}</dd>

                                            <dt className="col-sm-4 text-muted">Department</dt>
                                            <dd className="col-sm-8">{course.department ?? '—'}</dd>

                                            <dt className="col-sm-4 text-muted">Status</dt>
                                            <dd className="col-sm-8"><StatusBadge status={course.status} /></dd>

                                            {course.description && (
                                                <>
                                                    <dt className="col-sm-4 text-muted">Description</dt>
                                                    <dd className="col-sm-8">{course.description}</dd>
                                                </>
                                            )}
                                        </dl>
                                    </div>
                                </div>
                            </div>

                            <div className="col-md-4">
                                <div className="card shadow-sm">
                                    <div className="card-header bg-light">
                                        <strong><i className="bi bi-lightning me-2"></i>Quick Actions</strong>
                                    </div>
                                    <div className="card-body d-grid gap-2">
                                        <button
                                            className="btn btn-outline-primary btn-sm"
                                            onClick={() => setActiveTab('assessments')}
                                        >
                                            <i className="bi bi-file-earmark-check me-2"></i>View Assessments
                                        </button>
                                        <button
                                            className="btn btn-outline-primary btn-sm"
                                            onClick={() => setActiveTab('content')}
                                        >
                                            <i className="bi bi-collection-play me-2"></i>View Content
                                        </button>
                                        <button
                                            className="btn btn-outline-primary btn-sm"
                                            onClick={() => navigate('/discussions')}
                                        >
                                            <i className="bi bi-chat-square-text me-2"></i>Discussions
                                        </button>
                                        <button
                                            className="btn btn-outline-primary btn-sm"
                                            onClick={() => navigate('/student/timetable')}
                                        >
                                            <i className="bi bi-calendar3 me-2"></i>My Timetable
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Assessments tab */}
                    {activeTab === 'assessments' && (
                        <div className="card shadow-sm">
                            <div className="card-header bg-light">
                                <strong>
                                    <i className="bi bi-file-earmark-check me-2"></i>
                                    Published Assessments
                                </strong>
                            </div>
                            {assessments.length === 0 ? (
                                <div className="card-body p-0">
                                    <EmptyState
                                        icon="bi-file-earmark-check"
                                        title="No published assessments"
                                        description="Your instructor has not published any assessments yet."
                                    />
                                </div>
                            ) : (
                                <div className="list-group list-group-flush">
                                    {assessments.map(a => (
                                        <div key={a.assessmentID} className="list-group-item p-3">
                                            <div className="d-flex align-items-center justify-content-between">
                                                <div>
                                                    <div className="d-flex align-items-center gap-2 mb-1">
                                                        <span className="fw-bold">{a.title}</span>
                                                        <span className="badge bg-light text-dark border">{a.type}</span>
                                                    </div>
                                                    <div className="small text-muted">
                                                        <i className="bi bi-star me-1"></i>Max: {a.maxScore ?? '—'}
                                                        {a.dueDate && (
                                                            <>
                                                                <span className="mx-2">·</span>
                                                                <i className="bi bi-calendar me-1"></i>
                                                                Due: {new Date(a.dueDate).toLocaleDateString()}
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                <button
                                                    className="btn btn-primary-edulearn btn-sm"
                                                    onClick={() => navigate(`/student/assessments/${a.assessmentID}`)}
                                                >
                                                    <i className="bi bi-cloud-upload me-1"></i>Submit
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Content tab */}
                    {activeTab === 'content' && (
                        <div className="card shadow-sm">
                            <div className="card-header bg-light">
                                <strong>
                                    <i className="bi bi-collection-play me-2"></i>
                                    Course Content
                                </strong>
                            </div>
                            {contents.length === 0 ? (
                                <div className="card-body p-0">
                                    <EmptyState
                                        icon="bi-collection-play"
                                        title="No content available"
                                        description="Your instructor has not uploaded content for this course yet."
                                    />
                                </div>
                            ) : (
                                <div className="list-group list-group-flush">
                                    {contents.map(c => (
                                        <div key={c.contentID} className="list-group-item p-3">
                                            <div className="d-flex align-items-center gap-3">
                                                <i className="bi bi-file-earmark-text text-primary fs-5"></i>
                                                <div className="flex-grow-1">
                                                    <div className="fw-bold">{c.title}</div>
                                                    <small className="text-muted">{c.type}</small>
                                                </div>
                                                {c.fileURI && (
                                                    <a
                                                        href={c.fileURI}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="btn btn-outline-primary btn-sm"
                                                    >
                                                        <i className="bi bi-download me-1"></i>Open
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
