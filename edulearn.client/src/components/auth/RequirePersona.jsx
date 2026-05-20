// RequirePersona.jsx
// Renders children only if the current user's persona matches allowedPersonas.
// The persona is derived from the role via ROLE_TO_PERSONA map.
// Usage: <RequirePersona allowedPersonas={['Operations','Governance']}> ... </RequirePersona>

import { Navigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { ROLE_TO_PERSONA } from '../../store/personaSlice';

export default function RequirePersona({ children, allowedPersonas = [] }) {
  const { role }    = authService.getCurrentUser();
  const persona     = ROLE_TO_PERSONA[role] || null;

  if (!persona || !allowedPersonas.includes(persona)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
