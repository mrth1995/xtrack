-- Phase 1 Verification Seed Data
-- Provides minimal fixtures for local/dev verification of Phase 1 household flows.
-- Do NOT use in production. These UUIDs are stable for test reproducibility.

-- ---------------------------------------------------------------------------
-- Users (match auth.users entries; profiles are auto-provisioned by trigger)
-- These are inserted into auth.users to bootstrap test users in local Supabase.
-- ---------------------------------------------------------------------------

-- User A: household owner (alice@example.com)
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  aud,
  role
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'alice@example.com',
  crypt('password123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  false,
  'authenticated',
  'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- User B: household joiner (bob@example.com)
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  aud,
  role
) VALUES (
  '00000000-0000-0000-0000-000000000002',
  'bob@example.com',
  crypt('password123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  false,
  'authenticated',
  'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Profiles (also auto-provisioned by trigger, but seed explicitly for safety)
-- ---------------------------------------------------------------------------
INSERT INTO public.profiles (id, email, display_name, created_at, updated_at)
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'alice@example.com',
    'Alice',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'bob@example.com',
    'Bob',
    now(),
    now()
  )
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Household owned by Alice
-- ---------------------------------------------------------------------------
INSERT INTO public.households (id, name, created_by, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000010',
  'Alice & Bob Household',
  '00000000-0000-0000-0000-000000000001',
  now()
) ON CONFLICT (id) DO NOTHING;

-- Alice is the owner
INSERT INTO public.household_members (id, household_id, user_id, role, joined_at)
VALUES (
  '00000000-0000-0000-0000-000000000020',
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000001',
  'owner',
  now()
) ON CONFLICT (id) DO NOTHING;

-- Bob is a member (joined via invite)
INSERT INTO public.household_members (id, household_id, user_id, role, joined_at)
VALUES (
  '00000000-0000-0000-0000-000000000021',
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000002',
  'member',
  now()
) ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Household invites
-- One active invite (expires in the future), one expired invite
-- ---------------------------------------------------------------------------

-- Active invite: code "TESTCODE" valid for 24h (expires far in the future)
INSERT INTO public.household_invites (
  id,
  household_id,
  code,
  created_by,
  expires_at,
  used_at,
  used_by,
  created_at
) VALUES (
  '00000000-0000-0000-0000-000000000030',
  '00000000-0000-0000-0000-000000000010',
  'TESTCODE',
  '00000000-0000-0000-0000-000000000001',
  now() + INTERVAL '23 hours',
  NULL,
  NULL,
  now()
) ON CONFLICT (id) DO NOTHING;

-- Expired invite: code "EXPCODE" — expires in the past
INSERT INTO public.household_invites (
  id,
  household_id,
  code,
  created_by,
  expires_at,
  used_at,
  used_by,
  created_at
) VALUES (
  '00000000-0000-0000-0000-000000000031',
  '00000000-0000-0000-0000-000000000010',
  'EXPCODE',
  '00000000-0000-0000-0000-000000000001',
  now() - INTERVAL '1 hour',
  NULL,
  NULL,
  now() - INTERVAL '25 hours'
) ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Sample expense tied to the shared household
-- client_id is set at creation time for idempotent retry safety
-- ---------------------------------------------------------------------------
INSERT INTO public.expenses (
  id,
  household_id,
  created_by,
  amount,
  category,
  note,
  spent_at,
  client_id,
  is_deleted,
  created_at
) VALUES (
  '00000000-0000-0000-0000-000000000040',
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000001',
  54000,
  'food',
  'Lunch at warung',
  now() - INTERVAL '2 hours',
  '00000000-0000-0000-0000-000000000050',
  false,
  now()
) ON CONFLICT (id) DO NOTHING;
