# shellcheck shell=bash
log_section "Module 19 — Audit Packages (RKA-03)"
ROLE=Auditor

body='{"periodStart":"2026-01-01","periodEnd":"2026-06-30"}'
http_post /api/audit-packages/generate "$TOKEN_AUDITOR" "$body" >/dev/null
assert_status 201 "$LAST_STATUS" "POST /api/audit-packages/generate → 201"
export PACKAGE_ID=$(jget auditPackageID)

# Invalid date range
body='{"periodStart":"2026-12-31","periodEnd":"2026-01-01"}'
http_post /api/audit-packages/generate "$TOKEN_AUDITOR" "$body" >/dev/null
assert_status 400 "$LAST_STATUS" "POST bad date range → 400"
assert_body_contains INVALID_DATE_RANGE "error code INVALID_DATE_RANGE"

# Role denial
http_post /api/audit-packages/generate "$TOKEN_STUDENT1" "$body" >/dev/null
assert_status 403 "$LAST_STATUS" "POST /api/audit-packages/generate (Student) → 403"

http_get "/api/audit-packages/$PACKAGE_ID/download" "$TOKEN_AUDITOR" >/dev/null
assert_status 200 "$LAST_STATUS" "GET /api/audit-packages/{id}/download → 200"
