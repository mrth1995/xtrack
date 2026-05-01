# Phase 03: Offline Tolerance - Context

**Gathered:** 2026-05-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Build offline tolerance for the existing Quick Add write path. Expenses logged without connectivity must appear immediately, queue locally in IndexedDB, sync automatically when connectivity returns, recover from stuck `syncing` state, and retry safely without creating duplicates in Supabase.

</domain>

<decisions>
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

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase definition
- `.planning/ROADMAP.md` - Phase 03 goal, success criteria, dependency order, and scope boundary.
- `.planning/REQUIREMENTS.md` - Locked requirement IDs for Phase 03: `INPUT-08`, `INPUT-09`, `INPUT-10`, and `INPUT-11`.

### Project constraints
- `.planning/PROJECT.md` - Product context, offline-tolerant input requirement, household model, IDR locale, PWA priorities, and zero/near-zero cost constraints.
- `.planning/STATE.md` - Current project state and prior locked stack/architecture decisions.

### Prior phase context
- `.planning/phases/02-quick-add/02-CONTEXT.md` - Quick Add home-screen behavior, note sheet timing, list/edit/delete expectations, and navigation shell decisions that Phase 03 must preserve.

### Existing implementation
- `src/routes/(app)/+page.svelte` - Current Quick Add client flow, optimistic Today insertion, note sheet, and `client_id` generation.
- `src/routes/(app)/+page.server.ts` - Current `saveExpense` and `saveNote` server actions, duplicate `client_id` recovery, and Today query.
- `src/lib/components/ExpenseList.svelte` - Shared row component for Today and history; Phase 03 status labels should integrate here or through a compatible row model.
- `src/lib/expenses/schemas.ts` - Expense payload validation and fixed category list.
- `src/lib/types/database.ts` - Supabase generated table types for `expenses`.
- `supabase/migrations/2026042501_phase1_foundation.sql` - Existing `expenses` table, unique `client_id`, RLS policies, and soft-delete field.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/routes/(app)/+page.svelte` already generates a `client_id` with `crypto.randomUUID()`, submits hidden form fields, resets the numpad after successful save, prepends the saved expense into Today, and opens `NoteSheet`.
- `src/routes/(app)/+page.server.ts` already handles duplicate `client_id` inserts by returning the existing expense, which supports retry idempotency.
- `src/lib/components/ExpenseList.svelte` is shared by Today and full history, making one status-display pattern reusable across both surfaces.
- `src/lib/expenses/schemas.ts` provides the canonical save/note/edit payload shapes and category enum.

### Established Patterns
- SvelteKit form actions with `use:enhance` are the current write path.
- Supabase access runs through `locals.supabase`; household scoping comes from `locals.householdId`.
- RLS remains the server-side household boundary, and client code must not trust form-provided household IDs.
- Existing visual style uses compact mobile-first rows, CSS custom properties, and subtle list metadata.

### Integration Points
- Quick Add save handling must branch between server-first online save and local queue fallback.
- `ExpenseList` row data likely needs status fields or a compatible view model for `Waiting`, `Saving`, and `Couldn't sync`.
- `/expenses/[id]/edit` must support queued/failed local records as well as persisted Supabase records.
- App startup/session-ready code and foreground/online event listeners must trigger queue flushing without requiring a new save.

</code_context>

<specifics>
## Specific Ideas

- Offline tolerance should protect the feeling of fast logging. The user should not have to think about connectivity before recording an expense.
- Visible sync state should be honest but quiet: only unsynced rows show status, and only failures get strong styling.
- Never lose a locally captured expense because of auth/session/household mismatch. Keep it local and recoverable.
- Do not silently move an expense into a different household if the user's household context changes before sync.

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope.

</deferred>

---

*Phase: 03-offline-tolerance*
*Context gathered: 2026-05-01*
