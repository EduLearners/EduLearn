# shellcheck shell=bash
log_section "Module 17 — Reports (RKA-01)"
ROLE=Auditor

body="{\"scope\":\"Course\",\"parametersJSON\":\"{\\\"term\\\":\\\"Fall 2026\\\"}\",\"generatedByFK\":$ID_AUDITOR}"
http_post /api/reports/generate "$TOKEN_AUDITOR" "$body" >/dev/null
assert_status 201 "$LAST_STATUS" "POST /api/reports/generate (Auditor) → 201"
export REPORT_ID=$(jget reportID)

# Invalid scope value (GeneratedByFK is taken from JWT after hardening, not body)
http_post /api/reports/generate "$TOKEN_AUDITOR" '{"scope":"InvalidScope","parametersJSON":null}' >/dev/null
assert_status 400 "$LAST_STATUS" "POST /api/reports/generate bad scope → 400"

http_get /api/reports "$TOKEN_AUDITOR" >/dev/null
assert_status 200 "$LAST_STATUS" "GET /api/reports → 200"

http_get "/api/reports/$REPORT_ID/download" "$TOKEN_AUDITOR" >/dev/null
assert_status 200 "$LAST_STATUS" "GET /api/reports/{id}/download → 200"

http_get "/api/reports/9999999/download" "$TOKEN_AUDITOR" >/dev/null
assert_status 404 "$LAST_STATUS" "GET /api/reports/{bad}/download → 404"
