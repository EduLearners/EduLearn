import { useState } from 'react';
import { userService } from '../services/userService';
import ErrorAlert from './ErrorAlert';

export default function ChangePasswordForm({ userId, onClose }) {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState('');

    // Live validation rules
    const rules = {
        minLength: newPassword.length >= 8,
        hasLetter: /[a-zA-Z]/.test(newPassword),
        // FIX: isDifferent was true when newPassword is empty (misleading green checkmark).
        // Now it is only true when the user has actually typed something AND it differs.
        isDifferent: newPassword.length > 0 && newPassword !== currentPassword,
    };
    const allRulesPassed = rules.minLength && rules.hasLetter && rules.isDifferent;
    const passwordsMatch = newPassword === confirmPassword && confirmPassword !== '';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess('');

        if (!allRulesPassed) return;
        if (!passwordsMatch) {
            setError({ message: 'New password and confirm password do not match.' });
            return;
        }

        setLoading(true);
        try {
            await userService.changePassword(
                userId,
                currentPassword,
                newPassword,
                confirmPassword
            );
            setSuccess('Password changed successfully.');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err) {
            const code = err?.response?.data?.code;
            if (code === 'WRONG_CURRENT_PASSWORD') {
                setError({ message: 'Current password is incorrect.' });
            } else if (code === 'PASSWORD_MISMATCH') {
                setError({ message: 'New password and confirm password do not match.' });
            } else if (code === 'SAME_PASSWORD') {
                setError({ message: 'New password must be different from your current password.' });
            } else {
                setError(err);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setError(null);
        setSuccess('');
    };

    return (
        <>
        <style>{`
            input[type="password"]::-ms-reveal,
            input[type="password"]::-ms-clear,
            input[type="password"]::-webkit-contacts-auto-fill-button,
            input[type="password"]::-webkit-credentials-auto-fill-button {
                display: none !important;
                visibility: hidden;
                pointer-events: none;
            }
        `}</style>
        <div className="card shadow-sm mt-4">
            <div className="card-header bg-primary-edulearn text-white">
                <i className="bi bi-lock me-2"></i>
                Change Password
            </div>
            <div className="card-body">

                {/* Password Requirements — FIX: only show rule states after user starts typing */}
                <div className="p-3 bg-light rounded mb-4">
                    <p className="text-muted small text-uppercase fw-bold mb-2">
                        Password Requirements
                    </p>
                    <div className="d-flex flex-column gap-1">
                        <RuleItem
                            passed={rules.minLength}
                            active={newPassword.length > 0}
                            text="At least 8 characters"
                        />
                        <RuleItem
                            passed={rules.hasLetter}
                            active={newPassword.length > 0}
                            text="At least one letter"
                        />
                        <RuleItem
                            passed={rules.isDifferent}
                            active={newPassword.length > 0}
                            text="Must differ from current password"
                        />
                    </div>
                </div>

                {success && (
                    <div className="alert alert-success d-flex align-items-center justify-content-between mb-4">
                        <span>
                            <i className="bi bi-check-circle me-2"></i>
                            {success}
                        </span>
                        <button className="btn-close" onClick={() => setSuccess('')}></button>
                    </div>
                )}

                <ErrorAlert error={error} onDismiss={() => setError(null)} />

                <form onSubmit={handleSubmit}>
                    <div className="row g-3">

                        <div className="col-md-6">
                            <label className="form-label fw-bold">
                                Current Password <span className="text-danger">*</span>
                            </label>
                            <div className="input-group">
                                <span className="input-group-text">
                                    <i className="bi bi-lock"></i>
                                </span>
                                <input
                                    type={showCurrent ? 'text' : 'password'}
                                    className="form-control"
                                    value={currentPassword}
                                    style={{ WebkitTextSecurity: showCurrent ? 'none' : 'disc' }}
                                    onChange={e => setCurrentPassword(e.target.value)}
                                    placeholder="Enter current password"
                                    required
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary"
                                    onClick={() => setShowCurrent(!showCurrent)}
                                    tabIndex={-1}
                                >
                                    <i className={`bi ${showCurrent ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                                </button>
                            </div>
                            <div className="form-text text-muted">Your existing account password</div>
                        </div>

                        <div className="col-md-6 d-none d-md-block"></div>

                        <div className="col-md-6">
                            <label className="form-label fw-bold">
                                New Password <span className="text-danger">*</span>
                                <small className="text-muted fw-normal ms-2">(min 8 chars)</small>
                            </label>
                            <div className="input-group">
                                <span className="input-group-text">
                                    <i className="bi bi-lock-fill"></i>
                                </span>
                                <input
                                    type={showNew ? 'text' : 'password'}
                                    className="form-control"
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    placeholder="Min 8 characters"
                                    minLength={8}
                                    required
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary"
                                    onClick={() => setShowNew(!showNew)}
                                    tabIndex={-1}
                                >
                                    <i className={`bi ${showNew ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                                </button>
                            </div>
                        </div>

                        <div className="col-md-6">
                            <label className="form-label fw-bold">
                                Confirm New Password <span className="text-danger">*</span>
                            </label>
                            <div className="input-group">
                                <span className="input-group-text">
                                    <i className="bi bi-lock-fill"></i>
                                </span>
                                <input
                                    type={showConfirm ? 'text' : 'password'}
                                    className="form-control"
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    placeholder="Re-enter new password"
                                    minLength={8}
                                    required
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary"
                                    onClick={() => setShowConfirm(!showConfirm)}
                                    tabIndex={-1}
                                >
                                    <i className={`bi ${showConfirm ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                                </button>
                            </div>
                            {confirmPassword && (
                                <div className={`form-text ${passwordsMatch ? 'text-success' : 'text-danger'}`}>
                                    <i className={`bi ${passwordsMatch ? 'bi-check-circle' : 'bi-x-circle'} me-1`}></i>
                                    {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                                </div>
                            )}
                        </div>

                    </div>

                    <div className="d-flex gap-2 mt-4">
                        <button
                            type="submit"
                            className="btn btn-primary-edulearn"
                            disabled={
                                loading ||
                                !currentPassword ||
                                !allRulesPassed ||
                                !passwordsMatch
                            }
                        >
                            {loading ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2"></span>
                                    Changing...
                                </>
                            ) : (
                                <>
                                    <i className="bi bi-check-lg me-2"></i>
                                    Change Password
                                </>
                            )}
                        </button>
                        <button
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={() => { handleCancel(); onClose?.(); }}
                            disabled={loading}
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
        </>
    );
}

// FIX: Added `active` prop — when false (user hasn't started typing), rules show neutral grey
// instead of prematurely green. Once active, shows green (passed) or muted (not yet).
function RuleItem({ passed, active, text }) {
    let icon, className;
    if (!active) {
        icon = 'bi-circle';
        className = 'text-muted';
    } else if (passed) {
        icon = 'bi-check-circle-fill';
        className = 'text-success';
    } else {
        icon = 'bi-x-circle-fill';
        className = 'text-danger';
    }
    return (
        <div className={`small d-flex align-items-center gap-2 ${className}`}>
            <i className={`bi ${icon}`}></i>
            {text}
        </div>
    );
}
