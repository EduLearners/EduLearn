# shellcheck shell=bash
# seed.sh — create one user per role, login, export tokens as env vars.
# Idempotent per-run (usernames carry $SEED_TS suffix). Populates IDs too.

: "${SEED_TS:=$(date +%s)}"
export SEED_TS

# TOTP helper (used by _login_with_mfa for the 5 privileged roles)
# shellcheck source=lib/totp.sh
. "$SMOKE_ROOT/lib/totp.sh"

# Fixed test TOTP secret. Matches DbInitializer.DefaultAdminMfaSecret on the
# backend so smoke tests can compute valid codes for SQL-seeded MFA users.
# This is also written into Users.MFASecret by _promote() for the 5 privileged
# accounts so the smoke harness can compute valid codes at /mfa/verify time.
export SEED_MFA_SECRET='JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP'

# Usernames (exported so modules can reference)
export U_ITADMIN="itadmin_$SEED_TS"
export U_INSTRUCTOR="instructor_$SEED_TS"
export U_REGISTRAR="registrar_$SEED_TS"
export U_DEPTADMIN="deptadmin_$SEED_TS"
export U_FINANCE="finance_$SEED_TS"
export U_AUDITOR="auditor_$SEED_TS"
export U_STUDENT1="student1_$SEED_TS"
export U_STUDENT2="student2_$SEED_TS"

SEED_PWD='Passw0rd!Seed'

_register() {
  local user="$1" role="$2"
  local body="{\"username\":\"$user\",\"email\":\"$user@test.edu\",\"password\":\"$SEED_PWD\",\"fullName\":\"$user\",\"role\":\"$role\"}"
  http_post /api/auth/register "" "$body" >/dev/null
  if [[ "$LAST_STATUS" != "200" ]]; then
    log_fail "seed: register $user/$role (status=$LAST_STATUS)"
    return 1
  fi
}

_login() {
  local user="$1"
  local body="{\"username\":\"$user\",\"password\":\"$SEED_PWD\"}"
  http_post /api/auth/login "" "$body" >/dev/null
  if [[ "$LAST_STATUS" != "200" ]]; then
    log_fail "seed: login $user (status=$LAST_STATUS)"
    return 1
  fi
  jget token
}

# IAM-03: privileged login is two-step.
#   Login → if response carries `mfaToken` (privileged path), compute TOTP
#   from $SEED_MFA_SECRET, POST /mfa/verify with bearer=mfaToken, return
#   the resulting full-session JWT.
#   If response carries `token` (non-privileged), pass it straight back.
# Safe to call for any role — Student/Instructor get the single-call path.
_login_with_mfa() {
  local user="$1"
  local body="{\"username\":\"$user\",\"password\":\"$SEED_PWD\"}"
  http_post /api/auth/login "" "$body" >/dev/null
  if [[ "$LAST_STATUS" != "200" ]]; then
    log_fail "seed: login $user (status=$LAST_STATUS)"
    return 1
  fi
  local mfa_token full_token
  mfa_token=$(jget mfaToken)
  full_token=$(jget token)
  if [[ -n "$mfa_token" ]]; then
    local code
    code=$(totp_for_secret "$SEED_MFA_SECRET")
    http_post /api/auth/mfa/verify "$mfa_token" "{\"code\":\"$code\"}" >/dev/null
    if [[ "$LAST_STATUS" != "200" ]]; then
      log_fail "seed: mfa/verify $user (status=$LAST_STATUS, code=$code)"
      return 1
    fi
    jget token
  else
    echo "$full_token"
  fi
}

# HARDENING (C-26): POST /api/auth/register now forces Role=Student server-side (anonymous
# users cannot self-elevate). Our smoke harness needs privileged users for role-gated tests,
# so we bootstrap them via SQL — register gives Student, then we UPDATE the role in-place,
# then we re-login to get a JWT with the new role claim baked in.
#
# IAM-03: for the 5 privileged roles we ALSO seed MFASecret + MFAEnabled=1 in the same
# UPDATE so the re-login path goes through /mfa/verify with a known code.
_promote() {
  local user="$1" role="$2" with_mfa="${3:-0}"
  if [[ "$with_mfa" == "1" ]]; then
    sqlcmd -S '(localdb)\MSSQLLocalDB' -d EduLearnDb -h -1 -W \
      -Q "SET NOCOUNT ON; UPDATE Users SET Role='$role', MFASecret='$SEED_MFA_SECRET', MFAEnabled=1 WHERE Username='$user';" >/dev/null 2>&1
  else
    sqlcmd -S '(localdb)\MSSQLLocalDB' -d EduLearnDb -h -1 -W \
      -Q "SET NOCOUNT ON; UPDATE Users SET Role='$role' WHERE Username='$user';" >/dev/null 2>&1
  fi
}

seed_users() {
  log_section "Seeding test users (SEED_TS=$SEED_TS)"
  _register "$U_ITADMIN"    ITAdmin    || return 1
  _register "$U_INSTRUCTOR" Instructor || return 1
  _register "$U_REGISTRAR"  Registrar  || return 1
  _register "$U_DEPTADMIN"  DeptAdmin  || return 1
  _register "$U_FINANCE"    Finance    || return 1
  _register "$U_AUDITOR"    Auditor    || return 1
  _register "$U_STUDENT1"   Student    || return 1
  _register "$U_STUDENT2"   Student    || return 1

  # C-26 forces all registrations to Student. Promote the 6 privileged accounts via SQL,
  # then re-login so the JWT carries the correct Role claim.
  # IAM-03: for the 5 MFA-gated roles, also seed MFASecret+MFAEnabled in the same UPDATE.
  # Instructor stays a single-call login (no MFA).
  _promote "$U_ITADMIN"    ITAdmin    1
  _promote "$U_INSTRUCTOR" Instructor 0
  _promote "$U_REGISTRAR"  Registrar  1
  _promote "$U_DEPTADMIN"  DeptAdmin  1
  _promote "$U_FINANCE"    Finance    1
  _promote "$U_AUDITOR"    Auditor    1

  # 5 privileged roles → MFA-aware login. Instructor + Students → plain login.
  export TOKEN_ITADMIN=$(_login_with_mfa "$U_ITADMIN")
  export TOKEN_INSTRUCTOR=$(_login "$U_INSTRUCTOR")
  export TOKEN_REGISTRAR=$(_login_with_mfa "$U_REGISTRAR")
  export TOKEN_DEPTADMIN=$(_login_with_mfa "$U_DEPTADMIN")
  export TOKEN_FINANCE=$(_login_with_mfa "$U_FINANCE")
  export TOKEN_AUDITOR=$(_login_with_mfa "$U_AUDITOR")
  export TOKEN_STUDENT1=$(_login "$U_STUDENT1")
  export TOKEN_STUDENT2=$(_login "$U_STUDENT2")

  # Collect user IDs via /api/users (ITAdmin reads the full list)
  http_get /api/users "$TOKEN_ITADMIN" >/dev/null
  export ID_ITADMIN=$(find_in_array_by username "$U_ITADMIN" userID)
  export ID_INSTRUCTOR=$(find_in_array_by username "$U_INSTRUCTOR" userID)
  export ID_REGISTRAR=$(find_in_array_by username "$U_REGISTRAR" userID)
  export ID_DEPTADMIN=$(find_in_array_by username "$U_DEPTADMIN" userID)
  export ID_FINANCE=$(find_in_array_by username "$U_FINANCE" userID)
  export ID_AUDITOR=$(find_in_array_by username "$U_AUDITOR" userID)
  export ID_STUDENT1=$(find_in_array_by username "$U_STUDENT1" userID)
  export ID_STUDENT2=$(find_in_array_by username "$U_STUDENT2" userID)

  log_info "IDs: ITAdmin=$ID_ITADMIN Instructor=$ID_INSTRUCTOR Registrar=$ID_REGISTRAR DeptAdmin=$ID_DEPTADMIN Finance=$ID_FINANCE Auditor=$ID_AUDITOR Student1=$ID_STUDENT1 Student2=$ID_STUDENT2"
  log_pass "Seeded 8 users across 7 roles"
}

# Token helper — return the token for a role string.
token_for() {
  case "$1" in
    ITAdmin)    echo "$TOKEN_ITADMIN" ;;
    Instructor) echo "$TOKEN_INSTRUCTOR" ;;
    Registrar)  echo "$TOKEN_REGISTRAR" ;;
    DeptAdmin)  echo "$TOKEN_DEPTADMIN" ;;
    Finance)    echo "$TOKEN_FINANCE" ;;
    Auditor)    echo "$TOKEN_AUDITOR" ;;
    Student|Student1) echo "$TOKEN_STUDENT1" ;;
    Student2)   echo "$TOKEN_STUDENT2" ;;
    *) echo "" ;;
  esac
}
