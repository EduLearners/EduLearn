# shellcheck shell=bash
# security/authz_full_sweep.sh — canary test for every role-gated endpoint
# denying a Student JWT. Green here means all C-* hardenings landed.
log_section "Security full authz sweep — Student JWT denied on every privileged endpoint"

TK="$TOKEN_STUDENT1"

# SFB — FinancePolicy
http_post /api/fees "$TK" '{"programID":1,"term":"X","feeItemsJSON":"[]","effectiveFrom":"2026-01-01","effectiveTo":"2026-12-31"}' >/dev/null
assert_status 403 "$LAST_STATUS" "[C-1.D] Fees POST (Student) → 403"

http_post /api/scholarships "$TK" "{\"studentID\":$STUDENT_ID_1,\"awardType\":\"x\",\"amount\":1,\"validFrom\":\"2026-06-01\",\"validTo\":\"2026-12-31\"}" >/dev/null
assert_status 403 "$LAST_STATUS" "[C-1.A] Scholarships POST (Student) → 403"

http_post /api/invoices/generate "$TK" "{\"studentID\":$STUDENT_ID_1,\"term\":\"Fall 2026\",\"dueDate\":\"2026-08-15\"}" >/dev/null
assert_status 403 "$LAST_STATUS" "[C-1.B] Invoices generate (Student) → 403"

http_post /api/payments "$TK" "{\"invoiceID\":${INVOICE_ID:-1},\"amount\":1,\"method\":\"Cash\"}" >/dev/null
assert_status 403 "$LAST_STATUS" "[C-1.C] Payments POST (Student) → 403"

# RKA
http_post /api/reports/generate "$TK" '{"scope":"Enrollment","parametersJSON":null,"generatedByFK":999}' >/dev/null
assert_status 403 "$LAST_STATUS" "[C-2] Reports generate (Student) → 403"

http_get /api/reports "$TK" >/dev/null
assert_status 403 "$LAST_STATUS" "[C-2] Reports list (Student) → 403"

http_get /api/kpis "$TK" >/dev/null
assert_status 403 "$LAST_STATUS" "[C-20] KPIs GET (Student) → 403"

# CCM
http_post /api/programs "$TK" '{"name":"x","departmentID":1,"degreeType":"Bachelor","requiredCoursesJSON":"[]","durationTerms":4}' >/dev/null
assert_status 403 "$LAST_STATUS" "[C-6] Programs POST (Student) → 403"

# LMS
http_post /api/content/upload "$TK" "{\"courseID\":$COURSE_ID_1,\"title\":\"x\",\"type\":\"Document\",\"uri\":\"http://x\",\"uploadedByFK\":1,\"metadataJSON\":null}" >/dev/null
assert_status 403 "$LAST_STATUS" "[C-12] Content upload (Student) → 403"

# AGI
http_post /api/assessments "$TK" "{\"courseID\":$COURSE_ID_1,\"title\":\"x\",\"type\":\"Quiz\",\"maxScore\":10,\"createdByFK\":1}" >/dev/null
assert_status 403 "$LAST_STATUS" "[C-11] Assessments POST (Student) → 403"

if [[ -n "${SUBMISSION_ID:-}" ]]; then
  http_post "/api/submissions/$SUBMISSION_ID/grade" "$TK" "{\"score\":50,\"graderID\":1,\"reason\":\"x\"}" >/dev/null
  assert_status 403 "$LAST_STATUS" "[C-5] Grade (Student) → 403"
fi

# SRA
http_post /api/applicants "$TK" '{"name":"x","dob":"2005-01-01","programApplied":"x"}' >/dev/null
assert_status 403 "$LAST_STATUS" "[C-7] Applicants POST (Student) → 403"

http_get /api/applicants "$TK" >/dev/null
assert_status 403 "$LAST_STATUS" "[C-7] Applicants list (Student) → 403"

http_post /api/students "$TK" "{\"userID\":$ID_STUDENT1,\"name\":\"x\",\"dob\":\"2000-01-01\",\"programID\":$PROGRAM_ID,\"entryTerm\":\"Fall 2026\"}" >/dev/null
assert_status 403 "$LAST_STATUS" "[C-8] Students POST (Student) → 403"

http_get /api/students "$TK" >/dev/null
assert_status 403 "$LAST_STATUS" "[C-8] Students list (Student) → 403"

# ETS
http_post /api/rooms "$TK" '{"building":"X","roomNumber":"1","capacity":10,"resourcesJSON":null}' >/dev/null
assert_status 403 "$LAST_STATUS" "[C-10] Rooms POST (Student) → 403"

http_post /api/sections "$TK" "{\"courseID\":$COURSE_ID_1,\"term\":\"Fall 2026\",\"instructorID\":$ID_INSTRUCTOR,\"capacity\":10}" >/dev/null
assert_status 403 "$LAST_STATUS" "[C-9] Sections POST (Student) → 403"

# IAM
http_get /api/health "$TK" >/dev/null
assert_status 403 "$LAST_STATUS" "[N-1] Health (Student) → 403"

# Ownership: Student A reading Student B's private data → 403
if [[ -n "${STUDENT_ID_2:-}" && -n "${INVOICE_ID:-}" ]]; then
  http_get "/api/invoices/$INVOICE_ID" "$TOKEN_STUDENT2" >/dev/null
  assert_status 403 "$LAST_STATUS" "[C-18] Student B reads Student A's invoice → 403"
fi
