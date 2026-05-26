import { test, expect } from '@playwright/test';

// phase4-fix-11: StudentDetailPage contact info now uses Email + Phone fields
// instead of a raw JSON textarea. Phone must be 10 digits; email must be valid format.

test.skip('fix-11: student detail edit shows Email and Phone fields (not JSON textarea)', async ({ page }) => {
  // When Phase 7 E2E is set up:
  // 1. Login as Registrar
  // 2. Navigate to /students/1, click Edit
  // 3. Verify no textarea with JSON placeholder exists
  // 4. Verify Email (type=email) and Phone (pattern=[0-9]{10}) inputs exist
  expect(true).toBe(true);
});

test.skip('fix-11: phone validation blocks invalid input', async ({ page }) => {
  // Enter "123" in Phone, attempt save, expect inline error
  expect(true).toBe(true);
});
