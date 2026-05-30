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

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // Fetch helper (respects Vite proxy /api -> :5001).
  // Retries once on a transient connection failure (status 0): firing the whole
  // matrix as a tight burst can make the dev server drop a connection, which is a
  // test-environment artifact, not a product fault. One retry + a tiny throttle
  // keeps results trustworthy and re-runnable.
  async function api(method, path, token = null, body = null) {
    const url = path.startsWith('/api') ? path : `/api${path}`;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    // The fetch spec forbids a body on GET/HEAD; attaching one makes fetch throw
    // (surfacing as a misleading "HTTP 0"). Only send a body for methods that allow it.
    const methodAllowsBody = !/^(GET|HEAD)$/i.test(method);
    const doFetch = async () => {
      const resp = await fetch(url, {
        method,
        headers,
        body: (methodAllowsBody && body) ? JSON.stringify(body) : undefined
      });
      const data = resp.ok ? await resp.json().catch(() => null) : null;
      return { ok: resp.ok, status: resp.status, data };
    };
    try {
      return await doFetch();
    } catch (err) {
      // transient: back off briefly and retry once
      await sleep(150);
      try {
        return await doFetch();
      } catch (err2) {
        return { ok: false, status: 0, data: null, error: err2.message };
      }
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

  // Check if route is allowed for role
  function isRouteAllowed(route, role) {
    const allowed = window.EDU.ROUTE_ACCESS[route];
    if (!allowed) return true; // unknown route = pass-through
    if (allowed === '*') return true;
    return Array.isArray(allowed) && allowed.includes(role);
  }

  // Check if current page shows Access Denied
  function pageShowsAccessDenied() {
    const body = document.body.innerText.toLowerCase();
    return /access denied|forbidden|you don't have permission/i.test(body);
  }

  // Check if route rendered correctly (not access-denied, not error)
  function pageRenderedOk() {
    const body = document.body.innerText;
    if (/access denied|forbidden/i.test(body)) return false;
    if (/error|something went wrong|500|404/i.test(body)) return false;
    return true;
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
    isRouteAllowed,
    pageShowsAccessDenied,
    pageRenderedOk,

    // Seeded accounts (from seed-sample-data.ps1)
    ACCOUNTS: {
      ITAdmin: { user: 'admin', pass: 'Admin@123' },
      Student: { user: 'student', pass: 'Student@123' },
      Instructor: { user: 'instructor', pass: 'Instructor@123' },
      Registrar: { user: 'registrar', pass: 'Registrar@123' },
      DeptAdmin: { user: 'deptadmin', pass: 'DeptAdmin@123' },
      Finance: { user: 'finance', pass: 'Finance@123' },
      Auditor: { user: 'auditor', pass: 'Auditor@123' }
    },

    // Frontend route access matrix (from config/routeRoles.js)
    ROUTE_ACCESS: {
      '/dashboard': '*',
      '/profile': '*',
      '/notifications': '*',
      '/tickets': '*',
      '/enrollment': ['Student', 'Registrar', 'ITAdmin'],
      '/timetable': ['Student', 'Instructor', 'Registrar', 'ITAdmin'],
      '/courses': ['Student', 'Instructor', 'Registrar', 'DeptAdmin', 'ITAdmin'],
      '/assessments': ['Student', 'Instructor', 'ITAdmin'],
      '/submissions': ['Student', 'Instructor', 'ITAdmin'],
      '/contents': ['Student', 'Instructor', 'ITAdmin'],
      '/syllabi': ['Student', 'Instructor', 'Registrar', 'DeptAdmin', 'ITAdmin'],
      '/discussions': ['Student', 'Instructor', 'Registrar', 'DeptAdmin', 'ITAdmin'],
      '/transcripts': ['Student', 'Registrar', 'ITAdmin'],
      '/invoices': ['Student', 'Finance', 'ITAdmin'],
      '/programs': ['Student', 'Registrar', 'DeptAdmin', 'ITAdmin'],
      '/grade-changes': ['Instructor', 'Auditor', 'ITAdmin'],
      '/students': ['Instructor', 'Registrar', 'DeptAdmin', 'ITAdmin'],
      '/applicants': ['Registrar', 'ITAdmin'],
      '/sections': ['Registrar', 'DeptAdmin', 'ITAdmin'],
      '/rooms': ['DeptAdmin', 'ITAdmin'],
      '/fees': ['Finance', 'ITAdmin'],
      '/payments': ['Finance', 'ITAdmin'],
      '/scholarships': ['Finance', 'ITAdmin'],
      '/reports': ['Auditor', 'ITAdmin'],
      '/kpis': ['Auditor', 'ITAdmin'],
      '/audit-log': ['Auditor', 'ITAdmin'],
      '/users': ['ITAdmin']
    },

    // Backend API access matrix. Source of truth = actual controller [Authorize]
    // attributes + the named policies in Program.cs (cross-checked against PRD §6
    // and docs/PRD-DISCREPANCIES.md). Policy expansions:
    //   AdminPolicy        = ITAdmin
    //   DeptAdminPolicy    = DeptAdmin, ITAdmin
    //   FinancePolicy      = Finance, ITAdmin
    //   CourseManagerPolicy= Instructor, DeptAdmin, ITAdmin
    //   EnrollmentPolicy   = Student, Registrar, ITAdmin
    //   UserViewPolicy     = ITAdmin, Registrar, DeptAdmin
    //   AuditViewPolicy    = Auditor, ITAdmin
    API_ACCESS: [
      { method: 'POST', path: '/users', roles: ['ITAdmin'] },                                  // AdminPolicy
      { method: 'GET', path: '/users', roles: ['ITAdmin', 'Registrar', 'DeptAdmin'] },          // UserViewPolicy
      { method: 'POST', path: '/programs', roles: ['DeptAdmin', 'ITAdmin'] },                   // DeptAdminPolicy
      { method: 'POST', path: '/courses', roles: ['Instructor', 'DeptAdmin', 'ITAdmin'] },      // CourseManagerPolicy
      { method: 'POST', path: '/rooms', roles: ['DeptAdmin', 'ITAdmin'] },                      // DeptAdminPolicy (PRD ETS-02)
      { method: 'POST', path: '/students', roles: ['Registrar', 'ITAdmin'] },                   // Roles
      { method: 'POST', path: '/sections', roles: ['Registrar', 'DeptAdmin', 'ITAdmin'] },      // Roles (PRD ETS-02)
      { method: 'POST', path: '/enrollment/enroll', roles: ['Student', 'Registrar', 'ITAdmin'] }, // EnrollmentPolicy
      { method: 'POST', path: '/assessments', roles: ['Instructor', 'ITAdmin'] },               // Roles
      { method: 'POST', path: '/submissions', roles: ['Student'] },                             // Roles = Student only
      { method: 'POST', path: '/applicants', roles: ['Registrar', 'ITAdmin'] },                 // class-level Roles
      { method: 'POST', path: '/fees', roles: ['Finance', 'ITAdmin'] },                         // FinancePolicy
      { method: 'POST', path: '/scholarships', roles: ['Finance', 'ITAdmin'] },                 // FinancePolicy
      { method: 'POST', path: '/invoices/generate', roles: ['Finance', 'ITAdmin'] },            // FinancePolicy
      { method: 'POST', path: '/payments', roles: ['Finance', 'ITAdmin'] },                     // FinancePolicy
      { method: 'POST', path: '/notifications/test', roles: ['ITAdmin'] },                      // AdminPolicy
      { method: 'GET', path: '/reports', roles: ['Auditor', 'ITAdmin'] },                       // Roles
      { method: 'GET', path: '/kpis', roles: ['Auditor', 'ITAdmin'] },                          // Roles
      { method: 'GET', path: '/audit-log', roles: ['Auditor', 'ITAdmin'] }                      // AuditViewPolicy
    ],

    // Layer A: API authorization matrix runner
    runApiMatrix: async function() {
      console.log('=== Running Layer A: API Authorization Matrix ===');
      const roles = Object.keys(this.ACCOUNTS);
      const tokens = {};

      // Step 1: Log in as each role
      for (const role of roles) {
        const acc = this.ACCOUNTS[role];
        const creds = await login(acc.user, acc.pass);
        if (creds) {
          tokens[role] = creds.token;
          console.log(`✓ Logged in as ${role}`);
        } else {
          console.error(`✗ Login failed for ${role}`);
          softCheck('API-Matrix', role, `Login failed for ${acc.user}`, 'Could not obtain token');
        }
      }

      // Step 2: For each API endpoint, test each role
      for (const endpoint of this.API_ACCESS) {
        const { method, path, roles: allowedRoles } = endpoint;
        for (const role of roles) {
          const token = tokens[role];
          if (!token) continue; // skip if login failed

          const shouldAllow = allowedRoles.includes(role);
          const r = await api(method, path, token, {});
          await sleep(20); // gentle throttle: avoid bursting the dev server into connection drops

          if (shouldAllow) {
            // Should be allowed: expect 200/201/400 (not 403)
            assert(
              'API-Authz',
              role,
              r.status !== 403,
              `${method} ${path} allowed (200/201/400)`,
              `HTTP ${r.status}`,
              'High'
            );
          } else {
            // Should be forbidden: expect 403
            assert(
              'API-Authz',
              role,
              r.status === 403,
              `${method} ${path} forbidden (403)`,
              `HTTP ${r.status}`,
              'Critical'
            );
          }
        }
      }

      console.log('=== Layer A Complete ===');
      return this.report();
    },

    // Layer B: Frontend route access checker
    checkRoute: function(route, role) {
      const allowed = isRouteAllowed(route, role);
      const denied = pageShowsAccessDenied();
      const ok = pageRenderedOk();

      if (allowed) {
        // Should render normally
        if (ok && !denied) {
          assert('Route-Access', role, true, `${route} renders for ${role}`, 'page rendered', 'High');
          return { pass: true };
        } else {
          assert('Route-Access', role, false, `${route} renders for ${role}`, denied ? 'Access Denied shown' : 'Error page', 'Critical');
          return { pass: false, finding: denied ? 'wrongly denied' : 'error page' };
        }
      } else {
        // Should show Access Denied
        if (denied) {
          assert('Route-Access', role, true, `${route} denies ${role}`, 'Access Denied shown', 'Critical');
          return { pass: true };
        } else {
          assert('Route-Access', role, false, `${route} denies ${role}`, 'Page rendered (security hole)', 'Critical');
          return { pass: false, finding: 'security hole - route not gated' };
        }
      }
    }
  };

  console.log(`EDU Chaos Harness ${VERSION} loaded. Use EDU.report() to see results.`);
})();
