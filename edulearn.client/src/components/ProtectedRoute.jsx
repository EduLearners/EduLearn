import { Navigate } from 'react-router-dom';
import { authService } from '../services/authService';

// Guards routes that require authentication. Optional role-based check.
export default function ProtectedRoute({ children, allowedRoles }) {
    const isAuth = authService.isAuthenticated();
    console.log('[ProtectedRoute] isAuthenticated:', isAuth);
    console.log('[ProtectedRoute] jwt in localStorage:', localStorage.getItem('jwt')?.substring(0, 30) + '...');

    // Not logged in? Send to login.
    if (!isAuth) {
        console.log('[ProtectedRoute] ❌ Not authenticated → redirecting to /login');
        return <Navigate to="/login" replace />;
    }

    // Logged in but wrong role? Send to dashboard.
    if (allowedRoles && allowedRoles.length > 0) {
        const { role } = authService.getCurrentUser();
        if (!allowedRoles.includes(role)) {
            console.log('[ProtectedRoute] ❌ Role', role, 'not allowed → /dashboard');
            return <Navigate to="/dashboard" replace />;
        }
    }

    console.log('[ProtectedRoute] ✅ Access granted');
    return children;
}
