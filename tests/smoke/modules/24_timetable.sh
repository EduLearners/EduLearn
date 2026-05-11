# shellcheck shell=bash
log_section "Module 24 — Timetable (ETS-03)"

# Create a section with proper schedule JSON for conflict testing
ROLE=ITAdmin
body="{\"courseID\":$COURSE_ID_1,\"term\":\"Spring 2027\",\"instructorID\":$ID_INSTRUCTOR,\"roomID\":$ROOM_ID,\"capacity\":30,\"scheduleJSON\":\"{\\\"days\\\":\\\"Mon-Wed-Fri\\\",\\\"time\\\":\\\"10:00-11:00\\\"}\"}"
http_post /api/sections "$TOKEN_ITADMIN" "$body" >/dev/null
assert_status 201 "$LAST_STATUS" "POST /api/sections (timetable test, schedule MWF 10-11) → 201"
export TT_SECTION_1=$(jget sectionID)
log_info "TT_SECTION_1=$TT_SECTION_1"

# Create a conflicting section (same days, overlapping time)
body="{\"courseID\":$COURSE_ID_2,\"term\":\"Spring 2027\",\"instructorID\":$ID_INSTRUCTOR,\"roomID\":null,\"capacity\":30,\"scheduleJSON\":\"{\\\"days\\\":\\\"Mon-Wed-Fri\\\",\\\"time\\\":\\\"10:30-11:30\\\"}\"}"
http_post /api/sections "$TOKEN_ITADMIN" "$body" >/dev/null
assert_status 201 "$LAST_STATUS" "POST /api/sections (conflicting MWF 10:30-11:30) → 201"
export TT_SECTION_CONFLICT=$(jget sectionID)

# Create a non-conflicting section (different days)
body="{\"courseID\":$COURSE_ID_2,\"term\":\"Spring 2027\",\"instructorID\":$ID_INSTRUCTOR,\"roomID\":null,\"capacity\":30,\"scheduleJSON\":\"{\\\"days\\\":\\\"Tue-Thu\\\",\\\"time\\\":\\\"14:00-15:30\\\"}\"}"
http_post /api/sections "$TOKEN_ITADMIN" "$body" >/dev/null
assert_status 201 "$LAST_STATUS" "POST /api/sections (no conflict TTh 14-15:30) → 201"
export TT_SECTION_SAFE=$(jget sectionID)

# Enroll student 1 in the first timetable section
ROLE=Registrar
body="{\"studentID\":$STUDENT_ID_1,\"sectionID\":$TT_SECTION_1}"
http_post /api/enrollment/enroll "$TOKEN_REGISTRAR" "$body" >/dev/null
assert_status 201 "$LAST_STATUS" "Enroll Student 1 in timetable section → 201"

# View timetable for student 1 in Spring 2027
ROLE=Registrar
http_get "/api/timetable/student/$STUDENT_ID_1/Spring%202027" "$TOKEN_REGISTRAR" >/dev/null
assert_status 200 "$LAST_STATUS" "GET /api/timetable/student/{id}/{term} → 200"
assert_body_contains "totalCredits" "Response has totalCredits"
assert_body_contains "entries" "Response has entries"

# Validate conflict — SHOULD detect conflict
http_post "/api/timetable/validate-section?studentId=$STUDENT_ID_1&sectionId=$TT_SECTION_CONFLICT" "$TOKEN_REGISTRAR" "" >/dev/null
assert_status 200 "$LAST_STATUS" "POST /api/timetable/validate-section (conflict) → 200"
assert_json_eq hasConflict true "Schedule conflict detected"

# Validate no conflict — different days
http_post "/api/timetable/validate-section?studentId=$STUDENT_ID_1&sectionId=$TT_SECTION_SAFE" "$TOKEN_REGISTRAR" "" >/dev/null
assert_status 200 "$LAST_STATUS" "POST /api/timetable/validate-section (no conflict) → 200"
assert_json_eq hasConflict false "No schedule conflict"

# 404 for unknown student
http_get "/api/timetable/student/9999999/Fall%202026" "$TOKEN_REGISTRAR" >/dev/null
assert_status 404 "$LAST_STATUS" "GET /api/timetable/student/{bad}/{term} → 404"

# 404 for unknown section in conflict check
http_post "/api/timetable/validate-section?studentId=$STUDENT_ID_1&sectionId=9999999" "$TOKEN_REGISTRAR" "" >/dev/null
assert_status 404 "$LAST_STATUS" "POST /api/timetable/validate-section (bad section) → 404"
