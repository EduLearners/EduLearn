# shellcheck shell=bash
log_section "Module 18 — KPIs (RKA-02)"
ROLE=ITAdmin

# Seed is idempotent — may return 409 on second run
http_post /api/kpis/seed "$TOKEN_ITADMIN" "" >/dev/null
if [[ "$LAST_STATUS" == "200" || "$LAST_STATUS" == "409" ]]; then
  log_pass "POST /api/kpis/seed → $LAST_STATUS (200 first run, 409 if already seeded)"
else
  log_fail "POST /api/kpis/seed unexpected status=$LAST_STATUS"
fi

http_get /api/kpis "$TOKEN_ITADMIN" >/dev/null
assert_status 200 "$LAST_STATUS" "GET /api/kpis → 200"

http_post /api/kpis/recalculate "$TOKEN_ITADMIN" "" >/dev/null
assert_status 200 "$LAST_STATUS" "POST /api/kpis/recalculate → 200"

# Auditor can recalculate (policy allows ITAdmin,Auditor)
http_post /api/kpis/recalculate "$TOKEN_AUDITOR" "" >/dev/null
assert_status 200 "$LAST_STATUS" "POST /api/kpis/recalculate (Auditor) → 200"

# Student denied
http_post /api/kpis/recalculate "$TOKEN_STUDENT1" "" >/dev/null
assert_status 403 "$LAST_STATUS" "POST /api/kpis/recalculate (Student) → 403"

# Seed requires ITAdmin specifically
http_post /api/kpis/seed "$TOKEN_AUDITOR" "" >/dev/null
assert_status 403 "$LAST_STATUS" "POST /api/kpis/seed (Auditor) → 403"
