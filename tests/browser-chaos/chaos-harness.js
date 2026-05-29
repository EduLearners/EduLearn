// ============================================================
// EduLearn Browser Chaos-Test Harness - Wave 1
// No dependencies; runs in browser console or via Claude preview_eval
// ============================================================

(function() {
  'use strict';

  const VERSION = 'Wave1-2026-05-29';
  const API_BASE = 'https://localhost:5001/api';

  // Results storage
  let results = [];
  let nextId = 1;

  // Core assertion
  function assert(area, role, condition, expected, actual, severity = 'High') {
    const id = `W1-${nextId++}`;
    const status = condition ? 'pass' : 'fail';
    const pct = severity === 'Critical' ? 95 : severity === 'High' ? 75 : severity === 'Medium' ? 50 : 25;
    results.push({ id, area, role, expected, actual, status, severity: `${severity} ${pct}%`, layer: 'backend' });
    return status === 'pass';
  }

  // Soft check (anomaly, not failure)
  function softCheck(area, role, finding, evidence) {
    const id = `W1-${nextId++}`;
    results.push({ id, area, role, finding, evidence, status: 'anomaly', severity: 'Low 20%', layer: 'frontend' });
  }

  // Fetch helper (respects Vite proxy /api -> :5001)
  async function api(method, path, token = null, body = null) {
    const url = path.startsWith('/api') ? path : `/api${path}`;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    try {
      const resp = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
      });
      const data = resp.ok ? await resp.json().catch(() => null) : null;
      return { ok: resp.ok, status: resp.status, data };
    } catch (err) {
      return { ok: false, status: 0, data: null, error: err.message };
    }
  }

  // Login helper
  async function login(username, password) {
    const r = await api('POST', '/auth/login', null, { usernameOrEmail: username, password });
    if (r.ok && r.data && r.data.token) {
      return { token: r.data.token, role: r.data.role, username: r.data.username || username };
    }
    return null;
  }

  // Session helper (mirrors authService.saveSession)
  function setSession(token, role, username) {
    localStorage.setItem('jwt', token);
    localStorage.setItem('role', role);
    localStorage.setItem('username', username);
  }

  // Report generator
  function report() {
    const summary = {
      total: results.length,
      pass: results.filter(r => r.status === 'pass').length,
      fail: results.filter(r => r.status === 'fail').length,
      anomaly: results.filter(r => r.status === 'anomaly').length
    };
    console.log(`=== EDU Chaos Harness ${VERSION} ===`);
    console.log(`Pass: ${summary.pass} | Fail: ${summary.fail} | Anomaly: ${summary.anomaly} | Total: ${summary.total}`);
    console.table(results);
    localStorage.setItem('EDU_RESULTS', JSON.stringify({ version: VERSION, timestamp: new Date().toISOString(), summary, results }));
    return { summary, results };
  }

  // Clear results
  function reset() {
    results = [];
    nextId = 1;
    localStorage.removeItem('EDU_RESULTS');
  }

  // Expose public API
  window.EDU = {
    VERSION,
    assert,
    softCheck,
    api,
    login,
    setSession,
    report,
    reset,
    // Data + runners populated in later tasks
    ACCOUNTS: {},
    ROUTE_ACCESS: {},
    API_ACCESS: [],
    runApiMatrix: async () => { console.log('API matrix not yet implemented'); }
  };

  console.log(`EDU Chaos Harness ${VERSION} loaded. Use EDU.report() to see results.`);
})();
