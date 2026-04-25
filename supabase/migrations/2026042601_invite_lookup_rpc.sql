-- Allows a signed-in non-member to validate an invite code for the confirmation
-- screen without granting direct SELECT access to household_invites.
CREATE OR REPLACE FUNCTION public.lookup_household_invite(p_code text)
RETURNS TABLE (
  household_id uuid,
  household_name text,
  household_created_by uuid,
  household_created_at timestamptz,
  code text,
  expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite public.household_invites;
  v_household public.households;
BEGIN
  SELECT *
  INTO v_invite
  FROM public.household_invites
  WHERE household_invites.code = upper(trim(p_code));

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid invite code'
      USING ERRCODE = 'P0001', HINT = 'invalid_code';
  END IF;

  IF v_invite.used_at IS NOT NULL THEN
    RAISE EXCEPTION 'Invite code has already been used'
      USING ERRCODE = 'P0002', HINT = 'already_used';
  END IF;

  IF v_invite.expires_at <= now() THEN
    RAISE EXCEPTION 'Invite code has expired'
      USING ERRCODE = 'P0003', HINT = 'expired';
  END IF;

  IF v_invite.revoked_at IS NOT NULL THEN
    RAISE EXCEPTION 'Invite code has been revoked'
      USING ERRCODE = 'P0004', HINT = 'revoked';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.household_members WHERE user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'User already belongs to a household'
      USING ERRCODE = 'P0005', HINT = 'already_member';
  END IF;

  SELECT *
  INTO v_household
  FROM public.households
  WHERE id = v_invite.household_id;

  household_id := v_household.id;
  household_name := v_household.name;
  household_created_by := v_household.created_by;
  household_created_at := v_household.created_at;
  code := v_invite.code;
  expires_at := v_invite.expires_at;
  RETURN NEXT;
END;
$$;
