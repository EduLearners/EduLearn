# shellcheck shell=bash
log_section "Module 07 — Sections (ETS-02)"
ROLE=ITAdmin

# Capacity-2 section so we can test waitlist/drop downstream
body="{\"courseID\":$COURSE_ID_1,\"term\":\"Fall 2026\",\"instructorID\":$ID_INSTRUCTOR,\"roomID\":$ROOM_ID,\"capacity\":2,\"scheduleJSON\":\"[]\"}"
http_post /api/sections "$TOKEN_ITADMIN" "$body" >/dev/null
assert_status 201 "$LAST_STATUS" "POST /api/sections (cap=2) → 201"
export SECTION_ID_SMALL=$(jget sectionID)
log_info "SECTION_ID_SMALL=$SECTION_ID_SMALL"

body="{\"courseID\":$COURSE_ID_2,\"term\":\"Fall 2026\",\"instructorID\":$ID_INSTRUCTOR,\"roomID\":null,\"capacity\":60,\"scheduleJSON\":null}"
http_post /api/sections "$TOKEN_ITADMIN" "$body" >/dev/null
assert_status 201 "$LAST_STATUS" "POST /api/sections (cap=60) → 201"
export SECTION_ID_BIG=$(jget sectionID)

# Invalid instructor role
body="{\"courseID\":$COURSE_ID_1,\"term\":\"Fall 2026\",\"instructorID\":$ID_STUDENT1,\"capacity\":10}"
http_post /api/sections "$TOKEN_ITADMIN" "$body" >/dev/null
assert_status 400 "$LAST_STATUS" "POST /api/sections (Student as instructor) → 400"
assert_body_contains INVALID_INSTRUCTOR_ROLE "error code INVALID_INSTRUCTOR_ROLE"

http_get "/api/sections/$SECTION_ID_SMALL" "$TOKEN_ITADMIN" >/dev/null
assert_status 200 "$LAST_STATUS" "GET /api/sections/{id} → 200"

http_get "/api/sections/9999999" "$TOKEN_ITADMIN" >/dev/null
assert_status 404 "$LAST_STATUS" "GET /api/sections/{bad} → 404"

http_get "/api/sections/course/$COURSE_ID_1/term/Fall%202026" "$TOKEN_ITADMIN" >/dev/null
assert_status 200 "$LAST_STATUS" "GET /api/sections/course/{c}/term/{t} → 200"
perf_check "$LAST_MS" GET /api/sections/course/$COURSE_ID_1/term/Fall%202026 "Sections by course/term (N+1 known — see verification report M-4)"
