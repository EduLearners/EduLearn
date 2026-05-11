# shellcheck shell=bash
# EduLearn smoke-test shared library — HTTP, assertions, JSON extraction.
# Sourced by every module script. Not executable on its own.

# ── config ────────────────────────────────────────────────────────────
: "${API_BASE:=https://localhost:5001}"
: "${CURL_INSECURE:=1}"

# Writable run/ directory — created by run-all.sh
: "${SMOKE_RUN_DIR:=$PWD/run}"
BODY_FILE="$SMOKE_RUN_DIR/body.tmp"
PERF_CSV="$SMOKE_RUN_DIR/perf.csv"
RESULTS_LOG="$SMOKE_RUN_DIR/results.log"

# Global counters (exported so child scripts update the parent's view via trap?
# No — we source modules in the same shell, so plain variables work).
PASS=0
FAIL=0
WARN=0
declare -a FAILURES
declare -a WARNINGS

# ── logging ───────────────────────────────────────────────────────────
_ts() { date +%H:%M:%S; }

log_pass() {
  PASS=$((PASS+1))
  printf "  \033[32mPASS\033[0m  %s\n" "$1"
  printf "[%s] PASS %s\n" "$(_ts)" "$1" >> "$RESULTS_LOG"
}

log_fail() {
  FAIL=$((FAIL+1))
  FAILURES+=("$1")
  printf "  \033[31mFAIL\033[0m  %s\n" "$1"
  printf "[%s] FAIL %s\n" "$(_ts)" "$1" >> "$RESULTS_LOG"
}

log_warn() {
  WARN=$((WARN+1))
  WARNINGS+=("$1")
  printf "  \033[33mWARN\033[0m  %s\n" "$1"
  printf "[%s] WARN %s\n" "$(_ts)" "$1" >> "$RESULTS_LOG"
}

log_section() {
  printf "\n\033[1;36m── %s ──\033[0m\n" "$1"
  printf "\n── %s ──\n" "$1" >> "$RESULTS_LOG"
}

log_info() { printf "  \033[90m%s\033[0m\n" "$1"; }

# ── HTTP core ─────────────────────────────────────────────────────────
# Usage: http METHOD PATH [TOKEN] [JSON_BODY]
# Writes body to $BODY_FILE, appends perf row, echoes status code to stdout,
# and sets globals: LAST_STATUS, LAST_MS.
http() {
  local method="$1" path="$2" token="${3:-}" body="${4:-}"
  local curl_args=(-o "$BODY_FILE" -w '%{http_code} %{time_total}' -X "$method" "$API_BASE$path" -s)
  [[ "$CURL_INSECURE" == "1" ]] && curl_args+=(-k)
  [[ -n "$token" ]] && curl_args+=(-H "Authorization: Bearer $token")
  if [[ -n "$body" ]]; then
    curl_args+=(-H "Content-Type: application/json" -d "$body")
  fi

  local out status sec_total
  out=$(curl "${curl_args[@]}" 2>/dev/null) || out="000 0"
  status="${out%% *}"
  sec_total="${out#* }"

  # ms from seconds.fraction (node — avoids bash float)
  local ms
  ms=$(node -e "process.stdout.write(String(Math.round(parseFloat('$sec_total')*1000)))" 2>/dev/null)
  [[ -z "$ms" ]] && ms=0

  LAST_STATUS="$status"
  LAST_MS="$ms"

  # perf.csv row
  printf "%s,%s,%s,%s,%s,%s\n" "$(_ts)" "$method" "$path" "$status" "$ms" "${ROLE:-anon}" >> "$PERF_CSV"

  echo "$status"
}

# Convenience wrappers
http_get()    { http GET    "$1" "$2"       ; }
http_post()   { http POST   "$1" "$2" "$3"  ; }
http_put()    { http PUT    "$1" "$2" "$3"  ; }
http_delete() { http DELETE "$1" "$2"       ; }

# ── assertions ────────────────────────────────────────────────────────
# Each assert takes a human-readable label as its last argument so the
# pass/fail log reads like a plain English report.

# assert_status EXPECTED ACTUAL LABEL
assert_status() {
  local expected="$1" actual="$2" label="$3"
  if [[ "$actual" == "$expected" ]]; then
    log_pass "$label (status=$actual)"
  else
    log_fail "$label (expected $expected, got $actual)"
    log_info "body: $(head -c 200 "$BODY_FILE" 2>/dev/null)"
  fi
}

# assert_body_contains NEEDLE LABEL
assert_body_contains() {
  local needle="$1" label="$2"
  if grep -q -- "$needle" "$BODY_FILE" 2>/dev/null; then
    log_pass "$label (found '$needle')"
  else
    log_fail "$label (missing '$needle')"
    log_info "body: $(head -c 200 "$BODY_FILE" 2>/dev/null)"
  fi
}

# assert_json_eq JSON_PATH EXPECTED LABEL
assert_json_eq() {
  local path="$1" expected="$2" label="$3"
  local actual
  actual=$(jget "$path")
  if [[ "$actual" == "$expected" ]]; then
    log_pass "$label ($path=$actual)"
  else
    log_fail "$label (expected $path=$expected, got $actual)"
  fi
}

# ── JSON extraction (node-backed) ─────────────────────────────────────
# jget KEYPATH  — dotted path, numeric segments are array indices.
#   jget token
#   jget items.0.notificationID
#   jget "0.userID"
jget() {
  node -e "
    const fs=require('fs');
    let d; try { d = JSON.parse(fs.readFileSync('$BODY_FILE','utf8')); } catch { process.exit(0); }
    for (const p of '$1'.split('.')) {
      if (d == null) break;
      d = /^\\d+\$/.test(p) ? d[+p] : d[p];
    }
    if (d !== undefined && d !== null) process.stdout.write(String(d));
  " 2>/dev/null
}

# jlen — array length of the whole body (handy for list endpoints)
jlen() {
  node -e "
    const fs=require('fs');
    let d; try { d = JSON.parse(fs.readFileSync('$BODY_FILE','utf8')); } catch { process.stdout.write('0'); process.exit(0); }
    process.stdout.write(String(Array.isArray(d) ? d.length : (d.items ? d.items.length : 0)));
  " 2>/dev/null
}

# find_in_array_by — given a body that's a JSON array, find the first object
# matching FIELD=VALUE and return the value of OUT_FIELD.
#   find_in_array_by username "student_123" userID
find_in_array_by() {
  local field="$1" value="$2" out="$3"
  node -e "
    const fs=require('fs');
    const d = JSON.parse(fs.readFileSync('$BODY_FILE','utf8'));
    const arr = Array.isArray(d) ? d : (d.items || []);
    const hit = arr.find(x => String(x['$field']) === '$value');
    if (hit && hit['$out'] != null) process.stdout.write(String(hit['$out']));
  " 2>/dev/null
}
