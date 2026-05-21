import { useState, useEffect } from 'react';
import { syllabusService } from '../../services/syllabusService';
import { courseService } from '../../services/courseService';
import { authService } from '../../services/authService';
import Loading from '../../components/Loading';
import ErrorAlert from '../../components/ErrorAlert';
import ModalPortal from '../../components/ModalPortal';

export default function SyllabiPage() {
    const { role } = authService.getCurrentUser();

    const [courses, setCourses] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState('');
    const [syllabi, setSyllabi] = useState([]);
    const [selected, setSelected] = useState(null);
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState('');
    const [saving, setSaving] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const [form, setForm] = useState({
        courseID: '',
        version: '',
        learningOutcomesJSON: '',
        assessmentPlanJSON: '',
        syllabusURI: '',
    });

    const canManage = ['Instructor', 'ITAdmin'].includes(role);

    useEffect(() => {
        loadCourses();
    }, []);

    const loadCourses = async () => {
        try {
            setPageLoading(true);
            const data = await courseService.getAll();
            setCourses(data || []);
        } catch (err) {
            setError(err);
        } finally {
            setPageLoading(false);
        }
    };

    const loadSyllabi = async (courseId) => {
        try {
            setLoading(true);
            setError(null);
            setSelected(null);
            const data = await syllabusService.getByCourse(courseId);
            setSyllabi(data || []);
        } catch (err) {
            setError(err);
            setSyllabi([]);
        } finally {
            setLoading(false);
        }
    };

    const handleCourseChange = (e) => {
        const id = e.target.value;
        setSelectedCourse(id);
        if (id) loadSyllabi(id);
        else setSyllabi([]);
    };

    const openCreate = () => {
        setEditingId(null);
        setForm({
            courseID: selectedCourse,
            version: '',
            learningOutcomesJSON: '',
            assessmentPlanJSON: '',
            syllabusURI: '',
        });
        setSuccess('');
        setShowForm(true);
    };

    const openEdit = (s) => {
        setEditingId(s.syllabusID);
        setForm({
            courseID: s.courseID,
            version: s.version || '',
            learningOutcomesJSON: s.learningOutcomesJSON || '',
            assessmentPlanJSON: s.assessmentPlanJSON || '',
            syllabusURI: s.syllabusURI || '',
        });
        setSuccess('');
        setShowForm(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess('');
        setSaving(true);
        try {
            const payload = {
                courseID: Number(form.courseID),
                version: form.version,
                learningOutcomesJSON: form.learningOutcomesJSON || null,
                assessmentPlanJSON: form.assessmentPlanJSON || null,
                syllabusURI: form.syllabusURI || null,
            };
            if (editingId) {
                await syllabusService.update(editingId, payload);
                setSuccess('Syllabus updated successfully.');
            } else {
                await syllabusService.create(payload);
                setSuccess('Syllabus created successfully.');
            }
            setShowForm(false);
            if (selectedCourse) loadSyllabi(selectedCourse);
        } catch (err) {
            setError(err);
        } finally {
            setSaving(false);
        }
    };

    if (pageLoading) return <Loading message="Loading courses..." />;

    return (
        <div>
            {/* Page Header */}
            <div className="d-flex align-items-center justify-content-between mb-4">
                <h2 className="text-primary-edulearn mb-0">
                    <i className="bi bi-file-earmark-ruled me-2"></i>Syllabus
                </h2>
                {canManage && selectedCourse && (
                    <button
                        className="btn btn-primary-edulearn"
                        onClick={openCreate}
                    >
                        <i className="bi bi-plus-lg me-2"></i>New Syllabus
                    </button>
                )}
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

            {loading && <Loading message="Loading syllabi..." />}

            {/* Empty State */}
            {!loading && selectedCourse && syllabi.length === 0 && (
                <div className="text-center py-5 text-muted">
                    <i className="bi bi-file-earmark-ruled display-4 d-block mb-3"></i>
                    <p className="mb-0">No syllabi found for this course.</p>
                    {canManage && (
                        <button
                            className="btn btn-primary-edulearn mt-3"
                            onClick={openCreate}
                        >
                            <i className="bi bi-plus-lg me-2"></i>Create First Syllabus
                        </button>
                    )}
                </div>
            )}

            {!loading && syllabi.length > 0 && (
                <div className="row g-4">

                    {/* Syllabi Version List */}
                    <div className="col-md-4">
                        <div className="card shadow-sm">
                            <div className="card-header bg-light">
                                <strong>
                                    <i className="bi bi-list me-2"></i>
                                    Versions ({syllabi.length})
                                </strong>
                            </div>
                            <div className="list-group list-group-flush">
                                {syllabi.map(s => (
                                    <button
                                        key={s.syllabusID}
                                        className={`list-group-item list-group-item-action d-flex align-items-center justify-content-between ${selected?.syllabusID === s.syllabusID ? 'active' : ''}`}
                                        onClick={() => setSelected(s)}
                                    >
                                        <div>
                                            <div className="fw-bold">
                                                <i className="bi bi-file-earmark-text me-2"></i>
                                                v{s.version}
                                            </div>
                                            <small className={selected?.syllabusID === s.syllabusID ? 'text-white-50' : 'text-muted'}>
                                                By {s.createdByName}
                                            </small>
                                        </div>
                                        <small className={selected?.syllabusID === s.syllabusID ? 'text-white-50' : 'text-muted'}>
                                            {s.createdAt
                                                ? new Date(s.createdAt).toLocaleDateString()
                                                : '—'}
                                        </small>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Syllabus Detail */}
                    <div className="col-md-8">
                        {!selected ? (
                            <div className="card shadow-sm h-100 d-flex align-items-center justify-content-center">
                                <div className="text-center text-muted py-5">
                                    <i className="bi bi-arrow-left me-2"></i>
                                    Select a version to view details
                                </div>
                            </div>
                        ) : (
                            <div className="card shadow-sm">
                                <div className="card-header bg-primary-edulearn text-white d-flex align-items-center justify-content-between">
                                    <strong>
                                        <i className="bi bi-file-earmark-ruled me-2"></i>
                                        Syllabus v{selected.version}
                                    </strong>
                                    {canManage && (
                                        <button
                                            className="btn btn-light btn-sm"
                                            onClick={() => openEdit(selected)}
                                        >
                                            <i className="bi bi-pencil me-1"></i>Edit
                                        </button>
                                    )}
                                </div>
                                <div className="card-body">
                                    <dl className="row mb-3">
                                        <dt className="col-sm-4 text-muted">Course</dt>
                                        <dd className="col-sm-8 fw-bold">{selected.courseName}</dd>

                                        <dt className="col-sm-4 text-muted">Version</dt>
                                        <dd className="col-sm-8">{selected.version}</dd>

                                        <dt className="col-sm-4 text-muted">Created By</dt>
                                        <dd className="col-sm-8">{selected.createdByName}</dd>

                                        <dt className="col-sm-4 text-muted">Created At</dt>
                                        <dd className="col-sm-8">
                                            {selected.createdAt
                                                ? new Date(selected.createdAt).toLocaleDateString()
                                                : '—'}
                                        </dd>
                                    </dl>

                                    {/* Syllabus URI — FIXED <a tag */}
                                    {selected.syllabusURI && (
                                        <div className="mb-3">
                                            <label className="form-label text-muted small text-uppercase">
                                                Syllabus Document
                                            </label>
                                            <div>
                                                <a href={selected.syllabusURI} target="_blank" rel="noreferrer" className="btn btn-outline-primary btn-sm">
                                                    <i className="bi bi-box-arrow-up-right me-2"></i>
                                                    Open Document
                                                </a>
                                            </div>
                                        </div>
                                    )}

                                    {selected.learningOutcomesJSON && (
                                        <div className="mb-3">
                                            <label className="form-label text-muted small text-uppercase">
                                                Learning Outcomes
                                            </label>
                                            <div className="p-3 bg-light rounded">
                                                <pre
                                                    className="mb-0 small"
                                                    style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                                                >
                                                    {selected.learningOutcomesJSON}
                                                </pre>
                                            </div>
                                        </div>
                                    )}

                                    {selected.assessmentPlanJSON && (
                                        <div>
                                            <label className="form-label text-muted small text-uppercase">
                                                Assessment Plan
                                            </label>
                                            <div className="p-3 bg-light rounded">
                                                <pre
                                                    className="mb-0 small"
                                                    style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                                                >
                                                    {selected.assessmentPlanJSON}
                                                </pre>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Create / Edit Modal */}
            {showForm && (
                <ModalPortal>
                    <div className="modal-backdrop fade show"></div>
                    <div className="modal fade show d-block" tabIndex="-1">
                        <div className="modal-dialog modal-dialog-centered modal-lg">
                            <div className="modal-content">
                                <div className="modal-header bg-primary-edulearn text-white">
                                    <h5 className="modal-title">
                                        <i className="bi bi-file-earmark-ruled me-2"></i>
                                        {editingId ? 'Edit Syllabus' : 'New Syllabus'}
                                    </h5>
                                    <button
                                        type="button"
                                        className="btn-close btn-close-white"
                                        onClick={() => setShowForm(false)}
                                        disabled={saving}
                                    />
                                </div>
                                <form onSubmit={handleSubmit}>
                                    <div className="modal-body">
                                        <div className="row g-3">

                                            {/* Course */}
                                            <div className="col-md-8">
                                                <label className="form-label fw-bold">
                                                    Course <span className="text-danger">*</span>
                                                </label>
                                                <select
                                                    className="form-select"
                                                    value={form.courseID}
                                                    onChange={e => setForm({ ...form, courseID: e.target.value })}
                                                    required
                                                    disabled={!!editingId}
                                                >
                                                    <option value="">-- Select Course --</option>
                                                    {courses.map(c => (
                                                        <option key={c.courseID} value={c.courseID}>
                                                            {c.code} — {c.title}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Version */}
                                            <div className="col-md-4">
                                                <label className="form-label fw-bold">
                                                    Version <span className="text-danger">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={form.version}
                                                    onChange={e => setForm({ ...form, version: e.target.value })}
                                                    placeholder="e.g. v1.0"
                                                    required
                                                />
                                            </div>

                                            {/* Syllabus URI */}
                                            <div className="col-12">
                                                <label className="form-label fw-bold">
                                                    Syllabus URI
                                                    <small className="text-muted fw-normal ms-2">
                                                        (optional link)
                                                    </small>
                                                </label>
                                                <div className="input-group">
                                                    <span className="input-group-text">
                                                        <i className="bi bi-link-45deg"></i>
                                                    </span>
                                                    <input
                                                        type="text"
                                                        className="form-control"
                                                        value={form.syllabusURI}
                                                        onChange={e => setForm({ ...form, syllabusURI: e.target.value })}
                                                        placeholder="https://..."
                                                    />
                                                </div>
                                            </div>

                                            {/* Learning Outcomes */}
                                            <div className="col-12">
                                                <label className="form-label fw-bold">
                                                    Learning Outcomes
                                                    <small className="text-muted fw-normal ms-2">
                                                        (optional JSON)
                                                    </small>
                                                </label>
                                                <textarea
                                                    className="form-control font-monospace"
                                                    value={form.learningOutcomesJSON}
                                                    onChange={e => setForm({ ...form, learningOutcomesJSON: e.target.value })}
                                                    rows={3}
                                                    placeholder='e.g. ["Understand X", "Apply Y"]'
                                                />
                                            </div>

                                            {/* Assessment Plan */}
                                            <div className="col-12">
                                                <label className="form-label fw-bold">
                                                    Assessment Plan
                                                    <small className="text-muted fw-normal ms-2">
                                                        (optional JSON)
                                                    </small>
                                                </label>
                                                <textarea
                                                    className="form-control font-monospace"
                                                    value={form.assessmentPlanJSON}
                                                    onChange={e => setForm({ ...form, assessmentPlanJSON: e.target.value })}
                                                    rows={3}
                                                    placeholder='e.g. [{"type": "Quiz", "weight": 20}]'
                                                />
                                            </div>

                                        </div>
                                        <ErrorAlert error={error} onDismiss={() => setError(null)} />
                                    </div>
                                    <div className="modal-footer">
                                        <button
                                            type="button"
                                            className="btn btn-outline-secondary"
                                            onClick={() => setShowForm(false)}
                                            disabled={saving}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="btn btn-primary-edulearn"
                                            disabled={saving}
                                        >
                                            {saving ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-2"></span>
                                                    Saving...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="bi bi-check-lg me-2"></i>
                                                    {editingId ? 'Save Changes' : 'Create Syllabus'}
                                                </>
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