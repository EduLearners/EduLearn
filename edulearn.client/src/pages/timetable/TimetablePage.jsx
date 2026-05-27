import { useState, useEffect } from 'react';
import { timetableService } from '../../services/timetableService';
import { sectionService } from '../../services/sectionService';
import { authService } from '../../services/authService';
import Loading from '../../components/Loading';
import ErrorAlert from '../../components/ErrorAlert';
import axiosClient from '../../api/axiosClient';

// Days shown in the grid header
const DAYS = [
    { key: 'mon', label: 'Mon', full: 'Monday' },
    { key: 'tue', label: 'Tue', full: 'Tuesday' },
    { key: 'wed', label: 'Wed', full: 'Wednesday' },
    { key: 'thu', label: 'Thu', full: 'Thursday' },
    { key: 'fri', label: 'Fri', full: 'Friday' },
    { key: 'sat', label: 'Sat', full: 'Saturday' },
];

const HOURS = Array.from({ length: 12 }, (_, i) => i + 8); // 8:00 to 19:00

const COLORS = [
    '#1a3c6e', '#0d6efd', '#198754', '#fd7e14',
    '#6f42c1', '#20c997', '#dc3545', '#6610f2',
];

// ── Helpers ───────────────────────────────────────────────────────
function parseTime(timeStr) {
    if (!timeStr) return null;
    const [h, m] = timeStr.split(':').map(n => parseInt(n, 10));
    return { hour: h, minute: m, total: h * 60 + m };
}

function parseScheduleJSON(json) {
    if (!json) return null;
    try {
        const obj = JSON.parse(json);
        if (!obj.days || !obj.time) return null;
        const dayTokens = obj.days
            .split(/[-,/]/)
            .map(d => d.trim().toLowerCase().slice(0, 3))
            .filter(Boolean);
        const [startStr, endStr] = obj.time.split('-').map(t => t.trim());
        const start = parseTime(startStr);
        const end = parseTime(endStr);
        if (!start || !end) return null;
        return { days: new Set(dayTokens), start, end, raw: obj };
    } catch {
        return null;
    }
}

// ── Calendar Grid (shared by all roles) ──────────────────────────
function TimetableGrid({ entries, onClickEntry }) {
    const decorated = entries.map((e, idx) => ({
        ...e,
        parsedSchedule: parseScheduleJSON(e.scheduleJSON),
        color: COLORS[idx % COLORS.length],
    }));

    const getEntriesForDayHour = (dayKey, hour) =>
        decorated.filter(e => {
            if (!e.parsedSchedule) return false;
            if (!e.parsedSchedule.days.has(dayKey)) return false;
            return e.parsedSchedule.start.hour === hour;
        });

    return (
        <>
            {/* Calendar grid */}
            <div className="card shadow-sm mb-4">
                <div className="card-header bg-light">
                    <strong><i className="bi bi-grid-3x3-gap me-2"></i>Weekly Schedule</strong>
                </div>
                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table table-bordered mb-0" style={{ tableLayout: 'fixed' }}>
                            <thead>
                                <tr className="bg-primary-edulearn text-white">
                                    <th style={{ width: 80 }} className="text-center">Time</th>
                                    {DAYS.map(d => (
                                        <th key={d.key} className="text-center">{d.full}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {HOURS.map(hour => (
                                    <tr key={hour} style={{ height: 64 }}>
                                        <td className="text-center align-middle bg-light small text-muted">
                                            {String(hour).padStart(2, '0')}:00
                                        </td>
                                        {DAYS.map(d => {
                                            const entries = getEntriesForDayHour(d.key, hour);
                                            return (
                                                <td key={d.key} className="p-1 align-top">
                                                    {entries.map(e => {
                                                        const startMin = e.parsedSchedule.start.minute;
                                                        const durationMin = e.parsedSchedule.end.total - e.parsedSchedule.start.total;
                                                        const height = (durationMin / 60) * 64;
                                                        return (
                                                            <div
                                                                key={e.sectionID}
                                                                onClick={() => onClickEntry(e)}
                                                                style={{
                                                                    backgroundColor: e.color,
                                                                    color: 'white',
                                                                    padding: '6px 8px',
                                                                    borderRadius: 4,
                                                                    marginTop: (startMin / 60) * 64,
                                                                    height: height - 4,
                                                                    overflow: 'hidden',
                                                                    cursor: 'pointer',
                                                                    fontSize: 11,
                                                                    lineHeight: 1.3,
                                                                }}
                                                                title={`${e.courseName} (${e.parsedSchedule.raw.time})`}
                                                            >
                                                                <div className="fw-bold text-truncate">
                                                                    {e.courseCode || e.courseName}
                                                                </div>
                                                                <div className="text-truncate" style={{ opacity: 0.9 }}>
                                                                    {e.parsedSchedule.raw.time}
                                                                </div>
                                                                {height > 50 && (
                                                                    <div className="text-truncate" style={{ opacity: 0.85, fontSize: 10 }}>
                                                                        {e.roomInfo || e.instructorName}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* List view */}
            <div className="card shadow-sm">
                <div className="card-header bg-light">
                    <strong><i className="bi bi-list-ul me-2"></i>
                        {decorated[0]?.isTeaching ? 'My Teaching Sections' : 'Enrolled Courses'}
                    </strong>
                </div>
                <div className="list-group list-group-flush">
                    {decorated.map(e => (
                        <div key={e.sectionID} className="list-group-item d-flex align-items-center">
                            <div style={{
                                width: 6, alignSelf: 'stretch',
                                backgroundColor: e.color, borderRadius: 3, marginRight: 12,
                            }} />
                            <div className="flex-grow-1">
                                <div className="fw-bold">
                                    {e.courseCode ? `${e.courseCode} — ` : ''}{e.courseName}
                                </div>
                                <div className="small text-muted">
                                    {e.isTeaching ? (
                                        <>
                                            <i className="bi bi-people me-1"></i>{e.enrolledCount}/{e.capacity} students
                                            {e.parsedSchedule && (
                                                <><span className="mx-2">·</span>
                                                <i className="bi bi-clock me-1"></i>
                                                {e.parsedSchedule.raw.days} {e.parsedSchedule.raw.time}</>
                                            )}
                                            <span className="mx-2">·</span>
                                            <i className="bi bi-hash"></i>Section {e.sectionID}
                                        </>
                                    ) : (
                                        <>
                                            <i className="bi bi-person-badge me-1"></i>{e.instructorName || 'TBA'}
                                            {e.parsedSchedule && (
                                                <><span className="mx-2">·</span>
                                                <i className="bi bi-clock me-1"></i>
                                                {e.parsedSchedule.raw.days} {e.parsedSchedule.raw.time}</>
                                            )}
                                            <span className="mx-2">·</span>
                                            <i className="bi bi-hash"></i>Section {e.sectionID}
                                        </>
                                    )}
                                </div>
                            </div>
                            <span className={`badge ${e.isTeaching ? 'bg-primary' : 'bg-success'}`}>
                                {e.isTeaching ? e.status : (e.status || 'Enrolled')}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}

// ── Entry Detail Modal ────────────────────────────────────────────
function EntryModal({ entry, onClose }) {
    if (!entry) return null;
    return (
        <>
            <div className="modal-backdrop fade show"></div>
            <div className="modal fade show d-block" tabIndex="-1">
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content">
                        <div className="modal-header text-white" style={{ backgroundColor: entry.color }}>
                            <h5 className="modal-title">
                                {entry.courseCode ? `${entry.courseCode} — ` : ''}{entry.courseName}
                            </h5>
                            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
                        </div>
                        <div className="modal-body">
                            <dl className="row mb-0">
                                <dt className="col-sm-4 text-muted">Section</dt>
                                <dd className="col-sm-8">#{entry.sectionID}</dd>

                                <dt className="col-sm-4 text-muted">Term</dt>
                                <dd className="col-sm-8">{entry.term}</dd>

                                {entry.isTeaching ? (
                                    <>
                                        <dt className="col-sm-4 text-muted">Enrolled</dt>
                                        <dd className="col-sm-8">{entry.enrolledCount} / {entry.capacity} students</dd>
                                    </>
                                ) : (
                                    <>
                                        <dt className="col-sm-4 text-muted">Instructor</dt>
                                        <dd className="col-sm-8">{entry.instructorName || 'TBA'}</dd>
                                    </>
                                )}

                                <dt className="col-sm-4 text-muted">Schedule</dt>
                                <dd className="col-sm-8">
                                    {entry.parsedSchedule
                                        ? `${entry.parsedSchedule.raw.days} · ${entry.parsedSchedule.raw.time}`
                                        : '—'}
                                </dd>

                                <dt className="col-sm-4 text-muted">Status</dt>
                                <dd className="col-sm-8">
                                    <span className={`badge ${entry.isTeaching ? 'bg-primary' : 'bg-success'}`}>
                                        {entry.status}
                                    </span>
                                </dd>
                            </dl>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Close</button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

// ── Main Component ────────────────────────────────────────────────
export default function TimetablePage() {
    const { role, userId, username } = authService.getCurrentUser();
    const isStudent = role === 'Student';
    const isInstructor = role === 'Instructor';
    const isAdmin = ['Registrar', 'ITAdmin'].includes(role);

    const [term, setTerm] = useState(() => {
        const month = new Date().getMonth() + 1;
        const year = new Date().getFullYear();
        return month >= 7 ? `${year}-Fall` : `${year}-Spring`;
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedEntry, setSelectedEntry] = useState(null);

    // Student state
    const [studentTimetable, setStudentTimetable] = useState(null);
    const [studentId, setStudentId] = useState(() => localStorage.getItem('timetable_lastStudentId') || '');

    // Instructor state
    const [instructorEntries, setInstructorEntries] = useState([]);

    // Admin — lookup any student
    const [adminStudentId, setAdminStudentId] = useState('');
    const [adminTimetable, setAdminTimetable] = useState(null);

    // ── Auto-load on mount ────────────────────────────────────────
    useEffect(() => {
        if (isStudent) {
            autoLoadStudent();
        } else if (isInstructor) {
            loadInstructorSchedule();
        }
    }, []);

    useEffect(() => {
        if (isInstructor && term) {
            loadInstructorSchedule();
        }
    }, [term]);

    // ── Student: resolve own StudentID then load timetable ─────────
    const autoLoadStudent = async () => {
        try {
            setLoading(true);
            setError(null);
            const studentRecord = await axiosClient.get('/students/me').then(r => r.data).catch(() => null);
            if (studentRecord?.studentID) {
                const sid = String(studentRecord.studentID);
                setStudentId(sid);
                localStorage.setItem('timetable_lastStudentId', sid);
                const data = await timetableService.getStudentTimetable(sid, term);
                setStudentTimetable(data);
            } else {
                // Fallback: try stored studentId
                const storedId = localStorage.getItem('timetable_lastStudentId');
                if (storedId) {
                    const data = await timetableService.getStudentTimetable(storedId, term);
                    setStudentTimetable(data);
                }
            }
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    const refreshStudentTimetable = async () => {
        if (!studentId || !term) return;
        try {
            setLoading(true);
            setError(null);
            const data = await timetableService.getStudentTimetable(studentId, term);
            setStudentTimetable(data);
            localStorage.setItem('timetable_lastStudentId', studentId);
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    // ── Instructor: build schedule from assigned sections ──────────
    const loadInstructorSchedule = async () => {
        if (!userId) return;
        try {
            setLoading(true);
            setError(null);
            const sections = await sectionService.getByInstructor(userId);
            // Filter by selected term
            const filtered = (sections || []).filter(s =>
                !term || s.term.toLowerCase() === term.toLowerCase()
            );
            // Mark as "isTeaching" so the grid renders the right labels
            const entries = filtered.map(s => ({
                sectionID: s.sectionID,
                courseID: s.courseID,
                courseCode: null,          // not in SectionResponseDto, courseName used instead
                courseName: s.courseName,
                instructorName: s.instructorName,
                term: s.term,
                scheduleJSON: s.scheduleJSON,
                status: s.status,
                enrolledCount: s.enrolledCount,
                capacity: s.capacity,
                isTeaching: true,          // flag for rendering
            }));
            setInstructorEntries(entries);
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    // ── Admin: load any student's timetable ────────────────────────
    const loadAdminTimetable = async () => {
        if (!adminStudentId || !term) return;
        try {
            setLoading(true);
            setError(null);
            const data = await timetableService.getStudentTimetable(adminStudentId, term);
            setAdminTimetable(data);
            localStorage.setItem('timetable_lastStudentId', adminStudentId);
        } catch (err) {
            setError(err);
            setAdminTimetable(null);
        } finally {
            setLoading(false);
        }
    };

    // ── Render ─────────────────────────────────────────────────────

    // ── INSTRUCTOR VIEW ──────────────────────────────────────────
    if (isInstructor) {
        return (
            <div>
                <h2 className="text-primary-edulearn mb-4">
                    <i className="bi bi-calendar3 me-2"></i>My Teaching Schedule
                </h2>

                {/* Term selector only */}
                <div className="card shadow-sm mb-4">
                    <div className="card-body">
                        <div className="row g-3 align-items-end">
                            <div className="col-md-4">
                                <label className="form-label fw-bold">
                                    <i className="bi bi-calendar me-1"></i>Term
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={term}
                                    onChange={e => setTerm(e.target.value)}
                                    placeholder="e.g. 2026-Spring"
                                />
                            </div>
                            <div className="col-md-3">
                                <button
                                    className="btn btn-primary-edulearn w-100"
                                    onClick={loadInstructorSchedule}
                                    disabled={loading}
                                >
                                    <i className="bi bi-arrow-clockwise me-1"></i>Refresh
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <ErrorAlert error={error} onDismiss={() => setError(null)} />
                {loading && <Loading message="Loading your teaching schedule..." />}

                {!loading && instructorEntries.length > 0 && (
                    <>
                        {/* Summary banner */}
                        <div className="card shadow-sm mb-3">
                            <div className="card-body py-3">
                                <div className="row g-3 align-items-center">
                                    <div className="col-md-6">
                                        <h5 className="mb-0">
                                            <i className="bi bi-person-workspace text-primary-edulearn me-2"></i>
                                            {username}
                                            <span className="badge bg-primary ms-2 fs-6">Instructor</span>
                                        </h5>
                                        <small className="text-muted">Term: <strong>{term}</strong></small>
                                    </div>
                                    <div className="col-md-3 text-center">
                                        <div className="display-6 text-primary-edulearn fw-bold">
                                            {instructorEntries.length}
                                        </div>
                                        <small className="text-muted">
                                            {instructorEntries.length === 1 ? 'Section' : 'Sections'}
                                        </small>
                                    </div>
                                    <div className="col-md-3 text-center">
                                        <div className="display-6 text-primary-edulearn fw-bold">
                                            {instructorEntries.reduce((sum, e) => sum + (e.enrolledCount || 0), 0)}
                                        </div>
                                        <small className="text-muted">Total Students</small>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <TimetableGrid
                            entries={instructorEntries}
                            onClickEntry={e => setSelectedEntry({ ...e, parsedSchedule: parseScheduleJSON(e.scheduleJSON), color: COLORS[instructorEntries.indexOf(instructorEntries.find(x => x.sectionID === e.sectionID)) % COLORS.length] })}
                        />
                    </>
                )}

                {!loading && instructorEntries.length === 0 && (
                    <div className="alert alert-info">
                        <i className="bi bi-info-circle me-2"></i>
                        No sections assigned to you for <strong>{term}</strong>.
                        Contact the Registrar to be assigned to a section.
                    </div>
                )}

                <EntryModal entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
            </div>
        );
    }

    // ── STUDENT VIEW ─────────────────────────────────────────────
    if (isStudent) {
        const entries = (studentTimetable?.entries || []);
        return (
            <div>
                <h2 className="text-primary-edulearn mb-4">
                    <i className="bi bi-calendar3 me-2"></i>My Timetable
                </h2>

                {/* Term selector only — StudentID is auto-detected */}
                <div className="card shadow-sm mb-4">
                    <div className="card-body">
                        <div className="row g-3 align-items-end">
                            <div className="col-md-4">
                                <label className="form-label fw-bold">
                                    <i className="bi bi-calendar me-1"></i>Term
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={term}
                                    onChange={e => setTerm(e.target.value)}
                                    placeholder="e.g. 2026-Spring"
                                />
                            </div>
                            <div className="col-md-3">
                                <button
                                    className="btn btn-primary-edulearn w-100"
                                    onClick={refreshStudentTimetable}
                                    disabled={loading}
                                >
                                    <i className="bi bi-arrow-clockwise me-1"></i>Refresh
                                </button>
                            </div>
                            <div className="col-md-5 d-flex align-items-end">
                                <small className="text-muted">
                                    <i className="bi bi-info-circle me-1"></i>
                                    Showing your enrolled sections automatically.
                                </small>
                            </div>
                        </div>
                    </div>
                </div>

                <ErrorAlert error={error} onDismiss={() => setError(null)} />
                {loading && <Loading message="Loading your timetable..." />}

                {!loading && studentTimetable && (
                    <>
                        <div className="card shadow-sm mb-3">
                            <div className="card-body py-3">
                                <div className="row g-3 align-items-center">
                                    <div className="col-md-6">
                                        <h5 className="mb-0">
                                            <i className="bi bi-person-fill text-primary-edulearn me-2"></i>
                                            {studentTimetable.studentName}
                                        </h5>
                                        <small className="text-muted">Term: <strong>{studentTimetable.term}</strong></small>
                                    </div>
                                    <div className="col-md-3 text-center">
                                        <div className="display-6 text-primary-edulearn fw-bold">{studentTimetable.totalSections}</div>
                                        <small className="text-muted">Sections</small>
                                    </div>
                                    <div className="col-md-3 text-center">
                                        <div className="display-6 text-primary-edulearn fw-bold">{studentTimetable.totalCredits}</div>
                                        <small className="text-muted">Total Credits</small>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {entries.length === 0 ? (
                            <div className="alert alert-info">
                                <i className="bi bi-info-circle me-2"></i>
                                No enrolled sections in <strong>{term}</strong>.
                                Visit the <a href="/enrollment">Enrollment</a> page to enroll.
                            </div>
                        ) : (
                            <TimetableGrid
                                entries={entries}
                                onClickEntry={e => setSelectedEntry({
                                    ...e,
                                    parsedSchedule: parseScheduleJSON(e.scheduleJSON),
                                    color: COLORS[entries.indexOf(entries.find(x => x.sectionID === e.sectionID)) % COLORS.length],
                                })}
                            />
                        )}
                    </>
                )}

                <EntryModal entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
            </div>
        );
    }

    // ── ADMIN / REGISTRAR VIEW — lookup any student ───────────────
    return (
        <div>
            <h2 className="text-primary-edulearn mb-4">
                <i className="bi bi-calendar3 me-2"></i>Timetable
            </h2>

            <div className="card shadow-sm mb-4">
                <div className="card-body">
                    <div className="row g-3 align-items-end">
                        <div className="col-md-4">
                            <label className="form-label fw-bold">
                                <i className="bi bi-person me-1"></i>Student ID
                            </label>
                            <input
                                type="number"
                                className="form-control"
                                value={adminStudentId}
                                onChange={e => setAdminStudentId(e.target.value)}
                                placeholder="Enter student ID"
                                min="1"
                            />
                        </div>
                        <div className="col-md-4">
                            <label className="form-label fw-bold">
                                <i className="bi bi-calendar me-1"></i>Term
                            </label>
                            <input
                                type="text"
                                className="form-control"
                                value={term}
                                onChange={e => setTerm(e.target.value)}
                                placeholder="e.g. 2026-Spring"
                            />
                        </div>
                        <div className="col-md-4">
                            <button
                                className="btn btn-primary-edulearn w-100"
                                onClick={loadAdminTimetable}
                                disabled={!adminStudentId || !term || loading}
                            >
                                <i className="bi bi-search me-1"></i>Load Timetable
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <ErrorAlert error={error} onDismiss={() => setError(null)} />
            {loading && <Loading message="Loading timetable..." />}

            {!loading && adminTimetable && (
                <>
                    <div className="card shadow-sm mb-3">
                        <div className="card-body py-3">
                            <div className="row g-3 align-items-center">
                                <div className="col-md-6">
                                    <h5 className="mb-0">
                                        <i className="bi bi-person-fill text-primary-edulearn me-2"></i>
                                        {adminTimetable.studentName}
                                    </h5>
                                    <small className="text-muted">Term: <strong>{adminTimetable.term}</strong></small>
                                </div>
                                <div className="col-md-3 text-center">
                                    <div className="display-6 text-primary-edulearn fw-bold">{adminTimetable.totalSections}</div>
                                    <small className="text-muted">Sections</small>
                                </div>
                                <div className="col-md-3 text-center">
                                    <div className="display-6 text-primary-edulearn fw-bold">{adminTimetable.totalCredits}</div>
                                    <small className="text-muted">Total Credits</small>
                                </div>
                            </div>
                        </div>
                    </div>

                    {adminTimetable.entries.length === 0 ? (
                        <div className="alert alert-info">
                            <i className="bi bi-info-circle me-2"></i>
                            No enrolled sections for this student in <strong>{term}</strong>.
                        </div>
                    ) : (
                        <TimetableGrid
                            entries={adminTimetable.entries}
                            onClickEntry={e => setSelectedEntry({
                                ...e,
                                parsedSchedule: parseScheduleJSON(e.scheduleJSON),
                                color: COLORS[adminTimetable.entries.indexOf(adminTimetable.entries.find(x => x.sectionID === e.sectionID)) % COLORS.length],
                            })}
                        />
                    )}
                </>
            )}

            <EntryModal entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
        </div>
    );
}
