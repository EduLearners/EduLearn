import { useState, useEffect } from 'react';
import { timetableService } from '../../services/timetableService';
import { authService } from '../../services/authService';
import Loading from '../../components/Loading';
import ErrorAlert from '../../components/ErrorAlert';

// Days shown in the grid header
const DAYS = [
    { key: 'mon', label: 'Mon', full: 'Monday' },
    { key: 'tue', label: 'Tue', full: 'Tuesday' },
    { key: 'wed', label: 'Wed', full: 'Wednesday' },
    { key: 'thu', label: 'Thu', full: 'Thursday' },
    { key: 'fri', label: 'Fri', full: 'Friday' },
    { key: 'sat', label: 'Sat', full: 'Saturday' },
];

// Time rows shown vertically (each row = 1 hour)
const HOURS = Array.from({ length: 12 }, (_, i) => i + 8); // 8:00 to 19:00

// A palette of background colors for course blocks (cycles through if many courses)
const COLORS = [
    '#1a3c6e', // navy (primary)
    '#0d6efd', // blue
    '#198754', // green
    '#fd7e14', // orange
    '#6f42c1', // purple
    '#20c997', // teal
    '#dc3545', // red
    '#6610f2', // indigo
];

// Helpers ─────────────────────────────────────────────────────────
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

        // Normalize days into a Set of lower-case 3-letter keys
        const dayTokens = obj.days
            .split(/[-,/]/)
            .map(d => d.trim().toLowerCase().slice(0, 3))
            .filter(Boolean);

        // Parse time range "10:00-11:00"
        const [startStr, endStr] = obj.time.split('-').map(t => t.trim());
        const start = parseTime(startStr);
        const end = parseTime(endStr);
        if (!start || !end) return null;

        return { days: new Set(dayTokens), start, end, raw: obj };
    } catch {
        return null;
    }
}

// Component ───────────────────────────────────────────────────────
export default function TimetablePage() {
    const [studentId, setStudentId] = useState(() => localStorage.getItem('lastStudentId') || '');
    const [term, setTerm] = useState('2026-Spring');
    const [timetable, setTimetable] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedEntry, setSelectedEntry] = useState(null);

    const { role } = authService.getCurrentUser();
    const isStudent = role === 'Student';

    // Auto-load on student/term change
    useEffect(() => {
        if (studentId && /^\d+$/.test(studentId) && term) {
            loadTimetable();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [studentId, term]);

    const loadTimetable = async () => {
        if (!studentId || !term) return;
        try {
            setLoading(true);
            setError(null);
            const data = await timetableService.getStudentTimetable(studentId, term);
            setTimetable(data);
            localStorage.setItem('lastStudentId', studentId);
        } catch (err) {
            setError(err);
            setTimetable(null);
        } finally {
            setLoading(false);
        }
    };

    // Decorate entries with parsed schedule + color
    const decoratedEntries = (timetable?.entries || []).map((e, idx) => ({
        ...e,
        parsedSchedule: parseScheduleJSON(e.scheduleJSON),
        color: COLORS[idx % COLORS.length],
    }));

    // Compute which entries fall on a given day/hour slot, with their vertical offset
    const getEntriesForDayHour = (dayKey, hour) => {
        return decoratedEntries
            .filter(e => {
                if (!e.parsedSchedule) return false;
                if (!e.parsedSchedule.days.has(dayKey)) return false;
                return e.parsedSchedule.start.hour === hour;
            });
    };

    return (
        <div>
            <h2 className="text-primary-edulearn mb-4">
                <i className="bi bi-calendar3 me-2"></i>Timetable
            </h2>

            {/* Filter card */}
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
                                value={studentId}
                                onChange={(e) => setStudentId(e.target.value)}
                                placeholder="e.g. 1"
                                min="1"
                            />
                            <small className="text-muted">
                                {isStudent
                                    ? 'Enter your student ID (find on profile page)'
                                    : 'Whose timetable to view'}
                            </small>
                        </div>

                        <div className="col-md-4">
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

                        <div className="col-md-4">
                            <button
                                className="btn btn-primary-edulearn w-100"
                                onClick={loadTimetable}
                                disabled={!studentId || !term || loading}
                            >
                                <i className="bi bi-arrow-clockwise me-1"></i>Refresh
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <ErrorAlert error={error} onDismiss={() => setError(null)} />

            {loading && <Loading message="Loading timetable..." />}

            {/* Summary banner */}
            {!loading && timetable && (
                <div className="card shadow-sm mb-3">
                    <div className="card-body py-3">
                        <div className="row g-3 align-items-center">
                            <div className="col-md-6">
                                <h5 className="mb-0">
                                    <i className="bi bi-person-fill text-primary-edulearn me-2"></i>
                                    {timetable.studentName}
                                </h5>
                                <small className="text-muted">
                                    Term: <strong>{timetable.term}</strong>
                                </small>
                            </div>
                            <div className="col-md-3 text-center">
                                <div className="display-6 text-primary-edulearn fw-bold">
                                    {timetable.totalSections}
                                </div>
                                <small className="text-muted">Sections</small>
                            </div>
                            <div className="col-md-3 text-center">
                                <div className="display-6 text-primary-edulearn fw-bold">
                                    {timetable.totalCredits}
                                </div>
                                <small className="text-muted">Total Credits</small>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Empty state */}
            {!loading && timetable && timetable.entries.length === 0 && (
                <div className="alert alert-info">
                    <i className="bi bi-info-circle me-2"></i>
                    No enrolled sections in this term. Visit the <a href="/enrollment">Enrollment</a> page to add some.
                </div>
            )}

            {/* Calendar grid */}
            {!loading && timetable && timetable.entries.length > 0 && (
                <div className="card shadow-sm">
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
                                                            const durationMin =
                                                                e.parsedSchedule.end.total - e.parsedSchedule.start.total;
                                                            const height = (durationMin / 60) * 64;
                                                            return (
                                                                <div
                                                                    key={e.sectionID}
                                                                    onClick={() => setSelectedEntry(e)}
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
                                                                    <div className="fw-bold text-truncate">{e.courseCode}</div>
                                                                    <div className="text-truncate" style={{ opacity: 0.9 }}>
                                                                        {e.parsedSchedule.raw.time}
                                                                    </div>
                                                                    {height > 50 && (
                                                                        <div className="text-truncate" style={{ opacity: 0.85, fontSize: 10 }}>
                                                                            {e.instructorName}
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
            )}

            {/* Course list (text view) */}
            {!loading && timetable && timetable.entries.length > 0 && (
                <div className="card shadow-sm mt-4">
                    <div className="card-header bg-light">
                        <strong><i className="bi bi-list-ul me-2"></i>Enrolled Courses</strong>
                    </div>
                    <div className="list-group list-group-flush">
                        {decoratedEntries.map(e => (
                            <div key={e.sectionID} className="list-group-item d-flex align-items-center">
                                <div
                                    style={{
                                        width: 6,
                                        alignSelf: 'stretch',
                                        backgroundColor: e.color,
                                        borderRadius: 3,
                                        marginRight: 12,
                                    }}
                                />
                                <div className="flex-grow-1">
                                    <div className="fw-bold">
                                        {e.courseCode} — {e.courseName}
                                    </div>
                                    <div className="small text-muted">
                                        <i className="bi bi-person-badge me-1"></i>{e.instructorName || 'TBA'}
                                        {e.parsedSchedule && (
                                            <>
                                                <span className="mx-2">·</span>
                                                <i className="bi bi-clock me-1"></i>
                                                {e.parsedSchedule.raw.days} {e.parsedSchedule.raw.time}
                                            </>
                                        )}
                                        <span className="mx-2">·</span>
                                        <i className="bi bi-hash"></i>Section {e.sectionID}
                                    </div>
                                </div>
                                <span className="badge bg-success">{e.status}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Section detail modal */}
            {selectedEntry && (
                <>
                    <div className="modal-backdrop fade show"></div>
                    <div className="modal fade show d-block" tabIndex="-1">
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content">
                                <div
                                    className="modal-header text-white"
                                    style={{ backgroundColor: selectedEntry.color }}
                                >
                                    <h5 className="modal-title">
                                        {selectedEntry.courseCode} — {selectedEntry.courseName}
                                    </h5>
                                    <button
                                        type="button"
                                        className="btn-close btn-close-white"
                                        onClick={() => setSelectedEntry(null)}
                                    ></button>
                                </div>
                                <div className="modal-body">
                                    <dl className="row mb-0">
                                        <dt className="col-sm-4 text-muted">Section ID</dt>
                                        <dd className="col-sm-8">#{selectedEntry.sectionID}</dd>

                                        <dt className="col-sm-4 text-muted">Term</dt>
                                        <dd className="col-sm-8">{selectedEntry.term}</dd>

                                        <dt className="col-sm-4 text-muted">Instructor</dt>
                                        <dd className="col-sm-8">{selectedEntry.instructorName || 'TBA'}</dd>

                                        <dt className="col-sm-4 text-muted">Schedule</dt>
                                        <dd className="col-sm-8">
                                            {selectedEntry.parsedSchedule
                                                ? `${selectedEntry.parsedSchedule.raw.days} · ${selectedEntry.parsedSchedule.raw.time}`
                                                : '—'}
                                        </dd>

                                        <dt className="col-sm-4 text-muted">Status</dt>
                                        <dd className="col-sm-8">
                                            <span className="badge bg-success">{selectedEntry.status}</span>
                                        </dd>
                                    </dl>
                                </div>
                                <div className="modal-footer">
                                    <button
                                        type="button"
                                        className="btn btn-outline-secondary"
                                        onClick={() => setSelectedEntry(null)}
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
