-- Returns the newest active invite for a household, or creates one when none exists.
-- This keeps invite reuse inside the database so RLS-scoped client reads cannot
-- silently fall through and replace still-valid invite codes.
CREATE OR REPLACE FUNCTION public.get_or_create_active_household_invite(p_household_id uuid)
RETURNS public.household_invites
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite public.household_invites;
  v_code text;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.household_members
    WHERE household_id = p_household_id
      AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not a member of this household'
      USING ERRCODE = 'P0010', HINT = 'not_member';
  END IF;

  SELECT *
  INTO v_invite
  FROM public.household_invites
  WHERE household_id = p_household_id
    AND used_at IS NULL
    AND revoked_at IS NULL
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    RETURN v_invite;
  END IF;

  FOR i IN 1..5 LOOP
    v_code := public.generate_invite_code();
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.household_invites WHERE code = v_code
    );
  END LOOP;

  INSERT INTO public.household_invites (
    household_id,
    code,
    created_by,
    expires_at
  )
  VALUES (
    p_household_id,
    v_code,
    auth.uid(),
    now() + INTERVAL '24 hours'
  )
  RETURNING * INTO v_invite;

  RETURN v_invite;
END;
$$;
