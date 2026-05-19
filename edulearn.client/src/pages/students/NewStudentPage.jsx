import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { studentService } from '../../services/studentService';
import { programService } from '../../services/programService';
import { userService } from '../../services/userService';
import ErrorAlert from '../../components/ErrorAlert';
import Loading from '../../components/Loading';

export default function NewStudentPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [saving, setSaving] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);
    const [error, setError] = useState(null);
    const [programs, setPrograms] = useState([]);
    const [users, setUsers] = useState([]);

    const fromApplicantName = searchParams.get('name') || '';
    const fromApplicantDob  = searchParams.get('dob')  || '';
    const fromApplicantID   = searchParams.get('applicantID') || '';

    const [form, setForm] = useState({
        userID: '',
        name: fromApplicantName,
        dob: fromApplicantDob,
        gender: '',
        email: '',
        phone: '',
        programID: '',
        entryTerm: '',
        expectedGraduationTerm: '',
    });

    useEffect(() => { loadDropdowns(); }, []);

    const loadDropdowns = async () => {
        try {
            setPageLoading(true);
            const [programData, userData] = await Promise.allSettled([
                programService.getAll(),
                userService.getByRole('Student'),
            ]);
            if (programData.status === 'fulfilled') setPrograms(programData.value || []);
            if (userData.status === 'fulfilled')   setUsers(userData.value || []);
        } catch { }
        finally { setPageLoading(false); }
    };

    // When a user is selected, silently auto-fill email, phone and name
    const handleUserChange = (e) => {
        const selectedId = e.target.value;
        if (!selectedId) {
            setForm(prev => ({ ...prev, userID: '' }));
            return;
        }
        const selectedUser = users.find(u => String(u.userID) === String(selectedId));
        if (!selectedUser) {
            setForm(prev => ({ ...prev, userID: selectedId }));
            return;
        }
        setForm(prev => ({
            ...prev,
            userID: selectedId,
            name:  prev.name  || selectedUser.fullName || '',
            email: selectedUser.email || prev.email || '',
            phone: selectedUser.phone || prev.phone || '',
        }));
    };

    const handleChange = (field) => (e) => {
        setForm({ ...form, [field]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSaving(true);
        try {
            const contactInfo = {};
            if (form.email) contactInfo.email = form.email;
            if (form.phone) contactInfo.phone = form.phone;

            const payload = {
                userID: parseInt(form.userID, 10),
                name: form.name,
                dob: form.dob,
                gender: form.gender || null,
                contactInfoJSON: JSON.stringify(contactInfo),
                programID: parseInt(form.programID, 10),
                entryTerm: form.entryTerm,
                expectedGraduationTerm: form.expectedGraduationTerm || null,
            };

            const created = await studentService.create(payload);
            navigate(`/students/${created.studentID}`);
        } catch (err) {
            setError(err);
        } finally {
            setSaving(false);
        }
    };

    if (pageLoading) return <Loading message="Loading form..." />;

    return (
        <div>
            <button className="btn btn-link p-0 mb-3" onClick={() => navigate('/students')}>
                <i className="bi bi-arrow-left me-1"></i>Back to Students
            </button>

            <h2 className="text-primary-edulearn mb-4">
                <i className="bi bi-person-plus me-2"></i>Add New Student
            </h2>

            <div className="card shadow-sm">
                <div className="card-body">

                    {fromApplicantID && (
                        <div className="alert alert-success mb-3">
                            <i className="bi bi-check-circle me-2"></i>
                            Creating student record for accepted applicant{' '}
                            <strong>#{fromApplicantID}</strong>. Name and DOB have been
                            pre-filled. Select the User account and Program to complete.
                        </div>
                    )}

                    <div className="alert alert-info">
                        <i className="bi bi-info-circle me-2"></i>
                        Select the <strong>User account</strong> (role = Student) and
                        the <strong>Program</strong> to link this student record.
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="row g-3">

                            <div className="col-md-6">
                                <label className="form-label fw-bold">
                                    User Account <span className="text-danger">*</span>
                                </label>
                                <select
                                    className="form-select"
                                    value={form.userID}
                                    onChange={handleUserChange}
                                    required
                                >
                                    <option value="">— Select Student User —</option>
                                    {users.map(u => (
                                        <option key={u.userID} value={u.userID}>
                                            #{u.userID} — {u.fullName} ({u.username})
                                        </option>
                                    ))}
                                </select>
                                <div className="form-text">
                                    Only active users with Student role are shown.
                                </div>
                            </div>

                            <div className="col-md-6">
                                <label className="form-label fw-bold">
                                    Program <span className="text-danger">*</span>
                                </label>
                                <select
                                    className="form-select"
                                    value={form.programID}
                                    onChange={handleChange('programID')}
                                    required
                                >
                                    <option value="">— Select Program —</option>
                                    {programs.map(p => (
                                        <option key={p.programID} value={p.programID}>
                                            {p.name} ({p.degreeType})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="col-md-4">
                                <label className="form-label fw-bold">
                                    Entry Term <span className="text-danger">*</span>
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={form.entryTerm}
                                    onChange={handleChange('entryTerm')}
                                    required
                                    placeholder="e.g. 2026-Spring"
                                />
                            </div>

                            <div className="col-md-8">
                                <label className="form-label fw-bold">
                                    Full Name <span className="text-danger">*</span>
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={form.name}
                                    onChange={handleChange('name')}
                                    required
                                    placeholder="John Doe"
                                />
                            </div>

                            <div className="col-md-4">
                                <label className="form-label fw-bold">Gender</label>
                                <select
                                    className="form-select"
                                    value={form.gender}
                                    onChange={handleChange('gender')}
                                >
                                    <option value="">—</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                    <option value="Prefer not to say">Prefer not to say</option>
                                </select>
                            </div>

                            <div className="col-md-4">
                                <label className="form-label fw-bold">
                                    Date of Birth <span className="text-danger">*</span>
                                </label>
                                <input
                                    type="date"
                                    className="form-control"
                                    value={form.dob}
                                    onChange={handleChange('dob')}
                                    required
                                />
                            </div>

                            <div className="col-md-4">
                                <label className="form-label fw-bold">Email</label>
                                <input
                                    type="email"
                                    className="form-control"
                                    value={form.email}
                                    onChange={handleChange('email')}
                                    placeholder="student@example.com"
                                />
                            </div>

                            <div className="col-md-4">
                                <label className="form-label fw-bold">Phone</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={form.phone}
                                    onChange={handleChange('phone')}
                                    placeholder="+91-9876543210"
                                />
                            </div>

                            <div className="col-md-4">
                                <label className="form-label fw-bold">
                                    Expected Graduation Term
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={form.expectedGraduationTerm}
                                    onChange={handleChange('expectedGraduationTerm')}
                                    placeholder="e.g. 2030-Spring"
                                />
                            </div>

                        </div>

                        <hr className="my-4" />

                        <ErrorAlert error={error} onDismiss={() => setError(null)} />

                        <div className="d-flex gap-2">
                            <button type="submit" className="btn btn-primary-edulearn" disabled={saving}>
                                {saving ? (
                                    <><span className="spinner-border spinner-border-sm me-2"></span>Creating...</>
                                ) : (
                                    <><i className="bi bi-check-lg me-2"></i>Create Student</>
                                )}
                            </button>
                            <button
                                type="button"
                                className="btn btn-outline-secondary"
                                onClick={() => navigate('/students')}
                                disabled={saving}
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
