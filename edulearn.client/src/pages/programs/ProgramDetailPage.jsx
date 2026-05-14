import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { programService } from '../../services/programService';
import { authService } from '../../services/authService';
import Loading from '../../components/Loading';
import ErrorAlert from '../../components/ErrorAlert';
import StatusBadge from '../../components/StatusBadge';

export default function ProgramDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { role } = authService.getCurrentUser();

    const [program, setProgram] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const canManage = ['DeptAdmin', 'ITAdmin'].includes(role);

    useEffect(() => {
        loadProgram();
    }, [id]);

    const loadProgram = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await programService.getById(id);
            setProgram(data);
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    // Safely parse JSON fields
    const requiredCourses = (() => {
        if (!program?.requiredCoursesJSON) return [];
        try { return JSON.parse(program.requiredCoursesJSON); } catch { return []; }
    })();

    const electives = (() => {
        if (!program?.electivesJSON) return [];
        try { return JSON.parse(program.electivesJSON); } catch { return []; }
    })();

    return (
        <div>
            {/* Page Header */}
            <div className="d-flex align-items-center justify-content-between mb-4">
                <h2 className="text-primary-edulearn mb-0">
                    <i className="bi bi-mortarboard me-2"></i>Program Detail
                </h2>
                <div className="d-flex gap-2">
                    {canManage && program && (
                        <button
                            className="btn btn-outline-secondary"
                            onClick={() => navigate(`/programs/${id}/edit`)}
                        >
                            <i className="bi bi-pencil me-2"></i>Edit
                        </button>
                    )}
                    <button
                        className="btn btn-outline-secondary"
                        onClick={() => navigate('/programs')}
                    >
                        <i className="bi bi-arrow-left me-1"></i>Back
                    </button>
                </div>
            </div>

            <ErrorAlert error={error} onDismiss={() => setError(null)} />
            {loading && <Loading message="Loading program..." />}

            {!loading && program && (
                <>
                    {/* Program Info Card */}
                    <div className="card shadow-sm mb-4">
                        <div className="card-header bg-primary-edulearn text-white">
                            <div className="d-flex align-items-center justify-content-between">
                                <strong>
                                    <i className="bi bi-info-circle me-2"></i>
                                    Program Information
                                </strong>
                                <StatusBadge status={program.status} />
                            </div>
                        </div>
                        <div className="card-body">
                            <div className="row g-4">
                                <div className="col-md-6">
                                    <dl className="row mb-0">
                                        <dt className="col-sm-5 text-muted">Program ID</dt>
                                        <dd className="col-sm-7">
                                            <code>#{program.programID}</code>
                                        </dd>

                                        <dt className="col-sm-5 text-muted">Name</dt>
                                        <dd className="col-sm-7 fw-bold">{program.name}</dd>

                                        <dt className="col-sm-5 text-muted">Degree Type</dt>
                                        <dd className="col-sm-7">
                                            <span className="badge bg-secondary">
                                                {program.degreeType}
                                            </span>
                                        </dd>
                                    </dl>
                                </div>
                                <div className="col-md-6">
                                    <dl className="row mb-0">
                                        <dt className="col-sm-5 text-muted">Duration</dt>
                                        <dd className="col-sm-7">
                                            {program.durationTerms} terms
                                        </dd>

                                        <dt className="col-sm-5 text-muted">Department ID</dt>
                                        <dd className="col-sm-7">
                                            {program.departmentID || '—'}
                                        </dd>

                                        <dt className="col-sm-5 text-muted">Status</dt>
                                        <dd className="col-sm-7">
                                            <StatusBadge status={program.status} />
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Required Courses Card */}
                    <div className="card shadow-sm mb-4">
                        <div className="card-header bg-light">
                            <strong>
                                <i className="bi bi-book me-2"></i>
                                Required Courses
                            </strong>
                        </div>
                        <div className="card-body">
                            {requiredCourses.length === 0 ? (
                                <p className="text-muted mb-0">
                                    <i className="bi bi-info-circle me-2"></i>
                                    No required courses defined yet.
                                </p>
                            ) : (
                                <div className="d-flex flex-wrap gap-2">
                                    {requiredCourses.map((c, idx) => (
                                        <span key={idx} className="badge bg-primary-edulearn fs-6">
                                            {typeof c === 'string' ? c : JSON.stringify(c)}
                                        </span>
                                    ))}
                                </div>
                            )}
                            {program.requiredCoursesJSON && requiredCourses.length === 0 && (
                                <div className="p-3 bg-light rounded mt-2">
                                    <pre className="mb-0 small" style={{ whiteSpace: 'pre-wrap' }}>
                                        {program.requiredCoursesJSON}
                                    </pre>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Electives Card */}
                    <div className="card shadow-sm mb-4">
                        <div className="card-header bg-light">
                            <strong>
                                <i className="bi bi-collection me-2"></i>
                                Electives
                            </strong>
                        </div>
                        <div className="card-body">
                            {electives.length === 0 ? (
                                <p className="text-muted mb-0">
                                    <i className="bi bi-info-circle me-2"></i>
                                    No electives defined yet.
                                </p>
                            ) : (
                                <div className="d-flex flex-wrap gap-2">
                                    {electives.map((e, idx) => (
                                        <span key={idx} className="badge bg-secondary fs-6">
                                            {typeof e === 'string' ? e : JSON.stringify(e)}
                                        </span>
                                    ))}
                                </div>
                            )}
                            {program.electivesJSON && electives.length === 0 && (
                                <div className="p-3 bg-light rounded mt-2">
                                    <pre className="mb-0 small" style={{ whiteSpace: 'pre-wrap' }}>
                                        {program.electivesJSON}
                                    </pre>
                                </div>
                            )}
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
                                    onClick={() => navigate('/courses')}
                                >
                                    <i className="bi bi-book me-2"></i>View Courses
                                </button>
                                <button
                                    className="btn btn-outline-primary"
                                    onClick={() => navigate('/students')}
                                >
                                    <i className="bi bi-people me-2"></i>View Students
                                </button>
                                {canManage && (
                                    <button
                                        className="btn btn-outline-secondary"
                                        onClick={() => navigate(`/programs/${id}/edit`)}
                                    >
                                        <i className="bi bi-pencil me-2"></i>Edit Program
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