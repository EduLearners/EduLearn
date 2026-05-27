# Form Validation — Design Spec
**Date:** 2026-05-27  
**Branch:** formValidation/Ashish  
**Scope:** Frontend only (React / Vite). No new npm dependencies.

---

## Problem
Every form and many non-form input fields across the EduLearn client accept invalid data — negative IDs, symbols in phone numbers, whitespace-only required fields, malformed JSON, bare text where a URL is expected, invalid term formats, etc.

---

## Decisions
| Question | Decision |
|---|---|
| Error style | Inline `invalid-feedback` beneath each field, shown on blur; re-validated live once touched |
| Implementation | Custom `src/utils/validators.js` — pure functions, zero new dependencies |
| Scope | Frontend only; backend 400 responses remain the safety net |

---

## Architecture

### New file
`edulearn.client/src/utils/validators.js` — all pure validator functions.

### Pattern applied to every form
```jsx
const [errors, setErrors] = useState({});

// onBlur — first touch triggers the message
const blurField = (field, fn) => (e) =>
  setErrors(prev => ({ ...prev, [field]: fn(e.target.value) }));

// onChange — re-validate once field has been touched
const changeField = (field, value, fn) => {
  setForm(prev => ({ ...prev, [field]: value }));
  if (field in errors)
    setErrors(prev => ({ ...prev, [field]: fn(value) }));
};

// submit guard
const next = { field1: validate1(form.field1), field2: validate2(form.field2) };
if (hasErrors(next)) { setErrors(next); return; }
```

```jsx
<input
  className={`form-control${errors.field ? ' is-invalid' : ''}`}
  onBlur={blurField('field', validateFn)}
/>
{errors.field && <div className="invalid-feedback">{errors.field}</div>}
```

---

## Validator Rule Set

| Function | Rules |
|---|---|
| `validatePhone` | Optional. Exactly 10 consecutive digits. Rejects: `-9876543210`, `+91-98765`, spaces, brackets, dots. |
| `validatePhoneRequired` | Same + rejects empty. |
| `validateEmail` | Required. Trims + lowercases. Regex `[local]@[domain].[tld≥2]`. Rejects: double-dots, starts/ends with dot, `@.`. |
| `validateUsername` | Required. 3–50 chars. `[a-zA-Z0-9._-]` only. Must start alphanumeric. No consecutive specials. Cannot end with `.` `_` `-`. |
| `validatePassword` | Required. ≥8 chars. ≥1 letter. ≥1 digit. No leading/trailing spaces. |
| `validateUrl` | Required. Must begin `http://` or `https://`. No spaces. Valid `new URL()`. |
| `validateOptionalUrl` | Same but null when empty. |
| `validateTerm` | Required. `YYYY-Season`, year 2000–2039, season ∈ {Spring,Summer,Fall,Winter}. |
| `validateCourseCode` | Required. 2–6 letters + 2–6 digits (normalised uppercase). |
| `validateJson` | Optional. If non-empty: valid JSON object or array (not bare string/number). |
| `validatePositiveId` | Required. Pure digits `/^\d+$/`, integer ≥ 1. Rejects: `-5`, `1.5`, `3e2`, symbols. |
| `validateOptionalPositiveId` | Same but null when empty. |
| `validatePositiveInteger(v,min,max,label)` | Pure digits, configurable range. Used for capacity / computers / program terms. |
| `validateAmount(v,min,max)` | Number, ≥0.01, ≤9 999 999 by default. |
| `validateScore(v,maxScore)` | Number ≥0 and ≤maxScore. |
| `validateName(v,label)` | 2–200 Unicode letters + spaces + `'-. `. Not purely numeric. No symbols. |
| `validateMinLength(v,n,label)` | Trimmed length ≥ n. |
| `validateNotWhitespace(v,label)` | Trimmed non-empty — blocks space-only bypass of HTML `required`. |
| `validateDateRange(from,to)` | `to > from` strictly. |
| `validateFutureDate(v)` | Date not in the past. |
| `validateVersion(v)` | `v?major.minor(.patch)?` |
| `validateAddress(v)` | 5–500 chars trimmed. |
| `validateNationalId(v)` | 4–50 chars, `[a-zA-Z0-9-]` only. |
| `validateAwardType(v)` | 3–100 chars, `[a-zA-Z0-9 -]` only. |
| `validateTotpCode(v)` | Exactly 6 digits. |
| `hasErrors(obj)` | Submit guard helper — true if any value is truthy. |

---

## Field-to-Validator Mapping (abbreviated)

| Page | Field | Validator |
|---|---|---|
| LoginPage | usernameOrEmail, password | `validateNotWhitespace` |
| ForgotPasswordPage | email | `validateEmail` |
| ResetPasswordPage | password | `validatePassword` |
| MfaVerifyPage | code | `validateTotpCode` |
| UsersPage (create) | username, fullName, email, phone, password | `validateUsername`, `validateName`, `validateEmail`, `validatePhone`, `validatePassword` |
| UsersPage (edit) | fullName, email, phone | `validateName`, `validateEmail`, `validatePhone` |
| NewStudentPage | fullName, email, entryTerm, expectedGraduationTerm | `validateName`, `validateEmail`, `validateTerm` × 2 |
| StudentDetailPage | fullName, expectedGraduationTerm, contactInfoJSON | `validateName`, `validateTerm`, `validateJson` |
| NewApplicantPage | fullName, email, address, nationalId | `validateName`, `validateEmail`, `validateAddress`, `validateNationalId` |
| CourseFormPage | courseCode, title, prerequisitesJSON | `validateCourseCode`, `validateMinLength(2)`, `validateJson` |
| ProgramFormPage | name, durationTerms, departmentId | `validateMinLength(2)`, `validatePositiveInteger(1,20)`, `validateOptionalPositiveId` |
| RoomsPage | building, roomNumber, capacity, computers | `validateMinLength(2)`, `validateMinLength(1)`, `validatePositiveInteger(1,1000)`, `validatePositiveInteger(0,500)` |
| SectionsPage | term, capacity | `validateTerm`, `validatePositiveInteger(1,500)` |
| EnrollmentPage | term, studentId | `validateTerm`, `validatePositiveId` |
| AssessmentFormPage | title, maxScore, dueDate, gradingRubricJSON, courseId | `validateMinLength(2)`, `validateAmount(1,9999)`, `validateFutureDate`, `validateJson`, `validatePositiveId` |
| ContentFormPage | title, uri, metadataJSON | `validateMinLength(2)`, `validateUrl`, `validateJson` |
| FeesPage | term, itemName, amount | `validateTerm`, `validateMinLength(2)`, `validateAmount` |
| InvoicesPage | studentId, term | `validatePositiveId`, `validateTerm` |
| ScholarshipsPage | awardType, amount, studentId, validFrom+validTo | `validateAwardType`, `validateAmount`, `validateOptionalPositiveId`, `validateDateRange` |
| SyllabiPage | version, syllabusUri, learningOutcomesJSON, assessmentPlanJSON | `validateVersion`, `validateUrl`, `validateJson` × 2 |
| DiscussionsPage | threadTitle, replyText | `validateMinLength(2)`, `validateMinLength(1)` |
| TicketsPage | subject, description, resolutionUri, assignedToUserId | `validateMinLength(3)`, `validateMinLength(10)`, `validateOptionalUrl`, `validateOptionalPositiveId` |
| GradeChangesPage | newScore, reason (admin), auditNote | `validateScore`, `validateMinLength(3)`, `validateMinLength(3)` |
| ReportsPage | parametersJSON | `validateJson` |
| AuditLogPage | userId, resourceId (filter) | `validateOptionalPositiveId` (warn-only, don't block search) |
| PlagiarismPage | flagForm.submissionID | `validatePositiveId` |

---

## Constraints
- Do **not** restructure any form's existing state shape or submit handler logic
- Only ADD: error state, blur/change hooks, `invalid-feedback` divs
- Preserve all existing `ErrorAlert`, loading, and success toast patterns unchanged
