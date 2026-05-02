---
phase: 03-offline-tolerance
plan: 03
subsystem: offline
tags: [offline, indexeddb, idb, sync, sveltekit-actions, vitest]
requires:
  - phase: 03-offline-tolerance
    provides: Wave 0 offline queue and sync RED tests
  - phase: 03-offline-tolerance
    provides: 03-02 saveExpense syncErrorCode contract
provides:
  - Typed offline queue contracts for queued expenses and sync context
  - IndexedDB expense queue keyed by client_id with stale syncing recovery
  - Flush orchestration for queued and failed rows using the saveExpense action contract
affects: [03-offline-tolerance, offline-queue, quick-add-sync]
tech-stack:
  added: []
  patterns: [idb object store with status/household/date indexes, one-pass flush loop, syncErrorCode classification]
key-files:
  created:
    - src/lib/offline/types.ts
    - src/lib/offline/expense-queue.ts
    - src/lib/offline/expense-sync.ts
    - .planning/phases/03-offline-tolerance/deferred-items.md
  modified:
    - tests/offline/expense-sync.test.ts
key-decisions:
  - "Use an explicit syncErrorCode mapping table so auth, household access, and household mismatch failures remain a stable client contract."
  - "Treat browser offline state and thrown fetch failures as network failures that return rows to queued for later lifecycle-trigger retry."
patterns-established:
  - "Queued expense records store only the current expense payload and retry metadata; fresh rows omit server_id until a server id exists."
  - "Flush snapshots queued/failed rows once per invocation, marks each row syncing, and never reattempts access failures inside the same loop."
requirements-completed: [INPUT-08, INPUT-09, INPUT-10]
duration: 4 min
completed: 2026-05-02
---

# Phase 03 Plan 03: Offline Queue and Sync Engine Summary

**Durable IndexedDB expense queue with stale syncing recovery and one-pass syncErrorCode-aware flush orchestration**

## Performance

- **Duration:** 4 min
- **Started:** 2026-05-02T13:40:33Z
- **Completed:** 2026-05-02T13:44:50Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- Added queue/view/sync TypeScript contracts without duplicating the canonical category list.
- Implemented `xtrack-offline` IndexedDB storage with `queued-expenses` keyed by `client_id`, required indexes, queue CRUD helpers, and 5-minute stale `syncing` recovery.
- Implemented queue flush orchestration that pauses without session/household, posts form-encoded queued rows, preserves household mismatches locally, requeues network failures, and marks `auth`, `household_access`, and `household_mismatch` failures without hot-looping.

## Task Commits

Each task was committed atomically. Task 3 followed the TDD RED/GREEN split:

1. **Task 1: Define offline queue types and validation** - `3d13ee4` (feat)
2. **Task 2: Implement IndexedDB queue CRUD and stale syncing recovery** - `a4bf8ff` (feat)
3. **Task 3 RED: Cover sync error classification** - `49bb597` (test)
4. **Task 3 GREEN: Implement sync flush and lifecycle trigger helpers** - `4c40490` (feat)

## Files Created/Modified

- `src/lib/offline/types.ts` - Defines `SyncStatus`, `QueuedExpense`, `ExpenseViewItem`, and `SyncContext`.
- `src/lib/offline/expense-queue.ts` - Implements IndexedDB queue storage, CRUD, sync marking, failure marking, removal, and stale recovery.
- `src/lib/offline/expense-sync.ts` - Implements flush orchestration, sync error classification, and online/visibility trigger installer.
- `tests/offline/expense-sync.test.ts` - Updates RED tests to assert the 03-02 `syncErrorCode` contract and network requeue behavior.
- `.planning/phases/03-offline-tolerance/deferred-items.md` - Records the out-of-scope `npm run check` blocker in prior 03-02 UI code.

## Decisions Made

- Kept IndexedDB records keyed by `client_id`; `server_id` is optional and omitted from fresh queued rows until a server id exists.
- Used `FormData` as the source contract and encoded it as `application/x-www-form-urlencoded` for the existing SvelteKit `saveExpense` action endpoint.
- Classified unknown server failures as local failed rows with the server message, while network parsing/fetch/offline failures return rows to `queued`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed undefined `server_id` from fresh queued rows**
- **Found during:** Task 2 (Implement IndexedDB queue CRUD and stale syncing recovery)
- **Issue:** Fresh queued rows had an own `server_id: undefined` property, violating the intended "current payload and retry metadata" storage shape tested by the RED suite.
- **Fix:** Only attach `server_id` when an existing record already has a concrete server id.
- **Files modified:** `src/lib/offline/expense-queue.ts`
- **Verification:** `npm run test:unit -- tests/offline/expense-queue.test.ts` passed.
- **Committed in:** `a4bf8ff`

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** The fix tightened the storage contract and reduced the local data surface.

## Issues Encountered

- Task 1's plan-listed targeted command still failed after the type contract landed because it imports the queue module delivered by Task 2. Static acceptance criteria passed, and the full queue tests passed after Task 2.
- `npm run check` is blocked by an existing `src/routes/(app)/+page.svelte` issue: `SavedExpense` lacks required `client_id` when prepending into `todayExpenses`. This is outside 03-03 and appears tied to the completed 03-02 code tasks, so it was recorded in `deferred-items.md` and not modified.

## Verification

- `npm run test:unit -- tests/offline/expense-queue.test.ts -t queued` - failed during RED/Task 1 because `expense-queue.ts` did not exist yet.
- `npm run test:unit -- tests/offline/expense-queue.test.ts` - passed after Task 2.
- `npm run test:unit -- tests/offline/expense-sync.test.ts` - failed during RED before `expense-sync.ts`, then passed after Task 3 GREEN.
- `npm run test:unit -- tests/offline/expense-queue.test.ts tests/offline/expense-sync.test.ts` - passed, 5 tests.
- `npm run check` - failed on out-of-scope `src/routes/(app)/+page.svelte` type mismatch from prior work.

## Known Stubs

None.

## Threat Flags

None. The new IndexedDB and network flush surfaces are the exact trust boundaries listed in the plan threat model, and the planned mitigations were implemented.

## TDD Gate Compliance

- RED gate: `49bb597` adds failing sync classification/network requeue tests.
- GREEN gate: `4c40490` implements the sync engine and makes the sync tests pass.
- Task 1 and Task 2 used the RED tests established by 03-01 as their failing baseline.

## User Setup Required

None - no external service configuration required for this plan.

## Next Phase Readiness

Ready for 03-04 queue integration into Quick Add, status rows, history, lifecycle trigger wiring, and queued edit/delete. The known `npm run check` blocker in `+page.svelte` should be resolved before relying on full-project type checks.

## Self-Check: PASSED

- Confirmed created and modified files exist.
- Confirmed commits `3d13ee4`, `a4bf8ff`, `49bb597`, and `4c40490` exist in git history.

---
*Phase: 03-offline-tolerance*
*Completed: 2026-05-02*
