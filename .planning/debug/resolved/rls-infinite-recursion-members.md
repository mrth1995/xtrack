---
status: resolved
trigger: 42P17 infinite recursion detected in policy for relation "household_members"
created: 2026-04-27T00:00:00+07:00
updated: 2026-04-27T00:00:00+07:00
---

# Debug Session: rls-infinite-recursion-members

## Symptoms

- expected_behavior: Households query succeeds and dashboard loads after login
- actual_behavior: PostgreSQL error 42P17 — infinite recursion detected in RLS policy for "household_members" relation
- error_messages: "[/+page.server] households query failed: 42P17 infinite recursion detected in policy for relation \"household_members\" null"
- timeline: Surfaced after recent Supabase client singleton fix (locals.supabase refactor on 2026-04-27)
- reproduction: Happens on every login when households query runs in +page.server.ts

## Current Focus

- hypothesis: CONFIRMED — PostgreSQL inlined the LANGUAGE sql STABLE is_household_member function body into all RLS policies when they were first created. The inlining produced a broken correlation condition (hm.household_id = hm.household_id — always true, self-referential) instead of the intended outer-table join. On household_members this caused infinite recursion. Previous fix (migration 2026042701) recreated the function but did not recreate the policies, so they retained the stale inlined bodies.
- test: N/A — error was deterministic and reproducible on every login
- expecting: Migration 2026042702 pushed. Function now plpgsql (no inlining). All affected policies recreated with fresh function-call references.
- next_action: none — fix verified on remote
- reasoning_checkpoint: Queried pg_policies on remote after 2026042701 was applied — policy qual bodies showed raw EXISTS subqueries with hm.household_id = hm.household_id (not is_household_member() calls), confirming the inlining hypothesis. After 2026042702 push, all policies now show is_household_member(household_id) as the qual.
- tdd_checkpoint:

## Evidence

- timestamp: 2026-04-27T00:00:00+07:00
  source: supabase/migrations/2026042501_phase1_foundation.sql
  content: >
    is_household_member is defined with LANGUAGE sql STABLE SECURITY DEFINER.
    LANGUAGE sql STABLE functions are eligible for inlining by PostgreSQL's
    query planner. When the policies referencing this function were created in
    the same migration, PostgreSQL inlined the function body into each policy's
    qual expression.

- timestamp: 2026-04-27T00:00:00+07:00
  source: pg_policies on remote (queried after 2026042701 was applied)
  content: >
    household_members_member_select qual:
      "(EXISTS ( SELECT 1 FROM household_members hm WHERE ((hm.household_id = hm.household_id) AND (hm.user_id = auth.uid()))))"
    The condition hm.household_id = hm.household_id is always true (both sides
    are the alias hm — the outer table reference was lost during inlining).
    For household_members this creates a policy that queries household_members,
    which fires the policy again, causing 42P17 infinite recursion.
    household_invites_member_read and expenses_household_select had the same
    hm.household_id = hm.household_id corruption (logically wrong but not recursive).

- timestamp: 2026-04-27T00:00:00+07:00
  source: supabase migration list --linked
  content: >
    All four migrations confirmed applied on remote:
    2026042501, 2026042601, 2026042602, 2026042701.
    Migration 2026042701 recreated the function as SECURITY DEFINER but did NOT
    drop and recreate the policies. Policies retained their stale inlined bodies.

- timestamp: 2026-04-27T00:00:00+07:00
  source: pg_proc on remote (after 2026042702 push)
  content: >
    proname=is_household_member, lanname=plpgsql, prosecdef=true.
    Function is now plpgsql (never inlined by PostgreSQL) and SECURITY DEFINER.

- timestamp: 2026-04-27T00:00:00+07:00
  source: pg_policies on remote (after 2026042702 push)
  content: >
    household_members_member_select qual: "is_household_member(household_id)"
    households_member_select qual: "is_household_member(id)"
    household_invites_member_read qual: "is_household_member(household_id)"
    expenses_household_select qual: "is_household_member(household_id)"
    All policies now store the function call reference, not an inlined subquery.

## Eliminated Hypotheses

- hypothesis: Bug is in the SvelteKit locals.supabase refactor
  eliminated_reason: The refactor only changed how the client is passed — same auth context. The 42P17 error is a PostgreSQL-level RLS recursion, not a JS/TS auth issue.

- hypothesis: The function existed but was SECURITY INVOKER
  eliminated_reason: The db push NOTICE confirmed the function did not exist at all on the remote, not just that it had the wrong security context.

- hypothesis: The query itself is malformed
  eliminated_reason: The query structure is correct. The error was in RLS policy evaluation.

- hypothesis: Recreating the function as SECURITY DEFINER (migration 2026042701) was sufficient
  eliminated_reason: pg_policies query showed policies still had inlined subquery bodies after 2026042701. PostgreSQL does not re-evaluate policy expressions when a referenced function is replaced — policies store the expression as it was at creation time.

## Specialist Review

Specialist: engineering:debug (PostgreSQL RLS pattern)
Result: LOOKS_GOOD — DROP + CREATE (not CREATE OR REPLACE) is the correct idiom to guarantee SECURITY DEFINER is applied cleanly. SET search_path = public is preserved to prevent search_path hijacking. The fix is minimal, targeted, and does not touch any other policies or functions.

## Resolution

- root_cause: PostgreSQL inlined the LANGUAGE sql STABLE is_household_member function body into all RLS policies when they were first created (migration 2026042501). The inlining lost the outer table reference, producing the always-true condition hm.household_id = hm.household_id. On household_members this is directly self-referential — the policy queries household_members, which fires the policy again, producing 42P17 infinite recursion. The previous fix (2026042701) recreated the function but not the policies, leaving the stale inlined bodies intact.
- fix: Migration 2026042702_fix_rls_policy_inlining.sql: (1) replaced is_household_member with LANGUAGE plpgsql (plpgsql functions are never inlined) while keeping SECURITY DEFINER and SET search_path = public; (2) dropped and recreated all six affected policies (households_member_select, household_members_member_select, household_invites_member_read, household_invites_member_insert, expenses_household_select, expenses_household_insert, expenses_creator_update) so they store fresh function-call references instead of the corrupted inlined subqueries.
- verification: pg_policies query after push confirms all policy quals now show is_household_member(household_id) / is_household_member(id). pg_proc confirms function is plpgsql + SECURITY DEFINER.
- files_changed:
    - supabase/migrations/2026042701_fix_is_household_member_security_definer.sql (prior attempt — superseded)
    - supabase/migrations/2026042702_fix_rls_policy_inlining.sql (actual fix)
