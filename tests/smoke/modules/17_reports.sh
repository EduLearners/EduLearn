# shellcheck shell=bash
log_section "Module 17 — Reports (RKA-01)"
ROLE=Auditor

# generatedByFK removed from DTO — now resolved from JWT only
body='{"scope":"Course","parametersJSON":"{\"term\":\"Fall 2026\"}"}'
http_post /api/reports/generate "$TOKEN_AUDITOR" "$body" >/dev/null
assert_status 201 "$LAST_STATUS" "POST /api/reports/generate (Auditor) → 201"
export REPORT_ID=$(jget reportID)

# Invalid scope value
http_post /api/reports/generate "$TOKEN_AUDITOR" '{"scope":"InvalidScope","parametersJSON":null}' >/dev/null
assert_status 400 "$LAST_STATUS" "POST /api/reports/generate bad scope → 400"

http_get /api/reports "$TOKEN_AUDITOR" >/dev/null
assert_status 200 "$LAST_STATUS" "GET /api/reports → 200"

# Download with ?format=json returns JSON body (Content-Disposition: attachment)
http_get "/api/reports/$REPORT_ID/download?format=json" "$TOKEN_AUDITOR" >/dev/null
assert_status 200 "$LAST_STATUS" "GET /api/reports/{id}/download?format=json → 200"
assert_body_contains "reportID" "download body contains reportID"
assert_body_contains "scope" "download body contains scope"

# Download without query param must return PDF (Content-Type: application/pdf)
_pdf_ct=$(curl -sIk -H "Authorization: Bearer $TOKEN_AUDITOR" "$API_BASE/api/reports/$REPORT_ID/download" 2>/dev/null | tr -d '\r' | grep -i "^content-type:" | head -1)
if echo "$_pdf_ct" | grep -qi "application/pdf"; then
  log_pass "GET /api/reports/{id}/download (no param) → Content-Type: application/pdf"
else
  log_fail "GET /api/reports/{id}/download (no param) → expected application/pdf, got: $_pdf_ct"
fi

http_get "/api/reports/9999999/download" "$TOKEN_AUDITOR" >/dev/null
assert_status 404 "$LAST_STATUS" "GET /api/reports/{bad}/download → 404"

# Role denial — Student cannot access reports
http_get /api/reports "$TOKEN_STUDENT1" >/dev/null
assert_status 403 "$LAST_STATUS" "GET /api/reports (Student) → 403"
