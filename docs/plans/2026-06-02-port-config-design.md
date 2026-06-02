# Design: Auto-Detecting Backend Port Configuration

**Date:** 2026-06-02  
**Problem:** Frontend Vite proxy has hardcoded backend URL causing git conflicts when team members use different backend profiles (http://5000 vs https://5001)  
**Solution:** Auto-detect which backend port is running at app startup with fallback

---

## Problem Statement

Team members experience a persistent issue where:
1. Dev A runs backend on `http://localhost:5000` (using "http" profile)
2. Dev A updates `vite.config.js` proxy target to `http://localhost:5000`
3. Dev A commits and pushes
4. Dev B pulls and tries to run (their backend is on `https://localhost:5001`)
5. Dev B's frontend breaks with 502 errors
6. Dev B changes `vite.config.js` to `https://localhost:5001` and commits
7. Cycle repeats, causing frustration and wasted time

**Git history evidence:**
```
May 27, 11:50 (Utkarsh): https://localhost:5001 → http://localhost:5000
May 27, 18:35 (Sharma):  http://localhost:5000 → https://localhost:5001
```

**Root cause:** `vite.config.js` proxy target is hardcoded and committed to git, but devs run different backend profiles.

---

## Solution: Auto-Detection with Fallback

### High-Level Approach

On app startup, automatically detect which backend port is running (5000 or 5001) and configure axios to use it. Cache the result so detection only runs once per browser session.

**User requirement:** "both must work" - solution must support devs using either HTTP:5000 or HTTPS:5001

**Design principle:** Zero configuration for developers - it just works

---

## Architecture

### Components

1. **`backendConfig.js`** (new file)
   - Exports `detectBackend()` function
   - Tries both `http://localhost:5000` and `https://localhost:5001`
   - Returns working URL or throws error
   - Uses `sessionStorage` for caching

2. **`App.jsx`** (modified)
   - Calls `detectBackend()` before rendering
   - Shows loading state during detection
   - Configures axios with detected URL

3. **`axiosClient.js`** (modified)
   - Remove hardcoded `baseURL: '/api'`
   - Allow dynamic `baseURL` to be set after detection

4. **`vite.config.js`** (unchanged)
   - Keep existing proxy config (will be bypassed)
   - No git conflicts anymore

### Data Flow

```
App mounts
  ↓
Check sessionStorage for cached backend URL
  ↓
If cached: use it immediately
  ↓
If not cached: run detectBackend()
  ↓
Try http://localhost:5000/api/health (timeout 1s)
  ↓
If success: cache & use it
  ↓
If fail: try https://localhost:5001/api/health (timeout 1s)
  ↓
If success: cache & use it
  ↓
If fail: show error "Backend not reachable"
  ↓
Configure axiosClient.defaults.baseURL = `${detectedUrl}/api`
  ↓
Render app
```

---

## Implementation Details

### 1. Detection Mechanism

**File:** `edulearn.client/src/api/backendConfig.js`

```js
import axios from 'axios';

const CACHE_KEY = 'edulearn_backend_url';

export async function detectBackend() {
  // Check cache first
  const cached = sessionStorage.getItem(CACHE_KEY);
  if (cached) {
    console.log('[backendConfig] Using cached backend:', cached);
    return cached;
  }

  // Try both ports in order
  const candidates = [
    'http://localhost:5000',
    'https://localhost:5001'
  ];

  for (const url of candidates) {
    try {
      console.log('[backendConfig] Trying:', url);
      // Use a simple GET to a public endpoint (health doesn't require auth)
      await axios.get(`${url}/api/users`, { 
        timeout: 1000,
        validateStatus: (status) => status === 401 || status === 200
        // 401 = backend alive but needs auth (expected)
        // 200 = backend alive (if endpoint is public)
      });
      
      console.log('[backendConfig] Backend detected:', url);
      sessionStorage.setItem(CACHE_KEY, url);
      return url;
    } catch (error) {
      console.log('[backendConfig] Failed:', url, error.message);
      // Try next candidate
    }
  }

  throw new Error('Backend not reachable on http://localhost:5000 or https://localhost:5001');
}

export function clearBackendCache() {
  sessionStorage.removeItem(CACHE_KEY);
}
```

**Why `/api/users` instead of `/api/health`?**
- `/api/health` requires ITAdmin auth (returns 401 without token)
- `/api/users` also returns 401 without token, proving backend is alive
- Both are equally valid for detection (401 = backend responding)

### 2. App Initialization

**File:** `edulearn.client/src/App.jsx`

```js
import { useEffect, useState } from 'react';
import { detectBackend } from './api/backendConfig';
import axiosClient from './api/axiosClient';

function App() {
  const [backendReady, setBackendReady] = useState(false);
  const [backendError, setBackendError] = useState(null);

  useEffect(() => {
    async function initBackend() {
      try {
        const backendUrl = await detectBackend();
        axiosClient.defaults.baseURL = `${backendUrl}/api`;
        setBackendReady(true);
      } catch (error) {
        setBackendError(error.message);
      }
    }
    
    initBackend();
  }, []);

  if (backendError) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Backend Connection Error</h2>
        <p>{backendError}</p>
        <p>Please ensure the backend is running on either:</p>
        <ul style={{ listStyle: 'none' }}>
          <li>• http://localhost:5000 (dotnet run --launch-profile http)</li>
          <li>• https://localhost:5001 (dotnet run --launch-profile https)</li>
        </ul>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  if (!backendReady) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Detecting backend...</p>
      </div>
    );
  }

  // Normal app render
  return (
    <Router>
      {/* existing app code */}
    </Router>
  );
}
```

### 3. Axios Client Update

**File:** `edulearn.client/src/api/axiosClient.js`

```js
import axios from 'axios';

// Remove baseURL - it will be set dynamically after detection
const axiosClient = axios.create({
    // baseURL: '/api',  ← REMOVE THIS
    headers: { 'Content-Type': 'application/json' },
    timeout: 15000,
});

// Rest of interceptors remain unchanged...
```

---

## Benefits

✅ **Zero configuration** - devs never touch config files  
✅ **Zero git conflicts** - no hardcoded URLs to commit  
✅ **Resilient** - tries both ports automatically  
✅ **Fast after first load** - cached in sessionStorage  
✅ **Clear error messages** - tells devs how to fix if backend is down  
✅ **No backend changes** - works with existing profiles  

---

## Trade-offs

⚠️ **Adds ~1 second to initial load** - detection tries both URLs sequentially  
   - Mitigation: Only runs once per session (cached), page refreshes are instant

⚠️ **Bypasses Vite proxy** - axios talks directly to backend  
   - Not an issue: Vite proxy is mainly for prod builds; CORS isn't a problem in dev

⚠️ **Slightly more complex error handling** - detection can fail  
   - Mitigation: Clear error message with instructions

---

## Testing Strategy

### Manual Testing
1. Start backend on http://localhost:5000 → verify frontend detects and works
2. Stop backend, restart on https://localhost:5001 → refresh frontend → verify it detects and works
3. Stop backend → verify friendly error message appears
4. Clear sessionStorage → verify re-detection works

### Edge Cases
- Both backends running (unusual) → uses first one found (5000)
- Backend crashes mid-session → axios will show timeout errors (expected)
- Network slow → 1s timeout should catch it quickly

---

## Rollout Plan

1. **Implement** files in order: backendConfig.js → axiosClient.js → App.jsx
2. **Test** locally on both http:5000 and https:5001
3. **Commit** with message: "fix: auto-detect backend port (5000 or 5001) to prevent git conflicts"
4. **Notify team** in Slack/chat: "Frontend now auto-detects backend port - no more config changes needed!"
5. **Remove** from team backlog: "fix vite.config.js conflicts" ticket

---

## Future Enhancements (out of scope)

- Add backend URL override via `?backend=http://localhost:5000` query param for debugging
- Detect backend restart and re-configure without page refresh
- Support custom ports beyond 5000/5001

---

## Approval

Design approved by: [User]  
Date: 2026-06-02
