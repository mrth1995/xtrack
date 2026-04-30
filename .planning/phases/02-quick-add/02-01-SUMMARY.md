---
phase: 02-quick-add
plan: "01"
subsystem: expenses-foundation
tags:
  - svelte5
  - sveltekit2
  - vitest
  - zod
  - idr-formatting
  - wib-timezone
dependency_graph:
  requires: []
  provides:
    - src/lib/expenses/formatters.ts
    - src/lib/expenses/schemas.ts
    - src/lib/components/ExpenseList.svelte
    - tests/expenses/formatters.test.ts
    - tests/expenses/numpad.test.ts
    - tests/expenses/quick-add.test.ts
    - tests/expenses/edit.test.ts
  affects:
    - 02-02 (imports formatters + schemas for quick-add page)
    - 02-03 (imports ExpenseList component + formatters for history page)
    - 02-04 (imports editExpenseSchema + formatters for edit route)
tech_stack:
  added: []
  patterns:
    - Zod schema modules with z.infer type exports (mirrors src/lib/households/schemas.ts)
    - Svelte 5 $props() rune for component props
    - Asia/Jakarta timezone pinning for all date formatting (WIB = UTC+7)
    - Wave 0 RED test scaffolds: test files written before implementation modules exist
key_files:
  created:
    - src/lib/expenses/formatters.ts
    - src/lib/expenses/schemas.ts
    - src/lib/components/ExpenseList.svelte
    - tests/expenses/formatters.test.ts
    - tests/expenses/numpad.test.ts
    - tests/expenses/quick-add.test.ts
    - tests/expenses/edit.test.ts
  modified: []
decisions:
  - "WIB timezone (Asia/Jakarta) pinned in both formatDisplayDate and toDateInputValue to prevent off-by-one date labels near UTC midnight"
  - "fromDateInputValue uses +07:00 offset literal (not timeZone API) to produce deterministic UTC ISO output"
  - "Wave 0 RED tests use dynamic import() not require() for ESM/Vitest $lib alias compatibility"
  - "WIB boundary tests in quick-add.test.ts are GREEN (test the existing formatter) — correctly distinct from the RED server-action tests in same file"
metrics:
  duration: "282 seconds (~5 minutes)"
  completed_date: "2026-04-30"
  tasks_completed: 3
  files_created: 7
  files_modified: 0
---

# Phase 2 Plan 01: Foundation Utilities and Wave 0 Tests Summary

Pure formatters, Zod validation schemas, shared ExpenseList component, and four test files (1 GREEN, 3 RED) that pin the P02/P03 implementation contract.

## Exported Signatures (for P02 and P03 executors)

### `src/lib/expenses/formatters.ts`

```typescript
export function formatIDR(amount: number): string
// Returns 'Rp ' + id-ID dot-separated number. e.g. formatIDR(54000) === 'Rp 54.000'

export function formatNumpad(amountStr: string): string
// Returns id-ID dot-separated number without prefix. formatNumpad('') === '0'

export function formatDisplayDate(timestamptz: string): string
// Returns id-ID short-month date pinned to Asia/Jakarta. e.g. '26 Apr'

export function toDateInputValue(timestamptz: string): string
// Returns YYYY-MM-DD WIB date string for <input type="date">

export function fromDateInputValue(dateStr: string): string
// Returns UTC ISO string treating input as WIB midnight. '2026-04-26' → '2026-04-25T17:00:00.000Z'
```

### `src/lib/expenses/schemas.ts`

```typescript
export const VALID_CATEGORIES: readonly ['Food','Transport','Entertainment','Utilities','Shopping','Health','Others']
export type Category = (typeof VALID_CATEGORIES)[number]

export const saveExpenseSchema  // amount: int 1–99_999_999, category: enum, client_id: uuid, spent_at: datetime
export const saveNoteSchema     // expense_id: uuid, note?: string max 500
export const editExpenseSchema  // amount + category + note (nullable) + spent_at

export type SaveExpenseInput = z.infer<typeof saveExpenseSchema>
export type SaveNoteInput = z.infer<typeof saveNoteSchema>
export type EditExpenseInput = z.infer<typeof editExpenseSchema>

export const CATEGORY_META: Record<Category, { emoji: string }>
// Emoji map per D-13: Food→🍜, Transport→🚗, Entertainment→🎬, Utilities→💡, Shopping→🛍️, Health→❤️, Others→✅
```

### `src/lib/components/ExpenseList.svelte`

```typescript
interface ExpenseListItem {
  id: string; amount: number; category: string; note: string | null; spent_at: string;
}
interface Props { expenses: ExpenseListItem[]; }
```

Renders empty state or `<ul>` list. Each row is `<a href="/expenses/{id}/edit">` with emoji+category, optional note, formatIDR amount, formatDisplayDate date. 48px min touch target, CSS custom properties only.

## Wave 0 Test Status

| File | Status | Reason |
|------|--------|--------|
| tests/expenses/formatters.test.ts | GREEN (13 passing) | Implementation created in same task |
| tests/expenses/numpad.test.ts | RED (FAIL) | Numpad.svelte not yet created (P02) |
| tests/expenses/quick-add.test.ts | RED + partial GREEN | saveExpense/saveNote RED (actions not in +page.server yet — P02); WIB boundary 3 tests GREEN (use existing formatter) |
| tests/expenses/edit.test.ts | RED (FAIL) | Edit route +page.server not yet created (P03) |

### Failing tests confirming RED contract is pinned (numpad.test.ts):
- "renders all 12 keys: 0-9, '000', and backspace (INPUT-02)"
- "calls onDigit('5') when the '5' key is tapped (INPUT-02)"
- "calls onDigit('000') when the '000' key is tapped (INPUT-02)"
- "calls onBackspace when the ⌫ key is tapped (INPUT-02)"

### Failing tests confirming RED contract is pinned (quick-add.test.ts):
- "inserts expense and returns { success: true, expense } when input is valid"
- "returns fail(400) when amount is 0 (validation)"
- "returns fail(400) when category is not in the 7-preset enum (validation)"
- "redirects to /onboarding when locals.householdId is missing"
- "returns { success: true, duplicate: true, expense } when duplicate client_id (23505) is detected"
- "updates only the note field on the target expense"
- "returns fail(404) when saveNote update affects 0 rows"

### Failing tests confirming RED contract is pinned (edit.test.ts):
- "returns the expense when found and not deleted"
- "updates amount, category, note, spent_at and redirects"
- "sets is_deleted=true (NOT physical delete) and redirects to /"

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Generated .svelte-kit/tsconfig.json via svelte-kit sync**
- **Found during:** Task 1 test run
- **Issue:** The worktree was freshly created without running `svelte-kit sync`, so `.svelte-kit/tsconfig.json` did not exist. Vitest failed with `TSConfckParseError: failed to resolve "extends":"./.svelte-kit/tsconfig.json"`.
- **Fix:** Ran `npx svelte-kit sync` before re-running tests.
- **Files modified:** `.svelte-kit/` (generated, not committed)
- **Commit:** 85bdb7a (formatter tests now pass)

**2. [Rule 1 - Bug] Replaced require() with ESM import in WIB boundary tests**
- **Found during:** Task 3 test run
- **Issue:** The plan's scaffold code used `const { toDateInputValue } = require('$lib/expenses/formatters')` inside three `it()` callbacks. Vitest runs in ESM mode and the `$lib` alias is only resolved for ES imports — `require()` calls with `$lib` paths fail with `MODULE_NOT_FOUND`.
- **Fix:** Added `import { toDateInputValue } from '$lib/expenses/formatters'` at the top of the file and removed the three inline `require()` calls. The WIB boundary tests now correctly pass GREEN (they test the existing formatter, not a missing module).
- **Files modified:** `tests/expenses/quick-add.test.ts`
- **Commit:** 5e2a06f

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes at trust boundaries introduced. All new files are either pure utility modules (formatters, schemas) or a presentational Svelte component. The Zod schemas implement the T-02-01-01 through T-02-01-05 mitigations specified in the plan's threat model.

## Self-Check: PASSED

All 7 files verified present on disk. All 3 task commits verified in git log:
- 85bdb7a: feat(02-01) formatters module + GREEN unit tests (INPUT-03)
- ad3bdbc: feat(02-01) Zod schemas + ExpenseList component (D-12, D-13)
- 5e2a06f: test(02-01) Wave 0 RED test scaffolds for numpad, quick-add, edit actions
