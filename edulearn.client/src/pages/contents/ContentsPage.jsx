import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { contentService } from '../../services/contentService';
import { sectionService } from '../../services/sectionService';
import { enrollmentService } from '../../services/enrollmentService';
import { courseService } from '../../services/courseService';
import { authService } from '../../services/authService';
import { ContentType, ContentStatus } from '../../models/Content';
import Loading from '../../components/Loading';
import ErrorAlert from '../../components/ErrorAlert';
import StatusBadge from '../../components/StatusBadge';
import axiosClient from '../../api/axiosClient';

export default function ContentsPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { role, userId } = authService.getCurrentUser();

    const presetCourseId = searchParams.get('courseId');

    const [contents, setContents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [contextLabel, setContextLabel] = useState('');

    const canManage = ['Instructor', 'ITAdmin'].includes(role);
    const isStudent = role === 'Student';
    const isInstructor = role === 'Instructor';

    useEffect(() => { loadContents(); }, [presetCourseId]);

    const loadContents = async () => {
        try {
            setLoading(true);
            setError(null);

            let courseIds = [];

            if (presetCourseId) {
                courseIds = [parseInt(presetCourseId, 10)];
                const courses = await courseService.getAll().catch(() => []);
                const course = (courses || []).find(c => c.courseID === parseInt(presetCourseId, 10));
                setContextLabel(course ? `${course.code} — ${course.title}` : `Course #${presetCourseId}`);
            } else if (isInstructor && userId) {
                const mySections = await sectionService.getByInstructor(userId).catch(() => []);
                courseIds = [...new Set((mySections || []).map(s => s.courseID))];
                setContextLabel('My Courses');
            } else if (isStudent) {
                const studentRecord = await axiosClient.get('/students/me').then(r => r.data).catch(() => null);
                if (studentRecord?.studentID) {
                    const enrollments = await enrollmentService.getByStudent(studentRecord.studentID).catch(() => []);
                    courseIds = [...new Set(
                        (enrollments || []).filter(e => e.status === 'Enrolled').map(e => e.courseID).filter(Boolean)
                    )];
                }
                setContextLabel('My Enrolled Courses');
            } else {
                const courses = await courseService.getAll().catch(() => []);
                courseIds = (courses || []).map(c => c.courseID);
                setContextLabel('All Courses');
            }

            const results = await Promise.allSettled(
                courseIds.map(cid => contentService.getByCourse(cid).catch(() => []))
            );
            let all = results.filter(r => r.status === 'fulfilled').flatMap(r => r.value || []);

            // Instructor: only show content THEY uploaded
            if (isInstructor && userId && !presetCourseId) {
                all = all.filter(c => String(c.uploadedByFK) === String(userId));
            }

            setContents(all);
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    const filtered = contents.filter(c => {
        const matchSearch = c.title?.toLowerCase().includes(search.toLowerCase()) ||
            c.courseName?.toLowerCase().includes(search.toLowerCase());
        const matchType = filterType ? c.type === filterType : true;
        const matchStatus = filterStatus ? c.status === filterStatus : true;
        return matchSearch && matchType && matchStatus;
    });

    return (
        <div>
            <div className="d-flex align-items-center justify-content-between mb-4">
                <div>
                    <h2 className="text-primary-edulearn mb-0">
                        <i className="bi bi-collection-play me-2"></i>Learning Contents
                    </h2>
                    {contextLabel && (
                        <small className="text-muted">
                            <i className="bi bi-funnel me-1"></i>{contextLabel}
                            {presetCourseId && (
                                <button className="btn btn-link btn-sm p-0 ms-2" onClick={() => navigate('/contents')}>
                                    <i className="bi bi-x"></i> Clear filter
                                </button>
                            )}
                        </small>
                    )}
                </div>
                {canManage && (
                    <button className="btn btn-primary-edulearn" onClick={() => navigate('/contents/new')}>
                        <i className="bi bi-plus-lg me-2"></i>New Content
                    </button>
                )}
            </div>

            <div className="card shadow-sm mb-4">
                <div className="card-body">
                    <div className="row g-3">
                        <div className="col-md-4">
                            <div className="input-group">
                                <span className="input-group-text"><i className="bi bi-search"></i></span>
                                <input type="text" className="form-control" placeholder="Search by title or course..." value={search} onChange={e => setSearch(e.target.value)} />
                            </div>
                        </div>
                        <div className="col-md-3">
                            <select className="form-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
                                <option value="">All Types</option>
                                {Object.values(ContentType).map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div className="col-md-3">
                            <select className="form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                                <option value="">All Statuses</option>
                                {Object.values(ContentStatus).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="col-md-2">
                            <button className="btn btn-outline-secondary w-100" onClick={() => { setSearch(''); setFilterType(''); setFilterStatus(''); }}>
                                <i className="bi bi-x-lg me-1"></i>Clear
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <ErrorAlert error={error} onDismiss={() => setError(null)} />
            {loading && <Loading message="Loading contents..." />}

            {!loading && !error && filtered.length === 0 && (
                <div className="text-center py-5 text-muted">
                    <i className="bi bi-collection-play display-4 d-block mb-3"></i>
                    <p className="mb-1">No content items found.</p>
                    {canManage && (
                        <button className="btn btn-primary-edulearn mt-2" onClick={() => navigate('/contents/new')}>
                            <i className="bi bi-plus-lg me-2"></i>Add First Content
                        </button>
                    )}
                </div>
            )}

            {!loading && filtered.length > 0 && (
                <div className="card shadow-sm">
                    <div className="card-header bg-light d-flex align-items-center justify-content-between">
                        <strong><i className="bi bi-table me-2"></i>Contents</strong>
                        <small className="text-muted">{filtered.length} result(s)</small>
                    </div>
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th>Title</th>
                                    <th>Type</th>
                                    <th>Course</th>
                                    <th>Uploaded By</th>
                                    <th>Version</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(content => (
                                    <tr key={content.contentID} style={{ cursor: 'pointer' }} onClick={() => navigate(`/contents/${content.contentID}`)}>
                                        <td className="fw-bold">{content.title}</td>
                                        <td><span className="badge bg-secondary">{content.type}</span></td>
                                        <td>{content.courseName || '—'}</td>
                                        <td>{content.uploadedByName || '—'}</td>
                                        <td>v{content.version}</td>
                                        <td><StatusBadge status={content.status} /></td>
                                        <td onClick={e => e.stopPropagation()}>
                                            <div className="d-flex gap-2">
                                                <button className="btn btn-sm btn-outline-primary" onClick={() => navigate(`/contents/${content.contentID}`)} title="View">
                                                    <i className="bi bi-eye"></i>
                                                </button>
                                                {canManage && (
                                                    <button className="btn btn-sm btn-outline-secondary" onClick={() => navigate(`/contents/${content.contentID}/edit`)} title="Edit">
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
