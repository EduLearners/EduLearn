import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { applicantService } from '../../services/applicantService';
import { programService } from '../../services/programService';
import ErrorAlert from '../../components/ErrorAlert';
import Loading from '../../components/Loading';

export default function NewApplicantPage() {
    const navigate = useNavigate();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const [programs, setPrograms] = useState([]);
    const [loadingPrograms, setLoadingPrograms] = useState(true);
    const [programsError, setProgramsError] = useState(null);

    const [form, setForm] = useState({
        name: '',
        dob: '',
        nationalID: '',
        email: '',
        phone: '',
        address: '',
        programApplied: '',
    });

    // Phone validation — must be exactly 10 digits, no symbols allowed
    const phoneInvalid = form.phone.length > 0 && !/^\d{10}$/.test(form.phone);

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

        if (phoneInvalid) {
            setError({ message: 'Phone number must be exactly 10 digits.' });
            setSaving(false);
            return;
        }

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
                                    className="form-control"
                                    value={form.name}
                                    onChange={handleChange('name')}
                                    required
                                    placeholder="John Doe"
                                    maxLength={200}
                                />
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
                                    className={`form-control ${nationalIDInvalid ? 'is-invalid' : ''}`}
                                    value={form.nationalID}
                                    onChange={handleChange('nationalID')}
                                    placeholder="e.g. NATID001"
                                    minLength={4}
                                    maxLength={12}
                                    required
                                />
                                {nationalIDInvalid ? (
                                    <div className="invalid-feedback">
                                        <i className="bi bi-exclamation-circle me-1"></i>
                                        National ID must be at least 4 characters.
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
                                    type="email"
                                    className="form-control"
                                    value={form.email}
                                    onChange={handleChange('email')}
                                    placeholder="applicant@example.com"
                                    required
                                />
                            </div>

                            <div className="col-md-6">
                                <label className="form-label fw-bold">Phone <span className="text-danger">*</span></label>
                                <input
                                    type="text"
                                    className={`form-control ${phoneInvalid ? 'is-invalid' : ''}`}
                                    value={form.phone}
                                    onChange={handleChange('phone')}
                                    placeholder="9876543210"
                                    maxLength={15}
                                    required
                                />
                                {phoneInvalid ? (
                                    <div className="invalid-feedback">
                                        <i className="bi bi-exclamation-circle me-1"></i>
                                        Phone number must be exactly 10 digits.
                                    </div>
                                ) : (
                                    <div className="form-text">Enter 10-digit mobile number.</div>
                                )}
                            </div>

                            <div className="col-md-6">
                                <label className="form-label fw-bold">Address <span className="text-danger">*</span></label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={form.address}
                                    onChange={handleChange('address')}
                                    placeholder="Chennai, TN"
                                    required
                                    maxLength={200}
                                />
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
                                disabled={saving || loadingPrograms || nationalIDInvalid || phoneInvalid || dobInvalid}
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
