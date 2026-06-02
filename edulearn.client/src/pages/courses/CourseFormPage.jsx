import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { courseService } from '../../services/courseService';
import { authService } from '../../services/authService';
import { emptyCourse } from '../../models/Course';
import ErrorAlert from '../../components/ErrorAlert';
import Loading from '../../components/Loading';
import { validateCourseCode, validateTitle, validateLevel, validatePositiveInteger, validateOptionalPositiveId, validateTerm, validatePositiveId } from '../../utils/validators';

export default function CourseFormPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { role } = authService.getCurrentUser();
    const isEditMode = !!id;

    const [form, setForm] = useState(emptyCourse());
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(isEditMode);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState('');
    // Prerequisites: array of selected course IDs (numbers)
    const [prereqIds, setPrereqIds] = useState([]);
    const [allCourses, setAllCourses] = useState([]);

    const canManage = ['Instructor', 'DeptAdmin', 'ITAdmin'].includes(role);

    useEffect(() => {
        // Load all courses for the prerequisite picker
        courseService.getAll().then(data => setAllCourses(data || [])).catch(() => {});
        if (isEditMode) loadCourse();
    }, [id]);

    const loadCourse = async () => {
        try {
            setPageLoading(true);
            setError(null);
            setErrors({});
            const data = await courseService.getById(id);
            setForm({
                code: data.code || '',
                title: data.title || '',
                description: data.description || '',
                credits: data.credits || 3,
                departmentID: data.departmentID || null,
                level: data.level || '',
                prerequisitesJSON: data.prerequisitesJSON || '',
            });
            // Parse existing prerequisitesJSON into the UI state
            if (data.prerequisitesJSON) {
                try {
                    const parsed = JSON.parse(data.prerequisitesJSON);
                    if (Array.isArray(parsed)) setPrereqIds(parsed.map(Number));
                } catch { /* ignore */ }
            }
        } catch (err) {
            setError(err);
        } finally {
            setPageLoading(false);
        }
    };

    // Toggle a course in/out of prerequisites list
    const togglePrereq = (courseId) => {
        setPrereqIds(prev =>
            prev.includes(courseId)
                ? prev.filter(id => id !== courseId)
                : [...prev, courseId]
        );
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess('');

        const next = {
            code: isEditMode ? null : validateCourseCode(form.code),
            title: validateTitle(form.title),
            level: validateLevel(form.level),
        };
        if (Object.values(next).some(Boolean)) { setErrors(next); return; }

        // Build prerequisitesJSON from UI state
        const prereqJSON = prereqIds.length > 0 ? JSON.stringify(prereqIds) : null;

        setLoading(true);

        try {
            const payload = { ...form, prerequisitesJSON: prereqJSON };
            if (isEditMode) {
                await courseService.update(id, payload);
                setSuccess('Course updated successfully.');
                setTimeout(() => navigate(`/courses/${id}`), 1200);
            } else {
                const created = await courseService.create(payload);
                setSuccess('Course created successfully.');
                setTimeout(() => navigate(`/courses/${created.courseID || ''}`), 1200);
            }
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    if (!canManage) {
        return (
            <div className="alert alert-danger">
                <i className="bi bi-shield-x me-2"></i>
                You do not have permission to access this page.
            </div>
        );
    }

    if (pageLoading) return <Loading message="Loading course..." />;

    return (
        <div>
            <div className="d-flex align-items-center justify-content-between mb-4">
                <h2 className="text-primary-edulearn mb-0">
                    <i className="bi bi-book me-2"></i>
                    {isEditMode ? 'Edit Course' : 'New Course'}
                </h2>
                <button
                    className="btn btn-outline-secondary"
                    onClick={() => navigate(isEditMode ? `/courses/${id}` : '/courses')}
                >
                    <i className="bi bi-arrow-left me-1"></i>Back
                </button>
            </div>

            {success && (
                <div className="alert alert-success">
                    <i className="bi bi-check-circle me-2"></i>{success}
                </div>
            )}

            <ErrorAlert error={error} onDismiss={() => setError(null)} />

            <div className="card shadow-sm">
                <div className="card-header bg-primary-edulearn text-white">
                    <strong>
                        <i className="bi bi-pencil-square me-2"></i>
                        {isEditMode ? 'Edit Course Details' : 'Course Details'}
                    </strong>
                </div>
                <div className="card-body">
                    <form onSubmit={handleSubmit}>
                        <div className="row g-3">

                            <div className="col-md-4">
                                <label className="form-label fw-bold">
                                    Course Code <span className="text-danger">*</span>
                                </label>
                                <input
                                    type="text"
                                    className={`form-control${errors.code ? ' is-invalid' : ''}`}
                                    name="code"
                                    value={form.code}
                                    onChange={handleChange}
                                    onBlur={e => setErrors(prev => ({ ...prev, code: isEditMode ? null : validateCourseCode(e.target.value) }))}
                                    placeholder="e.g. CS101"
                                    maxLength={20}
                                    required
                                    disabled={isEditMode}
                                />
                                {errors.code && <div className="invalid-feedback">{errors.code}</div>}
                                {isEditMode && (
                                    <small className="text-muted">Course code cannot be changed after creation.</small>
                                )}
                            </div>

                            <div className="col-md-8">
                                <label className="form-label fw-bold">
                                    Title <span className="text-danger">*</span>
                                </label>
                                <input
                                    type="text"
                                    className={`form-control${errors.title ? ' is-invalid' : ''}`}
                                    name="title"
                                    value={form.title}
                                    onChange={handleChange}
                                    onBlur={e => setErrors(prev => ({ ...prev, title: validateTitle(e.target.value) }))}
                                    placeholder="e.g. Introduction to Computer Science"
                                    maxLength={200}
                                    required
                                />
                                {errors.title && <div className="invalid-feedback">{errors.title}</div>}
                            </div>

                            <div className="col-md-3">
                                <label className="form-label fw-bold">
                                    Credits <span className="text-danger">*</span>
                                </label>
                                {/* FIX: Added step="1" to prevent decimal credit values */}
                                <input
                                    type="number"
                                    className="form-control"
                                    name="credits"
                                    value={form.credits}
                                    onChange={handleChange}
                                    min={1}
                                    max={12}
                                    step="1"
                                    required
                                />
                            </div>

                            <div className="col-md-3">
                                <label className="form-label fw-bold">Level</label>
                                <select
                                    className="form-select"
                                    name="level"
                                    value={form.level}
                                    onChange={handleChange}
                                >
                                    <option value="">— Select Level —</option>
                                    <option value="UG">UG (Undergraduate)</option>
                                    <option value="PG">PG (Postgraduate)</option>
                                </select>
                            </div>

                            <div className="col-md-3">
                                <label className="form-label fw-bold">Department ID</label>
                                <input
                                    type="number"
                                    className="form-control"
                                    name="departmentID"
                                    value={form.departmentID || ''}
                                    onChange={handleChange}
                                    placeholder="Optional"
                                    min={1}
                                />
                            </div>

                            <div className="col-12">
                                <label className="form-label fw-bold">Description</label>
                                <textarea
                                    className="form-control"
                                    name="description"
                                    value={form.description}
                                    onChange={handleChange}
                                    rows={3}
                                    placeholder="Brief description of the course..."
                                />
                            </div>

                            <div className="col-12">
                                <label className="form-label fw-bold">Prerequisites</label>
                                <div className="border rounded p-3" style={{ maxHeight: 200, overflowY: 'auto' }}>
                                    {allCourses.filter(c => !isEditMode || String(c.courseID) !== String(id)).length === 0 ? (
                                        <span className="text-muted small">No other courses available.</span>
                                    ) : (
                                        allCourses
                                            .filter(c => !isEditMode || String(c.courseID) !== String(id))
                                            .map(c => (
                                                <div key={c.courseID} className="form-check mb-1">
                                                    <input
                                                        className="form-check-input"
                                                        type="checkbox"
                                                        id={`prereq-${c.courseID}`}
                                                        checked={prereqIds.includes(c.courseID)}
                                                        onChange={() => togglePrereq(c.courseID)}
                                                    />
                                                    <label className="form-check-label" htmlFor={`prereq-${c.courseID}`}>
                                                        <strong>{c.code}</strong> — {c.title}
                                                    </label>
                                                </div>
                                            ))
                                    )}
                                </div>
                                <div className="form-text">
                                    {prereqIds.length === 0
                                        ? 'No prerequisites selected — leave unchecked if none required.'
                                        : <><i className="bi bi-check2-all me-1 text-success"></i>{prereqIds.length} prerequisite(s) selected.</>
                                    }
                                </div>
                            </div>

                        </div>

                        <div className="d-flex gap-2 mt-4">
                            <button type="submit" className="btn btn-primary-edulearn" disabled={loading}>
                                {loading ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2"></span>
                                        {isEditMode ? 'Saving...' : 'Creating...'}
                                    </>
                                ) : (
                                    <>
                                        <i className="bi bi-check-lg me-2"></i>
                                        {isEditMode ? 'Save Changes' : 'Create Course'}
                                    </>
                                )}
                            </button>
                            <button
                                type="button"
                                className="btn btn-outline-secondary"
                                onClick={() => navigate(isEditMode ? `/courses/${id}` : '/courses')}
                                disabled={loading}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
