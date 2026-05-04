# shellcheck shell=bash
log_section "Module 23 — Transcripts (SRA-03)"

# Generate transcript — Registrar
ROLE=Registrar
http_post "/api/transcripts/generate/$STUDENT_ID_1" "$TOKEN_REGISTRAR" "" >/dev/null
assert_status 201 "$LAST_STATUS" "POST /api/transcripts/generate/{studentId} → 201"
export TRANSCRIPT_ID=$(jget transcriptID)
log_info "TRANSCRIPT_ID=$TRANSCRIPT_ID"
assert_body_contains "Draft" "Transcript status is Draft"

# Get transcript by ID
http_get "/api/transcripts/$TRANSCRIPT_ID" "$TOKEN_REGISTRAR" >/dev/null
assert_status 200 "$LAST_STATUS" "GET /api/transcripts/{id} → 200"
assert_body_contains "entriesJSON" "Response has entriesJSON"

# Get transcripts by student
http_get "/api/transcripts/student/$STUDENT_ID_1" "$TOKEN_REGISTRAR" >/dev/null
assert_status 200 "$LAST_STATUS" "GET /api/transcripts/student/{studentId} → 200"

# 404 for unknown student
http_post "/api/transcripts/generate/9999999" "$TOKEN_REGISTRAR" "" >/dev/null
assert_status 404 "$LAST_STATUS" "POST /api/transcripts/generate/{bad} → 404"

# 404 for unknown transcript
http_get "/api/transcripts/9999999" "$TOKEN_REGISTRAR" >/dev/null
assert_status 404 "$LAST_STATUS" "GET /api/transcripts/{bad} → 404"

# Publish transcript (Draft → Issued)
http_put "/api/transcripts/$TRANSCRIPT_ID/publish" "$TOKEN_REGISTRAR" "" >/dev/null
assert_status 200 "$LAST_STATUS" "PUT /api/transcripts/{id}/publish → 200"
assert_body_contains "Issued" "Transcript status changed to Issued"

# Double publish — should fail (already Issued)
http_put "/api/transcripts/$TRANSCRIPT_ID/publish" "$TOKEN_REGISTRAR" "" >/dev/null
assert_status 400 "$LAST_STATUS" "PUT /api/transcripts/{id}/publish (already Issued) → 400"
assert_body_contains "INVALID_TRANSCRIPT_STATUS" "error code INVALID_TRANSCRIPT_STATUS"

# Finance cannot generate transcripts
ROLE=Finance
http_post "/api/transcripts/generate/$STUDENT_ID_1" "$TOKEN_FINANCE" "" >/dev/null
assert_status 403 "$LAST_STATUS" "POST /api/transcripts/generate (Finance) → 403"
