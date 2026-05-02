import { beforeEach, describe, expect, it, vi } from 'vitest';

const clientId = '00000000-0000-0000-0000-000000000101';
const householdId = 'household-1';
const spentAt = '2026-05-02T05:00:00.000Z';
const queueModulePath = '$lib/offline/expense-queue';

describe('offline expense queue (INPUT-08, INPUT-10)', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.clearAllMocks();
	});

	it('queues an offline expense with only expense payload and retry metadata', async () => {
		const { clearExpenseQueueForTests, getQueuedExpenses, queueExpense } = await import(
			queueModulePath
		);

		await clearExpenseQueueForTests();

		const queued = await queueExpense({
			amount: 54000,
			category: 'Food',
			note: 'lunch',
			spent_at: spentAt,
			client_id: clientId,
			household_id: householdId
		});

		expect(queued).toMatchObject({
			amount: 54000,
			category: 'Food',
			note: 'lunch',
			spent_at: spentAt,
			client_id: clientId,
			household_id: householdId,
			sync_status: 'queued',
			retry_count: 0,
			last_error: null,
			sync_started_at: null
		});
		expect(queued.created_at).toEqual(expect.any(String));
		expect(queued.updated_at).toEqual(expect.any(String));
		expect(Object.keys(queued).sort()).toEqual([
			'amount',
			'category',
			'client_id',
			'created_at',
			'household_id',
			'last_error',
			'note',
			'retry_count',
			'spent_at',
			'sync_started_at',
			'sync_status',
			'updated_at'
		]);

		await expect(getQueuedExpenses()).resolves.toEqual([queued]);
	});

	it('recovers only syncing expenses older than 5 minutes back to queued', async () => {
		const {
			clearExpenseQueueForTests,
			deleteQueuedExpense,
			getQueuedExpenses,
			queueExpense,
			recoverStaleSyncingExpenses,
			updateQueuedExpense
		} = await import(queueModulePath);
		const now = Date.parse('2026-05-02T05:10:00.000Z');
		const staleStartedAt = new Date(now - 5 * 60 * 1000 - 1).toISOString();
		const freshStartedAt = new Date(now - 60 * 1000).toISOString();

		await clearExpenseQueueForTests();
		const stale = await queueExpense({
			amount: 54000,
			category: 'Food',
			note: 'lunch',
			spent_at: spentAt,
			client_id: clientId,
			household_id: householdId
		});
		const fresh = await queueExpense({
			amount: 54000,
			category: 'Transport',
			note: 'ride',
			spent_at: spentAt,
			client_id: '00000000-0000-0000-0000-000000000102',
			household_id: householdId
		});
		const alreadyQueued = await queueExpense({
			amount: 54000,
			category: 'Shopping',
			note: null,
			spent_at: spentAt,
			client_id: '00000000-0000-0000-0000-000000000103',
			household_id: householdId
		});

		await updateQueuedExpense(stale.client_id, {
			sync_status: 'syncing',
			sync_started_at: staleStartedAt
		});
		await updateQueuedExpense(fresh.client_id, {
			sync_status: 'syncing',
			sync_started_at: freshStartedAt
		});

		await expect(recoverStaleSyncingExpenses(now)).resolves.toEqual([stale.client_id]);
		const rows = await getQueuedExpenses();

		expect(rows).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					client_id: stale.client_id,
					sync_status: 'queued',
					sync_started_at: null
				}),
				expect.objectContaining({
					client_id: fresh.client_id,
					sync_status: 'syncing',
					sync_started_at: freshStartedAt
				}),
				expect.objectContaining({
					client_id: alreadyQueued.client_id,
					sync_status: 'queued'
				})
			])
		);

		await deleteQueuedExpense(stale.client_id);
		await expect(getQueuedExpenses()).resolves.toHaveLength(2);
	});
});
