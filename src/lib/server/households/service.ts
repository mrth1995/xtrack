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

interface LookupInviteRpcRow {
	household_id: string;
	household_name: string;
	household_created_by: string;
	household_created_at: string;
	code: string;
	expires_at: string;
}

const KNOWN_INVITE_HINTS: readonly InviteErrorHint[] = [
	'invalid_code',
	'already_used',
	'expired',
	'revoked',
	'already_member'
];

function isKnownInviteHint(hint: string | undefined): hint is InviteErrorHint {
	return KNOWN_INVITE_HINTS.includes(hint as InviteErrorHint);
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

	const { data, error } = await client.rpc('lookup_household_invite', { p_code: upperCode });

	if (error) {
		const rawHint = error?.hint as string | undefined;
		const resolvedHint: InviteErrorHint | 'unknown' = isKnownInviteHint(rawHint)
			? rawHint
			: 'unknown';
		const svcError: HouseholdServiceError = {
			hint: resolvedHint,
			message:
				resolvedHint === 'unknown'
					? 'Invite lookup is not available. Apply the latest Supabase migrations, then restart the app and try again.'
					: 'That code is invalid, expired, or already used. Ask for a new code and try again.'
		};
		throw svcError;
	}

	const lookupData = data as LookupInviteRpcRow | LookupInviteRpcRow[];
	const lookup = Array.isArray(lookupData) ? lookupData[0] : lookupData;
	if (!lookup) {
		const svcError: HouseholdServiceError = {
			hint: 'invalid_code',
			message: 'That code is invalid, expired, or already used. Ask for a new code and try again.'
		};
		throw svcError;
	}

	return {
		household: {
			id: lookup.household_id,
			name: lookup.household_name,
			created_by: lookup.household_created_by,
			created_at: lookup.household_created_at
		},
		invite: { code: lookup.code, expires_at: lookup.expires_at }
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
		const resolvedHint: InviteErrorHint | 'unknown' = isKnownInviteHint(rawHint)
			? rawHint
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
	const { data, error } = await client.rpc('get_or_create_active_household_invite', {
		p_household_id: householdId
	});

	if (error) throw new Error(error.message);
	return data as InviteRow;
}
