import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { createServerClient } from '$lib/supabase/server';

interface MemberWithProfile {
	id: string;
	role: string;
	joined_at: string;
	user_id: string;
	profiles: { display_name: string | null; email: string | null } | null;
}

export interface HouseholdShellMember {
	id: string;
	userId: string;
	role: string;
	joinedAt: string;
	displayName: string;
	email: string | null;
}

export interface RecentExpense {
	id: string;
	amount: number;
	category: string;
	note: string | null;
	spent_at: string;
	created_by: string;
}

export interface HouseholdSummary {
	id: string;
	name: string;
	created_by: string;
	created_at: string;
}

/**
 * Main signed-in shell load.
 *
 * Loads:
 * - The current household (name, id)
 * - Household members with their profile display_name / email
 * - A narrow shared-data proof: the 5 most recent non-deleted household expenses
 *
 * Users without a household are redirected to onboarding.
 * Unauthenticated users are already redirected by the layout server guard.
 */
export const load: PageServerLoad = async (event) => {
	const { locals } = event;

	if (!locals.householdId) {
		throw redirect(303, '/onboarding');
	}

	const supabase = createServerClient(event);
	const householdId = locals.householdId;

	// Load household row — cast via unknown to avoid Supabase generic narrowing to never
	const { data: householdRaw } = await supabase
		.from('households')
		.select('id, name, created_by, created_at')
		.eq('id', householdId)
		.single();

	const householdTyped = householdRaw as unknown as HouseholdSummary | null;
	const household: HouseholdSummary | null = householdTyped
		? {
				id: householdTyped.id,
				name: householdTyped.name,
				created_by: householdTyped.created_by,
				created_at: householdTyped.created_at
			}
		: null;

	// Load members with profile info (email as fallback for display_name)
	const { data: membersRaw } = await supabase
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

	// Narrow shared-data proof: recent expenses scoped to this household
	const { data: expensesRaw } = await supabase
		.from('expenses')
		.select('id, amount, category, note, spent_at, created_by')
		.eq('household_id', householdId)
		.eq('is_deleted', false)
		.order('spent_at', { ascending: false })
		.limit(5);

	const members: HouseholdShellMember[] = (
		(membersRaw ?? []) as unknown as MemberWithProfile[]
	).map((m) => ({
		id: m.id,
		userId: m.user_id,
		role: m.role,
		joinedAt: m.joined_at,
		displayName: m.profiles?.display_name ?? m.profiles?.email ?? 'Member',
		email: m.profiles?.email ?? null
	}));

	const recentExpenses: RecentExpense[] = ((expensesRaw ?? []) as unknown as RecentExpense[]).map(
		(e) => ({
			id: e.id,
			amount: e.amount,
			category: e.category,
			note: e.note,
			spent_at: e.spent_at,
			created_by: e.created_by
		})
	);

	return {
		household,
		members,
		recentExpenses
	};
};
