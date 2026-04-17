# shellcheck shell=bash
# Auth module — register/login surface. Users are seeded in seed.sh; these are
# contract tests for the endpoints themselves.
log_section "Module 00 — Auth (IAM-01)"
ROLE=anon

# Login wrong password
http_post /api/auth/login "" "{\"username\":\"$U_ITADMIN\",\"password\":\"WrongPassword!\"}" >/dev/null
assert_status 401 "$LAST_STATUS" "Login with wrong password → 401"

# Login unknown user
http_post /api/auth/login "" "{\"username\":\"does_not_exist_$SEED_TS\",\"password\":\"x\"}" >/dev/null
assert_status 401 "$LAST_STATUS" "Login unknown user → 401"

# Register duplicate username
body="{\"username\":\"$U_ITADMIN\",\"email\":\"dup@test.edu\",\"password\":\"$SEED_PWD\",\"fullName\":\"dup\",\"role\":\"Student\"}"
http_post /api/auth/register "" "$body" >/dev/null
assert_status 400 "$LAST_STATUS" "Register duplicate username → 400"

# Register with short password
body="{\"username\":\"short_$SEED_TS\",\"email\":\"s@test.edu\",\"password\":\"123\",\"fullName\":\"x\",\"role\":\"Student\"}"
http_post /api/auth/register "" "$body" >/dev/null
assert_status 400 "$LAST_STATUS" "Register with short password → 400"

# Access protected endpoint without token
http_get /api/users "" >/dev/null
assert_status 401 "$LAST_STATUS" "GET /api/users without token → 401"

# Access with a malformed token
http_get /api/users "not.a.jwt" >/dev/null
assert_status 401 "$LAST_STATUS" "GET /api/users with garbage token → 401"

perf_check "$LAST_MS" GET /api/users "Auth protected endpoint timing"
