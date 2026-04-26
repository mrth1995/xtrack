---
phase: 01-foundation
plan: "09"
subsystem: database-security
tags: [rls, security-definer, invite-lifecycle, regression-tests, migrations]
dependency_graph:
  requires: []
  provides:
    - non-recursive-rls-policies
    - is_household_member-helper
    - invite-rpc-regression-coverage
    - live-rls-regression-coverage
  affects:
    - supabase/migrations/2026042501_phase1_foundation.sql
    - tests/db/phase1-rls.test.ts
    - tests/db/invite-rpcs.test.ts
tech_stack:
  added: []
  patterns:
    - SECURITY DEFINER SQL helper to break RLS policy self-reference
    - Fully qualified table column references in RLS USING/WITH CHECK clauses
    - Skip-guarded live integration tests (SKIP_INTEGRATION pattern)
key_files:
  created: []
  modified:
    - supabase/migrations/2026042501_phase1_foundation.sql
    - tests/db/invite-rpcs.test.ts
    - tests/db/phase1-rls.test.ts
decisions:
  - "RLS policies use public.is_household_member() SECURITY DEFINER helper to prevent household_members self-reference recursion"
  - "is_household_member uses fully qualified public.household_members in its body; policies use fully qualified public.<table>.<column> in USING/WITH CHECK"
  - "Task 2 artifacts (service.ts, migrations, database.ts) already satisfied all acceptance criteria — no code changes needed; verified by running tests"
  - "Live integration tests in phase1-rls.test.ts are guarded by SKIP_INTEGRATION=!SUPABASE_ANON_KEY||!SUPABASE_SERVICE_ROLE_KEY"
metrics:
  duration: "4 minutes"
  completed: "2026-04-26T00:09:21Z"
  tasks_completed: 3
  files_modified: 2
  files_created: 0
---

# Phase 01 Plan 09: Phase 1 DB Security Gap Closure Summary

Non-recursive SECURITY DEFINER membership helper `public.is_household_member` replacing self-referential household_members RLS subqueries, plus live RLS and invite RPC regression coverage.

## What Was Built

### Task 1: SECURITY DEFINER Membership Helper (commit afcd158)

Added `public.is_household_member(p_household_id uuid, p_user_id uuid DEFAULT auth.uid())` SECURITY DEFINER helper to `supabase/migrations/2026042501_phase1_foundation.sql` before all policy declarations. This breaks the recursive/self-referential membership check pattern where policies on `household_members` queried `household_members` itself (leading to potential recursion and incorrect tenant filtering).

Replaced all affected RLS policies with fully qualified helper calls:
- `households_member_select`: `USING (public.is_household_member(public.households.id))`
- `household_members_member_select`: `USING (public.is_household_member(public.household_members.household_id))`
- `household_invites_member_read`: `USING (public.is_household_member(public.household_invites.household_id))`
- `household_invites_member_insert`: `WITH CHECK (public.is_household_member(public.household_invites.household_id) AND public.household_invites.created_by = auth.uid())`
- `expenses_household_select`: `USING (public.is_household_member(public.expenses.household_id))`
- `expenses_household_insert`: `WITH CHECK (public.expenses.created_by = auth.uid() AND public.is_household_member(public.expenses.household_id))`
- `expenses_creator_update`: `USING/WITH CHECK` using both `created_by = auth.uid()` and `is_household_member(...)`

Added 4 structural regression tests to `tests/db/invite-rpcs.test.ts` verifying the helper signature, SECURITY DEFINER/STABLE/search_path attributes, policy call patterns, and absence of old unqualified patterns.

### Task 2: Invite Lookup and Active Invite Reuse (pre-satisfied, verified)

All acceptance criteria for Task 2 were already satisfied by prior plan work:
- `service.ts` already contains `Invite lookup is not available. Apply the latest Supabase migrations, then restart the app and try again.` for unknown RPC errors
- `service.ts` already calls only `client.rpc('get_or_create_active_household_invite', ...)` with no `from('household_invites')` reads
- `supabase/migrations/2026042602_invite_reuse_rpc.sql` already contains `SECURITY DEFINER`, `used_at IS NULL`, `revoked_at IS NULL`, `expires_at > now()`, `ORDER BY created_at DESC`
- `tests/households/onboarding.test.ts` already contains `PGRST202` and `latest Supabase migrations` tests
- `src/lib/types/database.ts` already has function entries with correct `Args` types

No code changes were needed. All 42 tests in onboarding + invite-rpcs suites pass.

### Task 3: Live RLS and RPC Regression Coverage (commit df060e3)

Extended `tests/db/phase1-rls.test.ts` with 3 new integration tests (all guarded by `SKIP_INTEGRATION`):

1. **`lookup_household_invite` test** — creates a fresh non-member user, inserts a fresh invite via service role, calls `lookup_household_invite` as the non-member user, asserts `error` is null and `household_name` matches seed household name.

2. **`get_or_create_active_household_invite` idempotency test** — calls the RPC twice as Alice for `HOUSEHOLD_ID`, asserts both returned rows have the same `code`.

3. **`household_members` outsider denial test** — creates a fresh user with no household membership, queries `household_members` for `HOUSEHOLD_ID`, asserts `data` equals `[]`.

The seed.sql already contained all required data:
- Alice (`00000000-0000-0000-0000-000000000001`) and Bob (`00000000-0000-0000-0000-000000000002`)
- Household `00000000-0000-0000-0000-000000000010` ("Alice & Bob Household")
- Active invite code `TESTCODE`, expired invite `EXPCODE`
- Shared expense `client_id = '00000000-0000-0000-0000-000000000050'`

## Deviations from Plan

### Pre-satisfied Task

**Task 2 — all acceptance criteria pre-satisfied**
- **Found during:** Task 2 read-first phase
- **Issue:** All code (service.ts, migrations, types, tests) already implemented correct behavior from prior plan work (Plan 07)
- **Action:** Skipped implementation, verified all tests pass, documented in summary
- **No commit needed:** No files changed for Task 2

### Pre-existing `npm run check` errors (out of scope)

4 type errors in `svelte-check` output for `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY` are pre-existing worktree issues — `.env` file is gitignored and not present in the worktree. These are not caused by Plan 09 changes and were present before execution started. Excluded from deviation tracking per scope boundary rules.

## Known Stubs

None. All tests use real structural assertions (file reads) or live integration tests with proper skip guards.

## Threat Flags

None. Changes are purely within the established trust boundary (SQL helper enforcing household_members lookup via `SECURITY DEFINER`, consistent with T-01-09-01 mitigation in the plan's threat model).

## Self-Check: PASSED

| Item | Status |
|------|--------|
| `.planning/phases/01-foundation/01-09-SUMMARY.md` | FOUND |
| `supabase/migrations/2026042501_phase1_foundation.sql` | FOUND |
| `tests/db/invite-rpcs.test.ts` | FOUND |
| `tests/db/phase1-rls.test.ts` | FOUND |
| Commit afcd158 (Task 1) | FOUND |
| Commit df060e3 (Task 3) | FOUND |
