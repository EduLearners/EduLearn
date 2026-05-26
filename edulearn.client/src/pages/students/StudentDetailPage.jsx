import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { studentService } from '../../services/studentService';
import { programService } from '../../services/programService';
import { authService } from '../../services/authService';
import Loading from '../../components/Loading';
import ErrorAlert from '../../components/ErrorAlert';
import StatusBadge from '../../components/StatusBadge';

export default function StudentDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [student, setStudent] = useState(null);
    const [program, setProgram] = useState(null);   // resolved program name
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [editMode, setEditMode] = useState(false);

    // Editable form fields (phase4-fix-11: contactInfoJSON replaced with email + phone)
    const [form, setForm] = useState({
        name: '',
        gender: '',
        email: '',
        phone: '',
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
            // phase4-fix-11: parse contactInfoJSON into separate email/phone fields
            let parsedEmail = '';
            let parsedPhone = '';
            if (data.contactInfoJSON) {
                try {
                    const ci = JSON.parse(data.contactInfoJSON);
                    parsedEmail = ci.email || '';
                    parsedPhone = ci.phone || '';
                } catch { /* ignore malformed JSON */ }
            }
            setForm({
                name: data.name || '',
                gender: data.gender || '',
                email: parsedEmail,
                phone: parsedPhone,
                expectedGraduationTerm: data.expectedGraduationTerm || '',
                enrollmentStatus: data.enrollmentStatus || 'Active',
            });
            // Load program name
            if (data.programID) {
                programService.getById(data.programID)
                    .then(p => setProgram(p))
                    .catch(() => setProgram(null));
            }
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    // phase4-fix-11: validate email + phone before saving
    const phoneDigits = form.phone.replace(/\D/g, '');
    const phoneInvalid = form.phone.length > 0 && phoneDigits.length !== 10;
    const emailInvalid = form.email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);

    const handleSave = async (e) => {
        e.preventDefault();
        if (phoneInvalid) { setError({ message: 'Phone number must be exactly 10 digits.' }); return; }
        if (emailInvalid) { setError({ message: 'Please enter a valid email address.' }); return; }
        try {
            setSaving(true);
            setError(null);
            // Build contactInfoJSON from individual fields; exclude email/phone from top-level (not in DTO)
            const contactInfo = {};
            if (form.email) contactInfo.email = form.email;
            if (form.phone) contactInfo.phone = form.phone;
            const { email: _e, phone: _p, ...rest } = form;
            const payload = { ...rest, contactInfoJSON: JSON.stringify(contactInfo) };
            await studentService.update(id, payload);
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
                                    {/* phase4-fix-11: individual email + phone fields instead of raw JSON textarea */}
                                    <div className="mb-3">
                                        <label className="form-label fw-bold">Email</label>
                                        <input
                                            type="email"
                                            className={`form-control${emailInvalid ? ' is-invalid' : ''}`}
                                            value={form.email}
                                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                                            placeholder="student@example.com"
                                            maxLength={255}
                                        />
                                        {emailInvalid && (
                                            <div className="invalid-feedback">Enter a valid email address.</div>
                                        )}
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label fw-bold">Phone</label>
                                        <input
                                            type="text"
                                            className={`form-control${phoneInvalid ? ' is-invalid' : ''}`}
                                            value={form.phone}
                                            onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                            placeholder="9876543210"
                                            pattern="[0-9]{10}"
                                            minLength={10}
                                            maxLength={10}
                                        />
                                        {phoneInvalid && (
                                            <div className="invalid-feedback">Enter a 10-digit phone number.</div>
                                        )}
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
                                    <dd className="col-sm-8"><code>{student.studentID}</code></dd>

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
                                    <dt className="col-sm-5 text-muted">Program</dt>
                                    <dd className="col-sm-7">
                                        {program ? (
                                            <button
                                                className="btn btn-link p-0 text-decoration-none text-start fw-bold"
                                                onClick={() => navigate(`/programs/${student.programID}`)}
                                                title="View program details"
                                            >
                                                <i className="bi bi-mortarboard me-1"></i>
                                                {program.name}
                                                <span className="badge bg-secondary ms-2">{program.degreeType}</span>
                                            </button>
                                        ) : student.programID ? (
                                            <span className="text-muted">Program {student.programID}</span>
                                        ) : '—'}
                                    </dd>

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
                                onClick={() => navigate(`/enrollment?studentId=${student.studentID}&programId=${student.programID || ''}`)}
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
