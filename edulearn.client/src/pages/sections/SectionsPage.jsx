import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sectionService } from '../../services/sectionService';
import { courseService } from '../../services/courseService';
import { userService } from '../../services/userService';
import { roomService } from '../../services/roomService';
import { authService } from '../../services/authService';
import Loading from '../../components/Loading';
import ErrorAlert from '../../components/ErrorAlert';
import StatusBadge from '../../components/StatusBadge';
import ModalPortal from '../../components/ModalPortal';

const DAYS_OPTIONS = [
    'Mon-Wed-Fri',
    'Tue-Thu',
    'Mon-Wed',
    'Wed-Fri',
    'Mon',
    'Tue',
    'Wed',
    'Thu',
    'Fri',
    'Sat',
];

const emptyForm = {
    courseID: '',
    term: '',
    instructorID: '',
    roomID: '',
    capacity: 30,
    scheduleDays: 'Mon-Wed-Fri',
    scheduleTime: '10:00-11:00',
};

export default function SectionsPage() {
    const navigate = useNavigate();

    const [courses, setCourses] = useState([]);
    const [instructors, setInstructors] = useState([]);
    const [rooms, setRooms] = useState([]);

    const [filterCourseId, setFilterCourseId] = useState('');
    const [filterTerm, setFilterTerm] = useState('2026-Spring');

    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [error, setError] = useState(null);
    const [loadingLookups, setLoadingLookups] = useState(true);

    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState(null);

    const { role } = authService.getCurrentUser();
    const canManage = ['Registrar', 'DeptAdmin', 'ITAdmin'].includes(role);

    useEffect(() => {
        loadLookups();
    }, []);

    const loadLookups = async () => {
        try {
            setLoadingLookups(true);

            const [coursesResult, instructorsResult, roomsResult] = await Promise.allSettled([
                courseService.getAll(),
                userService.getByRole('Instructor'),
                roomService.getAll(),
            ]);

            if (coursesResult.status === 'fulfilled') {
                setCourses(coursesResult.value || []);
            } else {
                console.error('[Sections] Failed to load courses:', coursesResult.reason);
                setError(coursesResult.reason);
            }

            if (instructorsResult.status === 'fulfilled') {
                setInstructors(instructorsResult.value || []);
            } else {
                console.warn('[Sections] Failed to load instructors:', instructorsResult.reason);
            }

            if (roomsResult.status === 'fulfilled') {
                setRooms(roomsResult.value || []);
            } else {
                console.warn('[Sections] Failed to load rooms:', roomsResult.reason);
            }
        } finally {
            setLoadingLookups(false);
        }
    };

    const handleSearch = async () => {
        if (!filterCourseId || !filterTerm.trim()) {
            setError({ message: 'Please select a course and enter a term.' });
            return;
        }
        try {
            setLoading(true);
            setError(null);
            const data = await sectionService.getByCourseAndTerm(filterCourseId, filterTerm.trim());
            setSections(data || []);
            setHasSearched(true);
        } catch (err) {
            if (err.response?.status === 404 && err.response?.data?.code === 'SECTIONS_NOT_FOUND') {
                setSections([]);
                setHasSearched(true);
            } else {
                setError(err);
            }
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        setEditingId(null);
        setForm({ ...emptyForm, courseID: filterCourseId || '', term: filterTerm || '' });
        setFormError(null);
        setShowModal(true);
    };

    const openEditModal = (section) => {
        let days = 'Mon-Wed-Fri';
        let time = '10:00-11:00';
        if (section.scheduleJSON) {
            try {
                const sched = JSON.parse(section.scheduleJSON);
                if (sched.days) days = sched.days;
                if (sched.time) time = sched.time;
            } catch { /* ignore */ }
        }
        setEditingId(section.sectionID);
        setForm({
            courseID: section.courseID,
            term: section.term,
            instructorID: section.instructorID,
            roomID: section.roomID || '',
            capacity: section.capacity,
            scheduleDays: days,
            scheduleTime: time,
        });
        setFormError(null);
        setShowModal(true);
    };

    const closeModal = () => {
        if (saving) return;
        setShowModal(false);
        setFormError(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError(null);
        setSaving(true);
        try {
            const payload = {
                courseID: parseInt(form.courseID, 10),
                term: form.term,
                instructorID: parseInt(form.instructorID, 10),
                roomID: form.roomID ? parseInt(form.roomID, 10) : null,
                capacity: parseInt(form.capacity, 10),
                scheduleJSON: JSON.stringify({ days: form.scheduleDays, time: form.scheduleTime }),
            };
            if (editingId) {
                await sectionService.update(editingId, payload);
            } else {
                await sectionService.create(payload);
            }
            setShowModal(false);
            if (payload.courseID === parseInt(filterCourseId, 10) && payload.term === filterTerm.trim()) {
                await handleSearch();
            }
        } catch (err) {
            setFormError(err);
        } finally {
            setSaving(false);
        }
    };

    const parseSchedule = (json) => {
        if (!json) return null;
        try { return JSON.parse(json); } catch { return null; }
    };

    return (
        <div>
            <div className="d-flex align-items-center justify-content-between mb-4">
                <h2 className="text-primary-edulearn mb-0">
                    <i className="bi bi-collection me-2"></i>Sections
                </h2>
                {canManage && (
                    <button className="btn btn-primary-edulearn" onClick={openCreateModal} disabled={loadingLookups}>
                        <i className="bi bi-plus-lg me-2"></i>New Section
                    </button>
                )}
            </div>

            <div className="card shadow-sm mb-3">
                <div className="card-body">
                    <p className="text-muted small mb-3">
                        <i className="bi bi-info-circle me-2"></i>
                        Select a course and term to view its sections.
                    </p>
                    <div className="row g-3 align-items-end">
                        <div className="col-md-6">
                            <label className="form-label fw-bold"><i className="bi bi-book me-1"></i>Course</label>
                            <select
                                className="form-select"
                                value={filterCourseId}
                                onChange={(e) => setFilterCourseId(e.target.value)}
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
                        <div className="col-md-4">
                            <label className="form-label fw-bold"><i className="bi bi-calendar me-1"></i>Term</label>
                            <input
                                type="text"
                                className="form-control"
                                value={filterTerm}
                                onChange={(e) => setFilterTerm(e.target.value)}
                                placeholder="e.g. 2026-Spring"
                            />
                        </div>
                        <div className="col-md-2">
                            <button
                                className="btn btn-primary-edulearn w-100"
                                onClick={handleSearch}
                                disabled={loading || loadingLookups}
                            >
                                <i className="bi bi-search me-1"></i>Search
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <ErrorAlert error={error} onDismiss={() => setError(null)} />

            {(loading || loadingLookups) && (
                <Loading message={loadingLookups ? 'Loading reference data...' : 'Searching...'} />
            )}

            {!loading && hasSearched && (
                <div className="card shadow-sm">
                    <div className="card-body p-0">
                        {sections.length === 0 ? (
                            <div className="text-center py-5 text-muted">
                                <i className="bi bi-inbox" style={{ fontSize: '3rem' }}></i>
                                <p className="mt-3 mb-0">No sections found for this course and term.</p>
                                {canManage && (
                                    <button className="btn btn-link mt-2" onClick={openCreateModal}>
                                        <i className="bi bi-plus-lg me-1"></i>Create the first one
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <table className="table table-hover mb-0">
                                    <thead className="bg-primary-edulearn text-white">
                                        <tr>
                                            <th>ID</th>
                                            <th>Course</th>
                                            <th>Term</th>
                                            <th>Instructor</th>
                                            <th>Schedule</th>
                                            <th>Capacity</th>
                                            <th>Status</th>
                                            {canManage && <th className="text-end pe-3">Actions</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sections.map(s => {
                                            const sched = parseSchedule(s.scheduleJSON);
                                            const isFull = s.enrolledCount >= s.capacity;
                                            return (
                                                <tr key={s.sectionID}>
                                                    <td>Section {s.sectionID}</td>
                                                    <td className="fw-bold">{s.courseName}</td>
                                                    <td>{s.term}</td>
                                                    <td>{s.instructorName || '—'}</td>
                                                    <td>
                                                        {sched ? (
                                                            <small>
                                                                <i className="bi bi-calendar3 me-1 text-muted"></i>
                                                                {sched.days}{sched.time && <> · {sched.time}</>}
                                                            </small>
                                                        ) : (
                                                            <small className="text-muted">No schedule</small>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <span className={isFull ? 'text-danger fw-bold' : ''}>
                                                            <i className="bi bi-people me-1 text-muted"></i>
                                                            {s.enrolledCount}/{s.capacity}
                                                        </span>
                                                    </td>
                                                    <td><StatusBadge status={s.status} /></td>
                                                    {canManage && (
                                                        <td className="text-end pe-3">
                                                            <button
                                                                className="btn btn-sm btn-outline-secondary"
                                                                onClick={() => openEditModal(s)}
                                                                title="Edit"
                                                            >
                                                                <i className="bi bi-pencil"></i>
                                                            </button>
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                    {sections.length > 0 && (
                        <div className="card-footer text-muted small">
                            {sections.length} {sections.length === 1 ? 'section' : 'sections'} found
                        </div>
                    )}
                </div>
            )}

            {showModal && (
                <ModalPortal>
                    <div className="modal-backdrop fade show"></div>
                    <div className="modal fade show d-block" tabIndex="-1">
                        <div className="modal-dialog modal-dialog-centered modal-lg">
                            <div className="modal-content">
                                <div className="modal-header bg-primary-edulearn text-white">
                                    <h5 className="modal-title">
                                        <i className="bi bi-collection me-2"></i>
                                        {editingId ? 'Edit Section' : 'New Section'}
                                    </h5>
                                    <button type="button" className="btn-close btn-close-white" onClick={closeModal} disabled={saving} />
                                </div>
                                <form onSubmit={handleSubmit}>
                                    <div className="modal-body">
                                        <div className="row g-3">
                                            <div className="col-md-8">
                                                <label className="form-label fw-bold">Course *</label>
                                                <select
                                                    className="form-select"
                                                    value={form.courseID}
                                                    onChange={(e) => setForm({ ...form, courseID: e.target.value })}
                                                    required
                                                >
                                                    <option value="">— Select a course —</option>
                                                    {courses.map(c => (
                                                        <option key={c.courseID} value={c.courseID}>
                                                            {c.code} — {c.title}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="col-md-4">
                                                <label className="form-label fw-bold">Term *</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={form.term}
                                                    onChange={(e) => setForm({ ...form, term: e.target.value })}
                                                    required
                                                    placeholder="e.g. 2026-Spring"
                                                    maxLength={20}
                                                />
                                            </div>
                                            <div className="col-md-8">
                                                <label className="form-label fw-bold">Instructor *</label>
                                                <select
                                                    className="form-select"
                                                    value={form.instructorID}
                                                    onChange={(e) => setForm({ ...form, instructorID: e.target.value })}
                                                    required
                                                >
                                                    <option value="">— Select an instructor —</option>
                                                    {instructors.map(i => (
                                                        <option key={i.userID} value={i.userID}>
                                                            {i.fullName} ({i.username})
                                                        </option>
                                                    ))}
                                                </select>
                                                {instructors.length === 0 && (
                                                    <small className="text-warning">
                                                        <i className="bi bi-exclamation-triangle me-1"></i>
                                                        No active instructors found. Create one first.
                                                    </small>
                                                )}
                                            </div>
                                            <div className="col-md-4">
                                                <label className="form-label fw-bold">Capacity *</label>
                                                <input
                                                    type="number"
                                                    className="form-control"
                                                    value={form.capacity}
                                                    onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                                                    required
                                                    min={1}
                                                    max={500}
                                                />
                                            </div>
                                            <div className="col-md-12">
                                                <label className="form-label fw-bold">Room</label>
                                                <select
                                                    className="form-select"
                                                    value={form.roomID}
                                                    onChange={(e) => setForm({ ...form, roomID: e.target.value })}
                                                >
                                                    <option value="">— No room assigned —</option>
                                                    {rooms.map(r => (
                                                        <option key={r.roomID} value={r.roomID}>
                                                            {r.building} — {r.roomNumber} (cap {r.capacity})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        <hr className="my-4" />
                                        <h6 className="text-muted text-uppercase small mb-3">Schedule</h6>

                                        <div className="row g-3">
                                            <div className="col-md-6">
                                                <label className="form-label fw-bold">Days</label>
                                                <select
                                                    className="form-select"
                                                    value={form.scheduleDays}
                                                    onChange={(e) => setForm({ ...form, scheduleDays: e.target.value })}
                                                >
                                                    {DAYS_OPTIONS.map(d => (
                                                        <option key={d} value={d}>{d}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label fw-bold">Time</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={form.scheduleTime}
                                                    onChange={(e) => setForm({ ...form, scheduleTime: e.target.value })}
                                                    placeholder="HH:MM-HH:MM"
                                                    pattern="\d{2}:\d{2}-\d{2}:\d{2}"
                                                />
                                                <small className="text-muted">Format: <code>10:00-11:00</code></small>
                                            </div>
                                        </div>

                                        <ErrorAlert error={formError} onDismiss={() => setFormError(null)} />
                                    </div>
                                    <div className="modal-footer">
                                        <button type="button" className="btn btn-outline-secondary" onClick={closeModal} disabled={saving}>
                                            Cancel
                                        </button>
                                        <button type="submit" className="btn btn-primary-edulearn" disabled={saving}>
                                            {saving ? (
                                                <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</>
                                            ) : (
                                                <><i className="bi bi-check-lg me-2"></i>{editingId ? 'Save Changes' : 'Create Section'}</>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}
        </div>
    );
}
