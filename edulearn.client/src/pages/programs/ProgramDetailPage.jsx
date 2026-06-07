import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { programService } from '../../services/programService';
import { courseService } from '../../services/courseService';
import { authService } from '../../services/authService';
import Loading from '../../components/Loading';
import ErrorAlert from '../../components/ErrorAlert';
import StatusBadge from '../../components/StatusBadge';

export default function ProgramDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { role } = authService.getCurrentUser();

    const [program, setProgram] = useState(null);
    const [requiredCourses, setRequiredCourses] = useState([]);
    const [electiveCourses, setElectiveCourses] = useState([]);
    const [loadingCourses, setLoadingCourses] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const canManage = ['DeptAdmin', 'ITAdmin'].includes(role);
    const isStudent = role === 'Student';

    useEffect(() => { loadProgram(); }, [id]);

    const loadProgram = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await programService.getById(id);
            setProgram(data);
            await loadCourses(data);
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    // Parse JSON → extract courseIds → fetch full course objects
    const loadCourses = async (prog) => {
        setLoadingCourses(true);
        try {
            // Parse required courses
            const requiredIds = parseIds(prog.requiredCoursesJSON);
            const electiveIds = parseIds(prog.electivesJSON);

            // Fetch all at once
            const allIds = [...new Set([...requiredIds, ...electiveIds])];
            if (allIds.length === 0) return;

            const results = await Promise.allSettled(
                allIds.map(cid => courseService.getById(cid).catch(() => null))
            );
            const courseMap = {};
            results.forEach((r, idx) => {
                if (r.status === 'fulfilled' && r.value) {
                    courseMap[allIds[idx]] = r.value;
                }
            });

            setRequiredCourses(requiredIds.map(cid => courseMap[cid]).filter(Boolean));
            setElectiveCourses(electiveIds.map(cid => courseMap[cid]).filter(Boolean));
        } catch {
            // Non-fatal — show empty state
        } finally {
            setLoadingCourses(false);
        }
    };

    // Supports both formats:
    //   [{"courseId": 1, "courseCode": "CS101"}]   ← our seeded format
    //   [1, 2, 3]                                   ← raw IDs
    const parseIds = (json) => {
        if (!json) return [];
        try {
            const parsed = JSON.parse(json);
            if (!Array.isArray(parsed)) return [];
            return parsed.map(item => {
                if (typeof item === 'number') return item;
                if (typeof item === 'object' && item !== null) {
                    return item.courseId ?? item.courseID ?? item.id ?? null;
                }
                return null;
            }).filter(id => id !== null);
        } catch {
            return [];
        }
    };

    // Reusable course table
    const CourseTable = ({ courses, emptyText }) => {
        if (loadingCourses) {
            return (
                <div className="d-flex align-items-center gap-2 text-muted py-2">
                    <span className="spinner-border spinner-border-sm"></span>
                    <small>Loading courses...</small>
                </div>
            );
        }
        if (courses.length === 0) {
            return (
                <div className="text-muted py-2">
                    <i className="bi bi-info-circle me-2"></i>{emptyText}
                </div>
            );
        }
        return (
            <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                        <tr>
                            <th>Code</th>
                            <th>Title</th>
                            <th className="text-center">Credits</th>
                            <th className="text-center">Level</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {courses.map(c => (
                            <tr
                                key={c.courseID}
                                style={{ cursor: 'pointer' }}
                                onClick={() => navigate(`/courses/${c.courseID}`)}
                                title="Click to view course details"
                            >
                                <td>
                                    <code>{c.code}</code>
                                </td>
                                <td className="fw-bold">{c.title}</td>
                                <td className="text-center">{c.credits}</td>
                                <td className="text-center">
                                    <span className="badge bg-secondary">{c.level}</span>
                                </td>
                                <td><StatusBadge status={c.status} /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="px-3 py-2 bg-light border-top small text-muted">
                    {courses.length} course{courses.length !== 1 ? 's' : ''}
                    · Total credits: <strong>{courses.reduce((s, c) => s + (c.credits || 0), 0)}</strong>
                </div>
            </div>
        );
    };

    return (
        <div>
            {/* Header */}
            <div className="d-flex align-items-center justify-content-between mb-4">
                <h2 className="text-primary-edulearn mb-0">
                    <i className="bi bi-mortarboard me-2"></i>Program Detail
                </h2>
                <div className="d-flex gap-2">
                    {canManage && program && (
                        <button className="btn btn-outline-secondary" onClick={() => navigate(`/programs/${id}/edit`)}>
                            <i className="bi bi-pencil me-2"></i>Edit
                        </button>
                    )}
                    <button className="btn btn-outline-secondary" onClick={() => navigate('/programs')}>
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
                                    <i className="bi bi-info-circle me-2"></i>Program Information
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
                                            <code>{program.programID}</code>
                                        </dd>

                                        <dt className="col-sm-5 text-muted">Name</dt>
                                        <dd className="col-sm-7 fw-bold">{program.name}</dd>

                                        <dt className="col-sm-5 text-muted">Degree Type</dt>
                                        <dd className="col-sm-7">
                                            <span className="badge bg-secondary">{program.degreeType}</span>
                                        </dd>
                                    </dl>
                                </div>
                                <div className="col-md-6">
                                    <dl className="row mb-0">
                                        <dt className="col-sm-5 text-muted">Duration</dt>
                                        <dd className="col-sm-7">{program.durationTerms} terms</dd>

                                        <dt className="col-sm-5 text-muted">Department</dt>
                                        <dd className="col-sm-7">{program.departmentID || '—'}</dd>

                                        <dt className="col-sm-5 text-muted">Status</dt>
                                        <dd className="col-sm-7">
                                            <StatusBadge status={program.status} />
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Required Courses */}
                    <div className="card shadow-sm mb-4">
                        <div className="card-header bg-light d-flex align-items-center justify-content-between">
                            <strong>
                                <i className="bi bi-book me-2"></i>
                                Required Courses
                                {requiredCourses.length > 0 && (
                                    <span className="badge bg-primary ms-2">{requiredCourses.length}</span>
                                )}
                            </strong>
                            {canManage && (
                                <button
                                    className="btn btn-sm btn-outline-primary"
                                    onClick={() => navigate(`/programs/${id}/edit`)}
                                >
                                    <i className="bi bi-pencil me-1"></i>Manage Courses
                                </button>
                            )}
                        </div>
                        <CourseTable
                            courses={requiredCourses}
                            emptyText="No required courses defined yet. Click 'Manage Courses' to assign them."
                        />
                    </div>

                    {/* Elective Courses */}
                    <div className="card shadow-sm mb-4">
                        <div className="card-header bg-light d-flex align-items-center justify-content-between">
                            <strong>
                                <i className="bi bi-collection me-2"></i>
                                Elective Courses
                                {electiveCourses.length > 0 && (
                                    <span className="badge bg-secondary ms-2">{electiveCourses.length}</span>
                                )}
                            </strong>
                        </div>
                        <CourseTable
                            courses={electiveCourses}
                            emptyText="No elective courses defined yet."
                        />
                    </div>

                    {/* Quick Actions */}
                    <div className="card shadow-sm">
                        <div className="card-header bg-light">
                            <strong><i className="bi bi-lightning me-2"></i>Quick Actions</strong>
                        </div>
                        <div className="card-body">
                            <div className="d-flex gap-2 flex-wrap">
                                <button className="btn btn-outline-primary" onClick={() => navigate('/courses')}>
                                    <i className="bi bi-book me-2"></i>All Courses
                                </button>
                                {!isStudent && (
                                    <button className="btn btn-outline-primary" onClick={() => navigate(`/students?programId=${id}`)  }>
                                        <i className="bi bi-people me-2"></i>Students in this Program
                                    </button>
                                )}
                                {canManage && (
                                    <button className="btn btn-outline-secondary" onClick={() => navigate(`/programs/${id}/edit`)}>
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
