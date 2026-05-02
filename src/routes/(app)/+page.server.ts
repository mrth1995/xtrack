import type { Actions, PageServerLoad } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { saveExpenseSchema, saveNoteSchema } from '$lib/expenses/schemas';
import type { Database } from '$lib/types/database';

type ExpenseRow = Database['public']['Tables']['expenses']['Row'];
type ExpenseListRow = Pick<
	ExpenseRow,
	'id' | 'amount' | 'category' | 'note' | 'spent_at' | 'client_id'
>;

interface RpcErrorLike {
	code?: string;
	message?: string;
	details?: string;
}

function wibTodayBoundsUtc(now = new Date()): { start: string; end: string } {
	const wibParts = new Intl.DateTimeFormat('en-CA', {
		timeZone: 'Asia/Jakarta',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).formatToParts(now);
	const year = Number(wibParts.find((part) => part.type === 'year')?.value);
	const month = Number(wibParts.find((part) => part.type === 'month')?.value);
	const day = Number(wibParts.find((part) => part.type === 'day')?.value);
	const startMs = Date.UTC(year, month - 1, day, -7, 0, 0, 0);

	return {
		start: new Date(startMs).toISOString(),
		end: new Date(startMs + 24 * 60 * 60 * 1000).toISOString()
	};
}

function getUserId(locals: App.Locals): string {
	const userId = locals.user?.id ?? locals.session?.user?.id;
	if (!userId) {
		throw redirect(303, '/auth');
	}
	return userId;
}

function maybeGetUserId(locals: App.Locals): string | null {
	return locals.user?.id ?? locals.session?.user?.id ?? null;
}

function getHouseholdId(locals: App.Locals): string {
	if (!locals.householdId) {
		throw redirect(303, '/onboarding');
	}
	return locals.householdId;
}

function isOfflineSync(formData: FormData): boolean {
	return formData.get('sync_mode') === 'offline';
}

function isAuthRpcError(error: RpcErrorLike): boolean {
	const message = error.message?.toLowerCase() ?? '';
	return error.code === '28000' || message.includes('not authenticated') || message.includes('jwt');
}

function isHouseholdAccessRpcError(error: RpcErrorLike): boolean {
	const message = error.message?.toLowerCase() ?? '';
	return (
		error.code === '42501' ||
		message.includes('household access denied') ||
		message.includes('row-level security') ||
		message.includes('permission denied')
	);
}

function asExpenseListRow(row: unknown): ExpenseListRow {
	const expense = row as ExpenseListRow;
	return {
		id: expense.id,
		amount: expense.amount,
		category: expense.category,
		note: expense.note,
		spent_at: expense.spent_at,
		client_id: expense.client_id
	};
}

function isLocalE2eFixture(url: URL): boolean {
	return (
		process.env.PLAYWRIGHT_E2E_FIXTURE === '1' &&
		(url.hostname === '127.0.0.1' || url.hostname === 'localhost')
	);
}

function e2eFixtureExpense(formData: FormData): ExpenseListRow {
	const clientId = String(formData.get('client_id') ?? crypto.randomUUID());
	return {
		id: `playwright-${clientId}`,
		amount: Number(formData.get('amount')),
		category: String(formData.get('category') ?? 'Food'),
		note: formData.get('note')?.toString() || null,
		spent_at: String(formData.get('spent_at') ?? new Date().toISOString()),
		client_id: clientId
	};
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const householdId = getHouseholdId(locals);
	if (isLocalE2eFixture(url)) {
		return { todayExpenses: [] };
	}

	const supabase = locals.supabase as any;
	const { start, end } = wibTodayBoundsUtc();

	const { data, error: expensesError } = await supabase
		.from('expenses')
		.select('id, amount, category, note, spent_at, client_id')
		.eq('household_id', householdId)
		.eq('is_deleted', false)
		.gte('spent_at', start)
		.lt('spent_at', end)
		.order('spent_at', { ascending: false });

	if (expensesError) {
		console.error('[/+page.server] today expenses query failed:', expensesError.code, expensesError.message);
		throw error(503, 'Could not load expenses.');
	}

	return {
		todayExpenses: ((data ?? []) as unknown[]).map(asExpenseListRow)
	};
};

export const actions: Actions = {
	saveExpense: async ({ request, locals, url }) => {
		const householdId = getHouseholdId(locals);
		const supabase = locals.supabase as any;
		const formData = await request.formData();
		if (!maybeGetUserId(locals)) {
			if (isOfflineSync(formData)) {
				return fail(401, {
					error: 'Sign in again to sync this expense.',
					syncErrorCode: 'auth'
				});
			}
			getUserId(locals);
		}

		const queuedHouseholdId = formData.get('household_id');
		if (typeof queuedHouseholdId === 'string' && queuedHouseholdId !== householdId) {
			return fail(409, {
				error: 'This expense belongs to a different household.',
				syncErrorCode: 'household_mismatch'
			});
		}

		const parsed = saveExpenseSchema.safeParse({
			amount: Number(formData.get('amount')),
			category: formData.get('category'),
			note: formData.get('note')?.toString() ?? undefined,
			client_id: formData.get('client_id'),
			spent_at: formData.get('spent_at')
		});

		if (!parsed.success) {
			return fail(400, { error: 'Invalid expense input.' });
		}

		if (isLocalE2eFixture(url)) {
			return { success: true, expense: e2eFixtureExpense(formData) };
		}

		const { data, error: rpcError } = await supabase.rpc('save_expense_idempotent', {
			p_household_id: householdId,
			p_amount: parsed.data.amount,
			p_category: parsed.data.category,
			p_note: parsed.data.note ?? null,
			p_spent_at: parsed.data.spent_at,
			p_client_id: parsed.data.client_id
		});

		if (rpcError) {
			console.error(
				'[/+page.server] save_expense_idempotent failed:',
				rpcError.code,
				rpcError.message,
				rpcError.details
			);
			if (isAuthRpcError(rpcError)) {
				return fail(401, {
					error: 'Sign in again to sync this expense.',
					syncErrorCode: 'auth'
				});
			}

			if (isHouseholdAccessRpcError(rpcError)) {
				return fail(403, {
					error: 'Check household access before retrying.',
					syncErrorCode: 'household_access'
				});
			}

			return fail(500, { error: 'Could not save expense.', syncErrorCode: 'unknown' });
		}

		if (!data?.[0]) {
			return fail(500, { error: 'Could not save expense.', syncErrorCode: 'unknown' });
		}

		return { success: true, expense: asExpenseListRow(data[0]) };
	},

	saveNote: async ({ request, locals }) => {
		getHouseholdId(locals);
		getUserId(locals);
		const supabase = locals.supabase as any;
		const formData = await request.formData();
		const parsed = saveNoteSchema.safeParse({
			expense_id: formData.get('expense_id'),
			note: formData.get('note')?.toString() ?? undefined
		});

		if (!parsed.success) {
			return fail(400, { error: 'Invalid note input.' });
		}

		const { error: updateError, count } = await supabase
			.from('expenses')
			.update({ note: parsed.data.note ?? null }, { count: 'exact' })
			.eq('id', parsed.data.expense_id)
			.eq('is_deleted', false);

		if (updateError) {
			console.error('[/+page.server] note update failed:', updateError.code, updateError.message);
			return fail(500, { error: 'Could not save note.' });
		}

		if (count === 0) {
			return fail(404, { error: 'Expense not found.' });
		}

		return { success: true };
	}
};
