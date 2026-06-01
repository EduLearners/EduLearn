import { useState, useEffect, useRef } from 'react';
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
    const [allApplicants, setAllApplicants] = useState([]);
    const [errors, setErrors] = useState({});
    const [programAutoFilled, setProgramAutoFilled] = useState(false);
    const [programAutoName, setProgramAutoName] = useState('');

    // Searchable User Account dropdown state
    const [userSearch, setUserSearch] = useState('');
    const [userDropdownOpen, setUserDropdownOpen] = useState(false);
    const [selectedUserLabel, setSelectedUserLabel] = useState('');
    const userDropdownRef = useRef(null);

    const fromApplicantName = searchParams.get('name') || '';
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

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (userDropdownRef.current && !userDropdownRef.current.contains(e.target)) {
                setUserDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const loadDropdowns = async () => {
        try {
            setPageLoading(true);
            const tasks = [
                programService.getAll(),
                userService.getByRole('Student'),
                studentService.getAll(),
                applicantService.getAll(),  // load all applicants for email-based program lookup
            ];
            if (fromApplicantID) tasks.push(applicantService.getById(fromApplicantID));

            const [programData, userData, studentData, applicantsData, applicantData] = await Promise.allSettled(tasks);

            const allPrograms = programData.status === 'fulfilled' ? (programData.value || []) : [];
            setPrograms(allPrograms);

            // Store all applicants for use in handleUserChange
            const fetchedApplicants = applicantsData.status === 'fulfilled' ? (applicantsData.value || []) : [];
            setAllApplicants(fetchedApplicants);

            // Build a Set of userIDs that already have a student record
            // so we can exclude them from the dropdown — prevents DUPLICATE_STUDENT
            const usedUserIds = new Set(
                (studentData.status === 'fulfilled' ? (studentData.value || []) : [])
                    .map(s => String(s.userID))
            );

            if (userData.status === 'fulfilled') {
                // Only show users who do NOT already have a student record
                const filtered = (userData.value || []).filter(
                    u => !usedUserIds.has(String(u.userID))
                );
                setUsers(filtered);
            }

            // Pre-fill DOB from applicant (when coming via ?applicantID=)
            if (applicantData?.status === 'fulfilled' && applicantData.value?.dob) {
                setForm(prev => ({ ...prev, dob: applicantData.value.dob.split('T')[0] }));
            }

            // Auto-fill Program from applicant's programApplied (when coming via ?applicantID=)
            if (applicantData?.status === 'fulfilled' && applicantData.value?.programApplied) {
                const appliedName = applicantData.value.programApplied.trim().toLowerCase();
                const matched = allPrograms.find(
                    p => p.name.trim().toLowerCase() === appliedName
                );
                if (matched) {
                    setForm(prev => ({ ...prev, programID: String(matched.programID) }));
                    setProgramAutoFilled(true);
                    setProgramAutoName(matched.name);
                }
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

    // When a user is selected, auto-fill name/email/phone
    // AND look up their accepted applicant record by email to auto-fill program
    const handleUserChange = (e) => {
        const selectedId = e.target.value;

        // User cleared the selection
        if (!selectedId) {
            setForm(prev => ({ ...prev, userID: '', programID: '' }));
            setProgramAutoFilled(false);
            setProgramAutoName('');
            return;
        }

        const selectedUser = users.find(u => String(u.userID) === String(selectedId));
        if (!selectedUser) {
            setForm(prev => ({ ...prev, userID: selectedId }));
            return;
        }

        // Auto-fill name, email, phone from the user record
        setForm(prev => ({
            ...prev,
            userID: selectedId,
            name:  prev.name  || selectedUser.fullName || '',
            email: selectedUser.email || prev.email || '',
            phone: selectedUser.phone || prev.phone || '',
        }));

        // Find an Accepted applicant whose contactInfoJSON email matches this user's email
        // This links the applicant's chosen program to the student record being created
        const userEmail = (selectedUser.email || '').trim().toLowerCase();
        if (userEmail) {
            const matchedApplicant = allApplicants.find(a => {
                if (a.applicationStatus !== 'Accepted') return false;
                try {
                    const contact = JSON.parse(a.contactInfoJSON || '{}');
                    return (contact.email || '').trim().toLowerCase() === userEmail;
                } catch {
                    return false;
                }
            });

            if (matchedApplicant?.programApplied) {
                // Match program name against programs list to get the programID
                const appliedName = matchedApplicant.programApplied.trim().toLowerCase();
                const matchedProgram = programs.find(
                    p => p.name.trim().toLowerCase() === appliedName
                );
                if (matchedProgram) {
                    setForm(prev => ({ ...prev, programID: String(matchedProgram.programID) }));
                    setProgramAutoFilled(true);
                    setProgramAutoName(matchedProgram.name);
                    return;
                }
            }
        }

        // No matching applicant found — clear any previous auto-fill, show normal dropdown
        setProgramAutoFilled(false);
        setProgramAutoName('');
        setForm(prev => ({ ...prev, programID: '' }));
    };

    // Filtered users based on search query — matches User ID or username
    const filteredUsers = users.filter(u => {
        if (!userSearch.trim()) return true;
        const q = userSearch.trim().toLowerCase().replace(/^#/, '');
        return (
            String(u.userID).includes(q) ||
            (u.username || '').toLowerCase().includes(q) ||
            (u.fullName || '').toLowerCase().includes(q)
        );
    });

    // Called when a user is picked from the searchable dropdown list
    const handleUserSelect = (u) => {
        setUserSearch('');
        setUserDropdownOpen(false);
        setSelectedUserLabel(`#${u.userID} — ${u.fullName} (${u.username})`);
        // Reuse existing handleUserChange logic by creating a synthetic event
        handleUserChange({ target: { value: String(u.userID) } });
    };

    // Called when the X button clears the selected user
    const handleUserClear = () => {
        setSelectedUserLabel('');
        setUserSearch('');
        setUserDropdownOpen(false);
        handleUserChange({ target: { value: '' } });
    };

    // Auto-calculate Expected Graduation Term from Entry Term + Program duration
    useEffect(() => {
        if (!form.programID || !form.entryTerm) return;

        const selectedProgram = programs.find(
            p => String(p.programID) === String(form.programID)
        );
        if (!selectedProgram?.durationTerms) return;

        // Parse "2026-Fall" → year = 2026, season = "Fall"
        const parts = form.entryTerm.split('-');
        if (parts.length < 2) return;
        const entryYear = parseInt(parts[0], 10);
        const season = parts[1];
        if (isNaN(entryYear) || !season) return;

        // durationTerms ÷ 2 = years  (e.g. 8 terms = 4 years)
        const yearsToAdd = Math.ceil(selectedProgram.durationTerms / 2);
        const graduationYear = entryYear + yearsToAdd;

        setForm(prev => ({
            ...prev,
            expectedGraduationTerm: `${graduationYear}-${season}`
        }));
    }, [form.programID, form.entryTerm, programs]);

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

                            <div className="col-md-6" ref={userDropdownRef}>
                                <label className="form-label fw-bold">
                                    User Account <span className="text-danger">*</span>
                                </label>

                                {/* Looks like a Bootstrap form-select, opens a searchable dropdown */}
                                <div style={{ position: 'relative' }}>

                                    {/* The trigger box — styled exactly like form-select */}
                                    <div
                                        className="form-select d-flex align-items-center justify-content-between"
                                        style={{ cursor: 'pointer', userSelect: 'none' }}
                                        onClick={() => setUserDropdownOpen(prev => !prev)}
                                    >
                                        {selectedUserLabel ? (
                                            <span className="text-dark">{selectedUserLabel}</span>
                                        ) : (
                                            <span className="text-muted">— Select Student User —</span>
                                        )}
                                    </div>

                                    {/* Dropdown panel */}
                                    {userDropdownOpen && (
                                        <div
                                            className="border rounded bg-white shadow-sm"
                                            style={{
                                                position: 'absolute',
                                                top: '100%',
                                                left: 0,
                                                right: 0,
                                                zIndex: 1050,
                                                marginTop: 2,
                                            }}
                                        >
                                            {/* Search input — grey header row, same style as the native select header */}
                                            <div
                                                style={{
                                                    background: '#343a40',
                                                    padding: '6px 8px',
                                                    borderRadius: '4px 4px 0 0',
                                                }}
                                            >
                                                <input
                                                    type="text"
                                                    className="form-control form-control-sm"
                                                    style={{ background: 'white' }}
                                                    placeholder="Search by User ID or username..."
                                                    value={userSearch}
                                                    onChange={e => setUserSearch(e.target.value)}
                                                    autoFocus
                                                    autoComplete="off"
                                                    onMouseDown={e => e.stopPropagation()}
                                                />
                                            </div>

                                            {/* Results list */}
                                            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                                                {/* Clear / default option — dark grey like native select */}
                                                <div
                                                    className="px-3 py-2 small"
                                                    style={{
                                                        cursor: 'pointer',
                                                        background: '#6c757d',
                                                        color: 'white',
                                                    }}
                                                    onMouseDown={e => e.preventDefault()}
                                                    onClick={handleUserClear}
                                                >
                                                    — Select Student User —
                                                </div>

                                                {filteredUsers.length === 0 ? (
                                                    <div className="px-3 py-2 text-muted small">
                                                        <i className="bi bi-inbox me-2"></i>
                                                        No users found{userSearch ? ` matching "${userSearch}"` : ''}
                                                    </div>
                                                ) : (
                                                    filteredUsers.map(u => (
                                                        <div
                                                            key={u.userID}
                                                            className="px-3 py-2 d-flex align-items-center gap-2"
                                                            style={{
                                                                cursor: 'pointer',
                                                                background: String(form.userID) === String(u.userID) ? '#e8f0fe' : 'white',
                                                                borderBottom: '1px solid #f0f0f0',
                                                            }}
                                                            onMouseDown={e => e.preventDefault()}
                                                            onClick={() => handleUserSelect(u)}
                                                            onMouseEnter={e => { if (String(form.userID) !== String(u.userID)) e.currentTarget.style.background = '#f0f4ff'; }}
                                                            onMouseLeave={e => { if (String(form.userID) !== String(u.userID)) e.currentTarget.style.background = 'white'; }}
                                                        >
                                                            <span className="text-muted small" style={{ minWidth: 30 }}>#{u.userID}</span>
                                                            <span className="small">{u.fullName} ({u.username})</span>
                                                            {String(form.userID) === String(u.userID) && (
                                                                <i className="bi bi-check2 text-primary ms-auto"></i>
                                                            )}
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Hidden required input for form validation */}
                                <input
                                    type="text"
                                    style={{ position: 'absolute', opacity: 0, height: 0, pointerEvents: 'none' }}
                                    value={form.userID}
                                    required
                                    onChange={() => {}}
                                    tabIndex={-1}
                                />

                                <div className="form-text">
                                    Only active users with Student role <strong>without an existing student record</strong> are shown.
                                </div>
                            </div>

                            <div className="col-md-6">
                                <label className="form-label fw-bold">
                                    Program <span className="text-danger">*</span>
                                </label>
                                {programAutoFilled ? (
                                    <>
                                        <input
                                            type="text"
                                            className="form-control bg-light"
                                            value={programAutoName}
                                            readOnly
                                            disabled
                                        />
                                        <div className="form-text text-success">
                                            <i className="bi bi-check-circle me-1"></i>
                                            Auto-filled from applicant's program — read only.
                                        </div>
                                    </>
                                ) : (
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
                                )}
                            </div>

                            <div className="col-md-4">
                                <label className="form-label fw-bold">
                                    Entry Term <span className="text-danger">*</span>
                                </label>
                                <select
                                    className={`form-select${errors.entryTerm ? ' is-invalid' : ''}`}
                                    value={form.entryTerm}
                                    onChange={handleChange('entryTerm')}
                                    required
                                >
                                    <option value="">— Select Term —</option>
                                    {['Spring', 'Summer', 'Fall', 'Winter'].map(season => (
                                        <option
                                            key={season}
                                            value={`${new Date().getFullYear()}-${season}`}
                                        >
                                            {new Date().getFullYear()}-{season}
                                        </option>
                                    ))}
                                </select>
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
                                    onChange={e => {
                                        const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                                        setForm(prev => ({ ...prev, phone: digits }));
                                        setErrors(prev => ({ ...prev, phone: validatePhone(digits) }));
                                    }}
                                    onBlur={e => setErrors(prev => ({ ...prev, phone: validatePhone(e.target.value) }))}
                                    placeholder="9876543210"
                                    maxLength={10}
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
                                    className={`form-control${errors.expectedGraduationTerm ? ' is-invalid' : ''} ${
                                        form.expectedGraduationTerm && form.programID && form.entryTerm
                                            ? 'bg-light'
                                            : ''
                                    }`}
                                    value={form.expectedGraduationTerm}
                                    onChange={handleChange('expectedGraduationTerm')}
                                    onBlur={e => setErrors(prev => ({ ...prev, expectedGraduationTerm: e.target.value ? validateTerm(e.target.value) : null }))}
                                    placeholder="e.g. 2030-Spring"
                                    maxLength={20}
                                    pattern="\d{4}-(Spring|Summer|Fall|Winter)"
                                    title="Format: YYYY-Season (e.g. 2026-Fall)"
                                />
                                {errors.expectedGraduationTerm
                                    ? <div className="invalid-feedback">{errors.expectedGraduationTerm}</div>
                                    : null
                                }
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
