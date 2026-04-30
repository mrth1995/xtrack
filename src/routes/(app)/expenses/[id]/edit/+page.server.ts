import { fail, redirect, error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { editExpenseSchema } from '$lib/expenses/schemas';

export interface EditExpenseRow {
	id: string;
	amount: number;
	category: string;
	note: string | null;
	spent_at: string;
}

/**
 * Load a single expense for editing.
 * Filters by `id` AND `is_deleted = false` so soft-deleted rows return 404.
 */
export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.session) {
		throw redirect(303, '/auth');
	}
	if (!locals.householdId) {
		throw redirect(303, '/onboarding');
	}

	const supabase = locals.supabase as any;

	const { data: raw, error: loadError } = await supabase
		.from('expenses')
		.select('id, amount, category, note, spent_at')
		.eq('id', params.id)
		.eq('is_deleted', false)
		.single();

	if (loadError || !raw) {
		console.error(
			'[/expenses/[id]/edit/+page.server] load failed:',
			loadError?.code,
			loadError?.message
		);
		throw error(404, 'Expense not found.');
	}

	const expense = raw as unknown as EditExpenseRow;
	return { expense };
};

export const actions: Actions = {
	/**
	 * saveEdit - INPUT-12: update amount, category, note, spent_at.
	 *
	 * RLS `expenses_creator_update` enforces created_by = auth.uid() at the DB
	 * layer (T-02 mitigation), so a non-creator's update silently affects 0 rows.
	 */
	saveEdit: async ({ request, locals, params }) => {
		if (!locals.session) {
			throw redirect(303, '/auth');
		}
		if (!locals.householdId) {
			throw redirect(303, '/onboarding');
		}

		const formData = await request.formData();
		const rawAmount = formData.get('amount');
		const rawNote = formData.get('note');

		// Defensive: strip any IDR dot separators if a formatted value was submitted.
		const amountStr =
			typeof rawAmount === 'string' ? rawAmount.replace(/\./g, '') : String(rawAmount ?? '');

		// D-10: empty note clears the field - store as null, not empty string.
		const noteValue =
			typeof rawNote === 'string' && rawNote.trim().length > 0 ? rawNote : null;

		const parsed = editExpenseSchema.safeParse({
			amount: Number(amountStr),
			category: formData.get('category'),
			note: noteValue,
			spent_at: formData.get('spent_at')
		});

		if (!parsed.success) {
			return fail(400, {
				error: parsed.error.issues[0]?.message ?? 'Invalid input'
			});
		}

		const supabase = locals.supabase as any;
		const { error: updateError } = await supabase
			.from('expenses')
			.update({
				amount: parsed.data.amount,
				category: parsed.data.category,
				note: parsed.data.note,
				spent_at: parsed.data.spent_at
			})
			.eq('id', params.id)
			// Codex review: prevent stale form from resurrecting a soft-deleted expense.
			// If is_deleted=true, the UPDATE affects 0 rows and we redirect normally.
			// RLS `expenses_creator_update` is still the household/creator boundary.
			.eq('is_deleted', false);

		if (updateError) {
			console.error(
				'[/expenses/[id]/edit/+page.server] saveEdit failed:',
				updateError.code,
				updateError.message
			);
			return fail(500, {
				error: "Couldn't save changes. Check your connection and try again."
			});
		}

		throw redirect(303, '/expenses');
	},

	/**
	 * deleteExpense - INPUT-13: soft delete (UPDATE is_deleted = true).
	 *
	 * NEVER use physical deletes. RLS enforces creator-only update; the DB layer
	 * is the final guard against horizontal privilege escalation.
	 */
	deleteExpense: async ({ locals, params }) => {
		if (!locals.session) {
			throw redirect(303, '/auth');
		}
		if (!locals.householdId) {
			throw redirect(303, '/onboarding');
		}

		const supabase = locals.supabase as any;
		const { error: deleteError } = await supabase
			.from('expenses')
			.update({ is_deleted: true })
			.eq('id', params.id)
			// Codex review: prevent double-soft-delete of an already-deleted expense.
			// If is_deleted=true already, the UPDATE affects 0 rows and we redirect normally.
			.eq('is_deleted', false);

		if (deleteError) {
			console.error(
				'[/expenses/[id]/edit/+page.server] deleteExpense failed:',
				deleteError.code,
				deleteError.message
			);
			return fail(500, {
				error: "Couldn't delete. Check your connection and try again."
			});
		}

		throw redirect(303, '/');
	}
};
