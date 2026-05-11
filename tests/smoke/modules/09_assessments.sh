# shellcheck shell=bash
log_section "Module 09 — Assessments (AGI-01)"
ROLE=Instructor

body="{\"courseID\":$COURSE_ID_1,\"sectionID\":null,\"title\":\"Quiz 1 $SEED_TS\",\"type\":\"Quiz\",\"dueAt\":\"2026-12-01T23:59:00Z\",\"maxScore\":50.0,\"gradingRubricJSON\":null,\"createdByFK\":$ID_INSTRUCTOR}"
http_post /api/assessments "$TOKEN_INSTRUCTOR" "$body" >/dev/null
assert_status 201 "$LAST_STATUS" "POST /api/assessments → 201 (Draft)"
export ASSESSMENT_ID=$(jget assessmentID)
log_info "ASSESSMENT_ID=$ASSESSMENT_ID"

# Unknown course
body="{\"courseID\":9999999,\"title\":\"x\",\"type\":\"Quiz\",\"maxScore\":10,\"createdByFK\":$ID_INSTRUCTOR}"
http_post /api/assessments "$TOKEN_INSTRUCTOR" "$body" >/dev/null
assert_status 400 "$LAST_STATUS" "POST /api/assessments (bad course) → 400"
assert_body_contains COURSE_NOT_FOUND "error code COURSE_NOT_FOUND"

# List by course
http_get "/api/assessments/course/$COURSE_ID_1" "$TOKEN_INSTRUCTOR" >/dev/null
assert_status 200 "$LAST_STATUS" "GET /api/assessments/course/{id} → 200"

# Publish
http_put "/api/assessments/$ASSESSMENT_ID/publish" "$TOKEN_INSTRUCTOR" '{"status":"Published"}' >/dev/null
assert_status 200 "$LAST_STATUS" "PUT /api/assessments/{id}/publish Draft→Published → 200"

# Cannot update after Published
body="{\"courseID\":$COURSE_ID_1,\"title\":\"cannot update\",\"type\":\"Quiz\",\"maxScore\":50,\"createdByFK\":$ID_INSTRUCTOR}"
http_put "/api/assessments/$ASSESSMENT_ID" "$TOKEN_INSTRUCTOR" "$body" >/dev/null
assert_status 400 "$LAST_STATUS" "PUT /api/assessments/{id} after publish → 400"
assert_body_contains ASSESSMENT_NOT_DRAFT "error code ASSESSMENT_NOT_DRAFT"

# 404
http_put "/api/assessments/9999999/publish" "$TOKEN_INSTRUCTOR" '{"status":"Published"}' >/dev/null
assert_status 404 "$LAST_STATUS" "PUT /api/assessments/{bad}/publish → 404"
