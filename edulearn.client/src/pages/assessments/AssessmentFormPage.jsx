import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { assessmentService } from '../../services/assessmentService';
import { sectionService } from '../../services/sectionService';
import { authService } from '../../services/authService';
import { AssessmentType } from '../../models/Assessment';
import ErrorAlert from '../../components/ErrorAlert';
import Loading from '../../components/Loading';
import { validateTitle, validateAmount, validateFutureDate, validatePositiveId, validateOptionalUrl } from '../../utils/validators';

export default function AssessmentFormPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { role, userId } = authService.getCurrentUser();
    const isEditMode = !!id;
    const isInstructor = role === 'Instructor';

    const [form, setForm] = useState({
        courseID: '',
        sectionID: '',
        title: '',
        type: AssessmentType.ASSIGNMENT,
        status: 'Draft',
        dueAt: '',
        maxScore: 100,
        instructionsURI: '',
    });
    // Grading rubric as structured rows: [{criterion, maxPoints}]
    const [rubricRows, setRubricRows] = useState([]);

    const [originalStatus, setOriginalStatus] = useState('Draft');
    const [errors, setErrors] = useState({});

    const [mySections, setMySections] = useState([]);
    const [loadingSections, setLoadingSections] = useState(false);
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(isEditMode);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState('');

    const canManage = ['Instructor', 'ITAdmin'].includes(role);

    useEffect(() => {
        if (isInstructor && userId) loadMySections();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isInstructor, userId]);

    useEffect(() => {
        if (isEditMode) loadAssessment();
    }, [id]);

    const loadMySections = async () => {
        try {
            setLoadingSections(true);
            const sections = await sectionService.getByInstructor(userId);
            setMySections(sections || []);
        } catch {
            setMySections([]);
        } finally {
            setLoadingSections(false);
        }
    };

    const loadAssessment = async () => {
        try {
            setPageLoading(true);
            setError(null);
            const data = await assessmentService.getById(id);
            const loadedStatus = data.status || 'Draft';
            setOriginalStatus(loadedStatus);
            setForm({
                courseID: data.courseID || '',
                sectionID: data.sectionID || '',
                title: data.title || '',
                type: data.type || AssessmentType.ASSIGNMENT,
                status: loadedStatus,
                dueAt: data.dueAt ? new Date(data.dueAt).toISOString().slice(0, 16) : '',
                maxScore: data.maxScore || 100,
                instructionsURI: data.instructionsURI || '',
            });
            // Parse existing gradingRubricJSON into rows
            if (data.gradingRubricJSON) {
                try {
                    const parsed = JSON.parse(data.gradingRubricJSON);
                    if (Array.isArray(parsed)) {
                        setRubricRows(parsed.map(r => ({
                            criterion: r.criterion || '',
                            maxPoints: r.maxPoints ?? '',
                        })));
                    }
                } catch { /* ignore */ }
            }
        } catch (err) {
            setError(err);
        } finally {
            setPageLoading(false);
        }
    };

    // Rubric row helpers
    const addRubricRow = () => setRubricRows(prev => [...prev, { criterion: '', maxPoints: '' }]);
    const removeRubricRow = (idx) => setRubricRows(prev => prev.filter((_, i) => i !== idx));
    const updateRubricRow = (idx, field, value) =>
        setRubricRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSectionChange = (e) => {
        const sectionId = e.target.value;
        const section = mySections.find(s => String(s.sectionID) === sectionId);
        setForm(prev => ({
            ...prev,
            sectionID: sectionId,
            courseID: section ? section.courseID : prev.courseID,
        }));
    };

    const myCourses = mySections.reduce((acc, sec) => {
        if (!acc.find(c => c.courseID === sec.courseID)) {
            acc.push({ courseID: sec.courseID, courseName: sec.courseName });
        }
        return acc;
    }, []);

    const filteredSections = form.courseID
        ? mySections.filter(s => String(s.courseID) === String(form.courseID))
        : mySections;

    const handleCourseChange = (e) => {
        const courseId = e.target.value;
        setForm(prev => ({ ...prev, courseID: courseId, sectionID: '' }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess('');

        const next = {
            title: validateTitle(form.title),
            maxScore: validateAmount(form.maxScore, 1, 9999),
            dueAt: form.dueAt ? validateFutureDate(form.dueAt) : null,
            instructionsURI: validateOptionalUrl(form.instructionsURI),
            ...(!isInstructor ? { courseID: validatePositiveId(form.courseID) } : {}),
        };
        if (Object.values(next).some(Boolean)) { setErrors(next); return; }

        setLoading(true);

        const payload = {
            courseID: Number(form.courseID),
            sectionID: form.sectionID ? Number(form.sectionID) : null,
            title: form.title,
            type: form.type,
            status: form.status,
            dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : null,
            maxScore: Number(form.maxScore),
            gradingRubricJSON: rubricRows.length > 0
                ? JSON.stringify(rubricRows.map(r => ({ criterion: r.criterion, maxPoints: Number(r.maxPoints) || 0 })))
                : null,
            instructionsURI: form.instructionsURI.trim() || null,
        };

        try {
            if (isEditMode) {
                const statusChanged = form.status !== originalStatus;

                // Validate the transition is legal before hitting the API
                const validTransitions = {
                    Draft: ['Draft', 'Published'],
                    Published: ['Published', 'Closed'],
                    Closed: ['Closed', 'Archived'],
                    Archived: ['Archived'],
                };
                if (statusChanged && !validTransitions[originalStatus]?.includes(form.status)) {
                    setError({ message: `Invalid status transition: ${originalStatus} → ${form.status}. Valid path: Draft → Published → Closed → Archived` });
                    setLoading(false);
                    return;
                }

                // Update fields only when assessment is still Draft
                if (originalStatus === 'Draft') {
                    await assessmentService.update(id, payload);
                }

                // Transition status if it changed
                if (statusChanged) {
                    await assessmentService.updateStatus(id, form.status);
                }

                setSuccess('Assessment updated successfully.');
                setTimeout(() => navigate(`/assessments/${id}`), 1200);
            } else {
                const created = await assessmentService.create(payload);
                setSuccess('Assessment created successfully.');
                setTimeout(() => navigate(`/assessments/${created.assessmentID || ''}`), 1200);
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

    if (pageLoading) return <Loading message="Loading assessment..." />;

    const parseSchedule = (json) => {
        try { return json ? JSON.parse(json) : null; } catch { return null; }
    };

    // FIX: For new assessments, the due date cannot be in the past
    const minDueAt = !isEditMode ? new Date().toISOString().slice(0, 16) : undefined;

    return (
        <div>
            <div className="d-flex align-items-center justify-content-between mb-4">
                <h2 className="text-primary-edulearn mb-0">
                    <i className="bi bi-file-earmark-text me-2"></i>
                    {isEditMode ? 'Edit Assessment' : 'New Assessment'}
                </h2>
                <button
                    className="btn btn-outline-secondary"
                    onClick={() => navigate(isEditMode ? `/assessments/${id}` : '/assessments')}
                >
                    <i className="bi bi-arrow-left me-1"></i>Back
                </button>
            </div>

            {success && (
                <div className="alert alert-success">
                    <i className="bi bi-check-circle me-2"></i>{success}
                </div>
            )}

            {isEditMode && originalStatus !== 'Draft' && (
                <div className="alert alert-info mb-3">
                    <i className="bi bi-info-circle me-2"></i>
                    This assessment is <strong>{originalStatus}</strong> — field edits are locked. You can only advance the status using the dropdown below.
                </div>
            )}

            <ErrorAlert error={error} onDismiss={() => setError(null)} />

            <div className="card shadow-sm">
                <div className="card-header bg-primary-edulearn text-white">
                    <strong>
                        <i className="bi bi-pencil-square me-2"></i>
                        {isEditMode ? 'Edit Assessment Details' : 'Assessment Details'}
                    </strong>
                </div>
                <div className="card-body">
                    <form onSubmit={handleSubmit}>
                        <div className="row g-3">

                            <div className="col-md-6">
                                <label className="form-label fw-bold">Title <span className="text-danger">*</span></label>
                                <input
                                    type="text"
                                    className={`form-control${errors.title ? ' is-invalid' : ''}`}
                                    name="title"
                                    value={form.title}
                                    onChange={handleChange}
                                    onBlur={e => setErrors(prev => ({ ...prev, title: validateTitle(e.target.value) }))}
                                    placeholder="e.g. Midterm Exam"
                                    maxLength={200}
                                    required
                                />
                                {errors.title && <div className="invalid-feedback">{errors.title}</div>}
                            </div>

                            <div className="col-md-3">
                                <label className="form-label fw-bold">Type <span className="text-danger">*</span></label>
                                <select className="form-select" name="type" value={form.type} onChange={handleChange} required>
                                    {Object.values(AssessmentType).map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>

                            <div className="col-md-3">
                                <label className="form-label fw-bold">Status <span className="text-danger">*</span></label>
                                <select className="form-select" name="status" value={form.status} onChange={handleChange} required>
                                    <option value="Draft">Draft</option>
                                    <option value="Published">Published</option>
                                    <option value="Closed">Closed</option>
                                    <option value="Archived">Archived</option>
                                </select>
                                <div className="form-text">
                                    {form.status === 'Draft'     && 'Not visible to students yet.'}
                                    {form.status === 'Published' && 'Students can view and submit.'}
                                    {form.status === 'Closed'    && 'No new submissions accepted.'}
                                    {form.status === 'Archived'  && 'Hidden from active views.'}
                                </div>
                            </div>

                            <div className="col-md-4">
                                <label className="form-label fw-bold">Course <span className="text-danger">*</span></label>
                                {isInstructor ? (
                                    loadingSections ? (
                                        <div className="d-flex align-items-center gap-2 mt-1">
                                            <span className="spinner-border spinner-border-sm"></span>
                                            <small className="text-muted">Loading your courses...</small>
                                        </div>
                                    ) : (
                                        <>
                                            <select
                                                className="form-select"
                                                name="courseID"
                                                value={form.courseID}
                                                onChange={handleCourseChange}
                                                required
                                            >
                                                <option value="">— Select a course —</option>
                                                {myCourses.map(c => (
                                                    <option key={c.courseID} value={c.courseID}>
                                                        {c.courseName}
                                                    </option>
                                                ))}
                                            </select>
                                            {myCourses.length === 0 && (
                                                <small className="text-warning">
                                                    <i className="bi bi-exclamation-triangle me-1"></i>
                                                    No sections assigned to you. Contact the Registrar.
                                                </small>
                                            )}
                                        </>
                                    )
                                ) : (
                                    <>
                                        <input
                                            type="number"
                                            className={`form-control${errors.courseID ? ' is-invalid' : ''}`}
                                            name="courseID"
                                            value={form.courseID}
                                            onChange={handleChange}
                                            onBlur={e => setErrors(prev => ({ ...prev, courseID: validatePositiveId(e.target.value) }))}
                                            min={1}
                                            required
                                        />
                                        {errors.courseID && <div className="invalid-feedback">{errors.courseID}</div>}
                                        <div className="form-text">Enter the Course ID.</div>
                                    </>
                                )}
                            </div>

                            <div className="col-md-4">
                                <label className="form-label fw-bold">
                                    Section
                                    <small className="text-muted fw-normal ms-2">(optional)</small>
                                </label>
                                {isInstructor ? (
                                    <select
                                        className="form-select"
                                        name="sectionID"
                                        value={form.sectionID}
                                        onChange={handleSectionChange}
                                        disabled={!form.courseID}
                                    >
                                        <option value="">— All sections of this course —</option>
                                        {filteredSections.map(s => {
                                            const sched = parseSchedule(s.scheduleJSON);
                                            return (
                                                <option key={s.sectionID} value={s.sectionID}>
                                                    Section #{s.sectionID}
                                                    {sched ? ` · ${sched.days} ${sched.time}` : ''}
                                                    {` · ${s.enrolledCount}/${s.capacity} students`}
                                                </option>
                                            );
                                        })}
                                    </select>
                                ) : (
                                    <input
                                        type="number"
                                        className="form-control"
                                        name="sectionID"
                                        value={form.sectionID}
                                        onChange={handleChange}
                                        min={1}
                                        placeholder="Leave blank for all sections"
                                    />
                                )}
                                <div className="form-text">
                                    {isInstructor
                                        ? 'Leave blank to apply to all your sections of this course.'
                                        : 'Leave blank for course-wide assessment.'}
                                </div>
                            </div>

                            <div className="col-md-4">
                                <label className="form-label fw-bold">Max Score <span className="text-danger">*</span></label>
                                <input
                                    type="number"
                                    className={`form-control${errors.maxScore ? ' is-invalid' : ''}`}
                                    name="maxScore"
                                    value={form.maxScore}
                                    onChange={handleChange}
                                    onBlur={e => setErrors(prev => ({ ...prev, maxScore: validateAmount(e.target.value, 1, 9999) }))}
                                    min={0.1}
                                    max={9999.9}
                                    step={0.1}
                                    required
                                />
                                {errors.maxScore && <div className="invalid-feedback">{errors.maxScore}</div>}
                            </div>

                            {/* FIX: min prevents selecting past due dates on new assessments */}
                            <div className="col-md-6">
                                <label className="form-label fw-bold">
                                    Due At <small className="text-muted fw-normal ms-2">(optional)</small>
                                </label>
                                <input
                                    type="datetime-local"
                                    className={`form-control${errors.dueAt ? ' is-invalid' : ''}`}
                                    name="dueAt"
                                    value={form.dueAt}
                                    onChange={handleChange}
                                    onBlur={e => setErrors(prev => ({ ...prev, dueAt: e.target.value ? validateFutureDate(e.target.value) : null }))}
                                    min={minDueAt}
                                />
                                {errors.dueAt && <div className="invalid-feedback">{errors.dueAt}</div>}
                                {!isEditMode && (
                                    <div className="form-text">Must be a future date and time.</div>
                                )}
                            </div>

                            <div className="col-12">
                                <label className="form-label fw-bold">
                                    Assessment Instructions URL
                                    <small className="text-muted fw-normal ms-2">(optional — link to the question paper or brief)</small>
                                </label>
                                <div className="input-group">
                                    <span className="input-group-text">
                                        <i className="bi bi-link-45deg"></i>
                                    </span>
                                    <input
                                        type="text"
                                        className={`form-control${errors.instructionsURI ? ' is-invalid' : ''}`}
                                        name="instructionsURI"
                                        value={form.instructionsURI}
                                        onChange={handleChange}
                                        onBlur={e => setErrors(prev => ({ ...prev, instructionsURI: validateOptionalUrl(e.target.value) }))}
                                        placeholder="https://drive.google.com/... or https://notion.so/..."
                                        maxLength={500}
                                        autoComplete="off"
                                        spellCheck={false}
                                    />
                                    {errors.instructionsURI && (
                                        <div className="invalid-feedback">{errors.instructionsURI}</div>
                                    )}
                                </div>
                                <div className="form-text">
                                    Students will see this link on the assessment page and on the submission page before they submit.
                                </div>
                            </div>

                            <div className="col-12">
                                <div className="d-flex align-items-center justify-content-between mb-2">
                                    <label className="form-label fw-bold mb-0">
                                        Grading Rubric
                                        <small className="text-muted fw-normal ms-2">(optional)</small>
                                    </label>
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-outline-primary"
                                        onClick={addRubricRow}
                                    >
                                        <i className="bi bi-plus-lg me-1"></i>Add Criterion
                                    </button>
                                </div>
                                {rubricRows.length === 0 ? (
                                    <div className="border rounded p-3 text-center text-muted small">
                                        <i className="bi bi-list-check me-1"></i>
                                        No rubric criteria added. Click "Add Criterion" to define grading criteria.
                                    </div>
                                ) : (
                                    <div className="border rounded p-3">
                                        <div className="row g-2 mb-2">
                                            <div className="col-7"><small className="text-muted fw-bold text-uppercase">Criterion</small></div>
                                            <div className="col-3"><small className="text-muted fw-bold text-uppercase">Max Points</small></div>
                                            <div className="col-2"></div>
                                        </div>
                                        {rubricRows.map((row, idx) => (
                                            <div key={idx} className="row g-2 mb-2 align-items-center">
                                                <div className="col-7">
                                                    <input
                                                        type="text"
                                                        className="form-control form-control-sm"
                                                        value={row.criterion}
                                                        onChange={e => updateRubricRow(idx, 'criterion', e.target.value)}
                                                        placeholder="e.g. Code Quality"
                                                        maxLength={100}
                                                    />
                                                </div>
                                                <div className="col-3">
                                                    <input
                                                        type="number"
                                                        className="form-control form-control-sm"
                                                        value={row.maxPoints}
                                                        onChange={e => updateRubricRow(idx, 'maxPoints', e.target.value)}
                                                        placeholder="e.g. 40"
                                                        min={0}
                                                    />
                                                </div>
                                                <div className="col-2">
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-outline-danger w-100"
                                                        onClick={() => removeRubricRow(idx)}
                                                        title="Remove criterion"
                                                    >
                                                        <i className="bi bi-trash"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        <div className="form-text mt-1">
                                            Total rubric points: <strong>{rubricRows.reduce((s, r) => s + (Number(r.maxPoints) || 0), 0)}</strong>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="d-flex gap-2 mt-4">
                            <button type="submit" className="btn btn-primary-edulearn" disabled={loading}>
                                {loading ? (
                                    <><span className="spinner-border spinner-border-sm me-2"></span>{isEditMode ? 'Saving...' : 'Creating...'}</>
                                ) : (
                                    <><i className="bi bi-check-lg me-2"></i>{isEditMode ? 'Save Changes' : 'Create Assessment'}</>
                                )}
                            </button>
                            <button
                                type="button"
                                className="btn btn-outline-secondary"
                                onClick={() => navigate(isEditMode ? `/assessments/${id}` : '/assessments')}
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
