---
phase: "01"
plan: "02"
subsystem: database
tags: [supabase, rls, schema, migrations, postgres, security, household, invites]
dependency_graph:
  requires: []
  provides:
    - supabase/migrations/2026042501_phase1_foundation.sql
    - supabase/seed.sql
    - tests/db/phase1-rls.test.ts
  affects:
    - plans 03, 04 (auth flows consume these tables)
    - plan 04 (household create/join/invite UI consumes accept_household_invite RPC)
tech_stack:
  added:
    - Supabase PostgreSQL schema (profiles, households, household_members, household_invites, expenses)
    - Row-Level Security (RLS) policies on all Phase 1 tables
    - pgcrypto extension for invite code generation
  patterns:
    - SECURITY DEFINER functions for atomic multi-table operations (create_household_with_owner, accept_household_invite)
    - FOR UPDATE row lock in accept_household_invite to prevent invite race conditions
    - invite_expiry_max_24h CHECK constraint enforcing TTL at DB level
    - client_id UNIQUE constraint for idempotent expense retry safety
key_files:
  created:
    - supabase/config.toml
    - supabase/migrations/2026042501_phase1_foundation.sql
    - supabase/seed.sql
    - tests/db/phase1-rls.test.ts
  modified: []
decisions:
  - "SECURITY DEFINER used on create_household_with_owner and accept_household_invite so callers with anon key cannot bypass membership checks — the function body runs with elevated privilege while validating the caller's auth.uid() explicitly"
  - "FOR UPDATE lock on invite row in accept_household_invite prevents two concurrent callers from both reading 'available' before either marks it used"
  - "invite_expiry_max_24h CHECK constraint enforces 24h TTL at the schema level, not only in application code"
  - "Integration tests gated by SKIP_INTEGRATION environment variable — static structural tests run without a DB connection"
metrics:
  duration_minutes: 4
  completed_date: "2026-04-25"
  tasks_completed: 2
  tasks_total: 3
  files_created: 4
  files_modified: 0
---

# Phase 01 Plan 02: Database Schema, RLS Policies, and Seed Data — Summary

**One-liner:** Supabase schema with RLS-from-creation, atomic invite acceptance using FOR UPDATE row lock, 24h TTL constraint, and regression tests for cross-household denial and invite lifecycle.

## Status: PARTIALLY COMPLETE — Blocking Task 3 Not Executed

Tasks 1 and 2 are committed. Task 3 (`supabase db push`) could not run because the Supabase CLI is not installed in the execution environment.

## Completed Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create Phase 1 schema, functions, and RLS policies | `00d469f` | `supabase/config.toml`, `supabase/migrations/2026042501_phase1_foundation.sql` |
| 2 | Add local verification data and database regression coverage | `6455caf` | `supabase/seed.sql`, `tests/db/phase1-rls.test.ts` |

## Blocking Task

| Task | Name | Status | Blocker |
|------|------|--------|---------|
| 3 | [BLOCKING] Apply the schema before verification | BLOCKED | Supabase CLI not installed; `supabase db push` cannot run |

## What Was Built

### Task 1: Schema and RLS

**supabase/config.toml** — Standard Supabase local dev configuration targeting port 54321 (API), 54322 (DB), 54323 (Studio). Email/password auth only (OAuth disabled). Email confirmations disabled for local dev.

**supabase/migrations/2026042501_phase1_foundation.sql** — Complete Phase 1 schema:

Tables created (all with `ENABLE ROW LEVEL SECURITY` in the same migration):
- `profiles` — one row per auth user, auto-provisioned by trigger on `auth.users` insert
- `households` — household identity with creator reference
- `household_members` — membership with UNIQUE `(household_id, user_id)` constraint; role in `('owner', 'member')`
- `household_invites` — invite codes with `expires_at timestamptz NOT NULL` and `invite_expiry_max_24h` CHECK constraint enforcing ≤24h TTL
- `expenses` — base table for Phase 2 write path; `client_id uuid NOT NULL UNIQUE` for idempotent retries

Named RLS policies (satisfying threat model):
- `profiles_self_select`, `profiles_self_update`, `profiles_self_insert`
- `households_member_select`, `households_creator_update`
- `household_members_member_select`
- `household_invites_member_read`, `household_invites_member_insert`
- `expenses_household_select`, `expenses_household_insert`, `expenses_creator_update`

SQL helper functions:
- `generate_invite_code()` — 8-char uppercase alphanumeric code via pgcrypto
- `current_household_id()` — returns caller's household (stable, no client-side filtering)
- `create_household_with_owner(p_name text)` — atomically creates household + owner membership; rejects if caller already has a household
- `accept_household_invite(p_code text)` — atomically: locks invite row (FOR UPDATE), checks used_at/expires_at/revoked_at, inserts membership, marks invite used, returns household metadata. Raises typed exceptions with HINT for client error routing: `invalid_code`, `already_used`, `expired`, `revoked`, `already_member`
- `create_household_invite(p_household_id uuid)` — creates invite with 24h TTL after verifying membership; retries code generation up to 5 times on collision
- `handle_new_user()` trigger function — provisions `profiles` row on `auth.users` INSERT

### Task 2: Seed Data and Tests

**supabase/seed.sql** — Phase 1 verification fixtures with stable UUIDs:
- Alice (`...001`) as household owner, Bob (`...002`) as member
- Household (`...010`) with both members
- Active invite `TESTCODE` (expires in 23h)
- Expired invite `EXPCODE` (expires 1h in the past, created 25h ago)
- Sample expense with `client_id` = `...050`

**tests/db/phase1-rls.test.ts** — Regression coverage for:
- Same-household read: both Alice and Bob can read households, household_members, expenses
- Cross-household denial: outsider user returns empty array (RLS, not error)
- `accept_household_invite`: valid code accepted, membership inserted, invite marked used
- Expired invite: rejects with `error.hint === 'expired'`
- Single-use invite: second acceptance rejects with `error.hint === 'already_used'`
- `client_id` uniqueness: duplicate insert returns Postgres error code `23505`
- Static structural tests: run without DB, verify constant alignment with migration

Integration tests are skipped (`skipIf(SKIP_INTEGRATION)`) when `SUPABASE_ANON_KEY` or `SUPABASE_SERVICE_ROLE_KEY` are absent, allowing the test suite to pass in CI before Supabase is configured.

## Blocking Task Details

**Task 3: `supabase db push`**

The plan explicitly requires this step to run before the plan can be marked complete.

**What was attempted:** `which supabase` and common CLI locations checked — Supabase CLI is not installed.

**What is needed to unblock:**

1. Install Supabase CLI:
   ```bash
   brew install supabase/tap/supabase
   ```
   Or see: https://supabase.com/docs/guides/cli/getting-started

2. Authenticate:
   ```bash
   supabase login
   ```
   This opens a browser to generate an access token. Alternatively, set `SUPABASE_ACCESS_TOKEN` env var.

3. Link to the Supabase project:
   ```bash
   supabase link --project-ref <your-project-ref>
   ```
   Project ref is in the Supabase dashboard URL: `https://supabase.com/dashboard/project/<ref>`

4. Push the schema:
   ```bash
   supabase db push
   ```
   Expected output: migration `2026042501_phase1_foundation.sql` applied successfully.

**Alternative (local Supabase):**
   ```bash
   supabase start
   supabase db push
   ```
   Requires Docker to be running.

**Verification command after push:**
   ```bash
   supabase db push  # Should report "No pending migrations" on second run
   ```

## Deviations from Plan

None — Tasks 1 and 2 executed exactly as specified.

Task 3 blocked as expected and documented per the plan's explicit instruction: "If `supabase db push` cannot run non-interactively in the execution environment, stop and mark the blocking step unresolved instead of pretending verification passed."

## Threat Model Coverage

All threats from the plan's `<threat_model>` are addressed in the migration:

| Threat | Mitigation Status |
|--------|-------------------|
| Cross-household reads if RLS omitted | All 5 tables have RLS enabled in the same migration that creates them |
| Invite reuse via race condition | `accept_household_invite` uses `FOR UPDATE` lock; single atomic transaction |
| Stale DB while tests pass | Task 3 (supabase db push) BLOCKED — explicitly not pretended to have run |

## Known Stubs

None — all SQL objects are fully implemented. The `expenses` table write path is intentionally deferred to Phase 2 per the research doc.

## Self-Check

### Files Created

- [x] `supabase/config.toml` — exists
- [x] `supabase/migrations/2026042501_phase1_foundation.sql` — exists
- [x] `supabase/seed.sql` — exists
- [x] `tests/db/phase1-rls.test.ts` — exists

### Commits

- [x] `00d469f` — Task 1 commit
- [x] `6455caf` — Task 2 commit
