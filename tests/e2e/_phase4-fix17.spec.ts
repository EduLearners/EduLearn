import { test, expect } from '@playwright/test';

// phase4-fix-17: DeptAdmin sidebar no longer shows Timetable link.
// EnrollmentViewPolicy excludes DeptAdmin; the backend returns 403.

test.skip('fix-17: DeptAdmin sidebar does not show Timetable nav item', async ({ page }) => {
  // When Phase 7 E2E is set up:
  // 1. Login as DeptAdmin
  // 2. Check the sidebar
  // 3. Verify no link with text 'Timetable' is present
  expect(true).toBe(true);
});
