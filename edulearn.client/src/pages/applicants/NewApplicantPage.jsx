import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { applicantService } from '../../services/applicantService';
import { programService } from '../../services/programService';
import ErrorAlert from '../../components/ErrorAlert';
import Loading from '../../components/Loading';
import { validateName, validateEmail, validatePhone, validatePhoneRequired, validateAddress, validateNationalId } from '../../utils/validators';

// Defined outside component to avoid recreation on every render
const validateApplicantName = (v) => {
    const t = String(v ?? '').trim();
    if (!t) return 'Full name is required';
    if (t.length < 2) return 'Full name must be at least 2 characters';
    if (t.length > 200) return 'Full name cannot exceed 200 characters';
    if (!/^[\p{L} ]+$/u.test(t))
        return 'Full name can only contain letters and spaces — no numbers, hyphens, or symbols';
    return null;
};

const validateApplicantEmail = (v) => {
    const t = String(v ?? '').trim().toLowerCase();
    if (!t) return 'Email is required';
    if (!t.includes('@'))
        return "Invalid email — missing '@'. Enter a valid email like name@gmail.com";
    const parts = t.split('@');
    if (parts.length > 2)
        return "Invalid email — multiple '@' signs found";
    const [local, domain] = parts;
    if (!local)
        return "Invalid email — nothing before '@'. Enter a valid email like name@gmail.com";
    if (!domain || !domain.includes('.'))
        return "Invalid email — domain must include a '.' (e.g. name@gmail.com)";
    if (domain.startsWith('.') || domain.endsWith('.'))
        return 'Invalid email format — check the domain part (e.g. name@gmail.com)';
    if (/\.{2,}/.test(t))
        return 'Email cannot contain consecutive dots';
    if (!/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(t))
        return 'Enter a valid email address (e.g. name@gmail.com)';
    return null;
};

export default function NewApplicantPage() {
    const navigate = useNavigate();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const [programs, setPrograms] = useState([]);
    const [loadingPrograms, setLoadingPrograms] = useState(true);
    const [programsError, setProgramsError] = useState(null);
    const [errors, setErrors] = useState({});

    const [form, setForm] = useState({
        name: '',
        dob: '',
        nationalID: '',
        email: '',
        phone: '',
        address: '',
        programApplied: '',
    });

    // Phone validation — shared validator (required field on this form)
    const phoneError = validatePhoneRequired(form.phone);
    const phoneInvalid = !!phoneError;

    // DOB validation — applicant must be at least 15 years old
    const maxDOB = new Date();
    maxDOB.setFullYear(maxDOB.getFullYear() - 15);
    const maxDOBString = maxDOB.toISOString().split('T')[0];
    const dobInvalid = form.dob && new Date(form.dob) > maxDOB;

    // FIX: National ID minimum length validation (at least 4 characters)
    const nationalIDInvalid = form.nationalID.length > 0 && form.nationalID.trim().length < 4;

    useEffect(() => {
        const fetchPrograms = async () => {
            try {
                setLoadingPrograms(true);
                setProgramsError(null);
                const data = await programService.getAll();
                const active = (data || []).filter(p => p.status === 'Active');
                setPrograms(active);
            } catch (err) {
                setProgramsError('Could not load programs. You can still type the program name manually.');
                setPrograms([]);
            } finally {
                setLoadingPrograms(false);
            }
        };
        fetchPrograms();
    }, []);

    const handleChange = (field) => (e) => {
        const value = field === 'email' ? e.target.value.toLowerCase() : e.target.value;
        setForm({ ...form, [field]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        const next = {
            name: validateApplicantName(form.name),
            email: validateApplicantEmail(form.email),
            phone: validatePhoneRequired(form.phone),
            address: validateAddress(form.address),
            nationalID: validateNationalId(form.nationalID),
        };
        if (Object.values(next).some(Boolean)) { setErrors(next); return; }

        if (form.address && !form.address.trim()) {
            setError({ message: 'Address cannot be blank spaces only.' });
            return;
        }

        if (dobInvalid) {
            setError({ message: 'Applicant must be at least 15 years old.' });
            setSaving(false);
            return;
        }

        // FIX: Block submission if National ID is too short
        if (nationalIDInvalid) {
            setError({ message: 'National ID must be at least 4 characters.' });
            setSaving(false);
            return;
        }

        setSaving(true);
        try {
            const contactInfo = {};
            if (form.email) contactInfo.email = form.email;
            if (form.phone) contactInfo.phone = form.phone;
            if (form.address) contactInfo.address = form.address;

            const payload = {
                name: form.name,
                dob: form.dob,
                nationalID: form.nationalID || null,
                contactInfoJSON: Object.keys(contactInfo).length ? JSON.stringify(contactInfo) : null,
                programApplied: form.programApplied,
                documentsURIJSON: null,
            };

            const created = await applicantService.create(payload);
            navigate(`/applicants/${created.applicantID}`);
        } catch (err) {
            setError(err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div>
            <button className="btn btn-link p-0 mb-3" onClick={() => navigate('/applicants')}>
                <i className="bi bi-arrow-left me-1"></i>Back to Applicants
            </button>

            <h2 className="text-primary-edulearn mb-4">
                <i className="bi bi-person-plus me-2"></i>New Applicant
            </h2>

            <div className="card shadow-sm">
                <div className="card-body">
                    <div className="alert alert-info">
                        <i className="bi bi-info-circle me-2"></i>
                        Submit an admission application. The application will start in
                        <strong> Submitted</strong> status and can be reviewed afterwards.
                    </div>

                    <form onSubmit={handleSubmit}>
                        <h6 className="text-muted text-uppercase small mb-3">Personal Details</h6>

                        <div className="row g-3">
                            <div className="col-md-8">
                                <label className="form-label fw-bold">Full Name <span className="text-danger">*</span></label>
                                <input
                                    type="text"
                                    className={`form-control${errors.name ? ' is-invalid' : ''}`}
                                    value={form.name}
                                    onChange={e => {
                                        // Strip anything that is not a letter or space as the user types
                                        const cleaned = e.target.value.replace(/[^\p{L} ]/gu, '');
                                        setForm(prev => ({ ...prev, name: cleaned }));
                                        setErrors(prev => ({ ...prev, name: validateApplicantName(cleaned) }));
                                    }}
                                    onBlur={e => setErrors(prev => ({ ...prev, name: validateApplicantName(e.target.value) }))}
                                    required
                                    placeholder="e.g. Arun Kumar"
                                    maxLength={200}
                                />
                                {errors.name
                                    ? <div className="invalid-feedback">{errors.name}</div>
                                    : <div className="form-text">Letters and spaces only — no numbers or symbols.</div>
                                }
                            </div>

                            <div className="col-md-4">
                                <label className="form-label fw-bold">Date of Birth <span className="text-danger">*</span></label>
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
                                        Applicant must be at least 15 years old.
                                    </div>
                                ) : (
                                    <div className="form-text">Applicant must be at least <strong>15 years</strong> old.</div>
                                )}
                            </div>

                            {/* FIX: Added minLength={4} to National ID — prevents single-char IDs */}
                            <div className="col-md-6">
                                <label className="form-label fw-bold">National ID <span className="text-danger">*</span></label>
                                <input
                                    type="text"
                                    className={`form-control${nationalIDInvalid || errors.nationalID ? ' is-invalid' : ''}`}
                                    value={form.nationalID}
                                    onChange={handleChange('nationalID')}
                                    onBlur={e => setErrors(prev => ({ ...prev, nationalID: validateNationalId(e.target.value) }))}
                                    placeholder="e.g. NATID001"
                                    minLength={4}
                                    maxLength={12}
                                    required
                                />
                                {(nationalIDInvalid || errors.nationalID) ? (
                                    <div className="invalid-feedback">
                                        {errors.nationalID || (
                                            <><i className="bi bi-exclamation-circle me-1"></i>National ID must be at least 4 characters.</>
                                        )}
                                    </div>
                                ) : (
                                    <div className="form-text">
                                        4–12 characters.
                                        {form.nationalID.length > 0 && (
                                            <span className={form.nationalID.length === 12 ? ' text-danger' : ' text-muted'}>
                                                {' '}{form.nationalID.length}/12
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="col-md-6">
                                <label className="form-label fw-bold">Email <span className="text-danger">*</span></label>
                                <input
                                    type="text"
                                    className={`form-control${errors.email ? ' is-invalid' : ''}`}
                                    value={form.email}
                                    onChange={e => {
                                        const val = e.target.value.toLowerCase();
                                        setForm(prev => ({ ...prev, email: val }));
                                        if (errors.email) setErrors(prev => ({ ...prev, email: validateApplicantEmail(val) }));
                                    }}
                                    onBlur={e => setErrors(prev => ({ ...prev, email: validateApplicantEmail(e.target.value) }))}
                                    placeholder="e.g. name@gmail.com"
                                    required
                                />
                                {errors.email
                                    ? <div className="invalid-feedback">{errors.email}</div>
                                    : <div className="form-text">Must contain '@' and a domain — e.g. name@gmail.com</div>
                                }
                            </div>

                            <div className="col-md-6">
                                <label className="form-label fw-bold">Phone <span className="text-danger">*</span></label>
                                <input
                                    type="text"
                                    className={`form-control${errors.phone ? ' is-invalid' : ''}`}
                                    value={form.phone}
                                    onChange={handleChange('phone')}
                                    onBlur={e => setErrors(prev => ({ ...prev, phone: validatePhoneRequired(e.target.value) }))}
                                    placeholder="9876543210"
                                    maxLength={15}
                                    required
                                />
                                {errors.phone ? (
                                    <div className="invalid-feedback">{errors.phone}</div>
                                ) : (
                                    <div className="form-text">Enter 10-digit mobile number.</div>
                                )}
                            </div>

                            <div className="col-md-6">
                                <label className="form-label fw-bold">Address <span className="text-danger">*</span></label>
                                <input
                                    type="text"
                                    className={`form-control${errors.address ? ' is-invalid' : ''}`}
                                    value={form.address}
                                    onChange={handleChange('address')}
                                    onBlur={e => setErrors(prev => ({ ...prev, address: validateAddress(e.target.value) }))}
                                    placeholder="Chennai, TN"
                                    required
                                    maxLength={200}
                                />
                                {errors.address && <div className="invalid-feedback">{errors.address}</div>}
                            </div>
                        </div>

                        <hr className="my-4" />

                        <h6 className="text-muted text-uppercase small mb-3">Application</h6>

                        <div className="row g-3">
                            <div className="col-12">
                                <label className="form-label fw-bold">
                                    Program Applied <span className="text-danger">*</span>
                                </label>

                                {loadingPrograms ? (
                                    <div className="d-flex align-items-center gap-2 mt-1">
                                        <span className="spinner-border spinner-border-sm text-primary-edulearn"></span>
                                        <small className="text-muted">Loading programs...</small>
                                    </div>
                                ) : programs.length > 0 ? (
                                    <>
                                        <select
                                            className="form-select"
                                            value={form.programApplied}
                                            onChange={handleChange('programApplied')}
                                            required
                                        >
                                            <option value="">— Select a program —</option>
                                            {programs.map(p => (
                                                <option key={p.programID} value={p.name}>
                                                    {p.name}
                                                    {p.degreeType ? ` (${p.degreeType})` : ''}
                                                    {p.department ? ` — ${p.department}` : ''}
                                                </option>
                                            ))}
                                        </select>
                                        <small className="text-muted">
                                            <i className="bi bi-mortarboard me-1"></i>
                                            Showing {programs.length} active program{programs.length !== 1 ? 's' : ''}.
                                        </small>
                                    </>
                                ) : (
                                    <>
                                        {programsError && (
                                            <div className="alert alert-warning py-2 small mb-2">
                                                <i className="bi bi-exclamation-triangle me-1"></i>
                                                {programsError}
                                            </div>
                                        )}
                                        {!programsError && (
                                            <div className="alert alert-warning py-2 small mb-2">
                                                <i className="bi bi-exclamation-triangle me-1"></i>
                                                No active programs found. Please create programs first or type the name manually.
                                            </div>
                                        )}
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={form.programApplied}
                                            onChange={handleChange('programApplied')}
                                            required
                                            placeholder="e.g. B.Tech Computer Science"
                                            maxLength={100}
                                        />
                                        <small className="text-muted">
                                            Enter the full program name the applicant is applying for.
                                        </small>
                                    </>
                                )}
                            </div>
                        </div>

                        <hr className="my-4" />

                        <ErrorAlert error={error} onDismiss={() => setError(null)} />

                        <div className="d-flex gap-2">
                            <button
                                type="submit"
                                className="btn btn-primary-edulearn"
                                disabled={saving || loadingPrograms || nationalIDInvalid || !!errors.phone || dobInvalid}
                            >
                                {saving ? (
                                    <><span className="spinner-border spinner-border-sm me-2"></span>Submitting...</>
                                ) : (
                                    <><i className="bi bi-check-lg me-2"></i>Submit Application</>
                                )}
                            </button>
                            <button
                                type="button"
                                className="btn btn-outline-secondary"
                                onClick={() => navigate('/applicants')}
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
