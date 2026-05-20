import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { assessmentService } from '../../services/assessmentService';
import { authService } from '../../services/authService';
import { AssessmentType } from '../../models/Assessment';
import ErrorAlert from '../../components/ErrorAlert';
import Loading from '../../components/Loading';

export default function AssessmentFormPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { role } = authService.getCurrentUser();
    const isEditMode = !!id;

    const [form, setForm] = useState({
        courseID: 0,
        sectionID: null,
        title: '',
        type: AssessmentType.ASSIGNMENT,
        dueAt: '',
        maxScore: 100,
        gradingRubricJSON: '',
    });
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(isEditMode);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState('');

    const canManage = ['Instructor', 'ITAdmin'].includes(role);

    useEffect(() => {
        if (isEditMode) loadAssessment();
    }, [id]);

    const loadAssessment = async () => {
        try {
            setPageLoading(true);
            setError(null);
            const data = await assessmentService.getById(id);
            setForm({
                courseID: data.courseID || 0,
                sectionID: data.sectionID || null,
                title: data.title || '',
                type: data.type || AssessmentType.ASSIGNMENT,
                dueAt: data.dueAt
                    ? new Date(data.dueAt).toISOString().slice(0, 16)
                    : '',
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess('');
        setLoading(true);

        // createdByFK intentionally omitted — backend reads it from JWT
        const payload = {
            courseID: Number(form.courseID),
            sectionID: form.sectionID ? Number(form.sectionID) : null,
            title: form.title,
            type: form.type,
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
                setTimeout(
                    () => navigate(`/assessments/${created.assessmentID || ''}`),
                    1200
                );
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

    return (
        <div>
            {/* Page Header */}
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

                            {/* Title */}
                            <div className="col-md-8">
                                <label className="form-label fw-bold">
                                    Title <span className="text-danger">*</span>
                                </label>
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

                            {/* Type */}
                            <div className="col-md-4">
                                <label className="form-label fw-bold">
                                    Type <span className="text-danger">*</span>
                                </label>
                                <select
                                    className="form-select"
                                    name="type"
                                    value={form.type}
                                    onChange={handleChange}
                                    required
                                >
                                    {Object.values(AssessmentType).map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Course ID */}
                            <div className="col-md-4">
                                <label className="form-label fw-bold">
                                    Course ID <span className="text-danger">*</span>
                                </label>
                                <input
                                    type="number"
                                    className="form-control"
                                    name="courseID"
                                    value={form.courseID}
                                    onChange={handleChange}
                                    min={1}
                                    required
                                />
                                <div className="form-text">
                                    Enter the ID of the course this assessment belongs to.
                                </div>
                            </div>

                            {/* Section ID */}
                            <div className="col-md-4">
                                <label className="form-label fw-bold">
                                    Section ID
                                    <small className="text-muted fw-normal ms-2">(optional)</small>
                                </label>
                                <input
                                    type="number"
                                    className="form-control"
                                    name="sectionID"
                                    value={form.sectionID || ''}
                                    onChange={handleChange}
                                    min={1}
                                    placeholder="Leave blank for all sections"
                                />
                            </div>

                            {/* Max Score */}
                            <div className="col-md-4">
                                <label className="form-label fw-bold">
                                    Max Score <span className="text-danger">*</span>
                                </label>
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

                            {/* Due At */}
                            <div className="col-md-6">
                                <label className="form-label fw-bold">
                                    Due At
                                    <small className="text-muted fw-normal ms-2">(optional)</small>
                                </label>
                                <input
                                    type="datetime-local"
                                    className="form-control"
                                    name="dueAt"
                                    value={form.dueAt}
                                    onChange={handleChange}
                                />
                            </div>

                            {/* Grading Rubric JSON */}
                            <div className="col-12">
                                <label className="form-label fw-bold">
                                    Grading Rubric
                                    <small className="text-muted fw-normal ms-2">(optional JSON)</small>
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
                            <button
                                type="submit"
                                className="btn btn-primary-edulearn"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2"></span>
                                        {isEditMode ? 'Saving...' : 'Creating...'}
                                    </>
                                ) : (
                                    <>
                                        <i className="bi bi-check-lg me-2"></i>
                                        {isEditMode ? 'Save Changes' : 'Create Assessment'}
                                    </>
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