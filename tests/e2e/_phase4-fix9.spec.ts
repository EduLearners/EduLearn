import { test, expect } from '@playwright/test';

// phase4-fix-9: GET /api/sections/{id} and GET /api/sections/course/{courseId}/term/{term}
// are now restricted to RosterViewPolicy (Instructor, Registrar, DeptAdmin, ITAdmin).
// Student, Finance, Auditor roles should receive 403.
//
// NOTE: These tests require the full ASP.NET pipeline (integration tests).
// They are placeholder specs for Phase 7 when playwright.config.ts is configured.

test.skip('fix-9: section detail requires RosterViewPolicy — placeholder for Phase 7 E2E', async ({ page }) => {
  // When Phase 7 E2E is set up:
  // 1. Login as Student role
  // 2. Call GET /api/sections/1 directly
  // 3. Expect 403 Forbidden
  expect(true).toBe(true);
});

test.skip('fix-9: section by course+term requires RosterViewPolicy — placeholder for Phase 7 E2E', async ({ page }) => {
  expect(true).toBe(true);
});
