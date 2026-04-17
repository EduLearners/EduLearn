# shellcheck shell=bash
log_section "Module 01 — Health"
ROLE=anon
http_get /api/health "" >/dev/null
assert_status 200 "$LAST_STATUS" "GET /api/health (anonymous) → 200"
perf_check "$LAST_MS" GET /api/health "Health endpoint timing"
