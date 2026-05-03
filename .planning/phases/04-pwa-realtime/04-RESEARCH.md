# Phase 04: PWA + Realtime - Research

**Researched:** 2026-05-03 [VERIFIED: environment current_date]  
**Domain:** SvelteKit PWA installability, offline app-shell caching, and Supabase Realtime household expense inserts [VERIFIED: .planning/phases/04-pwa-realtime/04-CONTEXT.md]  
**Confidence:** HIGH for stack/API shape, MEDIUM for device-specific iOS/Android install UX until manual device checklist runs [VERIFIED: Context7, official docs, codebase grep]

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
## Implementation Decisions

### Install + Offline Shell
- **D-01:** Use a polished PWA setup, not a bare minimum manifest. Include app name, theme color, standalone metadata, proper icon set, maskable icon support, and installability checks.
- **D-02:** Offline open uses a hybrid shell behavior: show the cached app shell first, then show a small offline/stale notice only when needed.
- **D-03:** Improve the existing install guidance for iOS and Android with clearer, platform-aware behavior instead of leaving the Phase 1 banner unchanged.
- **D-04:** Acceptance for this area requires both automated checks and a manual iOS/Android install checklist.

### Realtime Merge Behavior
- **D-05:** A partner's new expense should appear in Today with a subtle new-row highlight or flash, then fade back to the normal row style.
- **D-06:** Realtime updates apply immediately to the Today list only. Full history can refresh on navigation/open rather than receiving live updates while already displayed.
- **D-07:** Own insert skipping is strict: ignore realtime events whose `client_id` already exists locally.
- **D-08:** If a queued local expense later syncs and the server row arrives through realtime, replace the queued row with the server row silently, preserving the row position when possible.

### Claude's Discretion
- Exact service worker strategy, Workbox/vite-plugin-pwa configuration, cache names, and cache expiry rules are planner/implementer choices as long as the app shell loads offline and avoids stale unsafe data behavior.
- Exact visual treatment for the small offline/stale notice and new-row highlight can follow the current mobile UI style.
- Exact Supabase Realtime subscription module boundaries are open, but the implementation must scope by household and preserve the existing `client_id` duplicate defenses.

### Deferred Ideas (OUT OF SCOPE)
## Deferred Ideas

None - discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PWA-01 | App is installable to iOS Home Screen ("Add to Home Screen" via Safari) | Apple Support documents Safari Share > Add to Home Screen > Open as Web App, and Apple developer docs require iOS standalone metadata for hiding browser chrome. [CITED: https://support.apple.com/en-gu/guide/iphone/iphea86e5236/26/ios/26] [CITED: https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html] |
| PWA-03 | App shell is cached via service worker; app loads offline | `@vite-pwa/sveltekit` configures SvelteKit client/prerendered Workbox glob patterns, and SvelteKit service workers can cache `build` and `files` assets for offline use. [CITED: https://vite-pwa-org.netlify.app/frameworks/sveltekit.html] [CITED: https://svelte.dev/docs/kit/service-workers] |
| PWA-04 | Web app manifest defines name, icons, theme color, and `display: standalone` | MDN lists `name`/`short_name`, 192 and 512 icons, `start_url`, and `display` as Chromium installability manifest members; `standalone` removes browser UI elements such as the URL bar. [CITED: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable] [CITED: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/display] |
| SYNC-01 | Both household members see new expenses appear in real time via Supabase Realtime scoped to `household_id` | Supabase `postgres_changes` supports table event subscriptions with filters such as `column=eq.value`; existing `expenses_household_select` RLS permits household members to read household rows. [CITED: https://supabase.com/docs/guides/realtime/postgres-changes] [VERIFIED: supabase/migrations/2026042501_phase1_foundation.sql] |
| SYNC-02 | Own inserts do not trigger a redundant re-render via `client_id` match | The Today screen already keys merge behavior by `client_id`, and the Phase 3 RPC returns `client_id` for idempotent inserts. [VERIFIED: src/routes/(app)/+page.svelte] [VERIFIED: supabase/migrations/2026050201_phase3_idempotent_expense_insert.sql] |
</phase_requirements>

## Summary

Use `@vite-pwa/sveltekit` rather than a hand-written full service worker for this phase. [VERIFIED: Context7 /vite-pwa/sveltekit] It is the SvelteKit-specific PWA integration, installs as a dev dependency, wires into `vite.config.ts`, and configures SvelteKit output directories for Workbox precaching. [CITED: https://vite-pwa-org.netlify.app/frameworks/sveltekit.html] The planner should add a polished manifest, app icons including maskable and Apple touch icons, iOS standalone meta/title coverage, automated manifest/SW checks, and a manual device checklist for Safari iOS and Android install behavior. [CITED: Apple/MDN docs]

For realtime, use the existing browser Supabase client and subscribe to `postgres_changes` `INSERT` events on `public.expenses` filtered by `household_id=eq.${householdId}`. [VERIFIED: Context7 /supabase/supabase-js] [CITED: https://supabase.com/docs/guides/realtime/postgres-changes] The UI merge should live near the existing Today list merge logic, not in history routes, because Phase 04 explicitly limits live updates to Today. [VERIFIED: .planning/phases/04-pwa-realtime/04-CONTEXT.md] Strict `client_id` handling is the core safety rule: skip any realtime row whose `client_id` already exists locally, except when that local row is queued/syncing and should be silently replaced by the server row. [VERIFIED: .planning/phases/04-pwa-realtime/04-CONTEXT.md] [VERIFIED: src/routes/(app)/+page.svelte]

**Primary recommendation:** Plan this as two coordinated workstreams: PWA shell/installability first, then a small typed Realtime subscription/merge module wired into Today with `client_id`-based skip/replace semantics. [VERIFIED: codebase grep + CONTEXT.md]

## Project Constraints (from AGENTS.md / CLAUDE.md)

- No `AGENTS.md` or `CLAUDE.md` file exists at the project root, so there are no additional root-level agent directives to enforce. [VERIFIED: `find . -maxdepth 4 -name AGENTS.md -o -name CLAUDE.md`]
- No project-local `.claude/skills/**/SKILL.md` or `.agents/skills/**/SKILL.md` files were found, so there are no local skill-specific patterns to include. [VERIFIED: `find .claude/skills .agents/skills -maxdepth 3 -name SKILL.md`]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| Web app manifest and install metadata | Browser / Client | Static assets | The manifest, icons, and Apple meta tags are consumed by browsers from HTML/static assets. [CITED: MDN installable PWA docs] [CITED: Apple Configuring Web Applications] |
| Service worker app-shell cache | Browser / Client | CDN / Static | The service worker controls browser fetches and serves cached client assets when offline. [CITED: https://svelte.dev/docs/kit/service-workers] |
| Offline/stale shell notice | Browser / Client | Frontend Server (SSR) | The notice should react to browser connectivity/cache state while preserving the SvelteKit app shell. [VERIFIED: src/routes/(app)/+layout.svelte] |
| Realtime expense subscription | Browser / Client | Supabase Realtime service | The browser client opens a Realtime channel; Supabase streams Postgres changes over WebSocket. [CITED: https://supabase.com/docs/guides/realtime/postgres-changes] |
| Household authorization for streamed rows | Database / Storage | Supabase Realtime service | Supabase Postgres Changes with RLS sends records only to clients allowed to read them, and current `expenses_household_select` RLS scopes reads by household membership. [CITED: https://supabase.com/docs/guides/realtime/authorization] [VERIFIED: supabase/migrations/2026042501_phase1_foundation.sql] |
| Today list merge/dedupe/highlight | Browser / Client | API / Backend | The browser owns visible list state, local queued rows, `client_id` skip/replace, and row highlight state. [VERIFIED: src/routes/(app)/+page.svelte] |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@vite-pwa/sveltekit` | 1.1.0, modified 2025-11-27 | SvelteKit-specific PWA plugin for manifest and service worker integration | Official Vite PWA SvelteKit package; configures SvelteKit output for Workbox and installs via `npm install -D @vite-pwa/sveltekit`. [VERIFIED: npm registry] [CITED: https://vite-pwa-org.netlify.app/frameworks/sveltekit.html] |
| `vite-plugin-pwa` | 1.2.0, modified 2025-11-27 | Underlying Vite PWA/Workbox plugin | Provides manifest configuration, Workbox `generateSW`, glob patterns, and maskable icon examples. [VERIFIED: npm registry] [VERIFIED: Context7 /vite-pwa/vite-plugin-pwa] |
| `workbox-build` / Workbox | 7.4.0, modified 2025-11-19 | Service worker precache generation used by Vite PWA | `vite-plugin-pwa` declares `workbox-build` and `workbox-window` peer compatibility at `^7.4.0`. [VERIFIED: npm registry] |
| `@supabase/supabase-js` | project has 2.104.1; latest 2.105.1, modified 2026-04-30 | Browser Supabase client and Realtime channel API | Existing project client already uses Supabase JS; docs show `channel().on('postgres_changes', ...).subscribe()` and channel cleanup. [VERIFIED: package.json] [VERIFIED: npm registry] [VERIFIED: Context7 /supabase/supabase-js] |
| SvelteKit | project has 2.16.0; latest 2.59.0, modified 2026-05-01 | App framework, layouts, service worker support | Existing app is SvelteKit, and SvelteKit supports automatic service worker bundling/registration from `src/service-worker.js` if used. [VERIFIED: package.json] [CITED: https://svelte.dev/docs/kit/service-workers] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@vite-pwa/assets-generator` | 1.0.2, modified 2025-10-14 | Generate icon sets from a source image | Use if the planner wants repeatable icon generation instead of checking in manually prepared PNGs. [VERIFIED: npm registry] |
| `@playwright/test` | project has 1.59.1 | Browser-level offline/installability assertions | Use for SW registration, manifest link, offline shell load, and realtime browser simulation. [VERIFIED: package.json] |
| Vitest + Testing Library | Vitest 3.1.1 in project | Unit tests for merge/realtime and install helper logic | Use for `client_id` skip/replace rules and platform-aware install guidance logic. [VERIFIED: package.json] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@vite-pwa/sveltekit` | Hand-written `src/service-worker.ts` using `$service-worker` | Gives more control but requires manually maintaining cache versioning, fetch strategy, and installability integration; use only if Workbox behavior cannot satisfy offline shell acceptance. [CITED: https://svelte.dev/docs/kit/service-workers] [VERIFIED: Context7 /vite-pwa/sveltekit] |
| Supabase Postgres Changes | Supabase Broadcast | Broadcast can scale differently but requires separate broadcast path and authorization policies; Postgres Changes directly matches "new expense row inserted" and current RLS model. [CITED: https://supabase.com/docs/guides/realtime/postgres-changes] [CITED: https://supabase.com/docs/guides/realtime/authorization] |

**Installation:**
```bash
npm install -D @vite-pwa/sveltekit
```

**Optional icon generation:**
```bash
npm install -D @vite-pwa/assets-generator
```

**Version verification:** Versions above were verified with `npm view @vite-pwa/sveltekit version time.modified peerDependencies --json`, `npm view vite-plugin-pwa version time.modified peerDependencies --json`, `npm view workbox-build version time.modified --json`, `npm view @vite-pwa/assets-generator version time.modified --json`, `npm view @supabase/supabase-js version time.modified --json`, and `npm view @sveltejs/kit version time.modified --json`. [VERIFIED: npm registry]

## Architecture Patterns

### System Architecture Diagram

```text
First/online visit
  -> SvelteKit app shell and static assets load from Cloudflare Pages
  -> @vite-pwa/sveltekit registers service worker
  -> Workbox precaches client assets + manifest/icons
  -> Browser stores app shell cache

Later offline open
  -> Home Screen / browser launches "/"
  -> Service worker receives navigation/asset GET requests
  -> Cached app shell is served
  -> App layout restores IndexedDB-backed auth session
  -> Today UI renders cached shell and local queued rows
  -> If network/data unavailable, small stale/offline notice appears

Realtime Today insert
  -> Partner saves expense via SvelteKit action/RPC
  -> Postgres inserts public.expenses row with household_id + client_id
  -> Supabase Realtime postgres_changes emits INSERT to authorized household clients
  -> Browser subscription receives payload.new
  -> Merge decision:
       client_id already local and not queued? skip
       client_id matches queued/syncing local row? replace silently with server row
       new partner client_id? insert into Today and mark highlight
  -> ExpenseList renders row and highlight fades
```

### Recommended Project Structure

```text
src/
├── lib/pwa/
│   ├── installability.ts      # manifest/SW/platform helper logic for tests and banner state
│   └── offline-shell.ts       # browser online/offline/stale shell state, if needed
├── lib/realtime/
│   ├── expenses.ts            # Supabase channel setup/cleanup and payload normalization
│   └── expense-merge.ts       # pure Today merge, skip, queued replacement, highlight flags
├── lib/components/
│   ├── InstallGuidanceBanner.svelte
│   └── ExpenseList.svelte
└── routes/
    ├── +layout.svelte         # PWA registration/status integration if plugin defaults need UI hooks
    └── (app)/+page.svelte     # Today subscription wiring and list state
static/
├── apple-touch-icon.png
├── pwa-192x192.png
└── pwa-512x512.png
```

This structure preserves current ownership: install UI stays in `InstallGuidanceBanner`, Today merge state stays near `src/routes/(app)/+page.svelte`, and reusable pure logic is moved to `src/lib/*` for tests. [VERIFIED: codebase grep]

### Pattern 1: SvelteKit PWA Plugin Configuration

**What:** Add `SvelteKitPWA` to `vite.config.ts` after Tailwind and before/around `sveltekit`, with manifest metadata and Workbox settings. [VERIFIED: Context7 /vite-pwa/sveltekit]  
**When to use:** Use for Phase 04 because the app has no existing service worker and needs installability plus offline shell loading. [VERIFIED: vite.config.ts]

```typescript
// Source: Context7 /vite-pwa/sveltekit and /vite-pwa/vite-plugin-pwa
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';

export default defineConfig({
	plugins: [
		tailwindcss(),
		SvelteKitPWA({
			registerType: 'autoUpdate',
			manifest: {
				name: 'xtrack',
				short_name: 'xtrack',
				start_url: '/',
				scope: '/',
				display: 'standalone',
				theme_color: '#176B5D',
				background_color: '#F8FAF7',
				icons: [
					{ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
					{ src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
					{ src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
				]
			},
			workbox: {
				cleanupOutdatedCaches: true,
				navigateFallback: '/'
			}
		}),
		sveltekit()
	]
});
```

### Pattern 2: Platform-Aware Install Guidance

**What:** Extend `src/lib/install/visibility.ts` to distinguish iOS Safari/manual install, Android `beforeinstallprompt`, standalone mode, and snoozed banner state. [VERIFIED: src/lib/install/visibility.ts]  
**When to use:** Use in `InstallGuidanceBanner.svelte` so the app shows the right copy/control for Safari iOS and Android without showing install copy inside standalone mode. [VERIFIED: src/lib/components/InstallGuidanceBanner.svelte]

```typescript
// Source: MDN beforeinstallprompt note and Apple Support install flow
type InstallPlatform = 'ios-safari' | 'android-prompt' | 'unsupported' | 'standalone';

export function getInstallPlatform(): InstallPlatform {
	if (isStandalone()) return 'standalone';
	if (isSafariBrowser()) return 'ios-safari';
	if ('onbeforeinstallprompt' in window) return 'android-prompt';
	return 'unsupported';
}
```

### Pattern 3: Supabase Realtime Insert Subscription

**What:** Subscribe to `INSERT` events on `public.expenses`, filtered by household id, and clean up the channel on component unmount. [VERIFIED: Context7 /supabase/supabase-js]  
**When to use:** Use after browser session and `data.householdId` are available in the protected app shell. [VERIFIED: src/routes/(app)/+layout.svelte]

```typescript
// Source: Context7 /supabase/supabase-js and Supabase Postgres Changes docs
import { supabase } from '$lib/supabase/client';

export function subscribeToExpenseInserts(
	householdId: string,
	onInsert: (row: ExpenseRealtimeRow) => void
) {
	const channel = supabase
		.channel(`expenses:${householdId}`)
		.on(
			'postgres_changes',
			{
				event: 'INSERT',
				schema: 'public',
				table: 'expenses',
				filter: `household_id=eq.${householdId}`
			},
			(payload) => onInsert(payload.new as ExpenseRealtimeRow)
		)
		.subscribe();

	return () => {
		void supabase.removeChannel(channel);
	};
}
```

### Pattern 4: Pure Merge Function Before Svelte State Mutation

**What:** Normalize server realtime rows into the same shape as `SavedExpense`, then run a pure merge function that returns the next list and a highlight id. [VERIFIED: src/routes/(app)/+page.svelte]  
**When to use:** Use for `client_id` skip/replace tests and to avoid redundant re-rendering when the row is already present. [VERIFIED: .planning/phases/04-pwa-realtime/04-CONTEXT.md]

```typescript
// Source: existing mergeTodayExpenses pattern in src/routes/(app)/+page.svelte
export function mergeRealtimeExpense(
	current: SavedExpense[],
	incoming: SavedExpense
): { expenses: SavedExpense[]; highlightedClientId: string | null } {
	const existingIndex = current.findIndex((row) => row.client_id === incoming.client_id);

	if (existingIndex >= 0) {
		const existing = current[existingIndex];
		if (existing.sync_status === 'queued' || existing.sync_status === 'syncing') {
			const next = current.slice();
			next[existingIndex] = { ...incoming, sync_status: undefined };
			return { expenses: next, highlightedClientId: null };
		}
		return { expenses: current, highlightedClientId: null };
	}

	return {
		expenses: [incoming, ...current].sort((a, b) => b.spent_at.localeCompare(a.spent_at)),
		highlightedClientId: incoming.client_id
	};
}
```

### Anti-Patterns to Avoid

- **Caching authenticated API/action responses as app shell:** Cache static client assets and the navigation shell, not POST action responses or Supabase REST/WebSocket responses, because stale private data can be misleading or unsafe. [CITED: SvelteKit service worker docs] [VERIFIED: existing server actions in src/routes/(app)/+page.server.ts]
- **Subscribing without a household filter:** A broad `expenses` subscription relies entirely on RLS and creates unnecessary Realtime authorization work; use `household_id=eq.${householdId}`. [CITED: Supabase filter docs] [CITED: Supabase Realtime performance limitations]
- **Using server `id` only for dedupe:** Queued rows are keyed by `client_id` until the server id exists, so server-id-only dedupe misses offline retry/realtime reconciliation. [VERIFIED: src/lib/offline/types.ts] [VERIFIED: src/routes/(app)/+page.svelte]
- **Putting live history in scope:** Phase 04 locks realtime to Today only; history should remain refresh-on-open/navigation. [VERIFIED: .planning/phases/04-pwa-realtime/04-CONTEXT.md]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Workbox precache manifest generation | Manual cache file list and revisioning | `@vite-pwa/sveltekit` / Workbox | SvelteKit output paths and hashed client assets are easy to cache incorrectly; the plugin configures client/prerendered output globs. [CITED: Vite PWA SvelteKit docs] |
| Full Realtime transport | Custom WebSocket server or polling loop | Supabase `postgres_changes` | Existing stack already uses Supabase auth/RLS; Postgres Changes streams inserted rows to authorized clients. [CITED: Supabase docs] [VERIFIED: package.json] |
| Duplicate/retry identity | Timestamp/amount/category heuristic | Stable `client_id` | Phase 3 already made `client_id` the idempotency key and offline queue key. [VERIFIED: supabase/migrations/2026050201_phase3_idempotent_expense_insert.sql] [VERIFIED: src/lib/offline/types.ts] |
| Platform install detection from scratch | UA-only install framework | Existing `src/lib/install/visibility.ts` plus small Android prompt support | The project already has snooze and standalone detection helpers; extend them rather than replacing behavior. [VERIFIED: src/lib/install/visibility.ts] |

**Key insight:** The hard part is not opening a WebSocket or adding a manifest; it is preserving the existing offline/idempotent `client_id` contract while adding cached shell behavior and live partner rows. [VERIFIED: Phase 03 artifacts and Phase 04 CONTEXT.md]

## Common Pitfalls

### Pitfall 1: Service Worker Caches Server HTML With Stale Auth/Data

**What goes wrong:** The app opens offline with stale authenticated data and no honest stale/offline notice. [VERIFIED: Phase 04 D-02]  
**Why it happens:** A broad network-first/cache fallback can cache route HTML and reuse it later without indicating freshness. [CITED: SvelteKit service worker docs]  
**How to avoid:** Treat Phase 04 acceptance as "offline shell loads", not "all server data works offline"; show a small stale/offline notice when network-dependent data may not be fresh. [VERIFIED: .planning/phases/04-pwa-realtime/04-CONTEXT.md]  
**Warning signs:** Playwright offline test passes only because prior server-rendered HTML is reused, with no visible stale state. [ASSUMED]

### Pitfall 2: iOS Install Looks Like a Bookmark Instead of Standalone App

**What goes wrong:** Home Screen launch shows Safari browser chrome or misses expected title/icon. [CITED: Apple Configuring Web Applications]  
**Why it happens:** iOS uses Apple-specific metadata such as `apple-mobile-web-app-capable`, `apple-mobile-web-app-title`, and touch icons alongside manifest behavior. [CITED: Apple Configuring Web Applications]  
**How to avoid:** Keep existing `apple-mobile-web-app-capable=yes`, add/verify `apple-mobile-web-app-title`, include `apple-touch-icon.png`, and manually test Safari Add to Home Screen. [VERIFIED: src/app.html] [CITED: Apple docs]  
**Warning signs:** `isStandalone()` stays false after launching from the Home Screen. [VERIFIED: src/lib/install/visibility.ts]

### Pitfall 3: Realtime Echo Re-adds Current User's Own Save

**What goes wrong:** The current user's just-saved row is inserted optimistically/server-action-first, then the Realtime event inserts or re-sorts it again. [VERIFIED: src/routes/(app)/+page.svelte]  
**Why it happens:** Supabase Realtime can deliver the insert event to all subscribed household clients, including the writer. [CITED: Supabase Postgres Changes docs]  
**How to avoid:** Keep a local set of visible/current `client_id` values and ignore incoming rows whose `client_id` is already present unless replacing a queued/syncing local row. [VERIFIED: Phase 04 D-07/D-08]  
**Warning signs:** Saving once causes two row animations, duplicate Today rows, or a second note sheet/list mutation. [VERIFIED: Phase 04 success criteria]

### Pitfall 4: Realtime Channel Cleanup Is Forgotten

**What goes wrong:** Navigating back to Today creates multiple active subscriptions and duplicate callbacks. [VERIFIED: Svelte component lifecycle risk from codebase]  
**Why it happens:** Supabase channels remain active unless unsubscribed/removed. [VERIFIED: Context7 /supabase/supabase-js]  
**How to avoid:** Return `supabase.removeChannel(channel)` cleanup from `onMount`. [VERIFIED: Context7 /supabase/supabase-js]  
**Warning signs:** One partner insert produces multiple highlights or duplicate console logs after route navigation. [ASSUMED]

### Pitfall 5: Realtime RLS Performance Is Ignored

**What goes wrong:** Broad subscriptions are unnecessarily expensive because each database change may need authorization checks per subscribed user. [CITED: Supabase Postgres Changes limitations]  
**Why it happens:** Developers assume RLS filtering alone is the same as a Realtime filter. [CITED: Supabase docs]  
**How to avoid:** Use both the `household_id` Realtime filter and existing RLS policies. [CITED: Supabase filter docs] [VERIFIED: supabase/migrations/2026042501_phase1_foundation.sql]  
**Warning signs:** The subscription receives payloads unrelated to Today or household scope in tests/logs. [ASSUMED]

## Code Examples

### Installability Manifest Requirements

```typescript
// Source: MDN Making PWAs installable and vite-plugin-pwa Context7 docs
manifest: {
	name: 'xtrack',
	short_name: 'xtrack',
	start_url: '/',
	scope: '/',
	display: 'standalone',
	theme_color: '#176B5D',
	background_color: '#F8FAF7',
	icons: [
		{ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
		{ src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
		{ src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
	]
}
```

### Svelte Mount/Cleanup for Realtime

```svelte
<!-- Source: Svelte onMount pattern from existing src/routes/(app)/+page.svelte and Supabase cleanup docs -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { subscribeToExpenseInserts } from '$lib/realtime/expenses';

	onMount(() => {
		if (!data.householdId) return;

		const cleanup = subscribeToExpenseInserts(data.householdId, (row) => {
			applyRealtimeExpense(row);
		});

		return cleanup;
	});
</script>
```

### Highlight State Without Changing Row Identity

```svelte
<!-- Source: existing ExpenseList keyed each block; Phase 04 D-05 -->
{#each expenses as expense (expense.server_id ?? expense.id ?? expense.client_id)}
	<li class:realtime-new={expense.client_id === highlightedClientId}>
		<!-- existing row rendering -->
	</li>
{/each}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Generic `vite-plugin-pwa` in SvelteKit with manual output tuning | `@vite-pwa/sveltekit` package configures SvelteKit output directory and default glob patterns | `@vite-pwa/sveltekit` current docs and version 1.1.0 | Planner should use SvelteKit-specific plugin, not generic plugin setup, unless a custom service worker is needed. [CITED: Vite PWA SvelteKit docs] [VERIFIED: npm registry] |
| iOS-only install banner copy | Platform-aware iOS manual guidance plus Android install prompt support | Phase 04 D-03 | Planner should extend current banner behavior instead of leaving Phase 1 Safari-only copy. [VERIFIED: Phase 04 CONTEXT.md] |
| Offline capture only | Offline app shell loading after prior visit | Phase 04 PWA-03 | Planner must add SW/app-shell validation, not just IndexedDB queue tests. [VERIFIED: REQUIREMENTS.md] |
| Manual refresh for household stream | Supabase Realtime `postgres_changes` insert subscription filtered by household | Phase 04 SYNC-01 | Planner should add live Today merge and tests around partner insert payloads. [VERIFIED: REQUIREMENTS.md] [CITED: Supabase docs] |

**Deprecated/outdated:**
- Safari-only install assumptions are incomplete for this phase because Phase 04 asks for iOS and Android home-screen installability behavior. [VERIFIED: Phase 04 goal and D-03]
- Realtime broad table subscriptions are not recommended for this app because Supabase documents filter support and RLS/per-change authorization costs. [CITED: Supabase docs]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Playwright offline shell checks may pass by reusing cached route HTML unless the test explicitly checks stale/offline notice behavior. | Common Pitfalls | Planner may under-specify acceptance and miss D-02 UX. |
| A2 | Forgetting channel cleanup will manifest as duplicate callbacks after navigation. | Common Pitfalls | Planner may omit route navigation cleanup tests. |
| A3 | Receiving unrelated Realtime payloads in logs is a warning sign of missing filter/scope. | Common Pitfalls | Planner may not include enough instrumentation/test assertions. |

## Open Questions

1. **Will the remote Supabase project have Realtime replication enabled for `public.expenses`?**  
   What we know: Local `supabase/config.toml` has a `[realtime]` section, but the research did not verify remote publication/table settings. [VERIFIED: supabase/config.toml grep]  
   What's unclear: Whether the deployed Supabase project is already publishing `expenses` changes to Realtime. [ASSUMED]  
   Recommendation: Include a migration or manual verification step to ensure `expenses` is enabled for Realtime before UAT. [CITED: Supabase Postgres Changes docs]

2. **Should Android guidance use a custom install button or only improved copy?**  
   What we know: MDN documents `beforeinstallprompt` as the in-page prompt mechanism and states it is not supported on iOS. [CITED: MDN Making PWAs installable]  
   What's unclear: Whether Phase 04 UX should include a visible Android install button or just platform-aware instructions. [VERIFIED: Phase 04 CONTEXT.md leaves exact behavior open]  
   Recommendation: Plan a small Android prompt path because D-03 asks for clearer platform-aware behavior. [VERIFIED: Phase 04 D-03]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | SvelteKit/Vite build and tests | Yes | v24.15.0 | None needed. [VERIFIED: `node --version`] |
| npm / npx | Package install and Context7 fallback | Yes | npm/npx 11.12.1 | None needed. [VERIFIED: `npm --version`, `npx --version`] |
| Supabase CLI | Realtime/table publication verification or migrations | Yes | 2.90.0 | Use Supabase Dashboard/manual SQL if CLI cannot reach remote. [VERIFIED: `supabase --version`] |
| Wrangler | Cloudflare Pages local/deploy inspection | Not found in PATH during audit | — | Use `npm run build`/Cloudflare dashboard; add Wrangler only if deployment testing requires it. [VERIFIED: `command -v wrangler`] |
| iOS Safari device/simulator | Manual Add to Home Screen UAT | Not locally verifiable by CLI | — | Manual checklist required per D-04. [VERIFIED: Phase 04 D-04] |
| Android Chrome device/emulator | Manual Android install UAT | Not locally verifiable by CLI | — | Manual checklist required per D-04. [VERIFIED: Phase 04 D-04] |

**Missing dependencies with no fallback:**
- Real iOS/Android install behavior cannot be fully proven by local CLI tests; D-04 already requires manual device checklist. [VERIFIED: Phase 04 CONTEXT.md]

**Missing dependencies with fallback:**
- Wrangler is absent; build and local preview can still validate generated assets, and Cloudflare dashboard/manual deploy can cover hosted HTTPS install behavior if needed. [VERIFIED: environment audit]

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.1.1 and Playwright 1.59.1 in project dependencies. [VERIFIED: package.json] |
| Config file | `vitest.config.ts`, `playwright.config.ts`, `tests/setup.ts`. [VERIFIED: file discovery] |
| Quick run command | `npm run test:unit -- tests/pwa/installability.test.ts tests/realtime/expense-merge.test.ts` [VERIFIED: package scripts] |
| Full suite command | `npm run check && npm run test:unit && npm run test:e2e` [VERIFIED: package scripts] |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| PWA-01 | Manifest/iOS metadata exists and install guidance is hidden in standalone mode | unit + manual UAT | `npm run test:unit -- tests/pwa/installability.test.ts` | No, Wave 0. [VERIFIED: tests list] |
| PWA-03 | App shell loads offline after prior visit | Playwright e2e | `npx playwright test tests/e2e/pwa-offline-shell.spec.ts --project=chromium` | No, Wave 0. [VERIFIED: tests list] |
| PWA-04 | Manifest includes name, icons, theme color, display standalone | unit/build artifact test | `npm run test:unit -- tests/pwa/manifest.test.ts` | No, Wave 0. [VERIFIED: tests list] |
| SYNC-01 | Partner insert appears in Today without refresh | unit + browser integration with mocked Supabase channel | `npm run test:unit -- tests/realtime/expense-merge.test.ts` | No, Wave 0. [VERIFIED: tests list] |
| SYNC-02 | Own insert does not trigger redundant render; queued row is replaced by server row | unit | `npm run test:unit -- tests/realtime/expense-merge.test.ts` | No, Wave 0. [VERIFIED: tests list] |

### Sampling Rate

- **Per task commit:** `npm run test:unit -- tests/pwa/installability.test.ts tests/realtime/expense-merge.test.ts` after the files exist. [VERIFIED: package scripts]
- **Per wave merge:** `npm run check && npm run test:unit` for code-level confidence. [VERIFIED: package scripts]
- **Phase gate:** `npm run check && npm run test:unit && npm run test:e2e`, plus manual iOS/Android checklist per D-04. [VERIFIED: package scripts] [VERIFIED: Phase 04 CONTEXT.md]

### Wave 0 Gaps

- [ ] `tests/pwa/installability.test.ts` — covers PWA-01/PWA-04 install guidance and manifest/meta helper logic. [VERIFIED: tests list]
- [ ] `tests/pwa/manifest.test.ts` — covers generated/declared manifest fields and icon references. [VERIFIED: tests list]
- [ ] `tests/e2e/pwa-offline-shell.spec.ts` — covers first online visit, service worker readiness, offline reload/open, app shell visible, and stale notice. [VERIFIED: tests list]
- [ ] `tests/realtime/expense-merge.test.ts` — covers SYNC-01/SYNC-02 pure merge skip/replace/highlight behavior. [VERIFIED: tests list]
- [ ] Optional `tests/realtime/expense-subscription.test.ts` — covers Supabase channel filter and cleanup using a mocked client. [ASSUMED]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | Yes | Keep existing Supabase auth with IndexedDB-backed browser session and standalone session gate. [VERIFIED: src/lib/supabase/client.ts] [VERIFIED: src/routes/(app)/+layout.svelte] |
| V3 Session Management | Yes | Do not cache auth tokens in service worker caches; leave auth persistence in existing IndexedDB session storage. [VERIFIED: src/lib/auth/indexeddb-storage.ts] [VERIFIED: src/lib/supabase/client.ts] |
| V4 Access Control | Yes | Continue relying on Supabase RLS for `expenses_household_select` and add Realtime `household_id` filter. [VERIFIED: supabase/migrations/2026042501_phase1_foundation.sql] [CITED: Supabase Realtime Authorization docs] |
| V5 Input Validation | Yes | Preserve existing Zod server action schemas for writes; Realtime payload normalization should validate/shape incoming rows before UI merge. [VERIFIED: src/routes/(app)/+page.server.ts] [VERIFIED: src/lib/expenses/schemas.ts] |
| V6 Cryptography | No new crypto | Do not introduce custom crypto; use Supabase JWT/session handling and browser service worker APIs. [VERIFIED: codebase grep] |

### Known Threat Patterns for SvelteKit PWA + Supabase Realtime

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Service worker stores private API responses or auth-bearing requests | Information Disclosure | Cache app shell/static assets only; do not runtime-cache Supabase REST/WebSocket/action POST responses. [CITED: SvelteKit service worker docs] |
| Realtime channel receives rows outside household | Information Disclosure | Use `filter: household_id=eq.${householdId}` plus existing RLS. [CITED: Supabase filter docs] [VERIFIED: RLS migration] |
| Replayed/echoed own inserts duplicate UI state | Tampering/Repudiation | Skip or replace by `client_id`; keep server RPC `ON CONFLICT (client_id) DO NOTHING`. [VERIFIED: Phase 3 RPC migration] |
| Stale offline shell misrepresents freshness | Spoofing/Information Integrity | Show offline/stale notice when network-dependent data may be unavailable. [VERIFIED: Phase 04 D-02] |
| Exposing `service_role` token to browser for Realtime | Elevation of Privilege | Browser uses only public anon env; Supabase docs warn not to expose `service_role`. [VERIFIED: src/lib/supabase/client.ts] [CITED: Supabase Postgres Changes docs] |

## Sources

### Primary (HIGH confidence)

- Context7 `/vite-pwa/sveltekit` — install and basic `SvelteKitPWA` setup. [VERIFIED: Context7 CLI]
- Context7 `/vite-pwa/vite-plugin-pwa` — manifest, Workbox, glob patterns, maskable icons. [VERIFIED: Context7 CLI]
- Context7 `/supabase/supabase-js` — `postgres_changes` subscription and channel cleanup. [VERIFIED: Context7 CLI]
- Context7 `/sveltejs/kit` — service worker `$service-worker` patterns. [VERIFIED: Context7 CLI]
- Vite PWA SvelteKit docs: https://vite-pwa-org.netlify.app/frameworks/sveltekit.html [CITED]
- SvelteKit service worker docs: https://svelte.dev/docs/kit/service-workers [CITED]
- Supabase Postgres Changes docs: https://supabase.com/docs/guides/realtime/postgres-changes [CITED]
- Supabase Realtime Authorization docs: https://supabase.com/docs/guides/realtime/authorization [CITED]
- Apple Configuring Web Applications: https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html [CITED]
- Apple Support iPhone web app install flow: https://support.apple.com/en-gu/guide/iphone/iphea86e5236/26/ios/26 [CITED]
- MDN Making PWAs installable: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable [CITED]
- MDN manifest `display`: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/display [CITED]
- npm registry package version checks for `@vite-pwa/sveltekit`, `vite-plugin-pwa`, `workbox-build`, `@vite-pwa/assets-generator`, `@supabase/supabase-js`, `@sveltejs/kit`. [VERIFIED: npm registry]
- Codebase files listed in Phase 04 CONTEXT canonical refs, including `vite.config.ts`, `src/app.html`, `src/routes/(app)/+page.svelte`, `src/lib/install/visibility.ts`, `src/lib/offline/*`, and Supabase migrations. [VERIFIED: codebase grep]

### Secondary (MEDIUM confidence)

- MDN browser/platform installability behavior for mobile install support and `beforeinstallprompt` iOS limitation. [CITED: MDN Making PWAs installable]

### Tertiary (LOW confidence)

- None used as authoritative sources. [VERIFIED: sources review]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions verified against npm and docs verified through Context7/official docs. [VERIFIED: npm registry] [VERIFIED: Context7 CLI]
- Architecture: HIGH — aligns with existing SvelteKit/Supabase/offline queue code and locked Phase 04 decisions. [VERIFIED: codebase grep] [VERIFIED: Phase 04 CONTEXT.md]
- Pitfalls: MEDIUM — main API/platform pitfalls are cited; some warning signs are inferred from likely runtime behavior and tagged `[ASSUMED]`. [CITED: official docs] [ASSUMED]

**Research date:** 2026-05-03 [VERIFIED: environment current_date]  
**Valid until:** 2026-05-10 for Supabase/SvelteKit package currency; PWA browser behavior should be rechecked before manual device UAT. [ASSUMED]
