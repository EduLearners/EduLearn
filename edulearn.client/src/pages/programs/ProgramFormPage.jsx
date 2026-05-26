import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { programService } from '../../services/programService';
import { courseService } from '../../services/courseService';
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
    });

    const [allCourses, setAllCourses] = useState([]);
    const [requiredSelected, setRequiredSelected] = useState([]);
    const [electivesSelected, setElectivesSelected] = useState([]);
    const [loadingCourses, setLoadingCourses] = useState(false);
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(isEditMode);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState('');

    const canManage = ['DeptAdmin', 'ITAdmin'].includes(role);

    useEffect(() => {
        loadCourses();
        if (isEditMode) loadProgram();
    }, [id]);

    const loadCourses = async () => {
        try {
            setLoadingCourses(true);
            const data = await courseService.getAll();
            setAllCourses((data || []).filter(c => c.status === 'Active'));
        } catch {
            setAllCourses([]);
        } finally {
            setLoadingCourses(false);
        }
    };

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
            });
            setRequiredSelected(parseIds(data.requiredCoursesJSON));
            setElectivesSelected(parseIds(data.electivesJSON));
        } catch (err) {
            setError(err);
        } finally {
            setPageLoading(false);
        }
    };

    const parseIds = (json) => {
        if (!json) return [];
        try {
            const parsed = JSON.parse(json);
            if (!Array.isArray(parsed)) return [];
            return parsed.map(item => {
                if (typeof item === 'number') return item;
                if (typeof item === 'object') return item.courseId ?? item.courseID ?? null;
                return null;
            }).filter(Boolean);
        } catch { return []; }
    };

    const buildJSON = (selectedIds) => {
        if (selectedIds.length === 0) return null;
        const items = selectedIds.map(cid => {
            const course = allCourses.find(c => c.courseID === cid);
            return { courseId: cid, courseCode: course?.code || '' };
        });
        return JSON.stringify(items);
    };

    const toggleCourse = (courseId, type) => {
        if (type === 'required') {
            setRequiredSelected(prev =>
                prev.includes(courseId) ? prev.filter(id => id !== courseId) : [...prev, courseId]
            );
            setElectivesSelected(prev => prev.filter(id => id !== courseId));
        } else {
            setElectivesSelected(prev =>
                prev.includes(courseId) ? prev.filter(id => id !== courseId) : [...prev, courseId]
            );
            setRequiredSelected(prev => prev.filter(id => id !== courseId));
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
            requiredCoursesJSON: buildJSON(requiredSelected),
            electivesJSON: buildJSON(electivesSelected),
        };

        try {
            if (isEditMode) {
                await programService.update(id, payload);
                setSuccess('Program updated successfully.');
                setTimeout(() => navigate(`/programs/${id}`), 1200);
            } else {
                const created = await programService.create(payload);
                setSuccess('Program created successfully.');
                setTimeout(() => navigate(`/programs/${created.programID || ''}`), 1200);
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
                <i className="bi bi-shield-x me-2"></i>Only DeptAdmin and ITAdmin can manage programs.
            </div>
        );
    }

    if (pageLoading) return <Loading message="Loading program..." />;

    return (
        <div>
            <div className="d-flex align-items-center justify-content-between mb-4">
                <h2 className="text-primary-edulearn mb-0">
                    <i className="bi bi-mortarboard me-2"></i>
                    {isEditMode ? 'Edit Program' : 'New Program'}
                </h2>
                <button className="btn btn-outline-secondary" onClick={() => navigate(isEditMode ? `/programs/${id}` : '/programs')}>
                    <i className="bi bi-arrow-left me-1"></i>Back
                </button>
            </div>

            {success && <div className="alert alert-success"><i className="bi bi-check-circle me-2"></i>{success}</div>}
            <ErrorAlert error={error} onDismiss={() => setError(null)} />

            <form onSubmit={handleSubmit}>
                <div className="card shadow-sm mb-4">
                    <div className="card-header bg-primary-edulearn text-white">
                        <strong><i className="bi bi-pencil-square me-2"></i>Program Details</strong>
                    </div>
                    <div className="card-body">
                        <div className="row g-3">
                            <div className="col-md-8">
                                <label className="form-label fw-bold">Program Name <span className="text-danger">*</span></label>
                                <input type="text" className="form-control" name="name" value={form.name} onChange={handleChange}
                                    placeholder="e.g. Bachelor of Technology - Computer Science" maxLength={200} required />
                            </div>

                            <div className="col-md-4">
                                <label className="form-label fw-bold">Degree Type <span className="text-danger">*</span></label>
                                <select className="form-select" name="degreeType" value={form.degreeType} onChange={handleChange} required>
                                    <option value="">-- Select --</option>
                                    <option value="Bachelor">Bachelor</option>
                                    <option value="Master">Master</option>
                                    <option value="Ph.D">Ph.D</option>
                                    <option value="Diploma">Diploma</option>
                                </select>
                            </div>

                            <div className="col-md-4">
                                <label className="form-label fw-bold">Duration (Terms) <span className="text-danger">*</span></label>
                                {/* FIX: Added step={1} to prevent decimal term values */}
                                <input type="number" className="form-control" name="durationTerms" value={form.durationTerms}
                                    onChange={handleChange} min={1} max={20} step={1} required />
                                <div className="form-text">e.g. 8 terms = 4 years</div>
                            </div>

                            <div className="col-md-4">
                                <label className="form-label fw-bold">Department ID <small className="text-muted fw-normal ms-2">(optional)</small></label>
                                <input type="number" className="form-control" name="departmentID" value={form.departmentID}
                                    onChange={handleChange} placeholder="Optional" min={1} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="card shadow-sm mb-4">
                    <div className="card-header bg-light">
                        <strong><i className="bi bi-book me-2"></i>Assign Courses to this Program</strong>
                    </div>
                    <div className="card-body">
                        <div className="d-flex gap-3 mb-3">
                            <div className="p-2 rounded border text-center" style={{ minWidth: 120 }}>
                                <div className="fw-bold text-primary-edulearn fs-5">{requiredSelected.length}</div>
                                <small className="text-muted">Required</small>
                            </div>
                            <div className="p-2 rounded border text-center" style={{ minWidth: 120 }}>
                                <div className="fw-bold text-secondary fs-5">{electivesSelected.length}</div>
                                <small className="text-muted">Electives</small>
                            </div>
                            <div className="p-2 rounded border text-center" style={{ minWidth: 120 }}>
                                <div className="fw-bold text-success fs-5">
                                    {[...requiredSelected, ...electivesSelected].reduce((sum, cid) => {
                                        const c = allCourses.find(x => x.courseID === cid);
                                        return sum + (c?.credits || 0);
                                    }, 0)}
                                </div>
                                <small className="text-muted">Total Credits</small>
                            </div>
                        </div>

                        <div className="alert alert-info py-2 small mb-3">
                            <i className="bi bi-info-circle me-2"></i>
                            Check <strong>Required</strong> for mandatory courses. Check <strong>Elective</strong> for optional courses.
                            A course can only be in one category.
                        </div>

                        {loadingCourses ? (
                            <Loading message="Loading available courses..." />
                        ) : allCourses.length === 0 ? (
                            <div className="text-muted">No active courses found. Create courses first.</div>
                        ) : (
                            <div className="table-responsive">
                                <table className="table table-hover align-middle mb-0">
                                    <thead className="table-light">
                                        <tr>
                                            <th>Code</th><th>Title</th>
                                            <th className="text-center">Credits</th>
                                            <th className="text-center">Level</th>
                                            <th className="text-center">Required</th>
                                            <th className="text-center">Elective</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {allCourses.map(c => {
                                            const isRequired = requiredSelected.includes(c.courseID);
                                            const isElective = electivesSelected.includes(c.courseID);
                                            return (
                                                <tr key={c.courseID}
                                                    className={isRequired ? 'table-primary' : isElective ? 'table-secondary' : ''}>
                                                    <td><code>{c.code}</code></td>
                                                    <td className="fw-bold">{c.title}</td>
                                                    <td className="text-center">{c.credits}</td>
                                                    <td className="text-center"><span className="badge bg-secondary">{c.level}</span></td>
                                                    <td className="text-center">
                                                        <div className="form-check d-flex justify-content-center mb-0">
                                                            <input className="form-check-input" type="checkbox" checked={isRequired}
                                                                onChange={() => toggleCourse(c.courseID, 'required')}
                                                                style={{ cursor: 'pointer', width: 20, height: 20 }} />
                                                        </div>
                                                    </td>
                                                    <td className="text-center">
                                                        <div className="form-check d-flex justify-content-center mb-0">
                                                            <input className="form-check-input" type="checkbox" checked={isElective}
                                                                onChange={() => toggleCourse(c.courseID, 'elective')}
                                                                style={{ cursor: 'pointer', width: 20, height: 20 }} />
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                <div className="d-flex gap-2">
                    <button type="submit" className="btn btn-primary-edulearn" disabled={loading}>
                        {loading
                            ? <><span className="spinner-border spinner-border-sm me-2"></span>{isEditMode ? 'Saving...' : 'Creating...'}</>
                            : <><i className="bi bi-check-lg me-2"></i>{isEditMode ? 'Save Changes' : 'Create Program'}</>}
                    </button>
                    <button type="button" className="btn btn-outline-secondary"
                        onClick={() => navigate(isEditMode ? `/programs/${id}` : '/programs')} disabled={loading}>
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}
