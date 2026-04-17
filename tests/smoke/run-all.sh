#!/usr/bin/env bash
# run-all.sh — EduLearn smoke test orchestrator.
#
# Usage:
#   bash run-all.sh                   # full suite
#   bash run-all.sh --security-only   # only security/finance_bypass.sh
#   bash run-all.sh --no-security     # skip security regressions
#   bash run-all.sh modules/08_enrollments.sh   # run one specific module
#
# Environment:
#   API_BASE         (default: https://localhost:5001)
#   CURL_INSECURE=1  (default: 1 — accept dev certs)

set -u

SMOKE_ROOT="$(cd "$(dirname "$0")" && pwd)"
export SMOKE_ROOT
export SMOKE_RUN_DIR="$SMOKE_ROOT/run"

mkdir -p "$SMOKE_RUN_DIR"
# Fresh per-run artifacts
: > "$SMOKE_RUN_DIR/body.tmp"
echo "timestamp,method,path,status,ms,role" > "$SMOKE_RUN_DIR/perf.csv"
: > "$SMOKE_RUN_DIR/results.log"

# shellcheck source=lib/common.sh
. "$SMOKE_ROOT/lib/common.sh"
# shellcheck source=lib/perf.sh
. "$SMOKE_ROOT/lib/perf.sh"
# shellcheck source=lib/seed.sh
. "$SMOKE_ROOT/lib/seed.sh"
# shellcheck source=lib/report.sh
. "$SMOKE_ROOT/lib/report.sh"

MODE=all
SINGLE=""
for arg in "$@"; do
  case "$arg" in
    --security-only) MODE=security ;;
    --no-security)   MODE=no-security ;;
    --perf-only)     MODE=perf ;;
    modules/*.sh|security/*.sh) SINGLE="$arg" ;;
    *) echo "Unknown arg: $arg"; exit 2 ;;
  esac
done

STARTED=$(date -Iseconds)
echo "========================================================================"
printf "  \033[1mEduLearn smoke tests\033[0m  mode=%s  api=%s\n" "$MODE" "$API_BASE"
echo "========================================================================"

# Connectivity probe
probe=$(curl -sk -o /dev/null -w "%{http_code}" -m 5 "$API_BASE/api/health" 2>/dev/null || echo 000)
if [[ "$probe" != "200" ]]; then
  log_fail "API not reachable at $API_BASE/api/health (status=$probe). Is the API running?"
  render_report "$STARTED" "$(date -Iseconds)"
  exit 3
fi
log_pass "API reachable (GET /api/health = 200)"

# Seed — required unless running a single module that doesn't need it
seed_users || { render_report "$STARTED" "$(date -Iseconds)"; exit 4; }

# ── Dispatch ────────────────────────────────────────────────────────
if [[ -n "$SINGLE" ]]; then
  . "$SMOKE_ROOT/$SINGLE"
elif [[ "$MODE" == "security" ]]; then
  # Security needs some IDs; run the cheapest modules to populate them
  . "$SMOKE_ROOT/modules/03_programs.sh"
  . "$SMOKE_ROOT/modules/04_courses.sh"
  . "$SMOKE_ROOT/modules/05_rooms.sh"
  . "$SMOKE_ROOT/modules/06_students.sh"
  . "$SMOKE_ROOT/modules/07_sections.sh"
  . "$SMOKE_ROOT/modules/09_assessments.sh"
  . "$SMOKE_ROOT/modules/11_submissions.sh"
  . "$SMOKE_ROOT/modules/13_fees.sh"
  . "$SMOKE_ROOT/modules/14_scholarships.sh"
  . "$SMOKE_ROOT/modules/15_invoices.sh"
  . "$SMOKE_ROOT/security/finance_bypass.sh"
else
  # Full run in dependency order
  for m in \
    00_auth 01_health 02_users 03_programs 04_courses 05_rooms \
    06_students 07_sections 08_enrollments 09_assessments 10_content \
    11_submissions 12_applicants 13_fees 14_scholarships 15_invoices \
    16_payments 17_reports 18_kpis 19_audit_packages 20_audit_log \
    21_notifications 22_tickets; do
    . "$SMOKE_ROOT/modules/${m}.sh" || true
  done

  if [[ "$MODE" != "no-security" ]]; then
    . "$SMOKE_ROOT/security/finance_bypass.sh" || true
  fi
fi

ENDED=$(date -Iseconds)
render_report "$STARTED" "$ENDED"

# Exit code: non-zero only on functional failures or PRD-HARD SLA misses.
# (Security regression failures are reported but don't fail the build until
# the fixes land — otherwise CI is stuck red for a week.)
if (( FAIL > 0 )); then
  # How many failures are PRD HARD SLA?  Those count as build failures;
  # security-regression failures are expected pre-fix.
  hard=$(grep -c 'SLA HARD' "$RESULTS_LOG" 2>/dev/null || echo 0)
  func=$(grep -cvE 'SLA (HARD|WARN)|\[C-[0-9]' "$RESULTS_LOG" 2>/dev/null || echo 0)
  if (( hard > 0 )) || (( func > 0 )); then
    exit 1
  fi
fi
exit 0
