# shellcheck shell=bash
log_section "Module 22 — Tickets (NHT-03)"
ROLE=Student

# Create
body='{"subject":"Cannot access portal","description":"SSO loop","priority":"High"}'
http_post /api/tickets "$TOKEN_STUDENT1" "$body" >/dev/null
assert_status 201 "$LAST_STATUS" "POST /api/tickets (Student) → 201"
export TICKET_ID=$(jget ticketID)

# Unauth
http_post /api/tickets "" "$body" >/dev/null
assert_status 401 "$LAST_STATUS" "POST /api/tickets (no auth) → 401"

# Role filter
http_get /api/tickets "$TOKEN_STUDENT1" >/dev/null
assert_status 200 "$LAST_STATUS" "GET /api/tickets (Student own) → 200"

http_get /api/tickets "$TOKEN_ITADMIN" >/dev/null
assert_status 200 "$LAST_STATUS" "GET /api/tickets (ITAdmin all) → 200"

# GetById — ownership
http_get "/api/tickets/$TICKET_ID" "$TOKEN_STUDENT1" >/dev/null
assert_status 200 "$LAST_STATUS" "GET /api/tickets/{id} creator → 200"

http_get "/api/tickets/$TICKET_ID" "$TOKEN_STUDENT2" >/dev/null
assert_status 403 "$LAST_STATUS" "GET /api/tickets/{id} other student → 403"
assert_body_contains TICKET_FORBIDDEN "error code TICKET_FORBIDDEN"

http_get "/api/tickets/9999999" "$TOKEN_ITADMIN" >/dev/null
assert_status 404 "$LAST_STATUS" "GET /api/tickets/{bad} → 404"
assert_body_contains TICKET_NOT_FOUND "error code TICKET_NOT_FOUND"

# Assign — SupportStaffPolicy (only ITAdmin today)
http_put "/api/tickets/$TICKET_ID/assign" "$TOKEN_STUDENT1" "{\"assignedToUserId\":$ID_ITADMIN}" >/dev/null
assert_status 403 "$LAST_STATUS" "PUT assign (Student) → 403 (SupportStaffPolicy)"

http_put "/api/tickets/$TICKET_ID/assign" "$TOKEN_ITADMIN" "{\"assignedToUserId\":9999999}" >/dev/null
assert_status 400 "$LAST_STATUS" "PUT assign bad assignee → 400"
assert_body_contains ASSIGNEE_NOT_FOUND "error code ASSIGNEE_NOT_FOUND"

http_put "/api/tickets/$TICKET_ID/assign" "$TOKEN_ITADMIN" "{\"assignedToUserId\":$ID_STUDENT1}" >/dev/null
assert_status 400 "$LAST_STATUS" "PUT assign to non-ITAdmin → 400"
assert_body_contains ASSIGNEE_NOT_ITADMIN "error code ASSIGNEE_NOT_ITADMIN"

http_put "/api/tickets/$TICKET_ID/assign" "$TOKEN_ITADMIN" "{\"assignedToUserId\":$ID_ITADMIN}" >/dev/null
assert_status 200 "$LAST_STATUS" "PUT assign (happy) → 200"

# Resolve
http_put "/api/tickets/$TICKET_ID/resolve" "$TOKEN_ITADMIN" '{"resolutionURI":"https://kb.example/a1","resolutionNote":"reset SSO"}' >/dev/null
assert_status 200 "$LAST_STATUS" "PUT resolve (happy) → 200"

# Re-resolve
http_put "/api/tickets/$TICKET_ID/resolve" "$TOKEN_ITADMIN" '{"resolutionURI":"https://kb.example/a2"}' >/dev/null
assert_status 400 "$LAST_STATUS" "PUT resolve twice → 400"
assert_body_contains INVALID_TICKET_STATUS_TRANSITION "error code INVALID_TICKET_STATUS_TRANSITION"
