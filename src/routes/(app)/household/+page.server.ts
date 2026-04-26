import type { PageServerLoad } from './$types';
import { redirect, error } from '@sveltejs/kit';
import { createServerClient } from '$lib/supabase/server';

interface MemberWithProfile {
	id: string;
	role: string;
	joined_at: string;
	user_id: string;
	profiles: { display_name: string | null; email: string | null } | null;
}

export interface HouseholdMember {
	id: string;
	userId: string;
	role: string;
	joinedAt: string;
	displayName: string;
	email: string | null;
}

export interface HouseholdDetail {
	id: string;
	name: string;
	created_by: string;
	created_at: string;
}

/**
 * Household details page load.
 *
 * Loads household identity and full member list in one surface (D-31).
 * Redirects to onboarding if the user has no household.
 */
export const load: PageServerLoad = async (event) => {
	const { locals } = event;

	if (!locals.householdId) {
		throw redirect(303, '/onboarding');
	}

	const supabase = createServerClient(event);
	const householdId = locals.householdId;

	// Load household row — cast via unknown to avoid Supabase generic narrowing to never
	const { data: householdRaw, error: householdError } = await supabase
		.from('households')
		.select('id, name, created_by, created_at')
		.eq('id', householdId)
		.single();

	if (householdError) {
		throw error(503, 'Could not load household details.');
	}

	const householdTyped = householdRaw as unknown as HouseholdDetail | null;
	const household: HouseholdDetail | null = householdTyped
		? {
				id: householdTyped.id,
				name: householdTyped.name,
				created_by: householdTyped.created_by,
				created_at: householdTyped.created_at
			}
		: null;

	// Load members with profile info
	const { data: membersRaw, error: membersError } = await supabase
		.from('household_members')
		.select(
			`
			id,
			role,
			joined_at,
			user_id,
			profiles (
				display_name,
				email
			)
		`
		)
		.eq('household_id', householdId)
		.order('joined_at', { ascending: true });

	if (membersError) {
		throw error(503, 'Could not load household members.');
	}

	const members: HouseholdMember[] = (
		(membersRaw ?? []) as unknown as MemberWithProfile[]
	).map((m) => ({
		id: m.id,
		userId: m.user_id,
		role: m.role,
		joinedAt: m.joined_at,
		displayName: m.profiles?.display_name ?? m.profiles?.email ?? 'Member',
		email: m.profiles?.email ?? null
	}));

	return {
		household,
		members
	};
};
