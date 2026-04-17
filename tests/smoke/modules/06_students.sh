# shellcheck shell=bash
log_section "Module 06 — Students (SRA-02)"
ROLE=Registrar

body="{\"userID\":$ID_STUDENT1,\"name\":\"$U_STUDENT1\",\"dob\":\"2004-05-15\",\"gender\":\"Male\",\"contactInfoJSON\":null,\"programID\":$PROGRAM_ID,\"entryTerm\":\"Fall 2026\",\"expectedGraduationTerm\":\"Spring 2030\"}"
http_post /api/students "$TOKEN_REGISTRAR" "$body" >/dev/null
assert_status 201 "$LAST_STATUS" "POST /api/students (Student 1) → 201"
export STUDENT_ID_1=$(jget studentID)
log_info "STUDENT_ID_1=$STUDENT_ID_1"

body="{\"userID\":$ID_STUDENT2,\"name\":\"$U_STUDENT2\",\"dob\":\"2004-08-22\",\"gender\":\"Female\",\"contactInfoJSON\":null,\"programID\":$PROGRAM_ID,\"entryTerm\":\"Fall 2026\",\"expectedGraduationTerm\":null}"
http_post /api/students "$TOKEN_ITADMIN" "$body" >/dev/null
assert_status 201 "$LAST_STATUS" "POST /api/students (Student 2) → 201"
export STUDENT_ID_2=$(jget studentID)

# Duplicate (same userID)
body="{\"userID\":$ID_STUDENT1,\"name\":\"dup\",\"dob\":\"2000-01-01\",\"programID\":$PROGRAM_ID,\"entryTerm\":\"Fall 2026\"}"
http_post /api/students "$TOKEN_ITADMIN" "$body" >/dev/null
assert_status 409 "$LAST_STATUS" "POST /api/students duplicate userID → 409"

# Wrong-role linked user (ITAdmin can't be a student)
body="{\"userID\":$ID_ITADMIN,\"name\":\"bad role\",\"dob\":\"2000-01-01\",\"programID\":$PROGRAM_ID,\"entryTerm\":\"Fall 2026\"}"
http_post /api/students "$TOKEN_ITADMIN" "$body" >/dev/null
assert_status 400 "$LAST_STATUS" "POST /api/students with non-Student user → 400"
assert_body_contains INVALID_USER_ROLE "error code INVALID_USER_ROLE"

http_get /api/students "$TOKEN_ITADMIN" >/dev/null
assert_status 200 "$LAST_STATUS" "GET /api/students → 200"
perf_check "$LAST_MS" GET /api/students "List students"

http_get "/api/students/$STUDENT_ID_1" "$TOKEN_ITADMIN" >/dev/null
assert_status 200 "$LAST_STATUS" "GET /api/students/{id} → 200"

http_get "/api/students/9999999" "$TOKEN_ITADMIN" >/dev/null
assert_status 404 "$LAST_STATUS" "GET /api/students/{bad} → 404"

http_put "/api/students/$STUDENT_ID_1" "$TOKEN_ITADMIN" '{"name":"Updated Name","expectedGraduationTerm":"Fall 2030"}' >/dev/null
assert_status 200 "$LAST_STATUS" "PUT /api/students/{id} → 200"
