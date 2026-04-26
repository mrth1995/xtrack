---
phase: 01-foundation
plan: "08"
subsystem: auth-session-pwa
tags: [auth, indexeddb, pwa, standalone, env-validation, error-handling, logout]
dependency_graph:
  requires: [01-03, 01-05, 01-07]
  provides: [indexeddb-session-storage, standalone-boot-gate, env-guard, loader-error-surfacing, logout-visibility]
  affects: [src/lib/auth, src/lib/supabase, src/routes/(app)]
tech_stack:
  added: [IndexedDB storage adapter for Supabase auth]
  patterns: [TDD red-green per task, source-scan tests for structural contracts, localStorage fallback for non-IDB contexts]
key_files:
  created:
    - src/lib/auth/indexeddb-storage.ts
    - src/routes/(app)/+layout.svelte
  modified:
    - src/lib/supabase/client.ts
    - src/lib/supabase/env.ts
    - src/routes/(app)/+page.server.ts
    - src/routes/(app)/household/+page.server.ts
    - src/routes/(app)/household/+page.svelte
    - tests/auth/auth-session.test.ts
    - tests/supabase/env.test.ts
    - tests/households/shared-shell.test.ts
decisions:
  - "IndexedDB adapter uses localStorage fallback for SSR and test environments that lack IDB support"
  - "Placeholder anon key check uses exact string match against known keywords plus a 20-char minimum length guard"
  - "Loader errors use throw error(503) before mapping fallback arrays — never convert query failures into empty trusted UI state"
  - "Household details page gets its own logout form so AUTH-03 is satisfied from all signed-in surfaces"
  - "Existing env.test.ts mock keys updated from 7-9 char short values to 32-char values after new length guard was added"
metrics:
  duration: "~8 minutes"
  completed_date: "2026-04-26"
  tasks_completed: 3
  files_modified: 9
---

# Phase 01 Plan 08: App/Runtime Gap Closure Summary

IndexedDB-backed Supabase session persistence, standalone boot gating, placeholder env rejection before DNS/fetch, explicit loader errors instead of empty UI state, and visible logout from all signed-in surfaces.

## Tasks Completed

| # | Task | Commit | Status |
|---|------|--------|--------|
| 1 | IndexedDB session storage + standalone boot gate | 4aefda0 (test), 4aefda0→feat | Done |
| 2 | Harden Supabase public env validation | f27ce3b (test), 72a23f3 (feat) | Done |
| 3 | Surface loader errors + keep logout visible | ed227e1 (test), 2a419d5 (feat) | Done |

## What Was Built

### Task 1 — IndexedDB session storage and standalone boot gate

**`src/lib/auth/indexeddb-storage.ts`** — New Supabase-compatible storage adapter backed by IndexedDB (database `xtrack-auth`, store `supabase-session`). Implements `getItem`, `setItem`, `removeItem` with `localStorage` fallback for SSR and environments without IndexedDB (tests use `fake-indexeddb` via the jsdom setup). Closes AUTH-04.

**`src/lib/supabase/client.ts`** — Updated to pass `storage: indexedDbSessionStorage` to `createBrowserClient`. Sessions now survive the Safari→Home Screen context isolation on iOS.

**`src/routes/(app)/+layout.svelte`** — New layout file for the `(app)` route group. In standalone mode, renders "Restoring your session..." and calls `getSessionGate()` before allowing `{@render children()}`. Unauthenticated standalone restorations redirect to `/auth?session=expired`.

### Task 2 — Hardened Supabase env validation

**`src/lib/supabase/env.ts`** — Extended `validateSupabasePublicEnv` to reject known placeholder anon key values (`placeholder`, `your-anon-key`, `replace-me`) with message `PUBLIC_SUPABASE_ANON_KEY still contains a placeholder value.` and values shorter than 20 characters with `PUBLIC_SUPABASE_ANON_KEY is too short to be a Supabase anon key.` Throws before either browser or server client can send any network request to the wrong host.

### Task 3 — Loader error surfacing and logout visibility

**`src/routes/(app)/+page.server.ts`** — Added `error` import from `@sveltejs/kit`. Each Supabase query now destructures both `data` and `error`. Any non-null error throws `error(503, ...)` with an exact message before mapping to empty arrays. Closes HOUSE-04.

**`src/routes/(app)/household/+page.server.ts`** — Same treatment: household and members queries now throw `error(503, 'Could not load household details.')` and `error(503, 'Could not load household members.')` on failures.

**`src/routes/(app)/household/+page.svelte`** — Added secondary `<form method="POST" action="/logout">` with "Log out" button. Logout is now reachable from the household details page without navigating back to the home shell. Closes AUTH-03.

## Test Coverage

| Suite | Tests | All Pass |
|-------|-------|----------|
| tests/auth/auth-session.test.ts | 47 | Yes |
| tests/supabase/env.test.ts | 10 | Yes |
| tests/supabase/verify-phase1-supabase-env.test.ts | 6 | Yes |
| tests/households/shared-shell.test.ts | 25 | Yes |

Total: 88 tests, 0 failures.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Existing env.test.ts mock key values too short for new length guard**
- **Found during:** Task 2 GREEN phase
- **Issue:** The `'accepts hosted and local Supabase URLs'` test used `'anon-key'` (7 chars) and `'local-anon'` (9 chars) as mock keys. After adding the 20-char minimum guard, these previously-passing tests started failing.
- **Fix:** Updated mock key to `'test-anon-key-for-unit-test-only'` (32 chars) — long enough to pass the guard while remaining clearly synthetic.
- **Files modified:** `tests/supabase/env.test.ts`
- **Commit:** 72a23f3

## TDD Gate Compliance

Each task followed the RED/GREEN cycle:

- Task 1: `test(01-08)` commit 7d2e2d7 → `feat(01-08)` commit 4aefda0
- Task 2: `test(01-08)` commit f27ce3b → `feat(01-08)` commit 72a23f3
- Task 3: `test(01-08)` commit ed227e1 → `feat(01-08)` commit 2a419d5

## Known Stubs

None. All implemented features are fully wired:
- IndexedDB adapter is imported and used by the browser Supabase client
- Layout gate is wired to `getSessionGate` which calls the real Supabase client
- Loader error throws are executed at runtime on any Supabase query failure
- Logout forms use `action="/logout"` pointing at the existing logout endpoint

## Threat Flags

No new network endpoints, auth paths, file access patterns, or schema changes introduced. Threat mitigations from the plan's register:

| Threat ID | Status |
|-----------|--------|
| T-01-08-01 (Spoofing - IndexedDB storage) | Mitigated: adapter stores only Supabase SDK payloads under SDK keys; session validity checked by Supabase `getSession`/`refreshSession` |
| T-01-08-02 (Info Disclosure - placeholder env) | Mitigated: `validateSupabasePublicEnv` now rejects placeholder/empty values before any network request |
| T-01-08-03 (Repudiation - logout UI) | Mitigated: visible POST logout form added to both signed-in surfaces |
| T-01-08-04 (Tampering - app loaders) | Mitigated: all three loaders now throw explicit 503 instead of returning empty trusted UI state |

## Self-Check: PASSED

All created files exist on disk. All 6 task commits (3 RED + 3 GREEN) confirmed in git log.

| Check | Result |
|-------|--------|
| src/lib/auth/indexeddb-storage.ts | FOUND |
| src/routes/(app)/+layout.svelte | FOUND |
| .planning/phases/01-foundation/01-08-SUMMARY.md | FOUND |
| Commit 7d2e2d7 (RED Task 1) | FOUND |
| Commit 4aefda0 (GREEN Task 1) | FOUND |
| Commit f27ce3b (RED Task 2) | FOUND |
| Commit 72a23f3 (GREEN Task 2) | FOUND |
| Commit ed227e1 (RED Task 3) | FOUND |
| Commit 2a419d5 (GREEN Task 3) | FOUND |
