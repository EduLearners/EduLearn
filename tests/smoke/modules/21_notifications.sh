# shellcheck shell=bash
log_section "Module 21 — Notifications (NHT-01)"
ROLE=ITAdmin

# Test seed endpoint (AdminPolicy) — Student first: 403
http_post /api/notifications/test "$TOKEN_STUDENT1" "{\"userID\":$ID_STUDENT1,\"category\":\"System\",\"severity\":\"Info\",\"message\":\"x\"}" >/dev/null
assert_status 403 "$LAST_STATUS" "POST /api/notifications/test (Student) → 403 (AdminPolicy)"

# ITAdmin: 201
body="{\"userID\":$ID_STUDENT1,\"category\":\"System\",\"severity\":\"Info\",\"message\":\"smoke seed $SEED_TS\"}"
http_post /api/notifications/test "$TOKEN_ITADMIN" "$body" >/dev/null
assert_status 201 "$LAST_STATUS" "POST /api/notifications/test (ITAdmin) → 201"
export NOTIFICATION_ID=$(jget notificationID)

# Student sees own
http_get "/api/notifications?page=1&pageSize=20" "$TOKEN_STUDENT1" >/dev/null
assert_status 200 "$LAST_STATUS" "GET /api/notifications (own) → 200"

http_get /api/notifications/unread-count "$TOKEN_STUDENT1" >/dev/null
assert_status 200 "$LAST_STATUS" "GET /api/notifications/unread-count → 200"
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

# Idempotent
http_put "/api/notifications/$NOTIFICATION_ID/read" "$TOKEN_STUDENT1" "" >/dev/null
assert_status 204 "$LAST_STATUS" "PUT /api/notifications/{id}/read idempotent → 204"

# Read-all
http_put /api/notifications/read-all "$TOKEN_STUDENT1" "" >/dev/null
assert_status 204 "$LAST_STATUS" "PUT /api/notifications/read-all → 204"
