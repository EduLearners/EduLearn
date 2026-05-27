import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { sectionService } from '../../services/sectionService';
import { authService } from '../../services/authService';
import Loading from '../../components/Loading';
import ErrorAlert from '../../components/ErrorAlert';
import StatusBadge from '../../components/StatusBadge';

export default function SectionDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { role } = authService.getCurrentUser();

    const [section, setSection] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const canManage = ['Registrar', 'DeptAdmin', 'ITAdmin'].includes(role);

    useEffect(() => {
        loadSection();
    }, [id]);

    const loadSection = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await sectionService.getById(id);
            setSection(data);
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    const parseSchedule = (json) => {
        if (!json) return null;
        try { return JSON.parse(json); } catch { return null; }
    };

    return (
        <div>
            {/* Page Header */}
            <div className="d-flex align-items-center justify-content-between mb-4">
                <h2 className="text-primary-edulearn mb-0">
                    <i className="bi bi-collection me-2"></i>Section Detail
                </h2>
                <button
                    className="btn btn-outline-secondary"
                    onClick={() => navigate('/sections')}
                >
                    <i className="bi bi-arrow-left me-1"></i>Back
                </button>
            </div>

            <ErrorAlert error={error} onDismiss={() => setError(null)} />
            {loading && <Loading message="Loading section..." />}

            {!loading && section && (
                <>
                    {/* Section Info Card */}
                    <div className="card shadow-sm mb-4">
                        <div className="card-header bg-primary-edulearn text-white">
                            <div className="d-flex align-items-center justify-content-between">
                                <strong>
                                    <i className="bi bi-info-circle me-2"></i>
                                    Section Information
                                </strong>
                                <StatusBadge status={section.status} />
                            </div>
                        </div>
                        <div className="card-body">
                            <div className="row g-4">
                                <div className="col-md-6">
                                    <dl className="row mb-0">
                                        <dt className="col-sm-5 text-muted">Section ID</dt>
                                        <dd className="col-sm-7">
                                            <code>#{section.sectionID}</code>
                                        </dd>

                                        <dt className="col-sm-5 text-muted">Course</dt>
                                        <dd className="col-sm-7 fw-bold">
                                            {section.courseName || section.courseID}
                                        </dd>

                                        <dt className="col-sm-5 text-muted">Term</dt>
                                        <dd className="col-sm-7">{section.term}</dd>

                                        <dt className="col-sm-5 text-muted">Instructor</dt>
                                        <dd className="col-sm-7">
                                            {section.instructorName || `#${section.instructorID}`}
                                        </dd>
                                    </dl>
                                </div>

                                <div className="col-md-6">
                                    <dl className="row mb-0">
                                        <dt className="col-sm-5 text-muted">Capacity</dt>
                                        <dd className="col-sm-7">
                                            <span className={
                                                section.enrolledCount >= section.capacity
                                                    ? 'text-danger fw-bold'
                                                    : ''
                                            }>
                                                {section.enrolledCount} / {section.capacity}
                                            </span>
                                            {section.enrolledCount >= section.capacity && (
                                                <span className="badge bg-danger ms-2">Full</span>
                                            )}
                                        </dd>

                                        <dt className="col-sm-5 text-muted">Room</dt>
                                        <dd className="col-sm-7">
                                            {section.roomID
                                                ? <code>#{section.roomID}</code>
                                                : <span className="text-muted">Not assigned</span>}
                                        </dd>

                                        <dt className="col-sm-5 text-muted">Status</dt>
                                        <dd className="col-sm-7">
                                            <StatusBadge status={section.status} />
                                        </dd>
                                    </dl>
                                </div>

                                {/* Schedule */}
                                {section.scheduleJSON && (() => {
                                    const sched = parseSchedule(section.scheduleJSON);
                                    return sched ? (
                                        <div className="col-12">
                                            <dt className="text-muted small text-uppercase mb-2">
                                                Schedule
                                            </dt>
                                            <div className="d-flex gap-3">
                                                <span className="badge bg-light text-dark fs-6">
                                                    <i className="bi bi-calendar3 me-2"></i>
                                                    {sched.days}
                                                </span>
                                                {sched.time && (
                                                    <span className="badge bg-light text-dark fs-6">
                                                        <i className="bi bi-clock me-2"></i>
                                                        {sched.time}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ) : null;
                                })()}
                            </div>
                        </div>
                    </div>

                    {/* Enrollment Stats Card */}
                    <div className="card shadow-sm mb-4">
                        <div className="card-header bg-light">
                            <strong>
                                <i className="bi bi-people me-2"></i>
                                Enrollment
                            </strong>
                        </div>
                        <div className="card-body">
                            <div className="row g-3 text-center">
                                <div className="col-md-4">
                                    <div className="p-3 bg-light rounded">
                                        <div className="fs-3 fw-bold text-primary">
                                            {section.enrolledCount}
                                        </div>
                                        <div className="text-muted small">Enrolled</div>
                                    </div>
                                </div>
                                <div className="col-md-4">
                                    <div className="p-3 bg-light rounded">
                                        <div className="fs-3 fw-bold text-success">
                                            {Math.max(0, section.capacity - section.enrolledCount)}
                                        </div>
                                        <div className="text-muted small">Available Seats</div>
                                    </div>
                                </div>
                                <div className="col-md-4">
                                    <div className="p-3 bg-light rounded">
                                        <div className="fs-3 fw-bold text-secondary">
                                            {section.capacity}
                                        </div>
                                        <div className="text-muted small">Total Capacity</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="card shadow-sm">
                        <div className="card-header bg-light">
                            <strong>
                                <i className="bi bi-lightning me-2"></i>
                                Quick Actions
                            </strong>
                        </div>
                        <div className="card-body">
                            <div className="d-flex gap-2 flex-wrap">
                                <button
                                    className="btn btn-outline-primary"
                                    onClick={() => navigate('/enrollment')}
                                >
                                    <i className="bi bi-card-checklist me-2"></i>
                                    View Enrollment
                                </button>
                                <button
                                    className="btn btn-outline-primary"
                                    onClick={() => navigate('/timetable')}
                                >
                                    <i className="bi bi-calendar3 me-2"></i>
                                    View Timetable
                                </button>
                                <button
                                    className="btn btn-outline-primary"
                                    onClick={() => navigate('/assessments')}
                                >
                                    <i className="bi bi-file-earmark-check me-2"></i>
                                    View Assessments
                                </button>
                                <button
                                    className="btn btn-outline-secondary"
                                    onClick={() => navigate('/sections')}
                                >
                                    <i className="bi bi-collection me-2"></i>
                                    All Sections
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}