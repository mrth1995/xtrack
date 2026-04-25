import { z } from 'zod';

/**
 * Schema for creating a new household.
 * Only asks for `name` — no other fields required per D-04.
 */
export const createHouseholdSchema = z.object({
	name: z
		.string()
		.trim()
		.min(1, 'Household name is required')
		.max(80, 'Household name must be 80 characters or fewer')
});

/**
 * Schema for joining a household via invite code.
 * Validates code on submit only — no live validation per D-07.
 */
export const joinHouseholdSchema = z.object({
	code: z
		.string()
		.trim()
		.min(1, 'Invite code is required')
		.max(20, 'Invite code is too long')
		.transform((v) => v.toUpperCase())
});

export type CreateHouseholdInput = z.infer<typeof createHouseholdSchema>;
export type JoinHouseholdInput = z.infer<typeof joinHouseholdSchema>;

/** Shape of household data returned by the SQL helper functions */
export interface HouseholdRow {
	id: string;
	name: string;
	created_by: string;
	created_at: string;
}

/** Shape of an invite row returned by create_household_invite */
export interface InviteRow {
	id: string;
	household_id: string;
	code: string;
	created_by: string;
	expires_at: string;
	used_at: string | null;
	used_by: string | null;
	revoked_at: string | null;
	created_at: string;
}

/** Structured error codes from accept_household_invite HINT */
export type InviteErrorHint =
	| 'invalid_code'
	| 'already_used'
	| 'expired'
	| 'revoked'
	| 'already_member';
