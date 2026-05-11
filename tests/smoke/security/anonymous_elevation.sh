# shellcheck shell=bash
# security/anonymous_elevation.sh — C-26 regression
#
# Anonymous register with role=ITAdmin must NOT produce an ITAdmin account.
# The server must ignore dto.Role and force Role=Student.
log_section "Security regression — C-26 anonymous ITAdmin self-registration"

EV_USER="evil_$SEED_TS"
body="{\"username\":\"$EV_USER\",\"email\":\"$EV_USER@t.io\",\"password\":\"Passw0rd!\",\"fullName\":\"Evil\",\"role\":\"ITAdmin\"}"

http_post /api/auth/register "" "$body" >/dev/null
assert_status 200 "$LAST_STATUS" "[C-26] Anonymous register (role=ITAdmin in body) → 200"

# Log in and inspect the token payload's role claim
http_post /api/auth/login "" "{\"username\":\"$EV_USER\",\"password\":\"Passw0rd!\"}" >/dev/null
assert_status 200 "$LAST_STATUS" "[C-26] Login after register → 200"
role=$(jget role)
if [[ "$role" == "Student" ]]; then
  log_pass "[C-26] Server forced Role=Student (got '$role') — privilege-escalation via register blocked"
else
  log_fail "[C-26] Role escaped downgrade: got '$role' (expected 'Student'). Anonymous caller got $role — CRITICAL"
fi
