# shellcheck shell=bash
# report.sh — render the final summary + write a markdown perf report.

REPORT_MD="$SMOKE_RUN_DIR/perf-report.md"

render_report() {
  local started="$1" ended="$2"
  local total=$((PASS + FAIL))

  # Terminal summary
  echo
  echo "========================================================================"
  printf "  \033[1mEduLearn smoke-test run\033[0m  (started=%s  ended=%s)\n" "$started" "$ended"
  echo "========================================================================"
  printf "  Assertions: \033[32m%d passed\033[0m · \033[31m%d failed\033[0m · \033[33m%d warn\033[0m  (of %d)\n" "$PASS" "$FAIL" "$WARN" "$total"

  if (( FAIL > 0 )); then
    echo
    echo "  Failures:"
    printf "    · %s\n" "${FAILURES[@]}"
  fi

  if (( WARN > 0 )); then
    echo
    echo "  Warnings (SLA/non-blocking):"
    printf "    · %s\n" "${WARNINGS[@]}"
  fi

  echo
  echo "  ── Performance (slowest 15 endpoints, by p95) ──────────────────────"
  perf_summary

  echo
  echo "  Full results log: $RESULTS_LOG"
  echo "  Full perf data:   $PERF_CSV"
  echo "  Markdown report:  $REPORT_MD"
  echo "========================================================================"

  # Markdown report
  _write_markdown "$started" "$ended"
}

_write_markdown() {
  local started="$1" ended="$2"
  {
    echo "# EduLearn Smoke Test Report"
    echo
    echo "- **Started:** $started"
    echo "- **Ended:** $ended"
    echo "- **API base:** $API_BASE"
    echo "- **Seed timestamp:** $SEED_TS"
    echo
    echo "## Results"
    echo
    echo "| Metric | Count |"
    echo "|---|---|"
    echo "| Passed | $PASS |"
    echo "| Failed | $FAIL |"
    echo "| Warnings (SLA WARN, etc.) | $WARN |"
    echo
    if (( FAIL > 0 )); then
      echo "## Failures"
      echo
      for f in "${FAILURES[@]}"; do
        echo "- $f"
      done
      echo
    fi
    if (( WARN > 0 )); then
      echo "## Warnings"
      echo
      for w in "${WARNINGS[@]}"; do
        echo "- $w"
      done
      echo
    fi
    echo "## Performance"
    echo
    echo '```'
    perf_summary
    echo '```'
    echo
    echo "## PRD SLA check"
    echo
    echo "Per PRD §11 Non-Functional Requirements: Enrollment and grade-posting must complete in <2s."
    echo
    local prd_fail
    prd_fail=$(grep -c 'SLA HARD' "$RESULTS_LOG" 2>/dev/null || echo 0)
    if (( prd_fail == 0 )); then
      echo "- ✅ No PRD-mandated SLA violations this run."
    else
      echo "- ❌ **$prd_fail** PRD-mandated SLA violation(s) — see Failures above."
    fi
  } > "$REPORT_MD"
}
