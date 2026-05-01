---
phase: 02-quick-add
reviewed: 2026-05-01T13:05:08Z
depth: standard
files_reviewed: 18
files_reviewed_list:
  - src/app.css
  - src/lib/components/CategoryGrid.svelte
  - src/lib/components/ExpenseList.svelte
  - src/lib/components/GearMenu.svelte
  - src/lib/components/NoteSheet.svelte
  - src/lib/components/Numpad.svelte
  - src/lib/expenses/formatters.ts
  - src/lib/expenses/schemas.ts
  - src/routes/(app)/+page.server.ts
  - src/routes/(app)/+page.svelte
  - src/routes/(app)/expenses/+page.server.ts
  - src/routes/(app)/expenses/+page.svelte
  - src/routes/(app)/expenses/[id]/edit/+page.server.ts
  - src/routes/(app)/expenses/[id]/edit/+page.svelte
  - tests/expenses/edit.test.ts
  - tests/expenses/formatters.test.ts
  - tests/expenses/numpad.test.ts
  - tests/expenses/quick-add.test.ts
findings:
  critical: 0
  warning: 1
  info: 1
  total: 2
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-05-01T13:05:08Z
**Depth:** standard
**Files Reviewed:** 18
**Status:** issues_found

## Summary

Reviewed the quick-add, expense history, edit flow, expense formatting/schemas, and scoped expense tests. Server-side validation and Supabase write paths are generally constrained by schema checks, household context, soft-delete filters, and RLS assumptions. The main correctness issue is that quick-add captures `spent_at` during component render instead of at the save event, which can assign stale timestamps when the app stays open.

Verification run:
- `npm test -- --run tests/expenses/formatters.test.ts tests/expenses/numpad.test.ts tests/expenses/quick-add.test.ts tests/expenses/edit.test.ts` passed: 32 tests.
- `npm run check` passed with 0 errors and 1 warning.

## Warnings

### WR-01: Quick-add Uses Render-Time Timestamp For New Expenses

**File:** `src/routes/(app)/+page.svelte:195`
**Issue:** The hidden `spent_at` input uses `new Date().toISOString()` directly in markup. That expression is evaluated as part of component rendering, not when the user taps a category. If the PWA remains open across minutes, hours, or a WIB date boundary, newly added expenses can be saved with the old render timestamp and appear under the wrong day/history group.
**Fix:** Capture the timestamp in the same event that captures `pendingCategory` and `pendingAmount`, then submit that state value.

```svelte
let pendingSpentAt = $state('');

async function onCategoryTap(category: string) {
	if (debounced) return;
	if (amountStr === '' || amountStr === '0') return;

	const amount = parseInt(amountStr, 10);
	if (!Number.isFinite(amount) || amount <= 0) return;

	debounced = true;
	pressedCategory = category;
	pendingCategory = category;
	pendingAmount = amount;
	pendingSpentAt = new Date().toISOString();

	await tick();
	saveFormRef?.requestSubmit();
}

<input type="hidden" name="spent_at" value={pendingSpentAt} />
```

## Info

### IN-01: Today Expense State Captures Only Initial Page Data

**File:** `src/routes/(app)/+page.svelte:36`
**Issue:** `svelte-check` reports that `const initialTodayExpenses = data.todayExpenses;` captures only the initial `data` value. This is likely intentional for local optimistic updates, but if this route is invalidated or receives fresh `data.todayExpenses`, the local list will not sync.
**Fix:** If route invalidation should refresh the list, either initialize the state directly and resync in an effect, or document why optimistic local state intentionally ignores later `data` updates.

---

_Reviewed: 2026-05-01T13:05:08Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
