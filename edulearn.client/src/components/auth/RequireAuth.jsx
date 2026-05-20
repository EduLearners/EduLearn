// RequireAuth.jsx
// Redirects to /login if the user has no valid JWT.
// Reads from Redux store (reactive) — falls back to sessionStorage for
// page-refresh cases where the store has not yet hydrated from a render cycle.

import { Navigate, useLocation } from 'react-router-dom';
import { useSelector }           from 'react-redux';
import { selectIsAuthenticated } from '../../store/authSlice';

export default function RequireAuth({ children }) {
    const location  = useLocation();
    const isAuthed  = useSelector(selectIsAuthenticated);

    if (!isAuthed) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return children;
}
