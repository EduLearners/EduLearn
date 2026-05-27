import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import ErrorAlert from '../components/ErrorAlert';
import { validateTotpCode } from '../utils/validators';

export default function MfaVerifyPage() {
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const navigate = useNavigate();

    // Capture mfaToken on initial mount only.
    // Reading sessionStorage on every render would fire AFTER successful verify
    // (because we clear the token then navigate), incorrectly redirecting to /login.
    const [mfaToken] = useState(() => sessionStorage.getItem('mfaToken'));
    const [message] = useState(() => sessionStorage.getItem('mfaMessage'));

    useEffect(() => {
        if (!mfaToken) {
            navigate('/login');
        }
        // Empty deps: run ONLY on mount, never again.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleVerify = async (e) => {
        e.preventDefault();
        const next = { code: validateTotpCode(code) };
        if (Object.values(next).some(Boolean)) { setErrors(next); return; }
        setError('');
        setLoading(true);

        try {
            const data = await authService.verifyMfa(mfaToken, code);

            if (!data?.token) {
                setError('Server did not return a token.');
                return;
            }

            authService.saveSession(data.token, data.role, data.username);
            sessionStorage.removeItem('mfaToken');
            sessionStorage.removeItem('mfaMessage');

            navigate('/dashboard', { replace: true });
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="d-flex align-items-center justify-content-center min-vh-100" style={{ background: 'linear-gradient(135deg, #1a3c6e 0%, #2c5aa0 100%)' }}>
            <div className="card shadow-lg" style={{ width: 420 }}>
                <div className="card-body p-4">
                    <div className="text-center mb-4">
                        <i className="bi bi-shield-check text-primary-edulearn" style={{ fontSize: '3rem' }}></i>
                        <h3 className="text-primary-edulearn mt-2">Two-Factor Authentication</h3>
                        {/* <p className="text-muted">{message}</p> */}
                    </div>

                    <form onSubmit={handleVerify}>
                        <div className="mb-3">
                            <label className="form-label">6-digit code from your authenticator app</label>
                            <input
                                className={`form-control form-control-lg text-center${errors.code ? ' is-invalid' : ''}`}
                                value={code}
                                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                onBlur={e => setErrors(prev => ({ ...prev, code: validateTotpCode(e.target.value) }))}
                                maxLength={6}
                                pattern="\d{6}"
                                required
                                autoFocus
                                style={{ letterSpacing: '0.5rem', fontFamily: 'monospace' }}
                            />
                            {errors.code && <div className="invalid-feedback">{errors.code}</div>}
                        </div>

                        <ErrorAlert error={error} />

                        <button type="submit" className="btn btn-primary-edulearn w-100" disabled={loading || code.length !== 6}>
                            {loading ? 'Verifying...' : 'Verify'}
                        </button>
                        <button type="button" className="btn btn-link w-100 mt-2" onClick={() => navigate('/login')}>
                            Cancel
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
