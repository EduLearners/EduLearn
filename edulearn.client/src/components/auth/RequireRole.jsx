// RequireRole.jsx
// Renders children only if the current user's role is in allowedRoles.
// Reads from Redux store — reactive to login/logout.

import { Navigate }    from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectRole }  from '../../store/authSlice';

export default function RequireRole({ children, allowedRoles = [] }) {
    const role = useSelector(selectRole);

    if (!allowedRoles.includes(role)) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
}
