import { beforeEach, describe, expect, it, vi } from 'vitest';

const clientId = '00000000-0000-0000-0000-000000000101';
const householdId = 'household-1';
const spentAt = '2026-05-02T05:00:00.000Z';
const queueModulePath = '$lib/offline/expense-queue';
const syncModulePath = '$lib/offline/expense-sync';

describe('offline expense sync orchestration (INPUT-09)', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.clearAllMocks();
	});

	it('installs online and visibilitychange triggers and flushes when visible', async () => {
		const { installExpenseSyncTriggers } = await import(syncModulePath);
		const flushExpenseQueue = vi.fn().mockResolvedValue({ flushed: 0 });
		const cleanup = installExpenseSyncTriggers({ flushExpenseQueue });

		window.dispatchEvent(new Event('online'));
		expect(flushExpenseQueue).toHaveBeenCalledTimes(1);

		Object.defineProperty(document, 'visibilityState', {
			value: 'hidden',
			configurable: true
		});
		document.dispatchEvent(new Event('visibilitychange'));
		expect(flushExpenseQueue).toHaveBeenCalledTimes(1);

		Object.defineProperty(document, 'visibilityState', {
			value: 'visible',
			configurable: true
		});
		document.dispatchEvent(new Event('visibilitychange'));
		expect(flushExpenseQueue).toHaveBeenCalledTimes(2);

		cleanup();
		window.dispatchEvent(new Event('online'));
		expect(flushExpenseQueue).toHaveBeenCalledTimes(2);
	});

	it('classifies auth, RLS, and household mismatch failures as failed without hot-loop retries', async () => {
		const { clearExpenseQueueForTests, getQueuedExpenses, queueExpense } = await import(
			queueModulePath
		);
		const { classifySyncError, flushExpenseQueue } = await import(syncModulePath);

		await clearExpenseQueueForTests();
		await queueExpense({
			amount: 54000,
			category: 'Food',
			note: 'lunch',
			spent_at: spentAt,
			client_id: clientId,
			household_id: householdId
		});

		expect(classifySyncError({ status: 401 })).toBe('auth');
		expect(classifySyncError({ status: 403 })).toBe('authorization');
		expect(classifySyncError({ code: '42501', message: 'new row violates row-level security' })).toBe(
			'authorization'
		);
		expect(
			classifySyncError({
				code: 'HOUSEHOLD_MISMATCH',
				message: 'Queued household no longer matches current household'
			})
		).toBe('household_mismatch');

		const saveExpense = vi.fn().mockRejectedValue({ status: 403, message: 'RLS denied' });
		await expect(flushExpenseQueue({ saveExpense, now: () => Date.parse(spentAt) })).resolves.toEqual({
			flushed: 0,
			failed: 1
		});
		expect(saveExpense).toHaveBeenCalledTimes(1);

		const rows = await getQueuedExpenses();
		expect(rows).toEqual([
			expect.objectContaining({
				client_id: clientId,
				sync_status: 'failed',
				last_error: expect.stringContaining('RLS denied'),
				retry_count: 1
			})
		]);
	});
});
