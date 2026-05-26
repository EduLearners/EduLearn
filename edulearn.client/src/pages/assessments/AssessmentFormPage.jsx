import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { assessmentService } from '../../services/assessmentService';
import { sectionService } from '../../services/sectionService';
import { authService } from '../../services/authService';
import { AssessmentType } from '../../models/Assessment';
import ErrorAlert from '../../components/ErrorAlert';
import Loading from '../../components/Loading';

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
        gradingRubricJSON: '',
    });

    const [mySections, setMySections] = useState([]);
    const [loadingSections, setLoadingSections] = useState(false);
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(isEditMode);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState('');

    const canManage = ['Instructor', 'ITAdmin'].includes(role);

    useEffect(() => {
        if (isInstructor && userId) loadMySections();
    }, []);

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
            setForm({
                courseID: data.courseID || '',
                sectionID: data.sectionID || '',
                title: data.title || '',
                type: data.type || AssessmentType.ASSIGNMENT,
                status: data.status || 'Draft',
                dueAt: data.dueAt ? new Date(data.dueAt).toISOString().slice(0, 16) : '',
                maxScore: data.maxScore || 100,
                gradingRubricJSON: data.gradingRubricJSON || '',
            });
        } catch (err) {
            setError(err);
        } finally {
            setPageLoading(false);
        }
    };

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
        setLoading(true);

        const payload = {
            courseID: Number(form.courseID),
            sectionID: form.sectionID ? Number(form.sectionID) : null,
            title: form.title,
            type: form.type,
            status: form.status,
            dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : null,
            maxScore: Number(form.maxScore),
            gradingRubricJSON: form.gradingRubricJSON || null,
        };

        try {
            if (isEditMode) {
                await assessmentService.update(id, payload);
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
                                    className="form-control"
                                    name="title"
                                    value={form.title}
                                    onChange={handleChange}
                                    placeholder="e.g. Midterm Exam"
                                    maxLength={200}
                                    required
                                />
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
                                            className="form-control"
                                            name="courseID"
                                            value={form.courseID}
                                            onChange={handleChange}
                                            min={1}
                                            required
                                        />
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
                                    className="form-control"
                                    name="maxScore"
                                    value={form.maxScore}
                                    onChange={handleChange}
                                    min={0.1}
                                    max={9999.9}
                                    step={0.1}
                                    required
                                />
                            </div>

                            {/* FIX: min prevents selecting past due dates on new assessments */}
                            <div className="col-md-6">
                                <label className="form-label fw-bold">
                                    Due At <small className="text-muted fw-normal ms-2">(optional)</small>
                                </label>
                                <input
                                    type="datetime-local"
                                    className="form-control"
                                    name="dueAt"
                                    value={form.dueAt}
                                    onChange={handleChange}
                                    min={minDueAt}
                                />
                                {!isEditMode && (
                                    <div className="form-text">Must be a future date and time.</div>
                                )}
                            </div>

                            <div className="col-12">
                                <label className="form-label fw-bold">
                                    Grading Rubric <small className="text-muted fw-normal ms-2">(optional JSON)</small>
                                </label>
                                <textarea
                                    className="form-control font-monospace"
                                    name="gradingRubricJSON"
                                    value={form.gradingRubricJSON}
                                    onChange={handleChange}
                                    rows={4}
                                    placeholder='e.g. [{"criterion": "Code Quality", "maxPoints": 40}]'
                                />
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
