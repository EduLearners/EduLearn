import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import ErrorAlert from '../components/ErrorAlert';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        // Guard: prevent empty credential submission from browser autofill/remount
       if (!username.trim() || !password.trim()) return;
        setError('');
        setLoading(true);

        try {
            const data = await authService.login(username, password);

            // Privileged role -> MFA flow
            if (data.purpose === 'mfa_pending') {
                sessionStorage.setItem('mfaToken', data.mfaToken);
                sessionStorage.setItem('mfaMessage', data.message);

                // If message says "enrollment required", go to setup page
                if (data.message?.toLowerCase().includes('enrollment')) {
                    navigate('/mfa/setup');
                } else {
                    navigate('/mfa/verify');
                }
                return;
            }

            // Student / Instructor -> direct JWT
            authService.saveSession(data.token, data.role, data.username);
            navigate('/dashboard');

        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="d-flex align-items-center justify-content-center min-vh-100"
            style={{ background: 'linear-gradient(135deg, #1a3c6e 0%, #2c5aa0 100%)' }}
        >
            <div className="card shadow-lg" style={{ width: 420 }}>
                <div className="card-body p-4">
                    <div className="text-center mb-4">
                        <i className="bi bi-mortarboard-fill text-primary-edulearn" style={{ fontSize: '3rem' }}></i>
                        <h2 className="text-primary-edulearn mt-2">EduLearn</h2>
                        <p className="text-muted mb-0">University Management System</p>
                    </div>

                    <form onSubmit={handleLogin}>
                        <div className="mb-3">
                            <label className="form-label">Username</label>
                            <div className="input-group">
                                <span className="input-group-text">
                                    <i className="bi bi-person"></i>
                                </span>
                                <input
                                    className="form-control"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="mb-3">
                            <label className="form-label">Password</label>
                            <div className="input-group">
                                <span className="input-group-text">
                                    <i className="bi bi-lock"></i>
                                </span>
                                <input
                                    type="password"
                                    className="form-control"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <ErrorAlert error={error} />

                        <button
                            type="submit"
                            className="btn btn-primary-edulearn w-100"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2"></span>
                                    Signing in...
                                </>
                            ) : (
                                <>
                                    <i className="bi bi-box-arrow-in-right me-2"></i>
                                    Sign In
                                </>
                            )}
                        </button>
                    </form>

                    <hr />
                    
                    <div className="text-center mb-2">
                        <button
                            type="button"
                            className="btn btn-link text-muted p-0 small"
                            onClick={() => navigate('/forgot-password')}
                        >
                            <i className="bi bi-question-circle me-1"></i>
                            Forgot your password?
                        </button>
                    </div>
                    <p className="text-center text-muted small mb-0">
                        Don't have an account? <a href="/register">Register here</a>
                    </p>
                </div>
            </div>
        </div>
    );
}
