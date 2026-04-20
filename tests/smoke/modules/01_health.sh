# shellcheck shell=bash
log_section "Module 01 — Health (N-1 hardening: AdminPolicy-gated)"
ROLE=anon

# HARDENING (N-1): previously anonymous → now requires ITAdmin.
http_get /api/health "" >/dev/null
assert_status 401 "$LAST_STATUS" "GET /api/health (no auth) → 401 [N-1]"

ROLE=Student
http_get /api/health "$TOKEN_STUDENT1" >/dev/null
assert_status 403 "$LAST_STATUS" "GET /api/health (Student) → 403 [N-1]"

ROLE=ITAdmin
http_get /api/health "$TOKEN_ITADMIN" >/dev/null
assert_status 200 "$LAST_STATUS" "GET /api/health (ITAdmin) → 200"
perf_check "$LAST_MS" GET /api/health "Health endpoint timing"
