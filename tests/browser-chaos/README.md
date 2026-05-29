# Browser Chaos-Test Harness

Dependency-free browser testing for EduLearn. Runs via Claude's browser or paste into DevTools console.

## Wave 1: Auth + Role-Access Matrix

Tests:
- Backend API authorization (7 roles × all endpoints)
- Frontend route-access (7 roles × all routes)
- Auth chaos: back/forward, bfcache, logout
- Phase 1 re-verification: case-sensitive login, error presentation, forms

## Usage (Claude browser)

Claude loads `chaos-harness.js` via preview_eval, calls:
```js
await EDU.runApiMatrix();      // Layer A (backend)
EDU.report();                  // see results
```

Then navigates + checks routes per role (Layer B).

## Usage (DevTools console)

1. Open app at http://localhost:5173
2. Paste `chaos-harness.js` into console
3. Run `await EDU.runApiMatrix(); EDU.report();`

Results in `localStorage['EDU_RESULTS']`.
