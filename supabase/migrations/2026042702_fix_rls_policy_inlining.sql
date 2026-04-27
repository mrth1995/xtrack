-- Fix: RLS policies had their is_household_member() calls inlined by PostgreSQL.
--
-- Root cause of 42P17 (infinite recursion in policy for household_members):
-- PostgreSQL inlines LANGUAGE sql STABLE functions into policy bodies at creation
-- time. When is_household_member was inlined into household_members_member_select,
-- the outer table reference was lost, producing:
--   hm.household_id = hm.household_id   (always true, and self-referential on household_members)
-- This caused infinite recursion: the policy on household_members queried
-- household_members, which triggered the same policy again.
--
-- The same inlining corrupted household_invites_member_read and
-- expenses_household_select in the same way (hm.household_id = hm.household_id).
--
-- Fix strategy:
--   1. Replace is_household_member with a LANGUAGE plpgsql version.
--      plpgsql functions are never inlined by PostgreSQL, so the function call
--      is preserved in policy bodies when policies are (re)created.
--   2. Drop and recreate all affected policies so they store a proper function
--      call reference instead of the stale inlined subquery.

-- ---------------------------------------------------------------------------
-- Step 1: Replace is_household_member with plpgsql to prevent inlining.
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.is_household_member(uuid, uuid);

CREATE FUNCTION public.is_household_member(
  p_household_id uuid,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.household_members hm
    WHERE hm.household_id = p_household_id
      AND hm.user_id = p_user_id
  );
END;
$$;


-- ---------------------------------------------------------------------------
-- Step 2: Drop and recreate all policies that call is_household_member.
--   This forces PostgreSQL to store the function call reference fresh,
--   replacing the stale inlined subquery bodies stored during phase1.
-- ---------------------------------------------------------------------------

-- households
DROP POLICY IF EXISTS households_member_select ON public.households;
CREATE POLICY households_member_select
  ON public.households
  FOR SELECT
  USING (public.is_household_member(public.households.id));

-- household_members (the one causing 42P17)
DROP POLICY IF EXISTS household_members_member_select ON public.household_members;
CREATE POLICY household_members_member_select
  ON public.household_members
  FOR SELECT
  USING (public.is_household_member(public.household_members.household_id));

-- household_invites
DROP POLICY IF EXISTS household_invites_member_read ON public.household_invites;
CREATE POLICY household_invites_member_read
  ON public.household_invites
  FOR SELECT
  USING (public.is_household_member(public.household_invites.household_id));

DROP POLICY IF EXISTS household_invites_member_insert ON public.household_invites;
CREATE POLICY household_invites_member_insert
  ON public.household_invites
  FOR INSERT
  WITH CHECK (
    public.is_household_member(public.household_invites.household_id)
    AND public.household_invites.created_by = auth.uid()
  );

-- expenses
DROP POLICY IF EXISTS expenses_household_select ON public.expenses;
CREATE POLICY expenses_household_select
  ON public.expenses
  FOR SELECT
  USING (public.is_household_member(public.expenses.household_id));

DROP POLICY IF EXISTS expenses_household_insert ON public.expenses;
CREATE POLICY expenses_household_insert
  ON public.expenses
  FOR INSERT
  WITH CHECK (
    public.expenses.created_by = auth.uid()
    AND public.is_household_member(public.expenses.household_id)
  );

DROP POLICY IF EXISTS expenses_creator_update ON public.expenses;
CREATE POLICY expenses_creator_update
  ON public.expenses
  FOR UPDATE
  USING (public.expenses.created_by = auth.uid())
  WITH CHECK (
    public.expenses.created_by = auth.uid()
    AND public.is_household_member(public.expenses.household_id)
  );
