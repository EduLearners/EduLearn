import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { userService } from '../services/userService';
import Loading from '../components/Loading';
import ErrorAlert from '../components/ErrorAlert';
import StatusBadge from '../components/StatusBadge';
import ChangePasswordForm from '../components/ChangePasswordForm';

export default function ProfilePage() {
    const navigate = useNavigate();
    const { username, role, userId, email: cachedEmail } = authService.getCurrentUser();

    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showChangePassword, setShowChangePassword] = useState(false);
    useEffect(() => {
        loadProfile();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadProfile = async () => {
        try {
            setLoading(true);
            setError(null);

            if (!userId) {
                // Fallback if userId wasn't decoded from JWT (older session)
                setProfile({
                    username,
                    role,
                    email: cachedEmail,
                    fullName: username,
                    fallback: true,
                });
                return;
            }

            const data = await userService.getById(userId);
            setProfile(data);
        } catch (err) {
            setError(err);
            // Still show what we have from localStorage as a graceful fallback
            setProfile({
                username,
                role,
                email: cachedEmail,
                fullName: username,
                fallback: true,
            });
        } finally {
            setLoading(false);
        }
    };

    // Initials for the big avatar
    const initials = (profile?.fullName || profile?.username || username || '?')
        .split(/[\s_-]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(p => p[0]?.toUpperCase())
        .join('');

    // Map role → display description for context
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

            {!loading && profile && (
                <>
                    {/* Hero card with big avatar */}
                    <div className="card shadow-sm mb-4 border-0 overflow-hidden">
                        {/* Gradient banner with avatar centered on its bottom edge */}
                        <div
                            className="position-relative"
                            style={{
                                background: 'linear-gradient(135deg, #1a3c6e 0%, #2c5aa0 100%)',
                                height: 120,
                            }}
                        >
                            <div
                                className="position-absolute"
                                style={{
                                    left: 32,
                                    bottom: -50,
                                    width: 100,
                                    height: 100,
                                    borderRadius: '50%',
                                    backgroundColor: '#e2a94b',
                                    color: '#1a3c6e',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 700,
                                    fontSize: 36,
                                    border: '4px solid white',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                }}
                            >
                                {initials}
                            </div>
                        </div>

                        {/* Name + role section, fully BELOW the banner so nothing overlaps */}
                        <div className="card-body" style={{ paddingTop: 64, paddingLeft: 32 }}>
                            <h3 className="text-primary-edulearn mb-1">
                                {profile.fullName || profile.username}
                            </h3>
                            <div className="d-flex align-items-center gap-2 text-muted flex-wrap">
                                <span>
                                    <i className="bi bi-at"></i>
                                    {profile.username}
                                </span>
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

                    {/* Profile details — two columns */}
                    <div className="row g-4">
                        {/* Account info */}
                        <div className="col-md-6">
                            <div className="card shadow-sm h-100">
                                <div className="card-header bg-primary-edulearn text-white">
                                    <i className="bi bi-person-vcard me-2"></i>Account Information
                                </div>
                                <div className="card-body">
                                    <dl className="row mb-0">
                                        <dt className="col-sm-5 text-muted">User ID</dt>
                                        <dd className="col-sm-7">
                                            {profile.userID ? (
                                                <code>#{profile.userID}</code>
                                            ) : userId ? (
                                                <code>#{userId}</code>
                                            ) : '—'}
                                        </dd>

                                        <dt className="col-sm-5 text-muted">Username</dt>
                                        <dd className="col-sm-7">
                                            <code>{profile.username}</code>
                                        </dd>

                                        <dt className="col-sm-5 text-muted">Full Name</dt>
                                        <dd className="col-sm-7">{profile.fullName || '—'}</dd>

                                        <dt className="col-sm-5 text-muted">Email</dt>
                                        <dd className="col-sm-7">
                                            {profile.email ? (
                                                <a href={`mailto:${profile.email}`}>
                                                    <i className="bi bi-envelope me-1"></i>
                                                    {profile.email}
                                                </a>
                                            ) : '—'}
                                        </dd>

                                        <dt className="col-sm-5 text-muted">Phone</dt>
                                        <dd className="col-sm-7">
                                            {profile.phone ? (
                                                <>
                                                    <i className="bi bi-telephone me-1 text-muted"></i>
                                                    {profile.phone}
                                                </>
                                            ) : '—'}
                                        </dd>

                                        <dt className="col-sm-5 text-muted">Account Status</dt>
                                        <dd className="col-sm-7">
                                            {profile.status ? <StatusBadge status={profile.status} /> : '—'}
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>

                        {/* Role & Security */}
                        <div className="col-md-6">
                            <div className="card shadow-sm h-100">
                                <div className="card-header bg-primary-edulearn text-white">
                                    <i className="bi bi-shield-lock me-2"></i>Role & Security
                                </div>
                                <div className="card-body">
                                    <dl className="row mb-3">
                                        <dt className="col-sm-5 text-muted">Role</dt>
                                        <dd className="col-sm-7">
                                            <span className="badge bg-primary-edulearn fs-6">
                                                {profile.role}
                                            </span>
                                        </dd>

                                        <dt className="col-sm-5 text-muted">MFA Enabled</dt>
                                        <dd className="col-sm-7">
                                            {profile.mfaEnabled ? (
                                                <span className="badge bg-success">
                                                    <i className="bi bi-shield-check me-1"></i>Enabled
                                                </span>
                                            ) : (
                                                <span className="badge bg-secondary">
                                                    <i className="bi bi-shield-slash me-1"></i>Not Enabled
                                                </span>
                                            )}
                                        </dd>

                                        <dt className="col-sm-5 text-muted">Member Since</dt>
                                        <dd className="col-sm-7">
                                            {profile.createdAt ? (
                                                <>
                                                    <i className="bi bi-calendar3 me-1 text-muted"></i>
                                                    {new Date(profile.createdAt).toLocaleDateString('en-US', {
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric',
                                                    })}
                                                </>
                                            ) : '—'}
                                        </dd>

                                        {profile.updatedAt && (
                                            <>
                                                <dt className="col-sm-5 text-muted">Last Updated</dt>
                                                <dd className="col-sm-7">
                                                    <small className="text-muted">
                                                        {new Date(profile.updatedAt).toLocaleString()}
                                                    </small>
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
                                    <p className="text-muted small mb-0">
                                        Receive a password reset link on your registered email address.
                                    </p>
                                </div>
                                <button className="btn btn-outline-primary btn-sm"
                                   onClick={() => setShowChangePassword(true)}>
                                  <i className="bi bi-key me-2"></i>
                                   Reset Password
                                 </button>
                            </div>
                        </div>
                    </div>

                    {/* Change Password */}
                    {showChangePassword && (
                        <ChangePasswordForm
                            userId={userId}
                            onClose={() => setShowChangePassword(false)}
                        />
                    )}
                </>
            )}
        </div>
    );
}
