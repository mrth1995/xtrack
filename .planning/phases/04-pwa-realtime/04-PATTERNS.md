# Phase 4: PWA + Realtime - Pattern Map

**Mapped:** 2026-05-03
**Files analyzed:** 18 new/modified files
**Analogs found:** 14 / 18

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `package.json` | config | batch | `package.json` | exact |
| `package-lock.json` | config | batch | `package-lock.json` | exact |
| `vite.config.ts` | config | transform | `vite.config.ts` | exact |
| `src/app.html` | config | request-response | `src/app.html` | exact |
| `static/favicon.png` | config | file-I/O | none | no-analog |
| `static/apple-touch-icon.png` | config | file-I/O | none | no-analog |
| `static/pwa-192x192.png` | config | file-I/O | none | no-analog |
| `static/pwa-512x512.png` | config | file-I/O | none | no-analog |
| `src/lib/pwa/installability.ts` | utility | request-response | `src/lib/install/visibility.ts` | role-match |
| `src/lib/pwa/offline-shell.ts` | utility | event-driven | `src/lib/offline/expense-sync.ts` | data-flow-match |
| `src/lib/realtime/expenses.ts` | service | streaming | `src/lib/offline/expense-sync.ts` + `src/lib/supabase/client.ts` | partial |
| `src/lib/realtime/expense-merge.ts` | utility | transform | `src/routes/(app)/+page.svelte` | data-flow-match |
| `src/lib/components/InstallGuidanceBanner.svelte` | component | event-driven | `src/lib/components/InstallGuidanceBanner.svelte` | exact |
| `src/lib/components/ExpenseList.svelte` | component | CRUD | `src/lib/components/ExpenseList.svelte` | exact |
| `src/routes/+layout.svelte` | provider | request-response | `src/routes/+layout.svelte` | exact |
| `src/routes/(app)/+layout.svelte` | provider | event-driven | `src/routes/(app)/+layout.svelte` | exact |
| `src/routes/(app)/+page.svelte` | component | event-driven | `src/routes/(app)/+page.svelte` | exact |
| `tests/pwa/*.test.ts`, `tests/realtime/*.test.ts`, `tests/e2e/*.spec.ts` | test | event-driven | `tests/offline/expense-sync.test.ts`, `tests/households/shared-shell.test.ts`, `tests/e2e/offline-quick-add.spec.ts` | role-match |

## Pattern Assignments

### `vite.config.ts` (config, transform)

**Analog:** `vite.config.ts`

**Imports and plugin ordering pattern** (lines 1-7):
```typescript
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()]
});
```

**Apply:** add `SvelteKitPWA` import and place the PWA plugin in the existing `plugins` array without disturbing Tailwind or SvelteKit. Preserve `defineConfig` style.

---

### `package.json` / `package-lock.json` (config, batch)

**Analog:** `package.json`

**Dependency grouping pattern** (lines 5-23):
```json
"scripts": {
	"dev": "vite dev",
	"build": "vite build",
	"preview": "vite preview",
	"check": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json",
	"test": "vitest run",
	"test:e2e": "playwright test"
},
"dependencies": {
	"@supabase/ssr": "^0.10.2",
	"@supabase/supabase-js": "^2.104.1",
	"idb": "^8.0.3"
},
"devDependencies": {
	"@playwright/test": "^1.59.1",
	"@sveltejs/kit": "^2.16.0"
}
```

**Apply:** add PWA build tooling as dev dependencies, not runtime dependencies. Let `npm install -D @vite-pwa/sveltekit` update `package-lock.json`.

---

### `src/app.html` (config, request-response)

**Analog:** `src/app.html`

**Head metadata pattern** (lines 4-11):
```html
<meta charset="utf-8" />
<link rel="icon" href="%sveltekit.assets%/favicon.png" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="theme-color" content="#176B5D" />
%sveltekit.head%
```

**Apply:** add iOS title/icon metadata here if the PWA plugin does not inject it. Keep `%sveltekit.head%` in place and keep the current theme color unless the manifest intentionally changes it.

---

### `src/lib/pwa/installability.ts` (utility, request-response)

**Analog:** `src/lib/install/visibility.ts`

**Browser guard and platform detection pattern** (lines 36-63):
```typescript
export function isSafariBrowser(): boolean {
	if (typeof navigator === 'undefined') return false;
	const ua = navigator.userAgent;
	const isIOS = /iPhone|iPad|iPod/.test(ua);
	const isSafari = /Safari/.test(ua);
	const isChromeiOS = /CriOS/.test(ua);
	const isFirefoxiOS = /FxiOS/.test(ua);
	return isIOS && isSafari && !isChromeiOS && !isFirefoxiOS;
}

export function isStandalone(): boolean {
	if (typeof navigator === 'undefined' || typeof window === 'undefined') return false;
	if ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true) {
		return true;
	}
	if (typeof window.matchMedia === 'function') {
		return window.matchMedia('(display-mode: standalone)').matches;
	}
	return false;
}
```

**Snooze/storage pattern** (lines 69-88):
```typescript
export function isInstallGuidanceSnoozed(): boolean {
	if (typeof localStorage === 'undefined') return false;
	const raw = localStorage.getItem(SNOOZE_KEY);
	if (!raw) return false;
	const snoozedUntil = parseInt(raw, 10);
	if (isNaN(snoozedUntil)) return false;
	return Date.now() < snoozedUntil;
}

export function snoozeInstallGuidance(durationMs: number = DEFAULT_SNOOZE_MS): void {
	if (typeof localStorage === 'undefined') return;
	const until = Date.now() + durationMs;
	localStorage.setItem(SNOOZE_KEY, String(until));
}
```

**Apply:** extend this helper rather than replacing it. New Android `beforeinstallprompt` state should keep the same SSR-safe guards and localStorage style.

---

### `src/lib/pwa/offline-shell.ts` (utility, event-driven)

**Analog:** `src/lib/offline/expense-sync.ts`

**Lifecycle listener/cleanup pattern** (lines 264-288):
```typescript
export function installExpenseSyncTriggers(
	contextFactory: () => SyncContext,
	flush: (context: SyncContext) => Promise<FlushExpenseQueueResult> = flushExpenseQueue
): () => void {
	if (typeof window === 'undefined' || typeof document === 'undefined') {
		return () => {};
	}

	const flushCurrentContext = () => {
		void flush(contextFactory());
	};
	const flushWhenVisible = () => {
		if (document.visibilityState === 'visible') {
			flushCurrentContext();
		}
	};

	window.addEventListener('online', flushCurrentContext);
	document.addEventListener('visibilitychange', flushWhenVisible);

	return () => {
		window.removeEventListener('online', flushCurrentContext);
		document.removeEventListener('visibilitychange', flushWhenVisible);
	};
}
```

**Apply:** offline/stale shell state should expose an install function returning cleanup, guard SSR, and listen to `online`, `offline`, and `visibilitychange` only in the browser.

---

### `src/lib/realtime/expenses.ts` (service, streaming)

**Analogs:** `src/lib/supabase/client.ts`, `src/lib/offline/expense-sync.ts`

**Supabase browser client pattern** (client lines 1-5, 22-33):
```typescript
import { createBrowserClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import type { Database } from '$lib/types/database';
import { validateSupabasePublicEnv } from './env';
import { indexedDbSessionStorage } from '$lib/auth/indexeddb-storage';

export const supabase = createBrowserClient<Database>(
	supabaseEnv.url,
	supabaseEnv.anonKey,
	{
		auth: {
			storage: indexedDbSessionStorage,
			persistSession: true,
			autoRefreshToken: true,
			detectSessionInUrl: true
		}
	}
);
```

**Cleanup shape pattern** (expense-sync lines 281-287):
```typescript
window.addEventListener('online', flushCurrentContext);
document.addEventListener('visibilitychange', flushWhenVisible);

return () => {
	window.removeEventListener('online', flushCurrentContext);
	document.removeEventListener('visibilitychange', flushWhenVisible);
};
```

**Apply:** import the existing `supabase` browser client, subscribe with a household-scoped channel, and return cleanup that calls `supabase.removeChannel(channel)`. Do not create another Supabase client.

---

### `src/lib/realtime/expense-merge.ts` (utility, transform)

**Analog:** `src/routes/(app)/+page.svelte`

**Saved expense and local metadata pattern** (lines 24-34):
```typescript
interface SavedExpense {
	id: string;
	amount: number;
	category: string;
	note: string | null;
	spent_at: string;
	client_id: string;
	sync_status?: SyncStatus;
	household_id?: string;
	server_id?: string;
}
```

**Today merge/dedupe pattern** (lines 86-97):
```typescript
function mergeTodayExpenses(rows: SavedExpense[]): void {
	const merged = new Map<string, SavedExpense>();
	for (const row of [...rows, ...todayExpenses]) {
		const key = row.client_id ?? row.id;
		if (!merged.has(key)) {
			merged.set(key, row);
		}
	}
	todayExpenses = Array.from(merged.values()).sort((a, b) =>
		b.spent_at.localeCompare(a.spent_at)
	);
}
```

**Queued-to-visible transform pattern** (lines 72-84):
```typescript
function queuedToSavedExpense(expense: QueuedExpense): SavedExpense {
	return {
		id: expense.client_id,
		client_id: expense.client_id,
		server_id: expense.server_id,
		household_id: expense.household_id,
		amount: expense.amount,
		category: expense.category,
		note: expense.note,
		spent_at: expense.spent_at,
		sync_status: expense.sync_status
	};
}
```

**Apply:** extract pure merge behavior so tests can cover:
- strict skip when `client_id` already exists locally and row is not queued/syncing
- silent replacement when existing local row is `queued` or `syncing`
- new partner insert sorted into Today and returns a highlighted `client_id`

---

### `src/lib/components/InstallGuidanceBanner.svelte` (component, event-driven)

**Analog:** `src/lib/components/InstallGuidanceBanner.svelte`

**Imports and mount gating pattern** (lines 9-21):
```svelte
<script lang="ts">
	import { onMount } from 'svelte';
	import {
		shouldShowInstallGuidance,
		snoozeInstallGuidance
	} from '$lib/install/visibility';

	let visible = $state(false);

	onMount(() => {
		visible = shouldShowInstallGuidance(true);
	});
</script>
```

**Banner structure pattern** (lines 29-50):
```svelte
{#if visible}
	<div
		class="mb-4 flex items-start justify-between gap-3 rounded-xl border p-4"
		style="border-color: var(--color-accent); background: var(--color-surface)"
		role="banner"
		aria-label="Install guidance"
	>
		<div class="flex flex-col gap-1">
			<p class="text-sm font-semibold" style="color: var(--color-accent)">Add to Home Screen</p>
			<p class="text-sm" style="color: var(--color-text, #1A1A1A)">
				Tap Share, then Add to Home Screen
			</p>
		</div>
		<button onclick={dismiss} class="shrink-0 text-sm" aria-label="Dismiss install guidance">
			✕
		</button>
	</div>
{/if}
```

**Apply:** preserve non-modal banner semantics, snooze-on-dismiss, and Svelte 5 `$state`. Add platform-aware copy/control inside this component rather than creating another banner.

---

### `src/lib/components/ExpenseList.svelte` (component, CRUD)

**Analog:** `src/lib/components/ExpenseList.svelte`

**Row metadata pattern** (lines 5-16):
```typescript
export interface ExpenseListItem {
	id: string;
	client_id?: string;
	server_id?: string;
	household_id?: string;
	amount: number;
	category: string;
	note: string | null;
	spent_at: string;
	sync_status?: 'queued' | 'syncing' | 'failed';
	sync_error?: string | null;
}
```

**Stable keyed list pattern** (lines 53-61):
```svelte
<ul class="flex flex-col">
	{#each expenses as expense (expense.server_id ?? expense.id ?? expense.client_id)}
		<li>
			<svelte:element
				this={expense.sync_status === 'syncing' ? 'div' : 'a'}
				href={expense.sync_status === 'syncing' ? undefined : `/expenses/${expense.id}/edit`}
				class="flex min-h-[48px] items-center justify-between border-b py-3"
				style="border-color: var(--color-surface); touch-action: manipulation;"
			>
```

**Apply:** add highlight metadata/prop without breaking the existing key preference and queued/syncing link suppression. Keep the row minimum height stable.

---

### `src/routes/(app)/+layout.svelte` (provider, event-driven)

**Analog:** `src/routes/(app)/+layout.svelte`

**Imports and app shell lifecycle pattern** (lines 1-7, 30-66):
```svelte
<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { getSessionGate, isStandalone } from '$lib/auth/session';
	import { flushExpenseQueue, installExpenseSyncTriggers } from '$lib/offline/expense-sync';
	import type { LayoutData } from './$types';

	onMount(() => {
		if (!browser) {
			return;
		}

		let cleanup: (() => void) | undefined;

		void (async () => {
			if (!isStandalone()) {
				standalonePending = false;
				sessionReady = true;
			} else {
				const gate = await getSessionGate();
				if (!gate.authenticated) {
					await goto('/auth?session=expired');
					return;
				}
				sessionReady = true;
				standalonePending = false;
			}

			const contextFactory = () => ({
				sessionReady,
				householdId: data.householdId
			});

			cleanup = installExpenseSyncTriggers(contextFactory);
			if (data.householdId) {
				void flushExpenseQueue(contextFactory());
			}
		})();

		return () => cleanup?.();
	});
</script>
```

**Apply:** if offline/stale notice belongs globally, wire it here after `sessionReady`. Use one cleanup aggregator if adding another install function.

---

### `src/routes/(app)/+page.svelte` (component, event-driven)

**Analog:** `src/routes/(app)/+page.svelte`

**Import/state ownership pattern** (lines 1-19, 47-49):
```svelte
<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';
	import InstallGuidanceBanner from '$lib/components/InstallGuidanceBanner.svelte';
	import ExpenseList from '$lib/components/ExpenseList.svelte';
	import { flushExpenseQueue } from '$lib/offline/expense-sync';
	import type { QueuedExpense, SyncStatus } from '$lib/offline/types';

	const initialTodayExpenses = data.todayExpenses;
	let todayExpenses = $state<SavedExpense[]>(initialTodayExpenses);
</script>
```

**Mount merge/lifecycle pattern** (lines 164-198):
```typescript
onMount(() => {
	let refreshTimer: ReturnType<typeof setTimeout> | null = null;
	const scheduleFlushAndRefresh = () => {
		if (refreshTimer) {
			clearTimeout(refreshTimer);
		}
		refreshTimer = setTimeout(() => {
			void flushAndRefreshLocalRows();
		}, 50);
	};

	void (async () => {
		const queued = await getQueuedExpenses();
		const visible = queued
			.filter((row) => row.household_id === data.householdId && isToday(row.spent_at))
			.map(queuedToSavedExpense);
		mergeTodayExpenses(visible);
	})();

	window.addEventListener('online', scheduleFlushAndRefresh);
	document.addEventListener('visibilitychange', onVisible);

	return () => {
		if (refreshTimer) {
			clearTimeout(refreshTimer);
		}
		window.removeEventListener('online', scheduleFlushAndRefresh);
		document.removeEventListener('visibilitychange', onVisible);
	};
});
```

**Enhance/duplicate defense pattern** (lines 331-348):
```typescript
return async ({ result, formData }) => {
	if (
		result.type === 'success' &&
		result.data &&
		typeof result.data === 'object' &&
		'expense' in result.data
	) {
		const resultData = result.data as { expense: SavedExpense; duplicate?: boolean };
		const inserted = resultData.expense;

		if (!todayExpenses.some((e) => e.id === inserted.id)) {
			mergeTodayExpenses([inserted]);
		}
	}
};
```

**Apply:** subscribe to realtime only on Today. Feed events through `expense-merge.ts`, update `todayExpenses`, and pass highlight state into `ExpenseList`.

---

### `src/routes/+layout.svelte` (provider, request-response)

**Analog:** `src/routes/+layout.svelte`

**Root layout pattern** (lines 1-11):
```svelte
<script lang="ts">
	import '../app.css';

	interface Props {
		children: import('svelte').Snippet;
	}

	let { children }: Props = $props();
</script>

{@render children()}
```

**Apply:** keep root layout minimal. Prefer PWA plugin auto-registration; only add service-worker registration/status UI here if plugin defaults cannot provide required behavior.

---

### `tests/realtime/*.test.ts` (test, transform/event-driven)

**Analogs:** `tests/offline/expense-sync.test.ts`, `tests/offline/expense-queue.test.ts`

**Dynamic import/reset pattern** (expense-sync test lines 1-13):
```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest';

const queueModulePath = '$lib/offline/expense-queue';
const syncModulePath = '$lib/offline/expense-sync';

describe('offline expense sync orchestration (INPUT-09)', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.clearAllMocks();
	});
```

**Lifecycle cleanup assertion pattern** (expense-sync test lines 15-43):
```typescript
it('installs online and visibilitychange triggers and flushes when visible', async () => {
	const { installExpenseSyncTriggers } = await import(syncModulePath);
	const context = { householdId, sessionReady: true };
	const flushExpenseQueue = vi.fn().mockResolvedValue({ attempted: 0, synced: 0, failed: 0, paused: false });
	const cleanup = installExpenseSyncTriggers(() => context, flushExpenseQueue);

	window.dispatchEvent(new Event('online'));
	expect(flushExpenseQueue).toHaveBeenCalledTimes(1);

	cleanup();
	window.dispatchEvent(new Event('online'));
	expect(flushExpenseQueue).toHaveBeenCalledTimes(2);
});
```

**Apply:** test realtime subscription cleanup with mocked Supabase channel/removeChannel. Test pure merge with skip, queued replacement, and partner insert/highlight.

---

### `tests/pwa/*.test.ts` (test, request-response/event-driven)

**Analogs:** `tests/households/shared-shell.test.ts`, `tests/setup.ts`

**Navigator/localStorage stub pattern** (shared-shell test lines 37-50):
```typescript
function setUserAgent(ua: string) {
	Object.defineProperty(navigator, 'userAgent', {
		value: ua,
		writable: true,
		configurable: true
	});
}

function setStandalone(value: boolean) {
	Object.defineProperty(navigator, 'standalone', {
		value,
		writable: true,
		configurable: true
	});
}
```

**Install helper assertion pattern** (shared-shell test lines 67-88):
```typescript
it('returns false when standalone is true (app already on Home Screen)', () => {
	setStandalone(true);
	const result = shouldShowInstallGuidance(true);
	expect(result).toBe(false);
});

it('shouldShowInstallGuidance passes when standalone is false and auth+Safari context', () => {
	setStandalone(false);
	const result = shouldShowInstallGuidance(true);
	expect(result).toBe(true);
});
```

**Global setup pattern** (setup lines 4-18, 46-53):
```typescript
Object.defineProperty(window, 'matchMedia', {
	writable: true,
	value: (query: string): MediaQueryList => ({
		matches: false,
		media: query,
		onchange: null,
		addEventListener: () => {},
		removeEventListener: () => {}
	})
});

if (!('standalone' in navigator)) {
	Object.defineProperty(navigator, 'standalone', {
		get: () => false,
		configurable: true
	});
}
```

**Apply:** test PWA platform detection and offline/stale notice state with jsdom-safe stubs. Avoid brittle UA-only tests for Android prompt; mock `beforeinstallprompt`.

---

### `tests/e2e/*.spec.ts` (test, event-driven)

**Analog:** `tests/e2e/offline-quick-add.spec.ts`

**Offline browser flow pattern** (lines 1-24):
```typescript
import { expect, test } from '@playwright/test';

test('offline quick add queues then flushes without duplicate Food row', async ({ page, context }) => {
	await page.goto('/');
	await expect(page.getByRole('button', { name: 'Food' })).toBeVisible();

	await context.setOffline(true);
	await page.getByRole('button', { name: 'Food' }).click();

	await expect(page.getByText('Waiting')).toBeVisible();

	await context.setOffline(false);
	await page.evaluate(() => window.dispatchEvent(new Event('online')));

	await expect(page.getByText('Waiting')).toBeHidden();
	await expect(page.getByRole('link', { name: /Food/ })).toHaveCount(1);
});
```

**Playwright server pattern** (`playwright.config.ts` lines 3-19):
```typescript
export default defineConfig({
	testDir: 'tests/e2e',
	use: {
		baseURL: 'http://127.0.0.1:4173',
		trace: 'on-first-retry'
	},
	webServer: {
		command: 'PLAYWRIGHT_E2E_FIXTURE=1 npm run dev -- --host 127.0.0.1 --port 4173',
		url: 'http://127.0.0.1:4173',
		reuseExistingServer: false
	}
});
```

**Apply:** add e2e checks for manifest link/SW registration/offline shell load. Keep the existing fixture server style.

## Shared Patterns

### Browser-Only Work
**Source:** `src/routes/(app)/+layout.svelte`, `src/lib/install/visibility.ts`, `src/lib/offline/expense-sync.ts`  
**Apply to:** PWA helpers, offline shell helper, realtime subscription, app/page layouts
```typescript
if (typeof window === 'undefined' || typeof document === 'undefined') {
	return () => {};
}
```

### Household Scope
**Source:** `src/routes/(app)/+layout.server.ts`, `src/routes/(app)/+page.server.ts`  
**Apply to:** realtime subscription filter and Today-only page wiring
```typescript
return {
	user: locals.user,
	session: locals.session,
	householdId: locals.householdId
};
```

```typescript
const { data, error: expensesError } = await supabase
	.from('expenses')
	.select('id, amount, category, note, spent_at, client_id')
	.eq('household_id', householdId)
	.eq('is_deleted', false)
	.gte('spent_at', start)
	.lt('spent_at', end)
	.order('spent_at', { ascending: false });
```

### Client ID Dedupe and Queue Reconciliation
**Source:** `src/routes/(app)/+page.svelte`, `src/lib/offline/types.ts`  
**Apply to:** realtime merge and queue replacement
```typescript
const key = row.client_id ?? row.id;
if (!merged.has(key)) {
	merged.set(key, row);
}
```

```typescript
export type SyncStatus = 'queued' | 'syncing' | 'failed';

export interface QueuedExpense {
	client_id: string;
	server_id?: string;
	household_id: string;
	sync_status: SyncStatus;
}
```

### Error Handling
**Source:** `src/routes/(app)/+page.server.ts`, `src/lib/offline/expense-sync.ts`  
**Apply to:** tests and helpers that parse failure states
```typescript
if (expensesError) {
	console.error('[/+page.server] today expenses query failed:', expensesError.code, expensesError.message);
	throw error(503, 'Could not load expenses.');
}
```

```typescript
export function classifySyncError(error: unknown): SyncErrorKind {
	if (isNetworkError(error)) {
		return 'network';
	}
	const payload = asPayload(error);
	if (payload.syncErrorCode === 'auth') {
		return 'auth';
	}
	return 'unknown';
}
```

### Testing
**Source:** `tests/offline/expense-sync.test.ts`, `tests/households/shared-shell.test.ts`, `tests/e2e/offline-quick-add.spec.ts`  
**Apply to:** unit tests for helpers and e2e tests for offline shell/installability
```typescript
beforeEach(() => {
	vi.resetModules();
	vi.clearAllMocks();
});
```

```typescript
await context.setOffline(true);
await expect(page.getByText('Waiting')).toBeVisible();
await context.setOffline(false);
await page.evaluate(() => window.dispatchEvent(new Event('online')));
```

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `static/favicon.png` | config | file-I/O | `src/app.html` references it, but no `static` assets currently exist to copy from. |
| `static/apple-touch-icon.png` | config | file-I/O | No static directory assets exist yet. Generate/check in PWA PNG assets from project branding. |
| `static/pwa-192x192.png` | config | file-I/O | No icon-size precedent exists. Follow PWA manifest requirements from `04-RESEARCH.md`. |
| `static/pwa-512x512.png` | config | file-I/O | No maskable icon precedent exists. Follow PWA manifest requirements from `04-RESEARCH.md`. |

## Metadata

**Analog search scope:** `src/routes`, `src/lib`, `tests`, root config files, `static`  
**Files scanned:** 55 via `rg --files` plus targeted `rg` searches for install, standalone, household, offline, and sync patterns  
**Project instructions:** no root `AGENTS.md` or `CLAUDE.md`; no project-local `.claude/skills` or `.agents/skills` found  
**Pattern extraction date:** 2026-05-03
