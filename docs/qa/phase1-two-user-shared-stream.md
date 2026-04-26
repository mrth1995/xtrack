# Phase 1 Two-User Shared Stream QA Path

**Requirement:** HOUSE-04 — Two users in the same household can both see shared expense stream.
**Updated:** 2026-04-26
**Status:** Schema applied (Plan 01-10), ready for manual UAT.

## Prerequisites

Before running this QA path, confirm:

1. `supabase db push` has been run and `.planning/phases/01-foundation/01-10-SCHEMA-PUSH.md` shows `status: APPLIED` or `status: CURRENT`.
2. The dev server or staging app is running (`npm run dev` or deployed URL).
3. Two separate browser sessions or profiles are available (e.g., Chrome profile A and Chrome profile B, or Chrome + Safari private).

## Step-by-Step Verification

### Step 1: User A — Sign up or log in

**User A** opens the app in Browser Profile A and signs up or logs in at `/auth`.

- If signing up: use a fresh email (e.g., `qa-user-a@example.com`).
- After auth, User A should be redirected to onboarding (no household yet).

### Step 2: User A — Create household "Phase 1 QA Household"

On the onboarding screen, User A creates a new household named exactly:

```
Phase 1 QA Household
```

After creation, User A should land in the signed-in shell (home screen showing household).

### Step 3: User A — Copy active invite code

User A opens `/settings/invite`:

1. An active invite code should be displayed.
2. User A copies the code.
3. User A refreshes the page.
4. The same code must still be displayed (not replaced with a new one).

If the code changes on refresh, the `get_or_create_active_household_invite` RPC is not working correctly. Verify the migration is applied.

### Step 4: User B — Sign up or log in (separate session)

**User B** opens the app in Browser Profile B (incognito or a different browser) and signs up or logs in at `/auth`.

- Use a different email from User A (e.g., `qa-user-b@example.com`).
- After auth, User B should be on the onboarding screen (no household yet).

### Step 5: User B — Join household via invite code

User B opens `/onboarding/join`:

1. User B enters the invite code from Step 3.
2. A confirmation step should appear showing the household name: `Phase 1 QA Household`.
3. User B confirms the join.
4. User B should land in the signed-in shell.

If User B sees "That code is invalid, expired, or already used", the `lookup_household_invite` RPC migration may not be applied. Run `supabase db push --yes` and retry.

### Step 6: Insert shared test expense via SQL

In the Supabase Dashboard SQL editor (or psql), replace `<household_id>` and `<user_a_id>` with the actual UUIDs from your project, then run:

```sql
insert into public.expenses (household_id, created_by, amount, category, note, spent_at, client_id)
values (
  '<household_id>',
  '<user_a_id>',
  45000,
  'Food',
  'Phase 1 shared stream QA',
  now(),
  gen_random_uuid()
);
```

To find the household UUID: look in the `households` table for the row named `Phase 1 QA Household`.
To find User A UUID: look in `auth.users` for User A's email.

### Step 7: Verify shared stream for both users

1. User A refreshes the home screen in Browser Profile A.
2. User B refreshes the home screen in Browser Profile B.

**Both** User A and User B must see the expense entry with:
- Category: `Food`
- Amount: `Rp 45k`
- Note: `Phase 1 shared stream QA`

If only one user sees it, check that:
- Both users are in the same household (check `household_members` table).
- The RLS `expenses_household_select` policy is using `public.is_household_member()`.

### Step 8: Outsider access control verification

Create or use a third authenticated user who is NOT a member of `Phase 1 QA Household`.

Using the Supabase JavaScript client authenticated as this outsider user (or via a custom test script), query:

```js
const { data } = await supabase.from('expenses').select('*').eq('household_id', '<household_id>');
console.log(data); // Must be []
```

The result must be `[]` (empty array). If any expenses are returned, the RLS policy for `expenses_household_select` is misconfigured.

## Expected Outcomes

| Step | Actor | Expected Result |
|------|-------|-----------------|
| 1 | User A | Lands on onboarding after auth |
| 2 | User A | Creates `Phase 1 QA Household`, enters signed-in shell |
| 3 | User A | Active invite code displayed and stable on refresh |
| 4 | User B | Lands on onboarding after auth in separate session |
| 5 | User B | Joins household by code, sees `Phase 1 QA Household` confirmation, enters signed-in shell |
| 6 | SQL | Expense `Food`, `Rp 45k`, `Phase 1 shared stream QA` inserted |
| 7 | User A + User B | Both see `Food`, `Rp 45k`, `Phase 1 shared stream QA` in stream |
| 8 | Outsider | Query returns `[]` — no cross-household data leakage |

## Failure Triage

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Valid code rejected at join | `lookup_household_invite` RPC not applied | Run `supabase db push --yes` |
| Invite code changes on refresh | `get_or_create_active_household_invite` RPC not applied | Run `supabase db push --yes` |
| User B can't see expense | RLS `expenses_household_select` failing | Check `is_household_member` helper in migration |
| Outsider sees expenses | RLS policy not enforcing household scope | Re-apply migration, check policy definitions |
| "Phase 1 QA Household" not shown at join | Household name lookup in `lookup_household_invite` failing | Check RPC definition returns `household_name` |

## Related Artifacts

- Migration applied: `supabase/migrations/2026042601_invite_lookup_rpc.sql`
- Migration applied: `supabase/migrations/2026042602_invite_reuse_rpc.sql`
- Schema helper: `public.is_household_member()` in `supabase/migrations/2026042501_phase1_foundation.sql`
- Schema push evidence: `.planning/phases/01-foundation/01-10-SCHEMA-PUSH.md`
- Automated RLS tests: `tests/db/phase1-rls.test.ts`
