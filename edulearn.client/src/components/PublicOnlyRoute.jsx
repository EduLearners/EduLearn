import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { authService } from '../services/authService';

// Wraps public auth pages.
//
// Security requirement: arriving at the LOGIN page must always end any existing
// session, so pressing the browser Back button to /login (and then Forward) can
// never silently re-authenticate the user. We clear the session on arrival at
// /login rather than auto-redirecting to the dashboard.
//
// Other public auth pages (/mfa/verify, /mfa/setup, /forgot-password,
// /reset-password) are NOT cleared here: the MFA flow relies on a short-lived
// mfaToken held in sessionStorage, and clearing it would break verification.
export default function PublicOnlyRoute({ children }) {
    const location = useLocation();
    const isLoginPage = location.pathname === '/login';

    useEffect(() => {
        if (isLoginPage && authService.isAuthenticated()) {
            // Landing on the login page with an active session => log out.
            authService.logout();
        }
    }, [isLoginPage]);

    return children;
}
