-- Phase 1 Foundation: Schema, SQL Helpers, and RLS Policies
-- Creates: profiles, households, household_members, household_invites, expenses
-- All tables have RLS enabled from first creation.
-- Invite acceptance is atomic (single SQL function with row lock).
--
-- Requirements: HOUSE-01, HOUSE-02, HOUSE-03, HOUSE-04

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ---------------------------------------------------------------------------
-- Helper: generate a short, URL-safe invite code (8 uppercase alphanum chars)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS text
LANGUAGE sql
VOLATILE
AS $$
  SELECT upper(
    substring(
      replace(replace(replace(encode(gen_random_bytes(6), 'base64'), '+', ''), '/', ''), '=', ''),
      1, 8
    )
  );
$$;


-- ---------------------------------------------------------------------------
-- TABLE: profiles
-- One row per auth.users entry, provisioned on first confirmed session.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id            uuid        PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  display_name  text,
  email         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles: user can only read and update their own row
CREATE POLICY profiles_self_select
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY profiles_self_update
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY profiles_self_insert
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Trigger: auto-provision profile row on new auth user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ---------------------------------------------------------------------------
-- TABLE: households
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.households (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  created_by  uuid        NOT NULL REFERENCES public.profiles (id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;

-- Households: user can read households they belong to
CREATE POLICY households_member_select
  ON public.households
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.household_members hm
      WHERE hm.household_id = id
        AND hm.user_id = auth.uid()
    )
  );

-- Creator update (rename, etc.) — only the creator
CREATE POLICY households_creator_update
  ON public.households
  FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());


-- ---------------------------------------------------------------------------
-- TABLE: household_members
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.household_members (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id  uuid        NOT NULL REFERENCES public.households (id) ON DELETE CASCADE,
  user_id       uuid        NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  role          text        NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  joined_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (household_id, user_id)
);

ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;

-- Household members: user can read membership rows for their own household
CREATE POLICY household_members_member_select
  ON public.household_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.household_members hm
      WHERE hm.household_id = household_id
        AND hm.user_id = auth.uid()
    )
  );


-- ---------------------------------------------------------------------------
-- TABLE: household_invites
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.household_invites (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id  uuid        NOT NULL REFERENCES public.households (id) ON DELETE CASCADE,
  code          text        NOT NULL UNIQUE,
  created_by    uuid        NOT NULL REFERENCES public.profiles (id),
  -- Invite expires 24 hours after creation (enforced by check constraint)
  expires_at    timestamptz NOT NULL,
  used_at       timestamptz,
  used_by       uuid        REFERENCES public.profiles (id),
  revoked_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  -- expires_at must be within 24 hours of created_at (enforced in create function)
  CONSTRAINT invite_expiry_max_24h CHECK (
    expires_at <= created_at + INTERVAL '24 hours'
  )
);

ALTER TABLE public.household_invites ENABLE ROW LEVEL SECURITY;

-- Household invites: only members of the household can read invite data
CREATE POLICY household_invites_member_read
  ON public.household_invites
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.household_members hm
      WHERE hm.household_id = household_id
        AND hm.user_id = auth.uid()
    )
  );

-- Only household members can insert invites
CREATE POLICY household_invites_member_insert
  ON public.household_invites
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.household_members hm
      WHERE hm.household_id = household_invites.household_id
        AND hm.user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );


-- ---------------------------------------------------------------------------
-- TABLE: expenses
-- Phase 2 owns the write path; Phase 1 creates the table so membership scope
-- and RLS are in place before the UI is built (satisfies HOUSE-04).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.expenses (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id  uuid        NOT NULL REFERENCES public.households (id) ON DELETE CASCADE,
  created_by    uuid        NOT NULL REFERENCES public.profiles (id),
  amount        integer     NOT NULL CHECK (amount > 0),
  category      text        NOT NULL,
  note          text,
  spent_at      timestamptz NOT NULL,
  client_id     uuid        NOT NULL UNIQUE,
  is_deleted    boolean     NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Expenses: household members can read all rows in their household
CREATE POLICY expenses_household_select
  ON public.expenses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.household_members hm
      WHERE hm.household_id = household_id
        AND hm.user_id = auth.uid()
    )
  );

-- Expenses: inserts require matching household membership and correct created_by
CREATE POLICY expenses_household_insert
  ON public.expenses
  FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.household_members hm
      WHERE hm.household_id = expenses.household_id
        AND hm.user_id = auth.uid()
    )
  );

-- Expenses: only the creator can update their own row
CREATE POLICY expenses_creator_update
  ON public.expenses
  FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.household_members hm
      WHERE hm.household_id = expenses.household_id
        AND hm.user_id = auth.uid()
    )
  );


-- ---------------------------------------------------------------------------
-- HELPER FUNCTION: current_household_id()
-- Returns the household_id for the currently authenticated user (v1: one
-- household per user).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_household_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT household_id
  FROM public.household_members
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;


-- ---------------------------------------------------------------------------
-- HELPER FUNCTION: create_household_with_owner(p_name text)
-- Atomically creates a household and inserts the caller as the owner member.
-- Returns the new household row.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_household_with_owner(p_name text)
RETURNS public.households
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_household public.households;
BEGIN
  -- Reject if caller already belongs to a household (v1: one household per user)
  IF EXISTS (
    SELECT 1 FROM public.household_members WHERE user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'User already belongs to a household';
  END IF;

  INSERT INTO public.households (name, created_by)
  VALUES (p_name, auth.uid())
  RETURNING * INTO v_household;

  INSERT INTO public.household_members (household_id, user_id, role)
  VALUES (v_household.id, auth.uid(), 'owner');

  RETURN v_household;
END;
$$;


-- ---------------------------------------------------------------------------
-- HELPER FUNCTION: accept_household_invite(p_code text)
-- Atomically:
--   1. Locks the invite row to prevent race conditions
--   2. Rejects if code is invalid (not found)
--   3. Rejects if code is already used (used_at IS NOT NULL)
--   4. Rejects if code is expired (expires_at <= now())
--   5. Rejects if code is revoked
--   6. Rejects if caller already belongs to a household
--   7. Inserts membership row
--   8. Marks the invite as used
--   9. Returns household metadata
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.accept_household_invite(p_code text)
RETURNS public.households
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite  public.household_invites;
  v_household public.households;
BEGIN
  -- Lock the invite row to prevent concurrent acceptance
  SELECT *
  INTO v_invite
  FROM public.household_invites
  WHERE code = p_code
  FOR UPDATE;

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

  -- Reject if caller already belongs to a household
  IF EXISTS (
    SELECT 1 FROM public.household_members WHERE user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'User already belongs to a household'
      USING ERRCODE = 'P0005', HINT = 'already_member';
  END IF;

  -- Insert membership
  INSERT INTO public.household_members (household_id, user_id, role)
  VALUES (v_invite.household_id, auth.uid(), 'member');

  -- Mark invite as used
  UPDATE public.household_invites
  SET used_at = now(),
      used_by = auth.uid()
  WHERE id = v_invite.id;

  -- Return household metadata
  SELECT * INTO v_household
  FROM public.households
  WHERE id = v_invite.household_id;

  RETURN v_household;
END;
$$;


-- ---------------------------------------------------------------------------
-- HELPER FUNCTION: create_household_invite(p_household_id uuid)
-- Creates a new invite code for a household with a 24-hour TTL.
-- The caller must be a member of the household.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_household_invite(p_household_id uuid)
RETURNS public.household_invites
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite  public.household_invites;
  v_code    text;
BEGIN
  -- Verify caller is a member
  IF NOT EXISTS (
    SELECT 1 FROM public.household_members
    WHERE household_id = p_household_id
      AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not a member of this household'
      USING ERRCODE = 'P0010', HINT = 'not_member';
  END IF;

  -- Generate a unique code (retry up to 5 times on collision)
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
