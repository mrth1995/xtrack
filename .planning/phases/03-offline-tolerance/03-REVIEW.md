---
phase: 03-offline-tolerance
reviewed: 2026-05-03T13:15:27Z
depth: standard
files_reviewed: 23
files_reviewed_list:
  - .gitignore
  - package.json
  - playwright.config.ts
  - src/hooks.server.ts
  - src/lib/components/ExpenseList.svelte
  - src/lib/expenses/schemas.ts
  - src/lib/offline/expense-queue.ts
  - src/lib/offline/expense-sync.ts
  - src/lib/offline/types.ts
  - src/routes/(app)/+layout.server.ts
  - src/routes/(app)/+layout.svelte
  - src/routes/(app)/+page.server.ts
  - src/routes/(app)/+page.svelte
  - src/routes/(app)/expenses/+page.server.ts
  - src/routes/(app)/expenses/+page.svelte
  - src/routes/(app)/expenses/[id]/edit/+page.server.ts
  - src/routes/(app)/expenses/[id]/edit/+page.svelte
  - supabase/migrations/2026050201_phase3_idempotent_expense_insert.sql
  - tests/e2e/offline-quick-add.spec.ts
  - tests/expenses/quick-add.test.ts
  - tests/offline/expense-queue.test.ts
  - tests/offline/expense-sync.test.ts
  - tests/setup.ts
findings:
  critical: 0
  warning: 2
  info: 0
  total: 2
status: issues_found
---

# Phase 03: Code Review Report

**Reviewed:** 2026-05-03T13:15:27Z
**Depth:** standard
**Files Reviewed:** 23
**Status:** issues_found

## Summary

Reviewed the Phase 3 offline tolerance changes across the SvelteKit routes, offline IndexedDB queue, sync orchestration, Supabase RPC migration, package/config changes, and related unit/e2e tests. `package-lock.json` was loaded for dependency context but excluded from the reviewed source-file count per workflow lockfile filtering.

The idempotent insert RPC is backed by the existing `expenses.client_id` unique constraint, and the targeted tests pass. Two behavioral issues remain: terminal sync failures are still included in automatic lifecycle flushes, and local-only edit saves bypass the same validation constraints used for online saves.

## Warnings

### WR-01: Failed sync rows are automatically retried on every lifecycle flush

**File:** `src/lib/offline/expense-sync.ts:209`
**Issue:** `flushExpenseQueue()` includes both `queued` and `failed` rows in normal automatic flushes. Rows marked `failed` for auth, household access, or household mismatch are meant to stop hot-loop retries and surface a manual recovery path, but the installed `online` and `visibilitychange` triggers will pick them up again. This can repeatedly POST known-terminal failures whenever the app regains focus or connectivity. The existing test only verifies the first failure state; it does not call `flushExpenseQueue()` a second time to prove failed rows are skipped.
**Fix:**
```ts
const rows = (await getQueuedExpenses()).filter((row) => {
	if (context.clientId) {
		return row.client_id === context.clientId && (row.sync_status === 'queued' || row.sync_status === 'failed');
	}

	return row.sync_status === 'queued';
});
```
Add a regression test that marks a row failed, invokes a second automatic flush without `clientId`, and asserts the fetcher is not called again.

### WR-02: Local-only edit saves can persist values the server will reject

**File:** `src/routes/(app)/expenses/[id]/edit/+page.svelte:116`
**Issue:** The local-only edit path validates only `amount > 0` and a non-empty date before updating IndexedDB. It does not enforce the server schema constraints for maximum amount, valid category, note length, or ISO datetime. A queued local edit can therefore be saved in the UI but later fail sync with a generic validation error, leaving the user with an avoidable failed offline row.
**Fix:**
```ts
import { editExpenseSchema } from '$lib/expenses/schemas';

const parsed = editExpenseSchema.safeParse({
	amount: Number(amount),
	category: selectedCategory,
	note: note.trim().length > 0 ? note : null,
	spent_at: spentAtIso
});

if (!parsed.success) {
	localError = parsed.error.issues[0]?.message ?? 'Invalid input';
	return;
}

const updated = await updateQueuedExpense(localExpense.client_id, parsed.data);
```
Add local-only edit tests for over-limit amounts, invalid categories, and notes longer than 500 characters.

---

_Reviewed: 2026-05-03T13:15:27Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
