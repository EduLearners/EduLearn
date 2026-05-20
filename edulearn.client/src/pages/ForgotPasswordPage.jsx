import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await authService.forgotPassword(email);
            setSubmitted(true);
        } catch (err) {
            setError(err?.response?.data?.error || 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="d-flex align-items-center justify-content-center min-vh-100"
            style={{ background: 'linear-gradient(135deg, #1a3c6e 0%, #2c5aa0 100%)' }}
        >
            <div className="card shadow-lg" style={{ width: 440 }}>
                <div className="card-body p-4">
                    <div className="text-center mb-4">
                        <i
                            className="bi bi-shield-lock text-primary-edulearn"
                            style={{ fontSize: '3rem' }}
                        ></i>
                        <h3 className="text-primary-edulearn mt-2">Forgot Password</h3>
                        <p className="text-muted mb-0">
                            Enter your registered email to receive a reset link.
                        </p>
                    </div>

                    {submitted ? (
                        <div className="text-center">
                            <div className="alert alert-success">
                                <i className="bi bi-envelope-check me-2"></i>
                                If this email is registered, a reset link has been sent.
                                Check your inbox (and spam folder).
                            </div>
                            <p className="text-muted small mb-3">
                                The link expires in <strong>15 minutes</strong>.
                            </p>
                            <button
                                className="btn btn-primary-edulearn w-100"
                                onClick={() => navigate('/login')}
                            >
                                <i className="bi bi-arrow-left me-2"></i>
                                Back to Login
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            <div className="mb-3">
                                <label className="form-label fw-bold">Email Address</label>
                                <div className="input-group">
                                    <span className="input-group-text">
                                        <i className="bi bi-envelope"></i>
                                    </span>
                                    <input
                                        type="email"
                                        className="form-control"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="Enter your registered email"
                                        required
                                        autoFocus
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="alert alert-danger py-2">
                                    <i className="bi bi-exclamation-triangle me-2"></i>
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                className="btn btn-primary-edulearn w-100 mb-3"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2"></span>
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <i className="bi bi-send me-2"></i>
                                        Send Reset Link
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