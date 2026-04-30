import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export interface ExpenseListItem {
	id: string;
	amount: number;
	category: string;
	note: string | null;
	spent_at: string;
}

/**
 * Full expense history for the active household.
 *
 * No date window - returns every non-deleted expense ordered by spent_at DESC.
 * Grouping by date is performed in the Svelte component via $derived.
 *
 * NOTE (Codex Cycle 3 LOW - intentional MVP tradeoff): No pagination or limit.
 * Mobile performance will degrade for households with many expenses over time.
 * Pagination or a recent-first limit (e.g. LIMIT 200) is a Phase 3+ candidate.
 * This is explicitly accepted as a known tradeoff for Phase 2 MVP scope.
 */
export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.householdId) {
		throw redirect(303, '/onboarding');
	}

	const supabase = locals.supabase;
	const householdId = locals.householdId;

	const { data: rawList, error: queryError } = await supabase
		.from('expenses')
		.select('id, amount, category, note, spent_at')
		.eq('household_id', householdId)
		.eq('is_deleted', false)
		.order('spent_at', { ascending: false });

	if (queryError) {
		console.error(
			'[/expenses/+page.server] history query failed:',
			queryError.code,
			queryError.message
		);
		throw error(503, 'Could not load expenses.');
	}

	const expenses: ExpenseListItem[] = ((rawList ?? []) as unknown as ExpenseListItem[]).map(
		(e) => ({
			id: e.id,
			amount: e.amount,
			category: e.category,
			note: e.note,
			spent_at: e.spent_at
		})
	);

	return { expenses };
};
