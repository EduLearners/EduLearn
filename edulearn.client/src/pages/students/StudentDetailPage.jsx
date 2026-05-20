import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { studentService } from '../../services/studentService';
import { authService } from '../../services/authService';
import Loading from '../../components/Loading';
import ErrorAlert from '../../components/ErrorAlert';
import StatusBadge from '../../components/StatusBadge';

export default function StudentDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [student, setStudent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [editMode, setEditMode] = useState(false);

    // Editable form fields
    const [form, setForm] = useState({
        name: '',
        gender: '',
        contactInfoJSON: '',
        expectedGraduationTerm: '',
        enrollmentStatus: 'Active',
    });

    const { role } = authService.getCurrentUser();
    const canEdit = ['Registrar', 'ITAdmin'].includes(role);

    useEffect(() => {
        loadStudent();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const loadStudent = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await studentService.getById(id);
            setStudent(data);
            setForm({
                name: data.name || '',
                gender: data.gender || '',
                contactInfoJSON: data.contactInfoJSON || '',
                expectedGraduationTerm: data.expectedGraduationTerm || '',
                enrollmentStatus: data.enrollmentStatus || 'Active',
            });
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            setSaving(true);
            setError(null);
            await studentService.update(id, form);
            await loadStudent();
            setEditMode(false);
        } catch (err) {
            setError(err);
        } finally {
            setSaving(false);
        }
    };

    // Parse contact info JSON if present
    const contactInfo = (() => {
        if (!student?.contactInfoJSON) return {};
        try {
            return JSON.parse(student.contactInfoJSON);
        } catch {
            return {};
        }
    })();

    if (loading) return <Loading message="Loading student profile..." />;

    if (error && !student) {
        return (
            <div>
                <button className="btn btn-link mb-3" onClick={() => navigate('/students')}>
                    <i className="bi bi-arrow-left me-1"></i>Back to Students
                </button>
                <ErrorAlert error={error} />
            </div>
        );
    }

    return (
        <div>
            {/* Back + actions */}
            <div className="d-flex align-items-center justify-content-between mb-4">
                <button className="btn btn-link p-0" onClick={() => navigate('/students')}>
                    <i className="bi bi-arrow-left me-1"></i>Back to Students
                </button>

                <div className="d-flex gap-2">
                    {canEdit && !editMode && (
                        <button className="btn btn-primary-edulearn" onClick={() => setEditMode(true)}>
                            <i className="bi bi-pencil me-2"></i>Edit
                        </button>
                    )}
                </div>
            </div>

            {/* Title */}
            <div className="d-flex align-items-center mb-4">
                <div className="rounded-circle bg-primary-edulearn d-flex align-items-center justify-content-center me-3"
                    style={{ width: 60, height: 60 }}>
                    <i className="bi bi-person-fill text-white" style={{ fontSize: '2rem' }}></i>
                </div>
                <div>
                    <h2 className="mb-0 text-primary-edulearn">{student.name}</h2>
                    <div className="d-flex align-items-center gap-2 mt-1">
                        <code>{student.mrn}</code>
                        <StatusBadge status={student.enrollmentStatus} />
                    </div>
                </div>
            </div>

            <ErrorAlert error={error} onDismiss={() => setError(null)} />

            <div className="row g-4">
                {/* Personal Info */}
                <div className="col-md-6">
                    <div className="card shadow-sm h-100">
                        <div className="card-header bg-primary-edulearn text-white">
                            <i className="bi bi-person me-2"></i>Personal Information
                        </div>
                        <div className="card-body">
                            {editMode ? (
                                <form onSubmit={handleSave}>
                                    <div className="mb-3">
                                        <label className="form-label fw-bold">Name</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={form.name}
                                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label fw-bold">Gender</label>
                                        <select
                                            className="form-select"
                                            value={form.gender}
                                            onChange={(e) => setForm({ ...form, gender: e.target.value })}
                                        >
                                            <option value="">—</option>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                            <option value="Other">Other</option>
                                            <option value="Prefer not to say">Prefer not to say</option>
                                        </select>
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label fw-bold">Contact Info (JSON)</label>
                                        <textarea
                                            className="form-control font-monospace small"
                                            rows={3}
                                            value={form.contactInfoJSON}
                                            onChange={(e) => setForm({ ...form, contactInfoJSON: e.target.value })}
                                            placeholder='{"email":"...","phone":"..."}'
                                        />
                                    </div>

                                    <div className="d-flex gap-2">
                                        <button type="submit" className="btn btn-primary-edulearn" disabled={saving}>
                                            {saving ? (
                                                <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</>
                                            ) : (
                                                <><i className="bi bi-check-lg me-1"></i>Save</>
                                            )}
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-outline-secondary"
                                            onClick={() => { setEditMode(false); loadStudent(); }}
                                            disabled={saving}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <dl className="row mb-0">
                                    <dt className="col-sm-4 text-muted">Name</dt>
                                    <dd className="col-sm-8">{student.name}</dd>

                                    <dt className="col-sm-4 text-muted">Student ID</dt>
                                    <dd className="col-sm-8"><code>#{student.studentID}</code></dd>

                                    <dt className="col-sm-4 text-muted">MRN</dt>
                                    <dd className="col-sm-8"><code>{student.mrn}</code></dd>

                                    <dt className="col-sm-4 text-muted">Date of Birth</dt>
                                    <dd className="col-sm-8">
                                        {student.dob ? new Date(student.dob).toLocaleDateString() : '—'}
                                    </dd>

                                    <dt className="col-sm-4 text-muted">Gender</dt>
                                    <dd className="col-sm-8">{student.gender || '—'}</dd>

                                    <dt className="col-sm-4 text-muted">Email</dt>
                                    <dd className="col-sm-8">{contactInfo.email || '—'}</dd>

                                    <dt className="col-sm-4 text-muted">Phone</dt>
                                    <dd className="col-sm-8">{contactInfo.phone || '—'}</dd>
                                </dl>
                            )}
                        </div>
                    </div>
                </div>

                {/* Academic Info */}
                <div className="col-md-6">
                    <div className="card shadow-sm h-100">
                        <div className="card-header bg-primary-edulearn text-white">
                            <i className="bi bi-mortarboard me-2"></i>Academic Information
                        </div>
                        <div className="card-body">
                            {editMode ? (
                                <>
                                    <div className="mb-3">
                                        <label className="form-label fw-bold">Expected Graduation Term</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="e.g. 2030-Spring"
                                            value={form.expectedGraduationTerm}
                                            onChange={(e) => setForm({ ...form, expectedGraduationTerm: e.target.value })}
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label fw-bold">Enrollment Status</label>
                                        <select
                                            className="form-select"
                                            value={form.enrollmentStatus}
                                            onChange={(e) => setForm({ ...form, enrollmentStatus: e.target.value })}
                                        >
                                            <option value="Active">Active</option>
                                            <option value="Graduated">Graduated</option>
                                            <option value="Withdrawn">Withdrawn</option>
                                            <option value="Suspended">Suspended</option>
                                        </select>
                                    </div>
                                </>
                            ) : (
                                <dl className="row mb-0">
                                    <dt className="col-sm-5 text-muted">Program ID</dt>
                                    <dd className="col-sm-7">{student.programID || '—'}</dd>

                                    <dt className="col-sm-5 text-muted">Entry Term</dt>
                                    <dd className="col-sm-7">{student.entryTerm || '—'}</dd>

                                    <dt className="col-sm-5 text-muted">Expected Graduation</dt>
                                    <dd className="col-sm-7">{student.expectedGraduationTerm || '—'}</dd>

                                    <dt className="col-sm-5 text-muted">Enrollment Status</dt>
                                    <dd className="col-sm-7">
                                        <StatusBadge status={student.enrollmentStatus} />
                                    </dd>

                                    <dt className="col-sm-5 text-muted">Created</dt>
                                    <dd className="col-sm-7">
                                        {student.createdAt
                                            ? new Date(student.createdAt).toLocaleDateString()
                                            : '—'}
                                    </dd>
                                </dl>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            {!editMode && (
                <div className="card shadow-sm mt-4">
                    <div className="card-body">
                        <h6 className="text-muted mb-3">
                            <i className="bi bi-lightning me-2"></i>Quick Actions
                        </h6>
                        <div className="d-flex gap-2 flex-wrap">
                            <button
                                className="btn btn-outline-primary"
                                onClick={() => navigate(`/transcripts?studentId=${student.studentID}`)}
                            >
                                <i className="bi bi-file-earmark-text me-1"></i>View Transcripts
                            </button>
                            <button
                                className="btn btn-outline-primary"
                                onClick={() => navigate(`/enrollment?studentId=${student.studentID}`)}
                            >
                                <i className="bi bi-card-checklist me-1"></i>Enrollments
                            </button>
                            <button
                                className="btn btn-outline-primary"
                                onClick={() => navigate(`/timetable?studentId=${student.studentID}`)}
                            >
                                <i className="bi bi-calendar3 me-1"></i>Timetable
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
