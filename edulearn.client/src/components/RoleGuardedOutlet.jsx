import { Outlet, useLocation } from 'react-router-dom';
import { authService } from '../services/authService';
import AccessDeniedPage from '../pages/AccessDeniedPage';
import { rolesForPath } from '../config/routeRoles';

// Renders the matched child route only if the current user's role is permitted
// for that route (per config/routeRoles). Otherwise shows the role-aware
// Access-Denied page IN PLACE (navbar + sidebar stay visible).
//
// This closes the gap where any authenticated user could render another role's
// section UI by typing the URL or using the browser back button. The backend
// still enforces data authorization independently.
export default function RoleGuardedOutlet() {
    const { pathname } = useLocation();
    const { role } = authService.getCurrentUser();
    const allowed = rolesForPath(pathname);

    if (allowed !== '*' && Array.isArray(allowed) && !allowed.includes(role)) {
        return <AccessDeniedPage />;
    }

    return <Outlet />;
}
