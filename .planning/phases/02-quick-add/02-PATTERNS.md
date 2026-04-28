# Phase 2: Quick Add - Pattern Map

**Mapped:** 2026-04-27
**Files analyzed:** 12 new/modified files
**Analogs found:** 12 / 12

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/routes/(app)/+page.svelte` | page (replace) | request-response + event-driven | `src/routes/(app)/+page.svelte` (current) | exact — same file, being replaced |
| `src/routes/(app)/+page.server.ts` | server load + actions | CRUD | `src/routes/(app)/+page.server.ts` (current) | exact — same file, extended with named actions |
| `src/routes/(app)/expenses/+page.svelte` | page (new) | request-response | `src/routes/(app)/household/+page.svelte` | role-match — read-only list page |
| `src/routes/(app)/expenses/+page.server.ts` | server load | CRUD | `src/routes/(app)/+page.server.ts` (current) | exact — same Supabase query + is_deleted filter pattern |
| `src/routes/(app)/expenses/[id]/edit/+page.svelte` | page (new) | request-response | `src/routes/(app)/onboarding/create/+page.svelte` | role-match — form page with use:enhance |
| `src/routes/(app)/expenses/[id]/edit/+page.server.ts` | server load + actions | CRUD | `src/routes/(app)/onboarding/join/+page.server.ts` | role-match — named actions, fail+redirect pattern |
| `src/lib/components/Numpad.svelte` | component | event-driven | `src/lib/components/InstallGuidanceBanner.svelte` | partial — Svelte 5 $state component with dismiss interaction |
| `src/lib/components/CategoryGrid.svelte` | component | event-driven | `src/lib/components/InstallGuidanceBanner.svelte` | partial — interactive button component with $state |
| `src/lib/components/ExpenseList.svelte` | component | request-response | `src/routes/(app)/+page.svelte` (expense list section) | exact — uses identical list rendering pattern |
| `src/lib/components/NoteSheet.svelte` | component | event-driven | `src/lib/components/InstallGuidanceBanner.svelte` | role-match — overlay component with $state visibility |
| `src/lib/expenses/formatters.ts` | utility | transform | `src/lib/auth/schemas.ts` | role-match — pure export utility module |
| `src/lib/expenses/schemas.ts` | utility | transform | `src/lib/households/schemas.ts` | exact — Zod schema module, same structure |
| `tests/expenses/formatters.test.ts` | test | — | `tests/households/onboarding.test.ts` | exact — pure function unit test structure |
| `tests/expenses/numpad.test.ts` | test | — | `tests/households/onboarding-routes.test.ts` | role-match — action + state unit tests |
| `tests/expenses/quick-add.test.ts` | test | — | `tests/households/onboarding-routes.test.ts` | role-match — server action unit tests |
| `tests/expenses/edit.test.ts` | test | — | `tests/households/onboarding-routes.test.ts` | role-match — server action unit tests |

---

## Pattern Assignments

### `src/routes/(app)/+page.server.ts` (server load + named actions, CRUD)

**Analog:** `src/routes/(app)/+page.server.ts` (current file — being extended) and `src/routes/(app)/onboarding/join/+page.server.ts` (named actions pattern)

**Imports pattern** (`+page.server.ts` lines 1-2, `join/+page.server.ts` lines 1-3):
```typescript
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
```

**Auth guard pattern** (current `+page.server.ts` lines 49-51):
```typescript
export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.householdId) {
    throw redirect(303, '/onboarding');
  }
  const supabase = locals.supabase;
  const householdId = locals.householdId;
```

**Expense query pattern with is_deleted filter** (current `+page.server.ts` lines 104-115):
```typescript
const { data: expensesRaw, error: expensesError } = await supabase
  .from('expenses')
  .select('id, amount, category, note, spent_at, created_by')
  .eq('household_id', householdId)
  .eq('is_deleted', false)
  .order('spent_at', { ascending: false })
  .limit(5);

if (expensesError) {
  console.error('[/+page.server] expenses query failed:', expensesError.code, expensesError.message);
  throw error(503, 'Could not load household expenses.');
}
```

**Type cast pattern** (current `+page.server.ts` lines 128-137):
```typescript
const recentExpenses: RecentExpense[] = ((expensesRaw ?? []) as unknown as RecentExpense[]).map(
  (e) => ({
    id: e.id,
    amount: e.amount,
    category: e.category,
    note: e.note,
    spent_at: e.spent_at,
    created_by: e.created_by
  })
);
```

**Named actions pattern with Zod + fail** (`join/+page.server.ts` lines 17-58):
```typescript
export const actions: Actions = {
  saveExpense: async ({ request, locals }) => {
    if (!locals.session) {
      throw redirect(303, '/auth');
    }
    const formData = await request.formData();
    const rawValue = formData.get('amount');

    const parsed = saveExpenseSchema.safeParse({ amount: Number(rawValue), ... });
    if (!parsed.success) {
      return fail(400, {
        error: parsed.error.issues[0]?.message ?? 'Invalid input'
      });
    }

    const { data, error } = await locals.supabase
      .from('expenses')
      .insert({ household_id: locals.householdId, created_by: locals.user!.id, ... })
      .select('id, amount, category, note, spent_at')
      .single();

    if (error) return fail(500, { error: "Couldn't save. Check your connection and try again." });
    return { success: true, expense: data };
  }
};
```

**Key rules:**
- `saveExpense` and `saveNote` return `{ success: true, ... }` — no `redirect()` (client handles optimistic update)
- `saveEdit` and `deleteExpense` end with `throw redirect(303, '/')` after success
- `household_id` and `created_by` always come from `locals`, never from form data
- Always include `.eq('is_deleted', false)` on SELECT queries

---

### `src/routes/(app)/+page.svelte` (page, replaced, event-driven + request-response)

**Analog:** Current `src/routes/(app)/+page.svelte` + `src/routes/(app)/settings/invite/+page.svelte`

**Script block + $props + $derived pattern** (current `+page.svelte` lines 1-13):
```svelte
<script lang="ts">
  import type { PageData } from './$types';
  import { enhance } from '$app/forms';
  import InstallGuidanceBanner from '$lib/components/InstallGuidanceBanner.svelte';

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();

  const recentExpenses = $derived(data.todayExpenses);
```

**Svelte 5 local state pattern** (`settings/invite/+page.svelte` lines 10-11):
```svelte
let copied = $state(false);
// Phase 2 equivalent:
let amountStr = $state('');
let debounced = $state(false);
let slideUp = $state(false);
let clientId = $state(crypto.randomUUID());
```

**$derived computed value pattern** (research Pattern 2):
```svelte
const displayAmount = $derived(
  amountStr === '' || amountStr === '0'
    ? '0'
    : parseInt(amountStr, 10).toLocaleString('id-ID')
);
```

**use:enhance with optimistic update — no update() call** (research Pattern 1):
```svelte
<form method="POST" action="?/saveExpense" use:enhance={({ formData, cancel }) => {
  return async ({ result }) => {
    if (result.type === 'success' && result.data?.expense) {
      todayExpenses = [result.data.expense, ...todayExpenses];
      amountStr = '';
      clientId = crypto.randomUUID();
      slideUp = true;
    }
    // Do NOT call update() — prevents full page reload
    setTimeout(() => { debounced = false; }, 500);
  };
}}>
```

**Form POST to logout** (current `+page.svelte` lines 113-121):
```svelte
<form method="POST" action="/logout">
  <button
    type="submit"
    class="flex min-h-[44px] w-full items-center justify-center rounded-xl border px-4 py-2 text-sm font-semibold transition-colors"
    style="border-color: var(--color-border, #E7DED0); color: var(--color-muted); background: transparent"
  >
    Log out
  </button>
</form>
```

**Expense list rendering pattern** (current `+page.svelte` lines 60-101):
```svelte
{#if recentExpenses.length > 0}
  <ul class="flex flex-col gap-2">
    {#each recentExpenses as expense (expense.id)}
      <li class="flex items-center justify-between">
        <div>
          <span class="text-sm font-semibold" style="color: var(--color-text, #1A1A1A)">
            {expense.category}
          </span>
          {#if expense.note}
            <span class="ml-1 text-sm" style="color: var(--color-muted)">· {expense.note}</span>
          {/if}
        </div>
        <div class="flex flex-col items-end">
          <span class="text-sm font-semibold" style="color: var(--color-text, #1A1A1A)">
            Rp {formatAmount(expense.amount)}
          </span>
          <span class="text-xs" style="color: var(--color-muted)">
            {formatDate(expense.spent_at)}
          </span>
        </div>
      </li>
    {/each}
  </ul>
{:else}
  <div class="mb-4 rounded-xl border p-4"
       style="border-color: var(--color-border, #E7DED0); background: var(--color-surface)">
    <p class="text-sm" style="color: var(--color-muted)">
      No expenses yet today.
    </p>
  </div>
{/if}
```

**Touch target sizes** (current `+page.svelte` lines 51-57):
- Primary actions: `min-h-[48px]` (category tiles, save buttons)
- Secondary actions: `min-h-[44px]` (back links, secondary buttons)

---

### `src/routes/(app)/expenses/+page.svelte` (page, new, request-response)

**Analog:** `src/routes/(app)/household/+page.svelte`

**Page shell + back nav pattern** (`household/+page.svelte` lines 1-26):
```svelte
<script lang="ts">
  import type { PageData } from './$types';

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();

  const expenses = $derived(data.expenses);
</script>

<main class="flex min-h-screen flex-col px-4 py-8">
  <div class="mx-auto w-full max-w-sm">
    <a href="/" class="mb-4 inline-flex items-center text-sm" style="color: var(--color-muted)">
      ← Back
    </a>
    <h1 class="text-xl font-semibold" style="color: var(--color-text)">Expense history</h1>
  </div>
</main>
```

**List with empty state** (`household/+page.svelte` lines 46-48):
```svelte
{#if expenses.length === 0}
  <p class="text-sm" style="color: var(--color-muted)">No expenses yet.</p>
{:else}
  <ul class="flex flex-col gap-3">
    {#each expenses as expense (expense.id)}
      <li>
        <a href="/expenses/{expense.id}/edit" class="flex min-h-[48px] items-center justify-between">
          ...
        </a>
      </li>
    {/each}
  </ul>
{/if}
```

---

### `src/routes/(app)/expenses/+page.server.ts` (server load, CRUD)

**Analog:** `src/routes/(app)/+page.server.ts` (current)

**Load function with household guard + Supabase query** (lines 48-115 of current `+page.server.ts`):
```typescript
export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.householdId) {
    throw redirect(303, '/onboarding');
  }
  const supabase = locals.supabase;
  const householdId = locals.householdId;

  const { data: expensesRaw, error: expensesError } = await supabase
    .from('expenses')
    .select('id, amount, category, note, spent_at, created_by')
    .eq('household_id', householdId)
    .eq('is_deleted', false)
    .order('spent_at', { ascending: false });
    // No .limit() — full history

  if (expensesError) {
    console.error('[/expenses/+page.server] expenses query failed:', expensesError.code, expensesError.message);
    throw error(503, 'Could not load expenses.');
  }

  const expenses = ((expensesRaw ?? []) as unknown as ExpenseRow[]).map((e) => ({ ...e }));
  return { expenses };
};
```

---

### `src/routes/(app)/expenses/[id]/edit/+page.svelte` (page, new, request-response)

**Analog:** `src/routes/(app)/onboarding/create/+page.svelte`

**Form with use:enhance** (`create/+page.svelte` lines 28-61):
```svelte
<form method="POST" action="?/saveEdit" use:enhance>
  <div class="mb-4">
    <label for="amount" class="mb-1 block text-sm font-semibold" style="color: var(--color-text)">
      Amount
    </label>
    <input
      id="amount"
      name="amount"
      type="number"
      required
      value={data.expense.amount}
      class="w-full rounded-xl border px-4 py-3 text-base outline-none transition-colors focus:ring-2"
      style="border-color: var(--color-border); background: var(--color-surface); color: var(--color-text);"
    />
    {#if form?.error}
      <p class="mt-1 text-sm" style="color: var(--color-destructive)">{form.error}</p>
    {/if}
  </div>

  <button
    type="submit"
    class="flex min-h-[48px] w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-white transition-colors"
    style="background: var(--color-accent)"
  >
    Save
  </button>
</form>
```

**Two-step delete pattern** (research Code Examples):
```svelte
<script lang="ts">
  let deleteConfirm = $state(false);
  let deleteTimer: ReturnType<typeof setTimeout> | null = null;

  function onDeleteClick() {
    if (!deleteConfirm) {
      deleteConfirm = true;
      deleteTimer = setTimeout(() => { deleteConfirm = false; }, 3000);
    }
  }
</script>

<form method="POST" action="?/deleteExpense" use:enhance={...}>
  <button
    type={deleteConfirm ? 'submit' : 'button'}
    onclick={deleteConfirm ? undefined : onDeleteClick}
    class="min-h-[48px] w-full rounded-lg text-base font-semibold"
    style={deleteConfirm
      ? 'border: 1px solid var(--color-destructive); background: transparent; color: var(--color-destructive)'
      : 'background: var(--color-destructive); color: var(--color-destructive-foreground)'}
    aria-live="polite"
  >
    {deleteConfirm ? 'Tap again to confirm delete' : 'Delete expense'}
  </button>
</form>
```

---

### `src/routes/(app)/expenses/[id]/edit/+page.server.ts` (server load + named actions, CRUD)

**Analog:** `src/routes/(app)/onboarding/join/+page.server.ts`

**Load single record** (pattern from `household/+page.server.ts` lines 44-63, single() variant):
```typescript
export const load: PageServerLoad = async ({ locals, params }) => {
  if (!locals.householdId) {
    throw redirect(303, '/onboarding');
  }
  const supabase = locals.supabase;

  const { data: expenseRaw, error: expenseError } = await supabase
    .from('expenses')
    .select('id, amount, category, note, spent_at')
    .eq('id', params.id)
    .eq('is_deleted', false)
    .single();

  if (expenseError) {
    console.error('[/expenses/[id]/edit/+page.server] expense query failed:', expenseError.code);
    throw error(404, 'Expense not found.');
  }

  const expense = expenseRaw as unknown as ExpenseRow;
  return { expense };
};
```

**Named actions with fail + redirect** (`join/+page.server.ts` lines 60-96):
```typescript
export const actions: Actions = {
  saveEdit: async ({ request, locals, params }) => {
    const formData = await request.formData();
    const parsed = editExpenseSchema.safeParse({
      amount: Number(formData.get('amount')),
      category: formData.get('category'),
      note: formData.get('note') || null,
      spent_at: formData.get('spent_at')
    });
    if (!parsed.success) {
      return fail(400, { error: parsed.error.issues[0]?.message ?? 'Invalid input' });
    }

    const { error } = await locals.supabase
      .from('expenses')
      .update({ ...parsed.data })
      .eq('id', params.id);

    if (error) return fail(500, { error: "Couldn't save. Check your connection and try again." });
    throw redirect(303, '/expenses');
  },

  deleteExpense: async ({ locals, params }) => {
    const { error } = await locals.supabase
      .from('expenses')
      .update({ is_deleted: true })
      .eq('id', params.id);

    if (error) return fail(500, { error: "Couldn't delete. Check your connection and try again." });
    throw redirect(303, '/');
  }
};
```

---

### `src/lib/components/Numpad.svelte` (component, event-driven)

**Analog:** `src/lib/components/InstallGuidanceBanner.svelte` (Svelte 5 component with $state and event callbacks)

**Component structure with $props and $state** (`InstallGuidanceBanner.svelte` lines 1-27):
```svelte
<script lang="ts">
  import { onMount } from 'svelte';

  // $props for parent-provided values
  interface Props {
    amountStr: string;
    onDigit: (digit: string) => void;
    onBackspace: () => void;
  }
  let { amountStr, onDigit, onBackspace }: Props = $props();
</script>
```

**Button styling aligned with touch targets** (`+page.svelte` lines 51-57):
```svelte
<button
  type="button"
  onclick={() => onDigit('1')}
  class="flex min-h-[48px] w-full items-center justify-center rounded-xl text-xl font-semibold transition-colors"
  style="background: var(--color-surface); color: var(--color-text); touch-action: manipulation; user-select: none;"
>
  1
</button>
```

**Key rules:**
- Never use `<input type="number">` or `<input type="tel">` — buttons only (D-05)
- `touch-action: manipulation` on all numpad buttons to eliminate 300ms iOS tap delay
- `user-select: none` to prevent text selection on long press
- Grid layout: 3 columns, 4 rows (1-3, 4-6, 7-9, 000-0-⌫)

---

### `src/lib/components/CategoryGrid.svelte` (component, event-driven)

**Analog:** `src/lib/components/InstallGuidanceBanner.svelte` + button patterns from `+page.svelte`

**Props + debounce state + category tap handler** (research Pattern 1 + Pattern 2):
```svelte
<script lang="ts">
  interface Props {
    disabled: boolean;
    onCategoryTap: (category: string) => void;
  }
  let { disabled, onCategoryTap }: Props = $props();

  const CATEGORIES = [
    { name: 'Food', emoji: '🍜' },
    { name: 'Transport', emoji: '🚗' },
    { name: 'Entertainment', emoji: '🎬' },
    { name: 'Utilities', emoji: '💡' },
    { name: 'Shopping', emoji: '🛍️' },
    { name: 'Health', emoji: '❤️' },
    { name: 'Others', emoji: '✅' }
  ] as const;
</script>

<div class="grid grid-cols-3 gap-2">
  {#each CATEGORIES as cat}
    <button
      type="button"
      disabled={disabled}
      onclick={() => onCategoryTap(cat.name)}
      class="flex min-h-[48px] flex-col items-center justify-center rounded-xl border py-3 text-sm font-semibold transition-colors"
      style="border-color: var(--color-border); background: var(--color-surface); touch-action: manipulation;"
    >
      <span class="text-xl">{cat.emoji}</span>
      <span style="color: var(--color-text)">{cat.name}</span>
    </button>
  {/each}
</div>
```

---

### `src/lib/components/ExpenseList.svelte` (component, request-response)

**Analog:** Expense list section in `src/routes/(app)/+page.svelte` (lines 60-102)

**List rendering pattern** (current `+page.svelte` lines 68-91):
```svelte
<script lang="ts">
  interface Props {
    expenses: Array<{ id: string; amount: number; category: string; note: string | null; spent_at: string }>;
  }
  let { expenses }: Props = $props();
</script>

<ul class="flex flex-col gap-2">
  {#each expenses as expense (expense.id)}
    <li>
      <a
        href="/expenses/{expense.id}/edit"
        class="flex min-h-[48px] items-center justify-between"
        style="touch-action: manipulation;"
      >
        <div>
          <span class="text-sm font-semibold" style="color: var(--color-text, #1A1A1A)">
            {expense.category}
          </span>
          {#if expense.note}
            <span class="ml-1 text-sm" style="color: var(--color-muted)">· {expense.note}</span>
          {/if}
        </div>
        <div class="flex flex-col items-end">
          <span class="text-sm font-semibold" style="color: var(--color-text, #1A1A1A)">
            Rp {expense.amount.toLocaleString('id-ID')}
          </span>
          <span class="text-xs" style="color: var(--color-muted)">
            {formatDisplayDate(expense.spent_at)}
          </span>
        </div>
      </a>
    </li>
  {/each}
</ul>
```

**Note:** Use `amount.toLocaleString('id-ID')` (full IDR), NOT the `formatAmount` k/jt helper from the current `+page.svelte`. That helper is for the household summary only.

---

### `src/lib/components/NoteSheet.svelte` (component, event-driven overlay)

**Analog:** `src/lib/components/InstallGuidanceBanner.svelte` (visibility via $state; CSS controls display)

**Overlay component always in DOM, CSS class drives visibility** (research Pattern 3):
```svelte
<script lang="ts">
  interface Props {
    open: boolean;
    expense: { id: string; category: string; amount: number } | null;
    onSkip: () => void;
    onSave: (note: string) => void;
  }
  let { open, expense, onSkip, onSave }: Props = $props();

  let noteText = $state('');
  let inputEl: HTMLTextAreaElement | undefined = $state();

  $effect(() => {
    if (open && inputEl) {
      // iOS autofocus workaround — must be inside a setTimeout
      setTimeout(() => { inputEl?.focus(); }, 50);
    }
    if (!open) noteText = '';
  });
</script>

<div
  class="sheet"
  class:open
  role="dialog"
  aria-label="Add a note"
  aria-hidden={!open}
  inert={!open ? true : undefined}
>
  <!-- sheet content -->
</div>

<style>
  .sheet {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    transform: translateY(100%);
    transition: transform 250ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
    background: var(--color-bg);
    border-top: 1px solid var(--color-border);
    border-radius: 16px 16px 0 0;
    padding: 1.5rem 1rem;
  }
  .sheet.open {
    transform: translateY(0);
  }
</style>
```

**Critical:** The sheet must always be in the DOM — do NOT wrap in `{#if open}`. The CSS transition only plays if the element persists between state changes.

---

### `src/lib/expenses/formatters.ts` (utility, transform)

**Analog:** `src/lib/auth/schemas.ts` (pure export utility module structure)

**Module structure** (`auth/schemas.ts` lines 1-10):
```typescript
/**
 * Expense display formatters for xtrack Phase 2.
 *
 * IDR uses integer amounts (no sub-rupiah). All formatting uses
 * Intl.NumberFormat via toLocaleString('id-ID') — dot as thousands separator.
 */

/** Full IDR format with "Rp " prefix — for expense list rows */
export function formatIDR(amount: number): string {
  return 'Rp ' + amount.toLocaleString('id-ID');
}

/** Numpad display format — no prefix, dot separator only */
export function formatNumpad(amountStr: string): string {
  if (!amountStr || amountStr === '0') return '0';
  return parseInt(amountStr, 10).toLocaleString('id-ID');
}

/** Date display — id-ID locale, short month */
export function formatDisplayDate(timestamptz: string): string {
  return new Date(timestamptz).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short'
  });
}

/** Date input value — YYYY-MM-DD in WIB timezone (for <input type="date">) */
export function toDateInputValue(timestamptz: string): string {
  return new Date(timestamptz).toLocaleDateString('en-CA', {
    timeZone: 'Asia/Jakarta'
  });
}

/** Convert date input YYYY-MM-DD back to UTC ISO string (WIB midnight) */
export function fromDateInputValue(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00+07:00').toISOString();
}
```

---

### `src/lib/expenses/schemas.ts` (utility, Zod schemas)

**Analog:** `src/lib/households/schemas.ts` (exact structure — Zod schema file)

**Schema module structure** (`households/schemas.ts` lines 1-29):
```typescript
import { z } from 'zod';

const VALID_CATEGORIES = [
  'Food', 'Transport', 'Entertainment', 'Utilities', 'Shopping', 'Health', 'Others'
] as const;

export const saveExpenseSchema = z.object({
  amount: z.number().int().positive().max(99_999_999),
  category: z.enum(VALID_CATEGORIES),
  client_id: z.string().uuid(),
  spent_at: z.string().datetime()
});

export const saveNoteSchema = z.object({
  expense_id: z.string().uuid(),
  note: z.string().max(500).optional()
});

export const editExpenseSchema = z.object({
  amount: z.number().int().positive().max(99_999_999),
  category: z.enum(VALID_CATEGORIES),
  note: z.string().max(500).nullable(),
  spent_at: z.string().datetime()
});

export type SaveExpenseInput = z.infer<typeof saveExpenseSchema>;
export type EditExpenseInput = z.infer<typeof editExpenseSchema>;
```

---

### `tests/expenses/formatters.test.ts` (test, pure functions)

**Analog:** `tests/households/onboarding.test.ts` (pure function unit tests with describe/it blocks)

**Test module structure** (`onboarding.test.ts` lines 1-16, 64-111):
```typescript
import { describe, it, expect } from 'vitest';
import { formatIDR, formatNumpad, toDateInputValue, fromDateInputValue } from '$lib/expenses/formatters';

describe('formatIDR', () => {
  it('formats integer with dot separator and Rp prefix', () => {
    expect(formatIDR(54000)).toBe('Rp 54.000');
  });

  it('formats zero', () => {
    expect(formatIDR(0)).toBe('Rp 0');
  });
});

describe('formatNumpad', () => {
  it('returns "0" for empty string', () => {
    expect(formatNumpad('')).toBe('0');
  });

  it('returns "54.000" for "54000"', () => {
    expect(formatNumpad('54000')).toBe('54.000');
  });
});
```

---

### `tests/expenses/numpad.test.ts` + `tests/expenses/quick-add.test.ts` + `tests/expenses/edit.test.ts` (tests, server actions)

**Analog:** `tests/households/onboarding-routes.test.ts` (server action tests with vi.mock + Request constructor)

**Server action test structure** (`onboarding-routes.test.ts` lines 1-76):
```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock service or Supabase client
const mockSupabaseFrom = vi.fn();
vi.mock('$lib/expenses/schemas', () => ({ ... }));

describe('saveExpense action', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('inserts expense and returns success with expense data', async () => {
    const { actions } = await import('../../src/routes/(app)/+page.server');
    const body = new URLSearchParams({
      amount: '54000',
      category: 'Food',
      client_id: crypto.randomUUID(),
      spent_at: new Date().toISOString()
    });
    const request = new Request('http://localhost:5173/', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body
    });

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'exp-1', ... }, error: null })
          })
        })
      })
    };

    const result = await actions.saveExpense({
      request,
      locals: {
        session: { user: { id: 'user-1' } },
        householdId: 'household-1',
        supabase: mockSupabase,
        user: { id: 'user-1' }
      }
    } as never);

    expect(result).toMatchObject({ success: true });
  });

  it('returns fail(400) when amount is 0', async () => {
    // ...
  });

  it('sets is_deleted=true on deleteExpense and redirects', async () => {
    // ...
    await expect(actions.deleteExpense({ ... })).rejects.toMatchObject({
      status: 303,
      location: '/'
    });
  });
});
```

---

## Shared Patterns

### Authentication / Household Guard
**Source:** `src/routes/(app)/+page.server.ts` lines 49-51 and `src/routes/(app)/onboarding/join/+page.server.ts` lines 7-14
**Apply to:** All new `+page.server.ts` files
```typescript
if (!locals.householdId) {
  throw redirect(303, '/onboarding');
}
// Also check session in actions:
if (!locals.session) {
  throw redirect(303, '/auth');
}
```

### Error Handling — Server Actions
**Source:** `src/routes/(app)/onboarding/join/+page.server.ts` lines 50-57 and `create/+page.server.ts` lines 38-44
**Apply to:** All named action functions in server files
```typescript
// Validation error (client mistake):
return fail(400, { error: parsed.error.issues[0]?.message ?? 'Invalid input' });

// Database error (server problem):
return fail(500, { error: "Couldn't save. Check your connection and try again." });

// Auth/redirect (always throw, never return):
throw redirect(303, '/');
```

### Error Display in Templates
**Source:** `src/routes/(app)/onboarding/create/+page.svelte` lines 48-50
**Apply to:** All form pages with server action
```svelte
{#if form?.error}
  <p class="mt-1 text-sm" style="color: var(--color-destructive)">{form.error}</p>
{/if}
```

### Supabase Type Cast
**Source:** `src/routes/(app)/+page.server.ts` lines 70-78 and 128-137
**Apply to:** All Supabase `.select()` results in server files
```typescript
// Pattern: cast via unknown to avoid Supabase generic narrowing to never
const typed = raw as unknown as ExpectedType | null;
// For arrays:
const items = ((rawArray ?? []) as unknown as ExpectedType[]).map((item) => ({ ...item }));
```

### CSS Design Tokens
**Source:** `src/app.css` lines 13-20
**Apply to:** All new `.svelte` template files — inline style attributes
```
--color-bg: #F7F3EB
--color-surface: #E7DED0
--color-accent: #176B5D
--color-accent-foreground: #FFFFFF
--color-destructive: #B9382F
--color-destructive-foreground: #FFFFFF
--color-foreground: #1A1A1A
--color-muted: #6B6560
--color-border: (use var(--color-surface) as fallback when border-color needed)
```
Never hardcode hex values; always use `var(--color-*)` properties.

### Touch Target Sizes
**Source:** `src/routes/(app)/+page.svelte` lines 51-57, 105-111
**Apply to:** All interactive elements in new components
- Primary actions (submit, category tiles): `min-h-[48px]`
- Secondary actions (back, skip, cancel): `min-h-[44px]`
- Add `touch-action: manipulation` on all button/link elements to eliminate 300ms iOS tap delay

### Svelte 5 Component Shell
**Source:** `src/routes/(app)/settings/invite/+page.svelte` lines 1-9, `src/routes/(app)/+page.svelte` lines 1-13
**Apply to:** All new `.svelte` files
```svelte
<script lang="ts">
  import type { PageData } from './$types';  // for pages
  // or:
  // import { ... } from '$lib/...';          // for components

  interface Props {
    data: PageData;  // for pages
    // or component-specific props
  }

  let { data }: Props = $props();  // Svelte 5 runes — never use export let
</script>
```

### Zod Validation in Actions
**Source:** `src/routes/(app)/onboarding/create/+page.server.ts` lines 26-32 and `join/+page.server.ts` lines 30-38
**Apply to:** All server actions that receive form data
```typescript
const parsed = schemaName.safeParse({
  amount: Number(formData.get('amount')),
  category: formData.get('category'),
  // ... other fields
});
if (!parsed.success) {
  return fail(400, {
    error: parsed.error.issues[0]?.message ?? 'Invalid input'
  });
}
```

### Supabase Client — Always from locals
**Source:** `src/routes/(app)/+page.server.ts` line 55, `household/+page.server.ts` line 41
**Apply to:** All server files
```typescript
// Always use locals.supabase (request-scoped, set by hooks.server.ts)
const supabase = locals.supabase;
// Never import and create a new client directly in load/action functions
```

---

## No Analog Found

All Phase 2 files have close analogs in the codebase. No files require falling back to RESEARCH.md patterns exclusively. The bottom sheet CSS animation (NoteSheet) and gear menu dropdown are the two patterns with no exact analog — both are covered in RESEARCH.md Pattern 3 and the Code Examples section respectively.

---

## Metadata

**Analog search scope:** `src/routes/(app)/`, `src/lib/`, `tests/`
**Files scanned:** 18 source files, 8 test files
**Pattern extraction date:** 2026-04-27
