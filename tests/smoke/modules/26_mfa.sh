# shellcheck shell=bash
# 26_mfa.sh — IAM-03 MFA end-to-end module.
#
# Covers the enrollment lifecycle for a freshly-minted privileged user
# (separate from the seed-pre-enrolled accounts exercised in 00_auth.sh):
#   - First-login enrollment-mode pending token + Message hint
#   - /mfa/setup secret + otpauth URI
#   - /mfa/verify with TOTP from returned secret → full JWT
#   - Subsequent login → challenge-mode pending token
#   - /mfa/setup rejected after enrollment (409)
#   - Wrong code rejected at /verify (401)
#   - Admin reset clears state; next login is enrollment-mode again
#   - Notification of reset visible after re-enrollment
#   - Negative: Student/Instructor still get full JWT directly (sanity)
log_section "Module 26 — MFA (IAM-03)"
ROLE=ITAdmin

MFA_USER="mfa_test_reg_$SEED_TS"
MFA_PWD="$SEED_PWD"

# 1. ITAdmin creates a fresh Registrar via /api/users (privileged creation honors role,
#    unlike /auth/register which forces Student per C-26).
body="{\"username\":\"$MFA_USER\",\"fullName\":\"MFA Test Registrar\",\"email\":\"$MFA_USER@test.edu\",\"role\":\"Registrar\",\"password\":\"$MFA_PWD\"}"
http_post /api/users "$TOKEN_ITADMIN" "$body" >/dev/null
assert_status 201 "$LAST_STATUS" "[IAM-03] POST /api/users create fresh Registrar → 201"
MFA_USER_ID=$(jget userID)
if [[ -z "$MFA_USER_ID" ]]; then
  log_fail "[IAM-03] could not extract userID from create response — aborting module"
  return 0 2>/dev/null || true
fi

# 2. First login → mfa_pending in enrollment mode (MFAEnabled=false on a fresh user).
ROLE=anon
http_post /api/auth/login "" "{\"username\":\"$MFA_USER\",\"password\":\"$MFA_PWD\"}" >/dev/null
assert_status 200 "$LAST_STATUS" "[IAM-03] First login (Registrar, MFAEnabled=false) → 200"
MFA_PENDING=$(jget mfaToken)
if [[ -n "$MFA_PENDING" ]]; then
  log_pass "[IAM-03] First login returns mfaToken (enrollment-mode)"
else
  log_fail "[IAM-03] First login missing mfaToken"
fi
assert_json_eq purpose "mfa_pending" "[IAM-03] First login purpose=mfa_pending"
ENROLL_MSG=$(jget message)
if [[ -n "$ENROLL_MSG" ]] && echo "$ENROLL_MSG" | grep -qi "enrollment"; then
  log_pass "[IAM-03] First login message mentions enrollment ('$ENROLL_MSG')"
else
  log_fail "[IAM-03] First login message should mention 'enrollment' (got '$ENROLL_MSG')"
fi

# 3. /mfa/setup returns secret + otpauthUri. No body required.
http_post /api/auth/mfa/setup "$MFA_PENDING" '{}' >/dev/null
assert_status 200 "$LAST_STATUS" "[IAM-03] POST /api/auth/mfa/setup → 200"
ENROLL_SECRET=$(jget secret)
ENROLL_URI=$(jget otpauthUri)
if [[ -n "$ENROLL_SECRET" ]]; then
  log_pass "[IAM-03] /mfa/setup returned non-empty secret"
else
  log_fail "[IAM-03] /mfa/setup returned no secret"
fi
if [[ "$ENROLL_URI" == otpauth://totp/* ]]; then
  log_pass "[IAM-03] /mfa/setup otpauthUri starts with otpauth://totp/"
else
  log_fail "[IAM-03] /mfa/setup otpauthUri malformed (got '$ENROLL_URI')"
fi

# 4. Compute TOTP from returned secret → /mfa/verify → full JWT (and MFAEnabled flips true).
ENROLL_CODE=$(totp_for_secret "$ENROLL_SECRET")
http_post /api/auth/mfa/verify "$MFA_PENDING" "{\"code\":\"$ENROLL_CODE\"}" >/dev/null
assert_status 200 "$LAST_STATUS" "[IAM-03] /mfa/verify with TOTP from setup secret → 200"
MFA_FULL_TOKEN=$(jget token)
if [[ -n "$MFA_FULL_TOKEN" ]]; then
  log_pass "[IAM-03] /mfa/verify enrollment returned full JWT"
else
  log_fail "[IAM-03] /mfa/verify enrollment did not return token field"
fi

# 5. Subsequent login → mfa_pending in challenge mode (MFAEnabled now true).
http_post /api/auth/login "" "{\"username\":\"$MFA_USER\",\"password\":\"$MFA_PWD\"}" >/dev/null
assert_status 200 "$LAST_STATUS" "[IAM-03] Subsequent login (post-enrollment) → 200"
CHALLENGE_PENDING=$(jget mfaToken)
if [[ -n "$CHALLENGE_PENDING" ]]; then
  log_pass "[IAM-03] Subsequent login returns mfaToken (challenge-mode)"
else
  log_fail "[IAM-03] Subsequent login missing mfaToken"
fi
CHALLENGE_MSG=$(jget message)
if [[ -n "$CHALLENGE_MSG" ]] && echo "$CHALLENGE_MSG" | grep -qi "code required"; then
  log_pass "[IAM-03] Subsequent login message mentions 'code required' ('$CHALLENGE_MSG')"
else
  log_fail "[IAM-03] Subsequent login message should mention 'code required' (got '$CHALLENGE_MSG')"
fi

# 6. /mfa/setup rejected when MFAEnabled=true → 409.
http_post /api/auth/mfa/setup "$CHALLENGE_PENDING" '{}' >/dev/null
assert_status 409 "$LAST_STATUS" "[IAM-03] /mfa/setup after enrollment → 409 (already enrolled)"

# 7. /mfa/verify with wrong code → 401.
http_post /api/auth/mfa/verify "$CHALLENGE_PENDING" '{"code":"000000"}' >/dev/null
assert_status 401 "$LAST_STATUS" "[IAM-03] /mfa/verify with wrong code → 401"

# 8. Admin reset (TOKEN_ITADMIN is already a full JWT — seed.sh ran it through MFA).
http_post "/api/users/$MFA_USER_ID/mfa/reset" "$TOKEN_ITADMIN" "" >/dev/null
assert_status 204 "$LAST_STATUS" "[IAM-03] POST /api/users/{id}/mfa/reset (ITAdmin) → 204"

# 9. After reset → enrollment-mode again (secret cleared, MFAEnabled=false).
http_post /api/auth/login "" "{\"username\":\"$MFA_USER\",\"password\":\"$MFA_PWD\"}" >/dev/null
assert_status 200 "$LAST_STATUS" "[IAM-03] Login after admin reset → 200"
RESET_PENDING=$(jget mfaToken)
RESET_MSG=$(jget message)
if [[ -n "$RESET_PENDING" ]] && echo "$RESET_MSG" | grep -qi "enrollment"; then
  log_pass "[IAM-03] Post-reset login back in enrollment mode ('$RESET_MSG')"
else
  log_fail "[IAM-03] Post-reset login should be enrollment-mode (mfaToken='$RESET_PENDING' message='$RESET_MSG')"
fi

# 10. Re-enroll, then read /api/notifications with the user's full JWT and confirm the reset
#     notification is present. NotificationService.NotifyAsync is fired by the reset endpoint.
http_post /api/auth/mfa/setup "$RESET_PENDING" '{}' >/dev/null
assert_status 200 "$LAST_STATUS" "[IAM-03] /mfa/setup after reset → 200 (re-enroll)"
REENROLL_SECRET=$(jget secret)
REENROLL_CODE=$(totp_for_secret "$REENROLL_SECRET")
http_post /api/auth/mfa/verify "$RESET_PENDING" "{\"code\":\"$REENROLL_CODE\"}" >/dev/null
assert_status 200 "$LAST_STATUS" "[IAM-03] /mfa/verify after re-enroll → 200"
REENROLL_FULL=$(jget token)
if [[ -z "$REENROLL_FULL" ]]; then
  log_fail "[IAM-03] re-enroll did not return full JWT — cannot check notifications"
else
  http_get "/api/notifications?page=1&pageSize=50" "$REENROLL_FULL" >/dev/null
  assert_status 200 "$LAST_STATUS" "[IAM-03] GET /api/notifications (re-enrolled user) → 200"
  # Hunt for an MFA-mentioning notification anywhere in the response body.
  if grep -qi "mfa" "$BODY_FILE" 2>/dev/null; then
    log_pass "[IAM-03] /api/notifications contains an MFA-related entry after admin reset"
  else
    log_fail "[IAM-03] /api/notifications has no MFA-related entry after admin reset"
  fi
fi

# 11. Negative — Student already has full JWT from seed; sanity check it works on a normal endpoint.
#     (Confirms TOKEN_STUDENT1 is a real session JWT, not a leaked pending token.)
http_get "/api/users/$ID_STUDENT1" "$TOKEN_STUDENT1" >/dev/null
assert_status 200 "$LAST_STATUS" "[IAM-03] Student full JWT works on /api/users/{self} (no MFA gate)"
