import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

export default function AccessDeniedPage() {
    const navigate = useNavigate();
    const { role } = authService.getCurrentUser();

    return (
        <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '60vh' }}>
            <div className="card shadow-sm border-0 text-center" style={{ maxWidth: 480 }}>
                <div className="card-body p-4">
                    <i className="bi bi-shield-lock-fill text-warning" style={{ fontSize: '2.5rem' }}></i>
                    <h1 className="h4 mt-3 mb-2">Access denied</h1>
                    <p className="text-muted mb-1">
                        You're signed in as <strong>{role || 'your account'}</strong>. This area isn't
                        available to your account.
                    </p>
                    <p className="text-muted small">
                        If you believe you should have access, please contact your department admin.
                    </p>
                    <button className="btn btn-primary-edulearn mt-2" onClick={() => navigate('/dashboard')}>
                        <i className="bi bi-arrow-left me-1"></i>Back to dashboard
                    </button>
                </div>
            </div>
        </div>
    );
}
