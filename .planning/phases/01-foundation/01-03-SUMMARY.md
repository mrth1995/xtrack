---
phase: 01-foundation
plan: "03"
subsystem: auth
tags: [supabase, svelte-kit, vitest, session, standalone, pwa]

# Dependency graph
requires:
  - phase: 01-01
    provides: SvelteKit project scaffold, routing structure, TypeScript config
  - phase: 01-02
    provides: Supabase project, database schema, household_members table

provides:
  - Browser and server Supabase auth clients (src/lib/supabase/client.ts, server.ts)
  - Request-scoped session hydration in hooks.server.ts (event.locals.user/session/householdId)
  - Auth guard: unauthenticated requests to (app) routes redirect to /auth
  - Combined login/sign-up screen at /auth with inline validation and mode switching
  - Logout endpoint at /logout (GET + POST)
  - iOS standalone-aware session restoration helpers (isStandalone, restoreSession, getSessionGate)
  - Auth/session regression test suite (40 tests, 0 network calls)

affects:
  - 01-04 (household onboarding uses session from locals)
  - 01-05 (expense quick-add requires authenticated user)
  - all future (app) routes depend on the auth guard

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Request-scoped Supabase client created in hooks.server.ts, passed into load functions via event
    - SvelteKit locals pattern for session/user hydration (event.locals.user, .session, .householdId)
    - vi.hoisted() pattern for mock function references that vi.mock() factories close over
    - $lib alias added to vitest.config.ts for test-time module resolution

key-files:
  created:
    - src/lib/supabase/client.ts
    - src/lib/supabase/server.ts
    - src/lib/auth/schemas.ts
    - src/lib/auth/session.ts
    - src/routes/(auth)/auth/+page.svelte
    - src/routes/(auth)/auth/+page.server.ts
    - src/routes/logout/+server.ts
    - tests/auth/auth-session.test.ts
  modified:
    - src/hooks.server.ts
    - src/routes/(app)/+layout.server.ts
    - vitest.config.ts

key-decisions:
  - "Server Supabase client created per-request using createServerClient(event) — no singleton"
  - "Auth route placed at /auth/auth due to (auth) group layout nesting; public path guard uses startsWith('/auth')"
  - "vi.hoisted() used for mock functions so vi.mock() factories can close over them safely"
  - "$lib path alias added to vitest.config.ts (not vite.config.ts) to keep test resolution separate from app build"

patterns-established:
  - "Pattern: Request-scoped supabase client — createServerClient(event) called fresh per request in hooks.server.ts"
  - "Pattern: isPublicPath guard — explicit allowlist of /auth, /logout, /_app, /favicon, /manifest"
  - "Pattern: Vitest vi.hoisted() — use for any mock function that a vi.mock() factory references"

requirements-completed:
  - AUTH-01
  - AUTH-02
  - AUTH-03
  - AUTH-04

# Metrics
duration: ~15min (Task 3 only; Tasks 1-2 completed in prior session)
completed: 2026-04-25
---

# Phase 01 Plan 03: Auth, Session, and Standalone-Mode Restoration Summary

**Email/password auth with Supabase, request-scoped session hydration in hooks, standalone-aware session restoration helpers, and 40-test regression suite with vi.hoisted() mock pattern**

## Performance

- **Duration:** ~15 min (Task 3 only; Tasks 1-2 were merged before this session)
- **Completed:** 2026-04-25
- **Tasks:** 3 (1 executed this session)
- **Files modified:** 2 (tests/auth/auth-session.test.ts created, vitest.config.ts updated)

## Accomplishments

- 40 unit tests covering schema validators, isStandalone, restoreSession, getSessionGate, auth guard contract, and signIn/signUp/signOut method contracts — all passing, zero network calls
- $lib path alias added to vitest.config.ts enabling direct import of src/lib/* modules in tests
- vi.hoisted() pattern established for mock functions referenced inside vi.mock() factories
- Full auth flow verified: login, signup, logout, standalone restore, and route guard logic

## Task Commits

1. **Task 1: Supabase auth clients and request-scoped session plumbing** - `2087287` (feat)
2. **Task 2: Combined login/sign-up screen and logout endpoint** - `f5764cd` (feat), `dcab7b4` (fix)
3. **Task 3: Auth and session regression coverage** - `bf171db` (test)

## Files Created/Modified

- `src/lib/supabase/client.ts` - Browser Supabase client using PUBLIC_ env vars only
- `src/lib/supabase/server.ts` - createServerClient(event) factory for per-request server clients
- `src/lib/auth/schemas.ts` - validateEmail, validatePassword, validateAuthForm pure validators
- `src/lib/auth/session.ts` - isStandalone, restoreSession, getSessionGate — standalone-aware session helpers
- `src/hooks.server.ts` - Global handle: session hydration, household lookup, isPublicPath guard
- `src/routes/(auth)/auth/+page.svelte` - Combined login/sign-up UI with mode toggle and show/hide password
- `src/routes/(auth)/auth/+page.server.ts` - login and signup server actions calling Supabase auth
- `src/routes/logout/+server.ts` - GET + POST handlers calling signOut and redirecting to /auth
- `src/routes/(app)/+layout.server.ts` - Defence-in-depth auth guard for the (app) route group
- `tests/auth/auth-session.test.ts` - 40-test regression suite (NEW)
- `vitest.config.ts` - Added $lib alias for test-time resolution (MODIFIED)

## Decisions Made

- **Server client per-request:** `createServerClient(event)` is called fresh per request inside hooks.server.ts, not cached. Cookies are forwarded via `event.request.headers.get('cookie')`. This avoids cross-request session leakage.
- **Auth route nesting:** Route lives at `src/routes/(auth)/auth/+page.svelte` — the `(auth)` group is a layout group, so the actual URL is `/auth`. The isPublicPath guard uses `startsWith('/auth')` to cover both `/auth` and any `/auth/*` subpaths.
- **vi.hoisted() for mocks:** vi.mock() is hoisted to the top of the file, so closures in the factory cannot reference module-scope variables declared after the call. vi.hoisted() lifts the mock function declarations to the same hoisting level.
- **$lib alias in vitest.config.ts only:** The alias is needed for tests importing src/lib/* directly. The production build uses SvelteKit's own Vite plugin which handles $lib resolution; keeping the alias only in vitest.config.ts avoids duplication.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added $lib path alias to vitest.config.ts**
- **Found during:** Task 3 (auth/session test creation)
- **Issue:** `src/lib/auth/session.ts` imports from `$lib/supabase/client`; vitest.config.ts had no alias for `$lib`, causing module resolution failure
- **Fix:** Added `$lib: path.resolve('./src/lib')` to `resolve.alias` in vitest.config.ts
- **Files modified:** vitest.config.ts
- **Verification:** All 40 tests pass; smoke tests still pass
- **Committed in:** bf171db (Task 3 commit)

**2. [Rule 3 - Blocking] vi.hoisted() pattern for mock functions**
- **Found during:** Task 3, first test run
- **Issue:** `vi.mock('$lib/supabase/client', ...)` factory referenced `mockGetSession` etc. before initialization — vitest hoists vi.mock() above variable declarations
- **Fix:** Wrapped mock function declarations in `vi.hoisted(() => ({ ... }))` so they are accessible inside the factory
- **Files modified:** tests/auth/auth-session.test.ts
- **Verification:** ReferenceError resolved; all tests pass
- **Committed in:** bf171db (Task 3 commit, incorporated before first commit)

---

**Total deviations:** 2 auto-fixed (both Rule 3 blocking)
**Impact on plan:** Both fixes were necessary infrastructure for the test suite to run. No scope creep.

## Issues Encountered

- None beyond the two blocking issues documented above.

## User Setup Required

None — no external service configuration required for this plan.

## Next Phase Readiness

- Auth is complete and tested. The hook hydrates `event.locals.user`, `event.locals.session`, and `event.locals.householdId` on every request.
- Household onboarding (01-04) can rely on `locals.user` being set and `locals.householdId` being null for new users.
- The isPublicPath allowlist in hooks.server.ts already includes `/manifest` — PWA manifest routes are unguarded.

## Self-Check: PASSED

- FOUND: tests/auth/auth-session.test.ts
- FOUND: .planning/phases/01-foundation/01-03-SUMMARY.md
- FOUND: src/lib/auth/schemas.ts, src/lib/auth/session.ts, src/hooks.server.ts, src/routes/logout/+server.ts
- Commits verified: bf171db, dcab7b4, f5764cd, 2087287
- `npm run test:unit -- auth-session`: 40 tests passed

---
*Phase: 01-foundation*
*Completed: 2026-04-25*
