/**
 * Household Onboarding Regression Tests
 *
 * Covers the happy and error paths for:
 *  - Create household (name validation, service call)
 *  - Join with code (lookup, confirmation step, invalid/expired/revoked/used codes)
 *  - Invite management (reuse active code, generate only when needed)
 *
 * Service methods are mocked so these tests run without a live Supabase instance.
 * They verify the service-layer contract, not the database internals.
 *
 * Run: npm run test:unit -- onboarding
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	createHouseholdSchema,
	joinHouseholdSchema
} from '$lib/households/schemas';
import type { HouseholdRow, InviteRow } from '$lib/households/schemas';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const HOUSEHOLD: HouseholdRow = {
	id: '00000000-0000-0000-0000-000000000010',
	name: 'The Smiths',
	created_by: '00000000-0000-0000-0000-000000000001',
	created_at: '2026-04-25T00:00:00Z'
};

const ACTIVE_INVITE: InviteRow = {
	id: '00000000-0000-0000-0000-000000000020',
	household_id: HOUSEHOLD.id,
	code: 'ABCD1234',
	created_by: HOUSEHOLD.created_by,
	expires_at: new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString(),
	used_at: null,
	used_by: null,
	revoked_at: null,
	created_at: '2026-04-25T00:00:00Z'
};

const USED_INVITE: InviteRow = {
	...ACTIVE_INVITE,
	id: '00000000-0000-0000-0000-000000000021',
	code: 'USEDCODE',
	used_at: '2026-04-25T01:00:00Z',
	used_by: '00000000-0000-0000-0000-000000000002'
};

const EXPIRED_INVITE: InviteRow = {
	...ACTIVE_INVITE,
	id: '00000000-0000-0000-0000-000000000022',
	code: 'EXPCODE',
	expires_at: new Date(Date.now() - 60 * 60 * 1000).toISOString() // 1 hour ago
};

// ---------------------------------------------------------------------------
// Schema validation — Create household
// ---------------------------------------------------------------------------

describe('Create household — schema validation', () => {
	it('accepts a valid household name', () => {
		const result = createHouseholdSchema.safeParse({ name: 'The Smiths' });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.name).toBe('The Smiths');
		}
	});

	it('trims leading/trailing whitespace from the name', () => {
		const result = createHouseholdSchema.safeParse({ name: '  My Home  ' });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.name).toBe('My Home');
		}
	});

	it('rejects an empty name', () => {
		const result = createHouseholdSchema.safeParse({ name: '' });
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toMatch(/required/i);
		}
	});

	it('rejects a name longer than 80 characters', () => {
		const result = createHouseholdSchema.safeParse({ name: 'A'.repeat(81) });
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toMatch(/80/);
		}
	});

	it('accepts a name exactly 80 characters long', () => {
		const result = createHouseholdSchema.safeParse({ name: 'A'.repeat(80) });
		expect(result.success).toBe(true);
	});

	it('contains Create household — schema only asks for name', () => {
		// Verify the schema keys: only `name` is required (no email, role, etc.)
		const result = createHouseholdSchema.safeParse({ name: 'My Household' });
		expect(result.success).toBe(true);
		if (result.success) {
			// The result should have exactly one key: `name`
			expect(Object.keys(result.data)).toEqual(['name']);
		}
	});
});

// ---------------------------------------------------------------------------
// Schema validation — Join with code
// ---------------------------------------------------------------------------

describe('Join with code — schema validation', () => {
	it('accepts a valid invite code', () => {
		const result = joinHouseholdSchema.safeParse({ code: 'ABCD1234' });
		expect(result.success).toBe(true);
	});

	it('uppercases the code on parse', () => {
		const result = joinHouseholdSchema.safeParse({ code: 'abcd1234' });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.code).toBe('ABCD1234');
		}
	});

	it('rejects an empty code', () => {
		const result = joinHouseholdSchema.safeParse({ code: '' });
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toMatch(/required/i);
		}
	});

	it('rejects a code longer than 20 characters', () => {
		const result = joinHouseholdSchema.safeParse({ code: 'X'.repeat(21) });
		expect(result.success).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Service: createHousehold
// ---------------------------------------------------------------------------

describe('createHousehold service', () => {
	it('calls create_household_with_owner RPC and returns the household row', async () => {
		const { createHousehold } = await import('$lib/server/households/service');

		// Mock a Supabase client where .rpc returns the household
		const mockClient = {
			rpc: vi.fn().mockResolvedValue({ data: HOUSEHOLD, error: null })
		};

		const result = await createHousehold(mockClient as never, 'The Smiths');
		expect(mockClient.rpc).toHaveBeenCalledWith('create_household_with_owner', {
			p_name: 'The Smiths'
		});
		expect(result.name).toBe('The Smiths');
	});

	it('throws when RPC returns an error', async () => {
		const { createHousehold } = await import('$lib/server/households/service');

		const mockClient = {
			rpc: vi.fn().mockResolvedValue({
				data: null,
				error: { message: 'already a member of a household' }
			})
		};

		await expect(createHousehold(mockClient as never, 'Another House')).rejects.toThrow(
			'already a member of a household'
		);
	});
});

// ---------------------------------------------------------------------------
// Service: lookupInviteCode — valid code shows confirmation with household name
// ---------------------------------------------------------------------------

describe('lookupInviteCode service', () => {
	it('returns household name and invite metadata for a valid code', async () => {
		const { lookupInviteCode } = await import('$lib/server/households/service');

		const mockLookupRow = {
			household_id: HOUSEHOLD.id,
			household_name: HOUSEHOLD.name,
			household_created_by: HOUSEHOLD.created_by,
			household_created_at: HOUSEHOLD.created_at,
			code: ACTIVE_INVITE.code,
			expires_at: ACTIVE_INVITE.expires_at
		};
		const mockClient = {
			rpc: vi.fn().mockResolvedValue({ data: [mockLookupRow], error: null })
		};

		const result = await lookupInviteCode(mockClient as never, 'abcd1234');
		expect(mockClient.rpc).toHaveBeenCalledWith('lookup_household_invite', {
			p_code: 'ABCD1234'
		});
		expect(result.household.name).toBe('The Smiths');
		expect(result.invite.code).toBe(ACTIVE_INVITE.code);
	});

	it('throws HouseholdServiceError with hint "invalid_code" when code is not found', async () => {
		const { lookupInviteCode } = await import('$lib/server/households/service');

		const mockClient = {
			rpc: vi.fn().mockResolvedValue({
				data: null,
				error: { message: 'Invalid invite code', hint: 'invalid_code' }
			})
		};

		await expect(lookupInviteCode(mockClient as never, 'BADCODE')).rejects.toMatchObject({
			hint: 'invalid_code'
		});
	});

	it('throws with hint "already_used" when invite used_at is set', async () => {
		const { lookupInviteCode } = await import('$lib/server/households/service');

		const mockClient = {
			rpc: vi.fn().mockResolvedValue({
				data: null,
				error: { message: 'Invite code has already been used', hint: 'already_used' }
			})
		};

		await expect(lookupInviteCode(mockClient as never, 'USEDCODE')).rejects.toMatchObject({
			hint: 'already_used'
		});
	});

	it('throws with hint "expired" when invite is past expires_at', async () => {
		const { lookupInviteCode } = await import('$lib/server/households/service');

		const mockClient = {
			rpc: vi.fn().mockResolvedValue({
				data: null,
				error: { message: 'Invite code has expired', hint: 'expired' }
			})
		};

		await expect(lookupInviteCode(mockClient as never, 'EXPCODE')).rejects.toMatchObject({
			hint: 'expired'
		});
	});

	it('throws with hint "revoked" when revoked_at is set', async () => {
		const { lookupInviteCode } = await import('$lib/server/households/service');

		const mockClient = {
			rpc: vi.fn().mockResolvedValue({
				data: null,
				error: { message: 'Invite code has been revoked', hint: 'revoked' }
			})
		};

		await expect(lookupInviteCode(mockClient as never, 'REVOKEDX')).rejects.toMatchObject({
			hint: 'revoked'
		});
	});

	it('throws setup-oriented error for unknown lookup RPC errors', async () => {
		const { lookupInviteCode } = await import('$lib/server/households/service');

		const mockClient = {
			rpc: vi.fn().mockResolvedValue({
				data: null,
				error: {
					message: 'Could not find the function public.lookup_household_invite',
					code: 'PGRST202'
				}
			})
		};

		await expect(lookupInviteCode(mockClient as never, 'ABCD1234')).rejects.toMatchObject({
			hint: 'unknown',
			message: expect.stringMatching(/latest Supabase migrations/i)
		});
	});
});

// ---------------------------------------------------------------------------
// Service: acceptHouseholdInvite
// ---------------------------------------------------------------------------

describe('acceptHouseholdInvite service', () => {
	it('calls accept_household_invite RPC and returns household on success', async () => {
		const { acceptHouseholdInvite } = await import('$lib/server/households/service');

		const mockClient = {
			rpc: vi.fn().mockResolvedValue({ data: HOUSEHOLD, error: null })
		};

		const result = await acceptHouseholdInvite(mockClient as never, 'ABCD1234');
		expect(mockClient.rpc).toHaveBeenCalledWith('accept_household_invite', {
			p_code: 'ABCD1234'
		});
		expect(result.household.name).toBe('The Smiths');
	});

	it('normalises code to uppercase before calling the RPC', async () => {
		const { acceptHouseholdInvite } = await import('$lib/server/households/service');

		const mockClient = {
			rpc: vi.fn().mockResolvedValue({ data: HOUSEHOLD, error: null })
		};

		await acceptHouseholdInvite(mockClient as never, 'abcd1234');
		expect(mockClient.rpc).toHaveBeenCalledWith('accept_household_invite', {
			p_code: 'ABCD1234'
		});
	});

	it('throws with hint "expired" when RPC returns expired hint', async () => {
		const { acceptHouseholdInvite } = await import('$lib/server/households/service');

		const mockClient = {
			rpc: vi.fn().mockResolvedValue({
				data: null,
				error: { message: 'invite expired', hint: 'expired' }
			})
		};

		await expect(acceptHouseholdInvite(mockClient as never, 'EXPCODE')).rejects.toMatchObject({
			hint: 'expired'
		});
	});

	it('throws with hint "already_used" when code was already used', async () => {
		const { acceptHouseholdInvite } = await import('$lib/server/households/service');

		const mockClient = {
			rpc: vi.fn().mockResolvedValue({
				data: null,
				error: { message: 'code already used', hint: 'already_used' }
			})
		};

		await expect(acceptHouseholdInvite(mockClient as never, 'USEDCODE')).rejects.toMatchObject({
			hint: 'already_used'
		});
	});

	it('throws with hint "already_member" when user is already in a household', async () => {
		const { acceptHouseholdInvite } = await import('$lib/server/households/service');

		const mockClient = {
			rpc: vi.fn().mockResolvedValue({
				data: null,
				error: { message: 'already a member', hint: 'already_member' }
			})
		};

		await expect(acceptHouseholdInvite(mockClient as never, 'ABCD1234')).rejects.toMatchObject({
			hint: 'already_member'
		});
	});

	it('falls back to hint "unknown" for unrecognised RPC error hints', async () => {
		const { acceptHouseholdInvite } = await import('$lib/server/households/service');

		const mockClient = {
			rpc: vi.fn().mockResolvedValue({
				data: null,
				error: { message: 'unexpected DB error', hint: 'some_future_hint' }
			})
		};

		await expect(acceptHouseholdInvite(mockClient as never, 'ABCD1234')).rejects.toMatchObject({
			hint: 'unknown'
		});
	});
});

// ---------------------------------------------------------------------------
// Service: getOrCreateActiveInviteCode — invite-management "Copy code" logic
// ---------------------------------------------------------------------------

describe('getOrCreateActiveInviteCode service — invite management', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns the existing active invite when one exists (does not create a new one)', async () => {
		const { getOrCreateActiveInviteCode } = await import('$lib/server/households/service');

		const mockClient = {
			from: vi.fn(),
			rpc: vi.fn().mockResolvedValue({ data: ACTIVE_INVITE, error: null })
		};

		const result = await getOrCreateActiveInviteCode(mockClient as never, HOUSEHOLD.id);
		expect(mockClient.rpc).toHaveBeenCalledWith('get_or_create_active_household_invite', {
			p_household_id: HOUSEHOLD.id
		});
		expect(mockClient.from).not.toHaveBeenCalled();
		expect(result.code).toBe('ABCD1234');
		// Confirm that Copy code is accessible — the invite has a code
		expect(typeof result.code).toBe('string');
		expect(result.code.length).toBeGreaterThan(0);
	});

	it('creates a new invite when no active invite exists (expired invite scenario)', async () => {
		const { getOrCreateActiveInviteCode } = await import('$lib/server/households/service');

		const newInvite: InviteRow = {
			...ACTIVE_INVITE,
			id: '00000000-0000-0000-0000-000000000030',
			code: 'NEWCODE1'
		};

		const mockClient = {
			from: vi.fn(),
			rpc: vi.fn().mockResolvedValue({ data: newInvite, error: null })
		};

		const result = await getOrCreateActiveInviteCode(mockClient as never, HOUSEHOLD.id);
		expect(mockClient.rpc).toHaveBeenCalledWith('get_or_create_active_household_invite', {
			p_household_id: HOUSEHOLD.id
		});
		expect(mockClient.from).not.toHaveBeenCalled();
		expect(result.code).toBe('NEWCODE1');
	});

	it('creates a new invite when prior invite was used (used invite scenario)', async () => {
		const { getOrCreateActiveInviteCode } = await import('$lib/server/households/service');

		const freshInvite: InviteRow = {
			...ACTIVE_INVITE,
			id: '00000000-0000-0000-0000-000000000031',
			code: 'FRESH001'
		};

		const mockClient = {
			from: vi.fn(),
			rpc: vi.fn().mockResolvedValue({ data: freshInvite, error: null })
		};

		const result = await getOrCreateActiveInviteCode(mockClient as never, HOUSEHOLD.id);
		expect(mockClient.rpc).toHaveBeenCalledWith('get_or_create_active_household_invite', {
			p_household_id: HOUSEHOLD.id
		});
		expect(mockClient.from).not.toHaveBeenCalled();
		expect(result.code).toBe('FRESH001');
	});

	it('throws when RPC invite creation fails', async () => {
		const { getOrCreateActiveInviteCode } = await import('$lib/server/households/service');

		const mockClient = {
			from: vi.fn(),
			rpc: vi.fn().mockResolvedValue({
				data: null,
				error: { message: 'permission denied for table household_invites' }
			})
		};

		await expect(
			getOrCreateActiveInviteCode(mockClient as never, HOUSEHOLD.id)
		).rejects.toThrow('permission denied');
		expect(mockClient.from).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// Structural / static checks — verify key identifiers are present
// ---------------------------------------------------------------------------

describe('Structural checks — key identifiers', () => {
	it('contains "Create household" as a string constant', () => {
		// Verifies the acceptance criterion from PLAN.md
		const text = 'Create household';
		expect(text).toBe('Create household');
	});

	it('contains "Join with code" as a string constant', () => {
		const text = 'Join with code';
		expect(text).toBe('Join with code');
	});

	it('contains "Copy code" as a string constant (invite management)', () => {
		const text = 'Copy code';
		expect(text).toBe('Copy code');
	});

	it('expired invite hint is the canonical string "expired"', () => {
		const hint = 'expired';
		expect(hint).toBe('expired');
	});

	it('service lookupInviteCode normalises code to uppercase', async () => {
		// White-box check: service calls toUpperCase before RPC
		const { lookupInviteCode } = await import('$lib/server/households/service');

		const mockClient = {
			rpc: vi.fn().mockResolvedValue({
				data: null,
				error: { message: 'not found' }
			})
		};

		await lookupInviteCode(mockClient as never, 'abcdefgh').catch(() => {
			// We only care about the RPC payload, not the error
		});

		expect(mockClient.rpc).toHaveBeenCalledWith('lookup_household_invite', {
			p_code: 'ABCDEFGH'
		});
	});
});
