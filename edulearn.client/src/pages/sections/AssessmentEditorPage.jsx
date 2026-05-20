// AssessmentEditorPage.jsx
// Route: /teaching/sections/:id/assessments
// Owner: Vikash
// Section-scoped assessment list for Instructors.
// Create, edit and delete assessments belonging to this section's course.

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { sectionService }    from '../../services/sectionService';
import { assessmentService } from '../../services/assessmentService';
import { authService }       from '../../services/authService';
import Loading               from '../../components/Loading';
import ErrorAlert            from '../../components/ErrorAlert';
import StatusBadge           from '../../components/StatusBadge';
import EmptyState            from '../../components/shared/EmptyState';
import ConfirmDialog         from '../../components/ConfirmDialog';

const ASSESSMENT_TYPES = ['Assignment', 'Quiz', 'Exam', 'Project', 'Lab', 'Presentation'];

const emptyForm = {
    title: '',
    type: 'Assignment',
    maxScore: '',
    dueDate: '',
    instructions: '',
    status: 'Draft',
};

export default function AssessmentEditorPage() {
    const { id } = useParams();   // sectionID
    const navigate = useNavigate();
    const { role } = authService.getCurrentUser();

    const [section,     setSection]     = useState(null);
    const [assessments, setAssessments] = useState([]);
    const [loading,     setLoading]     = useState(true);
    const [error,       setError]       = useState(null);
    const [success,     setSuccess]     = useState('');
    const [saving,      setSaving]      = useState(false);

    const [showForm,    setShowForm]    = useState(false);
    const [editTarget,  setEditTarget]  = useState(null);   // null = create, obj = edit
    const [form,        setForm]        = useState(emptyForm);
    const [formError,   setFormError]   = useState(null);

    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [deleting,      setDeleting]      = useState(false);

    const canManage = ['Instructor', 'ITAdmin'].includes(role);

    useEffect(() => { loadAll(); }, [id]);

    const loadAll = async () => {
        try {
            setLoading(true);
            setError(null);
            const [sec, assess] = await Promise.all([
                sectionService.getById(id),
                assessmentService.getBySection(id).catch(() => []),
            ]);
            setSection(sec);
            setAssessments(assess || []);
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    const openCreate = () => {
        setEditTarget(null);
        setForm({ ...emptyForm, courseID: section?.courseID || '' });
        setFormError(null);
        setSuccess('');
        setShowForm(true);
    };

    const openEdit = (a) => {
        setEditTarget(a);
        setForm({
            title:        a.title,
            type:         a.type,
            maxScore:     String(a.maxScore ?? ''),
            dueDate:      a.dueDate ? a.dueDate.split('T')[0] : '',
            instructions: a.instructions || '',
            status:       a.status,
        });
        setFormError(null);
        setSuccess('');
        setShowForm(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError(null);
        setSaving(true);
        try {
            const payload = {
                courseID:     section.courseID,
                sectionID:    Number(id),
                title:        form.title,
                type:         form.type,
                maxScore:     Number(form.maxScore),
                dueDate:      form.dueDate || null,
                instructions: form.instructions || null,
                status:       form.status,
            };

            if (editTarget) {
                await assessmentService.update(editTarget.assessmentID, payload);
                setSuccess(`Assessment "${form.title}" updated.`);
            } else {
                await assessmentService.create(payload);
                setSuccess(`Assessment "${form.title}" created.`);
            }
            setShowForm(false);
            await loadAll();
        } catch (err) {
            setFormError(err);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteConfirm) return;
        setDeleting(true);
        try {
            await assessmentService.remove(deleteConfirm.assessmentID);
            setSuccess(`Assessment "${deleteConfirm.title}" deleted.`);
            setDeleteConfirm(null);
            await loadAll();
        } catch (err) {
            setError(err);
        } finally {
            setDeleting(false);
        }
    };

    if (loading) return <Loading message="Loading assessments..." />;

    return (
        <div>
            {/* Header */}
            <div className="d-flex align-items-center justify-content-between mb-4">
                <div>
                    <h2 className="text-primary-edulearn mb-1">
                        <i className="bi bi-file-earmark-check me-2"></i>Section Assessments
                    </h2>
                    {section && (
                        <p className="text-muted mb-0 small">
                            {section.courseName} &nbsp;·&nbsp; {section.term}
                        </p>
                    )}
                </div>
                <div className="d-flex gap-2">
                    {canManage && (
                        <button className="btn btn-primary-edulearn" onClick={openCreate}>
                            <i className="bi bi-plus-lg me-2"></i>New Assessment
                        </button>
                    )}
                    <button
                        className="btn btn-outline-secondary"
                        onClick={() => navigate(`/sections/${id}`)}
                    >
                        <i className="bi bi-arrow-left me-1"></i>Back
                    </button>
                </div>
            </div>

            <ErrorAlert error={error} onDismiss={() => setError(null)} />
            {success && (
                <div className="alert alert-success d-flex align-items-center">
                    <i className="bi bi-check-circle me-2"></i>{success}
                    <button className="btn-close ms-auto" onClick={() => setSuccess('')}></button>
                </div>
            )}

            {/* Assessment list */}
            <div className="card shadow-sm">
                <div className="card-header bg-light d-flex align-items-center justify-content-between">
                    <strong>
                        <i className="bi bi-list-check me-2"></i>
                        Assessments ({assessments.length})
                    </strong>
                    <button
                        className="btn btn-outline-primary btn-sm"
                        onClick={() => navigate(`/teaching/sections/${id}/gradebook`)}
                    >
                        <i className="bi bi-table me-1"></i>Gradebook
                    </button>
                </div>

                {assessments.length === 0 ? (
                    <div className="card-body p-0">
                        <EmptyState
                            icon="bi-file-earmark-plus"
                            title="No assessments yet"
                            description="Create the first assessment for this section."
                            action={canManage ? { label: 'Create Assessment', onClick: openCreate } : undefined}
                        />
                    </div>
                ) : (
                    <div className="list-group list-group-flush">
                        {assessments.map(a => (
                            <div key={a.assessmentID} className="list-group-item p-3">
                                <div className="row align-items-center">
                                    <div className="col-md-6">
                                        <div className="d-flex align-items-center gap-2 mb-1">
                                            <span className="fw-bold">{a.title}</span>
                                            <StatusBadge status={a.status} />
                                            <span className="badge bg-light text-dark border">
                                                {a.type}
                                            </span>
                                        </div>
                                        <div className="small text-muted">
                                            <i className="bi bi-star me-1"></i>Max score: <strong>{a.maxScore ?? '—'}</strong>
                                            {a.dueDate && (
                                                <>
                                                    <span className="mx-2">·</span>
                                                    <i className="bi bi-calendar me-1"></i>
                                                    Due: {new Date(a.dueDate).toLocaleDateString()}
                                                </>
                                            )}
                                        </div>
                                        {a.instructions && (
                                            <p className="small text-muted mb-0 mt-1" style={{
                                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 400
                                            }}>
                                                {a.instructions}
                                            </p>
                                        )}
                                    </div>
                                    <div className="col-md-6 d-flex justify-content-end gap-2">
                                        <button
                                            className="btn btn-outline-primary btn-sm"
                                            onClick={() => navigate(`/submissions?assessmentId=${a.assessmentID}`)}
                                        >
                                            <i className="bi bi-cloud-upload me-1"></i>Submissions
                                        </button>
                                        {canManage && (
                                            <>
                                                <button
                                                    className="btn btn-outline-secondary btn-sm"
                                                    onClick={() => openEdit(a)}
                                                >
                                                    <i className="bi bi-pencil me-1"></i>Edit
                                                </button>
                                                <button
                                                    className="btn btn-outline-danger btn-sm"
                                                    onClick={() => setDeleteConfirm(a)}
                                                >
                                                    <i className="bi bi-trash me-1"></i>Delete
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Create / Edit Modal */}
            {showForm && (
                <>
                    <div className="modal-backdrop fade show"></div>
                    <div className="modal fade show d-block" tabIndex="-1">
                        <div className="modal-dialog modal-dialog-centered modal-lg">
                            <div className="modal-content">
                                <div className="modal-header bg-primary-edulearn text-white">
                                    <h5 className="modal-title">
                                        <i className="bi bi-file-earmark-plus me-2"></i>
                                        {editTarget ? 'Edit Assessment' : 'New Assessment'}
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
                                            <div className="col-md-8">
                                                <label className="form-label fw-bold">
                                                    Title <span className="text-danger">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={form.title}
                                                    onChange={e => setForm({ ...form, title: e.target.value })}
                                                    maxLength={200}
                                                    required
                                                    autoFocus
                                                />
                                            </div>
                                            <div className="col-md-4">
                                                <label className="form-label fw-bold">Type</label>
                                                <select
                                                    className="form-select"
                                                    value={form.type}
                                                    onChange={e => setForm({ ...form, type: e.target.value })}
                                                >
                                                    {ASSESSMENT_TYPES.map(t => (
                                                        <option key={t} value={t}>{t}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="col-md-4">
                                                <label className="form-label fw-bold">
                                                    Max Score <span className="text-danger">*</span>
                                                </label>
                                                <input
                                                    type="number"
                                                    className="form-control"
                                                    value={form.maxScore}
                                                    onChange={e => setForm({ ...form, maxScore: e.target.value })}
                                                    min={1}
                                                    required
                                                />
                                            </div>
                                            <div className="col-md-4">
                                                <label className="form-label fw-bold">Due Date</label>
                                                <input
                                                    type="date"
                                                    className="form-control"
                                                    value={form.dueDate}
                                                    onChange={e => setForm({ ...form, dueDate: e.target.value })}
                                                />
                                            </div>
                                            <div className="col-md-4">
                                                <label className="form-label fw-bold">Status</label>
                                                <select
                                                    className="form-select"
                                                    value={form.status}
                                                    onChange={e => setForm({ ...form, status: e.target.value })}
                                                >
                                                    <option value="Draft">Draft</option>
                                                    <option value="Published">Published</option>
                                                    <option value="Closed">Closed</option>
                                                </select>
                                            </div>
                                            <div className="col-12">
                                                <label className="form-label fw-bold">Instructions</label>
                                                <textarea
                                                    className="form-control"
                                                    value={form.instructions}
                                                    onChange={e => setForm({ ...form, instructions: e.target.value })}
                                                    rows={4}
                                                    placeholder="Describe what students need to do..."
                                                />
                                            </div>
                                        </div>
                                        <ErrorAlert error={formError} onDismiss={() => setFormError(null)} />
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
                                                <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</>
                                            ) : (
                                                <><i className="bi bi-check-lg me-2"></i>{editTarget ? 'Save Changes' : 'Create'}</>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Delete confirmation */}
            <ConfirmDialog
                show={!!deleteConfirm}
                title="Delete Assessment"
                message={deleteConfirm
                    ? `Delete "${deleteConfirm.title}"? This will also remove all student submissions for this assessment. This action cannot be undone.`
                    : ''}
                onConfirm={handleDelete}
                onCancel={() => setDeleteConfirm(null)}
                confirmText={deleting ? 'Deleting...' : 'Delete'}
                confirmVariant="danger"
            />
        </div>
    );
}
