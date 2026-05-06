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

# ── IAM-03 MFA contract assertions ────────────────────────────────────
# Loop the 5 privileged roles. Each was SQL-seeded with MFASecret+MFAEnabled=1
# (see seed.sh _promote with_mfa=1), so /login must hand back an mfa_pending
# challenge, NOT a full session JWT.
log_info "[IAM-03] MFA contract sweep across 5 privileged roles"

for role_user in "ITAdmin:$U_ITADMIN" "Registrar:$U_REGISTRAR" "DeptAdmin:$U_DEPTADMIN" "Finance:$U_FINANCE" "Auditor:$U_AUDITOR"; do
  role_name="${role_user%%:*}"
  user="${role_user##*:}"

  # 1. Privileged login → mfaToken + purpose=mfa_pending (NOT a full JWT)
  http_post /api/auth/login "" "{\"username\":\"$user\",\"password\":\"$SEED_PWD\"}" >/dev/null
  assert_status 200 "$LAST_STATUS" "[IAM-03] Login $role_name → 200"
  mfa_token=$(jget mfaToken)
  full_token=$(jget token)
  if [[ -n "$mfa_token" && -z "$full_token" ]]; then
    log_pass "[IAM-03] Login $role_name returns mfaToken, no full JWT"
  else
    log_fail "[IAM-03] Login $role_name expected mfaToken-only (mfaToken='$mfa_token' token='$full_token')"
  fi
  assert_json_eq purpose "mfa_pending" "[IAM-03] Login $role_name purpose=mfa_pending"

  # 2. mfa_pending token must NOT be accepted on a normal endpoint
  http_get /api/users "$mfa_token" >/dev/null
  assert_status 401 "$LAST_STATUS" "[IAM-03] $role_name mfaToken on GET /api/users → 401"

  # 3. /mfa/verify with WRONG code → 401
  http_post /api/auth/mfa/verify "$mfa_token" '{"code":"000000"}' >/dev/null
  assert_status 401 "$LAST_STATUS" "[IAM-03] $role_name /mfa/verify wrong code → 401"

  # 4. /mfa/verify with CORRECT TOTP from the seeded fixed secret → 200 + full JWT
  code=$(totp_for_secret "$SEED_MFA_SECRET")
  http_post /api/auth/mfa/verify "$mfa_token" "{\"code\":\"$code\"}" >/dev/null
  assert_status 200 "$LAST_STATUS" "[IAM-03] $role_name /mfa/verify correct code → 200"
  resolved_token=$(jget token)
  if [[ -n "$resolved_token" ]]; then
    log_pass "[IAM-03] $role_name /mfa/verify returned full JWT"
  else
    log_fail "[IAM-03] $role_name /mfa/verify returned no token field"
  fi
done

# Negative: Student/Instructor login bypasses MFA — full JWT directly, no mfaToken.
for role_user in "Student:$U_STUDENT1" "Instructor:$U_INSTRUCTOR"; do
  role_name="${role_user%%:*}"
  user="${role_user##*:}"
  http_post /api/auth/login "" "{\"username\":\"$user\",\"password\":\"$SEED_PWD\"}" >/dev/null
  assert_status 200 "$LAST_STATUS" "[IAM-03] Login $role_name (non-privileged) → 200"
  mfa_token=$(jget mfaToken)
  full_token=$(jget token)
  if [[ -z "$mfa_token" && -n "$full_token" ]]; then
    log_pass "[IAM-03] Login $role_name returns full JWT directly (no MFA)"
  else
    log_fail "[IAM-03] Login $role_name expected full-JWT-only (mfaToken='$mfa_token' token='$full_token')"
  fi
done
