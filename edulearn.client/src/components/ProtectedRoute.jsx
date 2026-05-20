// ProtectedRoute.jsx
// Guards routes that require authentication.
// Optionally checks allowed roles (allowedRoles prop).
// Used in App.jsx on the layout wrapper.

import { Navigate } from 'react-router-dom';
import { authService } from '../services/authService';

export default function ProtectedRoute({ children, allowedRoles }) {
  const isAuth = authService.isAuthenticated();

  if (!isAuth) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const { role } = authService.getCurrentUser();
    if (!allowedRoles.includes(role)) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
}
