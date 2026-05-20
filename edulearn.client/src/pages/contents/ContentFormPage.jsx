import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { contentService } from '../../services/contentService';
import { authService } from '../../services/authService';
import { emptyContent, ContentType } from '../../models/Content';
import ErrorAlert from '../../components/ErrorAlert';
import Loading from '../../components/Loading';

export default function ContentFormPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { role } = authService.getCurrentUser();
    const isEditMode = !!id;

    const [form, setForm] = useState(emptyContent());
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(isEditMode);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState('');

    const canManage = ['Instructor', 'ITAdmin'].includes(role);

    useEffect(() => {
        if (isEditMode) loadContent();
    }, [id]);

    const loadContent = async () => {
        try {
            setPageLoading(true);
            setError(null);
            const data = await contentService.getById(id);
            setForm({
                courseID: data.courseID || 0,
                title: data.title || '',
                type: data.type || ContentType.DOCUMENT,
                uri: data.uri || '',
                metadataJSON: data.metadataJSON || '',
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

        const payload = {
            ...form,
            courseID: Number(form.courseID),
        };

        try {
            if (isEditMode) {
                await contentService.update(id, payload);
                setSuccess('Content updated successfully.');
                setTimeout(() => navigate(`/contents/${id}`), 1200);
            } else {
                const created = await contentService.create(payload);
                setSuccess('Content created successfully.');
                setTimeout(
                    () => navigate(`/contents/${created.contentID || ''}`),
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

    if (pageLoading) return <Loading message="Loading content..." />;

    return (
        <div>
            {/* Page Header */}
            <div className="d-flex align-items-center justify-content-between mb-4">
                <h2 className="text-primary-edulearn mb-0">
                    <i className="bi bi-collection-play me-2"></i>
                    {isEditMode ? 'Edit Content' : 'New Content'}
                </h2>
                <button
                    className="btn btn-outline-secondary"
                    onClick={() =>
                        navigate(isEditMode ? `/contents/${id}` : '/contents')
                    }
                >
                    <i className="bi bi-arrow-left me-1"></i>Back
                </button>
            </div>

            {/* Success Alert */}
            {success && (
                <div className="alert alert-success">
                    <i className="bi bi-check-circle me-2"></i>{success}
                </div>
            )}

            {/* Error Alert */}
            <ErrorAlert error={error} onDismiss={() => setError(null)} />

            {/* Form Card */}
            <div className="card shadow-sm">
                <div className="card-header bg-primary-edulearn text-white">
                    <strong>
                        <i className="bi bi-pencil-square me-2"></i>
                        {isEditMode ? 'Edit Content Details' : 'Content Details'}
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
                                    placeholder="e.g. Introduction to React Hooks"
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
                                    {Object.values(ContentType).map(t => (
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
                                    Enter the ID of the course this content belongs to.
                                </div>
                            </div>

                            {/* URI */}
                            <div className="col-md-8">
                                <label className="form-label fw-bold">
                                    Content URI <span className="text-danger">*</span>
                                </label>
                                <div className="input-group">
                                    <span className="input-group-text">
                                        <i className="bi bi-link-45deg"></i>
                                    </span>
                                    <input
                                        type="text"
                                        className="form-control"
                                        name="uri"
                                        value={form.uri}
                                        onChange={handleChange}
                                        placeholder="https://..."
                                        maxLength={500}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Metadata JSON */}
                            <div className="col-12">
                                <label className="form-label fw-bold">
                                    Metadata
                                    <small className="text-muted fw-normal ms-2">
                                        (optional JSON)
                                    </small>
                                </label>
                                <textarea
                                    className="form-control font-monospace"
                                    name="metadataJSON"
                                    value={form.metadataJSON}
                                    onChange={handleChange}
                                    rows={4}
                                    placeholder='e.g. {"duration": "45 mins", "language": "English"}'
                                />
                            </div>

                        </div>

                        {/* Form Actions */}
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
                                        {isEditMode ? 'Save Changes' : 'Create Content'}
                                    </>
                                )}
                            </button>
                            <button
                                type="button"
                                className="btn btn-outline-secondary"
                                onClick={() =>
                                    navigate(isEditMode ? `/contents/${id}` : '/contents')
                                }
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