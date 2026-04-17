# shellcheck shell=bash
log_section "Module 15 — Invoices (SFB)"
ROLE=Finance

body="{\"studentID\":$STUDENT_ID_1,\"term\":\"Fall 2026\",\"dueDate\":\"2026-08-15\"}"
http_post /api/invoices/generate "$TOKEN_FINANCE" "$body" >/dev/null
assert_status 201 "$LAST_STATUS" "POST /api/invoices/generate → 201"
export INVOICE_ID=$(jget invoiceID)
export INVOICE_AMOUNT=$(jget amountDue)
log_info "INVOICE_ID=$INVOICE_ID  amountDue=$INVOICE_AMOUNT (expected 45000 = 55000 - 10000 scholarship)"

# Unknown student
http_post /api/invoices/generate "$TOKEN_FINANCE" "{\"studentID\":9999999,\"term\":\"Fall 2026\",\"dueDate\":\"2026-08-15\"}" >/dev/null
assert_status 404 "$LAST_STATUS" "POST /api/invoices/generate bad student → 404"

http_get "/api/invoices/$INVOICE_ID" "$TOKEN_FINANCE" >/dev/null
assert_status 200 "$LAST_STATUS" "GET /api/invoices/{id} → 200"

http_get "/api/invoices/9999999" "$TOKEN_FINANCE" >/dev/null
assert_status 404 "$LAST_STATUS" "GET /api/invoices/{bad} → 404"

http_get "/api/invoices/student/$STUDENT_ID_1" "$TOKEN_FINANCE" >/dev/null
assert_status 200 "$LAST_STATUS" "GET /api/invoices/student/{id} → 200"
