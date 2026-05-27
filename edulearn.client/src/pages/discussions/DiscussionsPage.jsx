import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { discussionService } from '../../services/discussionService';
import { courseService } from '../../services/courseService';
import { sectionService } from '../../services/sectionService';
import { enrollmentService } from '../../services/enrollmentService';
import { authService } from '../../services/authService';
import Loading from '../../components/Loading';
import ErrorAlert from '../../components/ErrorAlert';
import StatusBadge from '../../components/StatusBadge';
import axiosClient from '../../api/axiosClient';

const DISCUSSION_STATUSES = ['Open', 'Closed', 'Pinned', 'Archived'];

export default function DiscussionsPage() {
    const [searchParams] = useSearchParams();
    const presetCourseId = searchParams.get('courseId');
    const { role, userId } = authService.getCurrentUser();

    const [courses, setCourses] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState('');
    const [discussions, setDiscussions] = useState([]);
    const [selected, setSelected] = useState(null);
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState('');

    const [newThread, setNewThread] = useState({ title: '', initialMessage: '' });
    const [replyText, setReplyText] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const canModerate = ['Instructor', 'ITAdmin'].includes(role);
    const isStudent = role === 'Student';
    const isInstructor = role === 'Instructor';

    useEffect(() => { loadCourses(); }, []);

    // Auto-select course from URL param
    useEffect(() => {
        if (presetCourseId && courses.length > 0) {
            setSelectedCourse(presetCourseId);
            loadDiscussions(presetCourseId);
        }
    }, [presetCourseId, courses]);;

    const loadCourses = async () => {
        try {
            setPageLoading(true);
            let data = [];

            if (isInstructor && userId) {
                // Instructor: only courses they teach
                const mySections = await sectionService.getByInstructor(userId).catch(() => []);
                const myCourseIds = [...new Set((mySections || []).map(s => s.courseID))];
                const allCourses = await courseService.getAll().catch(() => []);
                data = (allCourses || []).filter(c => myCourseIds.includes(c.courseID));
            } else if (isStudent) {
                // Student: only enrolled courses
                const studentRecord = await axiosClient.get('/students/me').then(r => r.data).catch(() => null);
                if (studentRecord?.studentID) {
                    const enrollments = await enrollmentService.getByStudent(studentRecord.studentID).catch(() => []);
                    const myCourseIds = [...new Set(
                        (enrollments || []).filter(e => e.status === 'Enrolled').map(e => e.courseID).filter(Boolean)
                    )];
                    const allCourses = await courseService.getAll().catch(() => []);
                    data = (allCourses || []).filter(c => myCourseIds.includes(c.courseID));
                }
            } else {
                // Registrar / ITAdmin / DeptAdmin: all courses
                data = await courseService.getAll().catch(() => []);
            }

            setCourses(data || []);
        } catch (err) {
            setError(err);
        } finally {
            setPageLoading(false);
        }
    };

    const loadDiscussions = async (courseId) => {
        try {
            setLoading(true);
            setError(null);
            setSelected(null);
            const data = await discussionService.getByCourse(courseId);
            setDiscussions(data || []);
        } catch (err) {
            setError(err);
            setDiscussions([]);
        } finally {
            setLoading(false);
        }
    };

    const handleCourseChange = (e) => {
        const id = e.target.value;
        setSelectedCourse(id);
        if (id) loadDiscussions(id);
        else setDiscussions([]);
    };

    const handleCreateThread = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess('');
        setSubmitting(true);
        try {
            await discussionService.create({
                courseID: Number(selectedCourse),
                title: newThread.title,
                initialMessage: newThread.initialMessage || null,
            });
            setNewThread({ title: '', initialMessage: '' });
            setSuccess('Discussion thread created.');
            loadDiscussions(selectedCourse);
        } catch (err) {
            setError(err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleReply = async (e) => {
        e.preventDefault();
        if (!selected || !replyText.trim()) return;
        setError(null);
        setSubmitting(true);
        try {
            const updated = await discussionService.addReply(selected.discussionID, {
                content: replyText,
                parentPostIndex: null,
            });
            setSelected(updated);
            setReplyText('');
            // Update list
            setDiscussions(prev =>
                prev.map(d => d.discussionID === updated.discussionID ? updated : d)
            );
        } catch (err) {
            setError(err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleStatusChange = async (discussionId, newStatus) => {
        try {
            setError(null);
            const updated = await discussionService.updateStatus(discussionId, { status: newStatus });
            setSelected(updated);
            setDiscussions(prev =>
                prev.map(d => d.discussionID === updated.discussionID ? updated : d)
            );
        } catch (err) {
            setError(err);
        }
    };

    const parsePosts = (postsJSON) => {
        if (!postsJSON) return [];
        try { return JSON.parse(postsJSON); } catch { return []; }
    };

    if (pageLoading) return <Loading message="Loading courses..." />;

    return (
        <div>
            {/* Page Header */}
            <div className="d-flex align-items-center justify-content-between mb-4">
                <h2 className="text-primary-edulearn mb-0">
                    <i className="bi bi-chat-square-text me-2"></i>Discussions
                </h2>
            </div>

            {/* Course Selector */}
            <div className="card shadow-sm mb-4">
                <div className="card-body">
                    <div className="row g-3">
                        <div className="col-md-6">
                            <label className="form-label fw-bold">
                                Select Course <span className="text-danger">*</span>
                            </label>
                            <select
                                className="form-select"
                                value={selectedCourse}
                                onChange={handleCourseChange}
                            >
                                <option value="">-- Select a course --</option>
                                {courses.map(c => (
                                    <option key={c.courseID} value={c.courseID}>
                                        {c.code} — {c.title}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <ErrorAlert error={error} onDismiss={() => setError(null)} />
            {success && (
                <div className="alert alert-success">
                    <i className="bi bi-check-circle me-2"></i>{success}
                </div>
            )}

            {loading && <Loading message="Loading discussions..." />}

            {!loading && selectedCourse && (
                <div className="row g-4">
                    {/* Left — Thread List + New Thread */}
                    <div className="col-md-4">

                        {/* New Thread Form */}
                        <div className="card shadow-sm mb-4">
                            <div className="card-header bg-primary-edulearn text-white">
                                <strong>
                                    <i className="bi bi-plus-circle me-2"></i>
                                    New Thread
                                </strong>
                            </div>
                            <div className="card-body">
                                <form onSubmit={handleCreateThread}>
                                    <div className="row g-2">
                                        <div className="col-12">
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={newThread.title}
                                                onChange={e => setNewThread({ ...newThread, title: e.target.value })}
                                                placeholder="Thread title..."
                                                minLength={3}
                                                maxLength={200}
                                                required
                                            />
                                        </div>
                                        <div className="col-12">
                                            <textarea
                                                className="form-control"
                                                value={newThread.initialMessage}
                                                onChange={e => setNewThread({ ...newThread, initialMessage: e.target.value })}
                                                rows={2}
                                                placeholder="Initial message (optional)..."
                                            />
                                        </div>
                                        <div className="col-12">
                                            <button
                                                type="submit"
                                                className="btn btn-primary-edulearn w-100 btn-sm"
                                                disabled={submitting}
                                            >
                                                {submitting
                                                    ? <span className="spinner-border spinner-border-sm"></span>
                                                    : <><i className="bi bi-send me-1"></i>Post Thread</>
                                                }
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>

                        {/* Thread List */}
                        <div className="card shadow-sm">
                            <div className="card-header bg-light">
                                <strong>
                                    <i className="bi bi-list me-2"></i>
                                    Threads ({discussions.length})
                                </strong>
                            </div>
                            {discussions.length === 0 ? (
                                <div className="card-body text-center text-muted py-4">
                                    <i className="bi bi-chat-square display-4 d-block mb-2"></i>
                                    No threads yet.
                                </div>
                            ) : (
                                <div className="list-group list-group-flush">
                                    {discussions.map(d => (
                                        <button
                                            key={d.discussionID}
                                            className={`list-group-item list-group-item-action ${selected?.discussionID === d.discussionID ? 'active' : ''}`}
                                            onClick={() => setSelected(d)}
                                        >
                                            <div className="d-flex align-items-center justify-content-between">
                                                <div className="fw-bold text-truncate me-2">
                                                    {d.title}
                                                </div>
                                                <StatusBadge status={d.status} />
                                            </div>
                                            <small className={selected?.discussionID === d.discussionID ? 'text-white-50' : 'text-muted'}>
                                                {d.threadStarterName} · {d.createdAt ? new Date(d.createdAt).toLocaleDateString() : ''}
                                            </small>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right — Thread Detail */}
                    <div className="col-md-8">
                        {!selected ? (
                            <div className="card shadow-sm h-100 d-flex align-items-center justify-content-center">
                                <div className="text-center text-muted py-5">
                                    <i className="bi bi-chat-square-text display-4 d-block mb-3"></i>
                                    Select a thread to view
                                </div>
                            </div>
                        ) : (
                            <div className="card shadow-sm">
                                <div className="card-header bg-primary-edulearn text-white">
                                    <div className="d-flex align-items-center justify-content-between">
                                        <strong>
                                            <i className="bi bi-chat-square-text me-2"></i>
                                            {selected.title}
                                        </strong>
                                        <StatusBadge status={selected.status} />
                                    </div>
                                    <small className="text-white-50">
                                        Started by {selected.threadStarterName}
                                    </small>
                                </div>

                                {/* Moderation Controls */}
                                {canModerate && (
                                    <div className="card-body border-bottom py-2">
                                        <div className="d-flex align-items-center gap-2">
                                            <small className="text-muted me-2">Status:</small>
                                            {DISCUSSION_STATUSES.map(s => (
                                                <button
                                                    key={s}
                                                    className={`btn btn-sm ${selected.status === s ? 'btn-primary-edulearn' : 'btn-outline-secondary'}`}
                                                    onClick={() => handleStatusChange(selected.discussionID, s)}
                                                    disabled={selected.status === s}
                                                >
                                                    {s}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Posts */}
                                <div className="card-body" style={{ maxHeight: 400, overflowY: 'auto' }}>
                                    {parsePosts(selected.postsJSON).length === 0 ? (
                                        <p className="text-muted text-center">No posts yet.</p>
                                    ) : (
                                        parsePosts(selected.postsJSON).map((post, idx) => (
                                            <div
                                                key={idx}
                                                className={`mb-3 p-3 rounded ${String(post.authorID) === String(userId) ? 'bg-primary bg-opacity-10 border-start border-primary border-3' : 'bg-light'}`}
                                            >
                                                <div className="d-flex align-items-center justify-content-between mb-1">
                                                    <strong className="small">{post.authorName}</strong>
                                                    <small className="text-muted">
                                                        {post.timestamp
                                                            ? new Date(post.timestamp).toLocaleString()
                                                            : ''}
                                                    </small>
                                                </div>
                                                <p className="mb-0">{post.content}</p>
                                            </div>
                                        ))
                                    )}
                                </div>

                                {/* Reply Box */}
                                {(selected.status === 'Open' || selected.status === 'Pinned') && (
                                    <div className="card-footer">
                                        <form onSubmit={handleReply}>
                                            <div className="input-group">
                                                <textarea
                                                className="form-control"
                                                value={replyText}
                                                onChange={e => setReplyText(e.target.value)}
                                                rows={2}
                                                placeholder="Write a reply..."
                                                maxLength={2000}
                                                    required
                                            />
                                                <button
                                                    type="submit"
                                                    className="btn btn-primary-edulearn"
                                                    disabled={submitting}
                                                >
                                                    {submitting
                                                        ? <span className="spinner-border spinner-border-sm"></span>
                                                        : <i className="bi bi-send"></i>
                                                    }
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                )}

                                {(selected.status === 'Closed' || selected.status === 'Archived') && (
                                    <div className="card-footer text-muted small text-center">
                                        <i className="bi bi-lock me-1"></i>
                                        This discussion is {selected.status.toLowerCase()} and not accepting replies.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}