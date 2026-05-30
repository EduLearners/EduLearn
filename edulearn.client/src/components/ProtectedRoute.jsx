import { Navigate } from 'react-router-dom';
import { authService } from '../services/authService';
import AccessDeniedPage from '../pages/AccessDeniedPage';

// Guards routes that require authentication. Optional role-based check.
export default function ProtectedRoute({ children, allowedRoles }) {
    const isAuth = authService.isAuthenticated();

    // Not logged in? Send to login.
    if (!isAuth) {
        return <Navigate to="/login" replace />;
    }

    // Logged in but wrong role? Show a clear, role-aware access-denied page in place.
    if (allowedRoles && allowedRoles.length > 0) {
        const { role } = authService.getCurrentUser();
        if (!allowedRoles.includes(role)) {
            return <AccessDeniedPage />;
        }
    }

    return children;
}
