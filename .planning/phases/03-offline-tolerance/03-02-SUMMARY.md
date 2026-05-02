---
phase: 03-offline-tolerance
plan: 02
subsystem: database
tags: [supabase, postgres, rpc, sveltekit-actions, offline, idempotency, vitest]
requires:
  - phase: 03-offline-tolerance
    provides: Wave 0 offline queue and sync RED tests
provides:
  - Idempotent Supabase RPC for expense inserts keyed by client_id
  - saveExpense action wiring through save_expense_idempotent
  - Structured syncErrorCode failures for offline queue classification
  - User-confirmed remote schema push for the Phase 03 RPC migration
affects: [03-offline-tolerance, quick-add, offline-sync]
tech-stack:
  added: []
  patterns: [SECURITY DEFINER RPC with explicit membership checks, client_id idempotency, syncErrorCode server-action contract]
key-files:
  created:
    - supabase/migrations/2026050201_phase3_idempotent_expense_insert.sql
  modified:
    - src/lib/expenses/schemas.ts
    - src/routes/(app)/+page.server.ts
    - src/routes/(app)/+page.svelte
    - tests/expenses/quick-add.test.ts
key-decisions:
  - "Move retry idempotency into a Supabase RPC so browser retries cannot create duplicate expenses."
  - "Use server-derived householdId as RPC authority and treat queued household mismatches as controlled sync failures."
  - "Record the schema push as user-confirmed external work during checkpoint resume rather than claiming executor-run CLI output."
patterns-established:
  - "saveExpense returns syncErrorCode values for auth, household_access, household_mismatch, and unknown failures."
  - "Quick Add result rows include client_id end to end so UI dedupe and offline sync share the same identity contract."
requirements-completed: [INPUT-11]
duration: checkpointed; resumed verification completed 2026-05-02T13:49:20Z
completed: 2026-05-02
---

# Phase 03 Plan 02: Idempotent Expense RPC Summary

**Supabase save_expense_idempotent RPC with household-checked client_id retry safety and SvelteKit action sync failure classification**

## Performance

- **Duration:** Checkpointed across executors; resume verification completed at 2026-05-02T13:49:20Z
- **Started:** Previous executor before schema-push checkpoint
- **Completed:** 2026-05-02T13:49:20Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- Added `public.save_expense_idempotent(...)` with `SECURITY DEFINER`, `SET search_path = public`, authenticated-only execute grants, household membership enforcement, and `ON CONFLICT (client_id) DO NOTHING`.
- Updated `saveExpense` to call the RPC using the server-side `householdId`, return the RPC row, and classify offline sync failures with stable `syncErrorCode` values.
- Extended the save schema and tests for queued note payloads and RPC parameter coverage.
- Completed Task 3 after the user confirmed the Supabase schema push was done externally.

## Task Commits

1. **Task 1 RED: Add failing RPC idempotency tests** - `cf0cf57` (test)
2. **Task 1 GREEN: Add idempotent expense RPC contract** - `f4e38c9` (feat)
3. **Task 2 RED: Add failing sync error classification tests** - `513e18c` (test)
4. **Task 2 GREEN: Classify idempotent expense sync failures** - `102e971` (feat)
5. **Task 3: Complete expense row client id contract** - `2731b96` (fix)

## Files Created/Modified

- `supabase/migrations/2026050201_phase3_idempotent_expense_insert.sql` - Creates the idempotent expense insert RPC and grants execute only to authenticated callers.
- `src/lib/expenses/schemas.ts` - Allows optional nullable notes on save payloads for queued offline sync.
- `src/routes/(app)/+page.server.ts` - Routes `saveExpense` through the RPC and maps auth/access/mismatch/unknown failures.
- `src/routes/(app)/+page.svelte` - Keeps the saved expense UI type aligned with the returned `client_id` contract.
- `tests/expenses/quick-add.test.ts` - Covers RPC parameters, retry idempotency, and sync failure classification.

## Decisions Made

- Database idempotency is the source of truth for offline retry safety; browser-side dedupe remains a UI convenience only.
- The action never trusts a queued/form `household_id` for writes. It compares queued household metadata against `locals.householdId` and passes only the server-derived value to Supabase.
- The schema push was completed outside this executor by the user after the checkpoint. This summary records that confirmation instead of fabricating CLI output.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Restored the UI expense row type after RPC client_id propagation**
- **Found during:** Task 3 (Push Supabase schema before backend verification)
- **Issue:** `npm run check` failed because `SavedExpense` omitted the required `client_id` field before prepending the returned row into `todayExpenses`.
- **Fix:** Added `client_id` to the local `SavedExpense` interface so the UI result type matches the server action's `ExpenseListRow`.
- **Files modified:** `src/routes/(app)/+page.svelte`
- **Verification:** `npm run test:unit -- tests/expenses/quick-add.test.ts` and `npm run check` both pass.
- **Committed in:** `2731b96`

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** The fix was required to complete the plan-level backend verification gate and did not alter runtime behavior.

## Issues Encountered

- Task 3 initially stopped at a human-action checkpoint because the executor could not complete the remote Supabase schema push. The user later confirmed the push was done, and verification resumed from Task 3 only.
- `npm run check` reports one Svelte warning in `src/routes/(app)/+page.svelte` about capturing the initial `data` value. There are no type errors.

## Verification

- User confirmed the Supabase schema push was completed after the checkpoint.
- `npm run test:unit -- tests/expenses/quick-add.test.ts` - passed, 14 tests.
- `npm run check` - passed with 0 errors and 1 existing Svelte warning.

## Known Stubs

None. The `null` assignments in `src/routes/(app)/+page.svelte` are local UI state resets, not placeholder data sources.

## Threat Flags

None. The new server action to RPC boundary and production database RPC grant are the threat surfaces listed in the plan threat model, with the planned mitigations implemented.

## TDD Gate Compliance

- RED gate: `cf0cf57` and `513e18c` add failing tests before implementation.
- GREEN gate: `f4e38c9` and `102e971` implement the RPC and action contract.
- Task 3 verification fix: `2731b96` restores the type contract needed for full-project checking.

## User Setup Required

The Supabase schema push was required and was completed externally by the user before this resume. No additional setup is required for this plan.

## Next Phase Readiness

03-03 has already built the queue and sync engine against this contract. 03-04 can now integrate Quick Add UI queueing and lifecycle wiring with the verified RPC-backed save path.

## Self-Check: PASSED

- Confirmed `.planning/phases/03-offline-tolerance/03-02-SUMMARY.md` exists.
- Confirmed commits `cf0cf57`, `f4e38c9`, `513e18c`, `102e971`, and `2731b96` exist in git history.

---
*Phase: 03-offline-tolerance*
*Completed: 2026-05-02*
