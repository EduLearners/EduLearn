# shellcheck shell=bash
log_section "Module 05 — Rooms (ETS-02)"
ROLE=ITAdmin

body="{\"building\":\"MainBlock\",\"roomNumber\":\"A-$SEED_TS\",\"capacity\":60,\"resourcesJSON\":\"{\\\"projector\\\":true}\"}"
http_post /api/rooms "$TOKEN_ITADMIN" "$body" >/dev/null
assert_status 201 "$LAST_STATUS" "POST /api/rooms → 201"
export ROOM_ID=$(jget roomID)
log_info "ROOM_ID=$ROOM_ID"

http_get /api/rooms "$TOKEN_ITADMIN" >/dev/null
assert_status 200 "$LAST_STATUS" "GET /api/rooms → 200"

http_get "/api/rooms/$ROOM_ID" "$TOKEN_ITADMIN" >/dev/null
assert_status 200 "$LAST_STATUS" "GET /api/rooms/{id} → 200"

http_get "/api/rooms/9999999" "$TOKEN_ITADMIN" >/dev/null
assert_status 404 "$LAST_STATUS" "GET /api/rooms/{bad} → 404"
