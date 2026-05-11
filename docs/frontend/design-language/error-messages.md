# Error Message Catalog — EduLearn Frontend

**Status:** Locked 2026-05-07 (created per critique P1 finding).
**Format:** every error follows the impeccable what/why/fix pattern.
**Voice:** direct, precise, not chummy. Never "Oops!" Never blame the user.
**Banned:** em dashes, exclamation marks on errors, generic "Something went wrong", HTTP status codes exposed to users.

---

## 1. Authentication & Session

| Trigger | Error message | Where it appears |
|---|---|---|
| Wrong username or password | "Username or password is incorrect. Try again, or [reset your password]." | Below the password field, `danger-500` + octagon icon |
| Account locked (too many attempts) | "Your account is locked after too many failed attempts. Contact your IT Admin to unlock it." | Below the password field |
| Account suspended | "Your account is suspended. Contact your registrar to resolve this." | Full-page alert replacing dashboard |
| MFA code wrong | "That code did not match. Check your authenticator app and try again." | Below the MFA code field |
| MFA code expired (TOTP window passed) | "That code has expired. Your authenticator app generates a new code every 30 seconds." | Below the MFA code field |
| Session expired (JWT timeout) | "Your session ended. Sign in to continue." | Toast (bottom-right), then redirect to /login |
| MFA setup: QR scan failed | "Could not load the QR code. Copy the key below and enter it manually in your authenticator app." | Below the QR image, reveal copy-key fallback |
| Registration: username taken | "That username is already taken. Try a different one." | Below the username field |
| Registration: email taken | "An account with that email already exists. [Sign in] or [reset your password]." | Below the email field |

---

## 2. Forms — General

| Trigger | Error message | Where it appears |
|---|---|---|
| Required field left empty | "[Field name] is required." | Below the field, on blur |
| Field too short | "[Field name] must be at least [N] characters." | Below the field, on blur |
| Field too long | "[Field name] must be [N] characters or fewer." | Below the field, on blur |
| Invalid email format | "Enter a valid email address. Example: name@domain.com" | Below the email field, on blur |
| Invalid date (before minimum) | "Date must be [constraint]. Example: [example date]." | Below the date field, on blur |
| Date range invalid (end before start) | "End date must be after the start date." | Below the end-date field, on blur |
| Number out of range | "[Field name] must be between [min] and [max]." | Below the number field, on blur |
| Duplicate unique value | "[Field name] already exists. Use a different value." | Below the field, on submit |

---

## 3. File Upload

| Trigger | Error message | Where it appears |
|---|---|---|
| File too large | "File is over [limit] MB. Compress it or ask your instructor for an exception." | Below the file input, on selection |
| Wrong file type | "Only [allowed types] files are accepted. You uploaded a [actual type]." | Below the file input, on selection |
| Upload failed (network) | "Upload failed. Check your connection and try again." | Below the file input, replaces progress bar |
| Upload failed (server) | "Upload failed. Try again. If this keeps happening, contact your IT Admin." | Below the file input |
| Virus / policy block | "This file was blocked by your institution's security policy. Upload a different file or contact IT." | Below the file input |
| No file selected on submit | "Select a file before submitting." | Below the file input, on submit |

---

## 4. Assessment & Submission

| Trigger | Error message | Where it appears |
|---|---|---|
| Submission after deadline (late flag) | "This was submitted after the deadline of [date, time]. It has been marked late." | Yellow warn banner at top of submission detail |
| Assessment already submitted | "You have already submitted this assessment. View your submission below." | Top of submission form |
| Assessment not yet published | "This assessment is not open yet. Check back after [publish date]." | Assessment detail page banner |
| Assessment closed | "This assessment is closed and no longer accepting submissions." | Assessment detail page banner |
| Grading a non-submitted submission | "This submission has not been turned in yet and cannot be graded." | Grading Offcanvas |
| Score out of range | "Score must be between 0 and [maxScore]." | Below the score field in grading panel |
| Plagiarism flag: already flagged | "A plagiarism report for this submission already exists. View the existing report." | On POST /api/plagiarism if duplicate |

---

## 5. Enrollment

| Trigger | Error message | Where it appears |
|---|---|---|
| Section at capacity | "This section is full. You have been added to the waitlist at position [N]." | Toast (warn), enrollment updates to Waitlisted |
| Already enrolled in section | "You are already enrolled in this section." | Below the enroll button |
| Enrollment conflict (schedule overlap) | "This section conflicts with [course code] section [N] at [time]. Resolve the conflict before enrolling." | Enrollment confirmation dialog |
| Drop deadline passed | "The drop deadline for this term was [date]. Contact your registrar to drop this course." | Section detail page, drop action disabled |
| Prerequisite not met | "You have not completed [course code], which is required before enrolling in this course." | Below the enroll button |

---

## 6. Finance (Invoices, Payments)

| Trigger | Error message | Where it appears |
|---|---|---|
| Payment processing failed | "Payment could not be processed. Check your payment details and try again. If the problem persists, contact the finance office." | Below the payment form |
| Invoice already paid | "This invoice has already been paid in full." | Invoice detail page (payment form hidden) |
| Invoice cancelled | "This invoice has been cancelled. Contact the finance office if you have questions." | Invoice detail page |
| Scholarship already applied | "A scholarship has already been applied to this student for this period." | Scholarship form |
| Fee schedule conflict | "A fee schedule for [program] and [term] already exists. Update the existing schedule or change the term." | Fee schedule form |

---

## 7. Administrative (Users, Applicants, Transcripts)

| Trigger | Error message | Where it appears |
|---|---|---|
| User not found | "No account found with that ID." | User detail page, ITAdmin only |
| Cannot delete user with active enrollments | "This user has active enrollments and cannot be deleted. Suspend the account instead." | User detail, delete action |
| Applicant already accepted | "This applicant has already been accepted. Status cannot be changed." | Applicant detail |
| Transcript already issued | "This transcript has been issued and is now read-only. To revoke, contact the registrar." | Transcript detail |
| Transcript: no course data | "No completed courses found for this student. Transcripts can only be generated after courses are graded." | Transcript generate form |
| MFA reset: user not enrolled in MFA | "This user has not set up MFA yet. No reset is needed." | User detail, ITAdmin MFA reset |

---

## 8. System / Network

| Trigger | Error message | Where it appears |
|---|---|---|
| API unavailable (500) | "We could not complete this action. Try again. If this keeps happening, contact your IT Admin." | Toast (danger), or inline where triggered |
| Network offline | "You are offline. We will reconnect when your connection returns." | Persistent top banner (info-500 color) |
| Dashboard data stale (refetch failed) | "We could not refresh your dashboard. Showing data from [relative time] ago. [Refresh]" | Below term snapshot row |
| 403 Forbidden | "You do not have permission to view this page." | Full-page `/403` route |
| 404 Not Found | "This page does not exist. [Go to dashboard]" | Full-page `/404` route |
| Rate limited | "Too many requests. Wait a moment and try again." | Toast |
| CSRF / token invalid | "Your session is no longer valid. Sign in again to continue." | Toast, then redirect to /login |

---

## 9. Destructive Action Confirmation Copy

Per the design principle: "outcome-named buttons on destructive confirms, not generic 'Confirm'."

| Action | Dialog title | Body copy | Primary button | Secondary button |
|---|---|---|---|---|
| Drop course | "Drop [course code]?" | "You will be removed from [course name]. This cannot be undone after the drop deadline has passed." | "Drop course" (danger-500) | "Cancel" |
| Delete user account | "Delete this account?" | "This will permanently delete [username]'s account and all associated data. This cannot be undone." | "Delete permanently" (danger-500) | "Cancel" |
| Revoke transcript | "Revoke this transcript?" | "Revoking will mark the transcript invalid. The student will be notified. This cannot be undone without re-issuing." | "Revoke transcript" (danger-500) | "Cancel" |
| Cancel invoice | "Cancel this invoice?" | "The invoice will be marked cancelled and the student will be notified. Payments already made will need to be refunded manually." | "Cancel invoice" (danger-500) | "Keep invoice" |
| Close assessment | "Close this assessment?" | "Students will no longer be able to submit. Grading can still proceed. This cannot be reopened." | "Close assessment" (warn-500) | "Cancel" |

---

## 10. Empty States (Onboarding-style, per impeccable UX writing)

| Surface | Empty state heading | Empty state body | CTA |
|---|---|---|---|
| Learner Dashboard — no enrollments | "You are not enrolled in any courses yet." | "Once you enrol in courses for Fall 2026, they will appear here." | "Browse course catalogue" |
| Learner Dashboard — no upcoming items | "Nothing due this week." | (no body — single line is enough) | — |
| Learner Dashboard — no action required | (block hidden entirely — no placeholder) | — | — |
| Learner Dashboard — no recent feedback | (block hidden entirely — no placeholder) | — | — |
| Notification center — no notifications | "You are all caught up." | (no body) | — |
| Applicant queue — no pending applications | "No applications pending review." | "New applications will appear here as students apply." | — |
| Gradebook — no submissions yet | "No submissions for this assessment yet." | "Students can submit until [dueDate]." | — |
| Invoice list — no invoices | "No invoices for this term." | (no body) | — |
| Audit log — no entries matching filter | "No audit events match your filters." | "Try adjusting the date range or removing filters." | "Clear filters" |
| Ticket list — no tickets | "No support tickets yet." | (no body for ITAdmin) | — |
