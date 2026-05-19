import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { courseService } from '../../services/courseService';
import { authService } from '../../services/authService';
import { emptyCourse } from '../../models/Course';
import ErrorAlert from '../../components/ErrorAlert';
import Loading from '../../components/Loading';

export default function CourseFormPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { role } = authService.getCurrentUser();
    const isEditMode = !!id;

    const [form, setForm] = useState(emptyCourse());
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(isEditMode);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState('');

    // Backend CourseManagerPolicy: Instructor + DeptAdmin + ITAdmin
    const canManage = ['Instructor', 'DeptAdmin', 'ITAdmin'].includes(role);

    useEffect(() => {
        if (isEditMode) loadCourse();
    }, [id]);

    const loadCourse = async () => {
        try {
            setPageLoading(true);
            setError(null);
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

        try {
            if (isEditMode) {
                await courseService.update(id, form);
                setSuccess('Course updated successfully.');
                setTimeout(() => navigate(`/courses/${id}`), 1200);
            } else {
                const created = await courseService.create(form);
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
            {/* Page Header */}
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
                                    className="form-control"
                                    name="code"
                                    value={form.code}
                                    onChange={handleChange}
                                    placeholder="e.g. CS101"
                                    maxLength={20}
                                    required
                                    disabled={isEditMode}
                                />
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
                                    className="form-control"
                                    name="title"
                                    value={form.title}
                                    onChange={handleChange}
                                    placeholder="e.g. Introduction to Computer Science"
                                    maxLength={200}
                                    required
                                />
                            </div>

                            <div className="col-md-3">
                                <label className="form-label fw-bold">
                                    Credits <span className="text-danger">*</span>
                                </label>
                                <input
                                    type="number"
                                    className="form-control"
                                    name="credits"
                                    value={form.credits}
                                    onChange={handleChange}
                                    min={1}
                                    max={12}
                                    required
                                />
                            </div>

                            <div className="col-md-3">
                                <label className="form-label fw-bold">
                                    Level
                                    <small className="text-muted fw-normal ms-2">(e.g. UG / PG)</small>
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    name="level"
                                    value={form.level}
                                    onChange={handleChange}
                                    placeholder="e.g. UG"
                                    maxLength={20}
                                />
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
                                <label className="form-label fw-bold">
                                    Prerequisites
                                    <small className="text-muted fw-normal ms-2">(plain text or JSON)</small>
                                </label>
                                <textarea
                                    className="form-control font-monospace"
                                    name="prerequisitesJSON"
                                    value={form.prerequisitesJSON}
                                    onChange={handleChange}
                                    rows={4}
                                    placeholder='e.g. {"courses":["CS100","MATH101"]}'
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
