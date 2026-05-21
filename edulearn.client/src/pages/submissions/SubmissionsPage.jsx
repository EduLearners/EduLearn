import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { submissionService } from '../../services/submissionService';
import { sectionService } from '../../services/sectionService';
import { authService } from '../../services/authService';
import { SubmissionStatus } from '../../models/Assessment';
import Loading from '../../components/Loading';
import ErrorAlert from '../../components/ErrorAlert';
import StatusBadge from '../../components/StatusBadge';
import axiosClient from '../../api/axiosClient';

export default function SubmissionsPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { role, userId } = authService.getCurrentUser();

    const presetSectionId = searchParams.get('sectionId');

    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filterStatus, setFilterStatus] = useState('');
    const [search, setSearch] = useState('');
    const [contextLabel, setContextLabel] = useState('');

    const canManage = ['Instructor', 'ITAdmin'].includes(role);
    const isStudent = role === 'Student';
    const isInstructor = role === 'Instructor';

    useEffect(() => { loadSubmissions(); }, [presetSectionId]);

    const loadSubmissions = async () => {
        try {
            setLoading(true);
            setError(null);
            let data = [];

            if (isStudent) {
                // Student: only their own submissions
                const studentRecord = await axiosClient.get('/students/me').then(r => r.data);
                data = await submissionService.getByStudent(studentRecord.studentID);
                setContextLabel('My Submissions');
            } else if (isInstructor && userId) {
                // Instructor: submissions for their sections only
                const mySections = await sectionService.getByInstructor(userId).catch(() => []);

                // If a specific section was passed from dashboard, filter to that section
                const targetSections = presetSectionId
                    ? (mySections || []).filter(s => String(s.sectionID) === presetSectionId)
                    : (mySections || []);

                if (presetSectionId && targetSections.length > 0) {
                    const sec = targetSections[0];
                    setContextLabel(`Section #${sec.sectionID} — ${sec.courseName}`);
                } else {
                    setContextLabel('My Sections');
                }

                const courseIds = [...new Set(targetSections.map(s => s.courseID))];
                const sectionIds = new Set(targetSections.map(s => s.sectionID));

                const assessmentResults = await Promise.allSettled(
                    courseIds.map(cid =>
                        axiosClient.get(`/assessments/course/${cid}`).then(r => r.data).catch(() => [])
                    )
                );
                const allAssessments = assessmentResults
                    .filter(r => r.status === 'fulfilled')
                    .flatMap(r => r.value || [])
                    .filter(a => !a.sectionID || sectionIds.has(a.sectionID));

                const subResults = await Promise.allSettled(
                    allAssessments.map(a => submissionService.getByAssessment(a.assessmentID).catch(() => []))
                );
                data = subResults.filter(r => r.status === 'fulfilled').flatMap(r => r.value || []);
            } else {
                // Registrar / ITAdmin: all submissions
                setContextLabel('All Submissions');
                const { data: courses } = await axiosClient.get('/courses');
                const assessmentResults = await Promise.allSettled(
                    courses.map(c =>
                        axiosClient.get(`/assessments/course/${c.courseID}`).then(r => r.data).catch(() => [])
                    )
                );
                const allAssessments = assessmentResults
                    .filter(r => r.status === 'fulfilled')
                    .flatMap(r => r.value);
                const subResults = await Promise.allSettled(
                    allAssessments.map(a => submissionService.getByAssessment(a.assessmentID).catch(() => []))
                );
                data = subResults.filter(r => r.status === 'fulfilled').flatMap(r => r.value);
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
              String(s.studentID).includes(search) ||
              s.assessmentTitle?.toLowerCase().includes(search.toLowerCase()) ||
              s.studentName?.toLowerCase().includes(search.toLowerCase())
            : true;
        return matchStatus && matchSearch;
    });

    return (
        <div>
            <div className="d-flex align-items-center justify-content-between mb-4">
                <div>
                    <h2 className="text-primary-edulearn mb-0">
                        <i className="bi bi-cloud-upload me-2"></i>
                        {isStudent ? 'My Submissions' : 'Submissions'}
                    </h2>
                    {contextLabel && !isStudent && (
                        <small className="text-muted">
                            <i className="bi bi-funnel me-1"></i>{contextLabel}
                            {presetSectionId && (
                                <button className="btn btn-link btn-sm p-0 ms-2" onClick={() => navigate('/submissions')}>
                                    <i className="bi bi-x"></i> Clear filter
                                </button>
                            )}
                        </small>
                    )}
                </div>
            </div>

            <div className="card shadow-sm mb-4">
                <div className="card-body">
                    <div className="row g-3">
                        <div className="col-md-7">
                            <div className="input-group">
                                <span className="input-group-text"><i className="bi bi-search"></i></span>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder={isStudent ? 'Search by assessment...' : 'Search by assessment or student...'}
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="col-md-4">
                            <select className="form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                                <option value="">All Statuses</option>
                                {Object.values(SubmissionStatus).map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-md-1">
                            <button className="btn btn-outline-secondary w-100" onClick={() => { setSearch(''); setFilterStatus(''); }} title="Clear filters">
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <ErrorAlert error={error} onDismiss={() => setError(null)} />
            {loading && <Loading message="Loading submissions..." />}

            {!loading && !error && filtered.length === 0 && (
                <div className="text-center py-5 text-muted">
                    <i className="bi bi-inbox display-4 d-block mb-3"></i>
                    <p className="mb-1">No submissions found.</p>
                    {isStudent && (
                        <button className="btn btn-primary-edulearn mt-2" onClick={() => navigate('/assessments')}>
                            <i className="bi bi-file-earmark-text me-2"></i>Browse Assessments
                        </button>
                    )}
                </div>
            )}

            {!loading && filtered.length > 0 && (
                <div className="card shadow-sm">
                    <div className="card-header bg-light d-flex align-items-center justify-content-between">
                        <strong><i className="bi bi-table me-2"></i>Submissions</strong>
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
                                            <button className="btn btn-link p-0 text-decoration-none" onClick={() => navigate(`/assessments/${sub.assessmentID}`)}>
                                                {sub.assessmentTitle || `#${sub.assessmentID}`}
                                            </button>
                                        </td>
                                        {!isStudent && <td>{sub.studentName || `#${sub.studentID}`}</td>}
                                        <td>{sub.submittedAt ? new Date(sub.submittedAt).toLocaleString() : '—'}</td>
                                        <td><StatusBadge status={sub.status} /></td>
                                        <td>{sub.score != null ? `${sub.score} / ${sub.maxScore}` : '—'}</td>
                                        <td>
                                            <div className="d-flex gap-2">
                                                {canManage && sub.status === 'Submitted' && (
                                                    <button className="btn btn-sm btn-outline-success" onClick={() => navigate(`/submissions/${sub.submissionID}/grade`)} title="Grade">
                                                        <i className="bi bi-star me-1"></i>Grade
                                                    </button>
                                                )}
                                                {canManage && sub.status === 'Graded' && (
                                                    <button className="btn btn-sm btn-outline-secondary" onClick={() => navigate(`/submissions/${sub.submissionID}/grade`)} title="Update Grade">
                                                        <i className="bi bi-pencil me-1"></i>Update
                                                    </button>
                                                )}
                                                <button className="btn btn-sm btn-outline-primary" onClick={() => navigate(`/assessments/${sub.assessmentID}`)} title="View Assessment">
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
