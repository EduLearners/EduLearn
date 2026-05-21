import { useState, useEffect } from 'react';
import { enrollmentService } from '../../services/enrollmentService';
import { sectionService } from '../../services/sectionService';
import { courseService } from '../../services/courseService';
import { timetableService } from '../../services/timetableService';
import { authService } from '../../services/authService';
import Loading from '../../components/Loading';
import ErrorAlert from '../../components/ErrorAlert';
import StatusBadge from '../../components/StatusBadge';
import ConfirmDialog from '../../components/ConfirmDialog';
import axiosClient from '../../api/axiosClient';

export default function EnrollmentPage() {
    // Lookup data
    const [courses, setCourses] = useState([]);
    const [loadingLookups, setLoadingLookups] = useState(true);

    // Search filters
    const [courseId, setCourseId] = useState('');
    const [term, setTerm] = useState('2026-Spring');
    const [studentId, setStudentId] = useState(() => localStorage.getItem('lastStudentId') || '');

    // Sections list
    const [sections, setSections] = useState([]);
    const [loadingSections, setLoadingSections] = useState(false);
    const [searchError, setSearchError] = useState(null);

    // Student's enrollments
    const [enrollments, setEnrollments] = useState([]);
    const [loadingEnrollments, setLoadingEnrollments] = useState(false);
    const [enrollmentsError, setEnrollmentsError] = useState(null);

    // Action state
    const [actionInProgress, setActionInProgress] = useState(null); // sectionID being acted on
    const [actionMessage, setActionMessage] = useState(null); // { type: 'success'|'error', text }
    const [conflictResults, setConflictResults] = useState({}); // { sectionID: result }

    // Drop confirmation
    const [dropConfirm, setDropConfirm] = useState(null); // enrollment object

    // Roster modal
    const [rosterModal, setRosterModal] = useState(null); // { sectionID, courseName }
    const [rosterData, setRosterData] = useState([]);
    const [loadingRoster, setLoadingRoster] = useState(false);

    const { role } = authService.getCurrentUser();
    const isStudent = role === 'Student';

    // Load courses on mount + auto-resolve Student ID for Student role
    useEffect(() => {
        loadCourses();
        if (isStudent) autoResolveStudentId();
    }, []);

    // Auto-load enrollments when studentId changes
    useEffect(() => {
        if (studentId && /^\d+$/.test(studentId)) {
            loadEnrollments();
        } else {
            setEnrollments([]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [studentId]);

    // Auto-detect the logged-in student's own StudentID
    const autoResolveStudentId = async () => {
        try {
            const record = await axiosClient.get('/students/me').then(r => r.data);
            if (record?.studentID) {
                const sid = String(record.studentID);
                setStudentId(sid);
                localStorage.setItem('lastStudentId', sid);
            }
        } catch {
            // Fallback: keep whatever is in localStorage
        }
    };

    const loadCourses = async () => {
        try {
            setLoadingLookups(true);
            const data = await courseService.getAll();
            setCourses(data || []);
        } catch (err) {
            setSearchError(err);
        } finally {
            setLoadingLookups(false);
        }
    };

    const handleSearchSections = async () => {
        setActionMessage(null);
        setConflictResults({});

        if (!courseId || !term.trim()) {
            setSearchError({ message: 'Please select a course and term.' });
            return;
        }

        try {
            setLoadingSections(true);
            setSearchError(null);
            const data = await sectionService.getByCourseAndTerm(courseId, term.trim());
            setSections(data || []);
        } catch (err) {
            if (err.response?.status === 404) {
                setSections([]);
            } else {
                setSearchError(err);
            }
        } finally {
            setLoadingSections(false);
        }
    };

    const loadEnrollments = async () => {
        if (!studentId) return;
        try {
            setLoadingEnrollments(true);
            setEnrollmentsError(null);
            const data = await enrollmentService.getByStudent(studentId);
            setEnrollments(data || []);
            // Remember the last student ID used (handy for Registrar workflows)
            localStorage.setItem('lastStudentId', studentId);
        } catch (err) {
            setEnrollmentsError(err);
            setEnrollments([]);
        } finally {
            setLoadingEnrollments(false);
        }
    };

    const handleCheckConflict = async (section) => {
        if (!studentId) {
            setActionMessage({ type: 'error', text: 'Enter a Student ID first.' });
            return;
        }
        try {
            setActionInProgress(section.sectionID);
            const result = await timetableService.validateSection(studentId, section.sectionID);
            setConflictResults({
                ...conflictResults,
                [section.sectionID]: result,
            });
        } catch (err) {
            setActionMessage({
                type: 'error',
                text: err.response?.data?.error || 'Failed to check conflict.',
            });
        } finally {
            setActionInProgress(null);
        }
    };

    const handleEnroll = async (section) => {
        if (!studentId) {
            setActionMessage({ type: 'error', text: 'Enter a Student ID first.' });
            return;
        }

        try {
            setActionInProgress(section.sectionID);
            setActionMessage(null);
            const result = await enrollmentService.enroll(parseInt(studentId, 10), section.sectionID);

            const msg = result.status === 'Waitlisted'
                ? `Added to waitlist for ${result.courseName} (position #${result.waitlistPosition}).`
                : `Successfully enrolled in ${result.courseName}.`;

            setActionMessage({ type: 'success', text: msg });

            // Refresh both sides
            await Promise.all([handleSearchSections(), loadEnrollments()]);
            setConflictResults({});
        } catch (err) {
            const data = err.response?.data;
            let text = data?.error || err.message || 'Enrollment failed.';

            // Pretty-print known error codes from backend
            if (data?.code === 'PREREQUISITES_NOT_MET' && data.unmetPrerequisites?.length) {
                text = `Prerequisites not met: ${data.unmetPrerequisites.join(', ')}`;
            } else if (data?.code === 'SCHEDULE_CONFLICT' && data.conflictingCourseCode) {
                text = `Schedule conflict with ${data.conflictingCourseCode} — ${data.error}`;
            } else if (data?.code === 'DUPLICATE_ENROLLMENT') {
                text = 'This student is already enrolled in this section.';
            }

            setActionMessage({ type: 'error', text });
        } finally {
            setActionInProgress(null);
        }
    };

    const handleDrop = async () => {
        if (!dropConfirm) return;
        try {
            setActionInProgress('drop-' + dropConfirm.enrollID);
            await enrollmentService.drop(dropConfirm.enrollID);
            setActionMessage({
                type: 'success',
                text: `Dropped enrollment from ${dropConfirm.courseName}. If anyone was waitlisted, they have been auto-promoted.`,
            });
            setDropConfirm(null);
            // Refresh enrollments + sections (to update enrolledCount)
            await Promise.all([loadEnrollments(), courseId && handleSearchSections()]);
        } catch (err) {
            setActionMessage({
                type: 'error',
                text: err.response?.data?.error || 'Failed to drop enrollment.',
            });
            setDropConfirm(null);
        } finally {
            setActionInProgress(null);
        }
    };

    const handleViewRoster = async (section) => {
        try {
            setRosterModal({ sectionID: section.sectionID, courseName: section.courseName });
            setLoadingRoster(true);
            setRosterData([]);
            const data = await enrollmentService.getBySection(section.sectionID);
            setRosterData(data || []);
        } catch (err) {
            setActionMessage({
                type: 'error',
                text: err.response?.data?.error || 'Failed to load roster.',
            });
            setRosterModal(null);
        } finally {
            setLoadingRoster(false);
        }
    };

    // Parse schedule JSON for display
    const parseSchedule = (json) => {
        if (!json) return null;
        try { return JSON.parse(json); } catch { return null; }
    };

    return (
        <div>
            {/* Page header */}
            <h2 className="text-primary-edulearn mb-4">
                <i className="bi bi-card-checklist me-2"></i>Enrollment
            </h2>

            {/* Top-of-page status message */}
            {actionMessage && (
                <div className={`alert alert-${actionMessage.type === 'success' ? 'success' : 'danger'} d-flex align-items-center`}>
                    <i className={`bi bi-${actionMessage.type === 'success' ? 'check-circle' : 'exclamation-triangle'}-fill me-2`}></i>
                    <div className="flex-grow-1">{actionMessage.text}</div>
                    <button className="btn-close" onClick={() => setActionMessage(null)}></button>
                </div>
            )}

            {/* Search panel */}
            <div className="card shadow-sm mb-4">
                <div className="card-header bg-primary-edulearn text-white">
                    <i className="bi bi-search me-2"></i>Search & Enroll
                </div>
                <div className="card-body">
                    <div className="row g-3 align-items-end">
                        <div className="col-md-4">
                            <label className="form-label fw-bold">
                                <i className="bi bi-book me-1"></i>Course
                            </label>
                            <select
                                className="form-select"
                                value={courseId}
                                onChange={(e) => setCourseId(e.target.value)}
                                disabled={loadingLookups}
                            >
                                <option value="">— Select a course —</option>
                                {courses.map(c => (
                                    <option key={c.courseID} value={c.courseID}>
                                        {c.code} — {c.title}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="col-md-3">
                            <label className="form-label fw-bold">
                                <i className="bi bi-calendar me-1"></i>Term
                            </label>
                            <input
                                type="text"
                                className="form-control"
                                value={term}
                                onChange={(e) => setTerm(e.target.value)}
                                placeholder="e.g. 2026-Spring"
                            />
                        </div>

                        {/* Student ID — hidden for students (auto-filled), visible for staff */}
                        {!isStudent && (
                            <div className="col-md-3">
                                <label className="form-label fw-bold">
                                    <i className="bi bi-person me-1"></i>Student ID
                                </label>
                                <input
                                    type="number"
                                    className="form-control"
                                    value={studentId}
                                    onChange={(e) => setStudentId(e.target.value)}
                                    placeholder="Who you are enrolling/viewing"
                                    min="1"
                                />
                            </div>
                        )}
                        {isStudent && studentId && (
                            <div className="col-md-3 d-flex align-items-end">
                                <div className="alert alert-success mb-0 py-2 px-3 w-100 small">
                                    <i className="bi bi-person-check-fill me-2"></i>
                                    <strong>You</strong> · Student #{studentId}
                                </div>
                            </div>
                        )}

                        <div className="col-md-2">
                            <label className="form-label fw-bold">&nbsp;</label>
                            <button
                                className="btn btn-primary-edulearn w-100"
                                onClick={handleSearchSections}
                                disabled={loadingSections || loadingLookups}
                            >
                                <i className="bi bi-search me-1"></i>Search
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <ErrorAlert error={searchError} onDismiss={() => setSearchError(null)} />

            {loadingSections && <Loading message="Searching sections..." />}

            {/* Available sections */}
            {!loadingSections && sections.length > 0 && (
                <div className="card shadow-sm mb-4">
                    <div className="card-header bg-light">
                        <strong>
                            <i className="bi bi-collection me-2"></i>
                            Available Sections ({sections.length})
                        </strong>
                    </div>
                    <div className="list-group list-group-flush">
                        {sections.map(s => {
                            const sched = parseSchedule(s.scheduleJSON);
                            const isFull = s.enrolledCount >= s.capacity;
                            const isBusy = actionInProgress === s.sectionID;
                            const conflictResult = conflictResults[s.sectionID];

                            return (
                                <div key={s.sectionID} className="list-group-item p-3">
                                    <div className="row align-items-center">
                                        <div className="col-md-7">
                                            <h6 className="mb-1">
                                                <strong>{s.courseName}</strong>
                                                <span className="text-muted ms-2 small">Section {s.sectionID}</span>
                                            </h6>
                                            <div className="small text-muted">
                                                <i className="bi bi-person-badge me-1"></i>{s.instructorName || 'TBA'}
                                                {sched && (
                                                    <>
                                                        <span className="mx-2">·</span>
                                                        <i className="bi bi-calendar3 me-1"></i>
                                                        {sched.days} {sched.time}
                                                    </>
                                                )}
                                                <span className="mx-2">·</span>
                                                <i className="bi bi-people me-1"></i>
                                                <span className={isFull ? 'text-danger fw-bold' : ''}>
                                                    {s.enrolledCount}/{s.capacity}
                                                    {isFull && ' FULL'}
                                                </span>
                                                <span className="ms-2"><StatusBadge status={s.status} /></span>
                                            </div>

                                            {/* Inline conflict result */}
                                            {conflictResult && (
                                                <div className={`alert mt-2 mb-0 py-2 small alert-${conflictResult.hasConflict ? 'warning' : 'success'}`}>
                                                    <i className={`bi bi-${conflictResult.hasConflict ? 'exclamation-triangle' : 'check-circle'} me-2`}></i>
                                                    {conflictResult.conflictMessage}
                                                </div>
                                            )}
                                        </div>

                                        <div className="col-md-5 text-end">
                                            <div className="btn-group btn-group-sm">
                                                <button
                                                    className="btn btn-outline-secondary"
                                                    onClick={() => handleViewRoster(s)}
                                                    title="View roster"
                                                >
                                                    <i className="bi bi-list-ul me-1"></i>Roster
                                                </button>
                                                <button
                                                    className="btn btn-outline-warning"
                                                    onClick={() => handleCheckConflict(s)}
                                                    disabled={isBusy || !studentId}
                                                    title={!studentId ? 'Enter Student ID first' : 'Check schedule conflict'}
                                                >
                                                    <i className="bi bi-clock-history me-1"></i>Check Conflict
                                                </button>
                                                <button
                                                    className={`btn ${isFull ? 'btn-warning' : 'btn-primary-edulearn'}`}
                                                    onClick={() => handleEnroll(s)}
                                                    disabled={isBusy || !studentId || s.status !== 'Open'}
                                                    title={!studentId ? 'Enter Student ID first' : ''}
                                                >
                                                    {isBusy ? (
                                                        <><span className="spinner-border spinner-border-sm me-1"></span>...</>
                                                    ) : isFull ? (
                                                        <><i className="bi bi-hourglass-split me-1"></i>Waitlist</>
                                                    ) : (
                                                        <><i className="bi bi-check-lg me-1"></i>Enroll</>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Empty state for sections after search */}
            {!loadingSections && sections.length === 0 && courseId && (
                <div className="alert alert-info">
                    <i className="bi bi-info-circle me-2"></i>
                    No sections found for the selected course and term.
                </div>
            )}

            {/* Student enrollments */}
            <div className="card shadow-sm">
                <div className="card-header bg-primary-edulearn text-white d-flex justify-content-between align-items-center">
                    <span>
                        <i className="bi bi-bookmark-check me-2"></i>
                        Student Enrollments
                        {studentId && <span className="ms-2 badge bg-light text-dark">Student {studentId}</span>}
                    </span>
                    <button
                        className="btn btn-sm btn-outline-light"
                        onClick={loadEnrollments}
                        disabled={!studentId || loadingEnrollments}
                    >
                        <i className="bi bi-arrow-clockwise"></i>
                    </button>
                </div>
                <div className="card-body p-0">
                    {!studentId && (
                        <div className="text-center py-4 text-muted">
                            <i className="bi bi-person-x" style={{ fontSize: '2rem' }}></i>
                            <p className="mt-2 mb-0">
                                {isStudent
                                    ? 'Resolving your student record...'
                                    : 'Enter a Student ID above to view enrollments.'}
                            </p>
                        </div>
                    )}

                    <ErrorAlert error={enrollmentsError} onDismiss={() => setEnrollmentsError(null)} />

                    {loadingEnrollments && <Loading message="Loading enrollments..." />}

                    {studentId && !loadingEnrollments && enrollments.length === 0 && !enrollmentsError && (
                        <div className="text-center py-4 text-muted">
                            <i className="bi bi-inbox" style={{ fontSize: '2rem' }}></i>
                            <p className="mt-2 mb-0">No enrollments for this student.</p>
                        </div>
                    )}

                    {studentId && !loadingEnrollments && enrollments.length > 0 && (
                        <div className="table-responsive">
                            <table className="table table-hover mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th>Enroll ID</th>
                                        <th>Course</th>
                                        <th>Term</th>
                                        <th>Status</th>
                                        <th>Grade</th>
                                        <th>Enrolled At</th>
                                        <th className="text-end pe-3">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {enrollments.map(e => (
                                        <tr key={e.enrollID}>
                                            <td>{e.enrollID}</td>
                                            <td className="fw-bold">{e.courseName}</td>
                                            <td>{e.term}</td>
                                            <td>
                                                <StatusBadge status={e.status} />
                                                {e.status === 'Waitlisted' && e.waitlistPosition && (
                                                    <span className="ms-2 badge bg-warning text-dark">{e.waitlistPosition}</span>
                                                )}
                                            </td>
                                            <td>
                                                {e.gradePostedFlag ? (
                                                    <span className="badge bg-success">Posted</span>
                                                ) : (
                                                    <span className="text-muted small">Pending</span>
                                                )}
                                            </td>
                                            <td>
                                                <small className="text-muted">
                                                    {e.enrolledAt ? new Date(e.enrolledAt).toLocaleDateString() : '—'}
                                                </small>
                                            </td>
                                            <td className="text-end pe-3">
                                                {e.status !== 'Dropped' && (
                                                    <button
                                                        className="btn btn-sm btn-outline-danger"
                                                        onClick={() => setDropConfirm(e)}
                                                        disabled={actionInProgress === 'drop-' + e.enrollID}
                                                    >
                                                        <i className="bi bi-trash me-1"></i>Drop
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Drop confirmation */}
            <ConfirmDialog
                show={!!dropConfirm}
                title="Drop Enrollment"
                message={
                    dropConfirm
                        ? `Are you sure you want to drop ${dropConfirm.courseName} (${dropConfirm.term})? ` +
                          'If anyone is on the waitlist, they will be auto-promoted.'
                        : ''
                }
                onConfirm={handleDrop}
                onCancel={() => setDropConfirm(null)}
                confirmText="Drop Enrollment"
                confirmVariant="danger"
            />

            {/* Roster modal */}
            {rosterModal && (
                <>
                    <div className="modal-backdrop fade show"></div>
                    <div className="modal fade show d-block" tabIndex="-1">
                        <div className="modal-dialog modal-dialog-centered modal-lg">
                            <div className="modal-content">
                                <div className="modal-header bg-primary-edulearn text-white">
                                    <h5 className="modal-title">
                                        <i className="bi bi-list-ul me-2"></i>
                                        Section Roster: {rosterModal.courseName} (Section {rosterModal.sectionID})
                                    </h5>
                                    <button type="button" className="btn-close btn-close-white" onClick={() => setRosterModal(null)}></button>
                                </div>
                                <div className="modal-body">
                                    {loadingRoster ? (
                                        <Loading message="Loading roster..." />
                                    ) : rosterData.length === 0 ? (
                                        <div className="text-center py-4 text-muted">
                                            <i className="bi bi-people" style={{ fontSize: '2rem' }}></i>
                                            <p className="mt-2 mb-0">No enrollments yet.</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="mb-3 d-flex gap-3 small text-muted">
                                                <span>
                                                    <span className="badge bg-success me-1">Enrolled</span>
                                                    {rosterData.filter(r => r.status === 'Enrolled').length}
                                                </span>
                                                <span>
                                                    <span className="badge bg-warning text-dark me-1">Waitlisted</span>
                                                    {rosterData.filter(r => r.status === 'Waitlisted').length}
                                                </span>
                                                <span>
                                                    <span className="badge bg-secondary me-1">Dropped</span>
                                                    {rosterData.filter(r => r.status === 'Dropped').length}
                                                </span>
                                            </div>
                                            <div className="table-responsive">
                                                <table className="table table-sm">
                                                    <thead>
                                                        <tr>
                                                            <th>#</th>
                                                            <th>Student</th>
                                                            <th>Status</th>
                                                            <th>Waitlist Pos</th>
                                                            <th>Enrolled At</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {rosterData.map((r, idx) => (
                                                            <tr key={r.enrollID}>
                                                                <td>{idx + 1}</td>
                                                                <td>{r.studentName} <span className="text-muted small">{r.studentID}</span></td>
                                                                <td><StatusBadge status={r.status} /></td>
                                                                <td>{r.waitlistPosition || '—'}</td>
                                                                <td className="small">
                                                                    {r.enrolledAt ? new Date(r.enrolledAt).toLocaleDateString() : '—'}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </>
                                    )}
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-outline-secondary" onClick={() => setRosterModal(null)}>Close</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
