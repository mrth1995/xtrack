---
phase: 02-quick-add
plan: 03
subsystem: expenses
tags: [svelte5, sveltekit2, vitest, zod, soft-delete, wib-date]

requires:
  - phase: 02-01
    provides: Expense formatters, schemas, ExpenseList, and edit RED tests
  - phase: 02-02
    provides: Quick Add expense creation, today list, and note action
provides:
  - Full expense history route at /expenses
  - Edit/delete route at /expenses/[id]/edit
  - saveEdit action for amount/category/note/date updates
  - deleteExpense soft-delete action
affects: [quick-add, expense-history, edit-delete, phase-02]

tech-stack:
  added: []
  patterns:
    - SvelteKit named actions for saveEdit/deleteExpense
    - Hidden ISO datetime field derived from visible WIB date input
    - Soft-delete UPDATE guarded by is_deleted=false

key-files:
  created:
    - src/routes/(app)/expenses/+page.server.ts
    - src/routes/(app)/expenses/+page.svelte
    - src/routes/(app)/expenses/[id]/edit/+page.server.ts
    - src/routes/(app)/expenses/[id]/edit/+page.svelte
  modified:
    - tests/expenses/edit.test.ts

key-decisions:
  - "Edit load relies on existing Supabase RLS for household scoping while filtering id and is_deleted=false in application code."
  - "deleteExpense remains a soft delete implemented as UPDATE is_deleted=true, never a physical delete."

patterns-established:
  - "History pages group expenses by WIB date using toDateInputValue and display labels using formatDisplayDate."
  - "Edit date forms use a visible no-name date input plus a hidden spent_at ISO value from fromDateInputValue."

requirements-completed: [INPUT-12, INPUT-13, INPUT-14]

duration: 5min
completed: 2026-04-30
---

# Phase 02 Plan 03: Expense History and Edit/Delete Summary

**Full expense history plus edit and soft-delete routes with WIB date round-trip and Zod-validated updates**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-30T13:59:06Z
- **Completed:** 2026-04-30T14:03:37Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- Added `/expenses` with household-scoped, non-deleted, most-recent-first full history grouped by WIB calendar day.
- Added `/expenses/[id]/edit` load plus `saveEdit` and `deleteExpense` named actions.
- Built the edit form with amount, category, note, and date fields, hidden ISO `spent_at`, and two-step inline delete confirmation.
- Turned the existing `tests/expenses/edit.test.ts` scaffold green and kept the full Phase 2 expense suite green.

## Task Commits

1. **Task 1: Create /expenses route** - `6d81f31` (feat)
2. **Task 2: Create edit route server actions** - `d60bbec` (feat)
3. **Task 3: Create edit Svelte form** - `128b3e0` (feat)
4. **Plan-level verification fix** - `228233b` (fix)

**Plan metadata:** this docs commit

## Files Created/Modified

- `src/routes/(app)/expenses/+page.server.ts` - Full-history load filtered by household and `is_deleted=false`.
- `src/routes/(app)/expenses/+page.svelte` - Date-grouped history UI reusing `ExpenseList`.
- `src/routes/(app)/expenses/[id]/edit/+page.server.ts` - Single-expense load, `saveEdit`, and `deleteExpense`.
- `src/routes/(app)/expenses/[id]/edit/+page.svelte` - Four-field edit form and two-step delete confirmation.
- `tests/expenses/edit.test.ts` - Updated mock chain and assertions for the required `is_deleted=false` update guards.

## Action Contracts

- `saveEdit`: reads `amount`, `category`, `note`, and `spent_at`; validates with `editExpenseSchema`; updates only those four fields where `id=params.id` and `is_deleted=false`; redirects `303` to `/expenses` on success.
- `deleteExpense`: reads `params.id`; updates `{ is_deleted: true }` where `id=params.id` and `is_deleted=false`; redirects `303` to `/` on success.

## Decisions Made

- Followed the plan's RLS boundary: edit load does not add an application-layer household filter; existing `expenses_household_select` and `expenses_creator_update` policies remain the household/creator authorization boundary.
- Kept the visible date input unnamed and submitted the ISO datetime through hidden `name="spent_at"` to avoid client submit mutation.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated edit test Supabase mock chain**
- **Found during:** Task 2
- **Issue:** The RED scaffold mocked one `.eq()` call for updates, but the required implementation chains `.eq('id', params.id).eq('is_deleted', false)`.
- **Fix:** Updated `tests/expenses/edit.test.ts` to return the chain object after the first `.eq()` and assert the second stale-soft-delete guard.
- **Files modified:** `tests/expenses/edit.test.ts`
- **Verification:** `npm run test -- tests/expenses/edit.test.ts --reporter=verbose` passed.
- **Committed in:** `d60bbec`

**2. [Rule 3 - Blocking] Applied Supabase typed-client cast for new update actions**
- **Found during:** Task 2
- **Issue:** `svelte-check` narrowed request-scoped `expenses.update(...)` payloads to `never` in the new edit server module.
- **Fix:** Cast the request-scoped Supabase client at the call sites, matching the existing Phase 02 home route pattern.
- **Files modified:** `src/routes/(app)/expenses/[id]/edit/+page.server.ts`
- **Verification:** `npm run check` exits 0.
- **Committed in:** `d60bbec`

**3. [Rule 1 - Bug] Removed new Svelte initial-prop warnings from edit form**
- **Found during:** Task 3
- **Issue:** Initializing `$state` directly from `data.expense` produced fresh Svelte warnings in the new edit page.
- **Fix:** Initialized field state once inside `$effect` and guarded the hidden ISO date value until the date field is populated.
- **Files modified:** `src/routes/(app)/expenses/[id]/edit/+page.svelte`
- **Verification:** `npm run check` now reports only the pre-existing home-route warning from 02-02.
- **Committed in:** `128b3e0`

**4. [Rule 1 - Bug] Removed comment text that failed the raw no-delete grep**
- **Found during:** Plan-level verification
- **Issue:** The final command `grep -r "\\.delete(" src/routes/(app)/expenses/ || echo OK` matched a comment, despite no physical delete call existing.
- **Fix:** Reworded the comment to avoid the literal call text while preserving the soft-delete warning.
- **Files modified:** `src/routes/(app)/expenses/[id]/edit/+page.server.ts`
- **Verification:** The raw grep now prints `OK`.
- **Committed in:** `228233b`

---

**Total deviations:** 4 auto-fixed (2 blocking, 2 bugs)
**Impact on plan:** All fixes were required to satisfy the planned implementation and verification gates. No scope expansion.

## Issues Encountered

- `npm run check` still reports the pre-existing `src/routes/(app)/+page.svelte` warning from 02-02; it exits 0 and was outside this plan's write scope.
- Manual authenticated browser smoke was not run; P04 owns human UAT for the full Phase 2 flow.

## Verification

- `npm run test -- tests/expenses/` - PASS, 4 files passed, 32 tests passed, 1 todo.
- `npm run check` - PASS, 0 errors, 1 pre-existing warning in `src/routes/(app)/+page.svelte`.
- `grep -r "\\.delete(" src/routes/(app)/expenses/ || echo OK` - PASS, prints `OK`.
- `ls src/routes/(app)/expenses/+page.svelte src/routes/(app)/expenses/+page.server.ts src/routes/(app)/expenses/[id]/edit/+page.svelte src/routes/(app)/expenses/[id]/edit/+page.server.ts` - PASS, all four files exist.

## Known Stubs

None. The `Add a note...` placeholder is user-facing input helper copy, not a stub.

## Threat Flags

None beyond the plan threat model. The new server actions are the planned browser-to-SvelteKit and SvelteKit-to-Supabase trust boundaries.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for 02-04 human UAT. The Quick Add lifecycle now supports create, history, edit, note clearing, and soft delete.

## Self-Check: PASSED

- Found SUMMARY and all four route files on disk.
- Found task commits `6d81f31`, `d60bbec`, `128b3e0`, and verification fix commit `228233b` in git history.

---
*Phase: 02-quick-add*
*Completed: 2026-04-30*
