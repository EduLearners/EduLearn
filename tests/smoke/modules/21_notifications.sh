# shellcheck shell=bash
log_section "Module 21 — Notifications (NHT-01, REST-only)"
ROLE=ITAdmin

# ── Cross-module producer wiring check (NHT-01 PRD §6.9) ──
# By now Student1 has been enrolled, dropped, re-enrolled, had a grade posted,
# and had an invoice generated. Unread count MUST be > 0 if producers fire.
http_get /api/notifications/unread-count "$TOKEN_STUDENT1" >/dev/null
assert_status 200 "$LAST_STATUS" "GET /api/notifications/unread-count (Student1, pre-seed) → 200"
perf_check "$LAST_MS" GET /api/notifications/unread-count "unread-count SLA <150ms WARN"
PRE_COUNT=$(jget unreadCount)
if [[ "$PRE_COUNT" -gt 0 ]]; then
  log_pass "[NHT-01 producers] Student1 has $PRE_COUNT unread notifications from upstream modules (Enrollment/Assessment/Finance)"
else
  log_fail "[NHT-01 producers] Student1 unread count is 0 — upstream modules are NOT firing NotifyAsync. Expected enrollment/grade/invoice notifications."
fi

# Test seed endpoint (AdminPolicy) — Student first: 403
http_post /api/notifications/test "$TOKEN_STUDENT1" "{\"userID\":$ID_STUDENT1,\"category\":\"System\",\"severity\":\"Info\",\"message\":\"x\"}" >/dev/null
assert_status 403 "$LAST_STATUS" "POST /api/notifications/test (Student) → 403 (AdminPolicy)"

# ITAdmin: 201
body="{\"userID\":$ID_STUDENT1,\"category\":\"System\",\"severity\":\"Info\",\"message\":\"smoke seed $SEED_TS\"}"
http_post /api/notifications/test "$TOKEN_ITADMIN" "$body" >/dev/null
assert_status 201 "$LAST_STATUS" "POST /api/notifications/test (ITAdmin) → 201"
perf_check "$LAST_MS" POST /api/notifications/test "POST /api/notifications/test SLA <750ms WARN"
export NOTIFICATION_ID=$(jget notificationID)

# PRD-aligned enum values — Assessment category (NHT-01 enum alignment 2026-04-20)
body="{\"userID\":$ID_STUDENT1,\"category\":\"Assessment\",\"severity\":\"Info\",\"message\":\"enum check: Assessment\"}"
http_post /api/notifications/test "$TOKEN_ITADMIN" "$body" >/dev/null
assert_status 201 "$LAST_STATUS" "POST /api/notifications/test category=Assessment → 201"

# PRD-aligned enum values — IT category
body="{\"userID\":$ID_STUDENT1,\"category\":\"IT\",\"severity\":\"Warning\",\"message\":\"enum check: IT\"}"
http_post /api/notifications/test "$TOKEN_ITADMIN" "$body" >/dev/null
assert_status 201 "$LAST_STATUS" "POST /api/notifications/test category=IT severity=Warning → 201"

# Invalid category (post-removal: Grade no longer accepted) → 400
body="{\"userID\":$ID_STUDENT1,\"category\":\"Grade\",\"severity\":\"Info\",\"message\":\"rejected enum\"}"
http_post /api/notifications/test "$TOKEN_ITADMIN" "$body" >/dev/null
assert_status 400 "$LAST_STATUS" "POST /api/notifications/test category=Grade (removed) → 400"

# Student sees own
http_get "/api/notifications?page=1&pageSize=20" "$TOKEN_STUDENT1" >/dev/null
assert_status 200 "$LAST_STATUS" "GET /api/notifications (own) → 200"

# unreadOnly filter (2026-04-20 restructure)
http_get "/api/notifications?page=1&pageSize=20&unreadOnly=true" "$TOKEN_STUDENT1" >/dev/null
assert_status 200 "$LAST_STATUS" "GET /api/notifications?unreadOnly=true → 200"

http_get /api/notifications/unread-count "$TOKEN_STUDENT1" >/dev/null
assert_status 200 "$LAST_STATUS" "GET /api/notifications/unread-count → 200"
perf_check "$LAST_MS" GET /api/notifications/unread-count "unread-count SLA <150ms WARN"
log_info "Student1 unreadCount=$(jget unreadCount)"

# Mark-read — other user's → 403
http_put "/api/notifications/$NOTIFICATION_ID/read" "$TOKEN_STUDENT2" "" >/dev/null
assert_status 403 "$LAST_STATUS" "PUT /api/notifications/{id}/read other user's → 403"
assert_body_contains NOTIFICATION_FORBIDDEN "error code NOTIFICATION_FORBIDDEN"

# Non-existent → 404
http_put /api/notifications/9999999/read "$TOKEN_STUDENT1" "" >/dev/null
assert_status 404 "$LAST_STATUS" "PUT /api/notifications/{bad}/read → 404"
assert_body_contains NOTIFICATION_NOT_FOUND "error code NOTIFICATION_NOT_FOUND"

# Own → 204
http_put "/api/notifications/$NOTIFICATION_ID/read" "$TOKEN_STUDENT1" "" >/dev/null
assert_status 204 "$LAST_STATUS" "PUT /api/notifications/{id}/read (own) → 204"
perf_check "$LAST_MS" PUT /api/notifications/read "mark-read SLA <750ms WARN"

# Idempotent
http_put "/api/notifications/$NOTIFICATION_ID/read" "$TOKEN_STUDENT1" "" >/dev/null
assert_status 204 "$LAST_STATUS" "PUT /api/notifications/{id}/read idempotent → 204"

# Read-all
http_put /api/notifications/read-all "$TOKEN_STUDENT1" "" >/dev/null
assert_status 204 "$LAST_STATUS" "PUT /api/notifications/read-all → 204"
perf_check "$LAST_MS" PUT /api/notifications/read-all "read-all SLA <750ms WARN"

# After read-all, unread count should be 0
http_get /api/notifications/unread-count "$TOKEN_STUDENT1" >/dev/null
POST_COUNT=$(jget unreadCount)
if [[ "$POST_COUNT" == "0" ]]; then
  log_pass "[NHT-01] After read-all, unread count = 0"
else
  log_fail "[NHT-01] After read-all, unread count = $POST_COUNT (expected 0)"
fi
