---
phase: 01-foundation
reviewed: 2026-04-25T23:32:41Z
depth: standard
files_reviewed: 55
files_reviewed_list:
  - .env.example
  - .github/workflows/supabase-keepalive.yml
  - .gitignore
  - README.md
  - docs/ops/supabase-keepalive.md
  - package.json
  - scripts/supabase-keepalive.mjs
  - src/app.css
  - src/app.d.ts
  - src/app.html
  - src/hooks.server.ts
  - src/lib/auth/schemas.ts
  - src/lib/auth/session.ts
  - src/lib/components/InstallGuidanceBanner.svelte
  - src/lib/households/schemas.ts
  - src/lib/install/visibility.ts
  - src/lib/server/households/service.ts
  - src/lib/supabase/client.ts
  - src/lib/supabase/env.ts
  - src/lib/supabase/server.ts
  - src/lib/types/database.ts
  - src/routes/(app)/+layout.server.ts
  - src/routes/(app)/+page.server.ts
  - src/routes/(app)/+page.svelte
  - src/routes/(app)/household/+page.server.ts
  - src/routes/(app)/household/+page.svelte
  - src/routes/(app)/onboarding/+page.server.ts
  - src/routes/(app)/onboarding/+page.svelte
  - src/routes/(app)/onboarding/create/+page.server.ts
  - src/routes/(app)/onboarding/create/+page.svelte
  - src/routes/(app)/onboarding/join/+page.server.ts
  - src/routes/(app)/onboarding/join/+page.svelte
  - src/routes/(app)/settings/invite/+page.server.ts
  - src/routes/(app)/settings/invite/+page.svelte
  - src/routes/(auth)/auth/+page.server.ts
  - src/routes/(auth)/auth/+page.svelte
  - src/routes/+layout.svelte
  - src/routes/logout/+server.ts
  - supabase/config.toml
  - supabase/migrations/2026042501_phase1_foundation.sql
  - supabase/migrations/2026042602_invite_reuse_rpc.sql
  - supabase/seed.sql
  - svelte.config.js
  - tests/auth/auth-session.test.ts
  - tests/db/invite-rpcs.test.ts
  - tests/db/phase1-rls.test.ts
  - tests/households/onboarding.test.ts
  - tests/households/shared-shell.test.ts
  - tests/setup.ts
  - tests/smoke/AppShell.test.svelte
  - tests/smoke/app-shell.test.ts
  - tests/supabase/env.test.ts
  - tsconfig.json
  - vite.config.ts
  - vitest.config.ts
findings:
  critical: 1
  warning: 3
  info: 0
  total: 4
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-04-25T23:32:41Z
**Depth:** standard
**Files Reviewed:** 55
**Status:** issues_found

## Summary

Reviewed the listed SvelteKit, Supabase, workflow, documentation, config, and test files at standard depth. The main concern is in the initial RLS migration: several policies use self-referential subqueries and unqualified column names, which can either fail with policy recursion or bind to the wrong relation and break tenant isolation. I also found two app reliability gaps where database/RPC failures are silently collapsed into normal UI states, plus a keepalive script error path that can bypass its intended diagnostics.

## Critical Issues

### CR-01: RLS Policies Use Self-Referential, Unqualified Household Checks

**File:** `supabase/migrations/2026042501_phase1_foundation.sql:117`
**Issue:** The household-scoped policies query `public.household_members` from inside RLS policies and compare against unqualified outer columns (`id` or `household_id`) at lines 123, 145, 161, and 189. This is unsafe for two reasons: the `household_members` policy is self-referential and can trigger Postgres' "infinite recursion detected in policy" failure, and unqualified names inside subqueries can bind to the inner `hm` relation instead of the outer row. The result can be either valid users losing access to their household data or members being allowed to read rows from other households.
**Fix:**
```sql
CREATE OR REPLACE FUNCTION public.is_household_member(p_household_id uuid)
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

DROP POLICY IF EXISTS households_member_select ON public.households;
CREATE POLICY households_member_select
  ON public.households
  FOR SELECT
  USING (public.is_household_member(public.households.id));

DROP POLICY IF EXISTS household_members_member_select ON public.household_members;
CREATE POLICY household_members_member_select
  ON public.household_members
  FOR SELECT
  USING (public.is_household_member(public.household_members.household_id));

DROP POLICY IF EXISTS household_invites_member_read ON public.household_invites;
CREATE POLICY household_invites_member_read
  ON public.household_invites
  FOR SELECT
  USING (public.is_household_member(public.household_invites.household_id));

DROP POLICY IF EXISTS expenses_household_select ON public.expenses;
CREATE POLICY expenses_household_select
  ON public.expenses
  FOR SELECT
  USING (public.is_household_member(public.expenses.household_id));
```

## Warnings

### WR-01: Member Profile Joins Cannot Return Other Household Members' Profiles

**File:** `supabase/migrations/2026042501_phase1_foundation.sql:96`
**Issue:** `profiles_self_select` only allows a user to read their own profile. The app loaders at `src/routes/(app)/+page.server.ts:85` and `src/routes/(app)/household/+page.server.ts:71` join `household_members` to `profiles` to show each member's display name/email, but RLS will hide other members' profile rows. That makes the household member list incomplete or filled with fallback `"Member"` values for everyone except the current user.
**Fix:** Add a profile select policy that allows reading profiles for users who share the current user's household, preferably using a `SECURITY DEFINER` helper so the policy does not recursively depend on `household_members` RLS.

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

### WR-02: App Loaders Ignore Supabase Read Errors

**File:** `src/routes/(app)/+page.server.ts:60`
**Issue:** The signed-in shell loader destructures only `data` from the household, member, and expense queries and ignores `error` at lines 60, 77, and 95. If RLS is broken, migrations are missing, or Supabase returns a read error, the page renders as if the household has no data instead of failing loudly or redirecting. The same pattern exists in `src/routes/(app)/household/+page.server.ts:46` and `src/routes/(app)/household/+page.server.ts:63`.
**Fix:** Capture and handle Supabase errors before mapping data. For example:

```ts
import { error, redirect } from '@sveltejs/kit';

const { data: householdRaw, error: householdError } = await supabase
  .from('households')
  .select('id, name, created_by, created_at')
  .eq('id', householdId)
  .single();

if (householdError) {
  throw error(500, 'Could not load household data.');
}
if (!householdRaw) {
  throw redirect(303, '/onboarding');
}
```

### WR-03: Invalid Keepalive URL Bypasses Error Handling

**File:** `scripts/supabase-keepalive.mjs:36`
**Issue:** `new URL(url)` is evaluated before the `try` block. If the GitHub secret is malformed, Node throws `TypeError: Invalid URL` outside the script's handled failure path, skipping the actionable keepalive diagnostics at lines 73-81.
**Fix:** Parse the URL inside the existing `try` block, or validate it in a dedicated guarded block before logging.

```js
try {
  const parsedUrl = new URL(url);
  console.log(`[keepalive] Pinging Supabase at: ${parsedUrl.origin}`);

  const response = await fetch(parsedUrl, {
    method: "GET",
    headers: {
      "User-Agent": "xtrack-keepalive/1.0",
    },
    signal: AbortSignal.timeout(15_000),
  });

  // existing response handling...
} catch (error) {
  // existing diagnostics...
}
```

---

_Reviewed: 2026-04-25T23:32:41Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
