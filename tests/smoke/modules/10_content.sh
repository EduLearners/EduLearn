# shellcheck shell=bash
log_section "Module 10 — Content (LMS-01)"
ROLE=Instructor

body="{\"courseID\":$COURSE_ID_1,\"title\":\"Week 1 Notes\",\"type\":\"Document\",\"uri\":\"https://blob.example/w1.pdf\",\"uploadedByFK\":$ID_INSTRUCTOR,\"metadataJSON\":\"{\\\"size\\\":1024}\"}"
http_post /api/content/upload "$TOKEN_INSTRUCTOR" "$body" >/dev/null
assert_status 201 "$LAST_STATUS" "POST /api/content/upload → 201"
export CONTENT_ID=$(jget contentID)
log_info "CONTENT_ID=$CONTENT_ID"

http_get "/api/content/course/$COURSE_ID_1" "$TOKEN_INSTRUCTOR" >/dev/null
assert_status 200 "$LAST_STATUS" "GET /api/content/course/{id} → 200"

http_get "/api/content/$CONTENT_ID" "$TOKEN_INSTRUCTOR" >/dev/null
assert_status 200 "$LAST_STATUS" "GET /api/content/{id} → 200"

http_get "/api/content/9999999" "$TOKEN_INSTRUCTOR" >/dev/null
assert_status 404 "$LAST_STATUS" "GET /api/content/{bad} → 404"

# Version bump
http_put "/api/content/$CONTENT_ID/version" "$TOKEN_INSTRUCTOR" '{"uri":"https://blob.example/w1-v2.pdf","metadataJSON":null}' >/dev/null
assert_status 200 "$LAST_STATUS" "PUT /api/content/{id}/version → 200"
