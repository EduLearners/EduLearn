# shellcheck shell=bash
# security/finance_bypass.sh
#
# Regression tests for the 5 security blockers identified in
# docs/CODE-REVIEW-VERIFICATION.md (findings C-1 through C-5).
#
# **Expected: these are RED against current main.** Each test describes the
# vulnerability, the fix that must land, and what a green result means.
#
# When the SFB and Reports controllers are locked down with FinancePolicy /
# Roles = "Auditor,ITAdmin" and the ownership + JWT-claim changes are in,
# every test below turns green and the suite becomes the proof-of-fix artifact.

log_section "Security regressions — 5 blockers from CODE-REVIEW-VERIFICATION"

# We use STUDENT1's token throughout — the exploit surface is "any authenticated Student".
TK="$TOKEN_STUDENT1"

# ───────────────────────────────────────────────────────────────────
# C-1.A  Student should not be able to self-award a scholarship
# ───────────────────────────────────────────────────────────────────
body="{\"studentID\":$STUDENT_ID_1,\"awardType\":\"MaliciousMerit\",\"amount\":999999.00,\"validFrom\":\"2026-06-01\",\"validTo\":\"2026-12-31\"}"
http_post /api/scholarships "$TK" "$body" >/dev/null
if [[ "$LAST_STATUS" == "403" ]]; then
  log_pass "[C-1.A] Student → POST /api/scholarships → 403 (FinancePolicy enforced)"
else
  log_fail "[C-1.A] Student can POST /api/scholarships (status=$LAST_STATUS — expected 403). SFB bypass OPEN."
fi

# ───────────────────────────────────────────────────────────────────
# C-1.B  Student should not generate invoices
# ───────────────────────────────────────────────────────────────────
body="{\"studentID\":$STUDENT_ID_1,\"term\":\"Fall 2026\",\"dueDate\":\"2026-08-15\"}"
http_post /api/invoices/generate "$TK" "$body" >/dev/null
if [[ "$LAST_STATUS" == "403" ]]; then
  log_pass "[C-1.B] Student → POST /api/invoices/generate → 403 (FinancePolicy enforced)"
else
  log_fail "[C-1.B] Student can POST /api/invoices/generate (status=$LAST_STATUS — expected 403). SFB bypass OPEN."
fi

# ───────────────────────────────────────────────────────────────────
# C-1.C  Student should not record payments
# ───────────────────────────────────────────────────────────────────
body="{\"invoiceID\":$INVOICE_ID,\"amount\":0.01,\"method\":\"Cash\"}"
http_post /api/payments "$TK" "$body" >/dev/null
if [[ "$LAST_STATUS" == "403" ]]; then
  log_pass "[C-1.C] Student → POST /api/payments → 403 (FinancePolicy enforced)"
else
  log_fail "[C-1.C] Student can POST /api/payments (status=$LAST_STATUS — expected 403). SFB bypass OPEN."
fi

# ───────────────────────────────────────────────────────────────────
# C-1.D  Student should not create Fee Schedules
# ───────────────────────────────────────────────────────────────────
body="{\"programID\":$PROGRAM_ID,\"term\":\"Fall 2026\",\"feeItemsJSON\":\"[]\",\"effectiveFrom\":\"2026-06-01\",\"effectiveTo\":\"2026-12-31\"}"
http_post /api/fees "$TK" "$body" >/dev/null
if [[ "$LAST_STATUS" == "403" ]]; then
  log_pass "[C-1.D] Student → POST /api/fees → 403 (FinancePolicy enforced)"
else
  log_fail "[C-1.D] Student can POST /api/fees (status=$LAST_STATUS — expected 403). SFB bypass OPEN."
fi

# ───────────────────────────────────────────────────────────────────
# C-2  Student should not generate or read reports
# ───────────────────────────────────────────────────────────────────
body="{\"scope\":\"Enrollment\",\"parametersJSON\":null,\"generatedByFK\":$ID_STUDENT1}"
http_post /api/reports/generate "$TK" "$body" >/dev/null
if [[ "$LAST_STATUS" == "403" ]]; then
  log_pass "[C-2.A] Student → POST /api/reports/generate → 403"
else
  log_fail "[C-2.A] Student can POST /api/reports/generate (status=$LAST_STATUS — expected 403). Reports OPEN."
fi

http_get /api/reports "$TK" >/dev/null
if [[ "$LAST_STATUS" == "403" ]]; then
  log_pass "[C-2.B] Student → GET /api/reports → 403"
else
  log_fail "[C-2.B] Student can GET /api/reports (status=$LAST_STATUS — expected 403). Reports OPEN."
fi

# ───────────────────────────────────────────────────────────────────
# C-3  Student should not read another Student's invoices
# ───────────────────────────────────────────────────────────────────
# Student1 asks for Student2's invoices.
http_get "/api/invoices/student/$STUDENT_ID_2" "$TK" >/dev/null
if [[ "$LAST_STATUS" == "403" ]]; then
  log_pass "[C-3] StudentA → GET /api/invoices/student/{studentB.id} → 403 (ownership check)"
else
  log_fail "[C-3] Cross-student invoice access ALLOWED (status=$LAST_STATUS — expected 403). PII leak OPEN."
fi

# ───────────────────────────────────────────────────────────────────
# C-5  Student should not grade submissions
# ───────────────────────────────────────────────────────────────────
body="{\"score\":50.0,\"graderID\":$ID_STUDENT1,\"reason\":\"self-grade attempt\"}"
http_post "/api/submissions/$SUBMISSION_ID/grade" "$TK" "$body" >/dev/null
if [[ "$LAST_STATUS" == "403" ]]; then
  log_pass "[C-5] Student → POST /api/submissions/{id}/grade → 403 (Instructor role required)"
else
  log_fail "[C-5] Student can grade submissions (status=$LAST_STATUS — expected 403). Academic integrity OPEN."
fi

# ───────────────────────────────────────────────────────────────────
# Attribution forgery — JWT claim must override request-body user IDs
# This test runs with an Instructor token but attempts to forge GraderID = student.
# Expected (once fixed): server ignores body.graderID and uses the JWT subject.
# Current state: forgery accepted.
# ───────────────────────────────────────────────────────────────────
body="{\"score\":40.0,\"graderID\":$ID_STUDENT1,\"reason\":\"forgery test\"}"
http_post "/api/submissions/$SUBMISSION_ID/grade" "$TOKEN_INSTRUCTOR" "$body" >/dev/null
if [[ "$LAST_STATUS" == "200" ]]; then
  # We need to read the stored record to know if forgery succeeded.
  # Until the server returns the effective grader in its response, flag as
  # a manual-verify item and warn rather than fail.
  log_warn "[Forgery] Instructor posted graderID=Student1 in body — manual DB verify needed. If GradeChange.ChangedBy == Student1, forgery still accepted. Fix: strip body.GraderID and use JWT sub."
else
  log_info "Forgery grade call returned status=$LAST_STATUS (unexpected — expected 200 for Instructor)."
fi
