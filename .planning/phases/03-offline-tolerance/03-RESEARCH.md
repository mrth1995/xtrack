# Phase 03: Offline Tolerance - Research

**Researched:** 2026-05-02
**Domain:** SvelteKit offline mutation queue, IndexedDB durability, Supabase idempotent inserts
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

## Implementation Decisions

### Offline Save Experience
- **D-01:** Offline category-tap saves should feel the same as normal saves: reset the amount, add the expense to the visible list immediately, and show only a subtle queued row status.
- **D-02:** The post-save note sheet remains available for queued offline expenses. Notes entered there are stored with the queued expense before sync.
- **D-03:** Do not show an upfront offline warning when the app opens offline. Quick Add stays normal until a queued row exists.

### Queued Item Editing
- **D-04:** Queued expenses are editable and deletable before they sync.
- **D-05:** Rows in the short `syncing` state temporarily disable edit/delete to avoid race conditions. If the item returns to `queued` or `failed`, edit/delete becomes available again.
- **D-06:** Deleting a never-synced queued expense removes it from the local queue and visible list immediately. Do not create a server tombstone for never-synced rows.
- **D-07:** If a queued expense's date changes so it no longer belongs in Today, move it immediately to the correct list context. It should remain available in full history.

### Sync Status Visibility
- **D-08:** Synced rows look unchanged. Unsynced rows show a compact per-row status in both Today and `/expenses`.
- **D-09:** Use user-friendly labels: `Waiting`, `Saving`, and `Couldn't sync`.
- **D-10:** `Waiting` and `Saving` should be visually subtle. `Couldn't sync` should use warning/destructive styling so action-needed rows are scannable.
- **D-11:** The full history page uses the same row statuses as Today.

### Failure and Retry Behavior
- **D-12:** If Supabase rejects a queued write, keep the row local as `Couldn't sync`; it remains editable and deletable.
- **D-13:** Failed rows retry automatically on normal flush triggers and also expose a manual Retry action.
- **D-14:** Saving edits to a failed row requeues it and moves it back to `Waiting`.
- **D-15:** Required 5-minute stuck `syncing` recovery should quietly return the row to `Waiting`; do not show a banner or mark it failed solely because of timeout recovery.

### Local Queue Storage
- **D-16:** Store only the current expense payload in the local queue: amount, category, note, spent_at, client_id, household_id, status, timestamps, and retry metadata. Edits overwrite the queued payload; no local edit history or audit log in v1.
- **D-17:** Key queued records locally by `client_id` until Supabase returns the server `id`. Attach the server `id` after successful sync.

### Auth, Household, and Server Conflicts
- **D-18:** If sync is rejected because auth is expired, household membership is missing, or RLS denies insert, keep the row local as `Couldn't sync` and guide the user to sign in or check household access.
- **D-19:** Pause automatic queue flushing until a valid session exists.
- **D-20:** If the current household no longer matches the queued expense's household, keep the item local as `Couldn't sync`. Never silently sync it into a different household.

### Network Detection and Flush Triggers
- **D-21:** When the browser reports online, try the server first. If the browser reports offline or the request fails due to network conditions, create a queued local item.
- **D-22:** Flush the queue on `online`, foreground resume (`visibilitychange` back to visible), and app open/session-ready.
- **D-23:** If the app starts with queued items and browser state is online, flush immediately after session and household are ready.

### Testing Expectations
- **D-24:** Phase 03 requires automated unit/integration tests plus a browser-level offline flow before it counts as done.
- **D-25:** Browser simulation is enough for Phase 03; manual installed-PWA/iOS UAT belongs in Phase 04 unless browser testing exposes issues.
- **D-26:** The required browser flow is: offline save -> visible `Waiting` row -> online flush -> status disappears without duplicate.

### the agent's Discretion
- Exact IndexedDB wrapper/library shape, store names, and queue module boundaries are planner/implementer choices.
- Exact placement of compact row status within `ExpenseList` can follow the existing mobile row layout.
- Retry timing beyond the required triggers can be conservative as long as it avoids noisy repeated unauthorized requests and preserves data.

### Claude's Discretion

- Exact IndexedDB wrapper/library shape, store names, and queue module boundaries are planner/implementer choices.
- Exact placement of compact row status within `ExpenseList` can follow the existing mobile row layout.
- Retry timing beyond the required triggers can be conservative as long as it avoids noisy repeated unauthorized requests and preserves data.

### Deferred Ideas (OUT OF SCOPE)

None - discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INPUT-08 | Expense logged without connectivity is queued in IndexedDB with `sync_status: "queued"` | Use an `idb` object store keyed by `client_id`, with a local row model containing `sync_status`, timestamps, payload, household, and retry metadata. [VERIFIED: .planning/REQUIREMENTS.md; Context7 /jakearchibald/idb] |
| INPUT-09 | Queue flushes to Supabase on foreground resume (`visibilitychange`) and on `online` event | Register browser-only listeners for `window.online` and `document.visibilitychange`; `online` is only a trigger, not proof Supabase is reachable. [VERIFIED: .planning/REQUIREMENTS.md; CITED: https://developer.mozilla.org/en-US/docs/Web/API/Window/online_event; CITED: https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilitychange_event] |
| INPUT-10 | `IN_FLIGHT` recovery: any queued entry stuck in `"syncing"` for >5 min is reset to `"queued"` on app open | Run a queue recovery function before the first flush on app open/session-ready; compare `sync_started_at` to `Date.now() - 5 * 60 * 1000`. [VERIFIED: .planning/REQUIREMENTS.md; VERIFIED: .planning/phases/03-offline-tolerance/03-CONTEXT.md] |
| INPUT-11 | Server insert uses `ON CONFLICT (client_id) DO NOTHING` for idempotent retry safety | Add a Postgres RPC that performs `INSERT ... ON CONFLICT (client_id) DO NOTHING RETURNING ...`, then selects the existing row when no insert row is returned. [VERIFIED: .planning/REQUIREMENTS.md; CITED: https://www.postgresql.org/docs/current/sql-insert.html; CITED: https://supabase.com/docs/reference/javascript/rpc] |
</phase_requirements>

## Summary

Phase 03 should extend the existing Quick Add path with a durable client-side mutation queue, not replace the app with a broad offline-first data layer. The current code already has the required stable `client_id`, Quick Add optimistic UI, `ExpenseList` reuse across Today and history, server validation with Zod, Supabase access via `locals.supabase`, and an `expenses.client_id` unique constraint. [VERIFIED: src/routes/(app)/+page.svelte; VERIFIED: src/routes/(app)/+page.server.ts; VERIFIED: src/lib/components/ExpenseList.svelte; VERIFIED: supabase/migrations/2026042501_phase1_foundation.sql]

Use `idb` for the local queue. It is the smallest standard IndexedDB wrapper that gives typed object stores, Promise APIs, and transactions without introducing a full sync framework. Store one canonical queued expense per `client_id`, overwrite that record for note/edit changes, and expose a small Svelte-readable queue state layer so Today and `/expenses` can merge server rows with local unsynced rows. [VERIFIED: npm registry; VERIFIED: Context7 /jakearchibald/idb; VERIFIED: .planning/phases/03-offline-tolerance/03-CONTEXT.md]

The critical backend change is moving idempotency from "catch unique violation" to true server-side `ON CONFLICT (client_id) DO NOTHING`. Implement this as a Supabase RPC/Postgres function rather than client-side duplicate handling, because retries after crashes/network timeouts must be safe even if the browser cannot know whether the prior request committed. [CITED: https://www.postgresql.org/docs/current/sql-insert.html; CITED: https://supabase.com/docs/reference/javascript/rpc; VERIFIED: src/routes/(app)/+page.server.ts]

**Primary recommendation:** Add `idb` for IndexedDB queue storage, add a `save_expense_idempotent` RPC for `ON CONFLICT (client_id) DO NOTHING`, and add `@playwright/test` for the required browser offline flow. [VERIFIED: npm registry; CITED: https://playwright.dev/docs/api/class-browsercontext]

## Project Constraints (from AGENTS.md / CLAUDE.md)

- No `AGENTS.md` or `CLAUDE.md` file exists in the project root. [VERIFIED: `find . -maxdepth 3 -name AGENTS.md -o -name CLAUDE.md`]
- No project-local `.claude/skills/*/SKILL.md` or `.agents/skills/*/SKILL.md` files were found. [VERIFIED: `find .claude .agents -maxdepth 4 -name SKILL.md`]
- Planning config has `workflow.nyquist_validation: true`; include automated validation architecture. [VERIFIED: .planning/config.json]
- Planning config has `security_enforcement` absent; treat security domain as enabled. [VERIFIED: .planning/config.json]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| Offline save decision | Browser / Client | API / Backend | The browser knows connectivity state and must preserve input immediately; when it appears online it should try the server first. [VERIFIED: 03-CONTEXT.md D-21] |
| Local queue durability | Browser / Client | Database / Storage (IndexedDB) | IndexedDB is browser storage designed for rich offline-capable web apps. [CITED: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB] |
| Queue flush orchestration | Browser / Client | API / Backend | Browser lifecycle events trigger flush; backend validates and inserts. [CITED: MDN online/visibilitychange docs; VERIFIED: 03-CONTEXT.md D-22] |
| Stuck `syncing` recovery | Browser / Client | IndexedDB | Recovery is local state repair before attempting network IO. [VERIFIED: .planning/REQUIREMENTS.md INPUT-10] |
| Server idempotency | API / Backend | Database / Storage | Postgres unique `client_id` plus `ON CONFLICT DO NOTHING` owns duplicate prevention. [VERIFIED: supabase migration; CITED: PostgreSQL INSERT docs] |
| Household/auth rejection | API / Backend | Browser / Client | RLS and `locals` enforce authority; browser maps rejection into recoverable `failed` state. [VERIFIED: src/hooks.server.ts; CITED: Supabase RLS docs] |
| Row status display | Browser / Client | — | `ExpenseList` already owns shared row rendering for Today and history. [VERIFIED: src/lib/components/ExpenseList.svelte] |
| Queued edit/delete | Browser / Client | IndexedDB | Never-synced rows are local records; edits overwrite queued payload and delete removes the local record. [VERIFIED: 03-CONTEXT.md D-04-D-07, D-16] |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| SvelteKit | installed `2.16.0`; latest `2.59.0`, modified 2026-05-01 | Existing app framework, routes, form actions, SSR/load boundaries | Locked project stack; do not upgrade inside Phase 03 unless planner explicitly budgets upgrade risk. [VERIFIED: package.json; VERIFIED: npm registry] |
| Svelte | installed `5.25.0` | Runes-based component state for Quick Add and row status UI | Existing components use `$state`, `$derived`, `$props`. [VERIFIED: package.json; VERIFIED: src/routes/(app)/+page.svelte] |
| `@supabase/supabase-js` | installed `2.104.1`; latest `2.105.1`, modified 2026-04-30 | Browser/client SDK types and RPC support | Existing Supabase integration; RPC is the clean path to Postgres idempotency. [VERIFIED: package.json; VERIFIED: npm registry; CITED: https://supabase.com/docs/reference/javascript/rpc] |
| `@supabase/ssr` | installed `0.10.2` | Request-scoped SvelteKit Supabase client | Existing `locals.supabase` pattern is established in hooks and actions. [VERIFIED: package.json; VERIFIED: src/hooks.server.ts] |
| Zod | installed `4.3.6` | Queue payload and server action validation | Existing save/edit schemas use Zod; extend those rather than adding another validator. [VERIFIED: package.json; VERIFIED: src/lib/expenses/schemas.ts] |
| `idb` | latest `8.0.3`, published 2025-05-07 | Typed Promise wrapper for IndexedDB queue store | Small, typed, transaction-aware wrapper; enough for this queue without Dexie-level abstractions. [VERIFIED: npm registry; VERIFIED: Context7 /jakearchibald/idb] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest | installed `3.1.1`; latest `4.1.5`, modified 2026-04-23 | Unit/integration tests for queue module, schemas, and server RPC call handling | Keep existing runner for queue logic and component tests. [VERIFIED: package.json; VERIFIED: npm registry] |
| `@testing-library/svelte` | installed `5.2.7`; latest `5.3.1`, modified 2025-12-25 | Component tests for `ExpenseList`, Quick Add offline status, edit/delete disablement | Existing Svelte component test pattern. [VERIFIED: package.json; VERIFIED: npm registry] |
| `fake-indexeddb` | latest `6.2.5`, modified 2025-11-07 | IndexedDB API implementation for unit tests | Add if Vitest/jsdom cannot exercise `idb` reliably with real IndexedDB APIs. [VERIFIED: npm registry] |
| `@playwright/test` | latest `1.59.1`, modified 2026-05-01 | Browser offline/online flow required by D-24/D-26 | Needed because current repo has no browser-level offline test framework. [VERIFIED: npm registry; CITED: https://playwright.dev/docs/api/class-browsercontext] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `idb` | Hand-written IndexedDB wrapper | Existing auth storage hand-roll is okay for key/value auth but expense queue needs typed stores, indexes, and transactions; `idb` reduces fragile event-handler code. [VERIFIED: src/lib/auth/indexeddb-storage.ts; VERIFIED: Context7 /jakearchibald/idb] |
| `idb` | Dexie | Dexie is useful for richer querying/observability; this phase only needs one queue store, a few indexes, and ordered flush. [ASSUMED] |
| Supabase RPC with SQL `ON CONFLICT` | Supabase JS `.upsert({ ignoreDuplicates: true, onConflict: 'client_id' })` | `.upsert()` supports `onConflict` and `ignoreDuplicates`, but a custom RPC can return the inserted or existing row in one server-owned contract and avoid client-side ambiguity. [CITED: https://supabase.com/docs/reference/javascript/upsert; CITED: PostgreSQL INSERT docs] |
| Playwright | Manual browser UAT only | D-24 requires browser-level automated flow before done; manual-only does not satisfy context. [VERIFIED: 03-CONTEXT.md D-24-D-26] |
| Background Sync API | App-open/online/visibility triggers | Phase 03 context locks triggers and Phase 04 owns broader PWA/service-worker work; do not pull service worker sync forward. [VERIFIED: 03-CONTEXT.md D-22; VERIFIED: .planning/REQUIREMENTS.md PWA-03 pending Phase 4] |

**Installation:**
```bash
npm install idb
npm install -D @playwright/test fake-indexeddb
```

**Version verification:** `npm view idb version time.modified`, `npm view @playwright/test version time.modified`, and `npm view fake-indexeddb version time.modified` were run on 2026-05-02. [VERIFIED: npm registry]

## Architecture Patterns

### System Architecture Diagram

```text
Category tap
  |
  v
[Browser Quick Add]
  |-- if navigator.onLine false ---------------------------.
  |                                                        |
  |-- if online: POST existing save path / RPC             |
  |        |                                               |
  |        | success -> prepend synced row, reset input    |
  |        |                                               |
  |        '-- network failure -> queue locally ------------'
  |
  v
[IndexedDB queue store: key = client_id]
  status: queued | syncing | failed
  payload: amount/category/note/spent_at/household_id/client_id
  timestamps: created_at/updated_at/sync_started_at
  retry metadata
  |
  v
[Merged UI model]
  server rows + local unsynced rows
  Today and /expenses use same ExpenseList status labels
  |
  v
[Flush triggers]
  app open/session-ready -> recover stale syncing -> flush
  window online -> probe by attempting flush
  visibilitychange visible -> flush
  manual retry -> flush one item
  |
  v
[Flush worker]
  queued/failed -> mark syncing -> POST/RPC
    | success: attach server id, remove/mark synced local row
    | auth/RLS/household rejection: failed + reason
    | network failure: queued or failed per retry policy
  |
  v
[Supabase RPC / Postgres]
  INSERT expenses (...)
  ON CONFLICT (client_id) DO NOTHING
  RETURNING id, amount, category, note, spent_at
  if no inserted row: SELECT existing visible row by client_id + household_id + is_deleted=false
```

### Recommended Project Structure

```text
src/
├── lib/
│   ├── offline/
│   │   ├── expense-queue.ts        # idb schema, CRUD, recovery, selection
│   │   ├── expense-sync.ts         # flush orchestration and result classification
│   │   └── types.ts                # QueuedExpense, sync status, view model
│   ├── expenses/
│   │   └── schemas.ts              # extend existing schemas for queue/RPC payload
│   └── components/
│       └── ExpenseList.svelte      # compact status labels + disabled syncing rows
├── routes/
│   └── (app)/
│       ├── +page.svelte            # branch save path, merge today rows, trigger flush
│       ├── +page.server.ts         # server action calls idempotent RPC
│       └── expenses/               # merge local queue into history client-side
└── tests/
    ├── offline/
    │   ├── expense-queue.test.ts
    │   └── expense-sync.test.ts
    └── e2e/
        └── offline-quick-add.spec.ts

supabase/
└── migrations/
    └── YYYYMMDDHH_phase3_idempotent_expense_insert.sql
```

### Pattern 1: Typed IndexedDB Queue Store

**What:** Use `idb.openDB` with a `DBSchema`, a `queued-expenses` object store keyed by `client_id`, and indexes for `sync_status`, `household_id`, and `spent_at`. [VERIFIED: Context7 /jakearchibald/idb]

**When to use:** All local queued expense create/read/update/delete operations and stuck `syncing` recovery. [VERIFIED: 03-CONTEXT.md D-16-D-17]

**Example:**
```typescript
// Source: Context7 /jakearchibald/idb, based on openDB + DBSchema patterns
import { openDB, type DBSchema } from 'idb';

type SyncStatus = 'queued' | 'syncing' | 'failed';

interface QueuedExpense {
	client_id: string;
	server_id?: string;
	household_id: string;
	amount: number;
	category: string;
	note: string | null;
	spent_at: string;
	sync_status: SyncStatus;
	created_at: string;
	updated_at: string;
	sync_started_at: string | null;
	retry_count: number;
	last_error: string | null;
}

interface XtrackOfflineDb extends DBSchema {
	'queued-expenses': {
		key: string;
		value: QueuedExpense;
		indexes: {
			by_status: SyncStatus;
			by_household: string;
			by_spent_at: string;
		};
	};
}

export const dbPromise = openDB<XtrackOfflineDb>('xtrack-offline', 1, {
	upgrade(db) {
		const store = db.createObjectStore('queued-expenses', { keyPath: 'client_id' });
		store.createIndex('by_status', 'sync_status');
		store.createIndex('by_household', 'household_id');
		store.createIndex('by_spent_at', 'spent_at');
	}
});
```

### Pattern 2: Recover Stale `syncing` Before Flush

**What:** On app open/session-ready, reset records with `sync_status === 'syncing'` and `sync_started_at` older than 5 minutes back to `queued`. [VERIFIED: .planning/REQUIREMENTS.md INPUT-10]

**When to use:** Before every startup flush and as a low-cost guard before event-triggered flushes. [VERIFIED: 03-CONTEXT.md D-15, D-22-D-23]

**Example:**
```typescript
// Source: idb transaction pattern from Context7 /jakearchibald/idb
export async function recoverStaleSyncing(now = Date.now()) {
	const cutoff = now - 5 * 60 * 1000;
	const db = await dbPromise;
	const tx = db.transaction('queued-expenses', 'readwrite');
	const index = tx.store.index('by_status');

	for await (const cursor of index.iterate('syncing')) {
		const item = cursor.value;
		if (item.sync_started_at && Date.parse(item.sync_started_at) < cutoff) {
			await cursor.update({
				...item,
				sync_status: 'queued',
				sync_started_at: null,
				updated_at: new Date(now).toISOString()
			});
		}
	}

	await tx.done;
}
```

### Pattern 3: Server-Owned Idempotent Insert RPC

**What:** Use a Postgres function callable via Supabase RPC that inserts once by `client_id` and returns either the new row or the existing visible row. [CITED: PostgreSQL INSERT docs; CITED: Supabase RPC docs]

**When to use:** Current `saveExpense` server action and queue flushes. [VERIFIED: src/routes/(app)/+page.server.ts]

**Example:**
```sql
-- Source: PostgreSQL INSERT docs for ON CONFLICT DO NOTHING + RETURNING.
CREATE OR REPLACE FUNCTION public.save_expense_idempotent(
  p_household_id uuid,
  p_amount integer,
  p_category text,
  p_note text,
  p_spent_at timestamptz,
  p_client_id uuid
)
RETURNS TABLE (
  id uuid,
  amount integer,
  category text,
  note text,
  spent_at timestamptz
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  RETURN QUERY
  WITH inserted AS (
    INSERT INTO public.expenses (
      household_id, created_by, amount, category, note, spent_at, client_id
    )
    VALUES (
      p_household_id, auth.uid(), p_amount, p_category, p_note, p_spent_at, p_client_id
    )
    ON CONFLICT (client_id) DO NOTHING
    RETURNING expenses.id, expenses.amount, expenses.category, expenses.note, expenses.spent_at
  )
  SELECT * FROM inserted
  UNION ALL
  SELECT e.id, e.amount, e.category, e.note, e.spent_at
  FROM public.expenses e
  WHERE e.client_id = p_client_id
    AND e.household_id = p_household_id
    AND e.is_deleted = false
    AND NOT EXISTS (SELECT 1 FROM inserted)
  LIMIT 1;
END;
$$;
```

### Pattern 4: Lifecycle Flush Triggers

**What:** Install browser-only listeners for `online` and `visibilitychange`, and call the same `flushQueue()` function after session/household readiness. [CITED: MDN online docs; CITED: MDN visibilitychange docs]

**When to use:** In `(app)` layout or a small client-only component mounted once for authenticated app routes. [VERIFIED: src/routes/(app)/+layout.svelte]

**Example:**
```typescript
// Source: MDN online and visibilitychange docs
export function installQueueFlushTriggers(flushQueue: () => Promise<void>) {
	const onOnline = () => void flushQueue();
	const onVisibility = () => {
		if (document.visibilityState === 'visible') void flushQueue();
	};

	window.addEventListener('online', onOnline);
	document.addEventListener('visibilitychange', onVisibility);

	return () => {
		window.removeEventListener('online', onOnline);
		document.removeEventListener('visibilitychange', onVisibility);
	};
}
```

### Anti-Patterns to Avoid

- **Treating `navigator.onLine` as Supabase availability:** MDN warns that `online` does not prove a specific website is reachable; always attempt the request and classify failures. [CITED: https://developer.mozilla.org/en-US/docs/Web/API/Window/online_event]
- **Generating a new `client_id` on retry:** The existing Phase 2 correctness depends on stable `client_id`; retries must reuse the original queued `client_id`. [VERIFIED: src/routes/(app)/+page.svelte; VERIFIED: 02-VERIFICATION.md]
- **Marking stale `syncing` as failed:** D-15 requires quiet reset to `Waiting`, not a failure label. [VERIFIED: 03-CONTEXT.md]
- **Letting client-supplied household override current household:** Existing server actions derive household from `locals`; queued payload household is for mismatch detection, not authority. [VERIFIED: src/routes/(app)/+page.server.ts; VERIFIED: 03-CONTEXT.md D-20]
- **Deleting never-synced rows on the server:** D-06 explicitly says local delete only, no tombstone. [VERIFIED: 03-CONTEXT.md]
- **Trying to finish IndexedDB writes during unload:** MDN notes IndexedDB transactions are asynchronous and cannot be guaranteed during browser shutdown. Persist the queue immediately on save, not at page exit. [CITED: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| IndexedDB Promise/transaction wrapper | Custom event-to-Promise wrapper for every request | `idb` | IndexedDB has async events, version upgrades, object stores, indexes, and transaction completion; `idb` provides Promise shortcuts and typed stores. [CITED: MDN IndexedDB docs; VERIFIED: Context7 /jakearchibald/idb] |
| Server duplicate prevention | Client-only "already synced" flag | Postgres unique `client_id` + `ON CONFLICT (client_id) DO NOTHING` | Network timeouts can commit server-side while the browser thinks the request failed. [CITED: PostgreSQL INSERT docs; VERIFIED: supabase migration] |
| Browser offline testing | Manual DevTools toggling only | `@playwright/test` `browserContext.setOffline(true/false)` | The phase explicitly requires a browser-level offline flow and Playwright supports context-level offline emulation. [VERIFIED: 03-CONTEXT.md D-24-D-26; CITED: Playwright docs] |
| Queue validation | Ad hoc object shape checks | Existing Zod schemas plus queue-specific Zod schema | Current expense actions already validate with Zod; reuse keeps category/amount/date rules consistent. [VERIFIED: src/lib/expenses/schemas.ts] |
| RLS bypass for sync | Service-role server endpoint | Existing `locals.supabase` authenticated client and RLS policies | Project state says `service_role` never enters client bundle and RLS is the household boundary. [VERIFIED: .planning/STATE.md; VERIFIED: supabase migration] |

**Key insight:** Offline tolerance is mostly a consistency problem, not a UI problem. The planner must prioritize durable local writes before UI reset, stable `client_id` reuse, and server-side idempotency over extra retry sophistication. [VERIFIED: 03-CONTEXT.md; VERIFIED: 02-REVIEWS.md]

## Common Pitfalls

### Pitfall 1: Request Failed But Server Insert Succeeded

**What goes wrong:** Browser queues or retries an expense after a network timeout even though Supabase committed the original insert. [ASSUMED]

**Why it happens:** Client-side request failure does not prove server rollback. [ASSUMED]

**How to avoid:** Reuse the same `client_id` and make the server insert idempotent with `ON CONFLICT (client_id) DO NOTHING`. [CITED: PostgreSQL INSERT docs; VERIFIED: supabase migration]

**Warning signs:** Duplicate rows for the same category/amount/time or tests that only cover double-tap debounce, not same-`client_id` retry. [VERIFIED: 02-REVIEWS.md]

### Pitfall 2: Queue Item Stuck Forever in `syncing`

**What goes wrong:** App crashes or tab closes after marking an item `syncing` but before marking success/failure. [VERIFIED: .planning/REQUIREMENTS.md INPUT-10]

**Why it happens:** `syncing` is a local lock state; process death can interrupt cleanup. [ASSUMED]

**How to avoid:** Startup recovery resets `syncing` older than 5 minutes to `queued` before flush. [VERIFIED: 03-CONTEXT.md D-15]

**Warning signs:** Queue has `syncing` rows with old `sync_started_at`; UI shows permanent `Saving`. [VERIFIED: .planning/REQUIREMENTS.md]

### Pitfall 3: Browser `online` Event Causes False Confidence

**What goes wrong:** Flush code assumes `online` means Supabase is reachable and treats failures as server rejections. [CITED: MDN online docs]

**Why it happens:** `online` only reflects browser network state, not target service reachability. [CITED: MDN online docs]

**How to avoid:** Use `online` as a trigger only; classify failed fetch/Supabase calls as network failures unless the response clearly indicates auth/RLS/validation. [VERIFIED: 03-CONTEXT.md D-21]

**Warning signs:** Offline rows become `Couldn't sync` immediately after reconnect attempts in flaky Wi-Fi. [ASSUMED]

### Pitfall 4: Merging Local and Server Rows by `id` Only

**What goes wrong:** A queued row keyed by `client_id` and a later server row keyed by `id` both render. [VERIFIED: 03-CONTEXT.md D-17]

**Why it happens:** Current `ExpenseList` keys rows by `id`; queued rows do not have server IDs yet. [VERIFIED: src/lib/components/ExpenseList.svelte]

**How to avoid:** Define a view model with `view_id = server_id ?? client_id`, retain `client_id`, and de-duplicate merged local/server rows by `client_id`. [ASSUMED]

**Warning signs:** Row appears once as `Waiting` and again as synced after flush. [ASSUMED]

### Pitfall 5: Unauthorized Retry Storm

**What goes wrong:** Expired auth or lost household membership causes repeated automatic flush failures. [VERIFIED: 03-CONTEXT.md D-18-D-20]

**Why it happens:** Flush triggers fire on app open, online, and foreground; without classification, every trigger retries doomed writes. [VERIFIED: 03-CONTEXT.md D-22]

**How to avoid:** Pause automatic flushing until session exists; mark auth/RLS/household mismatch as `failed` with user guidance and avoid hot-loop retries. [VERIFIED: 03-CONTEXT.md D-18-D-20]

**Warning signs:** Console logs repeated 401/403/RLS failures or `retry_count` increments quickly while session is absent. [ASSUMED]

## Code Examples

### Supabase RPC Call From Server Action

```typescript
// Source: Supabase RPC docs and existing locals.supabase pattern
const { data, error } = await locals.supabase.rpc('save_expense_idempotent', {
	p_household_id: locals.householdId,
	p_amount: parsed.data.amount,
	p_category: parsed.data.category,
	p_note: parsed.data.note ?? null,
	p_spent_at: parsed.data.spent_at,
	p_client_id: parsed.data.client_id
});

if (error) {
	return fail(500, { error: 'Could not save expense.' });
}

return { success: true, expense: data?.[0] };
```

### Playwright Offline Flow

```typescript
// Source: Playwright BrowserContext.setOffline docs
test('offline save queues then syncs without duplicate', async ({ page, context }) => {
	await page.goto('/');
	await context.setOffline(true);

	await page.getByRole('button', { name: '5' }).click();
	await page.getByRole('button', { name: '000' }).click();
	await page.getByRole('button', { name: /Food/ }).click();

	await expect(page.getByText('Waiting')).toBeVisible();

	await context.setOffline(false);
	await page.evaluate(() => window.dispatchEvent(new Event('online')));

	await expect(page.getByText('Waiting')).toBeHidden();
	await expect(page.getByText(/Food/)).toHaveCount(1);
});
```

### Merge Server and Local Queue Rows

```typescript
// Source: local codebase ExpenseList row shape + Phase 03 D-08/D-17
type ExpenseViewItem = {
	id: string;
	client_id: string;
	amount: number;
	category: string;
	note: string | null;
	spent_at: string;
	sync_status?: 'queued' | 'syncing' | 'failed';
};

export function mergeExpenseRows(serverRows: ExpenseViewItem[], localRows: ExpenseViewItem[]) {
	const byClientId = new Map<string, ExpenseViewItem>();

	for (const row of serverRows) byClientId.set(row.client_id, row);
	for (const row of localRows) {
		if (!byClientId.has(row.client_id)) byClientId.set(row.client_id, row);
	}

	return Array.from(byClientId.values()).sort(
		(a, b) => Date.parse(b.spent_at) - Date.parse(a.spent_at)
	);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hand-written IndexedDB request wrappers | `idb` Promise API with typed `DBSchema` | `idb` latest 8.0.3 published 2025-05-07 | Planner can add a small dependency instead of expanding custom IndexedDB code. [VERIFIED: npm registry; VERIFIED: Context7 /jakearchibald/idb] |
| Client-side duplicate recovery after unique violation | SQL `INSERT ... ON CONFLICT (client_id) DO NOTHING` behind RPC | Requirement locked for Phase 03 | Idempotency becomes a server/database contract, not UI logic. [VERIFIED: .planning/REQUIREMENTS.md INPUT-11; CITED: PostgreSQL INSERT docs] |
| Manual offline browser testing only | Automated Playwright `setOffline` flow | Playwright API available before v1.9 and latest package is 1.59.1 | Satisfies browser-level offline flow without waiting for installed-PWA/iOS UAT. [CITED: Playwright docs; VERIFIED: npm registry] |

**Deprecated/outdated:**
- Treating Phase 01/early research references to TanStack offline mutation persistence as current direction is outdated for Phase 03; the app already uses direct SvelteKit actions and needs a narrow queue, not a query-cache layer. [VERIFIED: .planning/research/STACK.md; VERIFIED: current src routes]
- Relying on Phase 02's `23505` catch as final idempotency is outdated; Phase 03 explicitly requires `ON CONFLICT (client_id) DO NOTHING`. [VERIFIED: src/routes/(app)/+page.server.ts; VERIFIED: .planning/REQUIREMENTS.md INPUT-11]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Dexie is unnecessary for this phase's single-store queue. | Standard Stack / Alternatives | If queue querying grows, planner may under-budget storage abstraction work. |
| A2 | Browser request failure can occur after a committed server insert. | Common Pitfalls | If dismissed, retry idempotency may be treated as optional rather than core. |
| A3 | `syncing` can survive process death because cleanup may be interrupted. | Common Pitfalls | If wrong, recovery still harmless; if omitted and true, rows can get stuck. |
| A4 | Local/server merge should use `client_id` for dedupe and `server_id ?? client_id` for view identity. | Common Pitfalls / Code Examples | If current generated types omit `client_id` from list rows, planner must add it to selects before merge works. |
| A5 | Unauthorized retry storms are likely without failure classification. | Common Pitfalls | If wrong, backoff may be overbuilt; if right and ignored, app can spam Supabase after auth/RLS failures. |

## Open Questions

1. **Should queue flush use a new JSON endpoint or existing form action?**
   - What we know: Current Quick Add uses SvelteKit form actions with `use:enhance`; queue flushes are programmatic and do not need progressive enhancement. [VERIFIED: src/routes/(app)/+page.svelte; CITED: SvelteKit form actions docs]
   - What's unclear: Whether project style prefers named actions for all mutations or accepts a small `+server.ts` endpoint/RPC wrapper for programmatic sync. [ASSUMED]
   - Recommendation: Keep `saveExpense` as the UI path but factor shared server logic into a helper; queue flush can call a dedicated action-compatible endpoint only if planner wants clearer tests. [ASSUMED]

2. **Should successful queued rows remain in IndexedDB after attaching server `id`?**
   - What we know: D-17 says attach server `id` after successful sync, but success criteria say synced status disappears. [VERIFIED: 03-CONTEXT.md]
   - What's unclear: Whether local queue should delete successful records immediately or retain synced metadata briefly for reconciliation. [ASSUMED]
   - Recommendation: Delete successful queue records after UI has merged the server row; if immediate list reload is not available, update local row with `server_id` then remove on next server data refresh. [ASSUMED]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | npm scripts, Vite, tests | ✓ | v24.15.0 | — [VERIFIED: `node --version`] |
| npm/npx | package installation and Context7 fallback | ✓ | npm/npx 11.12.1 | — [VERIFIED: `npm --version`; `npx --version`] |
| Supabase CLI | DB migration and integration tests | ✓ | 2.90.0 installed; 2.95.4 available | Use installed CLI unless a migration command requires newer CLI. [VERIFIED: `supabase --version`] |
| Vitest | unit/integration tests | ✓ | installed 3.1.1 | — [VERIFIED: package.json] |
| Playwright | browser offline flow | ✗ | not installed; latest 1.59.1 | Install `@playwright/test`. [VERIFIED: package.json; VERIFIED: npm registry] |
| `idb` | IndexedDB queue | ✗ | not installed; latest 8.0.3 | Hand-roll possible but not recommended. [VERIFIED: package.json; VERIFIED: npm registry] |
| `fake-indexeddb` | IndexedDB unit tests | ✗ | not installed; latest 6.2.5 | Use jsdom IndexedDB only if available; otherwise install. [VERIFIED: package.json; VERIFIED: npm registry] |

**Missing dependencies with no fallback:**
- `@playwright/test` for the required browser offline flow. [VERIFIED: 03-CONTEXT.md D-24-D-26]

**Missing dependencies with fallback:**
- `idb`: could hand-roll IndexedDB, but the research recommends adding `idb`. [VERIFIED: Context7 /jakearchibald/idb]
- `fake-indexeddb`: can be skipped if Vitest environment provides enough IndexedDB APIs, but adding it makes queue tests deterministic. [VERIFIED: npm registry]

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest installed `3.1.1`; Playwright to add `1.59.1` [VERIFIED: package.json; VERIFIED: npm registry] |
| Config file | `vitest.config.ts`; `playwright.config.ts` missing and should be Wave 0 [VERIFIED: repo scan] |
| Quick run command | `npm run test:unit -- tests/offline/expense-queue.test.ts tests/offline/expense-sync.test.ts` [ASSUMED] |
| Full suite command | `npm run check && npm run test && npx playwright test tests/e2e/offline-quick-add.spec.ts` [ASSUMED] |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| INPUT-08 | Offline category save creates IndexedDB record with `sync_status: "queued"` and visible `Waiting` row | unit + component + e2e | `npm run test:unit -- tests/offline/expense-queue.test.ts -t queued` | ❌ Wave 0 |
| INPUT-09 | Queue flushes on `online` and `visibilitychange` visible | unit + e2e | `npm run test:unit -- tests/offline/expense-sync.test.ts -t triggers` | ❌ Wave 0 |
| INPUT-10 | `syncing` older than 5 minutes resets to `queued` on app open | unit | `npm run test:unit -- tests/offline/expense-queue.test.ts -t stale` | ❌ Wave 0 |
| INPUT-11 | Server insert uses `ON CONFLICT (client_id) DO NOTHING` and retry does not duplicate | SQL/integration + e2e | `npm run test:unit -- tests/expenses/quick-add.test.ts -t idempotent` plus DB test if Supabase env available | ⚠️ Existing duplicate test covers `23505`, not SQL `ON CONFLICT` |

### Sampling Rate

- **Per task commit:** `npm run test:unit -- tests/offline/expense-queue.test.ts tests/offline/expense-sync.test.ts` [ASSUMED]
- **Per wave merge:** `npm run check && npm run test` [VERIFIED: package.json]
- **Phase gate:** `npm run check && npm run test && npx playwright test tests/e2e/offline-quick-add.spec.ts` [ASSUMED]

### Wave 0 Gaps

- [ ] `tests/offline/expense-queue.test.ts` - covers INPUT-08 and INPUT-10. [VERIFIED: repo scan]
- [ ] `tests/offline/expense-sync.test.ts` - covers INPUT-09 failure classification and trigger behavior. [VERIFIED: repo scan]
- [ ] `tests/e2e/offline-quick-add.spec.ts` - covers D-26 browser flow. [VERIFIED: repo scan]
- [ ] `playwright.config.ts` and npm script such as `test:e2e`. [VERIFIED: package.json]
- [ ] `fake-indexeddb` setup if jsdom IndexedDB is insufficient. [VERIFIED: tests/setup.ts]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | yes | Pause flush until Supabase session exists; existing hook attaches session/user to locals. [VERIFIED: src/hooks.server.ts; VERIFIED: 03-CONTEXT.md D-19] |
| V3 Session Management | yes | Existing `@supabase/ssr` cookies server-side and IndexedDB auth storage browser-side; do not store service-role credentials. [VERIFIED: src/lib/supabase/server.ts; VERIFIED: src/lib/supabase/client.ts; VERIFIED: .planning/STATE.md] |
| V4 Access Control | yes | RLS policies on `expenses`; inserts must use `created_by = auth.uid()` and household membership check. [VERIFIED: supabase migration; CITED: Supabase RLS docs] |
| V5 Input Validation | yes | Zod validation for queued payload and server RPC/action input; preserve category and amount constraints. [VERIFIED: src/lib/expenses/schemas.ts] |
| V6 Cryptography | yes | Use `crypto.randomUUID()` already present for `client_id`; do not invent IDs. [VERIFIED: src/routes/(app)/+page.svelte] |

### Known Threat Patterns for SvelteKit + Supabase Offline Queue

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Tampered queued payload changes `household_id` | Elevation of Privilege / Tampering | Server uses `locals.householdId` or RPC with RLS; client household is used for mismatch detection, not authority. [VERIFIED: src/routes/(app)/+page.server.ts; VERIFIED: 03-CONTEXT.md D-20] |
| Replay of same queued expense | Tampering / Repudiation | Stable `client_id` unique constraint + `ON CONFLICT DO NOTHING`. [VERIFIED: supabase migration; CITED: PostgreSQL INSERT docs] |
| Expired auth causes unauthenticated insert attempts | Spoofing | Pause automatic flush until valid session exists; mark auth failures recoverable. [VERIFIED: 03-CONTEXT.md D-18-D-19] |
| RLS denial loops | Denial of Service | Classify RLS/auth failures as `failed` and avoid repeated hot-loop retry. [VERIFIED: 03-CONTEXT.md D-18-D-20] |
| Sensitive data in IndexedDB | Information Disclosure | Store only current expense payload and retry metadata; no service keys or audit history. [VERIFIED: 03-CONTEXT.md D-16; VERIFIED: .planning/STATE.md] |

## Sources

### Primary (HIGH confidence)

- Context7 `/jakearchibald/idb` - `openDB`, `DBSchema`, object store/index, transaction patterns. [VERIFIED: Context7 CLI fallback]
- Context7 `/sveltejs/kit` - `use:enhance` custom callback, `applyAction`, form action behavior. [VERIFIED: Context7 CLI fallback]
- SvelteKit docs - form actions and `use:enhance`: https://svelte.dev/docs/kit/form-actions. [CITED: official docs]
- Supabase JS docs - `upsert` options: https://supabase.com/docs/reference/javascript/upsert. [CITED: official docs]
- Supabase JS docs - RPC calls: https://supabase.com/docs/reference/javascript/rpc. [CITED: official docs]
- Supabase RLS docs: https://supabase.com/docs/guides/database/postgres/row-level-security. [CITED: official docs]
- PostgreSQL INSERT docs: https://www.postgresql.org/docs/current/sql-insert.html. [CITED: official docs]
- PostgreSQL CREATE FUNCTION docs: https://www.postgresql.org/docs/current/sql-createfunction.html. [CITED: official docs]
- MDN IndexedDB docs: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB. [CITED: official docs]
- MDN `online` event docs: https://developer.mozilla.org/en-US/docs/Web/API/Window/online_event. [CITED: official docs]
- MDN `visibilitychange` event docs: https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilitychange_event. [CITED: official docs]
- Playwright `browserContext.setOffline`: https://playwright.dev/docs/api/class-browsercontext. [CITED: official docs]
- npm registry version checks for `idb`, `@playwright/test`, `fake-indexeddb`, `@supabase/supabase-js`, `@sveltejs/kit`, Vitest, and Testing Library. [VERIFIED: npm registry]

### Secondary (MEDIUM confidence)

- Existing project code and planning docs: `.planning/REQUIREMENTS.md`, `.planning/STATE.md`, `.planning/PROJECT.md`, `03-CONTEXT.md`, current `src/`, `tests/`, and `supabase/migrations`. [VERIFIED: repo scan]

### Tertiary (LOW confidence)

- Assumptions in the Assumptions Log about Dexie scope, network timeout commit ambiguity, local/server merge shape, and retry storms. [ASSUMED]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - package versions verified with npm registry and project dependencies inspected. [VERIFIED: npm registry; VERIFIED: package.json]
- Architecture: HIGH - current codebase boundaries, phase decisions, and official docs agree on browser queue + server RPC split. [VERIFIED: repo scan; CITED: official docs]
- Pitfalls: MEDIUM - idempotency and lifecycle pitfalls are strongly supported; some runtime failure patterns are marked assumed because they are general distributed-systems behavior rather than project-observed bugs. [CITED: official docs; ASSUMED]

**Research date:** 2026-05-02
**Valid until:** 2026-06-01 for package versions; earlier if Supabase/SvelteKit major APIs change.
