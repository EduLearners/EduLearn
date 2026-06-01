import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { enrollmentService } from '../../services/enrollmentService';
import { sectionService } from '../../services/sectionService';
import { courseService } from '../../services/courseService';
import { programService } from '../../services/programService';
import { timetableService } from '../../services/timetableService';
import { authService } from '../../services/authService';
import Loading from '../../components/Loading';
import ErrorAlert from '../../components/ErrorAlert';
import StatusBadge from '../../components/StatusBadge';
import ConfirmDialog from '../../components/ConfirmDialog';
import Toast from '../../components/Toast';
import { getFriendlySimpleMessage } from '../../utils/errorMessage';
import axiosClient from '../../api/axiosClient';
import { validateCourseCode, validateMinLength, validateJson, validatePositiveInteger, validateOptionalPositiveId, validateTerm, validatePositiveId } from '../../utils/validators';

export default function EnrollmentPage() {
    const [searchParams] = useSearchParams();

    // All programs + courses (master lists)
    const [programs, setPrograms] = useState([]);
    const [allCourses, setAllCourses] = useState([]);
    const [loadingLookups, setLoadingLookups] = useState(true);

    // Program filter
    const [selectedProgramId, setSelectedProgramId] = useState('');
    const [selectedProgram, setSelectedProgram] = useState(null); // full program object
    const [showAllCourses, setShowAllCourses] = useState(false);   // toggle for "show all"

    // Courses shown in dropdown (filtered by program OR all)
    const [filteredCourses, setFilteredCourses] = useState([]);

    // Search filters
    const [courseId, setCourseId] = useState('');
    const [term, setTerm] = useState('2026-Spring');
    const [studentId, setStudentId] = useState('');
    const [errors, setErrors] = useState({});

    // Sections list
    const [sections, setSections] = useState([]);
    const [loadingSections, setLoadingSections] = useState(false);
    const [searchError, setSearchError] = useState(null);

    // Student enrollments
    const [enrollments, setEnrollments] = useState([]);
    const [loadingEnrollments, setLoadingEnrollments] = useState(false);
    const [enrollmentsError, setEnrollmentsError] = useState(null);

    // Action state
    const [actionInProgress, setActionInProgress] = useState(null);
    const [actionMessage, setActionMessage] = useState(null);
    const [conflictResults, setConflictResults] = useState({});

    // Drop confirmation
    const [dropConfirm, setDropConfirm] = useState(null);

    // Roster modal
    const [rosterModal, setRosterModal] = useState(null);
    const [rosterData, setRosterData] = useState([]);
    const [loadingRoster, setLoadingRoster] = useState(false);

    const { role } = authService.getCurrentUser();
    const isStudent = role === 'Student';

    // ── Mount: load lookups + handle URL params ────────────────────
    useEffect(() => {
        loadLookups();
        if (isStudent) autoResolveStudentId();
    }, []);

    // Read URL params AFTER lookups are ready so dropdowns can be pre-selected
    useEffect(() => {
        if (loadingLookups) return;

        const urlStudentId = searchParams.get('studentId');
        const urlProgramId = searchParams.get('programId');

        if (urlStudentId) {
            setStudentId(urlStudentId);
            localStorage.setItem('lastStudentId', urlStudentId);
        } else {
            const stored = localStorage.getItem('lastStudentId');
            if (stored) setStudentId(stored);
        }

        if (urlProgramId) {
            setSelectedProgramId(urlProgramId);
        }
    }, [loadingLookups]);

    // Auto-load enrollments when studentId is set
    useEffect(() => {
        if (studentId && /^\d+$/.test(studentId)) {
            loadEnrollments();
        } else {
            setEnrollments([]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [studentId]);

    // When program changes, load its course list
    useEffect(() => {
        if (!selectedProgramId) {
            setSelectedProgram(null);
            setFilteredCourses(showAllCourses ? allCourses : allCourses);
            setCourseId('');
            return;
        }
        const prog = programs.find(p => String(p.programID) === String(selectedProgramId));
        if (prog) {
            setSelectedProgram(prog);
            applyProgramFilter(prog, allCourses, showAllCourses);
            setCourseId('');
        }
    }, [selectedProgramId, programs, allCourses, showAllCourses]);

    // ── Helpers ────────────────────────────────────────────────────
    const parseIds = (json) => {
        if (!json) return [];
        try {
            const parsed = JSON.parse(json);
            if (!Array.isArray(parsed)) return [];
            return parsed.map(item => {
                if (typeof item === 'number') return item;
                if (typeof item === 'object') return item.courseId ?? item.courseID ?? null;
                return null;
            }).filter(Boolean);
        } catch { return []; }
    };

    const applyProgramFilter = (prog, courses, showAll) => {
        if (!prog || showAll) {
            setFilteredCourses(courses);
            return;
        }
        const required = parseIds(prog.requiredCoursesJSON);
        const electives = parseIds(prog.electivesJSON);
        const programCourseIds = new Set([...required, ...electives]);

        if (programCourseIds.size === 0) {
            // Program has no courses assigned yet — show all with a warning
            setFilteredCourses(courses);
        } else {
            setFilteredCourses(courses.filter(c => programCourseIds.has(c.courseID)));
        }
    };

    // ── Load all programs + courses ────────────────────────────────
    const loadLookups = async () => {
        try {
            setLoadingLookups(true);
            const [programsData, coursesData] = await Promise.allSettled([
                isStudent ? programService.getMine() : programService.getAll(),
                courseService.getAll(),
            ]);
            const p = programsData.status === 'fulfilled' ? (programsData.value || []) : [];
            const c = coursesData.status === 'fulfilled' ? (coursesData.value || []) : [];
            setPrograms(p);
            setAllCourses(c);
            setFilteredCourses(c); // default = all
        } catch (err) {
            setSearchError(err);
        } finally {
            setLoadingLookups(false);
        }
    };

    // Auto-detect logged-in student's own ID
    const autoResolveStudentId = async () => {
        try {
            const record = await axiosClient.get('/students/me').then(r => r.data);
            if (record?.studentID) {
                const sid = String(record.studentID);
                setStudentId(sid);
                localStorage.setItem('lastStudentId', sid);
                // Auto-select the student's program
                if (record.programID) {
                    setSelectedProgramId(String(record.programID));
                }
            }
        } catch (err) {
            // FIX A1-01: Handle 404 gracefully instead of infinite "Resolving..." spinner
            if (err.response?.status === 404) {
                setEnrollmentsError({
                    message: "We couldn't find your student record. Please contact the Registrar to link your account to a student profile.",
                    code: 'STUDENT_RECORD_NOT_FOUND'
                });
                // Stop the "Resolving..." spinner by setting a dummy ID
                setStudentId('-1');
            } else {
                const stored = localStorage.getItem('lastStudentId');
                if (stored) setStudentId(stored);
            }
        }
    };

    // ── Search sections ────────────────────────────────────────────
    const handleSearchSections = async () => {
        setActionMessage(null);
        setConflictResults({});

        const next = {
            term: validateTerm(term),
            ...((!isStudent) && { studentId: validatePositiveId(studentId) }),
        };
        if (Object.values(next).some(Boolean)) { setErrors(next); return; }

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
            localStorage.setItem('lastStudentId', studentId);
        } catch (err) {
            setEnrollmentsError(err);
            setEnrollments([]);
        } finally {
            setLoadingEnrollments(false);
        }
    };

    const handleCheckConflict = async (section) => {
        if (!studentId) { setActionMessage({ type: 'error', text: 'Enter a Student ID first.' }); return; }
        try {
            setActionInProgress(section.sectionID);
            const result = await timetableService.validateSection(studentId, section.sectionID);
            setConflictResults({ ...conflictResults, [section.sectionID]: result });
        } catch (err) {
            setActionMessage({ type: 'error', text: getFriendlySimpleMessage(err, 'Failed to check conflict.') });
        } finally {
            setActionInProgress(null);
        }
    };

    const handleEnroll = async (section) => {
        if (!studentId) { setActionMessage({ type: 'error', text: 'Enter a Student ID first.' }); return; }
        try {
            setActionInProgress(section.sectionID);
            setActionMessage(null);
            const result = await enrollmentService.enroll(parseInt(studentId, 10), section.sectionID);
            const msg = result.status === 'Waitlisted'
                ? `Added to waitlist for ${result.courseName} (position ${result.waitlistPosition}).`
                : `Successfully enrolled in ${result.courseName}.`;
            setActionMessage({ type: 'success', text: msg });
            await Promise.all([handleSearchSections(), loadEnrollments()]);
            setConflictResults({});
        } catch (err) {
            const data = err.response?.data;
            // Keep the specific, user-helpful domain messages; fall back to a
            // sanitized friendly message for everything else.
            let text;
            if (data?.code === 'PREREQUISITES_NOT_MET' && data.unmetPrerequisites?.length)
                text = `Prerequisites not met: ${data.unmetPrerequisites.join(', ')}`;
            else if (data?.code === 'SCHEDULE_CONFLICT' && data.conflictingCourseCode)
                text = `Schedule conflict with ${data.conflictingCourseCode}. Please choose a different section.`;
            else if (data?.code === 'DUPLICATE_ENROLLMENT')
                text = 'This student is already enrolled in this section.';
            else
                text = getFriendlySimpleMessage(err, 'Enrollment could not be completed. Please try again.');
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
            await Promise.all([loadEnrollments(), courseId && handleSearchSections()]);
        } catch (err) {
            setActionMessage({ type: 'error', text: getFriendlySimpleMessage(err, 'Failed to drop enrollment.') });
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
            setActionMessage({ type: 'error', text: getFriendlySimpleMessage(err, 'Failed to load roster.') });
            setRosterModal(null);
        } finally {
            setLoadingRoster(false);
        }
    };

    const parseSchedule = (json) => {
        if (!json) return null;
        try { return JSON.parse(json); } catch { return null; }
    };

    // ── Program has no courses assigned yet? ────────────────────
    const programHasNoCourses = selectedProgramId && selectedProgram &&
        parseIds(selectedProgram.requiredCoursesJSON).length === 0 &&
        parseIds(selectedProgram.electivesJSON).length === 0;

    return (
        <div>
            <h2 className="text-primary-edulearn mb-4">
                <i className="bi bi-card-checklist me-2"></i>Enrollment
            </h2>

            {/* Top-right auto-dismissing toast for action results */}
            <Toast
                show={!!actionMessage}
                type={actionMessage?.type}
                message={actionMessage?.text}
                onClose={() => setActionMessage(null)}
            />

            {/* Search & Enroll panel */}
            <div className="card shadow-sm mb-4">
                <div className="card-header bg-primary-edulearn text-white">
                    <i className="bi bi-search me-2"></i>Search & Enroll
                </div>
                <div className="card-body">
                    <div className="row g-3 align-items-end">

                        {/* Row 1: Program + Student ID */}
                        <div className="col-md-5">
                            <label className="form-label fw-bold">
                                <i className="bi bi-mortarboard me-1"></i>Program
                                <small className="text-muted fw-normal ms-2">(filters courses)</small>
                            </label>
                            <select
                                className="form-select"
                                value={selectedProgramId}
                                onChange={e => {
                                    setSelectedProgramId(e.target.value);
                                    setShowAllCourses(false);
                                }}
                                disabled={loadingLookups}
                            >
                                <option value="">— All programs —</option>
                                {programs.map(p => (
                                    <option key={p.programID} value={p.programID}>
                                        {p.name} ({p.degreeType})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Student ID — hidden for students, visible for staff */}
                        {!isStudent && (
                            <div className="col-md-4">
                                <label className="form-label fw-bold">
                                    <i className="bi bi-person me-1"></i>Student ID
                                </label>
                                <input
                                    type="number"
                                    className={`form-control${errors.studentId ? ' is-invalid' : ''}`}
                                    value={studentId}
                                    onChange={e => setStudentId(e.target.value)}
                                    onBlur={e => setErrors(prev => ({ ...prev, studentId: validatePositiveId(e.target.value) }))}
                                    placeholder="Who you are enrolling/viewing"
                                    min="1"
                                />
                                {errors.studentId && <div className="invalid-feedback">{errors.studentId}</div>}
                            </div>
                        )}
                        {isStudent && studentId && (
                            <div className="col-md-4 d-flex align-items-end">
                                <div className="alert alert-success mb-0 py-2 px-3 w-100 small">
                                    <i className="bi bi-person-check-fill me-2"></i>
                                    <strong>You</strong> · Student {studentId}
                                </div>
                            </div>
                        )}

                        {/* Program warning / show all toggle */}
                        {selectedProgramId && !loadingLookups && (
                            <div className="col-md-3 d-flex align-items-end">
                                {programHasNoCourses ? (
                                    <div className="alert alert-warning mb-0 py-2 small w-100">
                                        <i className="bi bi-exclamation-triangle me-1"></i>
                                        No courses assigned to this program yet.
                                    </div>
                                ) : (
                                    <div className="form-check mb-0">
                                        <input
                                            className="form-check-input"
                                            type="checkbox"
                                            id="showAllCourses"
                                            checked={showAllCourses}
                                            onChange={e => setShowAllCourses(e.target.checked)}
                                        />
                                        <label className="form-check-label small text-muted" htmlFor="showAllCourses">
                                            Show all courses
                                        </label>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Row 2: Course + Term + Search */}
                        <div className="col-md-4">
                            <label className="form-label fw-bold">
                                <i className="bi bi-book me-1"></i>Course
                                {selectedProgramId && !showAllCourses && selectedProgram && !programHasNoCourses && (
                                    <span className="badge bg-primary ms-2" style={{ fontSize: 10 }}>
                                        {filteredCourses.length} in program
                                    </span>
                                )}
                            </label>
                            <select
                                className="form-select"
                                value={courseId}
                                onChange={e => setCourseId(e.target.value)}
                                disabled={loadingLookups}
                            >
                                <option value="">— Select a course —</option>
                                {filteredCourses.map(c => (
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
                                className={`form-control${errors.term ? ' is-invalid' : ''}`}
                                value={term}
                                onChange={e => setTerm(e.target.value)}
                                onBlur={e => setErrors(prev => ({ ...prev, term: validateTerm(e.target.value) }))}
                                placeholder="e.g. 2026-Spring"
                            />
                            {errors.term && <div className="invalid-feedback">{errors.term}</div>}
                        </div>

                        <div className="col-md-2">
                            <button
                                className="btn btn-primary-edulearn w-100"
                                onClick={handleSearchSections}
                                disabled={loadingSections || loadingLookups}
                            >
                                <i className="bi bi-search me-1"></i>Search
                            </button>
                        </div>

                    </div>

                    {/* Program info strip */}
                    {selectedProgram && !programHasNoCourses && !showAllCourses && (
                        <div className="mt-3 pt-3 border-top d-flex align-items-center gap-2 flex-wrap">
                            <i className="bi bi-mortarboard text-primary-edulearn"></i>
                            <span className="fw-bold text-primary-edulearn small">{selectedProgram.name}</span>
                            <span className="badge bg-secondary">{selectedProgram.degreeType}</span>
                            <span className="text-muted small">·</span>
                            <span className="text-muted small">
                                {parseIds(selectedProgram.requiredCoursesJSON).length} required
                            </span>
                            <span className="text-muted small">·</span>
                            <span className="text-muted small">
                                {parseIds(selectedProgram.electivesJSON).length} electives
                            </span>
                        </div>
                    )}
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
                                                        <i className="bi bi-calendar3 me-1"></i>{sched.days} {sched.time}
                                                    </>
                                                )}
                                                <span className="mx-2">·</span>
                                                <i className="bi bi-people me-1"></i>
                                                <span className={isFull ? 'text-danger fw-bold' : ''}>
                                                    {s.enrolledCount}/{s.capacity}{isFull && ' FULL'}
                                                </span>
                                                <span className="ms-2"><StatusBadge status={s.status} /></span>
                                            </div>
                                            {conflictResult && (
                                                <div className={`alert mt-2 mb-0 py-2 small alert-${conflictResult.hasConflict ? 'warning' : 'success'}`}>
                                                    <i className={`bi bi-${conflictResult.hasConflict ? 'exclamation-triangle' : 'check-circle'} me-2`}></i>
                                                    {conflictResult.conflictMessage}
                                                </div>
                                            )}
                                        </div>
                                        <div className="col-md-5 text-end">
                                            <div className="btn-group btn-group-sm">
                                                <button className="btn btn-outline-secondary" onClick={() => handleViewRoster(s)} title="View roster">
                                                    <i className="bi bi-list-ul me-1"></i>Roster
                                                </button>
                                                <button className="btn btn-outline-warning" onClick={() => handleCheckConflict(s)} disabled={isBusy || !studentId}>
                                                    <i className="bi bi-clock-history me-1"></i>Check Conflict
                                                </button>
                                                <button
                                                    className={`btn ${isFull ? 'btn-warning' : 'btn-primary-edulearn'}`}
                                                    onClick={() => handleEnroll(s)}
                                                    disabled={isBusy || !studentId || s.status !== 'Open'}
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

            {!loadingSections && sections.length === 0 && courseId && (
                <div className="alert alert-info">
                    <i className="bi bi-info-circle me-2"></i>
                    No sections found for the selected course and term.
                </div>
            )}

            {/* Student Enrollments */}
            <div className="card shadow-sm">
                <div className="card-header bg-primary-edulearn text-white d-flex justify-content-between align-items-center">
                    <span>
                        <i className="bi bi-bookmark-check me-2"></i>
                        Student Enrollments
                        {studentId && <span className="ms-2 badge bg-light text-dark">Student {studentId}</span>}
                    </span>
                    <button className="btn btn-sm btn-outline-light" onClick={loadEnrollments} disabled={!studentId || loadingEnrollments}>
                        <i className="bi bi-arrow-clockwise"></i>
                    </button>
                </div>
                <div className="card-body p-0">
                    {!studentId && (
                        <div className="text-center py-4 text-muted">
                            <i className="bi bi-person-x" style={{ fontSize: '2rem' }}></i>
                            <p className="mt-2 mb-0">
                                {isStudent ? 'Resolving your student record...' : 'Enter a Student ID above to view enrollments.'}
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
                                            <td>Enroll {e.enrollID}</td>
                                            <td className="fw-bold">{e.courseName}</td>
                                            <td>{e.term}</td>
                                            <td>
                                                <StatusBadge status={e.status} />
                                                {e.status === 'Waitlisted' && e.waitlistPosition && (
                                                    <span className="ms-2 badge bg-warning text-dark">{e.waitlistPosition}</span>
                                                )}
                                            </td>
                                            <td>
                                                {e.gradePostedFlag
                                                    ? <span className="badge bg-success">Posted</span>
                                                    : <span className="text-muted small">Pending</span>}
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
                        ? `Are you sure you want to drop ${dropConfirm.courseName} (${dropConfirm.term})? If anyone is on the waitlist, they will be auto-promoted.`
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
                                                <span><span className="badge bg-success me-1">Enrolled</span>{rosterData.filter(r => r.status === 'Enrolled').length}</span>
                                                <span><span className="badge bg-warning text-dark me-1">Waitlisted</span>{rosterData.filter(r => r.status === 'Waitlisted').length}</span>
                                                <span><span className="badge bg-secondary me-1">Dropped</span>{rosterData.filter(r => r.status === 'Dropped').length}</span>
                                            </div>
                                            <div className="table-responsive">
                                                <table className="table table-sm">
                                                    <thead><tr><th>No.</th><th>Student</th><th>Status</th><th>Waitlist Pos</th><th>Enrolled At</th></tr></thead>
                                                    <tbody>
                                                        {rosterData.map((r, idx) => (
                                                            <tr key={r.enrollID}>
                                                                <td>{idx + 1}</td>
                                                                <td>{r.studentName} <span className="text-muted small">{r.studentID}</span></td>
                                                                <td><StatusBadge status={r.status} /></td>
                                                                <td>{r.waitlistPosition || '—'}</td>
                                                                <td className="small">{r.enrolledAt ? new Date(r.enrolledAt).toLocaleDateString() : '—'}</td>
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
