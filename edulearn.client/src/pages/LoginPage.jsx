import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import ErrorAlert from '../components/ErrorAlert';
import { validateNotWhitespace } from '../utils/validators';

export default function LoginPage() {
    const [usernameOrEmail, setUsernameOrEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        const next = {
            usernameOrEmail: validateNotWhitespace(usernameOrEmail, 'Username or email'),
            password: validateNotWhitespace(password, 'Password'),
        };
        if (Object.values(next).some(Boolean)) { setErrors(next); return; }
        if (!usernameOrEmail.trim() || !password.trim()) return;
        setError('');
        setLoading(true);

        try {
            const data = await authService.login(usernameOrEmail, password);

            // Privileged role -> MFA flow
            if (data.purpose === 'mfa_pending') {
                sessionStorage.setItem('mfaToken', data.mfaToken);
                sessionStorage.setItem('mfaMessage', data.message);

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

                    {/* autoComplete="off" on both form and inputs prevents browser autofill */}
                    <form onSubmit={handleLogin} autoComplete="off">
                        <div className="mb-3">
                            <label className="form-label">Username or Email</label>
                            <div className="input-group has-validation">
                                <span className="input-group-text">
                                    <i className="bi bi-person"></i>
                                </span>
                                <input
                                    className={`form-control${errors.usernameOrEmail ? ' is-invalid' : ''}`}
                                    value={usernameOrEmail}
                                    onChange={(e) => setUsernameOrEmail(e.target.value)}
                                    onBlur={e => setErrors(prev => ({ ...prev, usernameOrEmail: validateNotWhitespace(e.target.value, 'Username or email') }))}
                                    placeholder="Enter Username or email"
                                    maxLength={256}
                                    required
                                    autoFocus
                                    autoComplete="off"
                                />
                                {errors.usernameOrEmail && <div className="invalid-feedback">{errors.usernameOrEmail}</div>}
                            </div>
                        </div>

                        <div className="mb-3">
                            <label className="form-label">Password</label>
                            <div className="input-group has-validation">
                                <span className="input-group-text">
                                    <i className="bi bi-lock"></i>
                                </span>
                                <input
                                    type="password"
                                    className={`form-control${errors.password ? ' is-invalid' : ''}`}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onBlur={e => setErrors(prev => ({ ...prev, password: validateNotWhitespace(e.target.value, 'Password') }))}
                                    placeholder="Enter password"
                                    maxLength={256}
                                    required
                                    autoComplete="new-password"
                                />
                                {errors.password && <div className="invalid-feedback">{errors.password}</div>}
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
                </div>
            </div>
        </div>
    );
}
