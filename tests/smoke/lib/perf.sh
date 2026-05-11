# shellcheck shell=bash
# perf.sh — SLA lookup + violation aggregator.
# Reads config/sla.conf and run/perf.csv, flags endpoints exceeding budget.
# HARD violations (PRD) contribute to build failure; WARN are reported only.

: "${SMOKE_ROOT:=$PWD}"
SLA_FILE="$SMOKE_ROOT/config/sla.conf"

# Convert SLA path pattern to a regex.
#   /api/enrollment/enroll   → ^/api/enrollment/enroll$
#   /api/enrollment/*/drop   → ^/api/enrollment/[^/]+/drop$
#   /api/*                   → ^/api/[^/]+$
#   /*                       → ^/.*$
#   /api/*/*                 → ^/api/[^/]+/[^/]+$
_pattern_to_regex() {
  local pat="$1"
  pat="${pat//\./\\.}"
  pat="${pat//\*/[^/]+}"
  # For trailing /* wildcards treat the last one as "anything"
  pat="${pat//\[^\/\]+$/.*}"  # noop unless pattern ends with /*
  printf "^%s$" "$pat"
}

# sla_lookup METHOD PATH
# Prints: "BUDGET_MS SEVERITY" for first-match in sla.conf, or "" if no match.
sla_lookup() {
  local method="$1" path="$2"
  # Normalise trailing slash
  path="${path%/}"
  [[ -z "$path" ]] && path="/"

  while IFS= read -r line; do
    # strip comments + blank
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ -z "${line// }" ]] && continue

    # parse: METHOD PATH BUDGET SEV
    read -r m p b s <<< "$line"
    [[ "$m" == "ANY" || "$m" == "$method" ]] || continue

    local rx
    rx=$(_pattern_to_regex "$p")
    if [[ "$path" =~ $rx ]]; then
      printf "%s %s" "$b" "$s"
      return 0
    fi
  done < "$SLA_FILE"

  printf ""
}

# perf_check MS METHOD PATH LABEL
# Called AFTER an http() call. If over budget, log_warn (WARN) or log_fail (HARD).
perf_check() {
  local ms="$1" method="$2" path="$3" label="$4"
  local sla budget sev
  sla=$(sla_lookup "$method" "$path")
  [[ -z "$sla" ]] && return 0
  read -r budget sev <<< "$sla"

  if (( ms > budget )); then
    if [[ "$sev" == "HARD" ]]; then
      log_fail "SLA HARD: $method $path took ${ms}ms (budget ${budget}ms) — PRD violation [$label]"
    else
      log_warn "SLA WARN: $method $path took ${ms}ms (budget ${budget}ms) [$label]"
    fi
  fi
}

# perf_summary — emit the perf section of the final report.
# Uses node to aggregate run/perf.csv.
perf_summary() {
  node -e "
    const fs = require('fs');
    const rows = fs.readFileSync('$PERF_CSV','utf8').trim().split('\n')
      .filter(Boolean)
      .map(l => l.split(','))
      .map(([ts, method, path, status, ms, role]) => ({ts, method, path, status, ms:+ms, role}));

    if (!rows.length) { console.log('  (no requests recorded)'); process.exit(0); }

    const byEndpoint = {};
    for (const r of rows) {
      const key = r.method + ' ' + r.path.replace(/\/\d+/g, '/{id}');
      (byEndpoint[key] ??= []).push(r.ms);
    }

    const rollup = Object.entries(byEndpoint).map(([k, xs]) => {
      xs.sort((a,b)=>a-b);
      const sum = xs.reduce((a,b)=>a+b, 0);
      return {
        endpoint: k,
        n: xs.length,
        min: xs[0],
        avg: Math.round(sum / xs.length),
        p95: xs[Math.min(xs.length-1, Math.ceil(xs.length*0.95)-1)],
        max: xs[xs.length-1]
      };
    });

    rollup.sort((a,b) => b.p95 - a.p95);
    console.log('  Endpoint'.padEnd(50), 'n   min   avg   p95   max');
    console.log('  '+'-'.repeat(77));
    for (const r of rollup.slice(0, 15)) {
      console.log('  '+r.endpoint.padEnd(48), String(r.n).padStart(3), String(r.min).padStart(5), String(r.avg).padStart(5), String(r.p95).padStart(5), String(r.max).padStart(5));
    }

    const total = rows.length;
    const slow = rows.filter(r => r.ms > 1000).length;
    console.log('');
    console.log('  Total requests: ' + total + ' · >1s: ' + slow + ' (' + Math.round(slow/total*100) + '%)');
  "
}
