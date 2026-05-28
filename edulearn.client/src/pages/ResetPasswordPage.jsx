import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../services/authService';
import { validatePassword } from '../utils/validators';

export default function ResetPasswordPage() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (!token) {
            navigate('/forgot-password');
        }
    }, [token, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const next = {
            newPassword: validatePassword(newPassword),
            confirmPassword: newPassword !== confirmPassword ? 'Passwords do not match' : null,
        };
        if (Object.values(next).some(Boolean)) { setErrors(next); return; }
        setError('');

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        if (newPassword.length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }

        setLoading(true);
        try {
            await authService.resetPassword(token, newPassword, confirmPassword);
            setSuccess(true);
        } catch (err) {
            const code = err?.response?.data?.code;
            if (code === 'TOKEN_EXPIRED') {
                setError('This reset link has expired. Please request a new one.');
            } else if (code === 'INVALID_TOKEN') {
                setError('This reset link is invalid or has already been used.');
            } else if (code === 'PASSWORD_MISMATCH') {
                setError('Passwords do not match.');
            } else {
                setError(err?.response?.data?.error || 'Something went wrong. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    if (!token) return null;

    return (
        <div
            className="d-flex align-items-center justify-content-center min-vh-100"
            style={{ background: 'linear-gradient(135deg, #1a3c6e 0%, #2c5aa0 100%)' }}
        >
            <div className="card shadow-lg" style={{ width: 440 }}>
                <div className="card-body p-4">
                    <div className="text-center mb-4">
                        <i
                            className="bi bi-key text-primary-edulearn"
                            style={{ fontSize: '3rem' }}
                        ></i>
                        <h3 className="text-primary-edulearn mt-2">Reset Password</h3>
                        <p className="text-muted mb-0">
                            Enter your new password below.
                        </p>
                    </div>

                    {success ? (
                        <div className="text-center">
                            <div className="alert alert-success">
                                <i className="bi bi-check-circle me-2"></i>
                                Password reset successfully!
                            </div>
                            <p className="text-muted small mb-3">
                                You can now log in with your new password.
                            </p>
                            <button
                                className="btn btn-primary-edulearn w-100"
                                onClick={() => navigate('/login')}
                            >
                                <i className="bi bi-box-arrow-in-right me-2"></i>
                                Go to Login
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            <div className="mb-3">
                                <label className="form-label fw-bold">
                                    New Password
                                    <small className="text-muted fw-normal ms-2">(min 8 chars)</small>
                                </label>
                                <div className="input-group has-validation">
                                    <span className="input-group-text">
                                        <i className="bi bi-lock"></i>
                                    </span>
                                    <input
                                        type={showNew ? 'text' : 'password'}
                                        className={`form-control${errors.newPassword ? ' is-invalid' : ''}`}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        onBlur={e => setErrors(prev => ({ ...prev, newPassword: validatePassword(e.target.value) }))}
                                        placeholder="Min 8 chars, uppercase, number, special char"
                                        minLength={8}
                                        required
                                        autoFocus
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-outline-secondary"
                                        onClick={() => setShowNew(!showNew)}
                                        tabIndex={-1}
                                    >
                                        <i className={`bi ${showNew ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                                    </button>
                                    {errors.newPassword && <div className="invalid-feedback">{errors.newPassword}</div>}
                                </div>
                                {/* Live strength hints */}
                                {newPassword && (
                                    <div className="mt-2 d-flex flex-wrap gap-2">
                                        {[
                                            { ok: newPassword.length >= 8,                                       label: '8+ chars' },
                                            { ok: /[a-z]/.test(newPassword),                                    label: 'lowercase' },
                                            { ok: /[A-Z]/.test(newPassword),                                    label: 'UPPERCASE' },
                                            { ok: /\d/.test(newPassword),                                       label: '0-9' },
                                            { ok: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(newPassword), label: 'special (@#!)' },
                                        ].map(r => (
                                            <span
                                                key={r.label}
                                                className={`badge ${r.ok ? 'bg-success' : 'bg-secondary'}`}
                                                style={{ fontSize: 11 }}
                                            >
                                                {r.ok ? '✓' : '✗'} {r.label}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="mb-3">
                                <label className="form-label fw-bold">Confirm Password</label>
                                <div className="input-group has-validation">
                                    <span className="input-group-text">
                                        <i className="bi bi-lock-fill"></i>
                                    </span>
                                    <input
                                        type={showConfirm ? 'text' : 'password'}
                                        className={`form-control${errors.confirmPassword ? ' is-invalid' : ''}`}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        onBlur={e => setErrors(prev => ({ ...prev, confirmPassword: newPassword !== e.target.value ? 'Passwords do not match' : null }))}
                                        placeholder="Confirm new password"
                                        minLength={8}
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-outline-secondary"
                                        onClick={() => setShowConfirm(!showConfirm)}
                                        tabIndex={-1}
                                    >
                                        <i className={`bi ${showConfirm ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                                    </button>
                                    {errors.confirmPassword && <div className="invalid-feedback">{errors.confirmPassword}</div>}
                                </div>
                                {/* Password match indicator */}
                                {confirmPassword && (
                                    <div className={`form-text ${newPassword === confirmPassword ? 'text-success' : 'text-danger'}`}>
                                        <i className={`bi ${newPassword === confirmPassword ? 'bi-check-circle' : 'bi-x-circle'} me-1`}></i>
                                        {newPassword === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                                    </div>
                                )}
                            </div>

                            {error && (
                                <div className="alert alert-danger py-2">
                                    <i className="bi bi-exclamation-triangle me-2"></i>
                                    {error}
                                    {(error.includes('expired') || error.includes('invalid')) && (
                                        <div className="mt-2">
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-outline-danger"
                                                onClick={() => navigate('/forgot-password')}
                                            >
                                                Request a new reset link
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            <button
                                type="submit"
                                className="btn btn-primary-edulearn w-100 mb-3"
                                disabled={loading || newPassword !== confirmPassword}
                            >
                                {loading ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2"></span>
                                        Resetting...
                                    </>
                                ) : (
                                    <>
                                        <i className="bi bi-check-lg me-2"></i>
                                        Reset Password
                                    </>
                                )}
                            </button>

                            <div className="text-center">
                                <button
                                    type="button"
                                    className="btn btn-link text-muted p-0"
                                    onClick={() => navigate('/login')}
                                >
                                    <i className="bi bi-arrow-left me-1"></i>
                                    Back to Login
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}