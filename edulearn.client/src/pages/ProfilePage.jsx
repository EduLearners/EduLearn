import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { userService } from '../services/userService';
import { studentService } from '../services/studentService';
import Loading from '../components/Loading';
import ErrorAlert from '../components/ErrorAlert';
import StatusBadge from '../components/StatusBadge';
import ChangePasswordForm from '../components/ChangePasswordForm';
import ConfirmDialog from '../components/ConfirmDialog';
import { QRCodeCanvas } from 'qrcode.react';
import ModalPortal from '../components/ModalPortal';

// Roles that use MFA — Student and Instructor are excluded
const MFA_ROLES = ['Registrar', 'DeptAdmin', 'Finance', 'ITAdmin', 'Auditor'];

export default function ProfilePage() {
    const navigate = useNavigate();
    const { username, role, userId, email: cachedEmail } = authService.getCurrentUser();

    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [studentRecord, setStudentRecord] = useState(null);

    // MFA toggle state
    const [mfaConfirm, setMfaConfirm] = useState(false);
    const [mfaLoading, setMfaLoading] = useState(false);
    const [mfaMessage, setMfaMessage] = useState('');
    // MFA re-enable setup modal state
    const [mfaSetupModal, setMfaSetupModal] = useState(false);
    const [mfaSetupData, setMfaSetupData] = useState(null); // { secret, otpauthUri }
    const [mfaCode, setMfaCode] = useState('');
    const [mfaCodeError, setMfaCodeError] = useState('');
    const [mfaConfirming, setMfaConfirming] = useState(false);

    useEffect(() => { loadProfile(); }, []);

    const loadProfile = async () => {
        try {
            setLoading(true);
            setError(null);
            if (!userId) {
                setProfile({ username, role, email: cachedEmail, fullName: username, fallback: true });
                return;
            }
            const data = await userService.getById(userId);
            setProfile(data);
            if (data.role === 'Student' || role === 'Student') {
                try { setStudentRecord(await studentService.getMe()); }
                catch { setStudentRecord(null); }
            }
        } catch (err) {
            setError(err);
            setProfile({ username, role, email: cachedEmail, fullName: username, fallback: true });
        } finally {
            setLoading(false);
        }
    };

    const handleMfaToggle = async () => {
        setMfaLoading(true);
        setMfaConfirm(false);
        try {
            if (profile.mfaEnabled) {
                // Disable MFA
                await authService.disableMfa();
                setMfaMessage('MFA has been disabled. You will log in directly next time.');
                setProfile(prev => ({ ...prev, mfaEnabled: false }));
            } else {
                // Enable MFA — start setup, show QR modal
                const setupData = await authService.setupMfaSelf();
                setMfaSetupData(setupData);
                setMfaCode('');
                setMfaCodeError('');
                setMfaSetupModal(true);
            }
        } catch (err) {
            setMfaMessage('Failed to update MFA setting. Please try again.');
        } finally {
            setMfaLoading(false);
        }
    };

    const handleMfaConfirmCode = async () => {
        if (mfaCode.length !== 6) {
            setMfaCodeError('Enter the 6-digit code from your authenticator app.');
            return;
        }
        setMfaConfirming(true);
        setMfaCodeError('');
        try {
            await authService.confirmMfaSelf(mfaCode);
            setMfaSetupModal(false);
            setMfaSetupData(null);
            setMfaCode('');
            setMfaMessage('MFA enabled! You will need your authenticator app on next login.');
            setProfile(prev => ({ ...prev, mfaEnabled: true }));
        } catch (err) {
            setMfaCodeError('Invalid code. Please try again with a fresh code from your authenticator.');
        } finally {
            setMfaConfirming(false);
        }
    };

    const isMfaRole = MFA_ROLES.includes(profile?.role || role);

    const initials = (profile?.fullName || profile?.username || username || '?')
        .split(/[\s_-]+/).filter(Boolean).slice(0, 2)
        .map(p => p[0]?.toUpperCase()).join('');

    const roleDescriptions = {
        Student: 'Can enroll in sections, view own timetable, and download own transcripts.',
        Instructor: 'Teaches sections, grades submissions, and can flag plagiarism.',
        Registrar: 'Manages applicants, students, sections, enrollment, and transcripts.',
        DeptAdmin: 'Manages department rooms and resources.',
        Finance: 'Handles invoices, payments, and scholarships.',
        ITAdmin: 'Full system administration access.',
        Auditor: 'Read-only access to audit logs and integrity reports.',
    };

    return (
        <div>
            <div className="d-flex align-items-center justify-content-between mb-4">
                <h2 className="text-primary-edulearn mb-0">
                    <i className="bi bi-person-circle me-2"></i>My Profile
                </h2>
                <button className="btn btn-outline-secondary btn-sm" onClick={() => navigate(-1)}>
                    <i className="bi bi-arrow-left me-1"></i>Back
                </button>
            </div>

            {loading && <Loading message="Loading profile..." />}
            <ErrorAlert error={error} onDismiss={() => setError(null)} />

            {/* MFA action feedback */}
            {mfaMessage && (
                <div className="alert alert-info alert-dismissible d-flex align-items-center gap-2 mb-3">
                    <i className="bi bi-shield-check"></i>
                    <span>{mfaMessage}</span>
                    <button className="btn-close ms-auto" onClick={() => setMfaMessage('')} />
                </div>
            )}

            {!loading && profile && (
                <>
                    {/* Hero card */}
                    <div className="card shadow-sm mb-4 border-0 overflow-hidden">
                        <div
                            className="position-relative"
                            style={{
                                background: 'linear-gradient(135deg, #1a3c6e 0%, #2c5aa0 100%)',
                                height: 120,
                            }}
                        >
                            {/* Avatar */}
                            <div
                                className="position-absolute"
                                style={{
                                    left: 32, bottom: -50, width: 100, height: 100,
                                    borderRadius: '50%', backgroundColor: '#e2a94b',
                                    color: '#1a3c6e', display: 'inline-flex',
                                    alignItems: 'center', justifyContent: 'center',
                                    fontWeight: 700, fontSize: 36,
                                    border: '4px solid white',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                }}
                            >
                                {initials}
                            </div>

                            {/* MFA Toggle — top-right of hero, only for privileged roles */}
                            {isMfaRole && (
                                <div
                                    className="position-absolute d-flex flex-column align-items-center gap-1"
                                    style={{ top: 16, right: 24 }}
                                >
                                    <span style={{
                                        fontSize: '0.7rem', fontWeight: 700,
                                        letterSpacing: '0.8px', textTransform: 'uppercase',
                                        color: 'rgba(255,255,255,0.85)',
                                    }}>MFA</span>

                                    {/* Toggle switch */}
                                    <div
                                        onClick={() => !mfaLoading && setMfaConfirm(true)}
                                        style={{
                                            width: 52, height: 28, borderRadius: 14,
                                            background: profile.mfaEnabled ? '#22c55e' : 'rgba(255,255,255,0.3)',
                                            border: '2px solid rgba(255,255,255,0.5)',
                                            cursor: mfaLoading ? 'not-allowed' : 'pointer',
                                            position: 'relative',
                                            transition: 'background 0.25s ease',
                                        }}
                                    >
                                        <div style={{
                                            position: 'absolute',
                                            top: 2,
                                            left: profile.mfaEnabled ? 26 : 2,
                                            width: 20, height: 20,
                                            borderRadius: '50%',
                                            background: '#fff',
                                            boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
                                            transition: 'left 0.25s ease',
                                        }} />
                                    </div>

                                    <span style={{
                                        fontSize: '0.65rem',
                                        color: profile.mfaEnabled ? '#86efac' : 'rgba(255,255,255,0.55)',
                                        fontWeight: 600,
                                    }}>
                                        {mfaLoading ? '...' : (profile.mfaEnabled ? 'Enabled' : 'Disabled')}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="card-body" style={{ paddingTop: 64, paddingLeft: 32 }}>
                            <h3 className="text-primary-edulearn mb-1">
                                {profile.fullName || profile.username}
                            </h3>
                            <div className="d-flex align-items-center gap-2 text-muted flex-wrap">
                                <span><i className="bi bi-at"></i>{profile.username}</span>
                                <span>·</span>
                                <span className="badge bg-primary-edulearn">{profile.role}</span>
                                {profile.status && <StatusBadge status={profile.status} />}
                            </div>
                            {profile.fallback && (
                                <div className="alert alert-warning mt-3 mb-0 py-2 small">
                                    <i className="bi bi-exclamation-triangle me-2"></i>
                                    Showing limited profile data. Some details require backend access.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Profile details */}
                    <div className="row g-4">
                        <div className="col-md-6">
                            <div className="card shadow-sm h-100">
                                <div className="card-header bg-primary-edulearn text-white">
                                    <i className="bi bi-person-vcard me-2"></i>Account Information
                                </div>
                                <div className="card-body">
                                    <dl className="row mb-0">
                                        <dt className="col-sm-5 text-muted">User ID</dt>
                                        <dd className="col-sm-7">
                                            {profile.userID ? <code>{profile.userID}</code> : userId ? <code>{userId}</code> : '—'}
                                        </dd>

                                        {(profile.role === 'Student' || role === 'Student') && (
                                            <>
                                                <dt className="col-sm-5 text-muted">
                                                    Student ID
                                                    <i className="bi bi-info-circle ms-1 text-muted" title="Use this ID on the Enrollment and Timetable pages"></i>
                                                </dt>
                                                <dd className="col-sm-7">
                                                    {studentRecord ? (
                                                        <span className="d-flex align-items-center gap-2">
                                                            <code className="text-primary-edulearn fw-bold">{studentRecord.studentID}</code>
                                                            <span className="badge bg-info text-dark" style={{ fontSize: 10 }}>Use for Enrollment</span>
                                                        </span>
                                                    ) : (
                                                        <span className="text-muted fst-italic small">No student record yet — contact Registrar</span>
                                                    )}
                                                </dd>
                                                <dt className="col-sm-5 text-muted">MRN</dt>
                                                <dd className="col-sm-7">{studentRecord?.mrn ? <code>{studentRecord.mrn}</code> : '—'}</dd>
                                                <dt className="col-sm-5 text-muted">Program</dt>
                                                <dd className="col-sm-7">{studentRecord?.programName || '—'}</dd>
                                                <dt className="col-sm-5 text-muted">Entry Term</dt>
                                                <dd className="col-sm-7">{studentRecord?.entryTerm || '—'}</dd>
                                            </>
                                        )}

                                        <dt className="col-sm-5 text-muted">Username</dt>
                                        <dd className="col-sm-7"><code>{profile.username}</code></dd>
                                        <dt className="col-sm-5 text-muted">Full Name</dt>
                                        <dd className="col-sm-7">{profile.fullName || '—'}</dd>
                                        <dt className="col-sm-5 text-muted">Email</dt>
                                        <dd className="col-sm-7">
                                            {profile.email ? (
                                                <a href={`mailto:${profile.email}`}>
                                                    <i className="bi bi-envelope me-1"></i>{profile.email}
                                                </a>
                                            ) : '—'}
                                        </dd>
                                        <dt className="col-sm-5 text-muted">Phone</dt>
                                        <dd className="col-sm-7">
                                            {profile.phone ? <><i className="bi bi-telephone me-1 text-muted"></i>{profile.phone}</> : '—'}
                                        </dd>
                                        <dt className="col-sm-5 text-muted">Account Status</dt>
                                        <dd className="col-sm-7">
                                            {profile.status ? <StatusBadge status={profile.status} /> : '—'}
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>

                        <div className="col-md-6">
                            <div className="card shadow-sm h-100">
                                <div className="card-header bg-primary-edulearn text-white">
                                    <i className="bi bi-shield-lock me-2"></i>Role & Security
                                </div>
                                <div className="card-body">
                                    <dl className="row mb-3">
                                        <dt className="col-sm-5 text-muted">Role</dt>
                                        <dd className="col-sm-7">
                                            <span className="badge bg-primary-edulearn fs-6">{profile.role}</span>
                                        </dd>
                                        <dt className="col-sm-5 text-muted">MFA Enabled</dt>
                                        <dd className="col-sm-7">
                                            {profile.mfaEnabled ? (
                                                <span className="badge bg-success"><i className="bi bi-shield-check me-1"></i>Enabled</span>
                                            ) : (
                                                <span className="badge bg-secondary"><i className="bi bi-shield-slash me-1"></i>Not Enabled</span>
                                            )}
                                        </dd>
                                        <dt className="col-sm-5 text-muted">Member Since</dt>
                                        <dd className="col-sm-7">
                                            {profile.createdAt ? (
                                                <><i className="bi bi-calendar3 me-1 text-muted"></i>
                                                    {new Date(profile.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                                </>
                                            ) : '—'}
                                        </dd>
                                        {profile.updatedAt && (
                                            <>
                                                <dt className="col-sm-5 text-muted">Last Updated</dt>
                                                <dd className="col-sm-7">
                                                    <small className="text-muted">{new Date(profile.updatedAt).toLocaleString()}</small>
                                                </dd>
                                            </>
                                        )}
                                    </dl>
                                    {roleDescriptions[profile.role] && (
                                        <div className="alert alert-info mb-0 py-2 small">
                                            <i className="bi bi-info-circle me-2"></i>
                                            <strong>{profile.role} role:</strong> {roleDescriptions[profile.role]}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Security Actions */}
                    <div className="card shadow-sm mt-4">
                        <div className="card-header bg-primary-edulearn text-white">
                            <i className="bi bi-gear me-2"></i>Security Actions
                        </div>
                        <div className="card-body">
                            <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
                                <div>
                                    <h6 className="mb-1 fw-bold">Reset Password</h6>
                                    <p className="text-muted small mb-0">Receive a password reset link on your registered email address.</p>
                                </div>
                                <button className="btn btn-outline-primary btn-sm" onClick={() => setShowChangePassword(true)}>
                                    <i className="bi bi-key me-2"></i>Reset Password
                                </button>
                            </div>

                            {/* MFA action row — only for privileged roles */}
                            {isMfaRole && (
                                <>
                                    <hr />
                                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
                                        <div>
                                            <h6 className="mb-1 fw-bold">
                                                <i className="bi bi-shield-lock me-2 text-primary-edulearn"></i>
                                                Multi-Factor Authentication (MFA)
                                            </h6>
                                            <p className="text-muted small mb-0">
                                                {profile.mfaEnabled
                                                    ? 'MFA is active. Disable it to remove the authenticator requirement on login.'
                                                    : 'MFA is not active. Enable it to protect your account with an authenticator app.'}
                                            </p>
                                        </div>
                                        <button
                                            className={`btn btn-sm ${profile.mfaEnabled ? 'btn-outline-danger' : 'btn-outline-success'}`}
                                            onClick={() => setMfaConfirm(true)}
                                            disabled={mfaLoading}
                                        >
                                            {mfaLoading ? (
                                                <><span className="spinner-border spinner-border-sm me-1"></span>Updating...</>
                                            ) : profile.mfaEnabled ? (
                                                <><i className="bi bi-shield-slash me-1"></i>Disable MFA</>
                                            ) : (
                                                <><i className="bi bi-shield-check me-1"></i>Enable MFA</>
                                            )}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {showChangePassword && (
                        <ChangePasswordForm userId={userId} onClose={() => setShowChangePassword(false)} />
                    )}
                </>
            )}

            {/* MFA Confirm Dialog */}
            <ConfirmDialog
                show={mfaConfirm}
                title={profile?.mfaEnabled ? 'Disable MFA?' : 'Enable MFA?'}
                message={
                    profile?.mfaEnabled
                        ? 'Are you sure you want to disable Multi-Factor Authentication? Your account will no longer require an authenticator code on login.'
                        : 'You will be redirected to the MFA setup page to configure your authenticator app. Continue?'
                }
                confirmText={profile?.mfaEnabled ? 'Yes, Disable MFA' : 'Yes, Enable MFA'}
                confirmVariant={profile?.mfaEnabled ? 'danger' : 'success'}
                onConfirm={handleMfaToggle}
                onCancel={() => setMfaConfirm(false)}
            />

            {/* MFA Re-enable Setup Modal */}
            {mfaSetupModal && mfaSetupData && (
                <ModalPortal>
                    <div className="modal-backdrop fade show"></div>
                    <div className="modal fade show d-block" tabIndex="-1">
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content">
                                <div className="modal-header bg-primary-edulearn text-white">
                                    <h5 className="modal-title">
                                        <i className="bi bi-shield-check me-2"></i>Set Up Authenticator
                                    </h5>
                                    <button type="button" className="btn-close btn-close-white"
                                        onClick={() => { setMfaSetupModal(false); setMfaSetupData(null); }}
                                        disabled={mfaConfirming} />
                                </div>
                                <div className="modal-body">
                                    <div className="alert alert-info py-2 small mb-3">
                                        <i className="bi bi-info-circle me-2"></i>
                                        Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.), then enter the 6-digit code below.
                                    </div>

                                    {/* QR Code */}
                                    <div className="d-flex justify-content-center mb-3">
                                        <div style={{ padding: 12, background: '#fff', border: '1px solid #dee2e6', borderRadius: 8 }}>
                                            <QRCodeCanvas value={mfaSetupData.otpauthUri} size={180} />
                                        </div>
                                    </div>

                                    {/* Manual secret */}
                                    <div className="mb-3 text-center">
                                        <small className="text-muted">Or enter manually:</small><br />
                                        <code style={{ fontSize: '0.85rem', letterSpacing: 2 }}>{mfaSetupData.secret}</code>
                                    </div>

                                    {/* Code input */}
                                    <div className="mb-0">
                                        <label className="form-label fw-bold">Verification Code <span className="text-danger">*</span></label>
                                        <input
                                            type="text"
                                            className={`form-control form-control-lg text-center ${mfaCodeError ? 'is-invalid' : ''}`}
                                            value={mfaCode}
                                            onChange={e => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                            placeholder="000000"
                                            maxLength={6}
                                            style={{ letterSpacing: 6, fontSize: '1.4rem' }}
                                            autoFocus
                                        />
                                        {mfaCodeError && <div className="invalid-feedback">{mfaCodeError}</div>}
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button className="btn btn-outline-secondary"
                                        onClick={() => { setMfaSetupModal(false); setMfaSetupData(null); }}
                                        disabled={mfaConfirming}>
                                        Cancel
                                    </button>
                                    <button className="btn btn-success" onClick={handleMfaConfirmCode} disabled={mfaConfirming || mfaCode.length !== 6}>
                                        {mfaConfirming
                                            ? <><span className="spinner-border spinner-border-sm me-2"></span>Verifying...</>
                                            : <><i className="bi bi-check-lg me-2"></i>Activate MFA</>}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}
        </div>
    );
}

