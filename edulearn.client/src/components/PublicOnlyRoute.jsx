import { Navigate } from 'react-router-dom';
import { authService } from '../services/authService';

// Wraps public auth pages. If already signed in, bounce to the dashboard so the
// browser back/forward buttons can't re-expose the login form after login.
export default function PublicOnlyRoute({ children }) {
    if (authService.isAuthenticated()) {
        return <Navigate to="/dashboard" replace />;
    }
    return children;
}
