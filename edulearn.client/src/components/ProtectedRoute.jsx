import { Navigate } from 'react-router-dom';
import { authService } from '../services/authService';

// Guards routes that require authentication. Optional role-based check.
export default function ProtectedRoute({ children, allowedRoles }) {
    const isAuth = authService.isAuthenticated();

    // Not logged in? Send to login.
    if (!isAuth) {
        return <Navigate to="/login" replace />;
    }

    // Logged in but wrong role? Send to dashboard.
    if (allowedRoles && allowedRoles.length > 0) {
        const { role } = authService.getCurrentUser();
        if (!allowedRoles.includes(role)) {
            return <Navigate to="/dashboard" replace />;
        }
    }

    return children;
}
