# shellcheck shell=bash
log_section "Module 14 — Scholarships (SFB)"
ROLE=Finance

body="{\"studentID\":$STUDENT_ID_1,\"awardType\":\"Merit\",\"amount\":10000.00,\"validFrom\":\"2026-06-01\",\"validTo\":\"2026-12-31\"}"
http_post /api/scholarships "$TOKEN_FINANCE" "$body" >/dev/null
assert_status 201 "$LAST_STATUS" "POST /api/scholarships (Finance) → 201"
export SCHOLARSHIP_ID=$(jget scholarshipID)

# Bad date range
body="{\"studentID\":$STUDENT_ID_1,\"awardType\":\"x\",\"amount\":100,\"validFrom\":\"2027-01-01\",\"validTo\":\"2026-01-01\"}"
http_post /api/scholarships "$TOKEN_FINANCE" "$body" >/dev/null
assert_status 400 "$LAST_STATUS" "POST /api/scholarships bad dates → 400"

# Negative amount
body="{\"studentID\":$STUDENT_ID_1,\"awardType\":\"x\",\"amount\":-100,\"validFrom\":\"2026-06-01\",\"validTo\":\"2026-12-31\"}"
http_post /api/scholarships "$TOKEN_FINANCE" "$body" >/dev/null
assert_status 400 "$LAST_STATUS" "POST /api/scholarships negative amount → 400"

http_get "/api/scholarships/student/$STUDENT_ID_1" "$TOKEN_FINANCE" >/dev/null
assert_status 200 "$LAST_STATUS" "GET /api/scholarships/student/{id} → 200"
