# shellcheck shell=bash
log_section "Module 16 — Payments (SFB)"
ROLE=Finance

body="{\"invoiceID\":$INVOICE_ID,\"amount\":$INVOICE_AMOUNT,\"method\":\"BankTransfer\",\"reference\":\"TXN-$SEED_TS\"}"
http_post /api/payments "$TOKEN_FINANCE" "$body" >/dev/null
assert_status 201 "$LAST_STATUS" "POST /api/payments → 201"

# Pay an invoice that's already Paid
http_post /api/payments "$TOKEN_FINANCE" "$body" >/dev/null
assert_status 400 "$LAST_STATUS" "POST /api/payments on Paid invoice → 400"
# Possible codes: INVOICE_ALREADY_PAID or INVALID_AMOUNT depending on server logic
grep -qE "INVOICE_ALREADY_PAID|INVALID_AMOUNT" "$BODY_FILE" && log_pass "error code INVOICE_ALREADY_PAID or INVALID_AMOUNT" || log_fail "missing expected error code"

# Unknown invoice
http_post /api/payments "$TOKEN_FINANCE" "{\"invoiceID\":9999999,\"amount\":100,\"method\":\"BankTransfer\"}" >/dev/null
assert_status 404 "$LAST_STATUS" "POST /api/payments bad invoice → 404"

http_get "/api/payments/invoice/$INVOICE_ID" "$TOKEN_FINANCE" >/dev/null
assert_status 200 "$LAST_STATUS" "GET /api/payments/invoice/{id} → 200"
