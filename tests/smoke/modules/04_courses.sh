# shellcheck shell=bash
log_section "Module 04 — Courses (CCM-01)"
# CourseManagerPolicy: Instructor, DeptAdmin, ITAdmin

ROLE=Instructor
CODE1="CS$SEED_TS"
body="{\"code\":\"$CODE1\",\"title\":\"Intro to CS\",\"description\":\"x\",\"credits\":3,\"departmentID\":1,\"level\":\"100\",\"prerequisitesJSON\":null}"
http_post /api/courses "$TOKEN_INSTRUCTOR" "$body" >/dev/null
assert_status 201 "$LAST_STATUS" "POST /api/courses (Instructor) → 201"
export COURSE_ID_1=$(jget courseID)
log_info "COURSE_ID_1=$COURSE_ID_1"

CODE2="CS${SEED_TS}B"
body="{\"code\":\"$CODE2\",\"title\":\"DSA\",\"credits\":4,\"departmentID\":1,\"level\":\"200\",\"prerequisitesJSON\":\"[$COURSE_ID_1]\"}"
http_post /api/courses "$TOKEN_ITADMIN" "$body" >/dev/null
assert_status 201 "$LAST_STATUS" "POST /api/courses (ITAdmin) → 201"
export COURSE_ID_2=$(jget courseID)

# Duplicate code
body="{\"code\":\"$CODE1\",\"title\":\"dup\",\"credits\":3}"
http_post /api/courses "$TOKEN_ITADMIN" "$body" >/dev/null
assert_status 409 "$LAST_STATUS" "POST /api/courses duplicate → 409"
assert_body_contains DUPLICATE_COURSE_CODE "error code DUPLICATE_COURSE_CODE"

# Policy denials
ROLE=Student
body2="{\"code\":\"STU$SEED_TS\",\"title\":\"no\",\"credits\":3}"
http_post /api/courses "$TOKEN_STUDENT1" "$body2" >/dev/null
assert_status 403 "$LAST_STATUS" "POST /api/courses (Student) → 403 (CourseManagerPolicy)"

# AllUsersPolicy reads
ROLE=Student
http_get /api/courses "$TOKEN_STUDENT1" >/dev/null
assert_status 200 "$LAST_STATUS" "GET /api/courses (Student, AllUsersPolicy) → 200"
perf_check "$LAST_MS" GET /api/courses "List courses"

http_get "/api/courses/$COURSE_ID_1" "$TOKEN_STUDENT1" >/dev/null
assert_status 200 "$LAST_STATUS" "GET /api/courses/{id} (Student) → 200"

http_get "/api/courses/9999999" "$TOKEN_STUDENT1" >/dev/null
assert_status 404 "$LAST_STATUS" "GET /api/courses/{bad} → 404"
assert_body_contains COURSE_NOT_FOUND "error code COURSE_NOT_FOUND"

# Update (CourseManagerPolicy)
ROLE=ITAdmin
body="{\"code\":\"$CODE1\",\"title\":\"Intro to CS — Updated\",\"credits\":3}"
http_put "/api/courses/$COURSE_ID_1" "$TOKEN_ITADMIN" "$body" >/dev/null
assert_status 200 "$LAST_STATUS" "PUT /api/courses/{id} (ITAdmin) → 200"
