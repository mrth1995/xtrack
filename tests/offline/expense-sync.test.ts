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
		const context = { householdId, sessionReady: true };
		const flushExpenseQueue = vi
			.fn()
			.mockResolvedValue({ attempted: 0, synced: 0, failed: 0, paused: false });
		const cleanup = installExpenseSyncTriggers(() => context, flushExpenseQueue);

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

	it('classifies auth, household access, and household mismatch failures without hot-loop retries', async () => {
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

		expect(classifySyncError({ syncErrorCode: 'auth' })).toBe('auth');
		expect(classifySyncError({ syncErrorCode: 'household_access' })).toBe('household_access');
		expect(
			classifySyncError({
				syncErrorCode: 'household_mismatch'
			})
		).toBe('household_mismatch');

		const fetcher = vi.fn().mockResolvedValue(
			new Response(
				JSON.stringify({
					type: 'failure',
					status: 403,
					data: {
						error: 'Check household access before retrying.',
						syncErrorCode: 'household_access'
					}
				}),
				{ status: 403, headers: { 'content-type': 'application/json' } }
			)
		);
		await expect(
			flushExpenseQueue({ householdId, sessionReady: true, fetcher })
		).resolves.toMatchObject({
			attempted: 1,
			synced: 0,
			failed: 1,
			paused: false
		});
		expect(fetcher).toHaveBeenCalledTimes(1);

		const rows = await getQueuedExpenses();
		expect(rows).toEqual([
			expect.objectContaining({
				client_id: clientId,
				sync_status: 'failed',
				last_error: 'Check household access before retrying.',
				retry_count: 1
			})
		]);
	});

	it('returns network failures to queued for a later lifecycle-trigger retry', async () => {
		const { clearExpenseQueueForTests, getQueuedExpenses, queueExpense } = await import(
			queueModulePath
		);
		const { classifySyncError, flushExpenseQueue } = await import(syncModulePath);

		await clearExpenseQueueForTests();
		await queueExpense({
			amount: 54000,
			category: 'Food',
			note: null,
			spent_at: spentAt,
			client_id: clientId,
			household_id: householdId
		});

		const fetcher = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
		expect(classifySyncError(new TypeError('Failed to fetch'))).toBe('network');

		await expect(
			flushExpenseQueue({ householdId, sessionReady: true, fetcher })
		).resolves.toMatchObject({
			attempted: 1,
			synced: 0,
			failed: 0,
			paused: false
		});
		expect(fetcher).toHaveBeenCalledTimes(1);

		const rows = await getQueuedExpenses();
		expect(rows).toEqual([
			expect.objectContaining({
				client_id: clientId,
				sync_status: 'queued',
				last_error: null,
				retry_count: 1
			})
		]);
	});
});
