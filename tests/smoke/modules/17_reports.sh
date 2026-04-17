# shellcheck shell=bash
log_section "Module 17 — Reports (RKA-01)"
ROLE=Auditor

body="{\"scope\":\"Enrollment\",\"parametersJSON\":\"{\\\"term\\\":\\\"Fall 2026\\\"}\",\"generatedByFK\":$ID_AUDITOR}"
http_post /api/reports/generate "$TOKEN_AUDITOR" "$body" >/dev/null
assert_status 201 "$LAST_STATUS" "POST /api/reports/generate (Auditor) → 201"
export REPORT_ID=$(jget reportID)

# Invalid userID
http_post /api/reports/generate "$TOKEN_AUDITOR" '{"scope":"Finance","parametersJSON":null,"generatedByFK":0}' >/dev/null
assert_status 400 "$LAST_STATUS" "POST /api/reports/generate bad user → 400"
assert_body_contains INVALID_USER_ID "error code INVALID_USER_ID"

http_get /api/reports "$TOKEN_AUDITOR" >/dev/null
assert_status 200 "$LAST_STATUS" "GET /api/reports → 200"

http_get "/api/reports/$REPORT_ID/download" "$TOKEN_AUDITOR" >/dev/null
assert_status 200 "$LAST_STATUS" "GET /api/reports/{id}/download → 200"

http_get "/api/reports/9999999/download" "$TOKEN_AUDITOR" >/dev/null
assert_status 404 "$LAST_STATUS" "GET /api/reports/{bad}/download → 404"
