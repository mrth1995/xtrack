# Phase 04: pwa-realtime - Context

**Gathered:** 2026-05-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Make xtrack fully installable to iOS and Android home screens with a cached offline app shell, then add household-scoped Supabase Realtime so both household members see new expenses appear without manual refresh. This phase must preserve the existing Quick Add default home screen, offline queue behavior, and `client_id`-based idempotency from earlier phases.

</domain>

<decisions>
## Implementation Decisions

### Offline Shell Caching
- **D-01:** Phase 04 should cache the app shell and static assets only. Do not add last-known route-data caching for Today or history in this phase.
- **D-02:** After one prior visit, the installed app should open offline into the normal app frame. Existing IndexedDB queue/list behavior supplies local rows where available.
- **D-03:** Offline server-refresh failures should stay quiet. Do not show a large offline banner or dedicated offline screen when the app opens offline.
- **D-04:** Network-only actions may surface errors when attempted, but passive offline launch should not interrupt the Quick Add experience.
- **D-05:** Service worker updates should activate naturally on next app open or reload. Do not force an immediate reload during active use, and do not add an update-available prompt in this phase.

### Install Polish
- **D-06:** Phase 04 should deliver a functional install pass: manifest, icon assets, theme color, standalone display, cached offline shell, and manual iOS/Android install verification.
- **D-07:** Create a simple branded xtrack icon set using the existing brand direction/colors. Avoid temporary placeholder icons if generated branded assets are feasible.
- **D-08:** Android install support is passive only. Make the app installable through the manifest/service worker, but do not add a separate Android `beforeinstallprompt` banner or install button.
- **D-09:** Keep the existing iOS-oriented install guidance behavior unless implementation discovers a small required adjustment for full installability.

### Realtime Merge Behavior
- **D-10:** Partner-created expenses should appear instantly in the visible list in sorted order without requiring a manual refresh or a "new expense" button.
- **D-11:** Incoming partner expenses must not interrupt Quick Add input. If the current user is typing an amount, preserve amount, category press state, note sheet state, focus, and debounce behavior.
- **D-12:** Phase 04 Realtime coverage should include both the home Today list and the `/expenses` history page.
- **D-13:** Edit pages do not need full live-update behavior in this phase unless the planner finds a very low-cost consistency hook.

### Own Insert Suppression and Reconnects
- **D-14:** Use `client_id` as the canonical own-insert and duplicate-suppression key for Realtime UI updates.
- **D-15:** When a Realtime row has a `client_id` already present locally or visibly, merge/update the existing row instead of appending a duplicate.
- **D-16:** Do not skip all rows from the current user solely by `created_by`; a `client_id` match is the locked behavior for Phase 04.
- **D-17:** On Realtime reconnect after an offline/disconnected period, invalidate/reload server data and merge it with local queued rows.
- **D-18:** Reconnect reconciliation must keep one visible row per `client_id`, preserving the Phase 03 local queue guarantees.

### Testing Expectations
- **D-19:** Phase 04 should include automated checks for manifest/service-worker installability basics where practical, plus manual install verification for iOS Safari and Android.
- **D-20:** Realtime tests should cover partner insert rendering, own `client_id` suppression, reconnect reload/merge behavior, and preservation of Quick Add input state during incoming rows.

### the agent's Discretion
- Exact service worker library/configuration, cache naming, and asset glob choices are planner/implementer decisions as long as the app shell loads offline after one prior visit.
- Exact icon visual treatment may follow the existing xtrack palette and mobile app conventions.
- Exact Realtime module boundaries may follow the existing SvelteKit/Svelte 5 patterns, but should avoid duplicating merge logic across home and history if a shared helper is clearer.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase definition
- `.planning/ROADMAP.md` - Phase 04 goal, success criteria, dependency order, and scope boundary.
- `.planning/REQUIREMENTS.md` - Locked requirement IDs for Phase 04: `PWA-01`, `PWA-03`, `PWA-04`, `SYNC-01`, and `SYNC-02`.

### Project constraints
- `.planning/PROJECT.md` - Product context, PWA/iOS priority, household model, mobile-first Quick Add core value, and zero/near-zero running cost constraint.
- `.planning/STATE.md` - Current state and carried-forward architecture decisions: SvelteKit 2, Svelte 5, Tailwind 4, Supabase, Cloudflare Pages, IndexedDB auth/session persistence, offline queue, and `client_id` idempotency.

### Prior phase context
- `.planning/phases/01-foundation/01-CONTEXT.md` - Install guidance behavior, standalone session handling expectations, and email/password auth constraints.
- `.planning/phases/02-quick-add/02-CONTEXT.md` - Quick Add home screen, Today/history list behavior, note sheet timing, and navigation decisions that Realtime must preserve.
- `.planning/phases/03-offline-tolerance/03-CONTEXT.md` - Offline queue, sync status visibility, retry/idempotency, and local queued row merge rules that Phase 04 must not regress.

### Existing implementation
- `vite.config.ts` - Current Vite/SvelteKit plugin setup; Phase 04 likely adds PWA/service worker configuration here.
- `src/app.html` - Existing PWA-related meta tags and theme color.
- `src/lib/install/visibility.ts` - iOS/Android standalone detection and install guidance visibility rules.
- `src/lib/components/InstallGuidanceBanner.svelte` - Existing non-modal Safari install guidance component.
- `src/lib/auth/indexeddb-storage.ts` - IndexedDB-backed Supabase session storage for iOS standalone mode.
- `src/lib/supabase/client.ts` - Browser Supabase client used for auth persistence and likely Realtime channel creation.
- `src/routes/(app)/+layout.svelte` - Standalone session gate and app-open queue flush integration.
- `src/routes/(app)/+layout.server.ts` - Protected layout data including `householdId`, needed for household-scoped Realtime subscriptions.
- `src/routes/(app)/+page.svelte` - Quick Add home screen, Today list, local queued row merge, and input state that Realtime must preserve.
- `src/routes/(app)/expenses/+page.svelte` - Full history list and local queued row merge behavior that Realtime should update.
- `src/lib/components/ExpenseList.svelte` - Shared row component for Today and history.
- `src/lib/offline/expense-sync.ts` - Existing online/visibility flush triggers and reconnect-adjacent sync behavior.
- `src/lib/offline/expense-queue.ts` - IndexedDB queue keyed by `client_id`; Realtime merge logic must respect these local rows.
- `src/lib/offline/types.ts` - Offline row/status shape.
- `supabase/config.toml` - Local Supabase Realtime is enabled.
- `supabase/migrations/2026042501_phase1_foundation.sql` - `expenses` table fields, RLS policies, household scope, `client_id`, and soft-delete baseline.
- `supabase/migrations/2026050201_phase3_idempotent_expense_insert.sql` - Server-side idempotent save RPC and `client_id` retry behavior.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/supabase/client.ts` already exports a browser Supabase client with IndexedDB session persistence; this is the likely source for Realtime channels.
- `src/routes/(app)/+layout.server.ts` exposes `householdId`, which can scope Realtime subscriptions and reconcile reloads.
- `src/routes/(app)/+page.svelte` already merges local queued rows into Today by `client_id` and preserves Quick Add state around async save/flush behavior.
- `src/routes/(app)/expenses/+page.svelte` already merges IndexedDB queued rows into history and groups by WIB date.
- `src/lib/components/ExpenseList.svelte` is shared by Today and history, so incoming row rendering can stay visually consistent.
- `src/lib/offline/expense-queue.ts` and `src/lib/offline/expense-sync.ts` provide the local queue and sync trigger model that Realtime must cooperate with.
- `src/lib/install/visibility.ts` and `InstallGuidanceBanner.svelte` already cover standalone detection and non-modal iOS install guidance.

### Established Patterns
- Svelte 5 runes are used in route components.
- Client-side list state is merged by `client_id`/`id` maps rather than blindly appending.
- Local offline rows are first-class visible rows and must remain editable/recoverable.
- Server queries and actions rely on `locals.householdId` and Supabase RLS for household isolation.
- The app favors quiet reliability over banners and interruptions.

### Integration Points
- PWA/service worker setup likely connects through `vite.config.ts`, app metadata in `src/app.html`, and generated/static icon assets.
- Realtime setup should attach after authenticated app layout/session readiness and `householdId` availability.
- Home and history need a shared or consistent merge path for incoming `expenses` inserts and reconnect reloads.
- Reconnect reload should invalidate server data without losing local queued rows or duplicating rows with matching `client_id`.
- Own insert suppression must interact with Phase 03 server-first saves, offline queued saves, and idempotent retry results.

</code_context>

<specifics>
## Specific Ideas

- The PWA should feel like the same quiet Quick Add app when opened offline, not a separate offline mode.
- Partner expenses should simply appear below the input flow; they should not steal attention from logging an expense.
- The branded icon set should be good enough for a real home-screen install in v1, not a throwaway placeholder.

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope.

</deferred>

---

*Phase: 04-pwa-realtime*
*Context gathered: 2026-05-17*
