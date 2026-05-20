import { useState } from 'react';
import { userService } from '../services/userService';
import ErrorAlert from './ErrorAlert';

export default function ChangePasswordForm({ userId ,onClose }) {
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
        isDifferent: newPassword !== currentPassword || newPassword === '',
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

                {/* Password Requirements */}
                <div className="p-3 bg-light rounded mb-4">
                    <p className="text-muted small text-uppercase fw-bold mb-2">
                        Password Requirements
                    </p>
                    <div className="d-flex flex-column gap-1">
                        <RuleItem passed={rules.minLength} text="At least 8 characters" />
                        <RuleItem passed={rules.hasLetter} text="At least one letter" />
                        <RuleItem passed={rules.isDifferent} text="Must differ from current password" />
                    </div>
                </div>

                {/* Success Alert */}
                {success && (
                    <div className="alert alert-success d-flex align-items-center justify-content-between mb-4">
                        <span>
                            <i className="bi bi-check-circle me-2"></i>
                            {success}
                        </span>
                        <button
                            className="btn-close"
                            onClick={() => setSuccess('')}
                        ></button>
                    </div>
                )}

                <ErrorAlert error={error} onDismiss={() => setError(null)} />

                <form onSubmit={handleSubmit}>
                    <div className="row g-3">

                        {/* Current Password */}
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
                            <div className="form-text text-muted">
                                Your existing account password
                            </div>
                        </div>

                        {/* Empty col for layout */}
                        <div className="col-md-6 d-none d-md-block"></div>

                        {/* New Password */}
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

                        {/* Confirm New Password */}
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
                            {/* Match indicator */}
                            {confirmPassword && (
                                <div className={`form-text ${passwordsMatch ? 'text-success' : 'text-danger'}`}>
                                    <i className={`bi ${passwordsMatch ? 'bi-check-circle' : 'bi-x-circle'} me-1`}></i>
                                    {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                                </div>
                            )}
                        </div>

                    </div>

                    {/* Action Buttons */}
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
                        <button type="button" className="btn btn-outline-secondary"  onClick={() => { handleCancel(); onClose?.(); }}
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

// Small helper component for each rule row
function RuleItem({ passed, text }) {
    return (
        <div className={`small d-flex align-items-center gap-2 ${passed ? 'text-success' : 'text-muted'}`}>
            <i className={`bi ${passed ? 'bi-check-circle-fill' : 'bi-circle'}`}></i>
            {text}
        </div>
    );
}