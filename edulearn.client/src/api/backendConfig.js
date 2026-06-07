import axios from 'axios';

const CACHE_KEY = 'edulearn_backend_url';

/**
 * Auto-detect which backend port is running (5001 HTTPS first, then 5000 HTTP)
 * Tries both URLs in order, returns the first one that responds
 * Caches result in sessionStorage for fast subsequent loads
 * @returns {Promise<string>} Backend URL (e.g., 'https://localhost:5001')
 * @throws {Error} If neither backend port responds
 */
export async function detectBackend() {
  // Check cache first for instant load on refresh
  const cached = sessionStorage.getItem(CACHE_KEY);
  if (cached) {
    console.log('[backendConfig] Using cached backend:', cached);
    return cached;
  }

  // Try HTTPS first (matches vite.config.js proxy target), then HTTP fallback
  const candidates = [
    'https://localhost:5001',
    'http://localhost:5000',
  ];

  for (const url of candidates) {
    try {
      console.log('[backendConfig] Trying:', url);

      await axios.get(`${url}/api/users`, {
        timeout: 2000,
        validateStatus: (status) => status === 401 || status === 200,
      });

      console.log('[backendConfig] ✓ Backend detected:', url);
      sessionStorage.setItem(CACHE_KEY, url);
      return url;
    } catch (error) {
      console.log('[backendConfig] ✗ Failed:', url, error.message);
    }
  }

  throw new Error(
    'Backend not reachable on https://localhost:5001 or http://localhost:5000. ' +
    'Please start the API with dotnet run.'
  );
}

/**
 * Clear cached backend URL (useful for debugging/testing)
 */
export function clearBackendCache() {
  sessionStorage.removeItem(CACHE_KEY);
  console.log('[backendConfig] Cache cleared');
}
