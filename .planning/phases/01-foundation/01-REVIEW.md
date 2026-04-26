---
phase: 01-foundation
reviewed: 2026-04-26T00:00:00Z
depth: standard
files_reviewed: 7
files_reviewed_list:
  - supabase/migrations/2026042501_phase1_foundation.sql
  - tests/db/invite-rpcs.test.ts
  - tests/db/phase1-rls.test.ts
  - scripts/verify-phase1-supabase-env.mjs
  - docs/qa/phase1-two-user-shared-stream.md
  - tests/supabase/verify-phase1-supabase-env.test.ts
  - package.json
findings:
  critical: 1
  warning: 5
  info: 4
  total: 10
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-04-26T00:00:00Z
**Depth:** standard
**Files Reviewed:** 7
**Status:** issues_found

## Summary

Reviewed the Phase 1 foundation migration, invite RPC tests, RLS regression tests, the env-verification script, the two-user QA guide, the env-verification test suite, and package.json at standard depth.

The critical issue is an information-disclosure gap in `is_household_member`: because the function accepts an arbitrary `p_user_id` parameter, any authenticated caller can probe membership of any user in any household. Five warnings cover: a code-collision path in `create_household_invite` that surfaces as an opaque Postgres constraint error, missing `profiles` SELECT access for co-members, test cleanup that can be skipped on assertion failure, an invite-code construction pattern that is collision-prone under parallel runs, and weak validation of `SUPABASE_SERVICE_ROLE_KEY` in the env script. Four info items cover dead constants, a tautological test, an unordered `LIMIT 1`, and missing role enforcement in invite policies.

---

## Critical Issues

### CR-01: `is_household_member` Exposes Arbitrary User Membership to Any Authenticated Caller

**File:** `supabase/migrations/2026042501_phase1_foundation.sql:29`
**Issue:** `public.is_household_member(p_household_id, p_user_id)` accepts a caller-supplied `p_user_id` and is `SECURITY DEFINER`, so it bypasses RLS on `household_members`. Any authenticated user can call `SELECT public.is_household_member('<any_household_id>', '<any_user_id>')` and learn whether an arbitrary user belongs to an arbitrary household. This is an information-disclosure vulnerability: it lets an attacker enumerate household membership for users they have no relationship with.
**Fix:** Remove the `p_user_id` parameter and hard-code `auth.uid()` inside the function body. The only legitimate callers are RLS policies, which always check the current session user.

```sql
CREATE OR REPLACE FUNCTION public.is_household_member(
  p_household_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.household_members hm
    WHERE hm.household_id = p_household_id
      AND hm.user_id = auth.uid()
  );
$$;
```

Update all policy `USING` / `WITH CHECK` call sites to drop the second argument, e.g.:

```sql
USING (public.is_household_member(public.households.id))
```

---

## Warnings

### WR-01: `create_household_invite` — Loop Exit Does Not Guard Against Exhausted Unique-Code Retries

**File:** `supabase/migrations/2026042501_phase1_foundation.sql:357`
**Issue:** The loop runs at most 5 iterations searching for a non-colliding code. If all 5 collide, the loop exits and `v_code` still holds the last colliding value. The subsequent INSERT then fails with a generic `23505` unique-constraint error instead of a meaningful application error. In a long-running system with many active invites, the 8-char hex space (~4 billion values) makes collision unlikely, but the guard is still missing.
**Fix:** After the loop, check whether `v_code` is still colliding and raise a descriptive exception:

```sql
FOR i IN 1..5 LOOP
  v_code := public.generate_invite_code();
  EXIT WHEN NOT EXISTS (
    SELECT 1 FROM public.household_invites WHERE code = v_code
  );
END LOOP;

-- Guard: if the last generated code still collides, abort cleanly.
IF EXISTS (SELECT 1 FROM public.household_invites WHERE code = v_code) THEN
  RAISE EXCEPTION 'Could not generate a unique invite code after 5 attempts'
    USING ERRCODE = 'P0020', HINT = 'retry';
END IF;
```

### WR-02: `profiles_self_select` Blocks Co-Member Profile Lookups

**File:** `supabase/migrations/2026042501_phase1_foundation.sql:120`
**Issue:** The only `SELECT` policy on `profiles` is `USING (auth.uid() = id)`. Household-member queries that join `profiles` to resolve display names — as done in the app shell loaders — will return `null` for every co-member's row. Members of the same household cannot read each other's display name or email via the standard Supabase client. This breaks the member list UI and any feature that surfaces co-member identity.
**Fix:** Add a `SECURITY DEFINER` helper and a permissive co-member policy:

```sql
CREATE OR REPLACE FUNCTION public.shares_household_with(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.household_members me
    JOIN public.household_members peer
      ON peer.household_id = me.household_id
    WHERE me.user_id = auth.uid()
      AND peer.user_id = p_user_id
  );
$$;

CREATE POLICY profiles_household_member_select
  ON public.profiles
  FOR SELECT
  USING (id = auth.uid() OR public.shares_household_with(public.profiles.id));
```

### WR-03: Test Cleanup Is Not Performed When Assertions Fail

**File:** `tests/db/phase1-rls.test.ts:253`
**Issue:** Multiple integration tests create temporary auth users and clean them up at the end of the test body. If any `expect()` assertion throws before the cleanup block is reached, the temporary users are never deleted and accumulate in the local Supabase instance. The affected tests include "Valid invite code can be accepted by a new user" (line 235), "Expired invite rejects with expired hint" (line 279), and "Invite code can be accepted exactly once" (line 318). The cross-household denial tests have the same pattern (lines 149, 178, 205).
**Fix:** Use `try/finally` to guarantee cleanup, or extract user creation/deletion into `beforeEach`/`afterEach` hooks:

```ts
it.skipIf(SKIP_INTEGRATION)('Valid invite code can be accepted by a new user', async () => {
  const sc = serviceClient();
  const { data: userData } = await sc.auth.admin.createUser({ ... });
  const newUserId = userData!.user!.id;

  try {
    // ... test body with all expect() calls ...
  } finally {
    await sc.auth.admin.deleteUser(newUserId);
  }
});
```

### WR-04: Invite Code Construction Is Collision-Prone Under Parallel or Rapid Test Runs

**File:** `tests/db/phase1-rls.test.ts:250`
**Issue:** Fresh invite codes are constructed by slicing a timestamp-prefixed string to 8 characters, e.g. `\`FRESH${timestamp}\`.slice(0, 8)`. `Date.now()` returns 13 decimal digits. Slicing the combined string at 8 characters always yields the first 8 characters of the prefix literal plus at most a few timestamp digits. For example: `"FRESH" + "1745..." = "FRESH174"` — a fixed 8-char string for any test run in a short time window. The same applies to `EXP${timestamp}`, `SGL${timestamp}`, and `LKP${timestamp}`. Two test runs within the same second (or parallel CI workers) will try to insert the same code and hit the UNIQUE constraint.
**Fix:** Use `gen_random_uuid()` or a random suffix via the service client, or take the timestamp suffix rather than the prefix:

```ts
// Take last 8 chars of timestamp to maximize entropy:
const freshCode = `F${timestamp}`.slice(-8).toUpperCase();

// Or, better, use service role to call generate_invite_code():
const { data: codeData } = await sc.rpc('generate_invite_code');
const freshCode = codeData as string;
```

### WR-05: `SUPABASE_SERVICE_ROLE_KEY` Validation Accepts Placeholder Values

**File:** `scripts/verify-phase1-supabase-env.mjs:69`
**Issue:** `PUBLIC_SUPABASE_ANON_KEY` is validated for emptiness, known placeholder strings (`placeholder`, `your-anon-key`, `replace-me`), and minimum length. `SUPABASE_SERVICE_ROLE_KEY` is only validated for emptiness. A developer who copies a `.env.example` with a placeholder service key like `"replace-me"` or `"your-service-role-key"` will see `Supabase Phase 1 env looks ready.` and exit 0, defeating the purpose of the check.
**Fix:** Apply the same placeholder and minimum-length checks to the service role key:

```js
const PLACEHOLDER_SERVICE_KEYS = new Set(['placeholder', 'your-service-role-key', 'replace-me']);

if (PLACEHOLDER_SERVICE_KEYS.has(rawServiceKey.toLowerCase())) {
  fail('SUPABASE_SERVICE_ROLE_KEY contains a placeholder value. Replace it with your real service role key.');
}

if (rawServiceKey.length < MIN_KEY_LENGTH) {
  fail(`SUPABASE_SERVICE_ROLE_KEY is too short (${rawServiceKey.length} chars).`);
}
```

---

## Info

### IN-01: Dead Constants — `BOB_ID`, `ACTIVE_INVITE_CODE`, `EXPIRED_INVITE_CODE` Never Used

**File:** `tests/db/phase1-rls.test.ts:33`
**Issue:** `BOB_ID` (line 33), `ACTIVE_INVITE_CODE` (line 35), and `EXPIRED_INVITE_CODE` (line 36) are declared as module-level constants but are never referenced in any test body. They appear to be scaffolding that was not wired up. If they were intended to drive seed-code lookups, the tests using dynamically inserted codes miss static seed coverage.
**Fix:** Either remove the unused constants, or wire them into tests that verify the seeded invite codes directly (e.g., assert that `EXPIRED_INVITE_CODE = 'EXPCODE'` is rejected by `accept_household_invite`).

### IN-02: Tautological Test — Function Name Compared to Itself

**File:** `tests/db/phase1-rls.test.ts:473`
**Issue:** The test `'accept_household_invite is the canonical function name'` (lines 473–477) assigns the string `'accept_household_invite'` to `fnName` and then asserts `expect(fnName).toBe('accept_household_invite')`. This assertion is structurally always true and provides zero drift detection. If the function is renamed in the migration the test still passes.
**Fix:** Remove the test or replace it with a static assertion that reads the migration file and confirms the function name appears:

```ts
it('accept_household_invite is defined in the foundation migration', () => {
  const migration = readFileSync(
    resolve('supabase/migrations/2026042501_phase1_foundation.sql'), 'utf8'
  );
  expect(migration).toContain('CREATE OR REPLACE FUNCTION public.accept_household_invite');
});
```

### IN-03: `current_household_id` Uses `LIMIT 1` Without `ORDER BY`

**File:** `supabase/migrations/2026042501_phase1_foundation.sql:234`
**Issue:** `current_household_id()` selects `household_id FROM household_members WHERE user_id = auth.uid() LIMIT 1` without an `ORDER BY`. The comment acknowledges v1 allows only one household per user, but the UNIQUE constraint on `(household_id, user_id)` does not prevent a user from appearing in multiple households if inserted directly. Under that condition the returned household ID is non-deterministic across Postgres plan changes.
**Fix:** Add `ORDER BY joined_at` (or `id`) to guarantee a stable, reproducible result if the invariant is ever violated:

```sql
SELECT household_id
FROM public.household_members
WHERE user_id = auth.uid()
ORDER BY joined_at
LIMIT 1;
```

### IN-04: Invite INSERT Policy Allows Any Member to Create Invites (Role Not Enforced)

**File:** `supabase/migrations/2026042501_phase1_foundation.sql:174`
**Issue:** The `household_invites_member_insert` policy allows any member (regardless of `role`) to create new invite codes. The `household_members` table has a `role` column with `'owner'` and `'member'` values. If invite creation should be owner-only (common in team-management products), the policy should filter on `role = 'owner'`. This may be an intentional permissive design, but it should be an explicit decision rather than an oversight.
**Fix (if owner-only intent):**

```sql
DROP POLICY IF EXISTS household_invites_member_insert ON public.household_invites;
CREATE POLICY household_invites_member_insert
  ON public.household_invites
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.household_members
      WHERE household_id = public.household_invites.household_id
        AND user_id = auth.uid()
        AND role = 'owner'
    )
    AND public.household_invites.created_by = auth.uid()
  );
```

If any member may invite, document this as a deliberate choice.

---

_Reviewed: 2026-04-26T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
