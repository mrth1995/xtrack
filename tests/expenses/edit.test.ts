import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('edit page load (INPUT-12)', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.clearAllMocks();
	});

	it('returns the expense when found and not deleted', async () => {
		const single = vi.fn().mockResolvedValue({
			data: {
				id: 'exp-1',
				amount: 54000,
				category: 'Food',
				note: null,
				spent_at: '2026-04-26T12:00:00.000Z'
			},
			error: null
		});
		const eqDeleted = vi.fn().mockReturnValue({ single });
		const eqId = vi.fn().mockReturnValue({ eq: eqDeleted });
		const select = vi.fn().mockReturnValue({ eq: eqId });
		const from = vi.fn().mockReturnValue({ select });
		const mockSupabase = { from };

		const { load } = await import('../../src/routes/(app)/expenses/[id]/edit/+page.server');
		const result = await load({
			locals: {
				session: { user: { id: 'user-1' } },
				householdId: 'household-1',
				supabase: mockSupabase
			},
			params: { id: 'exp-1' }
		} as never);

		expect(result).toMatchObject({
			expense: { id: 'exp-1', amount: 54000, category: 'Food' }
		});
		// is_deleted=false filter MUST be applied
		expect(eqId).toHaveBeenCalledWith('id', 'exp-1');
		expect(eqDeleted).toHaveBeenCalledWith('is_deleted', false);
	});
});

describe('saveEdit action (INPUT-12)', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.clearAllMocks();
	});

	it('updates amount, category, note, spent_at and redirects', async () => {
		const eq = vi.fn().mockResolvedValue({ data: null, error: null });
		const update = vi.fn().mockReturnValue({ eq });
		const from = vi.fn().mockReturnValue({ update });
		const mockSupabase = { from };

		const { actions } = await import('../../src/routes/(app)/expenses/[id]/edit/+page.server');
		const body = new URLSearchParams({
			amount: '60000',
			category: 'Transport',
			note: 'updated note',
			spent_at: '2026-04-26T12:00:00.000Z'
		});
		const request = new Request('http://localhost:5173/expenses/exp-1/edit', {
			method: 'POST',
			headers: { 'content-type': 'application/x-www-form-urlencoded' },
			body
		});

		await expect(
			actions.saveEdit({
				request,
				locals: {
					session: { user: { id: 'user-1' } },
					user: { id: 'user-1' },
					householdId: 'household-1',
					supabase: mockSupabase
				},
				params: { id: 'exp-1' }
			} as never)
		).rejects.toMatchObject({ status: 303 });

		expect(update).toHaveBeenCalledWith({
			amount: 60000,
			category: 'Transport',
			note: 'updated note',
			spent_at: '2026-04-26T12:00:00.000Z'
		});
		expect(eq).toHaveBeenCalledWith('id', 'exp-1');
	});
});

describe('deleteExpense action (INPUT-13 — soft delete)', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.clearAllMocks();
	});

	it('sets is_deleted=true (NOT physical delete) and redirects to /', async () => {
		const eq = vi.fn().mockResolvedValue({ data: null, error: null });
		const update = vi.fn().mockReturnValue({ eq });
		const deleteFn = vi.fn();
		const from = vi.fn().mockReturnValue({ update, delete: deleteFn });
		const mockSupabase = { from };

		const { actions } = await import('../../src/routes/(app)/expenses/[id]/edit/+page.server');

		await expect(
			actions.deleteExpense({
				request: new Request('http://localhost:5173/expenses/exp-1/edit', { method: 'POST' }),
				locals: {
					session: { user: { id: 'user-1' } },
					user: { id: 'user-1' },
					householdId: 'household-1',
					supabase: mockSupabase
				},
				params: { id: 'exp-1' }
			} as never)
		).rejects.toMatchObject({ status: 303, location: '/' });

		// Soft delete: must use UPDATE with is_deleted=true, NEVER .delete()
		expect(update).toHaveBeenCalledWith({ is_deleted: true });
		expect(eq).toHaveBeenCalledWith('id', 'exp-1');
		expect(deleteFn).not.toHaveBeenCalled();
	});
});
