# Phase 3 — Form Sweep Report

## Summary

- Forms audited: 11
- All-pass: 8
- Issues found: 6 (Critical: 0, Medium: 3, Low: 3)

---

## Matrix legend

| Column | Meaning |
|--------|---------|
| Required | Empty-submit blocked (HTML `required` + JS guard) |
| Type | Input type or pattern validation (email, number, etc.) |
| Min/Max | Length or range constraints |
| Date | Date validation (age check, range, past-date guard) |
| Loading | Submit button disabled during POST (spinner shown) |
| Error | API failure shown via ErrorAlert or inline alert |
| Success | Post-submit feedback (alert, redirect, or state change) |
| Labels | All fields have visible `<label>` elements |
| PwdStrength | Password strength rules / confirm-match indicator |
| CSRF | JWT app — N/A for all forms |
| XSS | User content rendered safely (no `dangerouslySetInnerHTML`) |
| NoURL | Sensitive data not passed as URL query param |
| Cancel | Cancel / reset path available |
| Mobile | Bootstrap `row g-3` layout (inherently responsive) |

Pass = PASS, Fail = FAIL, N/A = not applicable

---

## Form Results

| Form | File | Required | Type | Min/Max | Date | Loading | Error | Success | Labels | PwdStrength | CSRF | XSS | NoURL | Cancel | Mobile |
|------|------|----------|------|---------|------|---------|-------|---------|--------|-------------|------|-----|-------|--------|--------|
| Login | LoginPage.jsx | PASS | PASS | PASS | N/A | PASS | PASS | PASS (redirect) | PASS | N/A | N/A | PASS | PASS | PASS | PASS |
| Forgot Password | ForgotPasswordPage.jsx | PASS | PASS (email type) | N/A | N/A | PASS | PASS | PASS (alert) | PASS | N/A | N/A | PASS | PASS | PASS | PASS |
| Reset Password | ResetPasswordPage.jsx | PASS | PASS | PASS (minLength=8) | N/A | PASS | PASS | PASS (alert) | PASS | PASS (match indicator) | N/A | PASS | PASS | PASS (back link) | PASS |
| New Student | NewStudentPage.jsx | PASS | PASS (email, text) | PASS (maxLength=15 phone) | PASS (age ≥15, max DOB) | PASS | PASS | PASS (redirect) | PASS | N/A | N/A | PASS | PASS (DOB via URL — see F-1) | PASS | PASS |
| Student Detail (edit) | StudentDetailPage.jsx | PASS | FAIL (contactInfoJSON raw textarea) | FAIL (no length limit on contactInfoJSON) | N/A (DOB not editable) | PASS | PASS | PASS (reload) | PASS | N/A | N/A | FAIL (JSON string could contain XSS-like content stored unescaped) | PASS | PASS | PASS |
| Course Form | CourseFormPage.jsx | PASS | PASS | PASS (maxLength 20/200, credits 1–12) | N/A | PASS | PASS | PASS (alert + redirect) | PASS | N/A | N/A | PASS | PASS | PASS | PASS |
| Program Form | ProgramFormPage.jsx | PASS | PASS | PASS (maxLength 200, durationTerms 1–20) | N/A | PASS | PASS | PASS (alert + redirect) | PASS | N/A | N/A | PASS | PASS | PASS | PASS |
| Assessment Form | AssessmentFormPage.jsx | PASS | PASS | PASS (maxLength 200, maxScore 0.1–9999.9) | PASS (future-only dueAt on new) | PASS | PASS | PASS (alert + redirect) | PASS | N/A | N/A | PASS | PASS | PASS | PASS |
| Invoices — Generate modal | InvoicesPage.jsx | PASS | PASS (number studentID) | PASS (min=1 studentID) | PASS (min=today dueDate) | PASS | PASS | PASS (alert) | PASS | N/A | N/A | PASS | PASS | PASS | PASS |
| Fees — Create/Edit modal | FeesPage.jsx | PASS | PASS (date, number amounts) | PASS (min=0.01 per item) | PASS (effectiveFrom < effectiveTo cross-check) | PASS | PASS | PASS (alert) | PASS | N/A | N/A | PASS | PASS | PASS | PASS |
| Payments — Record Payment modal | PaymentsPage.jsx | PASS | PASS | PASS (min 0.01, max=balance) | N/A | PASS | PASS | PASS (alert) | PASS | N/A | N/A | PASS | PASS | PASS | PASS |
| Users — Create modal | UsersPage.jsx | PASS | PASS (email type, text) | PASS (maxLength 100/200/255, minLength 8 pwd) | N/A | PASS | PASS | PASS (alert) | PASS | PASS (confirm-match indicator) | N/A | PASS | PASS | PASS | PASS |

---

## Issues requiring fixes

### F-1 (Low) — NewStudentPage: DOB and name passed as URL query params

**File:** `edulearn.client/src/pages/students/NewStudentPage.jsx:18-20`

```js
const fromApplicantName = searchParams.get('name') || '';
const fromApplicantDob  = searchParams.get('dob')  || '';
```

When creating a student from an accepted applicant, the applicant's name and date-of-birth appear in the browser URL (`/students/new?name=John+Doe&dob=2000-01-15&applicantID=3`). DOB is PII and should not be in the URL (visible in browser history, server logs, referrer headers).

**Severity:** Low  
**Fix hint:** Pass only the applicantID in the URL; fetch the applicant record server-side in `loadDropdowns()` using that ID to pre-fill name and DOB.

---

### F-2 (Medium) — StudentDetailPage: contactInfoJSON raw textarea — no structured validation

**File:** `edulearn.client/src/pages/students/StudentDetailPage.jsx:170-179`

The edit form exposes a raw `contactInfoJSON` textarea. There is no JSON parse validation before saving; an invalid or malicious JSON string is sent directly to the API. If the API stores it and another page later renders parsed fields, this is a latent injection risk.

**Severity:** Medium  
**Fix hint:** Replace the raw textarea with individual Email and Phone fields (mirror NewStudentPage.jsx). Build `contactInfoJSON` in the submit handler. Validate email format and phone 10-digit constraint before calling `studentService.update()`.

---

### F-3 (Low) — StudentDetailPage: no min-length on Name field in edit mode

**File:** `edulearn.client/src/pages/students/StudentDetailPage.jsx:147-155`

The Name `<input>` has `required` but no `maxLength` or `minLength`. A single character or excessively long string can be submitted.

**Severity:** Low  
**Fix hint:** Add `maxLength={200}` and `minLength={2}` to the Name input, consistent with NewStudentPage.jsx.

---

### F-4 (Medium) — InvoicesPage: Student role can manually enter any studentID in search

**File:** `edulearn.client/src/pages/finance/InvoicesPage.jsx:207-221`

When `role === 'Student'`, the page still renders a free-text `<input type="number">` for Student ID. A student can search any arbitrary studentID and see that student's invoices. The backend `GET /api/invoices/student/{studentId}` uses bare `[Authorize]` (Phase 2 finding, InvoicesController.cs:246), so the request will succeed.

**Severity:** Medium  
**Fix hint:** For `isStudent === true`, remove the search bar and auto-load the logged-in student's own invoices using `userId` from `authService.getCurrentUser()` on mount. This is a frontend mitigation; the backend RBAC fix is tracked separately.

---

### F-5 (Low) — FeesPage and InvoicesPage: term field is free-text with no format hint enforcement

**Files:** `FeesPage.jsx:386`, `InvoicesPage.jsx:450,528`

Term inputs accept any string. There is a placeholder "e.g. 2026-Spring" but no pattern attribute or client-side regex to enforce `YYYY-Season` format. A typo (e.g. "2026 Spring" with a space) will create a term that never matches other records.

**Severity:** Low  
**Fix hint:** Add `pattern="^\d{4}-(Spring|Fall|Summer|Winter)$"` or use a controlled `<select>` with the valid term values.

---

### F-6 (Medium) — UsersPage edit modal: Phone field has no validation

**File:** `edulearn.client/src/pages/users/UsersPage.jsx:644-653`

The Edit User modal's Phone field has only `maxLength={20}` — no 10-digit enforcement and no inline feedback. This is inconsistent with the Create User modal (line 462–478) which validates phone length. An admin could set a user's phone to an invalid value.

**Severity:** Medium  
**Fix hint:** Mirror the Create modal's phone validation: add `is-invalid` class and `invalid-feedback` message when the entered value is non-empty and `replace(/\D/g,'').length !== 10`. Also add the phone guard to `handleEdit()` before calling `userService.update()`.
