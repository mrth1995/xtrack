-- Fix: ensure is_household_member runs as SECURITY DEFINER.
--
-- Root cause of 42P17 (infinite recursion in policy for household_members):
-- The household_members_member_select RLS policy calls is_household_member(),
-- which queries household_members. If the function runs as SECURITY INVOKER,
-- the RLS policy fires again inside the function, creating infinite recursion.
--
-- Using DROP + CREATE (not CREATE OR REPLACE) guarantees the SECURITY DEFINER
-- attribute is applied cleanly, regardless of what the live function had before.

DROP FUNCTION IF EXISTS public.is_household_member(uuid, uuid);

CREATE FUNCTION public.is_household_member(
  p_household_id uuid,
  p_user_id uuid DEFAULT auth.uid()
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
      AND hm.user_id = p_user_id
  );
$$;
