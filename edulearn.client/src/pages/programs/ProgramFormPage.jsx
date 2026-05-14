import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { programService } from '../../services/programService';
import { authService } from '../../services/authService';
import ErrorAlert from '../../components/ErrorAlert';
import Loading from '../../components/Loading';

export default function ProgramFormPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { role } = authService.getCurrentUser();
    const isEditMode = !!id;

    const [form, setForm] = useState({
        name: '',
        degreeType: '',
        departmentID: '',
        durationTerms: 8,
        requiredCoursesJSON: '',
        electivesJSON: '',
    });
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(isEditMode);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState('');

    // Backend DeptAdminPolicy: DeptAdmin + ITAdmin only
    const canManage = ['DeptAdmin', 'ITAdmin'].includes(role);

    useEffect(() => {
        if (isEditMode) loadProgram();
    }, [id]);

    const loadProgram = async () => {
        try {
            setPageLoading(true);
            setError(null);
            const data = await programService.getById(id);
            setForm({
                name: data.name || '',
                degreeType: data.degreeType || '',
                departmentID: data.departmentID || '',
                durationTerms: data.durationTerms || 8,
                requiredCoursesJSON: data.requiredCoursesJSON || '',
                electivesJSON: data.electivesJSON || '',
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
            name: form.name,
            degreeType: form.degreeType,
            departmentID: form.departmentID ? Number(form.departmentID) : null,
            durationTerms: Number(form.durationTerms),
            requiredCoursesJSON: form.requiredCoursesJSON || null,
            electivesJSON: form.electivesJSON || null,
        };

        try {
            if (isEditMode) {
                await programService.update(id, payload);
                setSuccess('Program updated successfully.');
                setTimeout(() => navigate(`/programs/${id}`), 1200);
            } else {
                const created = await programService.create(payload);
                setSuccess('Program created successfully.');
                setTimeout(
                    () => navigate(`/programs/${created.programID || ''}`),
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
                Only DeptAdmin and ITAdmin can manage programs.
            </div>
        );
    }

    if (pageLoading) return <Loading message="Loading program..." />;

    return (
        <div>
            {/* Page Header */}
            <div className="d-flex align-items-center justify-content-between mb-4">
                <h2 className="text-primary-edulearn mb-0">
                    <i className="bi bi-mortarboard me-2"></i>
                    {isEditMode ? 'Edit Program' : 'New Program'}
                </h2>
                <button
                    className="btn btn-outline-secondary"
                    onClick={() => navigate(isEditMode ? `/programs/${id}` : '/programs')}
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
                        {isEditMode ? 'Edit Program Details' : 'Program Details'}
                    </strong>
                </div>
                <div className="card-body">
                    <form onSubmit={handleSubmit}>
                        <div className="row g-3">

                            {/* Name */}
                            <div className="col-md-8">
                                <label className="form-label fw-bold">
                                    Program Name <span className="text-danger">*</span>
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    name="name"
                                    value={form.name}
                                    onChange={handleChange}
                                    placeholder="e.g. Computer Science"
                                    maxLength={200}
                                    required
                                />
                            </div>

                            {/* Degree Type */}
                            <div className="col-md-4">
                                <label className="form-label fw-bold">
                                    Degree Type <span className="text-danger">*</span>
                                </label>
                                <select
                                    className="form-select"
                                    name="degreeType"
                                    value={form.degreeType}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="">-- Select --</option>
                                    <option value="B.Tech">B.Tech</option>
                                    <option value="B.Sc">B.Sc</option>
                                    <option value="B.Com">B.Com</option>
                                    <option value="B.A">B.A</option>
                                    <option value="M.Tech">M.Tech</option>
                                    <option value="M.Sc">M.Sc</option>
                                    <option value="MBA">MBA</option>
                                    <option value="MCA">MCA</option>
                                    <option value="PhD">PhD</option>
                                    <option value="Diploma">Diploma</option>
                                </select>
                            </div>

                            {/* Duration Terms */}
                            <div className="col-md-4">
                                <label className="form-label fw-bold">
                                    Duration (Terms) <span className="text-danger">*</span>
                                </label>
                                <input
                                    type="number"
                                    className="form-control"
                                    name="durationTerms"
                                    value={form.durationTerms}
                                    onChange={handleChange}
                                    min={1}
                                    max={20}
                                    required
                                />
                                <div className="form-text">
                                    e.g. 8 terms = 4 years (semester system)
                                </div>
                            </div>

                            {/* Department ID */}
                            <div className="col-md-4">
                                <label className="form-label fw-bold">
                                    Department ID
                                    <small className="text-muted fw-normal ms-2">(optional)</small>
                                </label>
                                <input
                                    type="number"
                                    className="form-control"
                                    name="departmentID"
                                    value={form.departmentID}
                                    onChange={handleChange}
                                    placeholder="Optional"
                                    min={1}
                                />
                            </div>

                            {/* Required Courses JSON */}
                            <div className="col-12">
                                <label className="form-label fw-bold">
                                    Required Courses
                                    <small className="text-muted fw-normal ms-2">
                                        (optional — JSON array of course codes)
                                    </small>
                                </label>
                                <textarea
                                    className="form-control font-monospace"
                                    name="requiredCoursesJSON"
                                    value={form.requiredCoursesJSON}
                                    onChange={handleChange}
                                    rows={3}
                                    placeholder='e.g. ["CS101", "MATH101", "PHY101"]'
                                />
                            </div>

                            {/* Electives JSON */}
                            <div className="col-12">
                                <label className="form-label fw-bold">
                                    Electives
                                    <small className="text-muted fw-normal ms-2">
                                        (optional — JSON array of course codes)
                                    </small>
                                </label>
                                <textarea
                                    className="form-control font-monospace"
                                    name="electivesJSON"
                                    value={form.electivesJSON}
                                    onChange={handleChange}
                                    rows={3}
                                    placeholder='e.g. ["CS401", "CS402", "CS403"]'
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
                                        {isEditMode ? 'Save Changes' : 'Create Program'}
                                    </>
                                )}
                            </button>
                            <button
                                type="button"
                                className="btn btn-outline-secondary"
                                onClick={() => navigate(isEditMode ? `/programs/${id}` : '/programs')}
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