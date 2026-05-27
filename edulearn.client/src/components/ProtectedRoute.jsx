import { Navigate } from 'react-router-dom';
import { authService } from '../services/authService';

// Decode JWT expiry without a library
function isTokenExpired(token) {
    if (!token) return true;
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return true;
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
        if (!payload.exp) return false;
        return payload.exp * 1000 < Date.now();
    } catch {
        return true;
    }
}

// Guards routes that require authentication. Optional role-based check.
export default function ProtectedRoute({ children, allowedRoles }) {
    const { token, role } = authService.getCurrentUser();

    // Not logged in or token expired — send to login
    if (!token || isTokenExpired(token)) {
        // Clear stale session data
        if (token) authService.logout();
        return <Navigate to="/login" replace />;
    }

    // Logged in but wrong role? Send to dashboard.
    if (allowedRoles && allowedRoles.length > 0) {
        if (!allowedRoles.includes(role)) {
            return <Navigate to="/dashboard" replace />;
        }
    }

    return children;
}
