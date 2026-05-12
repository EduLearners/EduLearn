import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { applicantService } from '../../services/applicantService';
import ErrorAlert from '../../components/ErrorAlert';

export default function NewApplicantPage() {
    const navigate = useNavigate();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const [form, setForm] = useState({
        name: '',
        dob: '',
        nationalID: '',
        email: '',
        phone: '',
        address: '',
        programApplied: '',
    });

    const handleChange = (field) => (e) => {
        setForm({ ...form, [field]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSaving(true);

        try {
            // Build contactInfoJSON from individual fields
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
                                <label className="form-label fw-bold">Full Name *</label>
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
                                <label className="form-label fw-bold">Date of Birth *</label>
                                <input
                                    type="date"
                                    className="form-control"
                                    value={form.dob}
                                    onChange={handleChange('dob')}
                                    required
                                    max={new Date().toISOString().split('T')[0]}
                                />
                            </div>

                            <div className="col-md-6">
                                <label className="form-label fw-bold">National ID</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={form.nationalID}
                                    onChange={handleChange('nationalID')}
                                    placeholder="e.g. NATID001"
                                    maxLength={50}
                                />
                            </div>

                            <div className="col-md-6">
                                <label className="form-label fw-bold">Email</label>
                                <input
                                    type="email"
                                    className="form-control"
                                    value={form.email}
                                    onChange={handleChange('email')}
                                    placeholder="applicant@example.com"
                                />
                            </div>

                            <div className="col-md-6">
                                <label className="form-label fw-bold">Phone</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={form.phone}
                                    onChange={handleChange('phone')}
                                    placeholder="+91-9876543210"
                                />
                            </div>

                            <div className="col-md-6">
                                <label className="form-label fw-bold">Address</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={form.address}
                                    onChange={handleChange('address')}
                                    placeholder="Chennai, TN"
                                />
                            </div>
                        </div>

                        <hr className="my-4" />

                        <h6 className="text-muted text-uppercase small mb-3">Application</h6>

                        <div className="row g-3">
                            <div className="col-12">
                                <label className="form-label fw-bold">Program Applied *</label>
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
                            </div>
                        </div>

                        <hr className="my-4" />

                        <ErrorAlert error={error} onDismiss={() => setError(null)} />

                        <div className="d-flex gap-2">
                            <button type="submit" className="btn btn-primary-edulearn" disabled={saving}>
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
