import axios from 'axios';

const CACHE_KEY = 'edulearn_backend_url';

/**
 * Auto-detect which backend port is running (5000 or 5001)
 * Tries both URLs in order, returns the first one that responds
 * Caches result in sessionStorage for fast subsequent loads
 * @returns {Promise<string>} Backend URL (e.g., 'http://localhost:5000')
 * @throws {Error} If neither backend port responds
 */
export async function detectBackend() {
  // Check cache first for instant load on refresh
  const cached = sessionStorage.getItem(CACHE_KEY);
  if (cached) {
    console.log('[backendConfig] Using cached backend:', cached);
    return cached;
  }

  // Try both ports in order (HTTP first, then HTTPS)
  const candidates = [
    'http://localhost:5000',
    'https://localhost:5001'
  ];

  for (const url of candidates) {
    try {
      console.log('[backendConfig] Trying:', url);

      // Use /api/users endpoint which returns 401 when backend is alive
      // (401 = needs auth = backend responding correctly)
      await axios.get(`${url}/api/users`, {
        timeout: 1000,
        validateStatus: (status) => status === 401 || status === 200
        // Accept 401 (needs auth) or 200 (public) as "backend is alive"
      });

      console.log('[backendConfig] ✓ Backend detected:', url);
      sessionStorage.setItem(CACHE_KEY, url);
      return url;
    } catch (error) {
      console.log('[backendConfig] ✗ Failed:', url, error.message);
      // Try next candidate
    }
  }

  // Neither port responded
  throw new Error('Backend not reachable on http://localhost:5000 or https://localhost:5001');
}

/**
 * Clear cached backend URL (useful for debugging/testing)
 */
export function clearBackendCache() {
  sessionStorage.removeItem(CACHE_KEY);
  console.log('[backendConfig] Cache cleared');
}
