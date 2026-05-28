import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { studentService } from '../../services/studentService';
import { programService } from '../../services/programService';
import { userService } from '../../services/userService';
import { applicantService } from '../../services/applicantService';
import ErrorAlert from '../../components/ErrorAlert';
import Loading from '../../components/Loading';
import { validateName, validateEmail, validatePhone, validateTerm } from '../../utils/validators';

export default function NewStudentPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [saving, setSaving] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);
    const [error, setError] = useState(null);
    const [programs, setPrograms] = useState([]);
    const [users, setUsers] = useState([]);
    const [errors, setErrors] = useState({});

    const fromApplicantName = searchParams.get('name') || '';
    // phase4-fix-16: DOB no longer read from URL (PII). Resolved server-side from applicantID.
    const fromApplicantID   = searchParams.get('applicantID') || '';

    const [form, setForm] = useState({
        userID: '',
        name: fromApplicantName,
        dob: '',
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
            const tasks = [
                programService.getAll(),
                userService.getByRole('Student'),
            ];
            // phase4-fix-16: fetch DOB from server instead of from URL param
            if (fromApplicantID) tasks.push(applicantService.getById(fromApplicantID));
            const [programData, userData, applicantData] = await Promise.allSettled(tasks);
            if (programData.status === 'fulfilled') setPrograms(programData.value || []);
            if (userData.status === 'fulfilled')   setUsers(userData.value || []);
            if (applicantData?.status === 'fulfilled' && applicantData.value?.dob) {
                setForm(prev => ({ ...prev, dob: applicantData.value.dob.split('T')[0] }));
            }
        } catch (err) { console.error('loadDropdowns failed:', err); }
        finally { setPageLoading(false); }
    };

    // FIX: DOB validation — student must be at least 15 years old (consistent with NewApplicantPage)
    const maxDOB = new Date();
    maxDOB.setFullYear(maxDOB.getFullYear() - 15);
    const maxDOBString = maxDOB.toISOString().split('T')[0];
    const dobInvalid = form.dob && new Date(form.dob) > maxDOB;

    // FIX: Phone validation — shared validator (optional field)
    const phoneError = validatePhone(form.phone);
    const phoneInvalid = !!phoneError;

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

        const next = {
            name: validateName(form.name, 'Full name'),
            email: form.email ? validateEmail(form.email) : null,
            phone: validatePhone(form.phone),
            entryTerm: validateTerm(form.entryTerm),
            expectedGraduationTerm: form.expectedGraduationTerm ? validateTerm(form.expectedGraduationTerm) : null,
        };
        if (Object.values(next).some(Boolean)) { setErrors(next); return; }

        // FIX: Block submission if DOB fails age requirement
        if (dobInvalid) {
            setError({ message: 'Student must be at least 15 years old.' });
            return;
        }

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
                            <strong>{fromApplicantID}</strong>. Name and DOB have been
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
                                    className={`form-control${errors.entryTerm ? ' is-invalid' : ''}`}
                                    value={form.entryTerm}
                                    onChange={handleChange('entryTerm')}
                                    onBlur={e => setErrors(prev => ({ ...prev, entryTerm: validateTerm(e.target.value) }))}
                                    required
                                    placeholder="e.g. 2026-Spring"
                                    maxLength={20}
                                    pattern="\d{4}-(Spring|Summer|Fall|Winter)"
                                    title="Format: YYYY-Season (e.g. 2026-Fall)"
                                />
                                {errors.entryTerm && <div className="invalid-feedback">{errors.entryTerm}</div>}
                            </div>

                            <div className="col-md-8">
                                <label className="form-label fw-bold">
                                    Full Name <span className="text-danger">*</span>
                                </label>
                                <input
                                    type="text"
                                    className={`form-control${errors.name ? ' is-invalid' : ''}`}
                                    value={form.name}
                                    onChange={handleChange('name')}
                                    onBlur={e => setErrors(prev => ({ ...prev, name: validateName(e.target.value, 'Full name') }))}
                                    required
                                    placeholder="John Doe"
                                    maxLength={100}
                                />
                                {errors.name && <div className="invalid-feedback">{errors.name}</div>}
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

                            {/* FIX: DOB — added max constraint and age validation feedback */}
                            <div className="col-md-4">
                                <label className="form-label fw-bold">
                                    Date of Birth <span className="text-danger">*</span>
                                </label>
                                <input
                                    type="date"
                                    className={`form-control ${dobInvalid ? 'is-invalid' : ''}`}
                                    value={form.dob}
                                    onChange={handleChange('dob')}
                                    required
                                    max={maxDOBString}
                                />
                                {dobInvalid ? (
                                    <div className="invalid-feedback">
                                        <i className="bi bi-exclamation-circle me-1"></i>
                                        Student must be at least 15 years old.
                                    </div>
                                ) : (
                                    <div className="form-text">Student must be at least <strong>15 years</strong> old.</div>
                                )}
                            </div>

                            <div className="col-md-4">
                                <label className="form-label fw-bold">Email</label>
                                <input
                                    type="text"
                                    className={`form-control${errors.email ? ' is-invalid' : ''}`}
                                    value={form.email}
                                    onChange={e => {
                                        const val = e.target.value.toLowerCase();
                                        setForm({ ...form, email: val });
                                        if (errors.email) setErrors(prev => ({ ...prev, email: validateEmail(val) }));
                                    }}
                                    onBlur={e => setErrors(prev => ({ ...prev, email: e.target.value ? validateEmail(e.target.value) : null }))}
                                    placeholder="e.g. name@gmail.com"
                                />
                                {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                            </div>

                            {/* FIX: Phone — shared validatePhone validator */}
                            <div className="col-md-4">
                                <label className="form-label fw-bold">Phone</label>
                                <input
                                    type="text"
                                    className={`form-control${errors.phone ? ' is-invalid' : ''}`}
                                    value={form.phone}
                                    onChange={handleChange('phone')}
                                    onBlur={e => setErrors(prev => ({ ...prev, phone: validatePhone(e.target.value) }))}
                                    placeholder="9876543210"
                                    maxLength={15}
                                />
                                {errors.phone ? (
                                    <div className="invalid-feedback">{errors.phone}</div>
                                ) : (
                                    <div className="form-text">Enter 10-digit mobile number (optional).</div>
                                )}
                            </div>

                            <div className="col-md-4">
                                <label className="form-label fw-bold">
                                    Expected Graduation Term
                                </label>
                                <input
                                    type="text"
                                    className={`form-control${errors.expectedGraduationTerm ? ' is-invalid' : ''}`}
                                    value={form.expectedGraduationTerm}
                                    onChange={handleChange('expectedGraduationTerm')}
                                    onBlur={e => setErrors(prev => ({ ...prev, expectedGraduationTerm: e.target.value ? validateTerm(e.target.value) : null }))}
                                    placeholder="e.g. 2030-Spring"
                                    maxLength={20}
                                    pattern="\d{4}-(Spring|Summer|Fall|Winter)"
                                    title="Format: YYYY-Season (e.g. 2026-Fall)"
                                />
                                {errors.expectedGraduationTerm && <div className="invalid-feedback">{errors.expectedGraduationTerm}</div>}
                            </div>

                        </div>

                        <hr className="my-4" />

                        <ErrorAlert error={error} onDismiss={() => setError(null)} />

                        <div className="d-flex gap-2">
                            <button
                                type="submit"
                                className="btn btn-primary-edulearn"
                                disabled={saving || dobInvalid || !!errors.phone}
                            >
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
