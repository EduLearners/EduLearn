# shellcheck shell=bash
log_section "Module 02 — Users (IAM-02)"

# UserViewPolicy: ITAdmin + Registrar allowed; others denied.
ROLE=ITAdmin
http_get /api/users "$TOKEN_ITADMIN" >/dev/null
assert_status 200 "$LAST_STATUS" "GET /api/users (ITAdmin) → 200"
perf_check "$LAST_MS" GET /api/users "List users (ITAdmin)"

ROLE=Registrar
http_get /api/users "$TOKEN_REGISTRAR" >/dev/null
assert_status 200 "$LAST_STATUS" "GET /api/users (Registrar) → 200"

ROLE=Student
http_get /api/users "$TOKEN_STUDENT1" >/dev/null
assert_status 403 "$LAST_STATUS" "GET /api/users (Student) → 403 (UserViewPolicy)"

# GET by id
ROLE=ITAdmin
http_get "/api/users/$ID_ITADMIN" "$TOKEN_ITADMIN" >/dev/null
assert_status 200 "$LAST_STATUS" "GET /api/users/{id} (self) → 200"

http_get "/api/users/9999999" "$TOKEN_ITADMIN" >/dev/null
assert_status 404 "$LAST_STATUS" "GET /api/users/{bad} → 404"
assert_body_contains USER_NOT_FOUND "error code USER_NOT_FOUND"

# HARDENING (F-1): Student can read OWN profile, not another student's
ROLE=Student
http_get "/api/users/$ID_STUDENT1" "$TOKEN_STUDENT1" >/dev/null
assert_status 200 "$LAST_STATUS" "GET own user (Student) → 200 [F-1]"

http_get "/api/users/$ID_STUDENT2" "$TOKEN_STUDENT1" >/dev/null
assert_status 403 "$LAST_STATUS" "GET other user (Student) → 403 [F-1]"

# HARDENING (F-2): PRD says any user may update OWN profile; only ITAdmin may update others.
body="{\"fullName\":\"Self Updated $SEED_TS\",\"email\":\"self_$SEED_TS@test.edu\",\"phone\":null}"
http_put "/api/users/$ID_STUDENT1" "$TOKEN_STUDENT1" "$body" >/dev/null
assert_status 200 "$LAST_STATUS" "PUT own user (Student) → 200 [F-2]"

# Student cannot update someone else's profile
body2="{\"fullName\":\"hijack\",\"email\":\"hijack_$SEED_TS@test.edu\",\"phone\":null}"
http_put "/api/users/$ID_STUDENT2" "$TOKEN_STUDENT1" "$body2" >/dev/null
assert_status 403 "$LAST_STATUS" "PUT other user (Student) → 403 [F-2]"
assert_body_contains USER_FORBIDDEN "error code USER_FORBIDDEN"

# ITAdmin can update anyone
body3="{\"fullName\":\"Admin Edit $SEED_TS\",\"email\":\"adm_$SEED_TS@test.edu\",\"phone\":null}"
http_put "/api/users/$ID_STUDENT1" "$TOKEN_ITADMIN" "$body3" >/dev/null
assert_status 200 "$LAST_STATUS" "PUT user as ITAdmin → 200"

# Status update
http_put "/api/users/$ID_STUDENT2/status" "$TOKEN_ITADMIN" '{"status":"Suspended"}' >/dev/null
assert_status 200 "$LAST_STATUS" "PUT user status → 200"
# Revert
http_put "/api/users/$ID_STUDENT2/status" "$TOKEN_ITADMIN" '{"status":"Active"}' >/dev/null
assert_status 200 "$LAST_STATUS" "PUT user status revert → 200"

# Create user via admin endpoint (distinct from /auth/register)
body="{\"username\":\"adm_created_$SEED_TS\",\"fullName\":\"Admin Created\",\"email\":\"ac_$SEED_TS@test.edu\",\"role\":\"Student\",\"password\":\"$SEED_PWD\"}"
http_post /api/users "$TOKEN_ITADMIN" "$body" >/dev/null
assert_status 201 "$LAST_STATUS" "POST /api/users (ITAdmin) → 201"

# Duplicate email
body="{\"username\":\"adm_created2_$SEED_TS\",\"fullName\":\"x\",\"email\":\"ac_$SEED_TS@test.edu\",\"role\":\"Student\",\"password\":\"$SEED_PWD\"}"
http_post /api/users "$TOKEN_ITADMIN" "$body" >/dev/null
assert_status 409 "$LAST_STATUS" "POST /api/users duplicate email → 409"

http_post /api/users "$TOKEN_STUDENT1" "$body" >/dev/null
assert_status 403 "$LAST_STATUS" "POST /api/users as Student → 403 (AdminPolicy)"
