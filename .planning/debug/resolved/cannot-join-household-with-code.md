---
status: resolved
trigger: cannot join the household with code
created: 2026-04-26T05:55:00+07:00
updated: 2026-04-26T05:57:30+07:00
---

# Debug Session: cannot-join-household-with-code

## Symptoms

- expected_behavior: A signed-in user can enter a valid household invite code, confirm the join, and land in the signed-in app shell for that household.
- actual_behavior: The user cannot join the household with the code.
- error_messages: Not provided.
- timeline: Not provided.
- reproduction: Attempt to join a household using an invite code in the onboarding/join flow.

## Current Focus

- hypothesis: The join confirmation lookup was blocked by RLS because non-members cannot directly read `household_invites`.
- test: `npm test`, `npm run check`, `npm run build`
- expecting: Join-code lookup uses a narrow security-definer RPC, while direct invite table reads remain member-only.
- next_action: complete
- reasoning_checkpoint:
- tdd_checkpoint:

## Evidence

- timestamp: 2026-04-26T05:55:13+07:00
  observation: Targeted household onboarding tests initially passed, so existing tests did not cover the RLS/runtime shape of invite lookup.
- timestamp: 2026-04-26T05:55:20+07:00
  observation: `lookupInviteCode` queried `household_invites` directly with `.from('household_invites').select(...).eq('code', ...)`.
- timestamp: 2026-04-26T05:55:20+07:00
  observation: Migration policy `household_invites_member_read` only permits invite SELECT when the caller is already a member of that household.
- timestamp: 2026-04-26T05:55:20+07:00
  observation: The actual join action already used `accept_household_invite`, a `SECURITY DEFINER` RPC, so the failure was isolated to the pre-join confirmation lookup.
- timestamp: 2026-04-26T05:57:20+07:00
  observation: Added `lookup_household_invite` security-definer RPC and changed `lookupInviteCode` to call it with an uppercased code.
- timestamp: 2026-04-26T05:57:20+07:00
  observation: Updated service tests to assert the RPC path and array return shape used by Supabase for `RETURNS TABLE`.

## Eliminated

- Direct accept/join RPC failure: `acceptHouseholdInvite` was already using a security-definer function and existing tests for success/error hints passed.
- Redirect/session shell failure: the user could not reach the join step because the confirmation lookup failed before accept/redirect.

## Resolution

- root_cause: Non-member users were blocked by RLS during the invite-code confirmation step because `lookupInviteCode` directly selected from `household_invites`, whose read policy only allows existing household members.
- fix: Added `lookup_household_invite(p_code)` as a narrow `SECURITY DEFINER` RPC for validating an invite and returning only confirmation fields, then switched the TypeScript service and tests to use that RPC.
- verification: `npm test` passed 103 tests with 10 skipped; `npm run check` reported 0 errors and 0 warnings; `npm run build` completed successfully.
- files_changed: src/lib/server/households/service.ts, src/lib/types/database.ts, supabase/migrations/2026042601_invite_lookup_rpc.sql, tests/households/onboarding.test.ts
