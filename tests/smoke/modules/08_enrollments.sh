# shellcheck shell=bash
log_section "Module 08 — Enrollments (ETS-01) — PRD SLA: <2s HARD"
# EnrollmentPolicy: Student, Registrar, ITAdmin

ROLE=Student
body="{\"studentID\":$STUDENT_ID_1,\"sectionID\":$SECTION_ID_SMALL}"
http_post /api/enrollment/enroll "$TOKEN_STUDENT1" "$body" >/dev/null
assert_status 201 "$LAST_STATUS" "POST /api/enrollment/enroll (Student 1) → 201"
export ENROLL_ID_1=$(jget enrollID)
perf_check "$LAST_MS" POST /api/enrollment/enroll "PRD HARD: enrollment <2s"

ROLE=Registrar
body="{\"studentID\":$STUDENT_ID_2,\"sectionID\":$SECTION_ID_SMALL}"
http_post /api/enrollment/enroll "$TOKEN_REGISTRAR" "$body" >/dev/null
assert_status 201 "$LAST_STATUS" "POST /api/enrollment/enroll (Registrar for Student 2) → 201"
export ENROLL_ID_2=$(jget enrollID)
perf_check "$LAST_MS" POST /api/enrollment/enroll "PRD HARD: enrollment <2s"

# Duplicate
ROLE=Student
http_post /api/enrollment/enroll "$TOKEN_STUDENT1" "{\"studentID\":$STUDENT_ID_1,\"sectionID\":$SECTION_ID_SMALL}" >/dev/null
assert_status 409 "$LAST_STATUS" "Duplicate enrollment → 409"
assert_body_contains DUPLICATE_ENROLLMENT "error code DUPLICATE_ENROLLMENT"

# Unknown section
http_post /api/enrollment/enroll "$TOKEN_ITADMIN" "{\"studentID\":$STUDENT_ID_1,\"sectionID\":9999999}" >/dev/null
assert_status 400 "$LAST_STATUS" "Enroll in bad section → 400"
assert_body_contains SECTION_NOT_FOUND "error code SECTION_NOT_FOUND"

# Policy denial: Instructor cannot enroll
ROLE=Instructor
http_post /api/enrollment/enroll "$TOKEN_INSTRUCTOR" "{\"studentID\":$STUDENT_ID_1,\"sectionID\":$SECTION_ID_BIG}" >/dev/null
assert_status 403 "$LAST_STATUS" "POST /api/enrollment/enroll (Instructor) → 403 (EnrollmentPolicy)"

# Roster view (RosterViewPolicy — Instructor allowed, Student not)
ROLE=Instructor
http_get "/api/enrollment/section/$SECTION_ID_SMALL" "$TOKEN_INSTRUCTOR" >/dev/null
assert_status 200 "$LAST_STATUS" "GET /api/enrollment/section (Instructor) → 200"

ROLE=Student
http_get "/api/enrollment/section/$SECTION_ID_SMALL" "$TOKEN_STUDENT1" >/dev/null
assert_status 403 "$LAST_STATUS" "GET /api/enrollment/section (Student) → 403 (RosterViewPolicy)"

# Student's own enrollments (EnrollmentViewPolicy — Student allowed)
http_get "/api/enrollment/student/$STUDENT_ID_1" "$TOKEN_STUDENT1" >/dev/null
assert_status 200 "$LAST_STATUS" "GET /api/enrollment/student (Student own) → 200"

# Drop
http_delete "/api/enrollment/$ENROLL_ID_1/drop" "$TOKEN_STUDENT1" >/dev/null
assert_status 204 "$LAST_STATUS" "DELETE /api/enrollment/{id}/drop → 204"
perf_check "$LAST_MS" DELETE /api/enrollment/$ENROLL_ID_1/drop "PRD HARD: drop <2s"

http_delete "/api/enrollment/9999999/drop" "$TOKEN_ITADMIN" >/dev/null
assert_status 404 "$LAST_STATUS" "DELETE /api/enrollment/{bad}/drop → 404"

# Re-enroll Student 1 for downstream tests (Assessments/Submissions depend on active enrollment existing in some flows)
http_post /api/enrollment/enroll "$TOKEN_ITADMIN" "{\"studentID\":$STUDENT_ID_1,\"sectionID\":$SECTION_ID_BIG}" >/dev/null
assert_status 201 "$LAST_STATUS" "Re-enroll Student 1 in BIG section → 201"
