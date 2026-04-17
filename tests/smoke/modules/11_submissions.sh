# shellcheck shell=bash
log_section "Module 11 — Submissions (AGI-02) — PRD SLA: grade <2s HARD"
ROLE=Student

# Submit
body="{\"assessmentID\":$ASSESSMENT_ID,\"studentID\":$STUDENT_ID_1,\"fileURI\":\"https://blob.example/sub1.pdf\"}"
http_post /api/submissions "$TOKEN_STUDENT1" "$body" >/dev/null
assert_status 201 "$LAST_STATUS" "POST /api/submissions → 201"
export SUBMISSION_ID=$(jget submissionID)
log_info "SUBMISSION_ID=$SUBMISSION_ID"

# Duplicate submission
http_post /api/submissions "$TOKEN_STUDENT1" "$body" >/dev/null
assert_status 409 "$LAST_STATUS" "Duplicate submission → 409"
assert_body_contains DUPLICATE_SUBMISSION "error code DUPLICATE_SUBMISSION"

# By assessment
http_get "/api/submissions/assessment/$ASSESSMENT_ID" "$TOKEN_INSTRUCTOR" >/dev/null
assert_status 200 "$LAST_STATUS" "GET /api/submissions/assessment/{id} → 200"

# By student
http_get "/api/submissions/student/$STUDENT_ID_1" "$TOKEN_INSTRUCTOR" >/dev/null
assert_status 200 "$LAST_STATUS" "GET /api/submissions/student/{id} → 200"

# Grade (Instructor)
ROLE=Instructor
body="{\"score\":42.0,\"graderID\":$ID_INSTRUCTOR,\"reason\":\"good work\"}"
http_post "/api/submissions/$SUBMISSION_ID/grade" "$TOKEN_INSTRUCTOR" "$body" >/dev/null
assert_status 200 "$LAST_STATUS" "POST /api/submissions/{id}/grade → 200"
perf_check "$LAST_MS" POST /api/submissions/$SUBMISSION_ID/grade "PRD HARD: grade posting <2s"

# Re-grade — should create GradeChange
body="{\"score\":45.0,\"graderID\":$ID_INSTRUCTOR,\"reason\":\"partial credit\"}"
http_post "/api/submissions/$SUBMISSION_ID/grade" "$TOKEN_INSTRUCTOR" "$body" >/dev/null
assert_status 200 "$LAST_STATUS" "POST /api/submissions/{id}/grade (re-grade) → 200"

# Score > max
body="{\"score\":999.0,\"graderID\":$ID_INSTRUCTOR,\"reason\":\"x\"}"
http_post "/api/submissions/$SUBMISSION_ID/grade" "$TOKEN_INSTRUCTOR" "$body" >/dev/null
assert_status 400 "$LAST_STATUS" "Score exceeds max → 400"
assert_body_contains SCORE_EXCEEDS_MAX "error code SCORE_EXCEEDS_MAX"
