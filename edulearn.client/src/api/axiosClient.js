import axios from 'axios';

// Base axios instance — uses Vite proxy to reach https://localhost:5001/api
// phase4-fix-13: add 15 s timeout so requests don't hang indefinitely
const axiosClient = axios.create({
    baseURL: '/api',
    headers: { 'Content-Type': 'application/json' },
    timeout: 15000,
});

// Request interceptor: attach JWT from localStorage to every request automatically,
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

    const token = localStorage.getItem('jwt');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response interceptor: auto-logout on 401; timeout + 5xx handling
axiosClient.interceptors.response.use(
    (response) => response,
    (error) => {
        // Don't redirect on auth endpoint failures — those are legitimate 401s
        // (bad password, wrong MFA code, etc.) and should be shown to the user.
        const url = error.config?.url || '';
        const isAuthEndpoint = url.includes('/auth/');

        // phase4-fix-13: handle request timeout (ECONNABORTED)
        if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK') {
            console.warn('[axiosClient] Request timed out — please retry.', { url });
            return Promise.reject({ ...error, _userMessage: 'Request timed out — please retry.' });
        }

        // phase4-fix-14: log 5xx server errors (Phase 5 Task 5.11 will extend with errorReporter)
        const status = error.response?.status;
        if (status >= 500 && !isAuthEndpoint) {
            console.error('[axiosClient] Server error', status, url);
        }

        if (status === 401 && !isAuthEndpoint) {
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default axiosClient;
