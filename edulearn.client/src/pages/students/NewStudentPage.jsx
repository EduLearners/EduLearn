import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { studentService } from '../../services/studentService';
import ErrorAlert from '../../components/ErrorAlert';

export default function NewStudentPage() {
    const navigate = useNavigate();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const [form, setForm] = useState({
        userID: '',
        name: '',
        dob: '',
        gender: '',
        email: '',
        phone: '',
        programID: '',
        entryTerm: '',
        expectedGraduationTerm: '',
    });

    const handleChange = (field) => (e) => {
        setForm({ ...form, [field]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSaving(true);

        try {
            // Build the contactInfoJSON from email + phone
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
                    <div className="alert alert-info">
                        <i className="bi bi-info-circle me-2"></i>
                        Make sure the User (with role = Student) already exists. You'll need their
                        <strong> User ID</strong> to link the student record.
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="row g-3">
                            {/* User ID */}
                            <div className="col-md-4">
                                <label className="form-label fw-bold">User ID *</label>
                                <input
                                    type="number"
                                    className="form-control"
                                    value={form.userID}
                                    onChange={handleChange('userID')}
                                    required
                                    placeholder="e.g. 2"
                                />
                            </div>

                            {/* Program ID */}
                            <div className="col-md-4">
                                <label className="form-label fw-bold">Program ID *</label>
                                <input
                                    type="number"
                                    className="form-control"
                                    value={form.programID}
                                    onChange={handleChange('programID')}
                                    required
                                    placeholder="e.g. 1"
                                />
                            </div>

                            {/* Entry Term */}
                            <div className="col-md-4">
                                <label className="form-label fw-bold">Entry Term *</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={form.entryTerm}
                                    onChange={handleChange('entryTerm')}
                                    required
                                    placeholder="e.g. 2026-Spring"
                                />
                            </div>

                            {/* Name */}
                            <div className="col-md-8">
                                <label className="form-label fw-bold">Full Name *</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={form.name}
                                    onChange={handleChange('name')}
                                    required
                                    placeholder="John Doe"
                                />
                            </div>

                            {/* Gender */}
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

                            {/* DOB */}
                            <div className="col-md-4">
                                <label className="form-label fw-bold">Date of Birth *</label>
                                <input
                                    type="date"
                                    className="form-control"
                                    value={form.dob}
                                    onChange={handleChange('dob')}
                                    required
                                />
                            </div>

                            {/* Email */}
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

                            {/* Phone */}
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

                            {/* Expected Graduation */}
                            <div className="col-md-6">
                                <label className="form-label fw-bold">Expected Graduation Term</label>
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
