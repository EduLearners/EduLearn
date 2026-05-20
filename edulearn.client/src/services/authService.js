import axiosClient from '../api/axiosClient';

// Decode a JWT payload (base64url) — used to extract claims like userID, email
function decodeJwtPayload(token) {
    if (!token) return null;
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        return JSON.parse(atob(payload));
    } catch {
        return null;
    }
}

export const authService = {
    // POST /api/auth/login
    login: async (usernameOrEmail, password) => {
         const { data } = await axiosClient.post('/auth/login', { usernameOrEmail, password });
         return data;
    },

    // POST /api/auth/register
    register: async (userData) => {
        const { data } = await axiosClient.post('/auth/register', userData);
        return data;
    },

    // POST /api/auth/mfa/setup (uses mfaToken in Authorization header)
    setupMfa: async (mfaToken) => {
        const { data } = await axiosClient.post(
            '/auth/mfa/setup',
            {},
            { headers: { Authorization: `Bearer ${mfaToken}` } }
        );
        return data;
    },

    // POST /api/auth/mfa/confirm (first-time enrollment with first code)
    confirmMfa: async (mfaToken, code) => {
        const { data } = await axiosClient.post(
            '/auth/mfa/confirm',
            { code },
            { headers: { Authorization: `Bearer ${mfaToken}` } }
        );
        return data;
    },

    // POST /api/auth/mfa/verify (subsequent logins)
    verifyMfa: async (mfaToken, code) => {
        const { data } = await axiosClient.post(
            '/auth/mfa/verify',
            { code },
            { headers: { Authorization: `Bearer ${mfaToken}` } }
        );
        return data;
    },
    // POST /api/auth/forgot-password — Anonymous
    forgotPassword: async (email) => {
        const { data } = await axiosClient.post('/auth/forgot-password', { email });
        return data;
    },

    // POST /api/auth/reset-password — Anonymous
    resetPassword: async (token, newPassword, confirmPassword) => {
        const { data } = await axiosClient.post('/auth/reset-password', {
            token,
            newPassword,
            confirmPassword,
        });
        return data;
    },

    // Local session helpers — also extracts userID + email from the JWT
    // SPEC: sessionStorage for JWT (Iron Rule 2) — never localStorage
    saveSession: (token, role, username) => {
        sessionStorage.setItem('jwt', token);
        sessionStorage.setItem('role', role);
        sessionStorage.setItem('username', username);

        // Pull additional claims from the JWT for the Profile page and dashboards.
        const payload = decodeJwtPayload(token);
        if (payload) {
            // ASP.NET ClaimTypes serializes to these long URIs by default
            const userId =
                payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ||
                payload['nameid'] ||
                payload['sub'];
            const email =
                payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] ||
                payload['email'];

            if (userId) sessionStorage.setItem('userId', String(userId));
            if (email) sessionStorage.setItem('email', email);
        }
    },

    logout: () => {
        sessionStorage.clear();
    },

    isAuthenticated: () => !!sessionStorage.getItem('jwt'),

    getCurrentUser: () => ({
        token: sessionStorage.getItem('jwt'),
        role: sessionStorage.getItem('role'),
        username: sessionStorage.getItem('username'),
        userId: sessionStorage.getItem('userId'),
        email: sessionStorage.getItem('email'),
    }),
};
