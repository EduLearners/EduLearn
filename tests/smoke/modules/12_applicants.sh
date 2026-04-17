# shellcheck shell=bash
log_section "Module 12 — Applicants (SRA-01)"
ROLE=Registrar

body="{\"name\":\"Amit $SEED_TS\",\"dob\":\"2005-03-10\",\"nationalId\":\"NAT-$SEED_TS\",\"contactInfoJSON\":\"{\\\"email\\\":\\\"a@x.com\\\"}\",\"programApplied\":\"BTech CS\",\"documentsURIJSON\":null}"
http_post /api/applicants "$TOKEN_REGISTRAR" "$body" >/dev/null
assert_status 201 "$LAST_STATUS" "POST /api/applicants → 201"
export APPLICANT_ID=$(jget applicantID)

http_get /api/applicants "$TOKEN_REGISTRAR" >/dev/null
assert_status 200 "$LAST_STATUS" "GET /api/applicants → 200"

http_get "/api/applicants/$APPLICANT_ID" "$TOKEN_REGISTRAR" >/dev/null
assert_status 200 "$LAST_STATUS" "GET /api/applicants/{id} → 200"

http_get "/api/applicants/9999999" "$TOKEN_REGISTRAR" >/dev/null
assert_status 404 "$LAST_STATUS" "GET /api/applicants/{bad} → 404"

http_put "/api/applicants/$APPLICANT_ID/status" "$TOKEN_REGISTRAR" '{"status":"UnderReview"}' >/dev/null
assert_status 200 "$LAST_STATUS" "PUT /api/applicants/{id}/status UnderReview → 200"

http_put "/api/applicants/$APPLICANT_ID/status" "$TOKEN_REGISTRAR" '{"status":"Accepted"}' >/dev/null
assert_status 200 "$LAST_STATUS" "PUT /api/applicants/{id}/status Accepted → 200"
