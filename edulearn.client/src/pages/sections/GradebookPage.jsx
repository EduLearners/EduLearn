// GradebookPage.jsx
// Route: /teaching/sections/:id/gradebook
// Owner: Vikash (CCM + LMS + AGI module)
// Shows all enrollments for a section with their grades across all assessments.
// Instructor can navigate to grade individual submissions from here.

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { sectionService }    from '../../services/sectionService';
import { enrollmentService } from '../../services/enrollmentService';
import { assessmentService } from '../../services/assessmentService';
import { submissionService } from '../../services/submissionService';
import { authService }       from '../../services/authService';
import Loading               from '../../components/Loading';
import ErrorAlert            from '../../components/ErrorAlert';
import StatusBadge           from '../../components/StatusBadge';
import EmptyState            from '../../components/shared/EmptyState';

export default function GradebookPage() {
    const { id } = useParams();   // sectionID
    const navigate = useNavigate();
    const { role } = authService.getCurrentUser();

    const [section,     setSection]     = useState(null);
    const [enrollments, setEnrollments] = useState([]);
    const [assessments, setAssessments] = useState([]);
    const [submissionMap, setSubmissionMap] = useState({}); // { studentID_assessmentID: submission }
    const [loading,  setLoading]  = useState(true);
    const [error,    setError]    = useState(null);

    const canGrade = ['Instructor', 'ITAdmin'].includes(role);

    useEffect(() => { loadAll(); }, [id]);

    const loadAll = async () => {
        try {
            setLoading(true);
            setError(null);

            const [sec, enrolls, assess] = await Promise.all([
                sectionService.getById(id),
                enrollmentService.getBySection(id),
                assessmentService.getBySection(id).catch(() => []),
            ]);

            setSection(sec);

            const activeEnrolls = (enrolls || []).filter(e =>
                ['Enrolled', 'Completed'].includes(e.status)
            );
            setEnrollments(activeEnrolls);
            setAssessments(assess || []);

            // Load all submissions for each assessment in this section
            const map = {};
            await Promise.allSettled(
                (assess || []).map(async (a) => {
                    try {
                        const subs = await submissionService.getByAssessment(a.assessmentID);
                        (subs || []).forEach(sub => {
                            map[`${sub.studentID}_${a.assessmentID}`] = sub;
                        });
                    } catch { /* skip */ }
                })
            );
            setSubmissionMap(map);

        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    const getSubmission = (studentId, assessmentId) =>
        submissionMap[`${studentId}_${assessmentId}`] || null;

    const getScoreDisplay = (sub, assessment) => {
        if (!sub) return <span className="text-muted small">—</span>;
        if (sub.status === 'Graded' || sub.score != null) {
            return (
                <span className="fw-bold font-monospace" style={{ color: 'var(--color-success)' }}>
                    {sub.score} / {assessment.maxScore ?? '?'}
                </span>
            );
        }
        return <StatusBadge status={sub.status} />;
    };

    if (loading) return <Loading message="Loading gradebook..." />;

    return (
        <div>
            {/* Header */}
            <div className="d-flex align-items-center justify-content-between mb-4">
                <div>
                    <h2 className="text-primary-edulearn mb-1">
                        <i className="bi bi-table me-2"></i>Gradebook
                    </h2>
                    {section && (
                        <p className="text-muted mb-0 small">
                            {section.courseName} &nbsp;·&nbsp; {section.term} &nbsp;·&nbsp;
                            Instructor: {section.instructorName}
                        </p>
                    )}
                </div>
                <button
                    className="btn btn-outline-secondary"
                    onClick={() => navigate(`/sections/${id}`)}
                >
                    <i className="bi bi-arrow-left me-1"></i>Back to Section
                </button>
            </div>

            <ErrorAlert error={error} onDismiss={() => setError(null)} />

            {/* Summary strip */}
            {section && (
                <div className="row g-3 mb-4">
                    {[
                        { label: 'Enrolled Students', value: enrollments.length, color: 'var(--primary)' },
                        { label: 'Assessments',        value: assessments.length, color: 'var(--accent)' },
                        { label: 'Capacity',           value: `${section.enrolledCount}/${section.capacity}`, color: 'var(--color-success)' },
                    ].map(s => (
                        <div key={s.label} className="col-md-3 col-sm-6">
                            <div className="card shadow-sm border-0 bg-light">
                                <div className="card-body py-3">
                                    <div className="text-muted small text-uppercase mb-1">{s.label}</div>
                                    <div className="fs-3 fw-bold font-monospace" style={{ color: s.color }}>
                                        {s.value}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Gradebook table */}
            <div className="card shadow-sm">
                <div className="card-header bg-light d-flex align-items-center justify-content-between">
                    <strong>
                        <i className="bi bi-table me-2"></i>
                        Student Grades
                    </strong>
                    {canGrade && (
                        <button
                            className="btn btn-primary-edulearn btn-sm"
                            onClick={() => navigate(`/teaching/sections/${id}/assessments`)}
                        >
                            <i className="bi bi-plus me-1"></i>Manage Assessments
                        </button>
                    )}
                </div>

                {enrollments.length === 0 ? (
                    <div className="card-body p-0">
                        <EmptyState
                            icon="bi-people"
                            title="No enrolled students"
                            description="Students will appear here once they enroll in this section."
                        />
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0 small">
                            <thead className="table-light">
                                <tr>
                                    <th style={{ minWidth: 180 }}>Student</th>
                                    <th>Status</th>
                                    {assessments.map(a => (
                                        <th key={a.assessmentID} style={{ minWidth: 130 }}>
                                            <div className="fw-bold">{a.title}</div>
                                            <div className="text-muted fw-normal" style={{ fontSize: '0.7rem' }}>
                                                Max: {a.maxScore ?? '?'} · {a.type}
                                            </div>
                                        </th>
                                    ))}
                                    {assessments.length === 0 && (
                                        <th className="text-muted">No assessments yet</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {enrollments.map(enr => (
                                    <tr key={enr.enrollmentID}>
                                        <td>
                                            <div className="fw-bold">
                                                {enr.studentName || `Student ${enr.studentID}`}
                                            </div>
                                            <small className="text-muted font-monospace">
                                                {enr.studentID}
                                            </small>
                                        </td>
                                        <td><StatusBadge status={enr.status} /></td>
                                        {assessments.map(a => {
                                            const sub = getSubmission(enr.studentID, a.assessmentID);
                                            return (
                                                <td key={a.assessmentID}>
                                                    <div className="d-flex align-items-center gap-2">
                                                        {getScoreDisplay(sub, a)}
                                                        {canGrade && sub && sub.status === 'Submitted' && (
                                                            <button
                                                                className="btn btn-warning btn-sm py-0 px-1"
                                                                style={{ fontSize: '0.7rem' }}
                                                                onClick={() => navigate(`/submissions/${sub.submissionID}/grade`)}
                                                                title="Grade this submission"
                                                            >
                                                                <i className="bi bi-star"></i>
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            );
                                        })}
                                        {assessments.length === 0 && <td className="text-muted">—</td>}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
