-- Phase 1 Foundation: Schema, SQL Helpers, and RLS Policies
-- Creates: profiles, households, household_members, household_invites, expenses
-- All tables have RLS enabled from first creation.
-- Invite acceptance is atomic (single SQL function with row lock).
--
-- Requirements: HOUSE-01, HOUSE-02, HOUSE-03, HOUSE-04
--
-- Structure: tables first, then RLS enable, then policies, then functions/triggers.
-- This order avoids forward-reference errors between policies and tables.

-- ---------------------------------------------------------------------------
-- Helper: generate a short invite code (8 uppercase hex chars)
-- Uses gen_random_uuid() — no pgcrypto extension required.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS text
LANGUAGE sql
VOLATILE
AS $$
  SELECT upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8));
$$;


-- ---------------------------------------------------------------------------
-- TABLES (all created before any policies are attached)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profiles (
  id            uuid        PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  display_name  text,
  email         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.households (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  created_by  uuid        NOT NULL REFERENCES public.profiles (id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.household_members (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id  uuid        NOT NULL REFERENCES public.households (id) ON DELETE CASCADE,
  user_id       uuid        NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  role          text        NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  joined_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (household_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.household_invites (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id  uuid        NOT NULL REFERENCES public.households (id) ON DELETE CASCADE,
  code          text        NOT NULL UNIQUE,
  created_by    uuid        NOT NULL REFERENCES public.profiles (id),
  expires_at    timestamptz NOT NULL,
  used_at       timestamptz,
  used_by       uuid        REFERENCES public.profiles (id),
  revoked_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT invite_expiry_max_24h CHECK (
    expires_at <= created_at + INTERVAL '24 hours'
  )
);

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


-- ---------------------------------------------------------------------------
-- ENABLE RLS (all tables)
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.households        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses          ENABLE ROW LEVEL SECURITY;


-- ---------------------------------------------------------------------------
-- POLICIES: profiles
-- ---------------------------------------------------------------------------

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


-- ---------------------------------------------------------------------------
-- POLICIES: households
-- ---------------------------------------------------------------------------

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

CREATE POLICY households_creator_update
  ON public.households
  FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());


-- ---------------------------------------------------------------------------
-- POLICIES: household_members
-- ---------------------------------------------------------------------------

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
-- POLICIES: household_invites
-- ---------------------------------------------------------------------------

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
-- POLICIES: expenses
-- ---------------------------------------------------------------------------

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
-- FUNCTIONS AND TRIGGERS
-- ---------------------------------------------------------------------------

-- Auto-provision profile row on new auth user
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


-- Returns the household_id for the currently authenticated user (v1: one per user).
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


-- Atomically creates a household and inserts the caller as owner.
CREATE OR REPLACE FUNCTION public.create_household_with_owner(p_name text)
RETURNS public.households
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_household public.households;
BEGIN
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


-- Atomically validates, claims, and invalidates an invite code.
CREATE OR REPLACE FUNCTION public.accept_household_invite(p_code text)
RETURNS public.households
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite    public.household_invites;
  v_household public.households;
BEGIN
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

  IF EXISTS (
    SELECT 1 FROM public.household_members WHERE user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'User already belongs to a household'
      USING ERRCODE = 'P0005', HINT = 'already_member';
  END IF;

  INSERT INTO public.household_members (household_id, user_id, role)
  VALUES (v_invite.household_id, auth.uid(), 'member');

  UPDATE public.household_invites
  SET used_at = now(),
      used_by = auth.uid()
  WHERE id = v_invite.id;

  SELECT * INTO v_household
  FROM public.households
  WHERE id = v_invite.household_id;

  RETURN v_household;
END;
$$;


-- Creates a new 24-hour invite code for a household the caller belongs to.
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
  IF NOT EXISTS (
    SELECT 1 FROM public.household_members
    WHERE household_id = p_household_id
      AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not a member of this household'
      USING ERRCODE = 'P0010', HINT = 'not_member';
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
