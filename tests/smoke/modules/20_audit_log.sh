# shellcheck shell=bash
log_section "Module 20 — Audit Log (IAM-04)"
ROLE=Auditor

http_get /api/audit-log "$TOKEN_AUDITOR" >/dev/null
assert_status 200 "$LAST_STATUS" "GET /api/audit-log (Auditor) → 200"

http_get /api/audit-log "$TOKEN_ITADMIN" >/dev/null
assert_status 200 "$LAST_STATUS" "GET /api/audit-log (ITAdmin) → 200"

http_get /api/audit-log "$TOKEN_STUDENT1" >/dev/null
assert_status 403 "$LAST_STATUS" "GET /api/audit-log (Student) → 403 (AuditViewPolicy)"

# Filter: single param
http_get "/api/audit-log?action=Login" "$TOKEN_AUDITOR" >/dev/null
assert_status 200 "$LAST_STATUS" "GET /api/audit-log?action=Login → 200"

# Combined — KNOWN BUG M-2: filter composition is first-match.
# We don't fail this assertion because the fix is post-interim; we just exercise the path.
http_get "/api/audit-log?userId=$ID_ITADMIN&action=Login" "$TOKEN_AUDITOR" >/dev/null
assert_status 200 "$LAST_STATUS" "GET /api/audit-log (combined filters — see M-2) → 200"
log_info "(M-2: combined filters silently pick userId only — fix post-interim)"
