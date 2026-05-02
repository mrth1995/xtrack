---
phase: 03-offline-tolerance
plan: 01
subsystem: testing
tags: [offline, indexeddb, playwright, vitest, fake-indexeddb, idb]
requires:
  - phase: 02-quick-add
    provides: Quick Add UI, expense list, save action, and existing Vitest setup
provides:
  - Offline queue and sync RED unit tests for Phase 03 implementation plans
  - Browser-level Playwright acceptance test for offline Quick Add flow
  - Playwright and fake IndexedDB test infrastructure
affects: [03-offline-tolerance, offline-queue, quick-add]
tech-stack:
  added: [idb, fake-indexeddb, "@playwright/test"]
  patterns: [RED tests for future offline modules, Playwright browser offline simulation]
key-files:
  created:
    - playwright.config.ts
    - tests/offline/expense-queue.test.ts
    - tests/offline/expense-sync.test.ts
    - tests/e2e/offline-quick-add.spec.ts
  modified:
    - package.json
    - package-lock.json
    - tests/setup.ts
key-decisions:
  - "Use Playwright browser offline simulation for Phase 03 acceptance coverage before installed-PWA UAT."
  - "Keep offline unit tests RED by importing future contracts without adding implementation stubs in Wave 0."
patterns-established:
  - "Offline unit tests dynamically import future `$lib/offline/*` contracts so Vitest collects the suites before implementation exists."
  - "Browser offline acceptance uses `context.setOffline(true/false)` and an explicit `online` event dispatch."
requirements-completed: [INPUT-08, INPUT-09, INPUT-10, INPUT-11]
duration: 3 min
completed: 2026-05-02
---

# Phase 03 Plan 01: Wave 0 Validation Scaffolding Summary

**Offline queue, sync orchestration, and browser flow validation foundation using Vitest, fake IndexedDB, idb, and Playwright**

## Performance

- **Duration:** 3 min
- **Started:** 2026-05-02T13:27:30Z
- **Completed:** 2026-05-02T13:30:25Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- Added `idb`, `fake-indexeddb`, and `@playwright/test`, plus `test:e2e` and Playwright configuration.
- Added RED unit tests for queued expense storage, 5-minute stale `syncing` recovery, flush triggers, and failure classification.
- Added a browser-level offline Quick Add acceptance test covering `Waiting`, reconnect flush, and no duplicate `Food` row.

## Task Commits

1. **Task 1: Add offline test dependencies and runner configuration** - `e81a52f` (chore)
2. **Task 2: Create unit tests for queue storage and sync orchestration** - `ab7dd6c` (test)
3. **Task 3: Create browser offline acceptance test** - `5147bf0` (test)

## Files Created/Modified

- `package.json` - Added `idb`, `fake-indexeddb`, `@playwright/test`, and `test:e2e`.
- `package-lock.json` - Locked new npm dependencies.
- `playwright.config.ts` - Configures Chromium e2e tests against local dev server on port 4173.
- `tests/setup.ts` - Imports `fake-indexeddb/auto` before tests.
- `tests/offline/expense-queue.test.ts` - RED tests for queue persistence and stale syncing recovery.
- `tests/offline/expense-sync.test.ts` - RED tests for flush triggers and failure classification.
- `tests/e2e/offline-quick-add.spec.ts` - RED browser flow for offline save, waiting status, online flush, and dedupe.

## Decisions Made

- Used Playwright `--list` for immediate browser test verification because the offline implementation and authenticated fixture do not exist yet.
- Kept Wave 0 focused on validation scaffolding only; no `$lib/offline/*` implementation stubs were added.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Adjusted future-contract imports so RED tests collect**
- **Found during:** Task 2 (Create unit tests for queue storage and sync orchestration)
- **Issue:** Literal dynamic imports of missing `$lib/offline/*` modules were still resolved during Vite import analysis, causing suite load failure with no collected tests.
- **Fix:** Routed imports through path constants so Vitest collects the RED tests and fails inside the test bodies until implementation exists.
- **Files modified:** `tests/offline/expense-queue.test.ts`, `tests/offline/expense-sync.test.ts`
- **Verification:** `npm run test:unit -- tests/offline/expense-queue.test.ts tests/offline/expense-sync.test.ts` collected 4 tests and failed only on missing future modules.
- **Committed in:** `ab7dd6c`

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** The adjustment preserves the intended RED behavior and avoids adding implementation stubs.

## Issues Encountered

- `npm install` reported 7 existing npm audit findings (2 low, 4 moderate, 1 high). This plan did not run `npm audit fix` because it would change unrelated dependency versions.
- Targeted offline unit tests are intentionally RED until later plans add `src/lib/offline/expense-queue.ts` and `src/lib/offline/expense-sync.ts`.

## Verification

- `npm ls idb fake-indexeddb @playwright/test` - passed.
- `npm run test:unit` after Task 1 - passed, 18 files and 179 tests.
- `npm run test:unit -- tests/offline/expense-queue.test.ts tests/offline/expense-sync.test.ts` - collected 4 tests and failed as expected on missing future offline modules.
- `npx playwright test tests/e2e/offline-quick-add.spec.ts --list` - passed, listed 1 Chromium test.

## Known Stubs

None. The top-of-file authenticated fixture TODO in `tests/e2e/offline-quick-add.spec.ts` is intentional per plan instructions because current auth setup prevents executing the browser flow end to end.

## Threat Flags

None. This plan adds tests and test dependencies only; it does not introduce a runtime trust boundary.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for 03-02 and 03-03. The RED tests now define the offline queue, sync classification, and browser flow contracts that implementation plans must satisfy.

## Self-Check: PASSED

- Confirmed all created and modified files exist.
- Confirmed task commits `e81a52f`, `ab7dd6c`, and `5147bf0` exist in git history.

---
*Phase: 03-offline-tolerance*
*Completed: 2026-05-02*
