# Phase 03: Offline Tolerance - Pattern Map

**Mapped:** 2026-05-02
**Files analyzed:** 19
**Analogs found:** 16 / 19

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `package.json` | config | batch | `package.json` | exact |
| `package-lock.json` | config | batch | `package-lock.json` | exact |
| `playwright.config.ts` | config | batch | `vitest.config.ts` | role-match |
| `src/lib/offline/types.ts` | model | transform | `src/lib/expenses/schemas.ts` | role-match |
| `src/lib/offline/expense-queue.ts` | service | CRUD + file-I/O | `src/lib/auth/indexeddb-storage.ts` | role-match |
| `src/lib/offline/expense-sync.ts` | service | event-driven + request-response | `src/routes/(app)/+page.server.ts` | data-flow-match |
| `src/lib/expenses/schemas.ts` | model | transform | `src/lib/expenses/schemas.ts` | exact |
| `src/lib/components/ExpenseList.svelte` | component | transform | `src/lib/components/ExpenseList.svelte` | exact |
| `src/routes/(app)/+page.svelte` | component | request-response + event-driven | `src/routes/(app)/+page.svelte` | exact |
| `src/routes/(app)/+page.server.ts` | controller | CRUD + request-response | `src/routes/(app)/+page.server.ts` | exact |
| `src/routes/(app)/expenses/+page.svelte` | component | transform | `src/routes/(app)/expenses/+page.svelte` | exact |
| `src/routes/(app)/expenses/[id]/edit/+page.svelte` | component | CRUD + request-response | `src/routes/(app)/expenses/[id]/edit/+page.svelte` | exact |
| `src/routes/(app)/expenses/[id]/edit/+page.server.ts` | controller | CRUD + request-response | `src/routes/(app)/expenses/[id]/edit/+page.server.ts` | exact |
| `src/routes/(app)/+layout.svelte` | provider | event-driven | `src/routes/(app)/+layout.svelte` | exact |
| `supabase/migrations/YYYYMMDDHH_phase3_idempotent_expense_insert.sql` | migration | CRUD | `supabase/migrations/2026042601_invite_lookup_rpc.sql` | role-match |
| `tests/offline/expense-queue.test.ts` | test | CRUD + file-I/O | `tests/expenses/quick-add.test.ts` | role-match |
| `tests/offline/expense-sync.test.ts` | test | event-driven + request-response | `tests/expenses/quick-add.test.ts` | role-match |
| `tests/e2e/offline-quick-add.spec.ts` | test | browser request-response | none | no-analog |
| `tests/setup.ts` | config | batch | `tests/setup.ts` | exact |

## Pattern Assignments

### `src/lib/offline/types.ts` (model, transform)

**Analog:** `src/lib/expenses/schemas.ts`

**Imports and validation pattern** (lines 1-4):
```typescript
import { z } from 'zod';

const uuidShape = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
```

**Enum and inferred type pattern** (lines 12-23, 58-60):
```typescript
export const VALID_CATEGORIES = [
	'Food',
	'Transport',
	'Entertainment',
	'Utilities',
	'Shopping',
	'Health',
	'Others'
] as const;

export type Category = (typeof VALID_CATEGORIES)[number];
export type SaveExpenseInput = z.infer<typeof saveExpenseSchema>;
```

**Apply:** define `SyncStatus = 'queued' | 'syncing' | 'failed'`, queued payload types, and view model types with `server_id?: string`, `client_id`, `household_id`, timestamps, retry metadata, and optional `sync_status`.

---

### `src/lib/offline/expense-queue.ts` (service, CRUD + file-I/O)

**Analog:** `src/lib/auth/indexeddb-storage.ts`

**Browser-safe IndexedDB availability pattern** (lines 94-100):
```typescript
function isIdbAvailable(): boolean {
	return typeof indexedDB !== 'undefined';
}
```

**Open and upgrade pattern** (lines 27-45):
```typescript
function openDb(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);

		request.onupgradeneeded = (event) => {
			const db = (event.target as IDBOpenDBRequest).result;
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				db.createObjectStore(STORE_NAME, { keyPath: 'key' });
			}
		};

		request.onsuccess = (event) => {
			resolve((event.target as IDBOpenDBRequest).result);
		};

		request.onerror = (event) => {
			reject((event.target as IDBOpenDBRequest).error);
		};
	});
}
```

**CRUD transaction pattern** (lines 66-87):
```typescript
const tx = db.transaction(STORE_NAME, 'readwrite');
const store = tx.objectStore(STORE_NAME);
const request = store.put({ key, value });

request.onsuccess = () => resolve();
request.onerror = (event) => reject((event.target as IDBRequest).error);
```

**Planner note:** research recommends adding `idb`; copy the availability and SSR/test guard from this analog, but implement the actual queue with `idb.openDB`, object-store indexes, and typed transactions from `03-RESEARCH.md`.

---

### `src/lib/offline/expense-sync.ts` (service, event-driven + request-response)

**Analogs:** `src/routes/(app)/+page.server.ts`, `src/routes/(app)/+layout.svelte`

**Auth/household guard pattern** (`+page.server.ts` lines 33-46):
```typescript
function getUserId(locals: App.Locals): string {
	const userId = locals.user?.id ?? locals.session?.user?.id;
	if (!userId) {
		throw redirect(303, '/auth');
	}
	return userId;
}

function getHouseholdId(locals: App.Locals): string {
	if (!locals.householdId) {
		throw redirect(303, '/onboarding');
	}
	return locals.householdId;
}
```

**Server failure classification pattern** (`+page.server.ts` lines 135-141):
```typescript
console.error(
	'[/+page.server] expense insert failed:',
	insertError.code,
	insertError.message,
	insertError.details
);
return fail(500, { error: 'Could not save expense.' });
```

**Client lifecycle mount pattern** (`+layout.svelte` lines 26-40):
```svelte
onMount(async () => {
	if (!browser || !isStandalone()) {
		standalonePending = false;
		return;
	}

	const gate = await getSessionGate();

	if (!gate.authenticated) {
		await goto('/auth?session=expired');
		return;
	}

	standalonePending = false;
});
```

**Apply:** install `online` and `visibilitychange` triggers in a browser-only mount path, pause flush without a session, recover stale `syncing` before flush, and classify auth/RLS/household failures as recoverable `failed` rows.

---

### `src/routes/(app)/+page.svelte` (component, request-response + event-driven)

**Analog:** `src/routes/(app)/+page.svelte`

**Imports pattern** (lines 1-11):
```svelte
import { tick } from 'svelte';
import { enhance } from '$app/forms';
import type { PageData } from './$types';
import InstallGuidanceBanner from '$lib/components/InstallGuidanceBanner.svelte';
import Numpad from '$lib/components/Numpad.svelte';
import CategoryGrid from '$lib/components/CategoryGrid.svelte';
import NoteSheet from '$lib/components/NoteSheet.svelte';
import GearMenu from '$lib/components/GearMenu.svelte';
import ExpenseList from '$lib/components/ExpenseList.svelte';
import { formatNumpad } from '$lib/expenses/formatters';
```

**Stable client ID and row state pattern** (lines 27-38):
```svelte
let amountStr = $state('');
let clientId = $state(crypto.randomUUID());
let debounced = $state(false);
let pressedCategory = $state<string | null>(null);
let sheetOpen = $state(false);
let savedExpense = $state<{ id: string; category: string; amount: number } | null>(null);
let lastError = $state<string | null>(null);

const initialTodayExpenses = data.todayExpenses;
let todayExpenses = $state(initialTodayExpenses);
```

**Submit-on-category-tap pattern** (lines 75-89):
```svelte
async function onCategoryTap(category: string) {
	if (debounced) return;
	if (amountStr === '' || amountStr === '0') return;

	const amount = parseInt(amountStr, 10);
	if (!Number.isFinite(amount) || amount <= 0) return;

	debounced = true;
	pressedCategory = category;
	pendingCategory = category;
	pendingAmount = amount;

	await tick();
	saveFormRef?.requestSubmit();
}
```

**Enhanced form success pattern** (lines 158-190):
```svelte
use:enhance={() => {
	return async ({ result }) => {
		if (
			result.type === 'success' &&
			result.data &&
			typeof result.data === 'object' &&
			'expense' in result.data
		) {
			const resultData = result.data as { expense: SavedExpense; duplicate?: boolean };
			const inserted = resultData.expense;

			if (!todayExpenses.some((e) => e.id === inserted.id)) {
				todayExpenses = [inserted, ...todayExpenses];
			}

			amountStr = '';
			clientId = crypto.randomUUID();
			sheetOpen = true;
		} else {
			showError("Couldn't save. Check your connection and try again.");
		}
	};
}}
```

**Apply:** branch save server-first; on browser offline or network failure, insert a queued row locally, reset amount, generate the next `clientId`, open `NoteSheet`, and prepend/merge with `sync_status: 'queued'`.

---

### `src/routes/(app)/+page.server.ts` (controller, CRUD + request-response)

**Analog:** `src/routes/(app)/+page.server.ts`

**Imports and row mapping pattern** (lines 1-8, 48-57):
```typescript
import type { Actions, PageServerLoad } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { saveExpenseSchema, saveNoteSchema } from '$lib/expenses/schemas';
import type { Database } from '$lib/types/database';

type ExpenseRow = Database['public']['Tables']['expenses']['Row'];
type ExpenseListRow = Pick<ExpenseRow, 'id' | 'amount' | 'category' | 'note' | 'spent_at'>;
```

```typescript
function asExpenseListRow(row: unknown): ExpenseListRow {
	const expense = row as ExpenseListRow;
	return {
		id: expense.id,
		amount: expense.amount,
		category: expense.category,
		note: expense.note,
		spent_at: expense.spent_at
	};
}
```

**Validation and insert pattern** (lines 88-115):
```typescript
const formData = await request.formData();
const parsed = saveExpenseSchema.safeParse({
	amount: Number(formData.get('amount')),
	category: formData.get('category'),
	client_id: formData.get('client_id'),
	spent_at: formData.get('spent_at')
});

if (!parsed.success) {
	return fail(400, { error: 'Invalid expense input.' });
}

const { data, error: insertError } = await supabase
	.from('expenses')
	.insert({
		household_id: locals.householdId,
		created_by: userId,
		amount: parsed.data.amount,
		category: parsed.data.category,
		note: null,
		spent_at: parsed.data.spent_at,
		client_id: parsed.data.client_id
	})
	.select('id, amount, category, note, spent_at')
	.single();
```

**Duplicate recovery pattern to replace with RPC** (lines 118-132):
```typescript
if ((insertError as PostgrestErrorLike).code === '23505') {
	let recoveryQuery = supabase
		.from('expenses')
		.select('id, amount, category, note, spent_at')
		.eq('client_id', parsed.data.client_id)
		.eq('household_id', householdId);

	const { data: existing, error: recoveryError } = await recoveryQuery.maybeSingle();
	if (!recoveryError && existing) {
		return { success: true, duplicate: true, expense: asExpenseListRow(existing) };
	}
}
```

**Apply:** preserve validation, `locals` authority, and response shape, but call `locals.supabase.rpc('save_expense_idempotent', ...)` instead of client-side unique-violation recovery.

---

### `src/lib/components/ExpenseList.svelte` (component, transform)

**Analog:** `src/lib/components/ExpenseList.svelte`

**Imports and row interface pattern** (lines 1-15):
```svelte
import { formatIDR, formatDisplayDate } from '$lib/expenses/formatters';
import { CATEGORY_META, type Category } from '$lib/expenses/schemas';

export interface ExpenseListItem {
	id: string;
	amount: number;
	category: string;
	note: string | null;
	spent_at: string;
}

interface Props {
	expenses: ExpenseListItem[];
}
```

**Keyed list and edit link pattern** (lines 37-44):
```svelte
<ul class="flex flex-col">
	{#each expenses as expense (expense.id)}
		<li>
			<a
				href="/expenses/{expense.id}/edit"
				class="flex min-h-[48px] items-center justify-between border-b py-3"
```

**Compact metadata pattern** (lines 45-60):
```svelte
<div class="flex flex-col">
	<span class="text-base font-semibold" style="color: var(--color-foreground)">
		<span aria-hidden="true">{emojiFor(expense.category)}</span>
		{expense.category}
	</span>
	{#if expense.note}
		<span class="text-sm" style="color: var(--color-muted)">{expense.note}</span>
	{/if}
</div>
<div class="flex flex-col items-end">
	<span class="text-base font-semibold" style="color: var(--color-foreground)">
		{formatIDR(expense.amount)}
	</span>
	<span class="text-sm" style="color: var(--color-muted)">
		{formatDisplayDate(expense.spent_at)}
	</span>
</div>
```

**Apply:** extend `ExpenseListItem` with `client_id?`, `server_id?`, and `sync_status?`; key rows by a stable view id; show `Waiting`, `Saving`, `Couldn't sync` as compact metadata; disable edit link or render non-link row while `sync_status === 'syncing'`.

---

### `src/routes/(app)/expenses/+page.svelte` (component, transform)

**Analog:** `src/routes/(app)/expenses/+page.svelte`

**Grouping pattern** (lines 18-32):
```svelte
const grouped = $derived.by<ExpenseGroup[]>(() => {
	const map = new Map<string, typeof data.expenses>();
	for (const e of data.expenses) {
		const key = toDateInputValue(e.spent_at);
		const existing = map.get(key);
		if (existing) existing.push(e);
		else map.set(key, [e]);
	}
	return Array.from(map.entries()).map(([dateKey, expenses]) => ({
		dateKey,
		label: formatDisplayDate(expenses[0].spent_at),
		expenses
	}));
});
```

**Shared list reuse pattern** (lines 69-73):
```svelte
{#each grouped as group (group.dateKey)}
	<div class="mb-6">
		<p class="mb-1 text-sm" style="color: var(--color-muted);">{group.label}</p>
		<ExpenseList expenses={group.expenses} />
	</div>
{/each}
```

**Apply:** merge queued local rows into the full-history view before grouping; preserve the existing `ExpenseList` reuse so status display stays identical to Today.

---

### `src/routes/(app)/expenses/[id]/edit/+page.svelte` (component, CRUD + request-response)

**Analog:** `src/routes/(app)/expenses/[id]/edit/+page.svelte`

**Form state initialization pattern** (lines 18-32):
```svelte
let amount = $state<string>('');
let selectedCategory = $state<string>('');
let note = $state<string>('');
let dateLocal = $state<string>('');
let fieldsInitialized = $state(false);

$effect(() => {
	if (fieldsInitialized) return;
	amount = String(data.expense.amount);
	selectedCategory = data.expense.category;
	note = data.expense.note ?? '';
	dateLocal = toDateInputValue(data.expense.spent_at);
	fieldsInitialized = true;
});
```

**Edit form pattern** (lines 77-89, 141-154):
```svelte
<form method="POST" action="?/saveEdit" use:enhance>
	<input
		id="amount"
		name="amount"
		type="text"
		inputmode="numeric"
		value={amount}
		oninput={onAmountInput}
	/>
	<input type="hidden" name="spent_at" value={spentAtIso} />
	<button type="submit">Save changes</button>
</form>
```

**Two-step delete pattern** (lines 37-52, 157-174):
```svelte
function onDeleteClick() {
	if (!deleteConfirm) {
		deleteConfirm = true;
		if (deleteTimer) clearTimeout(deleteTimer);
		deleteTimer = setTimeout(() => {
			deleteConfirm = false;
			deleteTimer = null;
		}, 3000);
	} else {
		deleteFormRef?.requestSubmit();
	}
}
```

**Apply:** for queued or failed local records, load from IndexedDB client-side or route via a `client_id`-based local edit path; saving overwrites the queued payload and requeues failed rows; deleting never-synced rows removes only IndexedDB state.

---

### `src/routes/(app)/expenses/[id]/edit/+page.server.ts` (controller, CRUD + request-response)

**Analog:** `src/routes/(app)/expenses/[id]/edit/+page.server.ts`

**Auth and load guard pattern** (lines 17-32):
```typescript
export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.session) {
		throw redirect(303, '/auth');
	}
	if (!locals.householdId) {
		throw redirect(303, '/onboarding');
	}

	const { data: raw, error: loadError } = await supabase
		.from('expenses')
		.select('id, amount, category, note, spent_at')
		.eq('id', params.id)
		.eq('is_deleted', false)
		.single();
```

**Validated update pattern** (lines 74-110):
```typescript
const parsed = editExpenseSchema.safeParse({
	amount: Number(amountStr),
	category: formData.get('category'),
	note: noteValue,
	spent_at: formData.get('spent_at')
});

if (!parsed.success) {
	return fail(400, {
		error: parsed.error.issues[0]?.message ?? 'Invalid input'
	});
}

const { error: updateError } = await supabase
	.from('expenses')
	.update({
		amount: parsed.data.amount,
		category: parsed.data.category,
		note: parsed.data.note,
		spent_at: parsed.data.spent_at
	})
	.eq('id', params.id)
	.eq('is_deleted', false);
```

**Soft-delete pattern** (lines 130-150):
```typescript
const { error: deleteError } = await supabase
	.from('expenses')
	.update({ is_deleted: true })
	.eq('id', params.id)
	.eq('is_deleted', false);

if (deleteError) {
	console.error(
		'[/expenses/[id]/edit/+page.server] deleteExpense failed:',
		deleteError.code,
		deleteError.message
	);
	return fail(500, {
		error: "Couldn't delete. Check your connection and try again."
	});
}
```

**Apply:** keep server routes for persisted rows. Do not use server tombstones for never-synced queued rows; local delete belongs in `expense-queue.ts`.

---

### `src/lib/expenses/schemas.ts` (model, transform)

**Analog:** `src/lib/expenses/schemas.ts`

**Save/edit schema pattern** (lines 24-56):
```typescript
export const saveExpenseSchema = z.object({
	amount: z.number().int('Amount must be a whole number').positive('Amount must be greater than 0'),
	category: z.enum(VALID_CATEGORIES, {
		message: 'Invalid category'
	}),
	client_id: z.string().regex(uuidShape, 'Invalid client_id (must be a UUID)'),
	spent_at: z.string().datetime('spent_at must be an ISO 8601 datetime')
});

export const editExpenseSchema = z.object({
	amount: z.number().int('Amount must be a whole number').positive('Amount must be greater than 0'),
	category: z.enum(VALID_CATEGORIES, {
		message: 'Invalid category'
	}),
	note: z.string().max(500, 'Note must be 500 characters or fewer').nullable(),
	spent_at: z.string().datetime('spent_at must be an ISO 8601 datetime')
});
```

**Apply:** add queue/RPC payload schemas by composing existing amount/category/date/note/client_id validation; do not create a second category list.

---

### `src/routes/(app)/+layout.svelte` (provider, event-driven)

**Analog:** `src/routes/(app)/+layout.svelte`

**Browser-only imports and mount pattern** (lines 1-5, 24-40):
```svelte
import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { onMount } from 'svelte';
import { getSessionGate, isStandalone } from '$lib/auth/session';

let standalonePending = $state(browser && isStandalone());

onMount(async () => {
	if (!browser || !isStandalone()) {
		standalonePending = false;
		return;
	}
});
```

**Apply:** mount queue flush triggers once inside the authenticated app shell, after session readiness. Keep the trigger installer browser-only and return cleanup callbacks for `online` and `visibilitychange` listeners.

---

### `supabase/migrations/YYYYMMDDHH_phase3_idempotent_expense_insert.sql` (migration, CRUD)

**Analogs:** `supabase/migrations/2026042601_invite_lookup_rpc.sql`, `supabase/migrations/2026042501_phase1_foundation.sql`

**RPC function structure pattern** (`2026042601_invite_lookup_rpc.sql` lines 3-15):
```sql
CREATE OR REPLACE FUNCTION public.lookup_household_invite(p_code text)
RETURNS TABLE (
  household_id uuid,
  household_name text,
  household_created_by uuid,
  household_created_at timestamptz,
  code text,
  expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
```

**RLS helper and policy pattern** (`2026042501_phase1_foundation.sql` lines 29-45, 190-196):
```sql
CREATE OR REPLACE FUNCTION public.is_household_member(
  p_household_id uuid,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.household_members hm
    WHERE hm.household_id = p_household_id
      AND hm.user_id = p_user_id
  );
$$;
```

```sql
CREATE POLICY expenses_household_insert
  ON public.expenses
  FOR INSERT
  WITH CHECK (
    public.expenses.created_by = auth.uid()
    AND public.is_household_member(public.expenses.household_id)
  );
```

**Existing unique constraint pattern** (`2026042501_phase1_foundation.sql` lines 91-101):
```sql
CREATE TABLE IF NOT EXISTS public.expenses (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id  uuid        NOT NULL REFERENCES public.households (id) ON DELETE CASCADE,
  created_by    uuid        NOT NULL REFERENCES public.profiles (id),
  amount        integer     NOT NULL CHECK (amount > 0),
  category      text        NOT NULL,
  note          text,
  spent_at      timestamptz NOT NULL,
  client_id     uuid        NOT NULL UNIQUE,
  is_deleted    boolean     NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);
```

**Apply:** create `save_expense_idempotent` using `INSERT ... ON CONFLICT (client_id) DO NOTHING RETURNING ...` and then select the existing visible row by `client_id`, `household_id`, and `is_deleted = false`.

---

### `package.json` and `package-lock.json` (config, batch)

**Analog:** `package.json`, `package-lock.json`

**Script/dependency pattern** (`package.json` lines 5-19):
```json
"scripts": {
  "dev": "vite dev",
  "build": "vite build",
  "preview": "vite preview",
  "check": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json",
  "test": "vitest run",
  "test:unit": "vitest run"
},
"dependencies": {
  "@supabase/ssr": "^0.10.2",
  "@supabase/supabase-js": "^2.104.1",
  "lucide-svelte": "^0.477.0",
  "zod": "^4.3.6"
}
```

**Apply:** add `idb` under dependencies; add `@playwright/test` and `fake-indexeddb` under devDependencies; add a `test:e2e` script if Playwright is added.

---

### `playwright.config.ts` (config, batch)

**Analog:** `vitest.config.ts`

**Project config shape** (lines 1-24):
```typescript
import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';

export default defineConfig({
	plugins: [svelte()],
	resolve: {
		conditions: ['browser'],
		alias: {
			$lib: path.resolve('./src/lib')
		}
	},
	test: {
		include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
		environment: 'jsdom',
		setupFiles: ['tests/setup.ts'],
		globals: true
	}
});
```

**Apply:** no Playwright config exists. Use Playwright's own `defineConfig` and start from the repo's existing command style; set `testDir: 'tests/e2e'` and configure `webServer` for `npm run dev` if the planner chooses automated local-server startup.

---

### `tests/offline/expense-queue.test.ts` and `tests/offline/expense-sync.test.ts` (test, CRUD/file-I/O/event-driven)

**Analogs:** `tests/expenses/quick-add.test.ts`, `tests/setup.ts`

**Vitest module reset pattern** (`quick-add.test.ts` lines 1-8):
```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('saveExpense action (INPUT-05)', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.clearAllMocks();
	});
});
```

**Mocked Supabase/action invocation pattern** (`quick-add.test.ts` lines 18-45):
```typescript
const single = vi.fn().mockResolvedValue({ data: insertedExpense, error: null });
const select = vi.fn().mockReturnValue({ single });
const insert = vi.fn().mockReturnValue({ select });
const from = vi.fn().mockReturnValue({ insert });
const mockSupabase = { from };

const { actions } = await import('../../src/routes/(app)/+page.server');
const request = new Request('http://localhost:5173/', {
	method: 'POST',
	headers: { 'content-type': 'application/x-www-form-urlencoded' },
	body
});

const result = await actions.saveExpense({
	request,
	locals: {
		session: { user: { id: 'user-1' } },
		user: { id: 'user-1' },
		householdId: 'household-1',
		supabase: mockSupabase
	}
} as never);
```

**Test setup pattern** (`tests/setup.ts` lines 1-17, 40-43):
```typescript
import '@testing-library/jest-dom';

Object.defineProperty(window, 'matchMedia', {
	writable: true,
	value: (query: string): MediaQueryList => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: () => {},
		removeListener: () => {},
		addEventListener: () => {},
		removeEventListener: () => {},
		dispatchEvent: () => false
	})
});

Object.defineProperty(window, 'localStorage', {
	value: localStorageMock,
	writable: true
});
```

**Apply:** add fake IndexedDB setup if needed, test queue CRUD, stale `syncing` recovery, event trigger installation/cleanup, failure classification, and no duplicate sync for stable `client_id`.

---

### `tests/e2e/offline-quick-add.spec.ts` (test, browser request-response)

**Analog:** none

No browser-level or Playwright tests exist in the repo. Use `03-RESEARCH.md` Playwright example and the existing user-facing Quick Add labels/buttons as the test surface. Required flow: offline save -> visible `Waiting` row -> online flush -> status disappears without duplicate.

## Shared Patterns

### Authentication and Household Authority
**Source:** `src/routes/(app)/+page.server.ts` lines 33-46; `src/routes/(app)/+layout.server.ts` lines 12-20  
**Apply to:** server actions, RPC wrapper, sync endpoint if created
```typescript
if (!locals.user) {
	throw redirect(303, '/auth');
}

return {
	user: locals.user,
	session: locals.session
};
```

Use `locals.householdId` and `locals.user/session` as authority. Queued `household_id` is only for mismatch detection and must never override server locals.

### Error Handling
**Source:** `src/routes/(app)/+page.server.ts` lines 73-76, 135-141; `src/routes/(app)/expenses/[id]/edit/+page.server.ts` lines 102-110
```typescript
if (expensesError) {
	console.error('[/+page.server] today expenses query failed:', expensesError.code, expensesError.message);
	throw error(503, 'Could not load expenses.');
}
```

```typescript
if (updateError) {
	console.error(
		'[/expenses/[id]/edit/+page.server] saveEdit failed:',
		updateError.code,
		updateError.message
	);
	return fail(500, {
		error: "Couldn't save changes. Check your connection and try again."
	});
}
```

### Validation
**Source:** `src/lib/expenses/schemas.ts` lines 24-56; `src/routes/(app)/+page.server.ts` lines 88-98  
**Apply to:** queue creation, queue edit, RPC/server action input
```typescript
const parsed = saveExpenseSchema.safeParse({
	amount: Number(formData.get('amount')),
	category: formData.get('category'),
	client_id: formData.get('client_id'),
	spent_at: formData.get('spent_at')
});

if (!parsed.success) {
	return fail(400, { error: 'Invalid expense input.' });
}
```

### Local/Server Row Merge
**Source:** `src/routes/(app)/+page.svelte` lines 174-180; `src/routes/(app)/expenses/+page.svelte` lines 18-32  
**Apply to:** Today list and `/expenses`
```svelte
if (!todayExpenses.some((e) => e.id === inserted.id)) {
	todayExpenses = [inserted, ...todayExpenses];
}

amountStr = '';
clientId = crypto.randomUUID();
sheetOpen = true;
```

Deduplicate by `client_id`, not only `id`, because queued rows do not have a server `id`.

### Database/RLS
**Source:** `supabase/migrations/2026042501_phase1_foundation.sql` lines 91-101, 185-205  
**Apply to:** Phase 03 RPC migration and server tests
```sql
client_id     uuid        NOT NULL UNIQUE,
is_deleted    boolean     NOT NULL DEFAULT false,
```

```sql
CREATE POLICY expenses_creator_update
  ON public.expenses
  FOR UPDATE
  USING (public.expenses.created_by = auth.uid())
  WITH CHECK (
    public.expenses.created_by = auth.uid()
    AND public.is_household_member(public.expenses.household_id)
  );
```

### Test Style
**Source:** `tests/expenses/quick-add.test.ts` lines 147-203; `tests/db/invite-rpcs.test.ts` lines 5-30  
**Apply to:** idempotency tests and migration coverage
```typescript
it('returns { success: true, duplicate: true, expense } when duplicate client_id (23505) is detected', async () => {
	const existingExpense = {
		id: 'exp-original',
		amount: 54000,
		category: 'Food',
		note: null,
		spent_at: '2026-04-26T12:00:00.000Z'
	};
	// Mock insert -> 23505 conflict
	const insertSingle = vi.fn().mockResolvedValue({ data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint' } });
});
```

```typescript
it('defines lookup and active-reuse invite RPCs in migrations', () => {
	const lookupMigration = readFileSync(
		resolve('supabase/migrations/2026042601_invite_lookup_rpc.sql'),
		'utf8'
	);

	expect(lookupMigration).toContain('lookup_household_invite');
});
```

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `tests/e2e/offline-quick-add.spec.ts` | test | browser request-response | No Playwright/browser-level e2e tests exist yet. |
| `playwright.config.ts` | config | batch | No Playwright config exists; `vitest.config.ts` is only a structural config analog. |
| `src/lib/offline/expense-queue.ts` | service | CRUD + file-I/O | Current IndexedDB adapter is hand-rolled auth key/value storage, not a typed `idb` queue with indexes. |

## Metadata

**Analog search scope:** `src/`, `tests/`, `supabase/migrations/`, `package.json`, `package-lock.json`, `vitest.config.ts`  
**Files scanned:** 58 source/test/config/migration files  
**Pattern extraction date:** 2026-05-02
