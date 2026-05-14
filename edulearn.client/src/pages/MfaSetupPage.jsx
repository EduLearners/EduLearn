import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import ErrorAlert from '../components/ErrorAlert';

export default function MfaSetupPage() {
    const [secret, setSecret] = useState('');
    const [otpauthUri, setOtpauthUri] = useState('');
    const [code, setCode] = useState('');
    const [step, setStep] = useState('setup'); // 'setup' | 'confirm'
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // Capture mfaToken on initial mount only (same fix as MfaVerifyPage).
    const [mfaToken] = useState(() => sessionStorage.getItem('mfaToken'));

    useEffect(() => {
        if (!mfaToken) {
            navigate('/login');
            return;
        }
        runSetup();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const runSetup = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await authService.setupMfa(mfaToken);
            setSecret(data.secret);
            setOtpauthUri(data.otpauthUri);
            setStep('confirm');
        } catch (err) {
            if (err.response?.data?.code === 'MFA_ALREADY_ENROLLED') {
                navigate('/mfa/verify');
                return;
            }
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const data = await authService.confirmMfa(mfaToken, code);

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
        <div
            className="d-flex align-items-center justify-content-center min-vh-100 py-4"
            style={{ background: 'linear-gradient(135deg, #1a3c6e 0%, #2c5aa0 100%)' }}
        >
            <div className="card shadow-lg" style={{ width: 480 }}>
                <div className="card-body p-4">
                    <div className="text-center mb-4">
                        <i className="bi bi-shield-plus text-primary-edulearn" style={{ fontSize: '3rem' }}></i>
                        <h3 className="text-primary-edulearn mt-2">Set Up Two-Factor Authentication</h3>
                        <p className="text-muted">First time MFA setup for your account</p>
                    </div>

                    {step === 'setup' && loading && (
                        <div className="text-center py-4">
                            <div className="spinner-border text-primary-edulearn" role="status"></div>
                            <p className="mt-3 text-muted">Generating your secret key...</p>
                        </div>
                    )}

                    {step === 'confirm' && (
                        <>
                            <div className="alert alert-info">
                                <i className="bi bi-info-circle me-2"></i>
                                <strong>Step 1:</strong> Add this secret to your authenticator app
                                (Google Authenticator, Microsoft Authenticator, or
                                <a href="https://totp.danhersam.com" target="_blank" rel="noreferrer"> this online TOTP site</a>).
                            </div>

                            <div className="mb-3">
                                <label className="form-label fw-bold">Your Secret Key</label>
                                <div className="input-group">
                                    <input
                                        type="text"
                                        className="form-control font-monospace"
                                        value={secret}
                                        readOnly
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-outline-secondary"
                                        onClick={() => navigator.clipboard.writeText(secret)}
                                        title="Copy to clipboard"
                                    >
                                        <i className="bi bi-clipboard"></i>
                                    </button>
                                </div>
                                <small className="text-muted">
                                    Account name: <code>EduLearn:{authService.getCurrentUser().username || 'user'}</code>
                                </small>
                            </div>

                            <div className="alert alert-warning">
                                <i className="bi bi-exclamation-triangle me-2"></i>
                                <strong>Step 2:</strong> Enter the current 6-digit code from your authenticator app to confirm enrollment.
                            </div>

                            <form onSubmit={handleConfirm}>
                                <div className="mb-3">
                                    <label className="form-label">6-digit code</label>
                                    <input
                                        className="form-control form-control-lg text-center"
                                        value={code}
                                        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        maxLength={6}
                                        pattern="\d{6}"
                                        required
                                        autoFocus
                                        style={{ letterSpacing: '0.5rem', fontFamily: 'monospace' }}
                                        placeholder="000000"
                                    />
                                    <div className="form-text text-muted">
                                        <i className="bi bi-clock me-1"></i>
                                        Wait for your app to show a fresh code (codes refresh every 30 seconds).
                                    </div>
                                </div>

                                <ErrorAlert error={error} onDismiss={() => setError('')} />

                                <button
                                    type="submit"
                                    className="btn btn-primary-edulearn w-100 mb-2"
                                    disabled={loading || code.length !== 6}
                                >
                                    {loading ? 'Confirming...' : 'Confirm Enrollment'}
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary w-100 mb-2"
                                    onClick={() => {
                                        setCode('');
                                        setError('');
                                    }}
                                >
                                    <i className="bi bi-arrow-clockwise me-2"></i>Clear &amp; Try a Fresh Code
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-link w-100"
                                    onClick={() => navigate('/login')}
                                >
                                    Cancel
                                </button>
                            </form>
                        </>
                    )}

                    {step === 'setup' && !loading && error && (
                        <>
                            <ErrorAlert error={error} />
                            <button
                                type="button"
                                className="btn btn-link w-100 mt-2"
                                onClick={() => navigate('/login')}
                            >
                                Back to Login
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
