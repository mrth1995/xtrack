---
phase: 01-foundation
plan: "06"
subsystem: infra
tags: [github-actions, supabase, cron, keep-alive, free-tier]

# Dependency graph
requires: []
provides:
  - GitHub Actions cron workflow that pings Supabase twice weekly to prevent free-tier inactivity pause
  - Keep-alive script reading target URL from GitHub Actions secret (no embedded credentials)
  - Operational documentation covering setup, secret configuration, and troubleshooting
affects: [all-phases]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Secrets injected via GitHub Actions secrets, never committed to source control"
    - "CI scripts exit non-zero on failure to surface alerts via GitHub Actions job notifications"

key-files:
  created:
    - .github/workflows/supabase-keepalive.yml
    - scripts/supabase-keepalive.mjs
    - docs/ops/supabase-keepalive.md
  modified: []

key-decisions:
  - "Cron runs twice weekly (Tuesday/Friday) — max 4-day gap is safely below 7-day Supabase inactivity threshold"
  - "Target URL stored as SUPABASE_KEEPALIVE_URL GitHub Actions secret; no project credentials committed"
  - "HTTP 400 treated as alive (Supabase REST without apikey returns 400, not 200); only 5xx treated as failure"

patterns-established:
  - "Ops runbooks in docs/ops/ with setup steps, secret names, and troubleshooting guidance"

requirements-completed:
  - INFRA-01

# Metrics
duration: 2min
completed: 2026-04-25
---

# Phase 01 Plan 06: Supabase Keep-Alive Automation Summary

**GitHub Actions cron with env-var-driven Node.js script pings Supabase twice weekly to prevent free-tier project pause, with ops runbook covering secret setup and failure response.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-25T14:40:34Z
- **Completed:** 2026-04-25T14:42:20Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Scheduled GitHub Actions workflow runs every Tuesday and Friday at 08:00 UTC — max 4-day gap between pings, comfortably under the 7-day Supabase free-tier inactivity threshold
- Keep-alive script reads target URL from `SUPABASE_KEEPALIVE_URL` environment variable; no project URL, token, or credential is committed to source control
- Operational documentation in `docs/ops/supabase-keepalive.md` covers why the job exists, exact secret setup steps, recommended URL format, and troubleshooting for all common failure modes

## Task Commits

Each task was committed atomically:

1. **Task 1: Create the keep-alive workflow and request script** - `31429e8` (chore)
2. **Task 2: Document setup, secrets, and failure handling** - `5c409c7` (docs)

**Plan metadata:** committed with SUMMARY.md in final metadata commit

## Files Created/Modified

- `.github/workflows/supabase-keepalive.yml` — Scheduled GitHub Actions workflow; runs `node scripts/supabase-keepalive.mjs` on cron and workflow_dispatch
- `scripts/supabase-keepalive.mjs` — Lightweight fetch script; reads URL from env, handles timeout, exits non-zero on 5xx or network failure
- `docs/ops/supabase-keepalive.md` — Operational runbook: why the job exists, secret setup instructions, recommended Supabase endpoint, troubleshooting guide

## Decisions Made

- Cron schedule `0 8 * * 2,5` (Tuesday/Friday at 08:00 UTC) gives a maximum gap of 4 days between pings — well below the 7-day threshold
- HTTP 400 from the Supabase REST or auth endpoint is treated as "alive" since Supabase returns 400 for unauthenticated requests (not 404 or 5xx); only 5xx is treated as a failure
- `workflow_dispatch` trigger added so the workflow can be manually re-run after a project restore without waiting for the next scheduled run

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - both files were created cleanly on the first attempt.

## User Setup Required

**Add one GitHub Actions secret before the workflow is effective:**

| Secret name              | Value                                                                          |
|--------------------------|--------------------------------------------------------------------------------|
| `SUPABASE_KEEPALIVE_URL` | `https://<project-ref>.supabase.co/auth/v1/health` (replace with your ref ID) |

Steps: GitHub repo → Settings → Secrets and variables → Actions → New repository secret.

See `docs/ops/supabase-keepalive.md` for full instructions and troubleshooting.

## Next Phase Readiness

- All INFRA-01 automation is in place; no further keep-alive work needed for v1
- The workflow will become effective as soon as `SUPABASE_KEEPALIVE_URL` is added to GitHub repository secrets
- No blockers for subsequent phases

## Known Stubs

None.

## Threat Flags

None - no new network endpoints or auth paths introduced. The workflow only makes outbound GET requests using a URL stored in an environment variable; no inbound surface or credentials were added.

## Self-Check: PASSED

- `31429e8` found in git log: FOUND
- `5c409c7` found in git log: FOUND
- `.github/workflows/supabase-keepalive.yml`: FOUND
- `scripts/supabase-keepalive.mjs`: FOUND
- `docs/ops/supabase-keepalive.md`: FOUND

---
*Phase: 01-foundation*
*Completed: 2026-04-25*
