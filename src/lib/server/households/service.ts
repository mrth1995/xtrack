import type { SupabaseClient } from '@supabase/supabase-js';
import type { HouseholdRow, InviteRow, InviteErrorHint } from '$lib/households/schemas';

// ── Type helpers ─────────────────────────────────────────────────────────────

export interface HouseholdServiceError {
	hint: InviteErrorHint | 'unknown';
	message: string;
}

export interface AcceptInviteResult {
	household: HouseholdRow;
}

export interface LookupInviteResult {
	household: HouseholdRow;
	invite: Pick<InviteRow, 'code' | 'expires_at'>;
}

// ── Service methods ───────────────────────────────────────────────────────────

/**
 * Creates a new household with the caller as owner.
 * Calls the `create_household_with_owner` SQL function which atomically
 * inserts the household row and an owner membership row.
 *
 * @throws Error if the user already belongs to a household.
 */
export async function createHousehold(
	client: SupabaseClient,
	name: string
): Promise<HouseholdRow> {
	const { data, error } = await client.rpc('create_household_with_owner', { p_name: name });
	if (error) throw new Error(error.message);
	return data as HouseholdRow;
}

/**
 * Looks up an invite code without claiming it.
 * Used to show the household name confirmation step before the user joins.
 *
 * Returns the household row and the invite metadata (code, expiry).
 * Throws a typed HouseholdServiceError for invalid/expired/revoked codes.
 */
export async function lookupInviteCode(
	client: SupabaseClient,
	code: string
): Promise<LookupInviteResult> {
	const upperCode = code.trim().toUpperCase();

	// Read the invite and household in one query via a join.
	const { data, error } = await client
		.from('household_invites')
		.select(
			`
			id,
			code,
			expires_at,
			used_at,
			revoked_at,
			households (
				id,
				name,
				created_by,
				created_at
			)
		`
		)
		.eq('code', upperCode)
		.single();

	if (error || !data) {
		const svcError: HouseholdServiceError = {
			hint: 'invalid_code',
			message: 'That code is invalid, expired, or already used. Ask for a new code and try again.'
		};
		throw svcError;
	}

	if (data.used_at) {
		const svcError: HouseholdServiceError = {
			hint: 'already_used',
			message: 'That code is invalid, expired, or already used. Ask for a new code and try again.'
		};
		throw svcError;
	}

	if (data.revoked_at) {
		const svcError: HouseholdServiceError = {
			hint: 'revoked',
			message: 'That code is invalid, expired, or already used. Ask for a new code and try again.'
		};
		throw svcError;
	}

	if (new Date(data.expires_at) <= new Date()) {
		const svcError: HouseholdServiceError = {
			hint: 'expired',
			message: 'That code is invalid, expired, or already used. Ask for a new code and try again.'
		};
		throw svcError;
	}

	const householdData = Array.isArray(data.households) ? data.households[0] : data.households;
	if (!householdData) {
		const svcError: HouseholdServiceError = {
			hint: 'invalid_code',
			message: 'That code is invalid, expired, or already used. Ask for a new code and try again.'
		};
		throw svcError;
	}

	return {
		household: householdData as HouseholdRow,
		invite: { code: data.code, expires_at: data.expires_at }
	};
}

/**
 * Atomically accepts an invite code and joins the household.
 * Calls `accept_household_invite` SQL function which uses FOR UPDATE locking
 * to prevent race conditions.
 *
 * Returns the joined household. Throws a typed HouseholdServiceError for
 * invalid/expired/already-used/revoked codes, or if already a member.
 */
export async function acceptHouseholdInvite(
	client: SupabaseClient,
	code: string
): Promise<AcceptInviteResult> {
	const upperCode = code.trim().toUpperCase();

	const { data, error } = await client.rpc('accept_household_invite', { p_code: upperCode });

	if (error) {
		const rawHint = error.hint as string | undefined;
		const knownHints: readonly InviteErrorHint[] = [
			'invalid_code',
			'already_used',
			'expired',
			'revoked',
			'already_member'
		];
		const resolvedHint: InviteErrorHint | 'unknown' = knownHints.includes(
			rawHint as InviteErrorHint
		)
			? (rawHint as InviteErrorHint)
			: 'unknown';
		const svcError: HouseholdServiceError = {
			hint: resolvedHint,
			message: 'That code is invalid, expired, or already used. Ask for a new code and try again.'
		};
		throw svcError;
	}

	return { household: data as HouseholdRow };
}

/**
 * Returns an active (non-expired, non-used, non-revoked) invite for the given
 * household, or creates a new 24h invite if no valid one exists.
 *
 * This implements D-22 through D-26: show current active code if valid,
 * auto-generate only when the prior code is expired/used. Never replace
 * an active unused code.
 */
export async function getOrCreateActiveInviteCode(
	client: SupabaseClient,
	householdId: string
): Promise<InviteRow> {
	// Look for an active, unused, unexpired invite for this household
	const { data: existing } = await client
		.from('household_invites')
		.select('*')
		.eq('household_id', householdId)
		.is('used_at', null)
		.is('revoked_at', null)
		.gt('expires_at', new Date().toISOString())
		.order('created_at', { ascending: false })
		.limit(1)
		.maybeSingle();

	if (existing) {
		return existing as InviteRow;
	}

	// No active invite — create a new one via the SQL function
	const { data, error } = await client.rpc('create_household_invite', {
		p_household_id: householdId
	});

	if (error) throw new Error(error.message);
	return data as InviteRow;
}
