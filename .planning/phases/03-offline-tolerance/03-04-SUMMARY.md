---
phase: 03-offline-tolerance
plan: 04
subsystem: ui
tags: [offline, indexeddb, sveltekit, quick-add, lifecycle-sync]
requires:
  - phase: 03-offline-tolerance
    provides: 03-02 idempotent saveExpense RPC and syncErrorCode action contract
  - phase: 03-offline-tolerance
    provides: 03-03 IndexedDB queue and flush orchestration modules
provides:
  - Quick Add fallback that queues failed/offline saves locally with household-scoped payloads
  - Shared Waiting/Saving/Couldn't sync row status display across Today and history
  - App lifecycle flush installation after session and household readiness
  - Local edit, delete, and retry flows for queued and failed expenses
affects: [03-offline-tolerance, quick-add, expense-history, edit-delete]
tech-stack:
  added: []
  patterns: [server-first quick-add fallback to IndexedDB, household-gated lifecycle flush, client_id local route recovery]
key-files:
  created:
    - .planning/phases/03-offline-tolerance/03-04-SUMMARY.md
  modified:
    - src/routes/(app)/+layout.server.ts
    - src/routes/(app)/+layout.svelte
    - src/routes/(app)/+page.svelte
    - src/lib/components/ExpenseList.svelte
    - src/routes/(app)/expenses/+page.server.ts
    - src/routes/(app)/expenses/+page.svelte
    - src/routes/(app)/expenses/[id]/edit/+page.server.ts
    - src/routes/(app)/expenses/[id]/edit/+page.svelte
key-decisions:
  - "Keep the server-first Quick Add path, but treat SvelteKit enhance network errors and browser offline state as queueable local saves."
  - "Expose householdId through the protected app layout so all client queue writes and flush triggers use the server-resolved household context."
  - "Use client_id as the edit route id for never-synced rows while persisted rows continue to use the server id and soft-delete action."
patterns-established:
  - "Visible expense rows dedupe by client_id first, then server id, so local queued rows and later synced rows do not duplicate."
  - "Lifecycle sync trigger setup is browser-only and flushes only when sessionReady and householdId are both present."
requirements-completed: [INPUT-08, INPUT-09, INPUT-10]
duration: 7 min
completed: 2026-05-02
---

# Phase 03 Plan 04: Offline UI Integration Summary

**Offline Quick Add queue integration with shared row statuses, history merge, lifecycle flush triggers, and local queued edit/delete/retry**

## Performance

- **Duration:** 7 min
- **Started:** 2026-05-02T13:52:20Z
- **Completed:** 2026-05-02T13:59:14Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- Quick Add now queues offline/network-failed saves into IndexedDB using `data.householdId`, resets the amount, opens the note sheet, and merges a visible `Waiting` row.
- Today and full history now share row sync labels: `Waiting`, `Saving`, and `Couldn't sync`; syncing rows render without edit links.
- `/expenses` loads queued IndexedDB records, merges them with server rows, dedupes by `client_id`, and groups them by WIB date.
- The app shell installs queue flush triggers after session and household readiness, and runs an app-open flush without using guessed household data.
- Local-only edit routes mount for queued `client_id` rows and support local save, delete, and failed-row retry while locking syncing records.

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire Quick Add offline save, queued note, and Today merge** - `0969836` (feat)
2. **Task 2: Add shared sync status display and history merge** - `19bb61b` (feat)
3. **Task 3: Install flush triggers and support local queued edit/delete** - `fa7c479` (feat)

## Files Created/Modified

- `src/routes/(app)/+layout.server.ts` - Adds `householdId: locals.householdId` to protected layout data.
- `src/routes/(app)/+page.svelte` - Queues offline Quick Add records, updates queued notes locally, and merges Today rows by `client_id`.
- `src/lib/components/ExpenseList.svelte` - Adds sync status fields, labels, destructive failed styling, and syncing row link lockout.
- `src/routes/(app)/expenses/+page.server.ts` - Includes `client_id` in history rows for local/server dedupe.
- `src/routes/(app)/expenses/+page.svelte` - Loads queued expenses, merges them into history, and groups local rows by WIB date.
- `src/routes/(app)/+layout.svelte` - Installs sync triggers and runs app-open flush after session/household readiness.
- `src/routes/(app)/expenses/[id]/edit/+page.server.ts` - Returns `{ localOnly: true, id: params.id }` when no persisted row exists.
- `src/routes/(app)/expenses/[id]/edit/+page.svelte` - Loads local queued records and handles local save/delete/retry with syncing controls disabled.

## Decisions Made

- Kept Quick Add server-first for online saves, then queued only browser offline state or SvelteKit enhance `error` results as local records.
- Shared `ExpenseList` owns status labels so Today and history stay visually consistent.
- Local edit/delete avoids server actions entirely for never-synced rows, preserving the existing server soft-delete path for persisted rows.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added shared row status display during Task 1**
- **Found during:** Task 1 (Wire Quick Add offline save, queued note, and Today merge)
- **Issue:** The Task 1 acceptance required a visible `Waiting` row, but the planned Task 1 file list did not include `ExpenseList.svelte`, which owns row rendering.
- **Fix:** Extended `ExpenseList.svelte` in the Task 1 commit with the sync status labels and syncing row lockout, then completed history-specific wiring in Task 2.
- **Files modified:** `src/lib/components/ExpenseList.svelte`
- **Verification:** `npm run test:unit -- tests/offline/expense-queue.test.ts`, `npm run check`, and required greps passed.
- **Committed in:** `0969836`

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** The change stayed within the planned Plan 04 behavior and made the Task 1 visible Waiting row requirement true immediately.

## Issues Encountered

- `npm run check` still reports Svelte warnings about state initialized from route `data` in `+page.svelte` and `/expenses/+page.svelte`. They are warnings only; there are 0 check errors, and these state snapshots are intentional local merge state.

## Verification

- `npm run test:unit -- tests/offline/expense-queue.test.ts` - passed, 2 tests.
- `npm run test:unit -- tests/offline/expense-sync.test.ts` - passed, 3 tests.
- `npm run test:unit -- tests/offline/expense-queue.test.ts tests/offline/expense-sync.test.ts` - passed, 5 tests.
- `npm run check` - passed with 0 errors and 2 Svelte warnings.
- `npm run test` - passed, 20 files, 188 tests passed and 13 skipped.
- Acceptance greps passed for `householdId: locals.householdId`, Quick Add `data.householdId` and `household_id: data.householdId`, status labels, lifecycle trigger wiring, local-only edit marker, queued CRUD calls, syncing lockout, and persisted soft delete.

## Known Stubs

None. The detected `null` assignments are local UI state resets and the note `placeholder` is a normal form affordance, not an unwired data source.

## Threat Flags

None. The UI to IndexedDB, IndexedDB to visible list, browser lifecycle to sync engine, and local edit/delete to server state boundaries were all listed in the plan threat model.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for 03-05 browser-level verification of the offline Quick Add flow and dedupe behavior. The core UI paths now call the queue/sync modules built in 03-03 and the idempotent save action from 03-02.

## Self-Check: PASSED

- Confirmed `.planning/phases/03-offline-tolerance/03-04-SUMMARY.md` exists.
- Confirmed all key modified source files exist.
- Confirmed task commits `0969836`, `19bb61b`, and `fa7c479` exist in git history.

---
*Phase: 03-offline-tolerance*
*Completed: 2026-05-02*
