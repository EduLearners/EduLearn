# shellcheck shell=bash
log_section "Module 19 — Audit Packages (RKA-03)"
ROLE=Auditor

body='{"periodStart":"2026-01-01","periodEnd":"2026-06-30"}'
http_post /api/audit-packages/generate "$TOKEN_AUDITOR" "$body" >/dev/null
assert_status 201 "$LAST_STATUS" "POST /api/audit-packages/generate → 201"
export PACKAGE_ID=$(jget packageID)

# Invalid date range
body='{"periodStart":"2026-12-31","periodEnd":"2026-01-01"}'
http_post /api/audit-packages/generate "$TOKEN_AUDITOR" "$body" >/dev/null
assert_status 400 "$LAST_STATUS" "POST bad date range → 400"
assert_body_contains INVALID_DATE_RANGE "error code INVALID_DATE_RANGE"

# Role denial
http_post /api/audit-packages/generate "$TOKEN_STUDENT1" "$body" >/dev/null
assert_status 403 "$LAST_STATUS" "POST /api/audit-packages/generate (Student) → 403"

http_get "/api/audit-packages/$PACKAGE_ID/download?format=json" "$TOKEN_AUDITOR" >/dev/null
assert_status 200 "$LAST_STATUS" "GET /api/audit-packages/{id}/download?format=json → 200"
assert_body_contains "packageID" "download body contains packageID"
assert_body_contains "periodStart" "download body contains periodStart"

# Download without query param must return PDF (Content-Type: application/pdf)
_pdf_ct=$(curl -sIk -H "Authorization: Bearer $TOKEN_AUDITOR" "$API_BASE/api/audit-packages/$PACKAGE_ID/download" 2>/dev/null | tr -d '\r' | grep -i "^content-type:" | head -1)
if echo "$_pdf_ct" | grep -qi "application/pdf"; then
  log_pass "GET /api/audit-packages/{id}/download (no param) → Content-Type: application/pdf"
else
  log_fail "GET /api/audit-packages/{id}/download (no param) → expected application/pdf, got: $_pdf_ct"
fi

http_get "/api/audit-packages/9999999/download" "$TOKEN_AUDITOR" >/dev/null
assert_status 404 "$LAST_STATUS" "GET /api/audit-packages/{bad}/download → 404"

# Role denial — Student cannot access audit packages
http_get "/api/audit-packages/$PACKAGE_ID/download" "$TOKEN_STUDENT1" >/dev/null
assert_status 403 "$LAST_STATUS" "GET /api/audit-packages/{id}/download (Student) → 403"
