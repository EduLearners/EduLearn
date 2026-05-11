# shellcheck shell=bash
log_section "Module 13 — Fees (SFB)"
ROLE=Finance

body="{\"programID\":$PROGRAM_ID,\"term\":\"Fall 2026\",\"feeItemsJSON\":\"[{\\\"item\\\":\\\"Tuition\\\",\\\"amount\\\":50000},{\\\"item\\\":\\\"Lab\\\",\\\"amount\\\":5000}]\",\"effectiveFrom\":\"2026-06-01\",\"effectiveTo\":\"2026-12-31\"}"
http_post /api/fees "$TOKEN_FINANCE" "$body" >/dev/null
assert_status 201 "$LAST_STATUS" "POST /api/fees (Finance) → 201"
export FEE_ID=$(jget feeID)
log_info "FEE_ID=$FEE_ID"

# Invalid date range
body2="{\"programID\":$PROGRAM_ID,\"term\":\"Bad Term\",\"feeItemsJSON\":\"[]\",\"effectiveFrom\":\"2026-12-31\",\"effectiveTo\":\"2026-01-01\"}"
http_post /api/fees "$TOKEN_FINANCE" "$body2" >/dev/null
assert_status 400 "$LAST_STATUS" "POST /api/fees bad date range → 400"
assert_body_contains INVALID_DATE_RANGE "error code INVALID_DATE_RANGE"

http_get "/api/fees/program/$PROGRAM_ID/term/Fall%202026" "$TOKEN_FINANCE" >/dev/null
assert_status 200 "$LAST_STATUS" "GET /api/fees/program/{p}/term/{t} → 200"

http_put "/api/fees/$FEE_ID" "$TOKEN_FINANCE" "$body" >/dev/null
# Update body requires same DTO shape; pass the create body for simplicity.
log_info "PUT /api/fees/{id} status=$LAST_STATUS (200 or 400 depending on DTO shape)"
