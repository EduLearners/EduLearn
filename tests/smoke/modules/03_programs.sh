# shellcheck shell=bash
log_section "Module 03 — Programs (CCM-01)"
ROLE=ITAdmin

body="{\"name\":\"BTech CS $SEED_TS\",\"departmentID\":1,\"degreeType\":\"Bachelor\",\"requiredCoursesJSON\":\"[]\",\"electivesJSON\":null,\"durationTerms\":8}"
http_post /api/programs "$TOKEN_ITADMIN" "$body" >/dev/null
assert_status 201 "$LAST_STATUS" "POST /api/programs → 201"
export PROGRAM_ID=$(jget programID)
log_info "PROGRAM_ID=$PROGRAM_ID"
perf_check "$LAST_MS" POST /api/programs "Create program"

http_get /api/programs "$TOKEN_ITADMIN" >/dev/null
assert_status 200 "$LAST_STATUS" "GET /api/programs → 200"
perf_check "$LAST_MS" GET /api/programs "List programs"

http_get "/api/programs/$PROGRAM_ID" "$TOKEN_ITADMIN" >/dev/null
assert_status 200 "$LAST_STATUS" "GET /api/programs/{id} → 200"

http_get "/api/programs/9999999" "$TOKEN_ITADMIN" >/dev/null
assert_status 404 "$LAST_STATUS" "GET /api/programs/{bad} → 404"

body2="{\"name\":\"BTech CS Updated $SEED_TS\",\"departmentID\":1,\"degreeType\":\"Bachelor\",\"requiredCoursesJSON\":\"[]\",\"electivesJSON\":null,\"durationTerms\":10}"
http_put "/api/programs/$PROGRAM_ID" "$TOKEN_ITADMIN" "$body2" >/dev/null
assert_status 200 "$LAST_STATUS" "PUT /api/programs/{id} → 200"
