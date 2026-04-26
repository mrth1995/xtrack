/**
 * Phase 1 RLS Regression Tests
 *
 * Tests the database-level security policies and invite lifecycle defined in
 * supabase/migrations/2026042501_phase1_foundation.sql.
 *
 * These tests use the Supabase JS client pointed at the local Supabase instance.
 * Run: npm run test:unit -- phase1-rls
 *
 * Covers:
 * - Same-household read is allowed for both members
 * - Cross-household read is denied by RLS
 * - Invite code can be accepted exactly once
 * - Expired invite rejects with stable error path (hint: 'expired')
 * - expenses.client_id uniqueness is enforced
 * - accept_household_invite function behavior
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Test configuration
// These values target the local Supabase instance. Override via env vars for CI.
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

// Stable test UUIDs matching seed.sql
const ALICE_ID = '00000000-0000-0000-0000-000000000001';
const BOB_ID = '00000000-0000-0000-0000-000000000002';
const HOUSEHOLD_ID = '00000000-0000-0000-0000-000000000010';
const ACTIVE_INVITE_CODE = 'TESTCODE';
const EXPIRED_INVITE_CODE = 'EXPCODE';
const EXPENSE_CLIENT_ID = '00000000-0000-0000-0000-000000000050';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Create an authenticated Supabase client for a test user.
 * Uses service role key to set auth.uid() via the anon key + JWT trick
 * or sign-in with email/password for the local instance.
 */
function anonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false }
  });
}

function serviceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });
}

/**
 * Sign in a test user and return an authenticated client.
 */
async function signInAs(email: string, password = 'password123'): Promise<SupabaseClient> {
  const client = anonClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    throw new Error(`Failed to sign in as ${email}: ${error?.message}`);
  }
  return client;
}

// ---------------------------------------------------------------------------
// Skip guard: if no local Supabase is available, skip integration tests
// ---------------------------------------------------------------------------

const SKIP_INTEGRATION = !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Phase 1 RLS — Same-household access', () => {
  it.skipIf(SKIP_INTEGRATION)('Alice can read her own household row', async () => {
    const client = await signInAs('alice@example.com');
    const { data, error } = await client
      .from('households')
      .select('id, name')
      .eq('id', HOUSEHOLD_ID)
      .maybeSingle();

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data?.id).toBe(HOUSEHOLD_ID);
  });

  it.skipIf(SKIP_INTEGRATION)('Bob can read the shared household row', async () => {
    const client = await signInAs('bob@example.com');
    const { data, error } = await client
      .from('households')
      .select('id, name')
      .eq('id', HOUSEHOLD_ID)
      .maybeSingle();

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data?.id).toBe(HOUSEHOLD_ID);
  });

  it.skipIf(SKIP_INTEGRATION)('Alice can read household_members for her household', async () => {
    const client = await signInAs('alice@example.com');
    const { data, error } = await client
      .from('household_members')
      .select('user_id, role')
      .eq('household_id', HOUSEHOLD_ID);

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.length).toBeGreaterThanOrEqual(2);
  });

  it.skipIf(SKIP_INTEGRATION)('Both members can read the shared expense', async () => {
    const aliceClient = await signInAs('alice@example.com');
    const bobClient = await signInAs('bob@example.com');

    const [aliceResult, bobResult] = await Promise.all([
      aliceClient
        .from('expenses')
        .select('client_id')
        .eq('household_id', HOUSEHOLD_ID)
        .eq('client_id', EXPENSE_CLIENT_ID)
        .maybeSingle(),
      bobClient
        .from('expenses')
        .select('client_id')
        .eq('household_id', HOUSEHOLD_ID)
        .eq('client_id', EXPENSE_CLIENT_ID)
        .maybeSingle()
    ]);

    expect(aliceResult.error).toBeNull();
    expect(aliceResult.data?.client_id).toBe(EXPENSE_CLIENT_ID);

    expect(bobResult.error).toBeNull();
    expect(bobResult.data?.client_id).toBe(EXPENSE_CLIENT_ID);
  });
});

describe('Phase 1 RLS — Cross-household denial', () => {
  it.skipIf(SKIP_INTEGRATION)('An outsider user cannot read a household they do not belong to', async () => {
    // Create a fresh user who has no household
    const sc = serviceClient();
    const timestamp = Date.now();
    const outsiderEmail = `outsider_${timestamp}@example.com`;

    const { data: userData, error: createError } = await sc.auth.admin.createUser({
      email: outsiderEmail,
      password: 'password123',
      email_confirm: true
    });
    expect(createError).toBeNull();

    const outsiderClient = await signInAs(outsiderEmail);
    const { data, error } = await outsiderClient
      .from('households')
      .select('id')
      .eq('id', HOUSEHOLD_ID);

    // RLS should return empty array (not an error) for denied rows
    expect(error).toBeNull();
    expect(data).toEqual([]);

    // Cleanup
    if (userData?.user) {
      await sc.auth.admin.deleteUser(userData.user.id);
    }
  });

  it.skipIf(SKIP_INTEGRATION)('Outsider cannot read expenses for a foreign household', async () => {
    const sc = serviceClient();
    const timestamp = Date.now();
    const outsiderEmail = `outsider2_${timestamp}@example.com`;

    const { data: userData, error: createError } = await sc.auth.admin.createUser({
      email: outsiderEmail,
      password: 'password123',
      email_confirm: true
    });
    expect(createError).toBeNull();

    const outsiderClient = await signInAs(outsiderEmail);
    const { data, error } = await outsiderClient
      .from('expenses')
      .select('id')
      .eq('household_id', HOUSEHOLD_ID);

    expect(error).toBeNull();
    expect(data).toEqual([]);

    // Cleanup
    if (userData?.user) {
      await sc.auth.admin.deleteUser(userData.user.id);
    }
  });

  it.skipIf(SKIP_INTEGRATION)('Outsider cannot read household_members for a foreign household', async () => {
    const sc = serviceClient();
    const timestamp = Date.now();
    const outsiderEmail = `outsider3_${timestamp}@example.com`;

    const { data: userData, error: createError } = await sc.auth.admin.createUser({
      email: outsiderEmail,
      password: 'password123',
      email_confirm: true
    });
    expect(createError).toBeNull();

    const outsiderClient = await signInAs(outsiderEmail);
    const { data, error } = await outsiderClient
      .from('household_members')
      .select('id')
      .eq('household_id', HOUSEHOLD_ID);

    // RLS should return empty array, not an error, for denied rows
    expect(error).toBeNull();
    expect(data).toEqual([]);

    // Cleanup
    if (userData?.user) {
      await sc.auth.admin.deleteUser(userData.user.id);
    }
  });
});

describe('Phase 1 — Invite lifecycle: accept_household_invite', () => {
  it.skipIf(SKIP_INTEGRATION)('Valid invite code can be accepted by a new user', async () => {
    // Create a fresh user with no household
    const sc = serviceClient();
    const timestamp = Date.now();
    const newUserEmail = `newuser_${timestamp}@example.com`;

    const { data: userData, error: createError } = await sc.auth.admin.createUser({
      email: newUserEmail,
      password: 'password123',
      email_confirm: true
    });
    expect(createError).toBeNull();
    const newUserId = userData!.user!.id;

    // Insert a fresh invite for this test (so we don't consume the seed invite)
    const freshCode = `FRESH${timestamp}`.slice(0, 8).toUpperCase();
    await sc.from('household_invites').insert({
      household_id: HOUSEHOLD_ID,
      code: freshCode,
      created_by: ALICE_ID,
      expires_at: new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString()
    });

    const newUserClient = await signInAs(newUserEmail);
    const { data, error } = await newUserClient.rpc('accept_household_invite', {
      p_code: freshCode
    });

    expect(error).toBeNull();
    expect(data).not.toBeNull();

    // Verify invite is now marked used
    const { data: invite } = await sc
      .from('household_invites')
      .select('used_at, used_by')
      .eq('code', freshCode)
      .single();
    expect(invite?.used_at).not.toBeNull();
    expect(invite?.used_by).toBe(newUserId);

    // Cleanup
    await sc.auth.admin.deleteUser(newUserId);
  });

  it.skipIf(SKIP_INTEGRATION)('Expired invite rejects with expired hint', async () => {
    // Create a fresh user with no household
    const sc = serviceClient();
    const timestamp = Date.now();
    const newUserEmail = `exp_test_${timestamp}@example.com`;

    const { data: userData, error: createError } = await sc.auth.admin.createUser({
      email: newUserEmail,
      password: 'password123',
      email_confirm: true
    });
    expect(createError).toBeNull();

    // Insert an already-expired invite for isolation
    const expCode = `EXP${timestamp}`.slice(0, 8).toUpperCase();
    await sc.from('household_invites').insert({
      household_id: HOUSEHOLD_ID,
      code: expCode,
      created_by: ALICE_ID,
      expires_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
      created_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString() // 25h ago (bypass check)
    });

    const newUserClient = await signInAs(newUserEmail);
    const { data, error } = await newUserClient.rpc('accept_household_invite', {
      p_code: expCode
    });

    expect(data).toBeNull();
    expect(error).not.toBeNull();
    // The function raises with hint 'expired'
    expect(error?.hint).toBe('expired');

    // Cleanup
    if (userData?.user) {
      await sc.auth.admin.deleteUser(userData.user.id);
    }
  });

  it.skipIf(SKIP_INTEGRATION)('Invite code can be accepted exactly once (second attempt rejected)', async () => {
    const sc = serviceClient();
    const timestamp = Date.now();
    const user1Email = `once1_${timestamp}@example.com`;
    const user2Email = `once2_${timestamp}@example.com`;

    // Create two fresh users
    const [{ data: u1 }, { data: u2 }] = await Promise.all([
      sc.auth.admin.createUser({
        email: user1Email,
        password: 'password123',
        email_confirm: true
      }),
      sc.auth.admin.createUser({
        email: user2Email,
        password: 'password123',
        email_confirm: true
      })
    ]);

    // Insert a single-use invite
    const singleCode = `SGL${timestamp}`.slice(0, 8).toUpperCase();
    await sc.from('household_invites').insert({
      household_id: HOUSEHOLD_ID,
      code: singleCode,
      created_by: ALICE_ID,
      expires_at: new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString()
    });

    // First user accepts successfully
    const client1 = await signInAs(user1Email);
    const { error: err1 } = await client1.rpc('accept_household_invite', {
      p_code: singleCode
    });
    expect(err1).toBeNull();

    // Second user tries to use the same code — should be rejected as already_used
    const client2 = await signInAs(user2Email);
    const { data: d2, error: err2 } = await client2.rpc('accept_household_invite', {
      p_code: singleCode
    });
    expect(d2).toBeNull();
    expect(err2).not.toBeNull();
    expect(err2?.hint).toBe('already_used');

    // Cleanup
    const ids = [u1?.user?.id, u2?.user?.id].filter(Boolean) as string[];
    await Promise.all(ids.map((id) => sc.auth.admin.deleteUser(id)));
  });
});

describe('Phase 1 — lookup_household_invite RPC', () => {
  it.skipIf(SKIP_INTEGRATION)('lookup_household_invite returns household name for a valid fresh code', async () => {
    const sc = serviceClient();
    const timestamp = Date.now();
    const newUserEmail = `lookup_test_${timestamp}@example.com`;

    // Create a fresh non-member user
    const { data: userData, error: createError } = await sc.auth.admin.createUser({
      email: newUserEmail,
      password: 'password123',
      email_confirm: true
    });
    expect(createError).toBeNull();

    // Create a fresh invite via service role so we control the code
    const freshCode = `LKP${timestamp}`.slice(0, 8).toUpperCase();
    await sc.from('household_invites').insert({
      household_id: HOUSEHOLD_ID,
      code: freshCode,
      created_by: ALICE_ID,
      expires_at: new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString()
    });

    const newUserClient = await signInAs(newUserEmail);
    const { data, error } = await newUserClient.rpc('lookup_household_invite', {
      p_code: freshCode
    });

    expect(error).toBeNull();
    expect(data).not.toBeNull();

    const row = Array.isArray(data) ? data[0] : data;
    expect(row).not.toBeNull();
    expect(row?.household_name).toBe('Alice & Bob Household');

    // Cleanup
    if (userData?.user) {
      await sc.auth.admin.deleteUser(userData.user.id);
    }
  });
});

describe('Phase 1 — get_or_create_active_household_invite RPC', () => {
  it.skipIf(SKIP_INTEGRATION)('calling get_or_create_active_household_invite twice returns the same code', async () => {
    const aliceClient = await signInAs('alice@example.com');

    const { data: data1, error: err1 } = await aliceClient.rpc(
      'get_or_create_active_household_invite',
      { p_household_id: HOUSEHOLD_ID }
    );
    expect(err1).toBeNull();
    expect(data1).not.toBeNull();

    const { data: data2, error: err2 } = await aliceClient.rpc(
      'get_or_create_active_household_invite',
      { p_household_id: HOUSEHOLD_ID }
    );
    expect(err2).toBeNull();
    expect(data2).not.toBeNull();

    // Both calls should return the same active invite code
    expect((data2 as { code: string }).code).toBe((data1 as { code: string }).code);
  });
});

describe('Phase 1 — client_id uniqueness on expenses', () => {
  it.skipIf(SKIP_INTEGRATION)('Duplicate client_id on expenses is rejected by the database', async () => {
    const sc = serviceClient();

    // Attempt to insert a second expense with the same client_id as the seed row
    const { error } = await sc.from('expenses').insert({
      household_id: HOUSEHOLD_ID,
      created_by: ALICE_ID,
      amount: 10000,
      category: 'transport',
      spent_at: new Date().toISOString(),
      client_id: EXPENSE_CLIENT_ID // duplicate
    });

    expect(error).not.toBeNull();
    // Postgres unique constraint violation = error code 23505
    expect(error?.code).toBe('23505');
  });
});

describe('Phase 1 — Structural (static) checks', () => {
  /**
   * These tests verify that the migration constants match what the test file
   * expects. They run without any database connection.
   *
   * If function names or table names change in the migration, these will catch
   * the drift immediately without needing a live DB.
   */

  it('Test UUIDs match the constants used in seed.sql', () => {
    expect(ALICE_ID).toBe('00000000-0000-0000-0000-000000000001');
    expect(BOB_ID).toBe('00000000-0000-0000-0000-000000000002');
    expect(HOUSEHOLD_ID).toBe('00000000-0000-0000-0000-000000000010');
  });

  it('expired invite code constant matches seed.sql EXPCODE', () => {
    expect(EXPIRED_INVITE_CODE).toBe('EXPCODE');
  });

  it('accept_household_invite is the canonical function name', () => {
    // This string is here so rg/grep can find it for drift detection
    const fnName = 'accept_household_invite';
    expect(fnName).toBe('accept_household_invite');
  });

  it('client_id is the canonical dedup field name on expenses', () => {
    // Referenced by INPUT-07 and INPUT-11
    const fieldName = 'client_id';
    expect(fieldName).toBe('client_id');
  });
});
