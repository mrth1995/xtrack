---
phase: 01-foundation
plan: "07"
subsystem: uat-gap-closure
tags: [sveltekit, supabase, rls, invites, uat]

requires:
  - phase: 01-foundation
    provides: auth, household onboarding, invite lookup, signed-in shell, Supabase migrations
provides:
  - Actionable public Supabase environment validation before client setup
  - Visible signed-in logout control using POST /logout
  - SECURITY DEFINER RPC for active household invite reuse
  - Invite lookup errors that distinguish user invite states from deployment/setup failures
  - Regression tests and UAT retest documentation for Phase 1 gaps
affects: [phase-01-uat, household-invites, auth-shell, supabase-setup]

tech-stack:
  added: []
  patterns:
    - Shared public-env guard before browser/server Supabase client construction
    - Database-owned invite reuse through SECURITY DEFINER RPCs
    - Static structural tests for migration/type contract drift

key-files:
  created:
    - src/lib/supabase/env.ts
    - tests/supabase/env.test.ts
    - supabase/migrations/2026042602_invite_reuse_rpc.sql
    - tests/db/invite-rpcs.test.ts
  modified:
    - src/lib/supabase/client.ts
    - src/lib/supabase/server.ts
    - src/routes/(app)/+page.svelte
    - tests/households/shared-shell.test.ts
    - src/lib/server/households/service.ts
    - src/lib/types/database.ts
    - tests/households/onboarding.test.ts
    - README.md

key-decisions:
  - "Invite reuse now lives in get_or_create_active_household_invite so RLS-scoped client reads cannot silently replace active codes."
  - "Unknown invite lookup RPC errors surface migration/setup guidance instead of invalid-code copy."

patterns-established:
  - "Public Supabase client setup must call validateSupabasePublicEnv before constructing browser or server clients."
  - "Invite service code should use RPCs for invite lookup/reuse rather than direct household_invites reads."

requirements-completed: []

duration: 4 min
completed: 2026-04-25
---

# Phase 01 Plan 07: UAT Gap Closure Summary

**Supabase setup guard, signed-in logout, database-owned invite reuse, and invite-flow regression coverage for Phase 1 UAT gaps**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-25T23:22:52Z
- **Completed:** 2026-04-25T23:27:40Z
- **Tasks:** 5
- **Files modified:** 12

## Accomplishments

- Added a shared Supabase public env guard that rejects missing, placeholder, and malformed values before network calls.
- Added a visible secondary logout button to the signed-in home shell using the existing POST `/logout` route.
- Added `get_or_create_active_household_invite` as a `SECURITY DEFINER` RPC and moved active invite reuse out of client-side table reads.
- Hardened invite lookup errors so missing/unapplied RPCs show setup guidance while known invite states keep friendly user copy.
- Added service/static regression tests and README UAT retest steps for the Phase 1 gaps.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Supabase Environment Guard** - `2e9ed4a` (fix)
2. **Task 2: Add Visible Logout Control** - `78c54ae` (feat)
3. **Task 3: Move Invite Reuse Into a Database RPC** - `898b0a8` (feat)
4. **Task 4: Harden Invite Lookup Error Handling** - `9966399` (fix)
5. **Task 5: Add Verification Coverage and Docs** - `3c75526` (test)

## Files Created/Modified

- `src/lib/supabase/env.ts` - Validates public Supabase URL and anon key with actionable setup errors.
- `tests/supabase/env.test.ts` - Covers placeholder, missing, malformed, hosted, and local Supabase env values.
- `src/lib/supabase/client.ts` - Uses the shared env guard before creating the browser Supabase client.
- `src/lib/supabase/server.ts` - Uses the shared env guard before creating request-scoped server clients.
- `src/routes/(app)/+page.svelte` - Adds visible POST logout control to the signed-in shell.
- `tests/households/shared-shell.test.ts` - Adds regression coverage for the logout form.
- `supabase/migrations/2026042602_invite_reuse_rpc.sql` - Adds active invite reuse/create RPC.
- `src/lib/server/households/service.ts` - Calls invite reuse RPC and distinguishes lookup setup errors.
- `src/lib/types/database.ts` - Adds generated-style type entry for the invite reuse RPC.
- `tests/households/onboarding.test.ts` - Updates invite service expectations for RPC reuse and lookup setup errors.
- `tests/db/invite-rpcs.test.ts` - Locks migration/type presence for invite RPCs.
- `README.md` - Documents Phase 1 UAT migration and retest sequence.

## Decisions Made

- Invite reuse is database-owned via `get_or_create_active_household_invite`, avoiding direct client reads of `household_invites` for reuse decisions.
- Missing or unknown invite lookup RPC errors are treated as deployment/setup problems, not invalid user codes.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

Apply the latest Supabase migrations before manual UAT retest:

```bash
supabase db push
```

Then restart the dev server so `.env` and migration-dependent RPC behavior are both current.

## Known Stubs

None.

## Verification

- `npm test` - passed, 10 files, 111 tests passed, 10 skipped.
- `npm run check` - passed, 0 errors and 0 warnings.
- `npm run build` - passed with Cloudflare adapter output.

Manual retest remains external: run `$gsd-verify-work 1` after applying the new migration to the target Supabase database.

## Next Phase Readiness

Phase 1 UAT gap closure is ready for orchestrator merge/state updates and manual verification against a migrated Supabase project.

## Self-Check: PASSED

- Found created files: `src/lib/supabase/env.ts`, `tests/supabase/env.test.ts`, `supabase/migrations/2026042602_invite_reuse_rpc.sql`, `tests/db/invite-rpcs.test.ts`.
- Found task commits: `2e9ed4a`, `78c54ae`, `898b0a8`, `9966399`, `3c75526`.
- No accidental tracked file deletions were detected in task commits.

---
*Phase: 01-foundation*
*Completed: 2026-04-25*
