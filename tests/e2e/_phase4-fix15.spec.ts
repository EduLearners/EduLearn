import { test, expect } from '@playwright/test';

// phase4-fix-15: useBlocker for unsaved-changes navigation warning.
// DEFERRED — useBlocker is not exported from react-router-dom@7.15.0 in this installation.
// Verify with: grep -r "useBlocker" node_modules/react-router-dom/dist/index.d.ts
// Implement when RRDv7 API is confirmed available (or after upgrade).
// Pages affected: NewStudentPage, CourseFormPage, ProgramFormPage, AssessmentFormPage.

test.skip('fix-15: unsaved-changes blocker — deferred (useBlocker not available in installed rrd@7.15.0)', async () => {
  expect(true).toBe(true);
});
