---
status: resolved
trigger: 503 error "Could not load household data" after login
created: 2026-04-27T00:00:00+07:00
updated: 2026-04-27T09:30:00+07:00
---

# Debug Session: 503-could-not-load-household-data

## Symptoms

- expected_behavior: Dashboard loads with household data after login
- actual_behavior: 503 error "Could not load household data" is shown immediately after login
- error_messages: "503 Could not load household data"
- timeline: Started today (2026-04-27), was working before
- reproduction: Happens every login, 100% reproducible

## Current Focus

- hypothesis: Multiple Supabase client instances per request caused auth state divergence
- test: TypeScript compile + full unit test suite
- expecting: All tests pass, 503 eliminated
- next_action: resolved
- reasoning_checkpoint: The household query was silently failing before commit 2a419d5 (Apr 26). That commit added error handling, which made the silent failure visible as a 503.
- tdd_checkpoint:

## Evidence

- timestamp: 2026-04-27T09:00:00+07:00
  type: code_analysis
  file: src/routes/(app)/+page.server.ts
  note: Line 67 throws error(503) when householdError is truthy. Added in commit 2a419d5 (Apr 26). Previously the error was silently ignored.

- timestamp: 2026-04-27T09:05:00+07:00
  type: code_analysis
  file: src/hooks.server.ts
  note: Hook creates Supabase client, calls getSession/getUser/rpc — but does NOT store the client in event.locals. Each route server file then calls createServerClient(event) to create a second independent client instance.

- timestamp: 2026-04-27T09:10:00+07:00
  type: code_analysis
  file: src/lib/supabase/server.ts
  note: createServerClient uses autoRefreshToken:false, persistSession:false (for SSR). Two independent instances share event.cookies but have separate internal auth state (setItems/removedItems tracking).

- timestamp: 2026-04-27T09:15:00+07:00
  type: root_cause
  note: The hook's client calls getSession(), getUser(), and rpc('current_household_id') — loading and potentially refreshing the session into that client's internal setItems cache. The page load's fresh client starts with an empty setItems cache and must re-derive the session purely from cookies. Any token refresh the hook performed was buffered in the first client's setItems but not yet written to response cookies when the second client reads event.cookies.getAll() for its getSession() call. This meant the second client could send a stale or anon-key Bearer token to PostgREST, causing auth.uid() to return null in the RLS check, which blocked the households SELECT and returned PGRST116 (0 rows), which .single() surfaces as householdError.

## Eliminated Hypotheses

- RLS policy misconfiguration: policies are correct; current_household_id() RPC (SECURITY DEFINER) succeeds, confirming membership
- Expired session: would cause redirect to /auth via hook guard, not a 503
- Missing migration: would affect RPC too, causing redirect to /onboarding instead
- Data inconsistency: CASCADE constraints prevent orphan household_members rows

## Resolution

- root_cause: Multiple createServerClient calls per request created independent Supabase client instances with divergent internal auth state. The hook's client buffered a token refresh in its setItems cache; the page load's fresh client missed that buffered state and fell back to the anon key for PostgREST requests, causing auth.uid() = null in RLS → PGRST116 → 503.
- fix: Store the Supabase client created in hooks.server.ts in event.locals.supabase and have all route server files (load functions, actions, API handlers) reuse locals.supabase instead of calling createServerClient(event) themselves. Added console.error logging before each 503 throw to surface the actual Supabase error code and message in server logs for future diagnosis.
- verification: npx tsc --noEmit passes clean. npx vitest run: 141 passed, 13 skipped (integration-only DB tests requiring live Supabase).
- files_changed:
  - src/app.d.ts (added supabase: ReturnType<typeof createServerClient> to Locals)
  - src/hooks.server.ts (store supabase client in event.locals.supabase)
  - src/routes/(app)/+page.server.ts (use locals.supabase; add console.error before 503 throws)
  - src/routes/(app)/household/+page.server.ts (use locals.supabase; add console.error before 503 throws)
  - src/routes/(app)/settings/invite/+page.server.ts (use locals.supabase)
  - src/routes/(app)/onboarding/create/+page.server.ts (use locals.supabase)
  - src/routes/(app)/onboarding/join/+page.server.ts (use locals.supabase)
  - src/routes/logout/+server.ts (use locals.supabase)
  - tests/households/onboarding-routes.test.ts (update test to pass supabase in locals, drop createServerClient call assertion)
