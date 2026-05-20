import axios from 'axios';

// Base axios instance — uses Vite proxy to reach https://localhost:5001/api
const axiosClient = axios.create({
    baseURL: '/api',
    headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: attach JWT from sessionStorage to every request automatically,
// BUT only if no Authorization header was already set explicitly (e.g. for MFA endpoints
// that pass a short-lived mfa_pending token via a per-request header).
axiosClient.interceptors.request.use((config) => {
    // If caller already set Authorization (e.g. MFA setup/confirm/verify), respect it.
    const alreadySet =
        config.headers?.Authorization ||
        config.headers?.authorization ||
        config.headers?.get?.('Authorization');

    if (alreadySet) {
        return config;
    }

    // SPEC: sessionStorage for JWT (Iron Rule 2) — never localStorage
    const token = sessionStorage.getItem('jwt');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response interceptor: auto-logout on 401 (expired/invalid token)
axiosClient.interceptors.response.use(
    (response) => response,
    (error) => {
        // Don't redirect on auth endpoint failures — those are legitimate 401s
        // (bad password, wrong MFA code, etc.) and should be shown to the user.
        const url = error.config?.url || '';
        const isAuthEndpoint = url.includes('/auth/');

        if (error.response?.status === 401 && !isAuthEndpoint) {
            sessionStorage.clear();
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default axiosClient;
